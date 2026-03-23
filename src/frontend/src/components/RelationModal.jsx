import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'

const RELATION_TYPES = ['parent-child', 'spouse', 'sibling']
const SIBLING_LINE_STYLES = ['elbow', 'rounded', 'flex']
const SIBLING_OFFSET_MIN = 8
const SIBLING_OFFSET_MAX = 240

export default function RelationModal({
  nodes,
  relations,
  onAddRelation,
  onUpdateRelation,
  onDeleteRelation,
  relationToEdit,
  onClose,
  presetFrom,
  lockFrom
}) {
  const { t } = useTranslation()
  const [from, setFrom] = useState(relationToEdit?.from || presetFrom || '')
  const [to, setTo] = useState(relationToEdit?.to || '')
  const [type, setType] = useState(relationToEdit?.type || 'parent-child')
  const [siblingLineStyle, setSiblingLineStyle] = useState(relationToEdit?.siblingLineStyle || 'rounded')
  const [siblingRouteOffsetPx, setSiblingRouteOffsetPx] = useState(
    Number.isFinite(relationToEdit?.siblingRouteOffsetPx) ? relationToEdit.siblingRouteOffsetPx : 56
  )
  const [error, setError] = useState('')

  useEffect(() => {
    setFrom(relationToEdit?.from || presetFrom || '')
    setTo(relationToEdit?.to || '')
    setType(relationToEdit?.type || 'parent-child')
    setSiblingLineStyle(relationToEdit?.siblingLineStyle || 'rounded')
    setSiblingRouteOffsetPx(Number.isFinite(relationToEdit?.siblingRouteOffsetPx) ? relationToEdit.siblingRouteOffsetPx : 56)
    setError('')
  }, [relationToEdit?.id, presetFrom])

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
    const duplicate = relations.some(r =>
      r.id !== relationToEdit?.id && r.from === from && r.to === to && r.type === type
    )
    if (duplicate) {
      setError('This relation already exists')
      return
    }

    const payload = {
      from,
      to,
      type,
      siblingLineStyle: type === 'sibling' ? siblingLineStyle : undefined,
      siblingRouteOffsetPx: type === 'sibling' ? siblingRouteOffsetPx : undefined
    }

    if (relationToEdit && typeof onUpdateRelation === 'function') {
      onUpdateRelation(relationToEdit.id, payload)
    } else if (typeof onAddRelation === 'function') {
      onAddRelation(payload)
    }

    onClose?.()
  }

  const typeLabel = (typeKey) => {
    if (typeKey === 'parent-child') return t('tree.parent_child')
    if (typeKey === 'spouse') return t('tree.spouse')
    if (typeKey === 'sibling') return t('tree.sibling')
    return typeKey
  }

  const siblingStyleLabel = (styleKey) => {
    if (styleKey === 'elbow') return t('tree.line_style_elbow')
    if (styleKey === 'rounded') return t('tree.line_style_rounded')
    if (styleKey === 'flex') return t('tree.line_style_flex')
    return styleKey
  }

  const personLabel = (node) => `${node.firstName || ''} ${node.lastName || ''}`.trim() || node.id

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
            {relationToEdit ? t('tree.edit_relation') : t('tree.add_relation')}
          </h2>
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
            <select
              className="form-input"
              value={from}
              onChange={e => setFrom(e.target.value)}
              required={!lockFrom}
              disabled={Boolean(lockFrom)}
            >
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

          {type === 'sibling' && (
            <div className="form-group">
              <label className="form-label">{t('tree.line_style')}</label>
              <select
                className="form-input"
                value={siblingLineStyle}
                onChange={e => setSiblingLineStyle(e.target.value)}
              >
                {SIBLING_LINE_STYLES.map(k => (
                  <option key={k} value={k}>{siblingStyleLabel(k)}</option>
                ))}
              </select>
            </div>
          )}

          {type === 'sibling' && (
            <div className="form-group">
              <label className="form-label">{t('tree.sibling_line_height')}</label>
              <input
                className="form-input"
                type="range"
                min={SIBLING_OFFSET_MIN}
                max={SIBLING_OFFSET_MAX}
                step={1}
                value={siblingRouteOffsetPx}
                onChange={e => setSiblingRouteOffsetPx(Number(e.target.value))}
              />
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 6 }}>
                {siblingRouteOffsetPx}px
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">{t('tree.select_person')} (To)</label>
            <select className="form-input" value={to} onChange={e => setTo(e.target.value)} required>
              <option value="">—</option>
              {nodes.filter(n => n.id !== from).map(n => (
                <option key={n.id} value={n.id}>{personLabel(n)}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
            <button type="submit" className="btn btn-primary">{t('tree.save')}</button>
            {relationToEdit && typeof onDeleteRelation === 'function' && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => onDeleteRelation(relationToEdit.id)}
              >
                {t('tree.delete_relation')}
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={onClose}>{t('tree.cancel')}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
