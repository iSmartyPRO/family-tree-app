import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'

const RELATION_TYPES = ['parent-child', 'spouse', 'sibling']

export default function RelationModal({ nodes, relations, onAddRelation, onClose }) {
  const { t } = useTranslation()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [type, setType] = useState('parent-child')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (!from || !to) {
      setError(t('auth.error_required'))
      return
    }
    if (from === to) {
      setError('Cannot relate a person to themselves')
      return
    }
    const duplicate = relations.some(r => r.from === from && r.to === to && r.type === type)
    if (duplicate) {
      setError('This relation already exists')
      return
    }
    onAddRelation({ from, to, type })
  }

  const typeLabel = (typeKey) => {
    if (typeKey === 'parent-child') return t('tree.parent_child')
    if (typeKey === 'spouse') return t('tree.spouse')
    if (typeKey === 'sibling') return t('tree.sibling')
    return typeKey
  }

  const personLabel = (node) => `${node.firstName || ''} ${node.lastName || ''}`.trim() || node.id

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{t('tree.add_relation')}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 'var(--radius)', marginBottom: 16, fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t('tree.select_person')} (From)</label>
            <select className="form-input" value={from} onChange={e => setFrom(e.target.value)} required>
              <option value="">—</option>
              {nodes.map(n => (
                <option key={n.id} value={n.id}>{personLabel(n)}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">{t('tree.relation_type')}</label>
            <select className="form-input" value={type} onChange={e => setType(e.target.value)}>
              {RELATION_TYPES.map(rt => (
                <option key={rt} value={rt}>{typeLabel(rt)}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">{t('tree.select_person')} (To)</label>
            <select className="form-input" value={to} onChange={e => setTo(e.target.value)} required>
              <option value="">—</option>
              {nodes.filter(n => n.id !== from).map(n => (
                <option key={n.id} value={n.id}>{personLabel(n)}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button type="submit" className="btn btn-primary">{t('tree.save')}</button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>{t('tree.cancel')}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
