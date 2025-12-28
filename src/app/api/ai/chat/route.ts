import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { chat } from '@/lib/ai/client';
import { getConfig } from '@/lib/config';
import { SYSTEM_PROMPT, ROLE_PROMPTS, SCHEDULING_PROMPT, MORNING_REPORT_PROMPT } from '@/lib/ai/prompts';
import { buildAIContext, formatContextForAI } from '@/lib/ai/context';

export async function POST(request: Request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('your-')) {
        // Allow Ollama to bypass this check if provider is explicitly set later, but for now strict check
        // Actually, if using Ollama, we might not have OPENAI_API_KEY. 
        // We should relax this check if the context provider is ollama, but we don't know the context yet.
        // Let's assume valid key or local model. 
    }

    try {
        const body = await request.json();
        const { message, productId, conversationHistory, mode } = body;

        // Message is optional for 'report' mode (can be auto-triggered)
        if (!message && mode !== 'report' && mode !== 'analysis') {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        // Build production context
        const context = await buildAIContext(productId);
        const contextString = formatContextForAI(context, productId);

        // Get configurable prompts
        const config = getConfig();
        const activeSystemPrompt = config.systemPrompt || SYSTEM_PROMPT;

        let finalSystemPrompt = '';

        if (mode === 'analysis') {
            // Decision Support Mode
            finalSystemPrompt = `${SCHEDULING_PROMPT}\n\n## Current Production Data\n${contextString}`;
        } else if (mode === 'report') {
            // Morning Report Mode
            finalSystemPrompt = `${MORNING_REPORT_PROMPT}\n\n## Current Production Data\n${contextString}`;
        } else {
            // Standard Chat Mode
            const userRole = session.role || 'user';
            const configRolePrompts = config.rolePrompts || {};
            const rolePrompt = configRolePrompts[userRole] || ROLE_PROMPTS[userRole] || ROLE_PROMPTS['user'];
            finalSystemPrompt = `${activeSystemPrompt}\n\n${rolePrompt}\n\n## Current Production Data\n${contextString}`;
        }

        // Build messages array
        const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
            {
                role: 'system',
                content: finalSystemPrompt
            }
        ];

        // Add conversation history if provided (only for chat mode usually)
        if (conversationHistory && Array.isArray(conversationHistory) && !mode) {
            for (const msg of conversationHistory.slice(-10)) {
                messages.push({
                    role: msg.role as 'user' | 'assistant',
                    content: msg.content
                });
            }
        }

        // Add current message (if exists)
        if (message) {
            messages.push({
                role: 'user',
                content: message
            });
        } else if (mode === 'analysis') {
            messages.push({
                role: 'user',
                content: "Analyze current risks."
            });
        } else if (mode === 'report') {
            messages.push({
                role: 'user',
                content: "Generate the morning report."
            });
        }

        // Get AI response
        const response = await chat(messages, {
            model: context.activeModel || 'gpt-4o-mini',
            provider: context.activeProvider,
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
