import './PriceCard.css'

interface PriceCardProps {
  symbol: string
  ratio: number | null
  onClick?: () => void
}

export function PriceCard({ symbol, ratio, onClick }: PriceCardProps) {
  // 简单的格式化函数
  const formatRatio = (value: number | null): string => {
    if (value === null) return '--'
    return value.toFixed(4)
  }

  // 获取对应的emoji
  const getSymbolWithEmoji = (text: string) => {
    const assets = text.split('/')

    const assetMap: Record<string, string> = {
      IBIT: '₿',
      GLD: '🟡', // Using yellow circle for Gold
      QQQ: '🇺🇸', // Using US flag for Nasdaq
    }

    // Process each part (e.g., "QQQ" and "GLD" from "QQQ/GLD")
    const formattedAssets = assets.map(asset => {
      const emoji = assetMap[asset.trim()] || ''
      return emoji ? `${emoji} ${asset}` : asset
    })

    return formattedAssets.join(' / ')
  }

  return (
    <div
      className="price-card"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <h2 className="price-symbol">{getSymbolWithEmoji(symbol)}</h2>
      <p className="price-value">{formatRatio(ratio)}</p>
    </div>
  )
}
