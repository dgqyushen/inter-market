
interface Env {
    AI_API_URL: string;
    AI_API_KEY: string;
    AI_MODEL: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
    const { request, env } = context;

    // Cross-Origin Resource Sharing (CORS) headers if needed
    // Since we are same-origin, we might not strictly need them, but good for local dev if proxied
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { messages } = await request.json() as { messages: any[] };

        const apiKey = env.AI_API_KEY;
        const apiUrl = env.AI_API_URL || 'https://qwen.deepthinks.org/v1/chat/completions';
        const model = env.AI_MODEL || 'qwen3-max-2026-01-23';

        if (!apiKey) {
            return new Response(JSON.stringify({ error: 'Server misconfigured: Missing API Key' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json', ...corsHeaders },
            });
        }

        // Forward request to AI provider
        const aiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                messages,
                temperature: 0.7,
                max_tokens: 1500,
                stream: true,
            }),
        });

        if (!aiResponse.ok) {
            const errorText = await aiResponse.text();
            return new Response(JSON.stringify({ error: `AI Provider Error: ${errorText}` }), {
                status: aiResponse.status,
                headers: { 'Content-Type': 'application/json', ...corsHeaders },
            });
        }

        // Stream the response back
        return new Response(aiResponse.body, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                ...corsHeaders,
            },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
    }
};
