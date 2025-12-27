import OpenAI from 'openai';

// Get OpenAI client with current API key
function getOpenAI(): OpenAI {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey.includes('your-')) {
        throw new Error('OpenAI API key not configured');
    }
    return new OpenAI({ apiKey });
}

// Helper for chat completions
export async function chat(
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    options?: {
        model?: string;
        temperature?: number;
        maxTokens?: number;
    }
) {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
        model: options?.model || 'gpt-4o-mini',
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens || 1000,
    });

    return response.choices[0]?.message?.content || '';
}

// Stream chat for real-time responses
export async function* streamChat(
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    options?: {
        model?: string;
        temperature?: number;
    }
) {
    const openai = getOpenAI();
    const stream = await openai.chat.completions.create({
        model: options?.model || 'gpt-4o-mini',
        messages,
        temperature: options?.temperature ?? 0.7,
        stream: true,
    });

    for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
            yield content;
        }
    }
}

export default getOpenAI;
