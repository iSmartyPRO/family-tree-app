import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'

const FIELDS = [
  { key: 'firstName', labelKey: 'tree.first_name', type: 'text', required: true },
  { key: 'lastName', labelKey: 'tree.last_name', type: 'text' },
  { key: 'maidenName', labelKey: 'tree.maiden_name', type: 'text' },
  { key: 'birthDate', labelKey: 'tree.birth_date', type: 'date' },
  { key: 'birthPlace', labelKey: 'tree.birth_place', type: 'text' },
  { key: 'deathDate', labelKey: 'tree.death_date', type: 'date' },
  { key: 'deathPlace', labelKey: 'tree.death_place', type: 'text' },
  { key: 'photo', labelKey: 'tree.photo', type: 'url' }
]

export default function PersonModal({ person, onSave, onClose }) {
  const { t } = useTranslation()

  const [form, setForm] = useState({
    firstName: person?.firstName || '',
    lastName: person?.lastName || '',
    maidenName: person?.maidenName || '',
    gender: person?.gender || 'unknown',
    birthDate: person?.birthDate || '',
    birthPlace: person?.birthPlace || '',
    deathDate: person?.deathDate || '',
    deathPlace: person?.deathPlace || '',
    photo: person?.photo || '',
    bio: person?.bio || ''
  })

  const handleChange = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(form)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
            {person ? t('tree.edit_person') : t('tree.add_person')}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {FIELDS.map(({ key, labelKey, type, required }) => (
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

            <div className="form-group">
              <label className="form-label">{t('tree.gender')}</label>
              <select className="form-input" value={form.gender} onChange={e => handleChange('gender', e.target.value)}>
                <option value="unknown">{t('tree.unknown')}</option>
                <option value="male">{t('tree.male')}</option>
                <option value="female">{t('tree.female')}</option>
              </select>
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

          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button type="submit" className="btn btn-primary">{t('tree.save')}</button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>{t('tree.cancel')}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
