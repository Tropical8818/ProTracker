import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import OpenAI from 'openai';

export async function POST(request: Request) {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { apiKey } = await request.json();

        if (!apiKey || !apiKey.startsWith('sk-')) {
            return NextResponse.json({ error: 'Invalid API key format' }, { status: 400 });
        }

        // Test the API key with a simple request
        const openai = new OpenAI({ apiKey });

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: 'Say "OK"' }],
            max_tokens: 5
        });

        if (response.choices[0]?.message?.content) {
            return NextResponse.json({ success: true, message: 'API key is valid' });
        } else {
            return NextResponse.json({ error: 'Unexpected response from OpenAI' }, { status: 500 });
        }
    } catch (error) {
        console.error('AI Test Error:', error);
        const message = error instanceof Error ? error.message : 'Failed to test API key';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
