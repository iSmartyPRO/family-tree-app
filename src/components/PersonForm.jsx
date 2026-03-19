import { useState } from 'react'
import { X, Phone, Mail } from 'lucide-react'

const EMPTY = {
  firstName: '',
  lastName: '',
  patronymic: '',
  gender: 'male',
  birthDate: '',
  birthPlace: '',
  deathDate: '',
  deathPlace: '',
  occupation: '',
  notes: '',
  photo: '',
  contacts: {
    phone: '', email: '', whatsapp: '', telegram: '',
    vk: '', instagram: '', facebook: '', ok: '',
  },
}

const CONTACT_FIELDS = [
  { key: 'phone',     label: 'Телефон',       placeholder: '+7 999 123-45-67',   icon: '📞' },
  { key: 'email',     label: 'Email',          placeholder: 'email@example.com',  icon: '✉️' },
  { key: 'whatsapp',  label: 'WhatsApp',       placeholder: '+7 999 123-45-67',   icon: '💬' },
  { key: 'telegram',  label: 'Telegram',       placeholder: '@username',           icon: '✈️' },
  { key: 'vk',        label: 'ВКонтакте',      placeholder: 'id или ссылка',      icon: '🔵' },
  { key: 'instagram', label: 'Instagram',      placeholder: '@username',           icon: '📷' },
  { key: 'facebook',  label: 'Facebook',       placeholder: 'username или ссылка', icon: '👤' },
  { key: 'ok',        label: 'Одноклассники',  placeholder: 'id или ссылка',      icon: '🟠' },
]

export default function PersonForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState({
    ...EMPTY,
    ...initial,
    photo: initial?.photo || '',
    contacts: { ...EMPTY.contacts, ...(initial?.contacts || {}) },
  })

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function setContact(field, value) {
    setForm(f => ({ ...f, contacts: { ...f.contacts, [field]: value } }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.firstName.trim()) return
    onSave(form)
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 560 }}>
        <div className="modal-header">
          <span className="modal-title">
            {initial?.id ? 'Редактировать человека' : 'Добавить человека'}
          </span>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          {/* Photo upload */}
          <div className="photo-upload-row">
            <div className="photo-upload-preview">
              {form.photo ? (
                <img src={form.photo} alt="Фото" className="photo-upload-img" />
              ) : (
                <div className="photo-upload-placeholder">
                  {form.gender === 'female' ? (
                    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
                      <circle cx="26" cy="18" r="10" fill="#f472b6" opacity="0.5"/>
                      <path d="M6,52 Q6,33 26,31 Q46,33 46,52" fill="#f472b6" opacity="0.4"/>
                    </svg>
                  ) : (
                    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
                      <circle cx="26" cy="18" r="10" fill="#60a5fa" opacity="0.5"/>
                      <path d="M6,52 Q6,33 26,31 Q46,33 46,52" fill="#60a5fa" opacity="0.4"/>
                    </svg>
                  )}
                </div>
              )}
            </div>
            <div className="photo-upload-controls">
              <label className="btn btn-secondary photo-upload-btn">
                {form.photo ? 'Заменить фото' : 'Загрузить фото'}
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const file = e.target.files[0]
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = ev => set('photo', ev.target.result)
                    reader.readAsDataURL(file)
                  }}
                />
              </label>
              {form.photo && (
                <button type="button" className="btn btn-ghost" style={{ fontSize: 12, color: 'var(--text-muted)' }} onClick={() => set('photo', '')}>
                  Удалить фото
                </button>
              )}
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>JPG, PNG до 5 МБ</div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Фамилия</label>
              <input className="input" value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Иванов" />
            </div>
            <div className="form-group">
              <label>Имя *</label>
              <input className="input" value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="Иван" required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Отчество</label>
              <input className="input" value={form.patronymic} onChange={e => set('patronymic', e.target.value)} placeholder="Иванович" />
            </div>
            <div className="form-group">
              <label>Пол</label>
              <select className="input" value={form.gender} onChange={e => set('gender', e.target.value)}>
                <option value="male">Мужской</option>
                <option value="female">Женский</option>
                <option value="other">Другой</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Дата рождения</label>
              <input className="input" type="date" value={form.birthDate} onChange={e => set('birthDate', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Место рождения</label>
              <input className="input" value={form.birthPlace} onChange={e => set('birthPlace', e.target.value)} placeholder="Город, страна" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Дата смерти</label>
              <input className="input" type="date" value={form.deathDate} onChange={e => set('deathDate', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Место смерти</label>
              <input className="input" value={form.deathPlace} onChange={e => set('deathPlace', e.target.value)} placeholder="Город, страна" />
            </div>
          </div>
          <div className="form-group">
            <label>Профессия / Занятие</label>
            <input className="input" value={form.occupation} onChange={e => set('occupation', e.target.value)} placeholder="Профессия" />
          </div>
          <div className="form-group">
            <label>Заметки</label>
            <textarea className="input" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Дополнительная информация..." />
          </div>

          {/* Contacts section */}
          <div className="form-section-divider">
            <span>Контакты</span>
          </div>
          <div className="form-row">
            {CONTACT_FIELDS.map(({ key, label, placeholder, icon }) => (
              <div className="form-group" key={key}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span>{icon}</span> {label}
                </label>
                <input
                  className="input"
                  value={form.contacts[key] || ''}
                  onChange={e => setContact(key, e.target.value)}
                  placeholder={placeholder}
                />
              </div>
            ))}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Отмена</button>
            <button type="submit" className="btn btn-primary">
              {initial?.id ? 'Сохранить' : 'Добавить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
