import type { KLineData } from '../components/KLineChart'
import {
    type BenchmarkETF,
    type StockPrice,
    type TradingPair,
    parseBenchmarkETFs,
    getAppropriateRange,
    calculateRatioKLine,
    fetchQuote,
    fetchHistoricalData,
} from './stockServiceBase'

// 默认美股基准ETF列表
const DEFAULT_US_BENCHMARK_ETFS: BenchmarkETF[] = [
    { symbol: 'QQQ', name: 'QQQ' },
    { symbol: 'GLD', name: 'GLD' },
    { symbol: 'IBIT', name: 'IBIT' },
]

// 美股基准ETF列表 (支持环境变量配置)
export const US_BENCHMARK_ETFS: BenchmarkETF[] = parseBenchmarkETFs(
    'VITE_US_BENCHMARK_ETFS',
    DEFAULT_US_BENCHMARK_ETFS
)

// 类型别名，保持向后兼容
export type USStockPrice = StockPrice
export type USTradingPair = TradingPair

/**
 * Fetch prices for all benchmark ETFs
 */
export async function fetchUSBenchmarkPrices(): Promise<Record<string, USStockPrice>> {
    const results = await Promise.all(US_BENCHMARK_ETFS.map(etf => fetchQuote(etf.symbol)))

    const prices: Record<string, USStockPrice> = {}
    results.forEach(result => {
        prices[result.symbol] = result
    })

    return prices
}

/**
 * Fetch price for a user-input stock code
 */
export async function fetchUSStockPrice(symbol: string): Promise<USStockPrice> {
    return fetchQuote(symbol.toUpperCase())
}

/**
 * Calculate ratio pairs between a stock and all benchmark ETFs
 */
export async function fetchUSRatioPairs(stockSymbol: string): Promise<USTradingPair[]> {
    const symbol = stockSymbol.toUpperCase()

    // Fetch stock and all benchmarks in parallel
    const [stockPrice, benchmarkPrices] = await Promise.all([
        fetchQuote(symbol),
        fetchUSBenchmarkPrices(),
    ])

    // Calculate ratio with each benchmark
    const pairs: USTradingPair[] = US_BENCHMARK_ETFS.map(etf => {
        const benchmarkPrice = benchmarkPrices[etf.symbol]
        const ratio = benchmarkPrice.price !== 0 ? stockPrice.price / benchmarkPrice.price : 0

        return {
            symbol: `${symbol}/${etf.symbol}`,
            displayName: `${stockPrice.name} / ${etf.name}`,
            ratio,
            numeratorPrice: stockPrice.price,
            denominatorPrice: benchmarkPrice.price,
        }
    })

    return pairs
}

/**
 * Fetch ratio K-line data for a US trading pair
 * @param pairSymbol - Trading pair symbol (e.g., 'AAPL/QQQ')
 * @param interval - Data interval
 */
export async function fetchUSRatioKLine(
    pairSymbol: string,
    interval: string = '1d'
): Promise<KLineData[]> {
    const [numerator, denominator] = pairSymbol.split('/')

    if (!numerator || !denominator) {
        throw new Error(`Invalid trading pair: ${pairSymbol}`)
    }

    const actualRange = getAppropriateRange(interval)

    const [numeratorData, denominatorData] = await Promise.all([
        fetchHistoricalData(numerator.trim(), actualRange, interval),
        fetchHistoricalData(denominator.trim(), actualRange, interval),
    ])

    return calculateRatioKLine(numeratorData, denominatorData)
}
