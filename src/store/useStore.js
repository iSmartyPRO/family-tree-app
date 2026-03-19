import { useState, useCallback } from 'react'

const STORAGE_KEY = 'rodolog_data'

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { people: [], relations: [] }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

// Relation types:
// parent-child: from=parent, to=child
// spouse: from=personA, to=personB (bidirectional)
// sibling: from=personA, to=personB (bidirectional)

let _data = loadData()

export function useStore() {
  const [data, setData] = useState(_data)

  const commit = useCallback((newData) => {
    _data = newData
    saveData(newData)
    setData({ ...newData })
  }, [])

  const addPerson = useCallback((person) => {
    const newPerson = { ...person, id: generateId() }
    commit({ ..._data, people: [..._data.people, newPerson] })
    return newPerson
  }, [commit])

  const updatePerson = useCallback((id, updates) => {
    commit({
      ..._data,
      people: _data.people.map(p => p.id === id ? { ...p, ...updates } : p)
    })
  }, [commit])

  const deletePerson = useCallback((id) => {
    commit({
      people: _data.people.filter(p => p.id !== id),
      relations: _data.relations.filter(r => r.from !== id && r.to !== id)
    })
  }, [commit])

  const addRelation = useCallback((relation) => {
    // Prevent duplicates
    const exists = _data.relations.some(
      r => r.type === relation.type &&
        ((r.from === relation.from && r.to === relation.to) ||
         (r.from === relation.to && r.to === relation.from && relation.type !== 'parent-child'))
    )
    if (exists) return
    const newRel = { ...relation, id: generateId() }
    commit({ ..._data, relations: [..._data.relations, newRel] })
  }, [commit])

  const deleteRelation = useCallback((id) => {
    commit({ ..._data, relations: _data.relations.filter(r => r.id !== id) })
  }, [commit])

  const getPersonById = useCallback((id) => {
    return _data.people.find(p => p.id === id)
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  const getRelationsFor = useCallback((personId) => {
    return _data.relations.filter(r => r.from === personId || r.to === personId)
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    people: data.people,
    relations: data.relations,
    addPerson,
    updatePerson,
    deletePerson,
    addRelation,
    deleteRelation,
    getPersonById,
    getRelationsFor,
  }
}
