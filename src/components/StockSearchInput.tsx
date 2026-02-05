import { useState, useCallback, useRef, useEffect } from 'react'
import { searchStocks, type StockSearchResult } from '../services/stockSearchService'
import { searchUSStocks, type USStockSearchResult } from '../services/usStockSearchService'
import './StockSearchInput.css'

// 搜索结果的统一类型
type SearchResult = StockSearchResult | USStockSearchResult

// 市场配置
interface MarketConfig {
  placeholder: string
  hint: string
  buttonText: string
  loadingText: string
  emptyError: string
  selectError: string
  validateInput: (value: string) => boolean
  getDisplayText: (result: SearchResult) => string
  getKey: (result: SearchResult) => string
  getCode: (result: SearchResult) => string
  getName: (result: SearchResult) => string
  getMarket: (result: SearchResult) => string
  searchFn: (keyword: string) => Promise<SearchResult[]>
}

const MARKET_CONFIGS: Record<'cn' | 'us', MarketConfig> = {
  cn: {
    placeholder: '输入股票代码、中文名称或拼音首字母',
    hint: '支持代码(600000)、中文名(平安银行)、拼音首字母(payh)',
    buttonText: '查询',
    loadingText: '...',
    emptyError: '请输入股票代码或名称',
    selectError: '请从搜索结果中选择股票',
    validateInput: (value: string) => /^\d{6}$/.test(value.trim().replace(/\D/g, '')),
    getDisplayText: (result: SearchResult) => {
      const r = result as StockSearchResult
      return `${r.code} ${r.name}`
    },
    getKey: (result: SearchResult) => {
      const r = result as StockSearchResult
      return `${r.code}-${r.market}`
    },
    getCode: (result: SearchResult) => (result as StockSearchResult).code,
    getName: (result: SearchResult) => (result as StockSearchResult).name,
    getMarket: (result: SearchResult) => (result as StockSearchResult).market,
    searchFn: searchStocks,
  },
  us: {
    placeholder: 'Enter stock symbol or company name',
    hint: 'Search by symbol (AAPL) or company name (Apple)',
    buttonText: 'Search',
    loadingText: '...',
    emptyError: 'Please enter a stock symbol',
    selectError: 'Please select from search results',
    validateInput: (value: string) => /^[A-Z]{1,5}$/.test(value.trim().toUpperCase()),
    getDisplayText: (result: SearchResult) => {
      const r = result as USStockSearchResult
      return `${r.symbol} ${r.name}`
    },
    getKey: (result: SearchResult) => (result as USStockSearchResult).symbol,
    getCode: (result: SearchResult) => (result as USStockSearchResult).symbol,
    getName: (result: SearchResult) => (result as USStockSearchResult).name,
    getMarket: (result: SearchResult) => (result as USStockSearchResult).exchange,
    searchFn: searchUSStocks as (keyword: string) => Promise<SearchResult[]>,
  },
}

interface StockSearchInputProps {
  market: 'cn' | 'us'
  onSearch: (code: string, name?: string) => void
  loading?: boolean
  placeholder?: string
}

export function StockSearchInput({
  market,
  onSearch,
  loading = false,
  placeholder,
}: StockSearchInputProps) {
  const config = MARKET_CONFIGS[market]

  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<SearchResult[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [isSearching, setIsSearching] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounced search
  const searchWithDebounce = useCallback(
    (value: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }

      if (value.trim().length < 1) {
        setSuggestions([])
        setShowSuggestions(false)
        return
      }

      debounceRef.current = setTimeout(async () => {
        setIsSearching(true)
        try {
          const results = await config.searchFn(value)
          setSuggestions(results)
          setShowSuggestions(results.length > 0)
          setSelectedIndex(-1)
        } catch (err) {
          console.error('Search error:', err)
          setSuggestions([])
        } finally {
          setIsSearching(false)
        }
      }, 300)
    },
    [config]
  )

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!inputValue.trim()) {
        setError(config.emptyError)
        return
      }

      // If input looks valid, submit directly
      if (config.validateInput(inputValue)) {
        const code = market === 'us' ? inputValue.trim().toUpperCase() : inputValue.trim().replace(/\D/g, '')
        onSearch(code)
        setShowSuggestions(false)
        return
      }

      // Otherwise show error - must select from suggestions
      setError(config.selectError)
    },
    [inputValue, onSearch, config, market]
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)
    if (error) {
      setError(null)
    }
    searchWithDebounce(value)
  }

  const handleSuggestionClick = (suggestion: SearchResult) => {
    setInputValue(config.getDisplayText(suggestion))
    onSearch(config.getCode(suggestion), config.getName(suggestion))
    setShowSuggestions(false)
    setSuggestions([])
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSubmit(e as unknown as React.FormEvent)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex])
        } else if (suggestions.length > 0) {
          handleSuggestionClick(suggestions[0])
        } else {
          handleSubmit(e as unknown as React.FormEvent)
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        break
    }
  }

  const handleFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true)
    }
  }

  return (
    <div className={`stock-search-container stock-search--${market}`}>
      <form className="stock-search-form" onSubmit={handleSubmit}>
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            ref={inputRef}
            type="text"
            className={`stock-search-input ${error ? 'has-error' : ''}`}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            placeholder={placeholder || config.placeholder}
            maxLength={market === 'us' ? 50 : 20}
            disabled={loading}
          />
          {isSearching && <span className="search-loading">{config.loadingText}</span>}

          {/* Suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div ref={suggestionsRef} className="suggestions-dropdown">
              {suggestions.map((suggestion, index) => (
                <div
                  key={config.getKey(suggestion)}
                  className={`suggestion-item ${index === selectedIndex ? 'selected' : ''}`}
                  onClick={() => handleSuggestionClick(suggestion)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <span className="suggestion-code">{config.getCode(suggestion)}</span>
                  <span className="suggestion-name">{config.getName(suggestion)}</span>
                  <span className="suggestion-market">{config.getMarket(suggestion)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          type="submit"
          className="search-submit-btn"
          disabled={loading || !inputValue.trim()}
        >
          {loading ? <span className="btn-spinner"></span> : <span>{config.buttonText}</span>}
        </button>
      </form>
      {error && <p className="search-error">{error}</p>}
      <div className="search-hint">
        <span>{config.hint}</span>
      </div>
    </div>
  )
}
