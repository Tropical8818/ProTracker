import OpenAI from 'openai';
import { getConfig } from '../config';

// Get OpenAI client based on configuration (OpenAI or Ollama)
function getOpenAI(providerOverride?: 'openai' | 'ollama'): OpenAI {
    const config = getConfig();
    const provider = providerOverride || config.aiProvider || 'openai';

    if (provider === 'ollama') {
        // Ollama local instance
        const baseURL = config.ollamaUrl || 'http://localhost:11434/v1';
        return new OpenAI({
            baseURL,
            apiKey: 'ollama', // Required by SDK but unused by Ollama
            dangerouslyAllowBrowser: true // Sometimes needed for local dev
        });
    }

    // Default: OpenAI Cloud
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey.includes('your-')) {
        // If provider is explicitly ollama, we shouldn't fail on missing OpenAI key, but here we are in 'openai' block
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
        provider?: 'openai' | 'ollama';
    }
) {
    const config = getConfig();
    const openai = getOpenAI(options?.provider);

    // Determine model to use
    let model = options?.model || 'gpt-4o-mini';

    // If provider is Ollama but no model specified (or default openai model passed), try to use global default
    if (options?.provider === 'ollama' && (model === 'gpt-4o-mini' || !options.model)) {
        model = config.ollamaModel || 'llama3.1';
    } else if (config.aiProvider === 'ollama' && !options?.provider) {
        // Fallback to global config if no provider specified in options
        model = config.ollamaModel || 'llama3.1';
    }

    const response = await openai.chat.completions.create({
        model,
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
    const config = getConfig();
    const openai = getOpenAI();

    // Determine model to use
    let model = options?.model || 'gpt-4o-mini';
    if (config.aiProvider === 'ollama') {
        model = config.ollamaModel || 'llama3.1';
    }

    const stream = await openai.chat.completions.create({
        model,
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
