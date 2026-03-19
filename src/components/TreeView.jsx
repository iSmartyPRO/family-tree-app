import { useEffect, useRef, useState, useCallback } from 'react'
import { Maximize2, Eye } from 'lucide-react'

const NODE_W = 170
const NODE_H = 74
const H_GAP = 40
const V_GAP = 90
const POSITIONS_KEY = 'rodolog_tree_positions'
const AV = 42   // avatar size
const AV_X = 8  // avatar left offset (after color bar)
const AV_Y = (NODE_H - AV) / 2  // avatar top offset (centered)
const TEXT_X = AV_X + AV + 7  // text starts after avatar

function getFullName(p) {
  return [p.lastName, p.firstName].filter(Boolean).join(' ') || p.firstName || '—'
}

function getYears(p) {
  const b = p.birthDate ? p.birthDate.split('-')[0] : null
  const d = p.deathDate ? p.deathDate.split('-')[0] : null
  if (b && d) return `${b} – ${d}`
  if (b) return `р. ${b}`
  return null
}

function getAge(p) {
  if (!p.birthDate) return null
  const birth = new Date(p.birthDate)
  const end = p.deathDate ? new Date(p.deathDate) : new Date()
  let age = end.getFullYear() - birth.getFullYear()
  const m = end.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && end.getDate() < birth.getDate())) age--
  return age >= 0 ? age : null
}

function getBirthYear(p) {
  return p?.birthDate ? parseInt(p.birthDate.split('-')[0]) : null
}

function buildLayout(people, relations) {
  const parentOf = {}
  const childrenOf = {}
  const spouseOf = {}
  const siblingOf = {}

  people.forEach(p => {
    childrenOf[p.id] = []
    parentOf[p.id] = []
    spouseOf[p.id] = []
    siblingOf[p.id] = []
  })

  relations.forEach(r => {
    if (r.type === 'parent-child') {
      childrenOf[r.from].push(r.to)
      parentOf[r.to].push(r.from)
    } else if (r.type === 'spouse') {
      spouseOf[r.from].push(r.to)
      spouseOf[r.to].push(r.from)
    } else if (r.type === 'sibling') {
      siblingOf[r.from].push(r.to)
      siblingOf[r.to].push(r.from)
    }
  })

  const personById = {}
  people.forEach(p => { personById[p.id] = p })

  // Iterative generation assignment:
  // parent-child: child >= parent+1; spouse: same level (max)
  const genMap = {}
  people.forEach(p => { genMap[p.id] = 0 })

  let changed = true
  let iters = 0
  while (changed && iters < 30) {
    changed = false
    iters++
    relations.forEach(r => {
      if (r.type === 'parent-child') {
        const need = genMap[r.from] + 1
        if (genMap[r.to] < need) { genMap[r.to] = need; changed = true }
      } else if (r.type === 'spouse') {
        const mx = Math.max(genMap[r.from], genMap[r.to])
        if (genMap[r.from] !== mx) { genMap[r.from] = mx; changed = true }
        if (genMap[r.to] !== mx) { genMap[r.to] = mx; changed = true }
      }
    })
  }

  // Isolated people (no relations): use birth year to estimate generation
  const hasRelation = new Set()
  relations.forEach(r => { hasRelation.add(r.from); hasRelation.add(r.to) })

  const isolated = people.filter(p => !hasRelation.has(p.id))
  if (isolated.length > 0) {
    const YEARS_PER_GEN = 25
    const connectedRoots = people.filter(p => hasRelation.has(p.id) && genMap[p.id] === 0)
    const refYears = [
      ...connectedRoots.map(p => getBirthYear(p)),
      ...isolated.map(p => getBirthYear(p)),
    ].filter(Boolean)
    const refYear = refYears.length > 0 ? Math.min(...refYears) : new Date().getFullYear() - 50
    isolated.forEach(p => {
      const by = getBirthYear(p)
      genMap[p.id] = by != null ? Math.max(0, Math.round((by - refYear) / YEARS_PER_GEN)) : 0
    })
  }

  // Group by generation, sort within each gen by birth year
  const byGen = {}
  people.forEach(p => {
    const g = genMap[p.id]
    if (!byGen[g]) byGen[g] = []
    byGen[g].push(p.id)
  })

  Object.keys(byGen).forEach(g => {
    byGen[g].sort((a, b) => (getBirthYear(personById[a]) ?? 9999) - (getBirthYear(personById[b]) ?? 9999))
  })

  const gens = Object.keys(byGen).map(Number).sort((a, b) => a - b)
  const positions = {}

  gens.forEach((gen, gi) => {
    const ids = byGen[gen]
    // Group spouses adjacent
    const placed = new Set()
    const orderedIds = []
    ids.forEach(id => {
      if (placed.has(id)) return
      placed.add(id)
      orderedIds.push(id)
      spouseOf[id]
        .filter(sid => ids.includes(sid) && !placed.has(sid))
        .sort((a, b) => (getBirthYear(personById[a]) ?? 9999) - (getBirthYear(personById[b]) ?? 9999))
        .forEach(sid => { placed.add(sid); orderedIds.push(sid) })
    })

    const totalW = orderedIds.length * NODE_W + (orderedIds.length - 1) * H_GAP
    const startX = -totalW / 2
    orderedIds.forEach((id, i) => {
      positions[id] = {
        x: startX + i * (NODE_W + H_GAP),
        y: gi * (NODE_H + V_GAP),
      }
    })
  })

  return { positions, childrenOf, spouseOf, siblingOf, parentOf }
}

function buildEdges(relations, positions) {
  const edges = []

  relations.forEach(r => {
    const a = positions[r.from]
    const b = positions[r.to]
    if (!a || !b) return

    let path, color, dash

    if (r.type === 'parent-child') {
      // Bottom-center of parent → top-center of child (cubic bezier)
      const ax = a.x + NODE_W / 2
      const ay = a.y + NODE_H
      const bx = b.x + NODE_W / 2
      const by = b.y
      const my = (ay + by) / 2
      path = `M${ax},${ay} C${ax},${my} ${bx},${my} ${bx},${by}`
      color = '#6c8fff'
      dash = ''
    } else if (r.type === 'spouse') {
      // Connect the facing horizontal edges (avoids crossing through cards)
      const ay = a.y + NODE_H / 2
      const by = b.y + NODE_H / 2
      if (a.x < b.x) {
        // a is left: a's right edge → b's left edge
        path = `M${a.x + NODE_W},${ay} L${b.x},${by}`
      } else {
        // a is right: a's left edge → b's right edge
        path = `M${a.x},${ay} L${b.x + NODE_W},${by}`
      }
      color = '#f472b6'
      dash = '6,4'
    } else {
      // sibling: rounded U-shape below both cards
      const ax = a.x + NODE_W / 2
      const bx = b.x + NODE_W / 2
      const dropY = Math.max(a.y + NODE_H, b.y + NODE_H) + 22
      const r = 10 // corner radius
      const dir = bx > ax ? 1 : -1 // direction a→b
      path = [
        `M${ax},${a.y + NODE_H}`,
        `L${ax},${dropY - r}`,
        `Q${ax},${dropY} ${ax + dir * r},${dropY}`,
        `L${bx - dir * r},${dropY}`,
        `Q${bx},${dropY} ${bx},${dropY - r}`,
        `L${bx},${b.y + NODE_H}`,
      ].join(' ')
      color = '#34d399'
      dash = '6,3'
    }

    edges.push({ id: r.id, path, color, dash, type: r.type })
  })
  return edges
}

function computeBounds(positions, people) {
  if (people.length === 0) return { minX: 0, minY: 0, maxX: 600, maxY: 400 }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  people.forEach(p => {
    const pos = positions[p.id]
    if (!pos) return
    minX = Math.min(minX, pos.x)
    minY = Math.min(minY, pos.y)
    maxX = Math.max(maxX, pos.x + NODE_W)
    maxY = Math.max(maxY, pos.y + NODE_H)
  })
  return { minX, minY, maxX, maxY }
}

export default function TreeView({ people, relations, onSelectPerson, selectedId, onFullscreen, onFullscreenView, readonly = false }) {
  const containerRef = useRef()
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 })
  const transformRef = useRef({ x: 0, y: 0, scale: 1 })
  const dragging = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })
  const draggingCard = useRef(null) // { id, startX, startY, origX, origY, moved }

  const [customPositions, setCustomPositions] = useState(() => {
    try {
      const s = localStorage.getItem(POSITIONS_KEY)
      return s ? JSON.parse(s) : {}
    } catch { return {} }
  })

  const { positions: layoutPositions } = buildLayout(people, relations)

  // Merge layout positions with user-dragged overrides
  const positions = { ...layoutPositions }
  Object.keys(customPositions).forEach(id => {
    if (positions[id] !== undefined) positions[id] = customPositions[id]
  })

  const edges = buildEdges(relations, positions)
  const { minX, minY, maxX, maxY } = computeBounds(positions, people)
  const svgW = Math.max(maxX - minX + 80, 200)
  const svgH = Math.max(maxY - minY + 80, 200)
  const PAD = 40

  // Keep transformRef in sync for use inside callbacks
  useEffect(() => { transformRef.current = transform }, [transform])

  // Center tree when number of people changes
  useEffect(() => {
    if (!containerRef.current) return
    const cw = containerRef.current.clientWidth
    const ch = containerRef.current.clientHeight
    setTransform({
      x: cw / 2 - (svgW / 2 + minX - PAD),
      y: ch / 2 - (svgH / 2 + minY - PAD),
      scale: 1,
    })
  }, [people.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setTransform(t => ({ ...t, scale: Math.min(3, Math.max(0.2, t.scale * delta)) }))
  }, [])

  // Canvas pan starts (only if not clicking a card)
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return
    dragging.current = true
    lastPos.current = { x: e.clientX, y: e.clientY }
  }, [])

  // Card drag starts — stops event so canvas pan doesn't trigger
  const handleCardMouseDown = useCallback((e, personId, pos) => {
    e.stopPropagation()
    if (e.button !== 0) return
    draggingCard.current = {
      id: personId,
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
      moved: false,
    }
  }, [])

  const handleMouseMove = useCallback((e) => {
    if (draggingCard.current) {
      const { id, startX, startY, origX, origY } = draggingCard.current
      const dx = (e.clientX - startX) / transformRef.current.scale
      const dy = (e.clientY - startY) / transformRef.current.scale
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) draggingCard.current.moved = true
      if (draggingCard.current.moved) {
        setCustomPositions(prev => ({ ...prev, [id]: { x: origX + dx, y: origY + dy } }))
      }
      return
    }
    if (!dragging.current) return
    const dx = e.clientX - lastPos.current.x
    const dy = e.clientY - lastPos.current.y
    lastPos.current = { x: e.clientX, y: e.clientY }
    setTransform(t => ({ ...t, x: t.x + dx, y: t.y + dy }))
  }, [])

  const handleMouseUp = useCallback(() => {
    if (draggingCard.current) {
      const { id, moved } = draggingCard.current
      draggingCard.current = null
      if (!moved) {
        // Short click — select person
        onSelectPerson(id)
      } else {
        // Save dragged positions to localStorage
        setCustomPositions(prev => {
          localStorage.setItem(POSITIONS_KEY, JSON.stringify(prev))
          return prev
        })
      }
      return
    }
    dragging.current = false
  }, [onSelectPerson])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  if (people.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🌳</div>
          <div style={{ fontSize: 16, marginBottom: 4 }}>Дерево пусто</div>
          <div style={{ fontSize: 13 }}>Добавьте первого человека</div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      style={{ flex: 1, overflow: 'hidden', cursor: 'grab', background: 'var(--bg)', position: 'relative' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Legend */}
      <div style={{ position: 'absolute', bottom: 16, left: 16, zIndex: 10, display: 'flex', gap: 16, background: 'rgba(26,29,39,0.9)', padding: '8px 14px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <svg width="24" height="8"><line x1="0" y1="4" x2="24" y2="4" stroke="#6c8fff" strokeWidth="2" /></svg> Родитель-ребёнок
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <svg width="24" height="8"><line x1="0" y1="4" x2="24" y2="4" stroke="#f472b6" strokeWidth="2" strokeDasharray="6,4" /></svg> Супруги
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <svg width="24" height="8"><line x1="0" y1="4" x2="24" y2="4" stroke="#34d399" strokeWidth="2" strokeDasharray="3,3" /></svg> Братья/Сёстры
        </span>
      </div>
      {/* Zoom controls */}
      <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {onFullscreenView && (
          <button className="btn btn-secondary btn-icon" onClick={onFullscreenView} title="Просмотр (только чтение)">
            <Eye size={14} />
          </button>
        )}
        {onFullscreen && (
          <button className="btn btn-secondary btn-icon" onClick={onFullscreen} title="Полноэкранный режим">
            <Maximize2 size={14} />
          </button>
        )}
        <button className="btn btn-secondary btn-icon" onClick={() => setTransform(t => ({ ...t, scale: Math.min(3, t.scale * 1.2) }))}>+</button>
        <button className="btn btn-secondary btn-icon" onClick={() => setTransform(t => ({ ...t, scale: Math.max(0.2, t.scale * 0.8) }))}>−</button>
      </div>

      <svg
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', userSelect: 'none' }}
      >
        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.scale})`}>
          {/* Edges — rendered before nodes so lines appear behind cards */}
          <g>
            {edges.map(e => (
              <path key={e.id} d={e.path} fill="none"
                stroke={e.color} strokeWidth="2" strokeDasharray={e.dash}
                strokeOpacity="0.7"
              />
            ))}
          </g>
          {/* Clip paths for photos */}
          <defs>
            {people.map(person => person.photo ? (
              <clipPath key={`clip-${person.id}`} id={`clip-${person.id}`}>
                <circle cx={AV_X + AV / 2} cy={AV_Y + AV / 2} r={AV / 2} />
              </clipPath>
            ) : null)}
          </defs>

          {/* Nodes */}
          <g>
            {people.map(person => {
              const pos = positions[person.id]
              if (!pos) return null
              const isSelected = selectedId === person.id
              const isFemale = person.gender === 'female'
              const isDead = !!person.deathDate
              const accentColor = isFemale ? '#f472b6' : '#60a5fa'
              const maxChars = 13
              const name = getFullName(person)
              const displayName = name.length > maxChars ? name.slice(0, maxChars - 1) + '…' : name
              return (
                <g key={person.id}
                  transform={`translate(${pos.x},${pos.y})`}
                  style={{ cursor: readonly ? 'pointer' : 'grab' }}
                  onMouseDown={!readonly ? e => handleCardMouseDown(e, person.id, pos) : undefined}
                  onClick={readonly ? e => { e.stopPropagation(); onSelectPerson(person.id) } : undefined}
                >
                  {/* Card background */}
                  <rect
                    width={NODE_W} height={NODE_H}
                    rx="10"
                    fill={isSelected ? 'rgba(108,143,255,0.2)' : isDead ? 'rgba(26,29,39,0.9)' : 'rgba(34,38,58,0.95)'}
                    stroke={isSelected ? '#6c8fff' : accentColor}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    strokeOpacity={isSelected ? 1 : 0.5}
                    style={{ filter: isSelected ? 'drop-shadow(0 0 8px rgba(108,143,255,0.5))' : 'none' }}
                  />
                  {/* Left accent bar */}
                  <rect x="0" y="0" width="4" height={NODE_H} rx="2" fill={accentColor} opacity={isDead ? 0.4 : 0.9} />

                  {/* Avatar — photo or gender icon */}
                  {person.photo ? (
                    <>
                      <image
                        href={person.photo}
                        x={AV_X} y={AV_Y}
                        width={AV} height={AV}
                        clipPath={`url(#clip-${person.id})`}
                        preserveAspectRatio="xMidYMid slice"
                      />
                      <circle cx={AV_X + AV / 2} cy={AV_Y + AV / 2} r={AV / 2}
                        fill="none" stroke={accentColor} strokeWidth="1.5" opacity="0.5" />
                    </>
                  ) : (
                    <g>
                      <circle cx={AV_X + AV / 2} cy={AV_Y + AV / 2} r={AV / 2} fill={accentColor} opacity={0.12} />
                      <circle cx={AV_X + AV / 2} cy={AV_Y + AV * 0.38} r={AV * 0.22} fill={accentColor} opacity={0.55} />
                      <path
                        d={`M${AV_X + AV * 0.1},${AV_Y + AV} Q${AV_X + AV * 0.1},${AV_Y + AV * 0.65} ${AV_X + AV / 2},${AV_Y + AV * 0.62} Q${AV_X + AV * 0.9},${AV_Y + AV * 0.65} ${AV_X + AV * 0.9},${AV_Y + AV}`}
                        fill={accentColor} opacity={0.45}
                      />
                      <circle cx={AV_X + AV / 2} cy={AV_Y + AV / 2} r={AV / 2}
                        fill="none" stroke={accentColor} strokeWidth="1" opacity={0.25} />
                    </g>
                  )}

                  {/* Text */}
                  <text x={TEXT_X} y="22" fill={isDead ? '#8892a4' : '#e2e8f0'} fontSize="13" fontWeight="600"
                    style={{ fontFamily: 'Segoe UI, system-ui, sans-serif' }}>
                    {displayName}
                  </text>
                  {(getYears(person) || getAge(person) != null) && (
                    <text x={TEXT_X} y="41" fill="#8892a4" fontSize="11"
                      style={{ fontFamily: 'Segoe UI, system-ui, sans-serif' }}>
                      {getYears(person)}
                      {getAge(person) != null ? (getYears(person) ? ` · ${getAge(person)} л.` : `${getAge(person)} л.`) : ''}
                    </text>
                  )}
                  <text x={TEXT_X} y="59" fill={accentColor} fontSize="10" opacity="0.8"
                    style={{ fontFamily: 'Segoe UI, system-ui, sans-serif' }}>
                    {person.gender === 'male' ? 'Мужской' : person.gender === 'female' ? 'Женский' : 'Другой'}
                    {isDead ? ' · †' : ''}
                  </text>
                </g>
              )
            })}
          </g>
        </g>
      </svg>
    </div>
  )
}
