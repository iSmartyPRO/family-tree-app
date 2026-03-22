import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import LanguageSwitcher from './LanguageSwitcher'
import { Menu, X, TreeDeciduous } from 'lucide-react'

export default function Navbar() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/')
    setMenuOpen(false)
  }

  return (
    <nav className="app-nav">
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', height: '100%' }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'var(--text)' }}>
          <TreeDeciduous size={24} color="var(--primary)" />
          <span style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.5px' }}>Rodolog</span>
        </Link>

        {/* Desktop links */}
        <div className="nav-links" style={{ marginLeft: 32, display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          {!user && (
            <Link to="/" className="nav-link">{t('nav.home')}</Link>
          )}
          {user && (
            <Link to="/dashboard" className="nav-link">{t('nav.dashboard')}</Link>
          )}
          {user?.isAdmin && (
            <Link to="/admin" className="nav-link">{t('nav.admin')}</Link>
          )}
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
          <LanguageSwitcher />
          {user ? (
            <>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'none' }} className="user-name">{user.name}</span>
              <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
                {t('nav.logout')}
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-secondary btn-sm">{t('nav.login')}</Link>
              <Link to="/register" className="btn btn-primary btn-sm">{t('nav.register')}</Link>
            </>
          )}
          {/* Hamburger */}
          <button
            className="hamburger-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{
          position: 'absolute', top: 56, left: 0, right: 0,
          background: '#fff', borderBottom: '1px solid var(--border)',
          padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12, zIndex: 100
        }}>
          {!user && <Link to="/" onClick={() => setMenuOpen(false)} className="nav-link">{t('nav.home')}</Link>}
          {user && <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="nav-link">{t('nav.dashboard')}</Link>}
          {user?.isAdmin && <Link to="/admin" onClick={() => setMenuOpen(false)} className="nav-link">{t('nav.admin')}</Link>}
          {user ? (
            <button className="btn btn-secondary" onClick={handleLogout}>{t('nav.logout')}</button>
          ) : (
            <>
              <Link to="/login" onClick={() => setMenuOpen(false)} className="btn btn-secondary">{t('nav.login')}</Link>
              <Link to="/register" onClick={() => setMenuOpen(false)} className="btn btn-primary">{t('nav.register')}</Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
