import './PriceCard.css'

interface PriceCardProps {
    variant: 'cn' | 'us'
    symbol: string
    displayName: string
    ratio: number | null
    onClick?: () => void
}

export function PriceCard({ variant, symbol, displayName, ratio, onClick }: PriceCardProps) {
    // Format ratio display
    const formatRatio = (value: number | null): string => {
        if (value === null || value === 0) return '--'
        if (value >= 100) return value.toFixed(2)
        if (value >= 10) return value.toFixed(3)
        if (value >= 1) return value.toFixed(4)
        return value.toFixed(5)
    }

    // Extract parts from displayName for CN variant
    const [stockName, benchmarkName] = displayName.split(' / ')

    return (
        <div
            className={`price-card price-card--${variant}`}
            onClick={onClick}
            style={{ cursor: onClick ? 'pointer' : 'default' }}
        >
            {variant === 'cn' ? (
                <>
                    <div className="price-card-header">
                        <span className="price-card-stock-name" title={symbol.split('/')[0]}>
                            {stockName}
                        </span>
                        <span className="price-card-divider">/</span>
                        <span className="price-card-benchmark-name" title={symbol.split('/')[1]}>
                            {benchmarkName}
                        </span>
                    </div>
                    <p className="price-card-value">{formatRatio(ratio)}</p>
                    <p className="price-card-symbol-code">{symbol}</p>
                </>
            ) : (
                <>
                    <div className="price-card-header">
                        <span className="price-card-symbol">{symbol}</span>
                    </div>
                    <div className="price-card-name">{displayName}</div>
                    <div className="price-card-ratio">
                        <span className="price-card-value">{formatRatio(ratio)}</span>
                    </div>
                    <div className="price-card-footer">
                        <span className="price-card-hint">Click for chart</span>
                    </div>
                </>
            )}
        </div>
    )
}

// 导出类型别名以保持向后兼容
export { PriceCard as CNPriceCard }
export { PriceCard as USPriceCard }
