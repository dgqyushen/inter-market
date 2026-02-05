/**
 * Cloudflare Pages Function: 配置 API
 * 返回前端需要的配置信息（不包含敏感信息）
 * 路由: /api/config
 */

interface Env {
    CN_BENCHMARK_ETFS?: string
}

interface BenchmarkETF {
    symbol: string
    name: string
}

const DEFAULT_CN_BENCHMARK_ETFS: BenchmarkETF[] = [
    { symbol: '510300.SS', name: '沪深300ETF' },
    { symbol: '510050.SS', name: '上证50ETF' },
    { symbol: '159949.SZ', name: '创业板50ETF' },
]

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const { env } = context

    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    }

    // 解析 CN_BENCHMARK_ETFS
    let cnBenchmarkEtfs = DEFAULT_CN_BENCHMARK_ETFS
    if (env.CN_BENCHMARK_ETFS) {
        try {
            const parsed = JSON.parse(env.CN_BENCHMARK_ETFS)
            if (Array.isArray(parsed) && parsed.length > 0) {
                cnBenchmarkEtfs = parsed
            }
        } catch {
            console.error('Failed to parse CN_BENCHMARK_ETFS')
        }
    }

    const config = {
        cnBenchmarkEtfs,
        // 可以在这里添加更多非敏感配置
    }

    return new Response(JSON.stringify(config), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=300', // 缓存5分钟
            ...corsHeaders,
        },
    })
}

// Handle OPTIONS for CORS preflight
export const onRequestOptions: PagesFunction = async () => {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    })
}
