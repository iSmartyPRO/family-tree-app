import React, { createContext, useContext, useLayoutEffect, useMemo, useState, useEffect, useRef } from 'react'
import { useAuth } from './AuthContext'

const STORAGE_KEY = 'ftree-theme'
const ThemeContext = createContext(null)

function readStoredTheme() {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'dark' || v === 'light') return v
  } catch (e) {}
  if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

export function ThemeProvider({ children }) {
  const { user, updatePreferences } = useAuth()
  const [theme, setThemeState] = useState(() => readStoredTheme())
  const persistTimer = useRef(null)
  const userRef = useRef(user)

  useEffect(() => {
    userRef.current = user
  }, [user])

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch (e) {}
  }, [theme])

  useEffect(() => {
    const t = user && user.preferences && user.preferences.theme
    if (t === 'dark' || t === 'light') {
      setThemeState(t)
    }
  }, [user && user.id, user && user.preferences && user.preferences.theme])

  function persistThemeToDb(v) {
    if (!userRef.current) return
    clearTimeout(persistTimer.current)
    persistTimer.current = setTimeout(() => {
      updatePreferences({ theme: v }).catch(() => {})
    }, 400)
  }

  function setTheme(next) {
    const v = next === 'dark' ? 'dark' : 'light'
    setThemeState(v)
    persistThemeToDb(v)
  }

  function toggleTheme() {
    setThemeState((prev) => {
      const v = prev === 'dark' ? 'light' : 'dark'
      persistThemeToDb(v)
      return v
    })
  }

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      isDark: theme === 'dark',
    }),
    [theme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    return { theme: 'light', setTheme: () => {}, toggleTheme: () => {}, isDark: false }
  }
  return ctx
}
