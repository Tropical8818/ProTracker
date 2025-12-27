import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { chat } from '@/lib/ai/client';
import { SYSTEM_PROMPT } from '@/lib/ai/prompts';
import { buildAIContext, formatContextForAI } from '@/lib/ai/context';

export async function POST(request: Request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('your-')) {
        return NextResponse.json({
            error: 'OpenAI API key not configured. Please add your key to .env file.'
        }, { status: 500 });
    }

    try {
        const body = await request.json();
        const { message, productId, conversationHistory } = body;

        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        // Build production context
        const context = await buildAIContext(productId);
        const contextString = formatContextForAI(context, productId);

        // Build messages array
        const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
            {
                role: 'system',
                content: `${SYSTEM_PROMPT}\n\n## Current Production Data\n${contextString}`
            }
        ];

        // Add conversation history if provided
        if (conversationHistory && Array.isArray(conversationHistory)) {
            for (const msg of conversationHistory.slice(-10)) { // Keep last 10 messages
                messages.push({
                    role: msg.role as 'user' | 'assistant',
                    content: msg.content
                });
            }
        }

        // Add current message
        messages.push({
            role: 'user',
            content: message
        });

        // Get AI response
        const response = await chat(messages, {
            model: context.activeModel || 'gpt-4o-mini',
            temperature: 0.7,
            maxTokens: 1000
        });

        return NextResponse.json({
            success: true,
            response,
            context: {
                ordersCount: context.orders.length,
                stats: context.stats
            }
        });
    } catch (error) {
        console.error('AI Chat Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'AI request failed';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
