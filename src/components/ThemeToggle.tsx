import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

function getInitialTheme(): Theme {
    // Check localStorage first
    const stored = localStorage.getItem('theme') as Theme | null
    if (stored === 'light' || stored === 'dark') {
        return stored
    }

    // Fall back to system preference
    if (window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light'
    }

    return 'dark'
}

export function ThemeToggle() {
    const [theme, setTheme] = useState<Theme>(getInitialTheme)

    useEffect(() => {
        // Apply theme to document
        document.documentElement.setAttribute('data-theme', theme)
        localStorage.setItem('theme', theme)
    }, [theme])

    const toggleTheme = () => {
        setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
    }

    return (
        <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
            {theme === 'dark' ? '☀️' : '🌙'}
        </button>
    )
}
