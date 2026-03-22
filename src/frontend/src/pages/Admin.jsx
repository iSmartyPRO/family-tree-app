import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { getAdminConfig, updateAdminConfig, getUsers, updateUser, deleteUser } from '../services/api'

export default function Admin() {
  const { t } = useTranslation()
  const [tab, setTab] = useState('settings')
  const [config, setConfig] = useState({
    appName: '', logoUrl: '', baseUrl: '', primaryColor: '#4f6ef7', customCss: '',
    smtpHost: '', smtpPort: '', smtpUser: '', smtpPass: '', smtpFrom: '',
    telegramBotToken: '', telegramBotName: ''
  })
  const [users, setUsers] = useState([])
  const [savingConfig, setSavingConfig] = useState(false)
  const [configSaved, setConfigSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getAdminConfig().catch(() => null),
      getUsers().catch(() => [])
    ]).then(([cfgData, usersData]) => {
      if (cfgData) {
        const c = cfgData.config || cfgData
        setConfig(prev => ({ ...prev, ...c }))
      }
      setUsers(Array.isArray(usersData) ? usersData : (usersData.users || []))
    }).finally(() => setLoading(false))
  }, [])

  const handleConfigChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }))
  }

  const handleSaveConfig = async () => {
    setSavingConfig(true)
    try {
      await updateAdminConfig(config)
      setConfigSaved(true)
      setTimeout(() => setConfigSaved(false), 3000)
      if (config.primaryColor) {
        document.documentElement.style.setProperty('--primary', config.primaryColor)
      }
    } catch {}
    setSavingConfig(false)
  }

  const handleToggleAdmin = async (user) => {
    const id = user.id || user._id
    try {
      await updateUser(id, { isAdmin: !user.isAdmin })
      setUsers(users.map(u => (u.id || u._id) === id ? { ...u, isAdmin: !u.isAdmin } : u))
    } catch {}
  }

  const handleDeleteUser = async (user) => {
    if (!window.confirm('Delete user?')) return
    const id = user.id || user._id
    try {
      await deleteUser(id)
      setUsers(users.filter(u => (u.id || u._id) !== id))
    } catch {}
  }

  if (loading) return <div className="spinner-center"><div className="spinner" /></div>

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: 32 }}>{t('admin.title')}</h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 32, borderBottom: '2px solid var(--border)' }}>
        {['settings', 'users'].map(tabKey => (
          <button
            key={tabKey}
            className="btn"
            onClick={() => setTab(tabKey)}
            style={{
              padding: '10px 24px', borderRadius: '6px 6px 0 0', borderBottom: 'none',
              background: tab === tabKey ? 'var(--primary)' : 'transparent',
              color: tab === tabKey ? '#fff' : 'var(--text)',
              fontWeight: tab === tabKey ? 700 : 400
            }}
          >
            {tabKey === 'settings' ? t('admin.settings_title') : t('admin.users_title')}
          </button>
        ))}
      </div>

      {tab === 'settings' && (
        <div>
          <div className="card" style={{ padding: 28, marginBottom: 24 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 20 }}>{t('admin.settings_title')}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              {[
                { key: 'appName', label: t('admin.app_name') },
                { key: 'logoUrl', label: t('admin.logo_url') },
                { key: 'baseUrl', label: t('admin.base_url') }
              ].map(({ key, label }) => (
                <div key={key} className="form-group">
                  <label className="form-label">{label}</label>
                  <input className="form-input" value={config[key] || ''} onChange={e => handleConfigChange(key, e.target.value)} />
                </div>
              ))}
              <div className="form-group">
                <label className="form-label">{t('admin.primary_color')}</label>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input type="color" value={config.primaryColor || '#4f6ef7'} onChange={e => handleConfigChange('primaryColor', e.target.value)} style={{ width: 48, height: 36, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }} />
                  <input className="form-input" value={config.primaryColor || ''} onChange={e => handleConfigChange('primaryColor', e.target.value)} style={{ flex: 1 }} />
                </div>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{t('admin.custom_css')}</label>
              <textarea className="form-input" rows={4} value={config.customCss || ''} onChange={e => handleConfigChange('customCss', e.target.value)} style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '0.85rem' }} />
            </div>
          </div>

          <div className="card" style={{ padding: 28, marginBottom: 24 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 20 }}>{t('admin.smtp_title')}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              {[
                { key: 'smtpHost', label: t('admin.smtp_host') },
                { key: 'smtpPort', label: t('admin.smtp_port') },
                { key: 'smtpUser', label: t('admin.smtp_user') },
                { key: 'smtpPass', label: t('admin.smtp_pass'), type: 'password' },
                { key: 'smtpFrom', label: t('admin.smtp_from') }
              ].map(({ key, label, type }) => (
                <div key={key} className="form-group">
                  <label className="form-label">{label}</label>
                  <input className="form-input" type={type || 'text'} value={config[key] || ''} onChange={e => handleConfigChange(key, e.target.value)} />
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 28, marginBottom: 24 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 20 }}>{t('admin.telegram_title')}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">{t('admin.telegram_token')}</label>
                <input className="form-input" type="password" value={config.telegramBotToken || ''} onChange={e => handleConfigChange('telegramBotToken', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('admin.telegram_name')}</label>
                <input className="form-input" value={config.telegramBotName || ''} onChange={e => handleConfigChange('telegramBotName', e.target.value)} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button className="btn btn-primary" onClick={handleSaveConfig} disabled={savingConfig}>
              {savingConfig ? <span className="spinner" style={{ width: 16, height: 16 }} /> : t('admin.save')}
            </button>
            {configSaved && <span style={{ color: '#16a34a', fontWeight: 600 }}>{t('admin.saved')}</span>}
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg)' }}>
                {[t('admin.user_email'), t('admin.user_name'), t('admin.user_admin'), t('admin.user_verified'), ''].map((h, i) => (
                  <th key={i} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(user => {
                const uid = user.id || user._id
                return (
                  <tr key={uid} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', fontSize: '0.9rem' }}>{user.email}</td>
                    <td style={{ padding: '12px 16px', fontSize: '0.9rem' }}>{user.name}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <input type="checkbox" checked={!!user.isAdmin} onChange={() => handleToggleAdmin(user)} />
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`badge ${user.emailVerified ? 'badge-success' : 'badge-muted'}`}>
                        {user.emailVerified ? '✓' : '–'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDeleteUser(user)}>
                        {t('dashboard.delete')}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
