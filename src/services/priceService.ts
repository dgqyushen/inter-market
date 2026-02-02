const CORS_PROXY = 'https://corsproxy.io/?'
const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart'

// Read trading pairs from environment variable
// Format: JSON array like ["QQQ/GLD","IBIT/GLD","IBIT/QQQ"]
const DEFAULT_PAIRS = '["QQQ/GLD","IBIT/GLD","IBIT/QQQ"]'
const TRADING_PAIRS_RAW = import.meta.env.VITE_TRADING_PAIRS || DEFAULT_PAIRS

export interface PriceData {
    symbol: string
    price: number
    change: number
    percentChange: number
    timestamp: number
}

export interface TradingPair {
    symbol: string
    ratio: number
    numeratorPrice: number
    denominatorPrice: number
}

/**
 * Parse trading pairs from JSON array string and extract unique symbols
 * @param pairsJson - JSON array string like '["QQQ/GLD","IBIT/GLD"]'
 * @returns Object containing parsed pairs and unique symbols
 */
function parseTradingPairs(pairsJson: string): {
    pairs: Array<{ numerator: string; denominator: string }>
    uniqueSymbols: string[]
} {
    let pairsArray: string[] = []

    try {
        pairsArray = JSON.parse(pairsJson)
        if (!Array.isArray(pairsArray)) {
            console.warn('VITE_TRADING_PAIRS is not an array, using default')
            pairsArray = JSON.parse(DEFAULT_PAIRS)
        }
    } catch {
        console.warn('Failed to parse VITE_TRADING_PAIRS, using default')
        pairsArray = JSON.parse(DEFAULT_PAIRS)
    }

    const pairs = pairsArray
        .filter((pair) => typeof pair === 'string' && pair.includes('/'))
        .map((pair) => {
            const [numerator, denominator] = pair.split('/')
            return {
                numerator: numerator.trim().toUpperCase(),
                denominator: denominator.trim().toUpperCase(),
            }
        })

    // Extract unique symbols from all pairs
    const symbolSet = new Set<string>()
    pairs.forEach(({ numerator, denominator }) => {
        symbolSet.add(numerator)
        symbolSet.add(denominator)
    })

    return {
        pairs,
        uniqueSymbols: Array.from(symbolSet),
    }
}

async function fetchQuote(symbol: string): Promise<PriceData> {
    const url = `${CORS_PROXY}${encodeURIComponent(`${YAHOO_BASE}/${symbol}?interval=1d&range=1d`)}`

    const response = await fetch(url)

    if (!response.ok) {
        throw new Error(`Failed to fetch ${symbol}: ${response.statusText}`)
    }

    const data = await response.json()
    const result = data.chart?.result?.[0]

    if (!result) {
        throw new Error(`No data available for ${symbol}`)
    }

    const meta = result.meta
    const price = meta.regularMarketPrice
    const previousClose = meta.previousClose || meta.chartPreviousClose

    return {
        symbol,
        price: price,
        change: price - previousClose,
        percentChange: ((price - previousClose) / previousClose) * 100,
        timestamp: Date.now(),
    }
}

export async function fetchAllPrices(): Promise<{
    prices: Record<string, PriceData>
    pairs: TradingPair[]
}> {
    // Parse pairs from environment variable
    const { pairs: pairConfigs, uniqueSymbols } = parseTradingPairs(TRADING_PAIRS_RAW)

    // Fetch all unique symbols in parallel
    const results = await Promise.all(uniqueSymbols.map(fetchQuote))

    // Build price lookup map
    const prices: Record<string, PriceData> = {}
    results.forEach((result) => {
        prices[result.symbol] = result
    })

    // Calculate ratios for each configured pair
    const pairs: TradingPair[] = pairConfigs.map(({ numerator, denominator }) => {
        const numPrice = prices[numerator]?.price ?? 0
        const denPrice = prices[denominator]?.price ?? 1 // Avoid division by zero

        return {
            symbol: `${numerator}/${denominator}`,
            ratio: denPrice !== 0 ? numPrice / denPrice : 0,
            numeratorPrice: numPrice,
            denominatorPrice: denPrice,
        }
    })

    return { prices, pairs }
}

/**
 * Get the currently configured trading pairs (for display purposes)
 */
export function getConfiguredPairs(): string[] {
    const { pairs } = parseTradingPairs(TRADING_PAIRS_RAW)
    return pairs.map(({ numerator, denominator }) => `${numerator}/${denominator}`)
}

