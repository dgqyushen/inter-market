/**
 * 美股股票搜索服务
 * 使用 Yahoo Finance 自动完成API搜索
 */

export interface USStockSearchResult {
    symbol: string // 股票代码 (如 AAPL)
    name: string // 股票名称 (如 Apple Inc.)
    exchange: string // 交易所 (如 NASDAQ)
    type: string // 类型 (如 EQUITY)
}

interface YahooAutoCompleteResult {
    symbol: string
    name: string
    exch: string
    type: string
    exchDisp: string
    typeDisp: string
}

interface YahooAutoCompleteResponse {
    quotes: YahooAutoCompleteResult[]
}

/**
 * 在 Yahoo Finance API 中搜索美股
 * 支持代码和公司名称搜索
 */
export async function searchUSStocks(keyword: string): Promise<USStockSearchResult[]> {
    if (!keyword || keyword.trim().length === 0) {
        return []
    }

    const query = keyword.trim()

    // 使用 Vite 代理避免 CORS 问题
    const apiUrl = `/api/yahoo-search/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query`

    try {
        const response = await fetch(apiUrl)

        if (!response.ok) {
            console.error('US Stock search failed:', response.statusText)
            return []
        }

        const data: YahooAutoCompleteResponse = await response.json()
        const quotes = data?.quotes || []

        // Filter for equities (stocks) only and US markets
        const results: USStockSearchResult[] = quotes
            .filter(
                item =>
                    item.type === 'EQUITY' &&
                    (item.exch === 'NYQ' ||
                        item.exch === 'NMS' ||
                        item.exch === 'NGM' ||
                        item.exch === 'NYS' ||
                        item.exch === 'NAS' ||
                        item.exch === 'PCX' ||
                        item.exch === 'ASE' ||
                        item.exchDisp?.includes('NYSE') ||
                        item.exchDisp?.includes('NASDAQ'))
            )
            .map(item => ({
                symbol: item.symbol,
                name: item.name || item.symbol,
                exchange: item.exchDisp || item.exch,
                type: item.typeDisp || item.type,
            }))
            .slice(0, 8) // Limit results

        return results
    } catch (error) {
        console.error('US Stock search error:', error)
        return []
    }
}

/**
 * 验证美股代码是否有效
 */
export function isValidUSSymbol(symbol: string): boolean {
    // US stock symbols are usually 1-5 uppercase letters
    return /^[A-Z]{1,5}$/.test(symbol.toUpperCase())
}
