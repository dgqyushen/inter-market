import { useState, useCallback, useRef, useEffect } from 'react'
import { searchStocks, type StockSearchResult } from '../services/stockSearchService'
import './StockSearchInput.css'

interface StockSearchInputProps {
  onSearch: (stockCode: string, stockName?: string) => void
  loading?: boolean
  placeholder?: string
}

export function StockSearchInput({
  onSearch,
  loading = false,
  placeholder = '输入股票代码、中文名称或拼音首字母',
}: StockSearchInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<StockSearchResult[]>([])
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
  const searchWithDebounce = useCallback((value: string) => {
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
        const results = await searchStocks(value)
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
  }, [])

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!inputValue.trim()) {
        setError('请输入股票代码或名称')
        return
      }

      // If pure 6-digit code, submit directly
      const pureCode = inputValue.trim().replace(/\D/g, '')
      if (pureCode.length === 6) {
        onSearch(pureCode)
        setShowSuggestions(false)
        return
      }

      // Otherwise show error - must select from suggestions
      setError('请从搜索结果中选择股票')
    },
    [inputValue, onSearch]
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)
    if (error) {
      setError(null)
    }
    searchWithDebounce(value)
  }

  const handleSuggestionClick = (suggestion: StockSearchResult) => {
    setInputValue(`${suggestion.code} ${suggestion.name}`)
    onSearch(suggestion.code, suggestion.name)
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
    <div className="stock-search-container">
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
            placeholder={placeholder}
            maxLength={20}
            disabled={loading}
          />
          {isSearching && <span className="search-loading">...</span>}

          {/* Suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div ref={suggestionsRef} className="suggestions-dropdown">
              {suggestions.map((suggestion, index) => (
                <div
                  key={`${suggestion.code}-${suggestion.market}`}
                  className={`suggestion-item ${index === selectedIndex ? 'selected' : ''}`}
                  onClick={() => handleSuggestionClick(suggestion)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <span className="suggestion-code">{suggestion.code}</span>
                  <span className="suggestion-name">{suggestion.name}</span>
                  <span className="suggestion-market">{suggestion.market}</span>
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
          {loading ? <span className="btn-spinner"></span> : <span>查询</span>}
        </button>
      </form>
      {error && <p className="search-error">{error}</p>}
      <div className="search-hint">
        <span>支持代码(600000)、中文名(平安银行)、拼音首字母(payh)</span>
      </div>
    </div>
  )
}
