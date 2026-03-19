import { User, Calendar, MapPin, Briefcase, Edit2, Trash2, Link2 } from 'lucide-react'

function formatDate(d) {
  if (!d) return null
  const [y, m, day] = d.split('-')
  return `${day}.${m}.${y}`
}

function getAge(birth, death) {
  if (!birth) return null
  const start = new Date(birth)
  const end = death ? new Date(death) : new Date()
  const age = Math.floor((end - start) / (365.25 * 24 * 3600 * 1000))
  return age >= 0 ? age : null
}

const GENDER_LABELS = { male: 'М', female: 'Ж', other: '—' }
const GENDER_CLASS = { male: 'badge-male', female: 'badge-female', other: 'badge-other' }

export default function PersonCard({ person, relCount, onEdit, onDelete, onManageRels, onSelect, selected }) {
  const age = getAge(person.birthDate, person.deathDate)
  const fullName = [person.lastName, person.firstName, person.patronymic].filter(Boolean).join(' ')
  const isDead = !!person.deathDate

  return (
    <div
      className={`person-card ${selected ? 'selected' : ''} ${isDead ? 'deceased' : ''}`}
      onClick={onSelect}
    >
      <div className="person-card-avatar" style={{ background: person.gender === 'female' ? 'rgba(244,114,182,0.15)' : 'rgba(96,165,250,0.15)' }}>
        <User size={22} color={person.gender === 'female' ? '#f472b6' : '#60a5fa'} />
      </div>
      <div className="person-card-body">
        <div className="person-card-name">{fullName || '—'}</div>
        <div className="person-card-meta">
          <span className={`badge ${GENDER_CLASS[person.gender]}`}>{GENDER_LABELS[person.gender]}</span>
          {age !== null && <span className="meta-item">{isDead ? `†${age} лет` : `${age} лет`}</span>}
          {person.birthDate && (
            <span className="meta-item">
              <Calendar size={11} /> {formatDate(person.birthDate)}
            </span>
          )}
        </div>
        {person.birthPlace && (
          <div className="meta-item">
            <MapPin size={11} /> {person.birthPlace}
          </div>
        )}
        {person.occupation && (
          <div className="meta-item">
            <Briefcase size={11} /> {person.occupation}
          </div>
        )}
        {relCount > 0 && (
          <div className="meta-item" style={{ color: 'var(--accent)' }}>
            <Link2 size={11} /> {relCount} связей
          </div>
        )}
      </div>
      <div className="person-card-actions" onClick={e => e.stopPropagation()}>
        <button className="btn btn-ghost btn-icon btn-sm" title="Связи" onClick={onManageRels}><Link2 size={14} /></button>
        <button className="btn btn-ghost btn-icon btn-sm" title="Редактировать" onClick={onEdit}><Edit2 size={14} /></button>
        <button className="btn btn-ghost btn-icon btn-sm" title="Удалить" style={{ color: 'var(--danger)' }} onClick={onDelete}><Trash2 size={14} /></button>
      </div>
    </div>
  )
}
