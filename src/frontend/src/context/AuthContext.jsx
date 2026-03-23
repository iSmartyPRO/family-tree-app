import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import i18n from '../i18n'
import { patchMyPreferences } from '../services/api'

const AuthContext = createContext(null)

const UI_LANGS = ['ru', 'en', 'kg', 'tr']

function normalizeUserPayload(data) {
  return data.user || data
}

function applyLangFromUser(user) {
  const lng = user?.preferences?.lang
  if (lng && UI_LANGS.includes(lng)) {
    i18n.changeLanguage(lng)
    try {
      localStorage.setItem('lang', lng)
    } catch (_) {}
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'include'
      })
      if (res.ok) {
        const data = await res.json()
        const u = normalizeUserPayload(data)
        setUser(u)
        applyLangFromUser(u)
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshUser()
  }, [])

  const updatePreferences = useCallback(async (preferences) => {
    const data = await patchMyPreferences(preferences)
    const u = normalizeUserPayload(data)
    setUser(u)
    applyLangFromUser(u)
    return u
  }, [])

  const login = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Login failed')
    const u = normalizeUserPayload(data)
    setUser(u)
    applyLangFromUser(u)
    return data
  }

  const loginTelegram = async (telegramData) => {
    const res = await fetch('/api/auth/telegram', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(telegramData)
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Telegram login failed')
    const u = normalizeUserPayload(data)
    setUser(u)
    applyLangFromUser(u)
    return data
  }

  const register = async (email, password, name) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Registration failed')
    const u = normalizeUserPayload(data)
    setUser(u)
    applyLangFromUser(u)
    return data
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
    } catch {
      // ignore
    } finally {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, loginTelegram, register, logout, refreshUser, updatePreferences }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
