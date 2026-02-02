import type { KLineData } from '../components/KLineChart'

const CORS_PROXY = 'https://corsproxy.io/?'
const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart'

interface YahooChartResult {
  timestamp: number[]
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
 * Fetch historical K-line data for a single symbol
 * @param symbol - Stock/ETF symbol (e.g., 'QQQ', 'GLD')
 * @param range - Time range (e.g., '1mo', '3mo', '6mo', '1y', '2y')
 * @param interval - Data interval (e.g., '1d', '1wk', '1mo')
 */
async function fetchHistoricalData(
  symbol: string,
  range: string = 'max',
  interval: string = '1d'
): Promise<KLineData[]> {
  const apiUrl = `${YAHOO_BASE}/${symbol}?interval=${interval}&range=${range}`
  const url = `${CORS_PROXY}${encodeURIComponent(apiUrl)}`

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to fetch ${symbol}: ${response.statusText}`)
  }

  const data = await response.json()
  const result: YahooChartResult = data.chart?.result?.[0]

  if (!result || !result.timestamp) {
    throw new Error(`No historical data available for ${symbol}`)
  }

  const { timestamp, indicators } = result
  const quote = indicators.quote[0]

  const klineData: KLineData[] = []

  for (let i = 0; i < timestamp.length; i++) {
    // Skip null values (market closed days, etc.)
    if (
      quote.open[i] == null ||
      quote.high[i] == null ||
      quote.low[i] == null ||
      quote.close[i] == null
    ) {
      continue
    }

    klineData.push({
      timestamp: timestamp[i] * 1000, // Convert to milliseconds
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
 * Calculate ratio K-line data from two symbols' historical data
 * Uses the later start date (the asset issued more recently) as the starting point
 * @param numeratorData - K-line data for numerator symbol
 * @param denominatorData - K-line data for denominator symbol
 * @returns K-line data representing the ratio
 */
function calculateRatioKLine(
  numeratorData: KLineData[],
  denominatorData: KLineData[]
): KLineData[] {
  // Find the common start date (the later of the two assets' first data points)
  const numFirstTimestamp = numeratorData.length > 0 ? numeratorData[0].timestamp : 0
  const denomFirstTimestamp = denominatorData.length > 0 ? denominatorData[0].timestamp : 0
  const commonStartTimestamp = Math.max(numFirstTimestamp, denomFirstTimestamp)

  // Create lookup map for denominator data by timestamp
  const denomMap = new Map<number, KLineData>()
  denominatorData.forEach(item => {
    denomMap.set(item.timestamp, item)
  })

  const ratioData: KLineData[] = []

  for (const numItem of numeratorData) {
    // Skip data before the common start date
    if (numItem.timestamp < commonStartTimestamp) {
      continue
    }

    const denomItem = denomMap.get(numItem.timestamp)

    if (!denomItem) {
      // No matching timestamp in denominator data, skip
      continue
    }

    // Calculate ratio for each OHLC value
    // For ratio: we divide numerator by denominator
    const ratioOpen = numItem.open / denomItem.open
    const ratioClose = numItem.close / denomItem.close

    // For high/low of ratio, we need to consider the direction
    // Simplified approach: calculate all four combinations and pick max/min
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
      volume: numItem.volume, // Use numerator's volume for reference
    })
  }

  return ratioData
}

/**
 * Get appropriate range based on interval to avoid Yahoo API limitations
 * Yahoo Finance API will auto-adjust interval if range is too large for the requested interval
 */
function getAppropriateRange(interval: string): string {
  switch (interval) {
    case '1d':
      return '2y' // Daily data: max 2 years to ensure we get actual daily data
    case '1wk':
      return '10y' // Weekly data: 10 years
    case '1mo':
      return 'max' // Monthly data: can use max
    default:
      return '2y'
  }
}

/**
 * Fetch ratio K-line data for a trading pair
 * @param pairSymbol - Trading pair symbol (e.g., 'QQQ/GLD')
 * @param range - Time range (will be overridden based on interval)
 * @param interval - Data interval
 */
export async function fetchRatioKLine(
  pairSymbol: string,
  _range: string = 'max', // Range is now auto-calculated based on interval
  interval: string = '1d'
): Promise<KLineData[]> {
  const [numerator, denominator] = pairSymbol.split('/')

  if (!numerator || !denominator) {
    throw new Error(`Invalid pair symbol: ${pairSymbol}`)
  }

  // Use appropriate range based on interval to avoid Yahoo API auto-adjusting
  const actualRange = getAppropriateRange(interval)

  // Fetch both symbols' historical data in parallel
  const [numeratorData, denominatorData] = await Promise.all([
    fetchHistoricalData(numerator.trim(), actualRange, interval),
    fetchHistoricalData(denominator.trim(), actualRange, interval),
  ])

  // Calculate and return the ratio K-line data
  return calculateRatioKLine(numeratorData, denominatorData)
}
