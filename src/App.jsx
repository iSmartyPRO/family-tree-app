import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useStore } from './store/useStore'
import Sidebar from './components/Sidebar'
import PersonForm from './components/PersonForm'
import RelationManager from './components/RelationManager'
import TreeView from './components/TreeView'
import PersonDetail from './components/PersonDetail'
import './App.css'

export default function App() {
  const store = useStore()
  const [view, setView] = useState('tree')
  const [selectedId, setSelectedId] = useState(null)
  const [editPerson, setEditPerson] = useState(null)
  const [relPerson, setRelPerson] = useState(null)

  // Fullscreen edit mode (карточки можно перемещать + редактировать)
  const [fullscreen, setFullscreen] = useState(false)

  // Fullscreen view-only mode (только просмотр, без редактирования)
  const [fullscreenView, setFullscreenView] = useState(false)
  const [viewSelectedId, setViewSelectedId] = useState(null)

  const selected = store.people.find(p => p.id === selectedId) || null
  const viewSelected = store.people.find(p => p.id === viewSelectedId) || null

  // Escape: закрывает fullscreen edit (если не открыт PersonDetail)
  useEffect(() => {
    if (!fullscreen) return
    const onKey = e => { if (e.key === 'Escape' && !selectedId) setFullscreen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fullscreen, selectedId])

  // Escape: закрывает fullscreen view (если не открыт PersonDetail)
  useEffect(() => {
    if (!fullscreenView) return
    const onKey = e => { if (e.key === 'Escape' && !viewSelectedId) setFullscreenView(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fullscreenView, viewSelectedId])

  function handleAdd() { setEditPerson({}) }
  function handleEdit(person) { setEditPerson(person) }
  function handleSave(form) {
    if (editPerson?.id) {
      store.updatePerson(editPerson.id, form)
    } else {
      const p = store.addPerson(form)
      setSelectedId(p.id)
    }
    setEditPerson(null)
  }
  function handleDelete(id) {
    if (!window.confirm('Удалить этого человека?')) return
    store.deletePerson(id)
    if (selectedId === id) setSelectedId(null)
  }
  function handleSelect(id) {
    setSelectedId(prev => prev === id ? null : id)
  }

  return (
    <div className="app-layout">
      <Sidebar
        people={store.people}
        relations={store.relations}
        selectedId={selectedId}
        view={view}
        onViewChange={setView}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onManageRels={setRelPerson}
        onSelect={handleSelect}
      />

      <div className="main-area">
        {view === 'tree' ? (
          <TreeView
            people={store.people}
            relations={store.relations}
            selectedId={selectedId}
            onSelectPerson={handleSelect}
            onFullscreen={() => { setSelectedId(null); setFullscreen(true) }}
            onFullscreenView={() => { setViewSelectedId(null); setFullscreenView(true) }}
          />
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16 }}>Выберите человека в списке слева</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>или переключитесь в режим дерева</div>
            </div>
          </div>
        )}
      </div>

      {/* Формы */}
      {editPerson !== null && (
        <PersonForm
          initial={editPerson}
          onSave={handleSave}
          onClose={() => setEditPerson(null)}
        />
      )}
      {relPerson && (
        <RelationManager
          person={relPerson}
          people={store.people}
          relations={store.relations}
          onAddRelation={store.addRelation}
          onDeleteRelation={store.deleteRelation}
          onClose={() => setRelPerson(null)}
        />
      )}

      {/* PersonDetail — обычный режим */}
      {selected && !fullscreen && (
        <PersonDetail
          person={selected}
          relations={store.relations}
          people={store.people}
          onClose={() => setSelectedId(null)}
          onEdit={() => { setSelectedId(null); handleEdit(selected) }}
          onDelete={() => handleDelete(selected.id)}
          onManageRels={() => setRelPerson(selected)}
        />
      )}

      {/* ── Fullscreen EDIT overlay ── */}
      {fullscreen && (
        <div className="fullscreen-overlay">
          <button
            className="fullscreen-close btn btn-secondary btn-icon"
            onClick={() => { setSelectedId(null); setFullscreen(false) }}
            title="Закрыть (Esc)"
          >
            <X size={18} />
          </button>
          <TreeView
            people={store.people}
            relations={store.relations}
            selectedId={selectedId}
            onSelectPerson={handleSelect}
          />
        </div>
      )}

      {/* PersonDetail внутри fullscreen edit — рендерится ПОСЛЕ оверлея, всплывает поверх */}
      {fullscreen && selected && (
        <PersonDetail
          person={selected}
          relations={store.relations}
          people={store.people}
          onClose={() => setSelectedId(null)}
          onEdit={() => {
            setSelectedId(null)
            setFullscreen(false)
            handleEdit(selected)
          }}
          onDelete={() => {
            handleDelete(selected.id)
            setFullscreen(false)
          }}
          onManageRels={() => {
            setSelectedId(null)
            setFullscreen(false)
            setRelPerson(selected)
          }}
        />
      )}

      {/* ── Fullscreen VIEW-ONLY overlay ── */}
      {fullscreenView && (
        <div className="fullscreen-overlay">
          <button
            className="fullscreen-close btn btn-secondary btn-icon"
            onClick={() => { setViewSelectedId(null); setFullscreenView(false) }}
            title="Закрыть (Esc)"
          >
            <X size={18} />
          </button>
          {/* Метка режима просмотра */}
          <div className="fullscreen-view-badge">
            Режим просмотра
          </div>
          <TreeView
            people={store.people}
            relations={store.relations}
            selectedId={viewSelectedId}
            onSelectPerson={id => setViewSelectedId(prev => prev === id ? null : id)}
            readonly={true}
          />
        </div>
      )}

      {/* PersonDetail в режиме просмотра — readonly, рендерится ПОСЛЕ оверлея */}
      {fullscreenView && viewSelected && (
        <PersonDetail
          person={viewSelected}
          relations={store.relations}
          people={store.people}
          onClose={() => setViewSelectedId(null)}
          onEdit={() => {}}
          onDelete={() => {}}
          onManageRels={() => {}}
          readonly={true}
        />
      )}
    </div>
  )
}
