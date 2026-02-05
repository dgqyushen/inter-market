/**
 * Cloudflare Pages Function: Yahoo Finance Search API Proxy
 * 代理 Yahoo Finance Search API 请求，避免 CORS 问题
 * 路由: /api/yahoo-search/*
 */

export const onRequest: PagesFunction = async (context) => {
    const { request, params } = context

    // 构建目标 URL
    const pathSegments = params.path as string[]
    const targetPath = pathSegments.join('/')
    const url = new URL(request.url)
    const queryString = url.search

    const targetUrl = `https://query2.finance.yahoo.com/${targetPath}${queryString}`

    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    }

    // Handle preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders })
    }

    try {
        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                Accept: 'application/json',
            },
        })

        if (!response.ok) {
            return new Response(
                JSON.stringify({ error: `Yahoo API Error: ${response.status} ${response.statusText}` }),
                {
                    status: response.status,
                    headers: { 'Content-Type': 'application/json', ...corsHeaders },
                }
            )
        }

        const data = await response.text()

        return new Response(data, {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=300', // 搜索结果缓存5分钟
                ...corsHeaders,
            },
        })
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json', ...corsHeaders },
            }
        )
    }
}
