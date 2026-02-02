import type { KLineData } from '../components/KLineChart'

export function generateMockData(count: number = 100, initialPrice: number = 100): KLineData[] {
  const data: KLineData[] = []
  let currentPrice = initialPrice
  let currentTime = new Date().getTime() - count * 60 * 60 * 1000 // Start from past

  for (let i = 0; i < count; i++) {
    const open = currentPrice
    const volatility = currentPrice * 0.02 // 2% volatility
    const change = (Math.random() - 0.5) * volatility
    const close = open + change
    const high = Math.max(open, close) + Math.random() * volatility * 0.5
    const low = Math.min(open, close) - Math.random() * volatility * 0.5
    const volume = Math.round(Math.random() * 10000)

    data.push({
      timestamp: currentTime,
      open,
      high,
      low,
      close,
      volume,
    })

    currentPrice = close
    currentTime += 60 * 60 * 1000 // 1 hour intervals
  }

  return data
}
