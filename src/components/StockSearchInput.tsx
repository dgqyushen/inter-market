import { useState, useCallback } from 'react'
import './StockSearchInput.css'

interface StockSearchInputProps {
  onSearch: (stockCode: string) => void
  loading?: boolean
  placeholder?: string
}

export function StockSearchInput({
  onSearch,
  loading = false,
  placeholder = '输入A股代码 (如: 600000, 000001)',
}: StockSearchInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  const validateInput = (value: string): boolean => {
    const code = value.trim().replace(/\D/g, '')
    if (code.length !== 6) {
      setError('请输入6位股票代码')
      return false
    }
    setError(null)
    return true
  }

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!inputValue.trim()) {
        setError('请输入股票代码')
        return
      }
      if (validateInput(inputValue)) {
        onSearch(inputValue.trim())
      }
    },
    [inputValue, onSearch]
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)
    if (error) {
      setError(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (!inputValue.trim()) {
        setError('请输入股票代码')
        return
      }
      if (validateInput(inputValue)) {
        onSearch(inputValue.trim())
      }
    }
  }

  return (
    <div className="stock-search-container">
      <form className="stock-search-form" onSubmit={handleSubmit}>
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className={`stock-search-input ${error ? 'has-error' : ''}`}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            maxLength={10}
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          className="search-submit-btn"
          disabled={loading || !inputValue.trim()}
        >
          {loading ? <span className="btn-spinner"></span> : <span>查询</span>}
        </button>
      </form>
      {error && <p className="search-error">{error}</p>}
      <div className="search-hint">
        <span>支持上证、深证、创业板、科创板、北交所股票代码</span>
      </div>
    </div>
  )
}
