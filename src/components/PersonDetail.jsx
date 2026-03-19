import { useEffect } from 'react'
import { X, Calendar, Briefcase, FileText, Link2, Edit2, Trash2, Phone, Mail, ExternalLink } from 'lucide-react'

function GenderAvatar({ gender, color, size = 80 }) {
  const cx = size / 2
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      <circle cx={cx} cy={cx} r={cx} fill={color} opacity="0.12" />
      <circle cx={cx} cy={size * 0.36} r={size * 0.2} fill={color} opacity="0.6" />
      <path
        d={`M${size * 0.1},${size} Q${size * 0.1},${size * 0.63} ${cx},${size * 0.6} Q${size * 0.9},${size * 0.63} ${size * 0.9},${size}`}
        fill={color} opacity="0.5"
      />
    </svg>
  )
}

// ── Brand SVG icons ──────────────────────────────────────────────────────────

function WhatsAppIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

function TelegramIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  )
}

function VKIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.391 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.727-1.033-1-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4.03 8.57 4.03 8.096c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.677.863 2.49 2.303 4.675 2.896 4.675.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.203.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.253-1.406 2.151-3.574 2.151-3.574.119-.254.322-.491.762-.491h1.744c.525 0 .644.27.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.779 1.203 1.253.745.847 1.32 1.558 1.473 2.05.17.49-.085.744-.576.744z" />
    </svg>
  )
}

function InstagramIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  )
}

function FacebookIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

function OKIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 5.5c1.933 0 3.5 1.567 3.5 3.5S13.933 12.5 12 12.5 8.5 10.933 8.5 9 10.067 5.5 12 5.5zm5.95 7.5c-.42 1.14-1.23 2.1-2.27 2.72l2.52 2.52c.39.39.39 1.02 0 1.41-.39.39-1.02.39-1.41 0L14 16.85l-2.79 2.79c-.19.19-.44.29-.7.29s-.51-.1-.7-.29c-.39-.39-.39-1.02 0-1.41l2.52-2.52c-1.04-.62-1.85-1.58-2.27-2.72-.19-.51.07-1.07.58-1.26.51-.19 1.07.07 1.26.58.39 1.06 1.41 1.79 2.6 1.79s2.21-.73 2.6-1.79c.19-.51.75-.77 1.26-.58.51.19.77.75.58 1.26z" />
    </svg>
  )
}

// ── Contact type definitions ──────────────────────────────────────────────────

const CONTACT_TYPES = [
  { key: 'phone',     label: 'Телефон',        color: '#4ade80', Icon: Phone,         getHref: v => `tel:${v}`,                                                      getDisplay: v => v },
  { key: 'email',     label: 'Email',           color: '#60a5fa', Icon: Mail,          getHref: v => `mailto:${v}`,                                                   getDisplay: v => v },
  { key: 'whatsapp',  label: 'WhatsApp',        color: '#25d366', Icon: WhatsAppIcon,  getHref: v => `https://wa.me/${v.replace(/\D/g, '')}`,                         getDisplay: v => v },
  { key: 'telegram',  label: 'Telegram',        color: '#229ed9', Icon: TelegramIcon,  getHref: v => `https://t.me/${v.replace(/^@/, '')}`,                           getDisplay: v => v.startsWith('@') ? v : `@${v}` },
  { key: 'vk',        label: 'ВКонтакте',       color: '#4c75a3', Icon: VKIcon,        getHref: v => v.startsWith('http') ? v : `https://vk.com/${v}`,                getDisplay: v => v },
  { key: 'instagram', label: 'Instagram',       color: '#e1306c', Icon: InstagramIcon, getHref: v => v.startsWith('http') ? v : `https://instagram.com/${v.replace(/^@/, '')}`, getDisplay: v => v.startsWith('@') ? v : `@${v}` },
  { key: 'facebook',  label: 'Facebook',        color: '#1877f2', Icon: FacebookIcon,  getHref: v => v.startsWith('http') ? v : `https://facebook.com/${v}`,          getDisplay: v => v },
  { key: 'ok',        label: 'Одноклассники',   color: '#ee8208', Icon: OKIcon,        getHref: v => v.startsWith('http') ? v : `https://ok.ru/${v}`,                 getDisplay: v => v },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(d) {
  if (!d) return null
  const [y, m, day] = d.split('-')
  return `${day}.${m}.${y}`
}

function getAge(birth, death) {
  if (!birth) return null
  const start = new Date(birth)
  const end = death ? new Date(death) : new Date()
  return Math.floor((end - start) / (365.25 * 24 * 3600 * 1000))
}

const REL_LABEL = {
  'parent-child-from': 'Родитель',
  'parent-child-to': 'Ребёнок',
  'spouse-from': 'Супруг(а)',
  'spouse-to': 'Супруг(а)',
  'sibling-from': 'Брат / Сестра',
  'sibling-to': 'Брат / Сестра',
}
const REL_COLOR = { 'parent-child': '#6c8fff', 'spouse': '#f472b6', 'sibling': '#34d399' }

// ── Component ─────────────────────────────────────────────────────────────────

export default function PersonDetail({ person, relations, people, onClose, onEdit, onDelete, onManageRels, readonly = false }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!person) return null

  const isFemale = person.gender === 'female'
  const isDead = !!person.deathDate
  const accentColor = isFemale ? '#f472b6' : '#60a5fa'
  const accentBg = isFemale ? 'rgba(244,114,182,0.08)' : 'rgba(96,165,250,0.08)'

  const fullName = [person.lastName, person.firstName, person.patronymic].filter(Boolean).join(' ')
  const age = getAge(person.birthDate, person.deathDate)
  const contacts = person.contacts || {}
  const activeContacts = CONTACT_TYPES.filter(c => contacts[c.key]?.trim())

  const myRels = relations.filter(r => r.from === person.id || r.to === person.id)
  const personMap = Object.fromEntries(people.map(p => [p.id, p]))

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="person-popup">

        {/* ── Header ── */}
        <div className="person-popup-header" style={{ background: accentBg, borderBottom: `1px solid ${accentColor}30` }}>
          <button className="btn btn-ghost btn-icon person-popup-close" onClick={onClose}>
            <X size={18} />
          </button>
          <div className="person-popup-avatar" style={{ background: `${accentColor}18`, border: `2px solid ${accentColor}50`, overflow: 'hidden' }}>
            {person.photo ? (
              <img src={person.photo} alt={fullName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
            ) : (
              <GenderAvatar gender={person.gender} color={accentColor} size={80} />
            )}
          </div>
          <div className="person-popup-name">{fullName || '—'}</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 6 }}>
            <span className={`badge badge-${person.gender === 'female' ? 'female' : person.gender === 'male' ? 'male' : 'other'}`}>
              {person.gender === 'male' ? 'Мужской' : person.gender === 'female' ? 'Женский' : 'Другой'}
            </span>
            {isDead && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>†</span>}
            {age !== null && (
              <span style={{ fontSize: 13, color: accentColor, fontWeight: 600 }}>
                {isDead ? `Прожил(а) ${age} л.` : `${age} лет`}
              </span>
            )}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="person-popup-body">

          {/* Basic info */}
          {(person.birthDate || person.occupation || person.notes) && (
            <div className="person-popup-section">
              <div className="person-popup-section-title">Информация</div>
              {person.birthDate && (
                <div className="popup-info-row">
                  <Calendar size={13} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span className="popup-info-label">Рождение</span>
                  <span className="popup-info-value">
                    {formatDate(person.birthDate)}{person.birthPlace ? `, ${person.birthPlace}` : ''}
                  </span>
                </div>
              )}
              {person.deathDate && (
                <div className="popup-info-row">
                  <Calendar size={13} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span className="popup-info-label">Смерть</span>
                  <span className="popup-info-value">
                    {formatDate(person.deathDate)}{person.deathPlace ? `, ${person.deathPlace}` : ''}
                  </span>
                </div>
              )}
              {person.occupation && (
                <div className="popup-info-row">
                  <Briefcase size={13} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span className="popup-info-label">Профессия</span>
                  <span className="popup-info-value">{person.occupation}</span>
                </div>
              )}
              {person.notes && (
                <div className="popup-info-row">
                  <FileText size={13} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span className="popup-info-label">Заметки</span>
                  <span className="popup-info-value">{person.notes}</span>
                </div>
              )}
            </div>
          )}

          {/* Contacts */}
          {activeContacts.length > 0 && (
            <div className="person-popup-section">
              <div className="person-popup-section-title">Контакты</div>
              <div className="contact-grid">
                {activeContacts.map(({ key, label, color, Icon, getHref, getDisplay }) => {
                  const val = contacts[key].trim()
                  return (
                    <a
                      key={key}
                      href={getHref(val)}
                      target={key === 'phone' || key === 'email' ? '_self' : '_blank'}
                      rel="noopener noreferrer"
                      className="contact-item"
                      style={{ '--contact-color': color }}
                    >
                      <div className="contact-icon" style={{ background: `${color}18`, color }}>
                        <Icon size={18} />
                      </div>
                      <div className="contact-info">
                        <div className="contact-label">{label}</div>
                        <div className="contact-value">{getDisplay(val)}</div>
                      </div>
                      <ExternalLink size={12} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                    </a>
                  )
                })}
              </div>
            </div>
          )}

          {/* Relations */}
          {myRels.length > 0 && (
            <div className="person-popup-section">
              <div className="person-popup-section-title">Связи</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {myRels.map(rel => {
                  const isFrom = rel.from === person.id
                  const otherId = isFrom ? rel.to : rel.from
                  const other = personMap[otherId]
                  if (!other) return null
                  const key = `${rel.type}-${isFrom ? 'from' : 'to'}`
                  const label = REL_LABEL[key] || rel.type
                  const color = REL_COLOR[rel.type]
                  const otherName = [other.lastName, other.firstName].filter(Boolean).join(' ')
                  return (
                    <div key={rel.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', background: 'var(--surface2)', borderRadius: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                      <span style={{ color: 'var(--text-muted)', fontSize: 12, minWidth: 90 }}>{label}</span>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{otherName || '—'}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {readonly ? (
          <div className="person-popup-footer">
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
              Закрыть
            </button>
          </div>
        ) : (
          <div className="person-popup-footer">
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onManageRels}>
              <Link2 size={14} /> Связи
            </button>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onEdit}>
              <Edit2 size={14} /> Изменить
            </button>
            <button className="btn btn-danger" style={{ flex: 1 }} onClick={onDelete}>
              <Trash2 size={14} /> Удалить
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
