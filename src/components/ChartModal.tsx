import { useEffect, useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { KLineChart, type KLineData } from './KLineChart'
import { analyzeKLineWithAIStream, isAIConfigured } from '../services/aiAnalysisService'
import './ChartModal.css'

export type TimeInterval = '1d' | '1wk' | '1mo'

interface ChartModalProps {
  isOpen: boolean
  onClose: () => void
  symbol: string
  data: KLineData[]
  loading?: boolean
  error?: string | null
  interval: TimeInterval
  onIntervalChange: (interval: TimeInterval) => void
}

const INTERVAL_OPTIONS: { value: TimeInterval; label: string }[] = [
  { value: '1d', label: '日' },
  { value: '1wk', label: '周' },
  { value: '1mo', label: '月' },
]

export function ChartModal({
  isOpen,
  onClose,
  symbol,
  data,
  loading = false,
  error = null,
  interval,
  onIntervalChange,
}: ChartModalProps) {
  // AI Analysis state
  const [aiAnalyzing, setAiAnalyzing] = useState(false)
  const [aiText, setAiText] = useState('')
  const [aiError, setAiError] = useState<string | null>(null)
  const [showAiPanel, setShowAiPanel] = useState(false)
  const aiPanelContentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      window.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // Reset AI state when modal closes or symbol changes
  useEffect(() => {
    if (!isOpen) {
      setAiText('')
      setAiError(null)
      setShowAiPanel(false)
    }
  }, [isOpen, symbol])

  // Auto-scroll AI panel to bottom when new content arrives
  useEffect(() => {
    if (aiPanelContentRef.current && aiAnalyzing) {
      aiPanelContentRef.current.scrollTop = aiPanelContentRef.current.scrollHeight
    }
  }, [aiText, aiAnalyzing])

  // Listen for theme changes
  const [chartTheme, setChartTheme] = useState<'light' | 'dark'>(() => {
    return (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') || 'dark'
  })

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const theme = document.documentElement.getAttribute('data-theme') as 'light' | 'dark'
      setChartTheme(theme || 'dark')
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })

    return () => observer.disconnect()
  }, [])

  const handleAIAnalysis = async () => {
    if (data.length === 0 || aiAnalyzing) return

    setAiAnalyzing(true)
    setShowAiPanel(true)
    setAiText('')
    setAiError(null)

    await analyzeKLineWithAIStream(
      data,
      symbol,
      interval,
      // onChunk - 每次收到新内容
      (_chunk, fullText) => {
        setAiText(fullText)
      },
      // onComplete - 完成
      fullText => {
        setAiText(fullText)
        setAiAnalyzing(false)
      },
      // onError - 错误
      error => {
        setAiError(error)
        setAiAnalyzing(false)
      }
    )
  }

  const closeAiPanel = () => {
    setShowAiPanel(false)
  }

  if (!isOpen) return null

  const renderContent = () => {
    if (loading) {
      return (
        <div className="chart-loading">
          <div className="chart-spinner"></div>
          <span>Loading chart data...</span>
        </div>
      )
    }

    if (error) {
      return (
        <div className="chart-error">
          <span>⚠️ {error}</span>
        </div>
      )
    }

    if (data.length === 0) {
      return (
        <div className="chart-empty">
          <span>No data available</span>
        </div>
      )
    }

    // Use first timestamp to ensure key changes when data changes
    const dataKey = data.length > 0 ? data[0].timestamp : 0

    return (
      <KLineChart
        key={`${symbol}-${interval}-${dataKey}`}
        data={data}
        symbol={symbol}
        height="100%"
        theme={chartTheme}
        interval={interval}
      />
    )
  }

  const renderAIPanel = () => {
    if (!showAiPanel) return null

    return (
      <div className="ai-analysis-panel">
        <div className="ai-panel-header">
          <h3>🤖 AI 分析报告</h3>
          <button className="ai-panel-close" onClick={closeAiPanel}>
            &times;
          </button>
        </div>
        <div className="ai-panel-content" ref={aiPanelContentRef}>
          {aiError ? (
            <div className="ai-error">
              <span>❌ {aiError}</span>
            </div>
          ) : aiText ? (
            <div className="ai-result markdown-body">
              <ReactMarkdown>{aiText}</ReactMarkdown>
              {aiAnalyzing && <span className="typing-cursor">▊</span>}
            </div>
          ) : aiAnalyzing ? (
            <div className="ai-loading">
              <div className="ai-spinner"></div>
              <span>AI 正在分析中...</span>
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  const aiConfigured = isAIConfigured()

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-content ${showAiPanel ? 'with-ai-panel' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">{symbol} Ratio Trend</h2>
          <div className="header-controls">
            <div className="interval-selector interval-buttons">
              {INTERVAL_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  className={`interval-btn ${interval === opt.value ? 'active' : ''}`}
                  onClick={() => onIntervalChange(opt.value)}
                  disabled={loading}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <select
              className="interval-selector interval-dropdown"
              value={interval}
              onChange={e => onIntervalChange(e.target.value as TimeInterval)}
              disabled={loading}
            >
              {INTERVAL_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              className={`ai-analyze-btn ${!aiConfigured ? 'disabled' : ''}`}
              onClick={handleAIAnalysis}
              disabled={loading || data.length === 0 || aiAnalyzing || !aiConfigured}
              title={aiConfigured ? 'AI 智能分析' : '请先配置 AI API'}
            >
              {aiAnalyzing ? (
                <>
                  <span className="ai-btn-spinner"></span>
                  分析中
                </>
              ) : (
                <>🤖 AI分析</>
              )}
            </button>
          </div>
          <button className="close-btn" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-body">
          <div className="chart-container">{renderContent()}</div>
          {renderAIPanel()}
        </div>
      </div>
    </div>
  )
}
