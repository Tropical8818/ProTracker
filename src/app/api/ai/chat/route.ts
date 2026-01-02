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

        // CRITICAL: productId is required for product line isolation
        // With 20-100 production lines, AI must never cross boundaries
        if (!productId) {
            return NextResponse.json({
                error: 'Product line must be specified for AI chat. Please select a product line first.'
            }, { status: 400 });
        }

        // Message is optional for 'report' mode (can be auto-triggered)
        if (!message && mode !== 'report' && mode !== 'analysis') {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        // INTELLIGENT QUERY: Extract WO ID or Employee ID from user message if present
        let queriedWoId: string | undefined;
        let queriedEmployeeId: string | undefined;

        if (message) {
            // 1. Explicit prefix match (Strongest signal) e.g., "WO 123", "Order #456", "工单 789"
            const explicitMatch = message.match(/(?:WO|Order|工单)[\s#.:-]*([A-Za-z0-9-]+)/i);
            if (explicitMatch) {
                queriedWoId = explicitMatch[1];
            } else {
                // 2. Pattern match (Heuristic) e.g., "6000856668", "WO-1234"
                const patternMatch = message.match(/\b([A-Z0-9]{2,}[-_]?[0-9]{3,}|[0-9]{4,})\b/i);
                if (patternMatch) {
                    // Start with assuming it is WO
                    queriedWoId = patternMatch[1];
                }
            }

            // 3. Employee ID Pattern: 4 digits (e.g., "2222", "8821")
            // Context heuristic: If user asks "what did 2222 do?", 2222 is likely an Employee ID
            // We look for 4-digit sequences that are NOT part of a larger number (like a year 2026 or a WO 6000...)
            // But wait, "2222" could be part of 60002222.
            // Strict regex: \b\d{4}\b.
            // Risk: 2026 (year). We might match year.
            // Heuristic: If it matches "2222", likely employee. If "202[0-9]", likely year.
            const employeeMatch = message.match(/\b(?!(?:19|20)\d{2}\b)(\d{4})\b/);
            if (employeeMatch) {
                queriedEmployeeId = employeeMatch[1];
                console.log('[AI Chat] Detected Employee ID in query:', queriedEmployeeId);
            }
        }

        if (queriedWoId) {
            console.log('[AI Chat] Detected WO ID in query:', queriedWoId);
        }

        // Build production context
        const context = await buildAIContext(productId, queriedWoId, queriedEmployeeId);
        const contextString = formatContextForAI(context, productId);

        // DEBUG: Log context to help diagnose issues
        console.log('[AI Chat] Product ID:', productId);
        console.log('[AI Chat] Orders count:', context.orders.length);
        console.log('[AI Chat] Active model:', context.activeModel);
        console.log('[AI Chat] Context preview (first 500 chars):', contextString.substring(0, 500));

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
