import { useEffect, useState } from 'react'
import { PriceCard } from '../components/PriceCard'
import { ChartModal, type TimeInterval } from '../components/ChartModal'
import { fetchAllPrices } from '../services/priceService'
import { fetchRatioKLine } from '../services/historyService'
import type { TradingPair } from '../services/priceService'
import type { KLineData } from '../components/KLineChart'
import './Home.css'

// Helper to calculate the next :00 or :30 mark
const getNextRefreshTime = () => {
    const now = new Date()
    const next = new Date(now)
    const minutes = now.getMinutes()

    if (minutes < 30) {
        next.setMinutes(30)
    } else {
        next.setHours(now.getHours() + 1)
        next.setMinutes(0)
    }
    next.setSeconds(0)
    next.setMilliseconds(0)
    return next
}

// Helper to format remaining time
const formatTimeRemaining = (end: Date) => {
    const now = new Date()
    const diff = end.getTime() - now.getTime()
    if (diff <= 0) return '00:00'

    const minutes = Math.floor(diff / 60000)
    const seconds = Math.floor((diff % 60000) / 1000)
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

export function Home() {
    const [pairs, setPairs] = useState<TradingPair[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

    // Auto-refresh state
    const [nextRefreshTime, setNextRefreshTime] = useState<Date>(getNextRefreshTime)
    const [timeRemaining, setTimeRemaining] = useState<string>('')

    // Modal state
    const [selectedPair, setSelectedPair] = useState<string | null>(null)
    const [chartData, setChartData] = useState<KLineData[]>([])
    const [chartLoading, setChartLoading] = useState(false)
    const [chartError, setChartError] = useState<string | null>(null)
    const [chartInterval, setChartInterval] = useState<TimeInterval>('1d')



    // Fetch ratio K-line data when a pair is selected or interval changes
    useEffect(() => {
        if (!selectedPair) {
            setChartData([])
            setChartError(null)
            return
        }

        const loadChartData = async () => {
            setChartLoading(true)
            setChartError(null)
            try {
                const data = await fetchRatioKLine(selectedPair, 'max', chartInterval)
                setChartData(data)
            } catch (err) {
                console.error('Failed to fetch chart data:', err)
                setChartError(err instanceof Error ? err.message : 'Failed to load chart')
                setChartData([])
            } finally {
                setChartLoading(false)
            }
        }

        loadChartData()
    }, [selectedPair, chartInterval])

    const loadPrices = async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await fetchAllPrices()
            setPairs(data.pairs)
            setLastUpdated(new Date())
        } catch (err) {
            console.error('Failed to fetch prices:', err)
            setError(err instanceof Error ? err.message : 'Failed to fetch prices')
        } finally {
            setLoading(false)
        }
    }

    // Initial load
    useEffect(() => {
        loadPrices()
    }, [])

    // Timer for countdown and auto-refresh
    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date()

            // Update countdown text
            setTimeRemaining(formatTimeRemaining(nextRefreshTime))

            // Check if it's time to refresh
            // Allow 1s buffer to ensure we don't double trigger closely
            if (now >= nextRefreshTime) {
                console.log('Auto-refreshing at', now.toLocaleTimeString())
                loadPrices()
                setNextRefreshTime(getNextRefreshTime())
            }
        }, 1000)

        // Initial update of text
        setTimeRemaining(formatTimeRemaining(nextRefreshTime))

        return () => clearInterval(timer)
    }, [nextRefreshTime])

    const handleCardClick = (symbol: string) => {
        console.log('Card clicked:', symbol)
        setSelectedPair(symbol)
    }

    const closeModal = () => {
        setSelectedPair(null)
    }

    const handleManualRefresh = () => {
        loadPrices()
        // Note: Manual refresh doesn't reset the auto-refresh schedule (next :00 or :30)
    }

    return (
        <div className="home-container">
            <h1 className="page-title">Inter-market Analysis</h1>

            {loading && pairs.length === 0 && (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <span>Loading prices...</span>
                </div>
            )}

            {error && (
                <div className="error-state">
                    <span>⚠️ {error}</span>
                    <button onClick={handleManualRefresh} className="retry-btn">
                        Retry
                    </button>
                </div>
            )}

            {pairs.length > 0 && (
                <div className="price-grid">
                    {pairs.map((pair) => (
                        <PriceCard
                            key={pair.symbol}
                            symbol={pair.symbol}
                            ratio={pair.ratio}
                            onClick={() => handleCardClick(pair.symbol)}
                        />
                    ))}
                </div>
            )}

            <div className="status-bar">
                {loading && pairs.length > 0 && (
                    <span className="refreshing">Refreshing...</span>
                )}

                <span className="next-refresh">
                    Next refresh: {nextRefreshTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({timeRemaining})
                </span>

                {lastUpdated && (
                    <span className="last-updated">
                        Last updated: {lastUpdated.toLocaleTimeString()}
                    </span>
                )}
                <button onClick={handleManualRefresh} className="refresh-btn" disabled={loading}>
                    🔄 Refresh
                </button>
            </div>

            <ChartModal
                isOpen={!!selectedPair}
                onClose={closeModal}
                symbol={selectedPair || ''}
                data={chartData}
                loading={chartLoading}
                error={chartError}
                interval={chartInterval}
                onIntervalChange={setChartInterval}
            />
        </div>
    )
}
