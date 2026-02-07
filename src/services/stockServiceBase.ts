/**
 * 股票服务基础模块
 * 包含 CN/US 股票服务的共用常量、类型和函数
 */

import type { KLineData } from '../components/KLineChart'

// 共用常量 - 使用 Vite 代理避免 CORS 问题
export const YAHOO_BASE = '/api/yahoo/v8/finance/chart'

// 共用类型
export interface BenchmarkETF {
    symbol: string
    name: string
}

export interface StockPrice {
    symbol: string
    name: string
    price: number
    change: number
    percentChange: number
    timestamp: number
}

export interface TradingPair {
    symbol: string
    displayName: string
    ratio: number
    numeratorPrice: number
    denominatorPrice: number
}

export interface YahooChartResult {
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
 * 根据时间间隔获取适当的数据范围
 */
export function getAppropriateRange(interval: string): string {
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
 * 计算两个标的的比值K线数据
 */
export function calculateRatioKLine(
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
 * 获取股票报价 (通用)
 */
export async function fetchQuote(symbol: string): Promise<StockPrice> {
    const url = `${YAHOO_BASE}/${symbol}?interval=1d&range=1d`

    const response = await fetch(url)

    if (!response.ok) {
        throw new Error(`Failed to fetch ${symbol}: ${response.statusText}`)
    }

    const data = await response.json()
    const result: YahooChartResult = data.chart?.result?.[0]

    if (!result) {
        throw new Error(`Could not get data for ${symbol}`)
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
 * 获取历史K线数据 (通用)
 */
export async function fetchHistoricalData(
    symbol: string,
    range: string = 'max',
    interval: string = '1d'
): Promise<KLineData[]> {
    const url = `${YAHOO_BASE}/${symbol}?interval=${interval}&range=${range}`

    const response = await fetch(url)

    if (!response.ok) {
        throw new Error(`Failed to fetch ${symbol} historical data: ${response.statusText}`)
    }

    const data = await response.json()
    const result: YahooChartResult = data.chart?.result?.[0]

    if (!result || !result.timestamp) {
        throw new Error(`Could not get historical data for ${symbol}`)
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
