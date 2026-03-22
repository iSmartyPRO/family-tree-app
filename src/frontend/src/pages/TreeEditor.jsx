import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Plus, Save, UserPlus, GitBranch } from 'lucide-react'
import { getTree, updateTree } from '../services/api'
import TreeCanvas from '../components/TreeCanvas'
import PersonModal from '../components/PersonModal'
import RelationModal from '../components/RelationModal'

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export default function TreeEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [tree, setTree] = useState(null)
  const [nodes, setNodes] = useState([])
  const [relations, setRelations] = useState([])
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [showPersonModal, setShowPersonModal] = useState(false)
  const [editingPerson, setEditingPerson] = useState(null)
  const [showRelationModal, setShowRelationModal] = useState(false)
  const saveTimer = useRef(null)

  useEffect(() => {
    getTree(id)
      .then(data => {
        const treeData = data.tree || data
        setTree(treeData)
        setNodes(treeData.nodes || [])
        setRelations(treeData.relations || [])
      })
      .catch(() => navigate('/dashboard'))
      .finally(() => setLoading(false))
  }, [id])

  const scheduleSave = useCallback((newNodes, newRelations) => {
    setSaved(false)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try {
        await updateTree(id, { nodes: newNodes, relations: newRelations })
        setSaved(true)
      } catch {}
    }, 2000)
  }, [id])

  const handleSaveNow = async () => {
    clearTimeout(saveTimer.current)
    try {
      await updateTree(id, { nodes, relations })
      setSaved(true)
    } catch {}
  }

  const handleAddPerson = () => {
    setEditingPerson(null)
    setShowPersonModal(true)
  }

  const handleEditPerson = (person) => {
    setEditingPerson(person)
    setShowPersonModal(true)
  }

  const handleSavePerson = (personData) => {
    let newNodes
    if (editingPerson) {
      newNodes = nodes.map(n => (n.id === editingPerson.id ? { ...n, ...personData } : n))
    } else {
      const newPerson = { id: generateId(), x: 100 + nodes.length * 180, y: 100, ...personData }
      newNodes = [...nodes, newPerson]
    }
    setNodes(newNodes)
    setShowPersonModal(false)
    scheduleSave(newNodes, relations)
  }

  const handleDeletePerson = (personId) => {
    const newNodes = nodes.filter(n => n.id !== personId)
    const newRelations = relations.filter(r => r.from !== personId && r.to !== personId)
    setNodes(newNodes)
    setRelations(newRelations)
    if (selectedId === personId) setSelectedId(null)
    scheduleSave(newNodes, newRelations)
  }

  const handleAddRelation = (relation) => {
    const newRelations = [...relations, { id: generateId(), ...relation }]
    setRelations(newRelations)
    setShowRelationModal(false)
    scheduleSave(nodes, newRelations)
  }

  const handleUpdateNodePosition = (nodeId, x, y) => {
    const newNodes = nodes.map(n => n.id === nodeId ? { ...n, x, y } : n)
    setNodes(newNodes)
    scheduleSave(newNodes, relations)
  }

  const selectedPerson = nodes.find(n => n.id === selectedId)

  if (loading) return <div className="spinner-center"><div className="spinner" /></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)' }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, padding: '10px 20px',
        background: '#fff', borderBottom: '1px solid var(--border)', flexShrink: 0
      }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={16} style={{ marginRight: 6 }} />{t('tree.back')}
        </button>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {tree?.name}
        </h2>
        <span style={{ fontSize: '0.8rem', color: saved ? '#16a34a' : '#d97706' }}>
          {saved ? t('tree.saved') : t('tree.unsaved')}
        </span>
        <button className="btn btn-primary btn-sm" onClick={handleSaveNow}>
          <Save size={14} style={{ marginRight: 6 }} />{t('tree.save')}
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{
          width: 240, background: '#fff', borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden'
        }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={handleAddPerson}>
              <UserPlus size={14} style={{ marginRight: 4 }} />{t('tree.add_person')}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowRelationModal(true)} title={t('tree.add_relation')}>
              <GitBranch size={14} />
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {nodes.map(node => (
              <div
                key={node.id}
                onClick={() => setSelectedId(node.id === selectedId ? null : node.id)}
                style={{
                  padding: '10px 16px', cursor: 'pointer',
                  background: selectedId === node.id ? '#eff2ff' : 'transparent',
                  borderLeft: selectedId === node.id ? '3px solid var(--primary)' : '3px solid transparent',
                  display: 'flex', alignItems: 'center', gap: 10
                }}
              >
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: node.gender === 'male' ? '#3b82f6' : node.gender === 'female' ? '#ec4899' : '#9ca3af'
                }} />
                <span style={{ fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {node.firstName} {node.lastName}
                </span>
              </div>
            ))}
          </div>

          {/* Person detail */}
          {selectedPerson && (
            <div style={{ borderTop: '1px solid var(--border)', padding: 16 }}>
              <p style={{ fontWeight: 700, marginBottom: 4, fontSize: '0.95rem' }}>
                {selectedPerson.firstName} {selectedPerson.lastName}
              </p>
              {selectedPerson.birthDate && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                  {selectedPerson.birthDate}{selectedPerson.deathDate ? ` – ${selectedPerson.deathDate}` : ''}
                </p>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => handleEditPerson(selectedPerson)}>
                  {t('tree.edit_person')}
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDeletePerson(selectedPerson.id)}>
                  {t('tree.delete_person')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <TreeCanvas
            nodes={nodes}
            relations={relations}
            selectedId={selectedId}
            onSelectNode={setSelectedId}
            onUpdateNodePosition={handleUpdateNodePosition}
            onAddNode={handleAddPerson}
            readonly={false}
          />
        </div>
      </div>

      {showPersonModal && (
        <PersonModal
          person={editingPerson}
          onSave={handleSavePerson}
          onClose={() => setShowPersonModal(false)}
        />
      )}

      {showRelationModal && (
        <RelationModal
          nodes={nodes}
          relations={relations}
          onAddRelation={handleAddRelation}
          onClose={() => setShowRelationModal(false)}
        />
      )}
    </div>
  )
}
