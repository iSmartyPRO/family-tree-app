import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import LanguageSwitcher from '../components/LanguageSwitcher'

export default function Login() {
  const { t } = useTranslation()
  const { login, loginTelegram } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email || !password) {
      setError(t('auth.error_required'))
      return
    }
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || t('auth.error_invalid'))
    } finally {
      setLoading(false)
    }
  }

  const handleTelegramLogin = () => {
    if (window.Telegram && window.Telegram.Login) {
      window.Telegram.Login.auth(
        { bot_id: window.__TELEGRAM_BOT_ID__ || '', request_access: true },
        (data) => {
          if (!data) return
          loginTelegram(data)
            .then(() => navigate('/dashboard'))
            .catch((err) => setError(err.message))
        }
      )
    } else {
      setError('Telegram widget not loaded')
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--bg)' }}>
      <div className="card" style={{ width: '100%', maxWidth: 420, padding: '40px 36px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
          <LanguageSwitcher />
        </div>

        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: 28, textAlign: 'center' }}>
          {t('auth.login_title')}
        </h1>

        {error && (
          <div style={{ background: '#fee2e2', color: '#dc2626', padding: '12px 16px', borderRadius: 'var(--radius)', marginBottom: 20, fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t('auth.email')}</label>
            <input
              className="form-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t('auth.password')}</label>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: 8 }}
          >
            {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : t('auth.login_btn')}
          </button>
        </form>

        <div style={{ textAlign: 'center', margin: '20px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          {t('auth.or')}
        </div>

        <button
          className="btn btn-secondary"
          style={{ width: '100%' }}
          onClick={handleTelegramLogin}
        >
          {t('auth.telegram_login')}
        </button>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          {t('auth.no_account')}{' '}
          <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>
            {t('nav.register')}
          </Link>
        </p>
      </div>
    </div>
  )
}
