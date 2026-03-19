import { useState } from 'react'
import { X, Plus, Trash2, Users } from 'lucide-react'

const REL_TYPES = [
  { value: 'parent-child', label: 'Родитель → Ребёнок' },
  { value: 'spouse', label: 'Супруг(а)' },
  { value: 'sibling', label: 'Брат / Сестра' },
]

const REL_LABELS = {
  'parent-child': { from: 'Родитель', to: 'Ребёнок' },
  'spouse': { from: 'Супруг', to: 'Супруг' },
  'sibling': { from: 'Брат/Сестра', to: 'Брат/Сестра' },
}

function getRelLabel(rel, personId, people) {
  const other = rel.from === personId ? rel.to : rel.from
  const otherPerson = people.find(p => p.id === other)
  const name = otherPerson ? [otherPerson.lastName, otherPerson.firstName].filter(Boolean).join(' ') : '?'

  if (rel.type === 'parent-child') {
    if (rel.from === personId) return { role: 'Родитель', otherRole: 'Ребёнок', name }
    else return { role: 'Ребёнок', otherRole: 'Родитель', name }
  }
  if (rel.type === 'spouse') return { role: 'Супруг(а)', otherRole: 'Супруг(а)', name }
  if (rel.type === 'sibling') return { role: 'Брат/Сестра', otherRole: 'Брат/Сестра', name }
  return { role: rel.type, otherRole: rel.type, name }
}

const REL_COLORS = {
  'parent-child': '#6c8fff',
  'spouse': '#f472b6',
  'sibling': '#34d399',
}

export default function RelationManager({ person, people, relations, onAddRelation, onDeleteRelation, onClose }) {
  const [type, setType] = useState('parent-child')
  const [direction, setDirection] = useState('from') // from=this person is parent, to=this person is child
  const [targetId, setTargetId] = useState('')

  const myRelations = relations.filter(r => r.from === person.id || r.to === person.id)

  const available = people.filter(p => {
    if (p.id === person.id) return false
    // already related?
    return !myRelations.some(r =>
      r.type === type &&
      ((r.from === person.id && r.to === p.id) || (r.from === p.id && r.to === person.id))
    )
  })

  function handleAdd() {
    if (!targetId) return
    let from = person.id, to = targetId
    if (type === 'parent-child' && direction === 'to') {
      from = targetId; to = person.id
    } else if (type !== 'parent-child') {
      from = person.id; to = targetId
    }
    onAddRelation({ type, from, to })
    setTargetId('')
  }

  const fullName = [person.lastName, person.firstName, person.patronymic].filter(Boolean).join(' ')

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 540 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Users size={18} color="var(--accent)" />
            <span className="modal-title">Связи: {fullName}</span>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Existing relations */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Текущие связи ({myRelations.length})
          </div>
          {myRelations.length === 0 && (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '12px 0' }}>Нет связей</div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {myRelations.map(rel => {
              const info = getRelLabel(rel, person.id, people)
              return (
                <div key={rel.id} className="rel-item">
                  <div className="rel-dot" style={{ background: REL_COLORS[rel.type] }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{info.role}: </span>
                    <span style={{ fontWeight: 500 }}>{info.name}</span>
                  </div>
                  <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }}
                    onClick={() => onDeleteRelation(rel.id)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Add relation */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Добавить связь
          </div>
          <div className="form-group">
            <label>Тип связи</label>
            <select className="input" value={type} onChange={e => { setType(e.target.value); setTargetId('') }}>
              {REL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          {type === 'parent-child' && (
            <div className="form-group">
              <label>Роль текущей персоны</label>
              <select className="input" value={direction} onChange={e => setDirection(e.target.value)}>
                <option value="from">Является родителем</option>
                <option value="to">Является ребёнком</option>
              </select>
            </div>
          )}
          <div className="form-group">
            <label>Выбрать человека</label>
            <select className="input" value={targetId} onChange={e => setTargetId(e.target.value)}>
              <option value="">— выберите —</option>
              {available.map(p => (
                <option key={p.id} value={p.id}>
                  {[p.lastName, p.firstName, p.patronymic].filter(Boolean).join(' ')}
                  {p.birthDate ? ` (${p.birthDate.split('-')[0]})` : ''}
                </option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleAdd} disabled={!targetId}>
            <Plus size={16} /> Добавить связь
          </button>
        </div>
      </div>
    </div>
  )
}
