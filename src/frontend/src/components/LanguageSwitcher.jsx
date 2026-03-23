import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const LANGUAGES = [
  { code: 'ru', label: 'RU', flag: 'RU' },
  { code: 'en', label: 'EN', flag: 'EN' },
  { code: 'kg', label: 'KG', flag: 'KG' },
  { code: 'tr', label: 'TR', flag: 'TR' }
]

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const { user, updatePreferences } = useAuth()
  const [open, setOpen] = useState(false)

  const current = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0]

  const handleChange = (code) => {
    i18n.changeLanguage(code)
    try {
      localStorage.setItem('lang', code)
    } catch (_) {}
    if (user) {
      updatePreferences({ lang: code }).catch(() => {})
    }
    setOpen(false)
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          background: 'none', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '5px 10px',
          cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
          color: 'var(--text)'
        }}
      >
        <span>{current.flag}</span>
        <span>{current.label}</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 98 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', top: '110%', right: 0,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)',
            zIndex: 99, minWidth: 120, overflow: 'hidden'
          }}>
            {LANGUAGES.map(lang => (
              <button
                type="button"
                key={lang.code}
                onClick={() => handleChange(lang.code)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '9px 14px', background: 'none',
                  border: 'none', cursor: 'pointer', fontSize: '0.9rem',
                  textAlign: 'left', fontWeight: lang.code === i18n.language ? 700 : 400,
                  color: lang.code === i18n.language ? 'var(--primary)' : 'var(--text)'
                }}
              >
                <span>{lang.flag}</span>
                <span>{lang.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
