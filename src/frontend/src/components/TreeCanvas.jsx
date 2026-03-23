import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

export const NODE_W = 172
export const NODE_H = 128

const H_GAP = 60
const V_GAP = 100

const LS_SIBLING_DEPTH = 'ftree-line-sibling-depth'
const LS_PARENT_BEND = 'ftree-line-parent-bend'

export const DEFAULT_LINE_SETTINGS = { siblingLineDepth: 56, parentLineBend: 52 }

function clampSiblingRouteOffset(v) {
  const n = typeof v === 'number' ? v : parseInt(v, 10)
  if (Number.isNaN(n)) return DEFAULT_LINE_SETTINGS.siblingLineDepth
  // Offset относительно "базовой высоты" маршрута.
  // Чем больше - тем ниже линия (под карточками).
  return Math.min(240, Math.max(8, n))
}

function clampSiblingDepth(v) {
  const n = typeof v === 'number' ? v : parseInt(v, 10)
  if (Number.isNaN(n)) return DEFAULT_LINE_SETTINGS.siblingLineDepth
  return Math.min(120, Math.max(20, n))
}

function clampParentBend(v) {
  const n = typeof v === 'number' ? v : parseInt(v, 10)
  if (Number.isNaN(n)) return DEFAULT_LINE_SETTINGS.parentLineBend
  return Math.min(90, Math.max(25, n))
}

function readLocalLineSettings() {
  let s = DEFAULT_LINE_SETTINGS.siblingLineDepth
  let p = DEFAULT_LINE_SETTINGS.parentLineBend
  try {
    const vs = parseInt(localStorage.getItem(LS_SIBLING_DEPTH), 10)
    if (!Number.isNaN(vs)) s = clampSiblingDepth(vs)
    const vp = parseInt(localStorage.getItem(LS_PARENT_BEND), 10)
    if (!Number.isNaN(vp)) p = clampParentBend(vp)
  } catch (_) {}
  return { siblingLineDepth: s, parentLineBend: p }
}

export function autoLayout(nodes, relations) {
  if (!nodes.length) return nodes

  const nodeMap = {}
  nodes.forEach(n => { nodeMap[n.id] = { ...n } })

  const childrenOf = {}
  const parentsOf = {}
  nodes.forEach(n => {
    childrenOf[n.id] = []
    parentsOf[n.id] = []
  })
  relations.forEach(r => {
    if (r.type === 'parent-child') {
      if (childrenOf[r.from]) childrenOf[r.from].push(r.to)
      if (parentsOf[r.to]) parentsOf[r.to].push(r.from)
    }
  })

  const roots = nodes.filter(n => parentsOf[n.id].length === 0).map(n => n.id)
  if (roots.length === 0) roots.push(nodes[0].id)

  const positioned = {}
  const levelNodes = []

  const queue = roots.map(id => ({ id, level: 0 }))
  const visited = new Set()
  while (queue.length) {
    const { id, level } = queue.shift()
    if (visited.has(id)) continue
    visited.add(id)
    if (!levelNodes[level]) levelNodes[level] = []
    levelNodes[level].push(id)
    ;(childrenOf[id] || []).forEach(cid => {
      if (!visited.has(cid)) queue.push({ id: cid, level: level + 1 })
    })
  }

  nodes.forEach(n => {
    if (!visited.has(n.id)) {
      const level = levelNodes.length
      if (!levelNodes[level]) levelNodes[level] = []
      levelNodes[level].push(n.id)
    }
  })

  const result = { ...nodeMap }
  levelNodes.forEach((ids, level) => {
    const totalWidth = ids.length * NODE_W + (ids.length - 1) * H_GAP
    ids.forEach((id, i) => {
      result[id] = {
        ...result[id],
        x: i * (NODE_W + H_GAP) - totalWidth / 2 + NODE_W / 2 + 400,
        y: level * (NODE_H + V_GAP) + 60
      }
    })
  })

  return nodes.map(n => result[n.id] || n)
}

export function isDeceased(node) {
  if (!node) return false
  if (node.isAlive === true) return false
  if (node.isAlive === false) return true
  return Boolean(node.deathDate)
}

function parseYmd(s) {
  if (!s || typeof s !== 'string') return null
  const [y, m, d] = s.split('-').map(Number)
  if (!y) return null
  return new Date(y, (m || 1) - 1, d || 1)
}

export function computeAgeYears(birthStr, endStr) {
  const b = parseYmd(birthStr)
  const e = endStr ? parseYmd(endStr) : new Date()
  if (!b || !e || e < b) return null
  let a = e.getFullYear() - b.getFullYear()
  const mb = b.getMonth()
  const md = b.getDate()
  const em = e.getMonth()
  const ed = e.getDate()
  if (em < mb || (em === mb && ed < md)) a--
  return a >= 0 ? a : null
}

function getGenderColor(gender, isDark) {
  if (gender === 'male') return isDark ? '#60a5fa' : '#3b82f6'
  if (gender === 'female') return isDark ? '#f472b6' : '#ec4899'
  return isDark ? '#9ca3af' : '#9ca3af'
}

function siblingBaseMaxBottom(fromNode, toNode) {
  // Базовая высота линии: просто "ниже" обоих карточек по Y.
  // Без обхода/огибания препятствий (доп. обход убираем по требованию).
  return Math.max(fromNode.y + NODE_H, toNode.y + NODE_H)
}

function getRelationPath(fromNode, toNode, rel, allNodes, siblingDepthPx, parentBendPct) {
  if (!fromNode || !toNode) return ''
  const type = rel.type
  const fx = fromNode.x + NODE_W / 2
  const tx = toNode.x + NODE_W / 2

  if (type === 'parent-child') {
    const startY = fromNode.y + NODE_H
    const endY = toNode.y
    const span = endY - startY
    const t = Math.min(0.85, Math.max(0.15, parentBendPct / 100))
    const midY = startY + span * t
    return `M ${fx} ${startY} C ${fx} ${midY}, ${tx} ${midY}, ${tx} ${endY}`
  }

  if (type === 'spouse') {
    const fy = fromNode.y + NODE_H / 2
    const ty = toNode.y + NODE_H / 2
    return `M ${fromNode.x + NODE_W} ${fy} L ${toNode.x} ${ty}`
  }

  const y1b = fromNode.y + NODE_H
  const y2b = toNode.y + NODE_H
  const x1 = fromNode.x + NODE_W / 2
  const x2 = toNode.x + NODE_W / 2

  const baseMax = siblingBaseMaxBottom(fromNode, toNode)
  const offsetPx = Number.isFinite(rel.siblingRouteOffsetPx)
    ? clampSiblingRouteOffset(rel.siblingRouteOffsetPx)
    : clampSiblingRouteOffset(siblingDepthPx)
  const routeY = baseMax + offsetPx

  const styleKey = rel.siblingLineStyle || 'rounded'
  if (styleKey === 'elbow') {
    return `M ${x1} ${y1b} L ${x1} ${routeY} L ${x2} ${routeY} L ${x2} ${y2b}`
  }

  const xMid = (x1 + x2) / 2
  if (styleKey === 'rounded') {
    return `M ${x1} ${y1b} Q ${x1} ${routeY} ${xMid} ${routeY} Q ${x2} ${routeY} ${x2} ${y2b}`
  }

  // 'flex' — максимально плавно, как у родитель→ребёнок (но с маршрутом под карточками).
  const t = Math.min(0.85, Math.max(0.15, parentBendPct / 100))
  const c1y = y1b + (routeY - y1b) * t
  const c2y = y2b + (routeY - y2b) * t
  return `M ${x1} ${y1b} C ${x1} ${c1y}, ${xMid} ${routeY}, ${xMid} ${routeY} C ${xMid} ${routeY}, ${x2} ${c2y}, ${x2} ${y2b}`
}

function digitsOnly(s) {
  return String(s || '').replace(/\D/g, '')
}

function buildContactItems(contacts) {
  const c = contacts || {}
  const items = []

  const phone = (c.phone || '').trim()
  if (phone) items.push({ key: 'phone', href: `tel:${phone.replace(/\s/g, '')}`, abbr: '☎', title: phone })

  const email = (c.email || '').trim()
  if (email) items.push({ key: 'email', href: `mailto:${email}`, abbr: '@', title: email })

  const wa = (c.whatsapp || '').trim()
  const waDigits = digitsOnly(wa || phone)
  if (waDigits) items.push({ key: 'wa', href: `https://wa.me/${waDigits}`, abbr: 'WA', title: 'WhatsApp' })

  let tg = (c.telegram || '').trim().replace(/^@/, '')
  if (tg) {
    if (!/^https?:/i.test(tg)) tg = `https://t.me/${tg}`
    items.push({ key: 'tg', href: tg, abbr: 'TG', title: 'Telegram' })
  }

  let ig = (c.instagram || '').trim().replace(/^@/, '')
  if (ig) {
    if (!/^https?:/i.test(ig)) ig = `https://instagram.com/${ig}`
    items.push({ key: 'ig', href: ig, abbr: 'IG', title: 'Instagram' })
  }

  let fb = (c.facebook || '').trim()
  if (fb) {
    if (!/^https?:/i.test(fb)) fb = `https://facebook.com/${fb}`
    items.push({ key: 'fb', href: fb, abbr: 'f', title: 'Facebook' })
  }

  let li = (c.linkedin || '').trim()
  if (li) {
    if (!/^https?:/i.test(li)) li = `https://linkedin.com/in/${li}`
    items.push({ key: 'li', href: li, abbr: 'in', title: 'LinkedIn' })
  }

  let vk = (c.vk || '').trim()
  if (vk) {
    if (!/^https?:/i.test(vk)) vk = `https://vk.com/${vk}`
    items.push({ key: 'vk', href: vk, abbr: 'VK', title: 'VK' })
  }

  let ok = (c.ok || '').trim()
  if (ok) {
    if (!/^https?:/i.test(ok)) ok = `https://ok.ru/${ok}`
    items.push({ key: 'ok', href: ok, abbr: 'OK', title: 'Одноклассники' })
  }

  return items.slice(0, 8)
}

export default function TreeCanvas({
  nodes: propNodes,
  relations,
  selectedIds,
  selectedId,
  onSelectNodes,
  onSelectNode,
  onUpdateNodesPositions,
  onUpdateNodePosition,
  onEditNode,
  onUpdateRelation,
  onEditRelation,
  onViewportCenterChange,
  readonly,
  /** Управляемые значения из MongoDB (редактор дерева) */
  lineSettings,
  /** (patch) => void — сохранение в дерево через API */
  onLineSettingsChange,
  /** Для публичного просмотра: подтянуть значения из документа дерева */
  seedLineSettings
}) {
  const { t } = useTranslation()
  const { isDark } = useTheme()

  const lineSettingsControlled = typeof onLineSettingsChange === 'function'

  const [localLines, setLocalLines] = useState(readLocalLineSettings)

  useEffect(() => {
    if (lineSettingsControlled || !seedLineSettings) return
    setLocalLines({
      siblingLineDepth: clampSiblingDepth(seedLineSettings.siblingLineDepth),
      parentLineBend: clampParentBend(seedLineSettings.parentLineBend)
    })
  }, [
    lineSettingsControlled,
    seedLineSettings?.siblingLineDepth,
    seedLineSettings?.parentLineBend
  ])

  const siblingDepth = lineSettingsControlled
    ? clampSiblingDepth(lineSettings?.siblingLineDepth)
    : localLines.siblingLineDepth
  const parentBend = lineSettingsControlled
    ? clampParentBend(lineSettings?.parentLineBend)
    : localLines.parentLineBend

  useEffect(() => {
    if (lineSettingsControlled) return
    try {
      localStorage.setItem(LS_SIBLING_DEPTH, String(siblingDepth))
      localStorage.setItem(LS_PARENT_BEND, String(parentBend))
    } catch (_) {}
  }, [siblingDepth, parentBend, lineSettingsControlled])

  const setSiblingDepth = v => {
    const cv = clampSiblingDepth(v)
    if (lineSettingsControlled) onLineSettingsChange({ siblingLineDepth: cv })
    else setLocalLines(prev => ({ ...prev, siblingLineDepth: cv }))
  }

  const setParentBend = v => {
    const cv = clampParentBend(v)
    if (lineSettingsControlled) onLineSettingsChange({ parentLineBend: cv })
    else setLocalLines(prev => ({ ...prev, parentBend: cv }))
  }

  const lineColors = useMemo(
    () =>
      isDark
        ? { parent: '#60a5fa', sibling: '#4ade80', spouse: '#fbbf24' }
        : { parent: '#3b82f6', sibling: '#16a34a', spouse: '#f59e0b' },
    [isDark]
  )

  const svgRef = useRef()
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState(null)
  const [isBoxSelecting, setIsBoxSelecting] = useState(false)
  const [selectionBox, setSelectionBox] = useState(null) // svg-local coords
  const [draggingIds, setDraggingIds] = useState(null) // array of node ids
  const [draggingSiblingRel, setDraggingSiblingRel] = useState(null)
  const dragOffsetsRef = useRef({}) // { [id]: { dx, dy } } in world coords
  const suppressNodeClickRef = useRef(false)
  const dragStartWorldRef = useRef(null)
  const dragMovedRef = useRef(false)
  const [nodes, setNodes] = useState([])

  useEffect(() => {
    const needsLayout = propNodes.some(n => n.x == null || n.y == null)
    if (needsLayout) {
      setNodes(autoLayout(propNodes, relations))
    } else {
      setNodes(propNodes)
    }
  }, [propNodes, relations])

  const svgToWorld = useCallback(
    (svgX, svgY) => ({
      x: (svgX - pan.x) / zoom,
      y: (svgY - pan.y) / zoom
    }),
    [pan, zoom]
  )

  useEffect(() => {
    if (typeof onViewportCenterChange !== 'function' || !svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const centerWorld = svgToWorld(rect.width / 2, rect.height / 2)
    onViewportCenterChange(centerWorld)
  }, [pan, zoom, svgToWorld, onViewportCenterChange])

  const handleWheel = e => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoom(z => Math.min(3, Math.max(0.2, z * delta)))
  }

  const handleSvgMouseDown = e => {
    if (readonly) return
    if (!(e.target === svgRef.current || e.target.classList?.contains('pan-target'))) return
    if (draggingSiblingRel || (draggingIds && draggingIds.length > 0)) return

    if (e.button === 2) {
      // Panning: правой кнопкой мыши.
      setIsPanning(true)
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
      setIsBoxSelecting(false)
      setSelectionBox(null)
      return
    }

    if (e.button === 0) {
      // Box select: левой кнопкой мыши по пустому холсту.
      const rect = svgRef.current.getBoundingClientRect()
      const svgX = e.clientX - rect.left
      const svgY = e.clientY - rect.top
      setIsBoxSelecting(true)
      setSelectionBox({ x0: svgX, y0: svgY, x1: svgX, y1: svgY })
      setIsPanning(false)
      setPanStart(null)
    }
  }

  const handleMouseMove = e => {
    if (isBoxSelecting && selectionBox) {
      const rect = svgRef.current.getBoundingClientRect()
      const svgX = e.clientX - rect.left
      const svgY = e.clientY - rect.top
      setSelectionBox(prev => (prev ? { ...prev, x1: svgX, y1: svgY } : prev))
      return
    }
    if (isPanning && panStart) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y })
    }
    if (draggingSiblingRel && !readonly && typeof onUpdateRelation === 'function') {
      const rect = svgRef.current.getBoundingClientRect()
      const svgX = e.clientX - rect.left
      const svgY = e.clientY - rect.top
      const world = svgToWorld(svgX, svgY)
      const desiredRouteY = world.y - draggingSiblingRel.dragOffsetY
      const newOffset = clampSiblingRouteOffset(desiredRouteY - draggingSiblingRel.baseMaxBottom)
      setDraggingSiblingRel(prev => (prev ? { ...prev, lastOffset: newOffset } : prev))
      onUpdateRelation(draggingSiblingRel.relId, { siblingRouteOffsetPx: newOffset }, { recordHistory: false })
    } else if (draggingIds && draggingIds.length > 0 && !readonly) {
      const rect = svgRef.current.getBoundingClientRect()
      const svgX = e.clientX - rect.left
      const svgY = e.clientY - rect.top
      const world = svgToWorld(svgX, svgY)
      const start = dragStartWorldRef.current
      if (start) {
        const dist = Math.hypot(world.x - start.x, world.y - start.y)
        if (dist > 2) dragMovedRef.current = true
      }
      setNodes(prev =>
        prev.map(n => {
          if (!draggingIds.includes(n.id)) return n
          const off = dragOffsetsRef.current[n.id]
          if (!off) return n
          return { ...n, x: world.x - off.dx, y: world.y - off.dy }
        })
      )
    }
  }

  const handleMouseUp = (e) => {
    // Finish box selection.
    if (isBoxSelecting && selectionBox && !readonly && typeof onSelectNodes === 'function') {
      const xMin = Math.min(selectionBox.x0, selectionBox.x1)
      const xMax = Math.max(selectionBox.x0, selectionBox.x1)
      const yMin = Math.min(selectionBox.y0, selectionBox.y1)
      const yMax = Math.max(selectionBox.y0, selectionBox.y1)

      const picked = nodes
        .filter(n => {
          const left = pan.x + n.x * zoom
          const top = pan.y + n.y * zoom
          const right = left + NODE_W * zoom
          const bottom = top + NODE_H * zoom
          return left < xMax && right > xMin && top < yMax && bottom > yMin
        })
        .map(n => n.id)

      if (e?.shiftKey && Array.isArray(selectedIds)) {
        const uniq = Array.from(new Set([...(selectedIds || []), ...picked]))
        onSelectNodes(uniq)
      } else if (e?.shiftKey && selectedId) {
        const uniq = Array.from(new Set([selectedId, ...picked]))
        onSelectNodes(uniq)
      } else {
        onSelectNodes(picked)
      }
    }

    // Finish dragging (mass move).
    if (draggingIds && draggingIds.length > 0 && !readonly && dragMovedRef.current) {
      const updates = draggingIds
        .map(id => {
          const n = nodes.find(nn => nn.id === id)
          return n ? { id, x: n.x, y: n.y } : null
        })
        .filter(Boolean)

      if (typeof onUpdateNodesPositions === 'function') {
        onUpdateNodesPositions(updates)
      } else if (typeof onUpdateNodePosition === 'function') {
        updates.forEach(u => onUpdateNodePosition(u.id, u.x, u.y))
      }
    }

    // Finalize sibling relation drag with one undo checkpoint.
    if (draggingSiblingRel && !readonly && typeof onUpdateRelation === 'function' && Number.isFinite(draggingSiblingRel.lastOffset)) {
      onUpdateRelation(
        draggingSiblingRel.relId,
        { siblingRouteOffsetPx: draggingSiblingRel.lastOffset },
        { recordHistory: true }
      )
    }

    setIsPanning(false)
    setPanStart(null)
    setDraggingIds(null)
    setDraggingSiblingRel(null)
    setIsBoxSelecting(false)
    setSelectionBox(null)
    dragOffsetsRef.current = {}
    dragStartWorldRef.current = null
    dragMovedRef.current = false
  }

  const handleNodeMouseDown = (e, node) => {
    if (readonly) return
    if (e.button !== 0) return
    e.stopPropagation()

    setDraggingSiblingRel(null)
    setIsBoxSelecting(false)
    setSelectionBox(null)

    const rect = svgRef.current.getBoundingClientRect()
    const svgX = e.clientX - rect.left
    const svgY = e.clientY - rect.top
    const world = svgToWorld(svgX, svgY)

    const currentSelected = Array.isArray(selectedIds)
      ? selectedIds
      : selectedId
        ? [selectedId]
        : []

    let nextSelected = currentSelected
    if (e.shiftKey) {
      const set = new Set(currentSelected)
      if (set.has(node.id)) set.delete(node.id)
      else set.add(node.id)
      nextSelected = Array.from(set)
    } else {
      nextSelected = currentSelected.includes(node.id) ? currentSelected : [node.id]
      if (!currentSelected.includes(node.id)) {
        if (typeof onSelectNodes === 'function') onSelectNodes([node.id])
        else if (typeof onSelectNode === 'function') onSelectNode(node.id)
      }
    }

    if (e.shiftKey && typeof onSelectNodes === 'function') {
      onSelectNodes(nextSelected)
    }

    suppressNodeClickRef.current = true
    setDraggingIds(nextSelected)
    dragStartWorldRef.current = { x: world.x, y: world.y }
    dragMovedRef.current = false

    const offsets = {}
    nextSelected.forEach(id => {
      const n = nodes.find(nn => nn.id === id)
      if (!n) return
      offsets[id] = { dx: world.x - n.x, dy: world.y - n.y }
    })
    dragOffsetsRef.current = offsets
  }

  const handleNodeClick = (e, nodeId) => {
    if (suppressNodeClickRef.current) {
      suppressNodeClickRef.current = false
      return
    }
    e.stopPropagation()
    const currentSelected = Array.isArray(selectedIds)
      ? selectedIds
      : selectedId
        ? [selectedId]
        : []

    if (typeof onSelectNodes === 'function') {
      if (e.shiftKey) {
        const set = new Set(currentSelected)
        if (set.has(nodeId)) set.delete(nodeId)
        else set.add(nodeId)
        onSelectNodes(Array.from(set))
      } else {
        onSelectNodes([nodeId])
      }
    } else if (typeof onSelectNode === 'function') {
      onSelectNode(nodeId)
    }
  }

  const fitToScreen = () => {
    if (!nodes.length || !svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const xs = nodes.map(n => n.x)
    const ys = nodes.map(n => n.y)
    const minX = Math.min(...xs)
    const minY = Math.min(...ys)
    const maxX = Math.max(...xs) + NODE_W
    const maxY = Math.max(...ys) + NODE_H
    const contentW = maxX - minX
    const contentH = maxY - minY
    const scaleX = rect.width / (contentW + 80)
    const scaleY = rect.height / (contentH + 80)
    const newZoom = Math.min(scaleX, scaleY, 1.5)
    const newPanX = (rect.width - contentW * newZoom) / 2 - minX * newZoom
    const newPanY = (rect.height - contentH * newZoom) / 2 - minY * newZoom
    setZoom(newZoom)
    setPan({ x: newPanX, y: newPanY })
  }

  const nodeMap = {}
  nodes.forEach(n => {
    nodeMap[n.id] = n
  })

  const canvasBg = isDark ? '#0f1117' : '#f0f4f8'
  const dotFill = isDark ? '#374151' : '#d1d5db'

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: canvasBg,
        overflow: 'hidden'
      }}
    >
      <div style={{ position: 'absolute', bottom: 20, right: 20, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setZoom(z => Math.min(3, z * 1.2))} title={t('tree.zoom_in')}>
          <ZoomIn size={16} />
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setZoom(z => Math.max(0.2, z / 1.2))} title={t('tree.zoom_out')}>
          <ZoomOut size={16} />
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={fitToScreen} title={t('tree.fit')}>
          <Maximize2 size={16} />
        </button>
      </div>

      {isBoxSelecting && selectionBox && (
        <div
          style={{
            position: 'absolute',
            left: Math.min(selectionBox.x0, selectionBox.x1),
            top: Math.min(selectionBox.y0, selectionBox.y1),
            width: Math.abs(selectionBox.x1 - selectionBox.x0),
            height: Math.abs(selectionBox.y1 - selectionBox.y0),
            border: '2px solid rgba(79, 110, 247, 0.95)',
            background: 'rgba(79, 110, 247, 0.12)',
            zIndex: 12,
            pointerEvents: 'none'
          }}
        />
      )}

      <details className="tree-legend-panel" open>
        <summary>{t('tree.legend_title')}</summary>
        <div className="tree-legend-body">
          <div className="tree-legend-row">
            <span className="tree-legend-sample" style={{ borderTopColor: lineColors.parent }} />
            <span>{t('tree.legend_parent_child')}</span>
          </div>
          <div className="tree-legend-row">
            <span className="tree-legend-sample dashed" style={{ borderTopColor: lineColors.sibling }} />
            <span>{t('tree.legend_sibling')}</span>
          </div>
          <div className="tree-legend-row">
            <span className="tree-legend-sample" style={{ borderTopColor: lineColors.spouse }} />
            <span>{t('tree.legend_spouse')}</span>
          </div>
        </div>
      </details>

      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        onWheel={handleWheel}
        onMouseDown={handleSvgMouseDown}
        onContextMenu={(e) => e.preventDefault()}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isPanning ? 'grabbing' : isBoxSelecting ? 'crosshair' : 'grab', userSelect: 'none' }}
      >
        <defs>
          <marker
            id="arrowParent"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={lineColors.parent} />
          </marker>
        </defs>

        <pattern id="treeDots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill={dotFill} />
        </pattern>
        <rect className="pan-target" width="100%" height="100%" fill="url(#treeDots)" />

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {relations.map(rel => {
            const fromNode = nodeMap[rel.from]
            const toNode = nodeMap[rel.to]
            if (!fromNode || !toNode) return null
            const path = getRelationPath(fromNode, toNode, rel, nodes, siblingDepth, parentBend)
            const isParent = rel.type === 'parent-child'
            const isSibling = rel.type === 'sibling'
            const isSpouse = rel.type === 'spouse'
            const stroke = isParent ? lineColors.parent : isSibling ? lineColors.sibling : lineColors.spouse
            const isSiblingDragging = isSibling && draggingSiblingRel?.relId === rel.id
            return (
              <path
                key={rel.id}
                d={path}
                fill="none"
                stroke={stroke}
                strokeWidth={isSpouse ? 2.5 : isSiblingDragging ? 4 : 2}
                strokeDasharray={isSibling ? '7 5' : isSpouse ? '6 3' : 'none'}
                markerEnd={isParent ? 'url(#arrowParent)' : undefined}
                onDoubleClick={(e) => {
                  if (readonly) return
                  if (typeof onEditRelation !== 'function') return
                  e.stopPropagation()
                  setDraggingSiblingRel(null)
                  setDraggingIds(null)
                  onEditRelation(rel)
                }}
                onMouseDown={
                  isSibling && !readonly && typeof onUpdateRelation === 'function'
                    ? (e) => {
                        e.stopPropagation()
                        setDraggingIds(null)
                        const rect = svgRef.current.getBoundingClientRect()
                        const svgX = e.clientX - rect.left
                        const svgY = e.clientY - rect.top
                        const world = svgToWorld(svgX, svgY)

                        const baseMaxBottom = siblingBaseMaxBottom(fromNode, toNode)
                        const offsetStart = Number.isFinite(rel.siblingRouteOffsetPx)
                          ? clampSiblingRouteOffset(rel.siblingRouteOffsetPx)
                          : clampSiblingRouteOffset(siblingDepth)
                        const routeYStart = baseMaxBottom + offsetStart
                        const dragOffsetY = world.y - routeYStart

                        setDraggingSiblingRel({
                          relId: rel.id,
                          baseMaxBottom,
                          dragOffsetY
                        })
                      }
                    : undefined
                }
                style={isSibling && !readonly ? { cursor: 'ns-resize' } : undefined}
              />
            )
          })}

          {nodes.map(node => {
            const isSelected = Array.isArray(selectedIds)
              ? selectedIds.includes(node.id)
              : selectedId
                ? node.id === selectedId
                : false
            const color = getGenderColor(node.gender, isDark)
            const dead = isDeceased(node)
            const birthYear = node.birthDate ? node.birthDate.slice(0, 4) : ''
            const deathYear = node.deathDate ? node.deathDate.slice(0, 4) : ''
            const dateStr =
              birthYear || deathYear ? `${birthYear}${deathYear ? ` – ${deathYear}` : ''}` : ''

            let ageYears = null
            if (node.birthDate) {
              if (dead && node.deathDate) {
                ageYears = computeAgeYears(node.birthDate, node.deathDate)
              } else if (!dead) {
                ageYears = computeAgeYears(node.birthDate, null)
              }
            }
            let ageLine = ''
            if (ageYears !== null) {
              ageLine = dead
                ? t('tree.age_at_death_label', { count: ageYears })
                : t('tree.age_live_label', { count: ageYears })
            }

            const lastName = (node.lastName || '').trim()
            const firstName = (node.firstName || '').trim()
            const patronymic = (node.patronymic || '').trim()

            const cardFill = dead
              ? isDark
                ? 'rgba(36,38,48,0.92)'
                : 'rgba(243,244,246,0.96)'
              : isSelected
                ? isDark
                  ? 'rgba(40,45,65,0.98)'
                  : '#eff2ff'
                : isDark
                  ? 'rgba(30,32,42,0.98)'
                  : '#fff'

            const strokeCol = isSelected ? (isDark ? '#818cf8' : 'var(--primary)') : color
            const textMuted = isDark ? '#9ca3af' : '#6b7280'
            const textMain = isDark ? '#e5e7eb' : '#1a1a2e'

            const contacts = buildContactItems(node.contacts)
            const rowY = NODE_H - 20
            const iconR = 7
            const step = 16
            const rowStartX = 8 + (NODE_W - 16 - Math.min(contacts.length, 8) * step) / 2

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onMouseDown={e => handleNodeMouseDown(e, node)}
                onClick={e => handleNodeClick(e, node.id)}
                onDoubleClick={e => {
                  if (readonly) return
                  if (draggingIds?.length || draggingSiblingRel) return
                  e.stopPropagation()
                  if (typeof onEditNode === 'function') onEditNode(node)
                }}
                style={{ cursor: readonly ? 'default' : 'pointer' }}
              >
                <rect x={2} y={3} width={NODE_W} height={NODE_H} rx={10} ry={10} fill="rgba(0,0,0,0.08)" />
                <rect
                  width={NODE_W}
                  height={NODE_H}
                  rx={10}
                  ry={10}
                  fill={cardFill}
                  stroke={strokeCol}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                  opacity={dead ? 0.88 : 1}
                />
                <rect width={6} height={NODE_H} rx={10} ry={10} fill={color} opacity={dead ? 0.65 : 1} />

                {dead && (
                  <>
                    <polygon
                      points={`${NODE_W - 2},0 ${NODE_W},0 ${NODE_W},${38} ${NODE_W - 52},0`}
                      fill={isDark ? '#1f2937' : '#374151'}
                      opacity={0.95}
                    />
                    <line
                      x1={NODE_W - 4}
                      y1={2}
                      x2={NODE_W - 18}
                      y2={28}
                      stroke={isDark ? '#9ca3af' : '#d1d5db'}
                      strokeWidth={1.2}
                    />
                  </>
                )}

                {node.photo ? (
                  <image
                    href={node.photo}
                    x={10}
                    y={10}
                    width={38}
                    height={54}
                    preserveAspectRatio="xMidYMid slice"
                    opacity={dead ? 0.55 : 1}
                  />
                ) : (
                  <circle cx={29} cy={37} r={18} fill={color + '22'} opacity={dead ? 0.5 : 1} />
                )}
                <text x={29} y={42} textAnchor="middle" fontSize={14} fontWeight={700} fill={color} opacity={dead ? 0.45 : 1}>
                  {(node.firstName || node.lastName || '?')[0]}
                </text>

                <text x={54} y={16} fontSize={9.5} fontWeight={700} fill={textMain}>
                  {lastName || '—'}
                </text>
                <text x={54} y={28} fontSize={9.5} fontWeight={600} fill={textMain}>
                  {firstName}
                </text>
                <text x={54} y={40} fontSize={9} fontWeight={500} fill={textMuted}>
                  {patronymic}
                </text>

                {ageLine ? (
                  <text x={54} y={54} fontSize={8.5} fill={textMuted}>
                    {ageLine}
                  </text>
                ) : null}
                {dateStr ? (
                  <text x={54} y={ageLine ? 66 : 54} fontSize={ageLine ? 7.5 : 8.5} fill={textMuted}>
                    {dateStr}
                  </text>
                ) : null}

                {contacts.map((ct, i) => (
                  <a
                    key={ct.key}
                    href={ct.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                  >
                    <circle
                      cx={rowStartX + i * step + iconR}
                      cy={rowY}
                      r={iconR}
                      fill={isDark ? '#374151' : '#e5e7eb'}
                      stroke={color}
                      strokeWidth={0.8}
                    />
                    <text
                      x={rowStartX + i * step + iconR}
                      y={rowY + 3.5}
                      textAnchor="middle"
                      fontSize={6.5}
                      fontWeight={700}
                      fill={textMain}
                      style={{ pointerEvents: 'none' }}
                    >
                      {ct.abbr}
                    </text>
                    <title>{ct.title}</title>
                  </a>
                ))}
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}
