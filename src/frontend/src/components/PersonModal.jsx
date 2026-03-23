import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Eye } from 'lucide-react'
import RelationModal from './RelationModal'

const BASE_FIELDS = [
  { key: 'lastName', labelKey: 'tree.last_name', type: 'text' },
  { key: 'firstName', labelKey: 'tree.first_name', type: 'text', required: true },
  { key: 'patronymic', labelKey: 'tree.patronymic', type: 'text' },
  { key: 'maidenName', labelKey: 'tree.maiden_name', type: 'text' },
  { key: 'birthDate', labelKey: 'tree.birth_date', type: 'date' },
  { key: 'birthPlace', labelKey: 'tree.birth_place', type: 'text' },
  { key: 'photo', labelKey: 'tree.photo', type: 'url' }
]

const CONTACT_KEYS = [
  { key: 'phone', labelKey: 'tree.contact_phone', type: 'tel' },
  { key: 'email', labelKey: 'tree.contact_email', type: 'email' },
  { key: 'whatsapp', labelKey: 'tree.contact_whatsapp', type: 'text' },
  { key: 'telegram', labelKey: 'tree.contact_telegram', type: 'text' },
  { key: 'instagram', labelKey: 'tree.contact_instagram', type: 'text' },
  { key: 'facebook', labelKey: 'tree.contact_facebook', type: 'text' },
  { key: 'linkedin', labelKey: 'tree.contact_linkedin', type: 'text' },
  { key: 'vk', labelKey: 'tree.contact_vk', type: 'text' },
  { key: 'ok', labelKey: 'tree.contact_ok', type: 'text' }
]

function emptyContacts() {
  return {
    phone: '',
    email: '',
    whatsapp: '',
    telegram: '',
    instagram: '',
    facebook: '',
    linkedin: '',
    vk: '',
    ok: ''
  }
}

function parseYmd(s) {
  if (!s || typeof s !== 'string') return null
  const [y, m, d] = s.split('-').map(Number)
  if (!y) return null
  return new Date(y, (m || 1) - 1, d || 1)
}

function initialAlive(person) {
  if (!person) return true
  if (person.isAlive === false) return false
  if (person.isAlive === true) return true
  return !person.deathDate
}

export default function PersonModal({
  person,
  onSave,
  onClose,
  onViewInTree,
  nodes,
  relations,
  onAddRelation,
  onUpdateRelation,
  onDeleteRelation
}) {
  const { t } = useTranslation()

  const [personTab, setPersonTab] = useState('info')
  useEffect(() => {
    setPersonTab('info')
  }, [person?.id])

  const [showRelationModal, setShowRelationModal] = useState(false)
  const [editingRelation, setEditingRelation] = useState(null)
  const [relationPresetFrom, setRelationPresetFrom] = useState(null)

  const [form, setForm] = useState({
    firstName: person?.firstName || '',
    lastName: person?.lastName || '',
    patronymic: person?.patronymic || '',
    maidenName: person?.maidenName || '',
    gender: person?.gender || 'unknown',
    birthDate: person?.birthDate || '',
    birthPlace: person?.birthPlace || '',
    deathDate: person?.deathDate || '',
    deathPlace: person?.deathPlace || '',
    photo: person?.photo || '',
    bio: person?.bio || ''
  })

  const [isAlive, setIsAlive] = useState(() => initialAlive(person))
  const [contacts, setContacts] = useState(() => ({
    ...emptyContacts(),
    ...(person?.contacts && typeof person.contacts === 'object' ? person.contacts : {})
  }))
  const [error, setError] = useState('')

  const deathFieldsVisible = !isAlive

  const handleChange = (key, val) => setForm(prev => ({ ...prev, [key]: val }))
  const handleContact = (key, val) => setContacts(prev => ({ ...prev, [key]: val }))

  const toggleAlive = () => {
    setIsAlive(a => !a)
    setError('')
  }

  const validate = () => {
    if (!isAlive) {
      if (!form.deathDate?.trim()) {
        setError(t('tree.error_death_date_required'))
        return false
      }
      if (!form.deathPlace?.trim()) {
        setError(t('tree.error_death_place_required'))
        return false
      }
      const b = parseYmd(form.birthDate)
      const d = parseYmd(form.deathDate)
      if (b && d && d < b) {
        setError(t('tree.error_death_before_birth'))
        return false
      }
    }
    setError('')
    return true
  }

  const handleSubmit = e => {
    e.preventDefault()
    if (!validate()) return

    const payload = {
      ...form,
      isAlive,
      contacts: { ...contacts }
    }

    if (isAlive) {
      payload.deathDate = ''
      payload.deathPlace = ''
    }

    onSave(payload)
  }

  const handleView = () => {
    onViewInTree?.()
  }

  const personId = person?.id
  const relsForPerson = useMemo(() => {
    if (!personId || !Array.isArray(relations)) return []
    return relations.filter(r => r.from === personId || r.to === personId)
  }, [personId, relations])

  const nameOf = (pid) => {
    const n = (nodes || []).find(nn => nn.id === pid)
    return [n?.lastName, n?.firstName, n?.patronymic].filter(Boolean).join(' ') || pid
  }

  const openAddRelation = () => {
    setEditingRelation(null)
    setRelationPresetFrom(personId)
    setShowRelationModal(true)
  }

  const openEditRelation = (rel) => {
    setEditingRelation(rel)
    setRelationPresetFrom(null)
    setShowRelationModal(true)
  }

  const handleDeleteRelation = (relationId) => {
    onDeleteRelation?.(relationId)
    setShowRelationModal(false)
    setEditingRelation(null)
    setRelationPresetFrom(null)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
            {person ? t('tree.edit_person') : t('tree.add_person')}
          </h2>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
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
          <form onSubmit={handleSubmit}>
            <div
              className={`alive-toggle ${isAlive ? 'on' : 'off'}`}
              role="button"
              tabIndex={0}
              onClick={toggleAlive}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  toggleAlive()
                }
              }}
              style={{ marginBottom: 20, width: '100%', boxSizing: 'border-box' }}
            >
              <span className="alive-toggle-indicator" aria-hidden />
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                {isAlive ? t('tree.alive_yes') : t('tree.alive_no')}
              </span>
            </div>

            {error ? (
              <div style={{ color: 'var(--danger, #ef4444)', fontSize: '0.88rem', marginBottom: 12 }}>{error}</div>
            ) : null}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {BASE_FIELDS.map(({ key, labelKey, type, required }) => (
                <div key={key} className="form-group" style={key === 'photo' ? { gridColumn: '1 / -1' } : {}}>
                  <label className="form-label">{t(labelKey)}</label>
                  <input
                    className="form-input"
                    type={type}
                    value={form[key]}
                    onChange={e => handleChange(key, e.target.value)}
                    required={required}
                  />
                </div>
              ))}

              {deathFieldsVisible ? (
                <>
                  <div className="form-group">
                    <label className="form-label">{t('tree.death_date')}</label>
                    <input
                      className="form-input"
                      type="date"
                      value={form.deathDate}
                      onChange={e => handleChange('deathDate', e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('tree.death_place')}</label>
                    <input
                      className="form-input"
                      type="text"
                      value={form.deathPlace}
                      onChange={e => handleChange('deathPlace', e.target.value)}
                      required
                    />
                  </div>
                </>
              ) : null}

              <div className="form-group">
                <label className="form-label">{t('tree.gender')}</label>
                <select className="form-input" value={form.gender} onChange={e => handleChange('gender', e.target.value)}>
                  <option value="unknown">{t('tree.unknown')}</option>
                  <option value="male">{t('tree.male')}</option>
                  <option value="female">{t('tree.female')}</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: 8, marginBottom: 8 }}>
              <div className="form-label" style={{ marginBottom: 10 }}>
                {t('tree.contacts_section')}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {CONTACT_KEYS.map(({ key, labelKey, type }) => (
                  <div key={key} className="form-group">
                    <label className="form-label">{t(labelKey)}</label>
                    <input
                      className="form-input"
                      type={type}
                      value={contacts[key] || ''}
                      onChange={e => handleContact(key, e.target.value)}
                      placeholder={t('tree.contact_placeholder')}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group" style={{ marginTop: 8 }}>
              <label className="form-label">{t('tree.bio')}</label>
              <textarea
                className="form-input"
                rows={3}
                value={form.bio}
                onChange={e => handleChange('bio', e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 16 }}>
              <button type="submit" className="btn btn-primary">
                {t('tree.save')}
              </button>
              {onViewInTree ? (
                <button type="button" className="btn btn-secondary" onClick={handleView}>
                  <Eye size={16} style={{ marginRight: 6 }} />
                  {t('tree.view_in_tree')}
                </button>
              ) : null}
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                {t('tree.cancel')}
              </button>
            </div>
          </form>
        ) : null}

        {personTab === 'relations' ? (
          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{t('tree.tab_relations')}</div>
              <button type="button" className="btn btn-primary btn-sm" onClick={openAddRelation}>
                {t('tree.add_relation')}
              </button>
            </div>

            {relsForPerson.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t('tree.no_relations')}</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEditRelation(rel)}>
                        {t('tree.edit_relation')}
                      </button>
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDeleteRelation(rel.id)}>
                        {t('tree.delete_relation')}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : null}

        {showRelationModal ? (
          <RelationModal
            nodes={nodes}
            relations={relations}
            onAddRelation={onAddRelation}
            onUpdateRelation={onUpdateRelation}
            onDeleteRelation={onDeleteRelation}
            relationToEdit={editingRelation}
            presetFrom={editingRelation ? null : relationPresetFrom}
            lockFrom={Boolean(relationPresetFrom) && !editingRelation}
            onClose={() => {
              setShowRelationModal(false)
              setEditingRelation(null)
              setRelationPresetFrom(null)
            }}
          />
        ) : null}
      </div>
    </div>
  )
}
