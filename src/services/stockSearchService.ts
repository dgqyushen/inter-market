/**
 * A股股票搜索服务
 * 支持股票代码、中文名称、拼音首字母搜索
 */

export interface StockSearchResult {
    code: string // 股票代码 (如 600000)
    name: string // 股票名称 (如 浦发银行)
    market: string // 市场 (SH/SZ/BJ)
    fullSymbol: string // 完整代码 (如 600000.SS)
    pinyin: string // 拼音缩写
}

interface EastMoneySearchItem {
    Code: string // "000001"
    Name: string // "平安银行"
    MarketType: string // "AB" for A shares, etc.
    JYS: string // "2" for SZ, "1" for SH, "0" for BJ
    SecurityType: string // "Stock"
    SecurityTypeName: string // "A股"
    // Other fields...
}

interface EastMoneySearchResponse {
    QuotationCodeTable: {
        Data: EastMoneySearchItem[]
    }
}

const CORS_PROXY = 'https://corsproxy.io/?'

/**
 * 在东方财富API中搜索股票
 * 支持代码、中文名、拼音首字母
 */
export async function searchStocks(keyword: string): Promise<StockSearchResult[]> {
    if (!keyword || keyword.trim().length === 0) {
        return []
    }

    const query = keyword.trim()

    // 如果是纯数字且长度为6，直接返回该代码
    if (/^\d{6}$/.test(query)) {
        return [
            {
                code: query,
                name: query,
                market: getMarketFromCode(query),
                fullSymbol: convertToFullSymbol(query),
                pinyin: '',
            },
        ]
    }

    const apiUrl = `https://searchadapter.eastmoney.com/api/suggest/get?input=${encodeURIComponent(query)}&type=14&token=D43BF722C8E33BDC906FB84D85E326E8&count=10`

    try {
        const response = await fetch(`${CORS_PROXY}${encodeURIComponent(apiUrl)}`)

        if (!response.ok) {
            console.error('Stock search failed:', response.statusText)
            return []
        }

        const data: EastMoneySearchResponse = await response.json()
        const items = data?.QuotationCodeTable?.Data || []

        // Filter for A-shares only and convert to our format
        const results: StockSearchResult[] = items
            .filter(
                item =>
                    // Only A-shares
                    item.SecurityTypeName === 'A股' ||
                    item.SecurityType === 'Stock' ||
                    // Include these to cover different API responses
                    item.MarketType === 'AB'
            )
            .map(item => {
                const market = convertJYSToMarket(item.JYS)
                return {
                    code: item.Code,
                    name: item.Name,
                    market,
                    fullSymbol: convertCodeToYahoo(item.Code, market),
                    pinyin: item.Code, // API doesn't return pinyin directly, using code
                }
            })
            .slice(0, 8) // Limit results

        return results
    } catch (error) {
        console.error('Stock search error:', error)
        return []
    }
}

/**
 * Convert JYS code to market abbreviation
 */
function convertJYSToMarket(jys: string): string {
    switch (jys) {
        case '1':
            return 'SH'
        case '2':
            return 'SZ'
        case '0':
            return 'BJ'
        default:
            return 'SH'
    }
}

/**
 * Convert code to Yahoo Finance format
 */
function convertCodeToYahoo(code: string, market: string): string {
    switch (market) {
        case 'SH':
            return `${code}.SS`
        case 'SZ':
            return `${code}.SZ`
        case 'BJ':
            return `${code}.BJ`
        default:
            return `${code}.SS`
    }
}

/**
 * Detect market from code prefix
 */
function getMarketFromCode(code: string): string {
    const firstDigit = code[0]
    const firstTwo = code.substring(0, 2)
    const firstThree = code.substring(0, 3)

    // 北交所
    if (
        firstDigit === '8' ||
        firstTwo === '43' ||
        firstTwo === '83' ||
        firstTwo === '87' ||
        firstTwo === '88'
    ) {
        return 'BJ'
    }

    // 上交所
    if (firstDigit === '6' || firstThree === '688' || firstTwo === '51') {
        return 'SH'
    }

    // 深交所
    if (firstDigit === '0' || firstDigit === '3' || firstTwo === '15') {
        return 'SZ'
    }

    return 'SH'
}

/**
 * Convert code to Yahoo format based on code prefix
 */
function convertToFullSymbol(code: string): string {
    const market = getMarketFromCode(code)
    return convertCodeToYahoo(code, market)
}
