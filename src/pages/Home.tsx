import { useEffect, useState } from 'react'
import { PriceCard } from '../components/PriceCard'
import { StockSearchInput } from '../components/StockSearchInput'
import { ChartModal, type TimeInterval } from '../components/ChartModal'
import {
  fetchCNRatioPairs,
  fetchCNRatioKLine,
  type CNTradingPair,
} from '../services/cnStockService'
import {
  fetchUSRatioPairs,
  fetchUSRatioKLine,
  type USTradingPair,
} from '../services/usStockService'
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
  // Auto-refresh state
  const [nextRefreshTime, setNextRefreshTime] = useState<Date>(getNextRefreshTime)
  const [timeRemaining, setTimeRemaining] = useState<string>('')

  // Modal state
  const [selectedPair, setSelectedPair] = useState<string | null>(null)
  const [selectedDisplayName, setSelectedDisplayName] = useState<string | null>(null)
  const [chartData, setChartData] = useState<KLineData[]>([])
  const [chartLoading, setChartLoading] = useState(false)
  const [chartError, setChartError] = useState<string | null>(null)
  const [chartInterval, setChartInterval] = useState<TimeInterval>('1d')
  const [isCNChart, setIsCNChart] = useState(false)
  const [isUSSearchChart, setIsUSSearchChart] = useState(false)

  // CN Stock state
  const [cnPairs, setCnPairs] = useState<CNTradingPair[]>([])
  const [cnLoading, setCnLoading] = useState(false)
  const [cnError, setCnError] = useState<string | null>(null)
  const [searchedStock, setSearchedStock] = useState<string | null>(null)

  // US Stock search state
  const [usPairs, setUsPairs] = useState<USTradingPair[]>([])
  const [usLoading, setUsLoading] = useState(false)
  const [usError, setUsError] = useState<string | null>(null)
  const [searchedUSStock, setSearchedUSStock] = useState<string | null>(null)

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
        let data: KLineData[]
        if (isCNChart) {
          data = await fetchCNRatioKLine(selectedPair, chartInterval)
        } else if (isUSSearchChart) {
          data = await fetchUSRatioKLine(selectedPair, chartInterval)
        } else {
          // Fallback or generic handling
          setChartData([])
          return
        }
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
  }, [selectedPair, chartInterval, isCNChart, isUSSearchChart])

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
        // Refresh CN stock if one is selected
        if (searchedStock) {
          handleCNStockSearch(searchedStock)
        }
        // Refresh US stock if one is selected
        if (searchedUSStock) {
          handleUSStockSearch(searchedUSStock)
        }
        setNextRefreshTime(getNextRefreshTime())
      }
    }, 1000)

    // Initial update of text
    setTimeRemaining(formatTimeRemaining(nextRefreshTime))

    return () => clearInterval(timer)
  }, [nextRefreshTime, searchedStock, searchedUSStock])

  const handleCNCardClick = (symbol: string, displayName: string) => {
    console.log('CN Card clicked:', symbol, displayName)
    setIsCNChart(true)
    setIsUSSearchChart(false)
    setSelectedPair(symbol)
    setSelectedDisplayName(displayName)
  }

  const handleUSSearchCardClick = (symbol: string, displayName: string) => {
    console.log('US Search Card clicked:', symbol, displayName)
    setIsCNChart(false)
    setIsUSSearchChart(true)
    setSelectedPair(symbol)
    setSelectedDisplayName(displayName)
  }

  const closeModal = () => {
    setSelectedPair(null)
    setSelectedDisplayName(null)
    setIsCNChart(false)
    setIsUSSearchChart(false)
  }

  const handleManualRefresh = () => {
    // Refresh CN stock if one is selected
    if (searchedStock) {
      handleCNStockSearch(searchedStock)
    }
    // Refresh US stock if one is selected
    if (searchedUSStock) {
      handleUSStockSearch(searchedUSStock)
    }
    // Note: Manual refresh doesn't reset the auto-refresh schedule (next :00 or :30)
  }

  const handleCNStockSearch = async (stockCode: string) => {
    setCnLoading(true)
    setCnError(null)
    setSearchedStock(stockCode)

    try {
      const pairs = await fetchCNRatioPairs(stockCode)
      setCnPairs(pairs)
    } catch (err) {
      console.error('Failed to fetch CN stock:', err)
      setCnError(err instanceof Error ? err.message : '获取股票数据失败')
      setCnPairs([])
    } finally {
      setCnLoading(false)
    }
  }

  const handleUSStockSearch = async (symbol: string) => {
    setUsLoading(true)
    setUsError(null)
    setSearchedUSStock(symbol)

    try {
      const pairs = await fetchUSRatioPairs(symbol)
      setUsPairs(pairs)
    } catch (err) {
      console.error('Failed to fetch US stock:', err)
      setUsError(err instanceof Error ? err.message : 'Failed to fetch stock data')
      setUsPairs([])
    } finally {
      setUsLoading(false)
    }
  }

  return (
    <div className="home-container">
      <h1 className="page-title">Inter-market Analysis</h1>

      {/* US Stock Search Section */}
      <section className="market-section us-search-section">
        <h2 className="section-title">
          <span className="section-icon">🔎</span>
          美股个股搜索
        </h2>

        <StockSearchInput market="us" onSearch={handleUSStockSearch} loading={usLoading} />

        {usLoading && (
          <div className="loading-state">
            <div className="spinner us-spinner"></div>
            <span>Loading...</span>
          </div>
        )}

        {usError && (
          <div className="error-state us-error">
            <span>⚠️ {usError}</span>
          </div>
        )}

        {usPairs.length > 0 && (
          <div className="price-grid us-price-grid">
            {usPairs.map(pair => (
              <PriceCard
                key={pair.symbol}
                variant="us"
                symbol={pair.symbol}
                displayName={pair.displayName}
                ratio={pair.ratio}
                onClick={() => handleUSSearchCardClick(pair.symbol, pair.displayName)}
              />
            ))}
          </div>
        )}

        {!usLoading && usPairs.length === 0 && !usError && (
          <div className="us-placeholder">
            <p>Enter a stock symbol to compare with benchmark ETFs</p>
            <p className="us-hint">Benchmark: QQQ, GLD, IBIT</p>
          </div>
        )}
      </section>

      {/* CN Market Section */}
      <section className="market-section cn-section">
        <h2 className="section-title">
          <span className="section-icon">🇨🇳</span>
          A股市场
        </h2>

        <StockSearchInput market="cn" onSearch={handleCNStockSearch} loading={cnLoading} />

        {cnLoading && (
          <div className="loading-state">
            <div className="spinner cn-spinner"></div>
            <span>加载中...</span>
          </div>
        )}

        {cnError && (
          <div className="error-state cn-error">
            <span>⚠️ {cnError}</span>
          </div>
        )}

        {cnPairs.length > 0 && (
          <div className="price-grid cn-price-grid">
            {cnPairs.map(pair => (
              <PriceCard
                key={pair.symbol}
                variant="cn"
                symbol={pair.symbol}
                displayName={pair.displayName}
                ratio={pair.ratio}
                onClick={() => handleCNCardClick(pair.symbol, pair.displayName)}
              />
            ))}
          </div>
        )}

        {!cnLoading && cnPairs.length === 0 && !cnError && (
          <div className="cn-placeholder">
            <p>输入A股代码查看与基准ETF的比较</p>
            <p className="cn-hint">基准：沪深300ETF、上证50ETF、创业板50ETF</p>
          </div>
        )}
      </section>

      <div className="status-bar">
        {(cnLoading || usLoading) && <span className="refreshing">Refreshing...</span>}

        <span className="next-refresh">
          Next refresh:{' '}
          {nextRefreshTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (
          {timeRemaining})
        </span>

        <button onClick={handleManualRefresh} className="refresh-btn" disabled={cnLoading || usLoading}>
          🔄 Refresh
        </button>
      </div>

      <ChartModal
        isOpen={!!selectedPair}
        onClose={closeModal}
        symbol={selectedPair || ''}
        displayName={selectedDisplayName || ''}
        data={chartData}
        loading={chartLoading}
        error={chartError}
        interval={chartInterval}
        onIntervalChange={setChartInterval}
      />
    </div>
  )
}
