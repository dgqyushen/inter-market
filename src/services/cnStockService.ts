import type { KLineData } from '../components/KLineChart'

const CORS_PROXY = 'https://corsproxy.io/?'
const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart'

// 基准ETF接口
interface BenchmarkETF {
  symbol: string
  name: string
}

// 默认A股基准ETF列表
const DEFAULT_CN_BENCHMARK_ETFS: BenchmarkETF[] = [
  { symbol: '510300.SS', name: '沪深300ETF' },
  { symbol: '510050.SS', name: '上证50ETF' },
  { symbol: '159949.SZ', name: '创业板50ETF' },
]

// 从环境变量解析基准ETF配置
function parseBenchmarkETFs(): BenchmarkETF[] {
  const envValue = import.meta.env.VITE_CN_BENCHMARK_ETFS

  if (!envValue) {
    return DEFAULT_CN_BENCHMARK_ETFS
  }

  try {
    const parsed = JSON.parse(envValue)
    if (!Array.isArray(parsed)) {
      console.warn('VITE_CN_BENCHMARK_ETFS is not an array, using default')
      return DEFAULT_CN_BENCHMARK_ETFS
    }

    // 验证每个条目的格式
    const validEtfs = parsed.filter(
      (item: unknown) =>
        typeof item === 'object' &&
        item !== null &&
        'symbol' in item &&
        'name' in item &&
        typeof (item as BenchmarkETF).symbol === 'string' &&
        typeof (item as BenchmarkETF).name === 'string'
    )

    if (validEtfs.length === 0) {
      console.warn('No valid ETFs found in VITE_CN_BENCHMARK_ETFS, using default')
      return DEFAULT_CN_BENCHMARK_ETFS
    }

    return validEtfs as BenchmarkETF[]
  } catch {
    console.warn('Failed to parse VITE_CN_BENCHMARK_ETFS, using default')
    return DEFAULT_CN_BENCHMARK_ETFS
  }
}

// A股基准ETF列表 (支持环境变量配置)
export const CN_BENCHMARK_ETFS: BenchmarkETF[] = parseBenchmarkETFs()

export interface CNStockPrice {
  symbol: string
  name: string
  price: number
  change: number
  percentChange: number
  timestamp: number
}

export interface CNTradingPair {
  symbol: string // e.g., "000001.SS/510300.SS"
  displayName: string // e.g., "平安银行 / 沪深300ETF"
  ratio: number
  numeratorPrice: number
  denominatorPrice: number
}

interface YahooChartResult {
  timestamp: number[]
  meta: {
    regularMarketPrice: number
    previousClose?: number
    chartPreviousClose?: number
    symbol: string
    shortName?: string
    longName?: string
  }
  indicators: {
    quote: Array<{
      open: number[]
      high: number[]
      low: number[]
      close: number[]
      volume: number[]
    }>
  }
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
 * Fetch current price for a CN stock
 */
async function fetchCNQuote(symbol: string): Promise<CNStockPrice> {
  const url = `${CORS_PROXY}${encodeURIComponent(`${YAHOO_BASE}/${symbol}?interval=1d&range=1d`)}`

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`获取 ${symbol} 失败: ${response.statusText}`)
  }

  const data = await response.json()
  const result: YahooChartResult = data.chart?.result?.[0]

  if (!result) {
    throw new Error(`无法获取 ${symbol} 的数据`)
  }

  const meta = result.meta
  const price = meta.regularMarketPrice
  const previousClose = meta.previousClose || meta.chartPreviousClose || price

  return {
    symbol,
    name: meta.shortName || meta.longName || symbol,
    price,
    change: price - previousClose,
    percentChange: ((price - previousClose) / previousClose) * 100,
    timestamp: Date.now(),
  }
}

/**
 * Fetch prices for all benchmark ETFs
 */
export async function fetchBenchmarkPrices(): Promise<Record<string, CNStockPrice>> {
  const results = await Promise.all(CN_BENCHMARK_ETFS.map(etf => fetchCNQuote(etf.symbol)))

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
  return fetchCNQuote(symbol)
}

/**
 * Calculate ratio pairs between a stock and all benchmark ETFs
 */
export async function fetchCNRatioPairs(stockCode: string): Promise<CNTradingPair[]> {
  const symbol = convertToCNSymbol(stockCode)

  // Fetch stock and all benchmarks in parallel
  const [stockPrice, benchmarkPrices] = await Promise.all([
    fetchCNQuote(symbol),
    fetchBenchmarkPrices(),
  ])

  // Calculate ratio with each benchmark
  const pairs: CNTradingPair[] = CN_BENCHMARK_ETFS.map(etf => {
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
 * Fetch historical K-line data for a CN stock
 */
async function fetchCNHistoricalData(
  symbol: string,
  range: string = 'max',
  interval: string = '1d'
): Promise<KLineData[]> {
  const apiUrl = `${YAHOO_BASE}/${symbol}?interval=${interval}&range=${range}`
  const url = `${CORS_PROXY}${encodeURIComponent(apiUrl)}`

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`获取 ${symbol} 历史数据失败: ${response.statusText}`)
  }

  const data = await response.json()
  const result: YahooChartResult = data.chart?.result?.[0]

  if (!result || !result.timestamp) {
    throw new Error(`无法获取 ${symbol} 的历史数据`)
  }

  const { timestamp, indicators } = result
  const quote = indicators.quote[0]

  const klineData: KLineData[] = []

  for (let i = 0; i < timestamp.length; i++) {
    if (
      quote.open[i] == null ||
      quote.high[i] == null ||
      quote.low[i] == null ||
      quote.close[i] == null
    ) {
      continue
    }

    klineData.push({
      timestamp: timestamp[i] * 1000,
      open: quote.open[i],
      high: quote.high[i],
      low: quote.low[i],
      close: quote.close[i],
      volume: quote.volume[i] || 0,
    })
  }

  return klineData
}

/**
 * Get appropriate range based on interval
 */
function getAppropriateRange(interval: string): string {
  switch (interval) {
    case '1d':
      return '2y'
    case '1wk':
      return '10y'
    case '1mo':
      return 'max'
    default:
      return '2y'
  }
}

/**
 * Calculate ratio K-line data from two symbols' historical data
 */
function calculateRatioKLine(
  numeratorData: KLineData[],
  denominatorData: KLineData[]
): KLineData[] {
  const numFirstTimestamp = numeratorData.length > 0 ? numeratorData[0].timestamp : 0
  const denomFirstTimestamp = denominatorData.length > 0 ? denominatorData[0].timestamp : 0
  const commonStartTimestamp = Math.max(numFirstTimestamp, denomFirstTimestamp)

  const denomMap = new Map<number, KLineData>()
  denominatorData.forEach(item => {
    denomMap.set(item.timestamp, item)
  })

  const ratioData: KLineData[] = []

  for (const numItem of numeratorData) {
    if (numItem.timestamp < commonStartTimestamp) {
      continue
    }

    const denomItem = denomMap.get(numItem.timestamp)

    if (!denomItem) {
      continue
    }

    const ratioOpen = numItem.open / denomItem.open
    const ratioClose = numItem.close / denomItem.close

    const possibleHighs = [numItem.high / denomItem.low, numItem.high / denomItem.high]
    const possibleLows = [numItem.low / denomItem.high, numItem.low / denomItem.low]

    const ratioHigh = Math.max(...possibleHighs, ratioOpen, ratioClose)
    const ratioLow = Math.min(...possibleLows, ratioOpen, ratioClose)

    ratioData.push({
      timestamp: numItem.timestamp,
      open: ratioOpen,
      high: ratioHigh,
      low: ratioLow,
      close: ratioClose,
      volume: numItem.volume,
    })
  }

  return ratioData
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
    fetchCNHistoricalData(numerator.trim(), actualRange, interval),
    fetchCNHistoricalData(denominator.trim(), actualRange, interval),
  ])

  return calculateRatioKLine(numeratorData, denominatorData)
}
