import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Copy, Check } from 'lucide-react'
import { shareTree, removeShare, createPublicLink, deletePublicLink } from '../services/api'

export default function ShareModal({ tree, onClose }) {
  const { t } = useTranslation()
  const treeId = tree.id || tree._id

  const [tab, setTab] = useState('invite')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('viewer')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [members, setMembers] = useState(tree.members || [])

  const [pubPassword, setPubPassword] = useState('')
  const [pubTtl, setPubTtl] = useState(0)
  const [pubLink, setPubLink] = useState(tree.publicLink || null)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleInvite = async (e) => {
    e.preventDefault()
    setInviteError('')
    setInviting(true)
    try {
      const data = await shareTree(treeId, inviteEmail, inviteRole)
      setMembers(data.members || members)
      setInviteEmail('')
    } catch (err) {
      setInviteError(err.message)
    } finally {
      setInviting(false)
    }
  }

  const handleRemove = async (userId) => {
    try {
      const data = await removeShare(treeId, userId)
      setMembers(data.members || members.filter(m => (m.user?.id || m.user?._id || m.user) !== userId))
    } catch {}
  }

  const handleGenerateLink = async (e) => {
    e.preventDefault()
    setGenerating(true)
    try {
      const data = await createPublicLink(treeId, pubPassword, Number(pubTtl))
      setPubLink(data.publicLink || data.link || data)
    } catch {}
    setGenerating(false)
  }

  const handleRevoke = async () => {
    try {
      await deletePublicLink(treeId)
      setPubLink(null)
    } catch {}
  }

  const fullLink = pubLink ? `${window.location.origin}/public/${pubLink.token || pubLink}` : ''

  const handleCopy = () => {
    navigator.clipboard.writeText(fullLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const tabs = ['invite', 'members', 'public']

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{t('share.title')}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '2px solid var(--border)' }}>
          {tabs.map(tabKey => {
            const labels = { invite: t('share.invite_btn'), members: t('share.members'), public: t('share.public_link_title') }
            return (
              <button
                key={tabKey}
                onClick={() => setTab(tabKey)}
                style={{
                  padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer',
                  borderBottom: tab === tabKey ? '2px solid var(--primary)' : '2px solid transparent',
                  color: tab === tabKey ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: tab === tabKey ? 700 : 400, marginBottom: -2, fontSize: '0.9rem'
                }}
              >
                {labels[tabKey]}
              </button>
            )
          })}
        </div>

        {/* Invite tab */}
        {tab === 'invite' && (
          <form onSubmit={handleInvite}>
            {inviteError && (
              <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 'var(--radius)', marginBottom: 16, fontSize: '0.9rem' }}>
                {inviteError}
              </div>
            )}
            <div className="form-group">
              <label className="form-label">{t('share.invite_email')}</label>
              <input
                className="form-input"
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('share.role')}</label>
              <select className="form-input" value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                <option value="viewer">{t('share.viewer')}</option>
                <option value="editor">{t('share.editor')}</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={inviting}>
              {inviting ? <span className="spinner" style={{ width: 16, height: 16 }} /> : t('share.invite_btn')}
            </button>
          </form>
        )}

        {/* Members tab */}
        {tab === 'members' && (
          <div>
            {members.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>No members yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {members.map((m, i) => {
                  const user = m.user || m
                  const userId = user.id || user._id || user
                  const email = user.email || (typeof user === 'string' ? user : '')
                  const name = user.name || ''
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg)', borderRadius: 'var(--radius)' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{name || email}</p>
                        {name && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{email}</p>}
                      </div>
                      {m.role && <span className="badge">{m.role}</span>}
                      <button className="btn btn-danger btn-sm" onClick={() => handleRemove(userId)}>
                        {t('share.remove')}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Public link tab */}
        {tab === 'public' && (
          <div>
            {pubLink ? (
              <div>
                <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius)', padding: '12px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ flex: 1, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {fullLink}
                  </span>
                  <button className="btn btn-secondary btn-sm" onClick={handleCopy}>
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    <span style={{ marginLeft: 6 }}>{copied ? t('share.copied') : t('share.copy')}</span>
                  </button>
                </div>
                <button className="btn btn-danger btn-sm" onClick={handleRevoke}>{t('share.revoke')}</button>
              </div>
            ) : (
              <form onSubmit={handleGenerateLink}>
                <div className="form-group">
                  <label className="form-label">{t('share.password')}</label>
                  <input
                    className="form-input"
                    type="password"
                    value={pubPassword}
                    onChange={e => setPubPassword(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('share.ttl_days')}</label>
                  <input
                    className="form-input"
                    type="number"
                    min={0}
                    value={pubTtl}
                    onChange={e => setPubTtl(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={generating}>
                  {generating ? <span className="spinner" style={{ width: 16, height: 16 }} /> : t('share.generate')}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
