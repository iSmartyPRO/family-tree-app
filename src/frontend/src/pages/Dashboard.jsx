import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PlusCircle, FolderOpen, Trash2, Share2, Download, Upload, Link as LinkIcon } from 'lucide-react'
import { getTrees, createTree, deleteTree, exportTree, importTree } from '../services/api'
import ShareModal from '../components/ShareModal'

export default function Dashboard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [trees, setTrees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNewModal, setShowNewModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [shareTree, setShareTree] = useState(null)
  const [exportMenuId, setExportMenuId] = useState(null)
  const importRef = useRef()
  const importTreeId = useRef(null)

  const load = async () => {
    setLoading(true)
    try {
      const data = await getTrees()
      setTrees(Array.isArray(data) ? data : (data.trees || []))
    } catch {
      setTrees([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    try {
      const data = await createTree(newName.trim())
      const id = data.id || data._id || (data.tree && (data.tree.id || data.tree._id))
      setShowNewModal(false)
      setNewName('')
      if (id) navigate(`/tree/${id}`)
      else load()
    } catch {
      setCreating(false)
    }
    setCreating(false)
  }

  const handleDelete = async (id) => {
    if (!window.confirm(t('dashboard.delete_confirm'))) return
    try {
      await deleteTree(id)
      setTrees(trees.filter(tr => (tr.id || tr._id) !== id))
    } catch {}
  }

  const handleExport = async (id, format) => {
    setExportMenuId(null)
    try {
      const res = await exportTree(id, format)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tree-${id}.${format === 'gedcom' ? 'ged' : 'json'}`
      a.click()
      URL.revokeObjectURL(url)
    } catch {}
  }

  const handleImportClick = (id) => {
    importTreeId.current = id
    importRef.current.value = ''
    importRef.current.click()
  }

  const handleImportFile = async (e) => {
    const file = e.target.files[0]
    if (!file || !importTreeId.current) return
    try {
      await importTree(importTreeId.current, file)
      load()
    } catch {}
  }

  const myTrees = trees.filter(tr => !tr.sharedWithMe)
  const sharedTrees = trees.filter(tr => tr.sharedWithMe)

  if (loading) return (
    <div className="spinner-center"><div className="spinner" /></div>
  )

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>
      <input ref={importRef} type="file" accept=".json,.ged,.gedcom" style={{ display: 'none' }} onChange={handleImportFile} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 36, flexWrap: 'wrap', gap: 16 }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>{t('dashboard.title')}</h1>
        <button className="btn btn-primary" onClick={() => setShowNewModal(true)}>
          <PlusCircle size={18} style={{ marginRight: 8 }} />
          {t('dashboard.new_tree')}
        </button>
      </div>

      {/* New tree modal */}
      {showNewModal && (
        <div className="modal-overlay" onClick={() => setShowNewModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: 20 }}>{t('dashboard.new_tree')}</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">{t('dashboard.new_tree_name')}</label>
                <input
                  className="form-input"
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  required
                />
              </div>
              <div className="flex" style={{ gap: 12, marginTop: 8 }}>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? <span className="spinner" style={{ width: 16, height: 16 }} /> : t('dashboard.create')}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowNewModal(false)}>
                  {t('dashboard.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* My trees */}
      {myTrees.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-muted)' }}>
          {t('dashboard.empty')}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20, marginBottom: 48 }}>
          {myTrees.map(tree => {
            const id = tree.id || tree._id
            const nodeCount = (tree.nodes || []).length
            const createdAt = tree.createdAt ? new Date(tree.createdAt).toLocaleDateString() : ''
            return (
              <div key={id} className="card" style={{ padding: 24, position: 'relative' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {tree.name}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 20 }}>
                  {nodeCount} {nodeCount === 1 ? 'person' : 'people'}
                  {createdAt && <> &middot; {createdAt}</>}
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn btn-primary btn-sm" onClick={() => navigate(`/tree/${id}`)}>
                    <FolderOpen size={14} style={{ marginRight: 4 }} />{t('dashboard.open')}
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShareTree(tree)}>
                    <Share2 size={14} style={{ marginRight: 4 }} />{t('dashboard.share')}
                  </button>
                  <div style={{ position: 'relative' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setExportMenuId(exportMenuId === id ? null : id)}>
                      <Download size={14} style={{ marginRight: 4 }} />{t('dashboard.export')}
                    </button>
                    {exportMenuId === id && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', zIndex: 10, minWidth: 120 }}>
                        <button className="btn" style={{ width: '100%', textAlign: 'left', padding: '8px 14px', borderRadius: 0 }} onClick={() => handleExport(id, 'json')}>JSON</button>
                        <button className="btn" style={{ width: '100%', textAlign: 'left', padding: '8px 14px', borderRadius: 0 }} onClick={() => handleExport(id, 'gedcom')}>GEDCOM</button>
                      </div>
                    )}
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleImportClick(id)}>
                    <Upload size={14} style={{ marginRight: 4 }} />{t('dashboard.import')}
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Shared with me */}
      {sharedTrees.length > 0 && (
        <>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 20 }}>{t('dashboard.shared_with_me')}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {sharedTrees.map(tree => {
              const id = tree.id || tree._id
              return (
                <div key={id} className="card" style={{ padding: 24 }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 4 }}>{tree.name}</h3>
                  {tree.owner && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                      {t('dashboard.owner')}: {tree.owner.name || tree.owner.email || tree.owner}
                    </p>
                  )}
                  <button className="btn btn-primary btn-sm" onClick={() => navigate(`/tree/${id}`)}>
                    <FolderOpen size={14} style={{ marginRight: 4 }} />{t('dashboard.open')}
                  </button>
                </div>
              )
            })}
          </div>
        </>
      )}

      {shareTree && (
        <ShareModal tree={shareTree} onClose={() => setShareTree(null)} />
      )}
    </div>
  )
}
