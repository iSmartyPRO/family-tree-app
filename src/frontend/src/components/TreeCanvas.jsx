import React, { useRef, useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'

const NODE_W = 150
const NODE_H = 70
const H_GAP = 60
const V_GAP = 100

function autoLayout(nodes, relations) {
  if (!nodes.length) return nodes

  const nodeMap = {}
  nodes.forEach(n => { nodeMap[n.id] = { ...n } })

  // Find children map and parent map
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

  // Find root nodes (no parents)
  const roots = nodes.filter(n => parentsOf[n.id].length === 0).map(n => n.id)
  if (roots.length === 0) roots.push(nodes[0].id)

  const positioned = {}
  const levelNodes = []

  // BFS
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

  // Add any unvisited nodes
  nodes.forEach(n => {
    if (!visited.has(n.id)) {
      const level = levelNodes.length
      if (!levelNodes[level]) levelNodes[level] = []
      levelNodes[level].push(n.id)
    }
  })

  // Assign positions
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

function getGenderColor(gender) {
  if (gender === 'male') return '#3b82f6'
  if (gender === 'female') return '#ec4899'
  return '#9ca3af'
}

function getRelationPath(fromNode, toNode, type) {
  if (!fromNode || !toNode) return ''
  const fx = fromNode.x + NODE_W / 2
  const fy = fromNode.y + NODE_H / 2
  const tx = toNode.x + NODE_W / 2
  const ty = toNode.y + NODE_H / 2

  if (type === 'parent-child') {
    const startY = fromNode.y + NODE_H
    const endY = toNode.y
    const midY = (startY + endY) / 2
    return `M ${fx} ${startY} C ${fx} ${midY}, ${tx} ${midY}, ${tx} ${endY}`
  }
  if (type === 'spouse') {
    return `M ${fromNode.x + NODE_W} ${fy} L ${toNode.x} ${ty}`
  }
  // sibling
  const topY = Math.min(fy, ty) - 30
  return `M ${fx} ${fy} Q ${(fx + tx) / 2} ${topY} ${tx} ${ty}`
}

export default function TreeCanvas({ nodes: propNodes, relations, selectedId, onSelectNode, onUpdateNodePosition, readonly }) {
  const { t } = useTranslation()
  const svgRef = useRef()
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState(null)
  const [draggingNode, setDraggingNode] = useState(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [nodes, setNodes] = useState([])

  // Auto-layout nodes that have no position
  useEffect(() => {
    const needsLayout = propNodes.some(n => n.x == null || n.y == null)
    if (needsLayout) {
      setNodes(autoLayout(propNodes, relations))
    } else {
      setNodes(propNodes)
    }
  }, [propNodes, relations])

  const svgToWorld = useCallback((svgX, svgY) => {
    return {
      x: (svgX - pan.x) / zoom,
      y: (svgY - pan.y) / zoom
    }
  }, [pan, zoom])

  const handleWheel = (e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoom(z => Math.min(3, Math.max(0.2, z * delta)))
  }

  const handleSvgMouseDown = (e) => {
    if (e.target === svgRef.current || e.target.classList.contains('pan-target')) {
      setIsPanning(true)
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }

  const handleMouseMove = (e) => {
    if (isPanning && panStart) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y })
    }
    if (draggingNode && !readonly) {
      const rect = svgRef.current.getBoundingClientRect()
      const svgX = e.clientX - rect.left
      const svgY = e.clientY - rect.top
      const world = svgToWorld(svgX, svgY)
      const newX = world.x - dragOffset.x
      const newY = world.y - dragOffset.y
      setNodes(prev => prev.map(n => n.id === draggingNode ? { ...n, x: newX, y: newY } : n))
    }
  }

  const handleMouseUp = () => {
    if (draggingNode && !readonly) {
      const node = nodes.find(n => n.id === draggingNode)
      if (node) onUpdateNodePosition(node.id, node.x, node.y)
    }
    setIsPanning(false)
    setPanStart(null)
    setDraggingNode(null)
  }

  const handleNodeMouseDown = (e, node) => {
    if (readonly) return
    e.stopPropagation()
    const rect = svgRef.current.getBoundingClientRect()
    const svgX = e.clientX - rect.left
    const svgY = e.clientY - rect.top
    const world = svgToWorld(svgX, svgY)
    setDragOffset({ x: world.x - node.x, y: world.y - node.y })
    setDraggingNode(node.id)
  }

  const handleNodeClick = (e, nodeId) => {
    if (draggingNode) return
    e.stopPropagation()
    onSelectNode(nodeId)
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
  nodes.forEach(n => { nodeMap[n.id] = n })

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#f0f4f8', overflow: 'hidden' }}>
      {/* Zoom controls */}
      <div style={{ position: 'absolute', bottom: 20, right: 20, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => setZoom(z => Math.min(3, z * 1.2))} title={t('tree.zoom_in')}>
          <ZoomIn size={16} />
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => setZoom(z => Math.max(0.2, z / 1.2))} title={t('tree.zoom_out')}>
          <ZoomOut size={16} />
        </button>
        <button className="btn btn-secondary btn-sm" onClick={fitToScreen} title={t('tree.fit')}>
          <Maximize2 size={16} />
        </button>
      </div>

      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        onWheel={handleWheel}
        onMouseDown={handleSvgMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isPanning ? 'grabbing' : 'grab', userSelect: 'none' }}
      >
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#9ca3af" />
          </marker>
        </defs>

        {/* Background dots */}
        <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill="#d1d5db" />
        </pattern>
        <rect className="pan-target" width="100%" height="100%" fill="url(#dots)" />

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Relations */}
          {relations.map(rel => {
            const fromNode = nodeMap[rel.from]
            const toNode = nodeMap[rel.to]
            if (!fromNode || !toNode) return null
            const path = getRelationPath(fromNode, toNode, rel.type)
            return (
              <g key={rel.id}>
                <path
                  d={path}
                  fill="none"
                  stroke={rel.type === 'spouse' ? '#f59e0b' : rel.type === 'sibling' ? '#10b981' : '#9ca3af'}
                  strokeWidth={rel.type === 'spouse' ? 2.5 : 2}
                  strokeDasharray={rel.type === 'spouse' ? '6,3' : 'none'}
                  markerEnd={rel.type === 'parent-child' ? 'url(#arrow)' : undefined}
                />
              </g>
            )
          })}

          {/* Nodes */}
          {nodes.map(node => {
            const isSelected = node.id === selectedId
            const color = getGenderColor(node.gender)
            const birthYear = node.birthDate ? node.birthDate.slice(0, 4) : ''
            const deathYear = node.deathDate ? node.deathDate.slice(0, 4) : ''
            const dateStr = birthYear || deathYear ? `${birthYear}${deathYear ? ` – ${deathYear}` : ''}` : ''
            const fullName = `${node.firstName || ''} ${node.lastName || ''}`.trim()

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onMouseDown={(e) => handleNodeMouseDown(e, node)}
                onClick={(e) => handleNodeClick(e, node.id)}
                style={{ cursor: readonly ? 'default' : 'pointer' }}
              >
                {/* Shadow */}
                <rect
                  x={2} y={3}
                  width={NODE_W} height={NODE_H}
                  rx={10} ry={10}
                  fill="rgba(0,0,0,0.08)"
                />
                {/* Card */}
                <rect
                  width={NODE_W} height={NODE_H}
                  rx={10} ry={10}
                  fill={isSelected ? '#eff2ff' : '#fff'}
                  stroke={isSelected ? 'var(--primary)' : color}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                />
                {/* Gender bar */}
                <rect
                  width={6} height={NODE_H}
                  rx={10} ry={10}
                  fill={color}
                />
                {/* Photo placeholder or initial */}
                {node.photo ? (
                  <image
                    href={node.photo}
                    x={14} y={10}
                    width={34} height={50}
                    clipPath="inset(0 round 6px)"
                    preserveAspectRatio="xMidYMid slice"
                  />
                ) : (
                  <circle cx={31} cy={35} r={18} fill={color + '22'} />
                )}
                <text x={31} y={40} textAnchor="middle" fontSize={14} fontWeight={700} fill={color}>
                  {(node.firstName || '?')[0]}
                </text>

                {/* Name */}
                <text
                  x={58} y={28}
                  fontSize={11}
                  fontWeight={700}
                  fill="#1a1a2e"
                >
                  {fullName.length > 14 ? fullName.slice(0, 14) + '…' : fullName || '—'}
                </text>

                {/* Maiden name */}
                {node.maidenName && (
                  <text x={58} y={42} fontSize={10} fill="#6b7280">
                    ({node.maidenName})
                  </text>
                )}

                {/* Dates */}
                {dateStr && (
                  <text x={58} y={node.maidenName ? 56 : 44} fontSize={10} fill="#6b7280">
                    {dateStr}
                  </text>
                )}
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}
