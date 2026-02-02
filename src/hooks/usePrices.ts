import { useState, useEffect, useCallback } from 'react'

import { fetchAllPrices, PriceData, TradingPair } from '../services/priceService'

interface UsePricesResult {
  prices: Record<string, PriceData>
  pairs: TradingPair[]
  loading: boolean
  error: string | null
  lastUpdated: Date | null
  refresh: () => Promise<void>
}

const REFRESH_INTERVAL = 30000 // 30 seconds

export function usePrices(): UsePricesResult {
  const [prices, setPrices] = useState<Record<string, PriceData>>({})
  const [pairs, setPairs] = useState<TradingPair[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const data = await fetchAllPrices()

      setPrices(data.prices)
      setPairs(data.pairs)
      setLastUpdated(new Date())
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch prices'
      setError(message)
      console.error('Price fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()

    const interval = setInterval(refresh, REFRESH_INTERVAL)

    return () => clearInterval(interval)
  }, [refresh])

  return {
    prices,
    pairs,
    loading,
    error,
    lastUpdated,
    refresh,
  }
}
