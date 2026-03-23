import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Save, UserPlus, GitBranch, Undo2 } from 'lucide-react'
import { getTree, updateTree } from '../services/api'
import TreeCanvas, { DEFAULT_LINE_SETTINGS, NODE_W, NODE_H } from '../components/TreeCanvas'
import PersonModal from '../components/PersonModal'
import RelationModal from '../components/RelationModal'

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function clampViewSettings(vs) {
  const s = Number(vs?.siblingLineDepth)
  const p = Number(vs?.parentLineBend)
  return {
    siblingLineDepth: Number.isFinite(s)
      ? Math.min(120, Math.max(20, s))
      : DEFAULT_LINE_SETTINGS.siblingLineDepth,
    parentLineBend: Number.isFinite(p)
      ? Math.min(90, Math.max(25, p))
      : DEFAULT_LINE_SETTINGS.parentLineBend
  }
}

function alignNodes(nodes, selectedIds, mode) {
  const selected = nodes.filter(n => selectedIds.includes(n.id))
  if (selected.length < 2) return nodes

  const left = Math.min(...selected.map(n => n.x))
  const right = Math.max(...selected.map(n => n.x + NODE_W))
  const top = Math.min(...selected.map(n => n.y))
  const bottom = Math.max(...selected.map(n => n.y + NODE_H))
  const centerX = selected.reduce((sum, n) => sum + (n.x + NODE_W / 2), 0) / selected.length
  const centerY = selected.reduce((sum, n) => sum + (n.y + NODE_H / 2), 0) / selected.length

  return nodes.map(n => {
    if (!selectedIds.includes(n.id)) return n
    if (mode === 'left') return { ...n, x: left }
    if (mode === 'right') return { ...n, x: right - NODE_W }
    if (mode === 'top') return { ...n, y: top }
    if (mode === 'bottom') return { ...n, y: bottom - NODE_H }
    if (mode === 'center-h') return { ...n, y: centerY - NODE_H / 2 }
    if (mode === 'center-v') return { ...n, x: centerX - NODE_W / 2 }
    return n
  })
}

export default function TreeEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [tree, setTree] = useState(null)
  const [nodes, setNodes] = useState([])
  const [relations, setRelations] = useState([])
  const [viewSettings, setViewSettings] = useState(DEFAULT_LINE_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(true)
  const [selectedIds, setSelectedIds] = useState([])
  const [showPersonModal, setShowPersonModal] = useState(false)
  const [editingPerson, setEditingPerson] = useState(null)
  const [showRelationModal, setShowRelationModal] = useState(false)
  const [editingRelation, setEditingRelation] = useState(null)
  const [relationPresetFrom, setRelationPresetFrom] = useState(null)
  const [personTab, setPersonTab] = useState('info')
  const [viewportCenter, setViewportCenter] = useState(null)
  const saveTimer = useRef(null)

  const nodesRef = useRef([])
  const relationsRef = useRef([])
  const viewSettingsRef = useRef(DEFAULT_LINE_SETTINGS)
  const historyRef = useRef([])
  const [canUndo, setCanUndo] = useState(false)

  const cloneState = useCallback((s) => JSON.parse(JSON.stringify(s)), [])
  const takeSnapshot = useCallback(() => ({
    nodes: cloneState(nodesRef.current || []),
    relations: cloneState(relationsRef.current || []),
    viewSettings: cloneState(viewSettingsRef.current || DEFAULT_LINE_SETTINGS)
  }), [cloneState])

  const pushHistory = useCallback(() => {
    historyRef.current.push(takeSnapshot())
    if (historyRef.current.length > 100) historyRef.current.shift()
    setCanUndo(historyRef.current.length > 0)
  }, [takeSnapshot])

  const scheduleSave = useCallback(() => {
    setSaved(false)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try {
        await updateTree(id, {
          nodes: nodesRef.current,
          relations: relationsRef.current,
          viewSettings: clampViewSettings(viewSettingsRef.current)
        })
        setSaved(true)
      } catch {
        // keep unsaved indicator
      }
    }, 2000)
  }, [id])

  const applySnapshot = useCallback((snap, { save = true } = {}) => {
    if (!snap) return
    const n = snap.nodes || []
    const r = snap.relations || []
    const vs = clampViewSettings({ ...DEFAULT_LINE_SETTINGS, ...(snap.viewSettings || {}) })
    setNodes(n)
    setRelations(r)
    setViewSettings(vs)
    nodesRef.current = n
    relationsRef.current = r
    viewSettingsRef.current = vs
    if (save) scheduleSave()
  }, [scheduleSave])

  const handleUndo = useCallback(() => {
    if (historyRef.current.length === 0) return
    const prev = historyRef.current.pop()
    setCanUndo(historyRef.current.length > 0)
    applySnapshot(prev, { save: true })
  }, [applySnapshot])

  useEffect(() => {
    nodesRef.current = nodes
  }, [nodes])

  useEffect(() => {
    relationsRef.current = relations
  }, [relations])

  useEffect(() => {
    viewSettingsRef.current = viewSettings
  }, [viewSettings])

  useEffect(() => {
    getTree(id)
      .then(data => {
        const treeData = data.tree || data
        const n = treeData.nodes || []
        const r = treeData.relations || []
        const vs = clampViewSettings({ ...DEFAULT_LINE_SETTINGS, ...(treeData.viewSettings || {}) })
        setTree(treeData)
        setNodes(n)
        setRelations(r)
        setViewSettings(vs)
        nodesRef.current = n
        relationsRef.current = r
        viewSettingsRef.current = vs
        historyRef.current = []
        setCanUndo(false)
      })
      .catch(() => navigate('/dashboard'))
      .finally(() => setLoading(false))
  }, [id, navigate])

  useEffect(() => {
    const onKeyDown = (e) => {
      const isUndo = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z'
      if (!isUndo) return
      const tag = e.target?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return
      e.preventDefault()
      handleUndo()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleUndo])

  useEffect(() => {
    setPersonTab('info')
  }, [selectedIds])

  const handleSaveNow = async () => {
    clearTimeout(saveTimer.current)
    try {
      await updateTree(id, {
        nodes,
        relations,
        viewSettings: clampViewSettings(viewSettings)
      })
      nodesRef.current = nodes
      relationsRef.current = relations
      viewSettingsRef.current = viewSettings
      setSaved(true)
    } catch {
      // ignore
    }
  }

  const handleAddPerson = () => {
    setEditingPerson(null)
    setShowPersonModal(true)
  }

  const handleEditPerson = person => {
    setEditingPerson(person)
    setShowPersonModal(true)
  }

  const handleSavePerson = personData => {
    pushHistory()
    let newNodes
    if (editingPerson) {
      newNodes = nodes.map(n => (n.id === editingPerson.id ? { ...n, ...personData } : n))
    } else {
      const x = viewportCenter ? viewportCenter.x - NODE_W / 2 : 100 + nodes.length * 180
      const y = viewportCenter ? viewportCenter.y - NODE_H / 2 : 100
      const newPerson = { id: generateId(), x, y, ...personData }
      newNodes = [...nodes, newPerson]
    }
    setNodes(newNodes)
    nodesRef.current = newNodes
    setShowPersonModal(false)
    scheduleSave()
  }

  const handleDeletePerson = personId => {
    pushHistory()
    const newNodes = nodes.filter(n => n.id !== personId)
    const newRelations = relations.filter(r => r.from !== personId && r.to !== personId)
    setNodes(newNodes)
    setRelations(newRelations)
    nodesRef.current = newNodes
    relationsRef.current = newRelations
    if (selectedIds.includes(personId)) setSelectedIds([])
    scheduleSave()
  }

  const handleAddRelation = relation => {
    pushHistory()
    const newRelations = [...relations, { id: generateId(), ...relation }]
    setRelations(newRelations)
    relationsRef.current = newRelations
    setShowRelationModal(false)
    setEditingRelation(null)
    scheduleSave()
  }

  const handleDeleteRelation = (relationId) => {
    pushHistory()
    const newRelations = relations.filter(r => r.id !== relationId)
    setRelations(newRelations)
    relationsRef.current = newRelations
    setEditingRelation(null)
    setRelationPresetFrom(null)
    setShowRelationModal(false)
    scheduleSave()
  }

  const handleUpdateNodesPositions = (updates) => {
    if (!Array.isArray(updates) || updates.length === 0) return
    pushHistory()
    const map = new Map(updates.map(u => [u.id, u]))
    const newNodes = nodes.map(n => {
      const u = map.get(n.id)
      if (!u) return n
      return { ...n, x: u.x, y: u.y }
    })
    setNodes(newNodes)
    nodesRef.current = newNodes
    scheduleSave()
  }

  const handleUpdateNodePosition = (nodeId, x, y) => {
    handleUpdateNodesPositions([{ id: nodeId, x, y }])
  }

  const handleAlignSelected = (mode) => {
    if (selectedIds.length < 2) return
    pushHistory()
    const newNodes = alignNodes(nodes, selectedIds, mode)
    setNodes(newNodes)
    nodesRef.current = newNodes
    scheduleSave()
  }

  const handleLineSettingsChange = patch => {
    pushHistory()
    setViewSettings(prev => {
      const next = clampViewSettings({ ...prev, ...patch })
      viewSettingsRef.current = next
      return next
    })
    scheduleSave()
  }

  const handleUpdateRelation = (relationId, patch, options = {}) => {
    if (options.recordHistory !== false) pushHistory()
    const newRelations = relationsRef.current.map(r => (r.id === relationId ? { ...r, ...patch } : r))
    setRelations(newRelations)
    relationsRef.current = newRelations
    scheduleSave()
  }

  const handleEditRelation = (rel) => {
    setEditingRelation(rel)
    setRelationPresetFrom(null)
    setShowRelationModal(true)
  }

  const selectedPerson = selectedIds.length === 1 ? nodes.find(n => n.id === selectedIds[0]) : null

  if (loading) return <div className="spinner-center"><div className="spinner" /></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, padding: '10px 20px',
        background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0
      }}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={16} style={{ marginRight: 6 }} />{t('tree.back')}
        </button>
        <span
          className="badge badge-success"
          style={{ flexShrink: 0, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}
        >
          {t('tree.view_mode_edit')}
        </span>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {tree?.name}
        </h2>
        {selectedIds.length > 1 ? (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleAlignSelected('left')} title={t('tree.align_left')}>L</button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleAlignSelected('right')} title={t('tree.align_right')}>R</button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleAlignSelected('top')} title={t('tree.align_top')}>T</button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleAlignSelected('bottom')} title={t('tree.align_bottom')}>B</button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleAlignSelected('center-v')} title={t('tree.align_center_vertical')}>C-V</button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleAlignSelected('center-h')} title={t('tree.align_center_horizontal')}>C-H</button>
          </div>
        ) : null}
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          title={t('tree.undo')}
          onClick={handleUndo}
          disabled={!canUndo}
        >
          <Undo2 size={14} style={{ marginRight: 6 }} />
          {t('tree.undo')}
        </button>
        <span style={{ fontSize: '0.8rem', color: saved ? '#16a34a' : '#d97706' }}>
          {saved ? t('tree.saved') : t('tree.unsaved')}
        </span>
        <button type="button" className="btn btn-primary btn-sm" onClick={handleSaveNow}>
          <Save size={14} style={{ marginRight: 6 }} />{t('tree.save')}
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{
          width: 240, background: 'var(--surface)', borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden'
        }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={handleAddPerson}>
              <UserPlus size={14} style={{ marginRight: 4 }} />{t('tree.add_person')}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setEditingRelation(null)
                setRelationPresetFrom(null)
                setShowRelationModal(true)
              }}
              title={t('tree.add_relation')}
            >
              <GitBranch size={14} />
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {nodes.map(node => (
              <div
                key={node.id}
                onClick={(e) => {
                  const id = node.id
                  if (e.shiftKey) {
                    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))
                  } else {
                    setSelectedIds(prev => (prev.length === 1 && prev[0] === id ? [] : [id]))
                  }
                }}
                onDoubleClick={() => handleEditPerson(node)}
                style={{
                  padding: '10px 16px', cursor: 'pointer',
                  background: selectedIds.includes(node.id) ? '#eff2ff' : 'transparent',
                  borderLeft: selectedIds.includes(node.id) ? '3px solid var(--primary)' : '3px solid transparent',
                  display: 'flex', alignItems: 'center', gap: 10
                }}
              >
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: node.gender === 'male' ? '#3b82f6' : node.gender === 'female' ? '#ec4899' : '#9ca3af'
                }} />
                <span style={{ fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {[node.lastName, node.firstName].filter(Boolean).join(' ') || node.firstName || '—'}
                </span>
              </div>
            ))}
          </div>

          {selectedPerson && (
            <div style={{ borderTop: '1px solid var(--border)', padding: 16 }}>
              <p style={{ fontWeight: 700, marginBottom: 4, fontSize: '0.95rem' }}>
                {[selectedPerson.lastName, selectedPerson.firstName, selectedPerson.patronymic].filter(Boolean).join(' ') || '—'}
              </p>

              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <button
                  type="button"
                  className={`btn btn-sm ${personTab === 'info' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setPersonTab('info')}
                >
                  {t('tree.tab_info')}
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${personTab === 'relations' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setPersonTab('relations')}
                >
                  {t('tree.tab_relations')}
                </button>
              </div>

              {personTab === 'info' ? (
                <>
                  {selectedPerson.birthDate && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                      {selectedPerson.birthDate}{selectedPerson.deathDate ? ` – ${selectedPerson.deathDate}` : ''}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => handleEditPerson(selectedPerson)}
                    >
                      {t('tree.edit_person')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeletePerson(selectedPerson.id)}
                    >
                      {t('tree.delete_person')}
                    </button>
                  </div>
                </>
              ) : null}

              {personTab === 'relations' ? (
                (() => {
                  const personId = selectedPerson.id
                  const relsForPerson = relations.filter(r => r.from === personId || r.to === personId)
                  const nameOf = (pid) => {
                    const n = nodes.find(nn => nn.id === pid)
                    return [n?.lastName, n?.firstName, n?.patronymic].filter(Boolean).join(' ') || pid
                  }

                  return (
                    <div style={{ borderTop: '1px solid var(--border)', marginTop: 16, paddingTop: 16 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{t('tree.tab_relations')}</div>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            setEditingRelation(null)
                            setRelationPresetFrom(personId)
                            setShowRelationModal(true)
                          }}
                        >
                          {t('tree.add_relation')}
                        </button>
                      </div>

                      {relsForPerson.length === 0 ? (
                        <div style={{ marginTop: 10, color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t('tree.no_relations')}</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                          {relsForPerson.map(rel => {
                            const fromName = nameOf(rel.from)
                            const toName = nameOf(rel.to)
                            const relLabel =
                              rel.type === 'parent-child'
                                ? `${fromName} → ${toName}`
                                : rel.type === 'spouse'
                                  ? `${fromName} — ${toName}`
                                  : `${fromName} / ${toName}`

                            return (
                              <div key={rel.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <div style={{ flex: 1, fontSize: '0.88rem', color: 'var(--text-muted)' }}>{relLabel}</div>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handleEditRelation(rel)}
                                >
                                  {t('tree.edit_relation')}
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-danger btn-sm"
                                  onClick={() => handleDeleteRelation(rel.id)}
                                >
                                  {t('tree.delete_relation')}
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })()
              ) : null}
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <TreeCanvas
            nodes={nodes}
            relations={relations}
            selectedIds={selectedIds}
            selectedId={selectedIds.length === 1 ? selectedIds[0] : null}
            onSelectNodes={setSelectedIds}
            onUpdateNodesPositions={handleUpdateNodesPositions}
            onUpdateNodePosition={handleUpdateNodePosition}
            onUpdateRelation={handleUpdateRelation}
            onEditNode={handleEditPerson}
            onEditRelation={handleEditRelation}
            onViewportCenterChange={setViewportCenter}
            lineSettings={viewSettings}
            onLineSettingsChange={handleLineSettingsChange}
            readonly={false}
          />
        </div>
      </div>

      {showPersonModal && (
        <PersonModal
          person={editingPerson}
          onSave={handleSavePerson}
          onClose={() => setShowPersonModal(false)}
          onViewInTree={() => setShowPersonModal(false)}
          nodes={nodes}
          relations={relations}
          onAddRelation={handleAddRelation}
          onUpdateRelation={handleUpdateRelation}
          onDeleteRelation={handleDeleteRelation}
        />
      )}

      {showRelationModal && (
        <RelationModal
          nodes={nodes}
          relations={relations}
          onAddRelation={handleAddRelation}
          onUpdateRelation={handleUpdateRelation}
          onDeleteRelation={handleDeleteRelation}
          relationToEdit={editingRelation}
          presetFrom={relationPresetFrom}
          lockFrom={Boolean(relationPresetFrom) && !editingRelation}
          onClose={() => {
            setShowRelationModal(false)
            setEditingRelation(null)
            setRelationPresetFrom(null)
          }}
        />
      )}
    </div>
  )
}
