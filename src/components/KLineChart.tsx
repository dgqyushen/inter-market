import { useEffect, useRef } from 'react'
import { init, dispose, type Chart } from 'klinecharts'

export interface KLineData {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  turnover?: number
}

interface KLineChartProps {
  data: KLineData[]
  symbol?: string
  width?: number | string
  height?: number | string
  theme?: 'light' | 'dark'
  interval?: string
}

export function KLineChart({
  data,
  symbol = 'CHART',
  width = '100%',
  height = 500,
  theme = 'dark',
  interval = '1d',
}: KLineChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<Chart | null>(null)

  useEffect(() => {
    if (!chartContainerRef.current) return

    // Dispose existing chart
    if (chartRef.current) {
      dispose(chartContainerRef.current)
      chartRef.current = null
    }

    // Initialize new chart
    const chart = init(chartContainerRef.current)
    if (!chart) return

    chartRef.current = chart

    // Set theme
    chart.setStyles(theme)

    // Apply data
    if (data.length > 0) {
      chart.applyNewData(data)

      // Scroll to the end
      requestAnimationFrame(() => {
        if (chart && data.length > 0) {
          chart.scrollToDataIndex(data.length - 1)
        }
      })
    }

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      chart.resize()
    })
    resizeObserver.observe(chartContainerRef.current)

    // Extra resize
    setTimeout(() => {
      chart.resize()
    }, 100)

    // Cleanup
    return () => {
      resizeObserver.disconnect()
      if (chartContainerRef.current) {
        dispose(chartContainerRef.current)
      }
      chartRef.current = null
    }
  }, [data, theme, interval])

  return <div ref={chartContainerRef} style={{ width, height }} id={`kline-chart-${symbol}`} />
}
