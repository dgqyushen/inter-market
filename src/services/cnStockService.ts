import type { KLineData } from '../components/KLineChart'
import {
  type BenchmarkETF,
  type StockPrice,
  type TradingPair,
  getAppropriateRange,
  calculateRatioKLine,
  fetchQuote,
  fetchHistoricalData,
} from './stockServiceBase'
import { getAppConfig, getAppConfigSync } from './configService'

// 类型别名，保持向后兼容
export type CNStockPrice = StockPrice
export type CNTradingPair = TradingPair

// 为了兼容性，导出一个默认的 ETF 列表（同步访问）
// 建议使用 getCNBenchmarkETFs() 异步获取最新配置
export const CN_BENCHMARK_ETFS: BenchmarkETF[] = [
  { symbol: '510300.SS', name: '沪深300ETF' },
  { symbol: '510050.SS', name: '上证50ETF' },
  { symbol: '159949.SZ', name: '创业板50ETF' },
]

/**
 * 获取 A 股基准 ETF 列表（异步，推荐使用）
 */
export async function getCNBenchmarkETFs(): Promise<BenchmarkETF[]> {
  const config = await getAppConfig()
  return config.cnBenchmarkEtfs
}

/**
 * 获取 A 股基准 ETF 列表（同步，仅在配置已加载后使用）
 */
export function getCNBenchmarkETFsSync(): BenchmarkETF[] {
  return getAppConfigSync().cnBenchmarkEtfs
}

/**
 * Convert user input to Yahoo Finance symbol format
 * @param input - User input (e.g., "600000", "000001", "300001")
 * @returns Yahoo Finance symbol (e.g., "600000.SS", "000001.SZ")
 */
export function convertToCNSymbol(input: string): string {
  // Remove any whitespace
  const code = input.trim().toUpperCase()

  // 如果已经包含后缀，直接返回
  if (code.includes('.SS') || code.includes('.SZ') || code.includes('.BJ')) {
    return code
  }

  // 提取纯数字代码
  const numericCode = code.replace(/\D/g, '')

  if (numericCode.length !== 6) {
    throw new Error('请输入6位股票代码')
  }

  // 根据首位数字判断交易所
  const firstDigit = numericCode[0]
  const firstTwo = numericCode.substring(0, 2)
  const firstThree = numericCode.substring(0, 3)

  // 北交所: 8开头 或 43开头 或 83开头 或 87开头 或 88开头
  if (
    firstDigit === '8' ||
    firstTwo === '43' ||
    firstTwo === '83' ||
    firstTwo === '87' ||
    firstTwo === '88'
  ) {
    return `${numericCode}.BJ`
  }

  // 上交所: 6开头（主板）, 688开头（科创板）, 51开头（ETF）
  if (firstDigit === '6' || firstThree === '688' || firstTwo === '51') {
    return `${numericCode}.SS`
  }

  // 深交所: 0开头（主板）, 3开头（创业板）, 15开头（ETF）
  if (firstDigit === '0' || firstDigit === '3' || firstTwo === '15') {
    return `${numericCode}.SZ`
  }

  // 默认返回上交所
  return `${numericCode}.SS`
}

/**
 * Fetch prices for all benchmark ETFs
 */
export async function fetchBenchmarkPrices(): Promise<Record<string, CNStockPrice>> {
  const etfs = await getCNBenchmarkETFs()
  const results = await Promise.all(etfs.map(etf => fetchQuote(etf.symbol)))

  const prices: Record<string, CNStockPrice> = {}
  results.forEach(result => {
    prices[result.symbol] = result
  })

  return prices
}

/**
 * Fetch price for a user-input stock code
 */
export async function fetchCNStockPrice(stockCode: string): Promise<CNStockPrice> {
  const symbol = convertToCNSymbol(stockCode)
  return fetchQuote(symbol)
}

/**
 * Calculate ratio pairs between a stock and all benchmark ETFs
 */
export async function fetchCNRatioPairs(stockCode: string): Promise<CNTradingPair[]> {
  const symbol = convertToCNSymbol(stockCode)
  const etfs = await getCNBenchmarkETFs()

  // Fetch stock and all benchmarks in parallel
  const [stockPrice, benchmarkPrices] = await Promise.all([
    fetchQuote(symbol),
    fetchBenchmarkPrices(),
  ])

  // Calculate ratio with each benchmark
  const pairs: CNTradingPair[] = etfs.map(etf => {
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
 * Fetch ratio K-line data for a CN trading pair
 * @param pairSymbol - Trading pair symbol (e.g., '600000.SS/510300.SS')
 * @param interval - Data interval
 */
export async function fetchCNRatioKLine(
  pairSymbol: string,
  interval: string = '1d'
): Promise<KLineData[]> {
  const [numerator, denominator] = pairSymbol.split('/')

  if (!numerator || !denominator) {
    throw new Error(`无效的交易对: ${pairSymbol}`)
  }

  const actualRange = getAppropriateRange(interval)

  const [numeratorData, denominatorData] = await Promise.all([
    fetchHistoricalData(numerator.trim(), actualRange, interval),
    fetchHistoricalData(denominator.trim(), actualRange, interval),
  ])

  return calculateRatioKLine(numeratorData, denominatorData)
}
