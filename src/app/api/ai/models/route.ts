import { NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const config = getConfig();
        const providerParam = searchParams.get('provider');
        // Allow overriding provider via query param for UI preview
        const provider = providerParam || config.aiProvider || 'openai';

        if (provider === 'ollama') {
            const baseUrl = config.ollamaUrl || 'http://localhost:11434/v1';
            // Output for debugging
            console.log(`[API] Fetching models from Ollama. Configured URL: ${baseUrl}`);

            try {
                // Try original URL first
                let targetUrl = `${baseUrl}/models`;

                console.log(`[API] Attempting fetch: ${targetUrl}`);
                const res = await fetch(targetUrl);

                if (res.ok) {
                    const data = await res.json();
                    console.log(`[API] Success fetching from ${targetUrl}. Found ${data.data?.length} models.`);
                    return NextResponse.json(data);
                } else {
                    console.log(`[API] Failed fetch from ${targetUrl}: ${res.status} ${res.statusText}`);
                }

                // Fallback: Try localhost -> 127.0.0.1 replacement if localhost failed
                if (baseUrl.includes('localhost')) {
                    const ipUrl = baseUrl.replace('localhost', '127.0.0.1');
                    console.log(`[API] Attempting fallback IP fetch: ${ipUrl}/models`);
                    const resIp = await fetch(`${ipUrl}/models`);
                    if (resIp.ok) {
                        const data = await resIp.json();
                        return NextResponse.json(data);
                    }
                }

                // Fallback to native API if /v1/models fails (maybe user entered root url)
                // If url is http://localhost:11434/v1, root is http://localhost:11434
                const rootUrl = baseUrl.replace(/\/v1\/?$/, '');
                console.log(`[API] Attempting native API fallback: ${rootUrl}/api/tags`);
                const resNative = await fetch(`${rootUrl}/api/tags`);
                if (resNative.ok) {
                    const data = await resNative.json();
                    // Map native format to OpenAI format for frontend consistency
                    return NextResponse.json({
                        data: data.models?.map((m: any) => ({
                            id: m.name,
                            object: 'model',
                            created: Date.parse(m.modified_at) / 1000,
                            owned_by: 'ollama'
                        })) || []
                    });
                }

                throw new Error('Failed to fetch from Ollama');
            } catch (e) {
                console.error('Ollama fetch error:', e);
                return NextResponse.json({ error: 'Failed to connect to Ollama. Check URL.' }, { status: 500 });
            }
        } else {
            // Return standard OpenAI models
            return NextResponse.json({
                data: [
                    { id: 'gpt-4o-mini', object: 'model', owned_by: 'openai' },
                    { id: 'gpt-4o', object: 'model', owned_by: 'openai' },
                    { id: 'gpt-3.5-turbo', object: 'model', owned_by: 'openai' },
                    { id: 'gpt-4-turbo', object: 'model', owned_by: 'openai' }
                ]
            });
        }
    } catch (error) {
        console.error('Models API Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
