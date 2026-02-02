import { useEffect, useState } from 'react'
import { KLineChart, type KLineData } from './KLineChart'
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

    // Listen for theme changes
    const [chartTheme, setChartTheme] = useState<'light' | 'dark'>(() => {
        return (
            (document.documentElement.getAttribute('data-theme') as
                | 'light'
                | 'dark') || 'dark'
        )
    })

    useEffect(() => {
        const observer = new MutationObserver(() => {
            const theme = document.documentElement.getAttribute('data-theme') as
                | 'light'
                | 'dark'
            setChartTheme(theme || 'dark')
        })

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme'],
        })

        return () => observer.disconnect()
    }, [])

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

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">{symbol} Ratio Trend</h2>
                    <div className="interval-selector">
                        {INTERVAL_OPTIONS.map((opt) => (
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
                    <button className="close-btn" onClick={onClose}>
                        &times;
                    </button>
                </div>
                <div className="modal-body">{renderContent()}</div>
            </div>
        </div>
    )
}
