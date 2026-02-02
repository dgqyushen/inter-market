import './CNPriceCard.css'

interface CNPriceCardProps {
  symbol: string
  displayName: string
  ratio: number | null
  onClick?: () => void
}

export function CNPriceCard({ symbol, displayName, ratio, onClick }: CNPriceCardProps) {
  const formatRatio = (value: number | null): string => {
    if (value === null) return '--'
    return value.toFixed(4)
  }

  // Extract stock and benchmark names from displayName
  const [stockName, benchmarkName] = displayName.split(' / ')

  return (
    <div
      className="cn-price-card"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="cn-card-header">
        <span className="cn-stock-name" title={symbol.split('/')[0]}>
          {stockName}
        </span>
        <span className="cn-divider">/</span>
        <span className="cn-benchmark-name" title={symbol.split('/')[1]}>
          {benchmarkName}
        </span>
      </div>
      <p className="cn-price-value">{formatRatio(ratio)}</p>
      <p className="cn-symbol-code">{symbol}</p>
    </div>
  )
}
