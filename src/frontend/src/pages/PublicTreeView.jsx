import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getPublicTree, clonePublicTree } from '../services/api'
import { useAuth } from '../context/AuthContext'
import TreeCanvas from '../components/TreeCanvas'

export default function PublicTreeView() {
  const { token } = useParams()
  const { t } = useTranslation()
  const { user } = useAuth()

  const [tree, setTree] = useState(null)
  const [loading, setLoading] = useState(true)
  const [needsPassword, setNeedsPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cloning, setCloning] = useState(false)
  const [cloned, setCloned] = useState(false)

  const fetchTree = async (pwd) => {
    setLoading(true)
    setError('')
    try {
      const data = await getPublicTree(token, pwd || undefined)
      setTree(data.tree || data)
      setNeedsPassword(false)
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        setNeedsPassword(true)
      } else {
        setError(err.message || t('errors.not_found'))
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTree() }, [token])

  const handlePasswordSubmit = (e) => {
    e.preventDefault()
    fetchTree(password)
  }

  const handleClone = async () => {
    setCloning(true)
    try {
      await clonePublicTree(token, password || undefined)
      setCloned(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setCloning(false)
    }
  }

  if (loading) return <div className="spinner-center"><div className="spinner" /></div>

  if (needsPassword && !tree) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="card" style={{ width: '100%', maxWidth: 380, padding: '36px 32px' }}>
          <h2 style={{ marginBottom: 20 }}>{t('share.password')}</h2>
          {error && <div style={{ color: '#dc2626', marginBottom: 12, fontSize: '0.9rem' }}>{error}</div>}
          <form onSubmit={handlePasswordSubmit}>
            <div className="form-group">
              <label className="form-label">{t('share.password')}</label>
              <input
                className="form-input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              {t('auth.login_btn')}
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '1.2rem' }}>{error}</p>
        </div>
      </div>
    )
  }

  if (!tree) return null

  const nodes = tree.nodes || []
  const relations = tree.relations || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)' }}>
      <div style={{
        padding: '12px 20px', background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap'
      }}>
        <span
          className="badge badge-muted"
          style={{ flexShrink: 0, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}
        >
          {t('tree.view_mode_read')}
        </span>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, flex: 1 }}>{tree.name}</h2>
        {user && !cloned && (
          <button className="btn btn-primary btn-sm" onClick={handleClone} disabled={cloning}>
            {cloning ? <span className="spinner" style={{ width: 14, height: 14 }} /> : 'Clone to my account'}
          </button>
        )}
        {cloned && <span style={{ color: '#16a34a', fontWeight: 600 }}>Cloned!</span>}
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <TreeCanvas
          nodes={nodes}
          relations={relations}
          selectedIds={[]}
          selectedId={null}
          onSelectNodes={() => {}}
          onUpdateNodesPositions={() => {}}
          onUpdateNodePosition={() => {}}
          seedLineSettings={tree.viewSettings}
          onEditNode={undefined}
          onEditRelation={undefined}
          readonly={true}
        />
      </div>
    </div>
  )
}
