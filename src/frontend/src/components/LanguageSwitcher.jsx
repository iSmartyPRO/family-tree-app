import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'

const LANGUAGES = [
  { code: 'ru', label: 'RU', flag: '🇷🇺' },
  { code: 'en', label: 'EN', flag: '🇬🇧' },
  { code: 'kg', label: 'KG', flag: '🇰🇬' },
  { code: 'tr', label: 'TR', flag: '🇹🇷' }
]

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)

  const current = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0]

  const handleChange = (code) => {
    i18n.changeLanguage(code)
    localStorage.setItem('lang', code)
    setOpen(false)
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
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
            background: '#fff', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)',
            zIndex: 99, minWidth: 120, overflow: 'hidden'
          }}>
            {LANGUAGES.map(lang => (
              <button
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
