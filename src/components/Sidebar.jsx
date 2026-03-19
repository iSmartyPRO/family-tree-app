import { useState } from 'react'
import { Search, Plus, Users, TreePine } from 'lucide-react'
import PersonCard from './PersonCard'

export default function Sidebar({ people, relations, onAdd, onEdit, onDelete, onManageRels, onSelect, selectedId, view, onViewChange }) {
  const [search, setSearch] = useState('')

  const filtered = people.filter(p => {
    const q = search.toLowerCase()
    return [p.firstName, p.lastName, p.patronymic, p.occupation, p.birthPlace]
      .filter(Boolean).join(' ').toLowerCase().includes(q)
  })

  function relCount(id) {
    return relations.filter(r => r.from === id || r.to === id).length
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="app-title">
          <span style={{ fontSize: 20 }}>🌳</span>
          <span>Родологическое дерево</span>
        </div>
        <div className="view-tabs">
          <button className={`view-tab ${view === 'list' ? 'active' : ''}`} onClick={() => onViewChange('list')}>
            <Users size={14} /> Список
          </button>
          <button className={`view-tab ${view === 'tree' ? 'active' : ''}`} onClick={() => onViewChange('tree')}>
            <TreePine size={14} /> Дерево
          </button>
        </div>
      </div>
      <div className="sidebar-search">
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input" style={{ paddingLeft: 32 }} placeholder="Поиск…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="sidebar-stats">
        <span>{people.length} чел.</span>
        <span>{relations.length} связей</span>
      </div>
      <div className="sidebar-list">
        {filtered.length === 0 && (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 16px', textAlign: 'center' }}>
            {search ? 'Не найдено' : 'Нет людей'}
          </div>
        )}
        {filtered.map(person => (
          <PersonCard
            key={person.id}
            person={person}
            relCount={relCount(person.id)}
            selected={selectedId === person.id}
            onSelect={() => onSelect(person.id)}
            onEdit={() => onEdit(person)}
            onDelete={() => onDelete(person.id)}
            onManageRels={() => onManageRels(person)}
          />
        ))}
      </div>
      <div className="sidebar-footer">
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={onAdd}>
          <Plus size={16} /> Добавить человека
        </button>
      </div>
    </div>
  )
}
