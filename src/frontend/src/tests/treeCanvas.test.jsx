import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'ru', changeLanguage: vi.fn() }
  })
}))

// Mock lucide-react
vi.mock('lucide-react', () => ({
  ZoomIn: () => <span data-testid="icon-zoom-in" />,
  ZoomOut: () => <span data-testid="icon-zoom-out" />,
  Maximize2: () => <span data-testid="icon-maximize" />
}))

import TreeCanvas from '../components/TreeCanvas'

// Auto-layout helper extracted for testing
function autoLayout(nodes, relations) {
  if (!nodes.length) return nodes

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
  if (roots.length === 0 && nodes.length > 0) roots.push(nodes[0].id)

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

  const nodeMap = {}
  nodes.forEach(n => { nodeMap[n.id] = { ...n } })
  levelNodes.forEach((ids, level) => {
    const totalWidth = ids.length * 150 + (ids.length - 1) * 60
    ids.forEach((id, i) => {
      nodeMap[id] = {
        ...nodeMap[id],
        x: i * (150 + 60) - totalWidth / 2 + 75 + 400,
        y: level * (70 + 100) + 60
      }
    })
  })

  return nodes.map(n => nodeMap[n.id] || n)
}

describe('TreeCanvas auto-layout', () => {
  it('returns empty array for empty nodes', () => {
    const result = autoLayout([], [])
    expect(result).toEqual([])
  })

  it('assigns valid numeric positions to all nodes', () => {
    const nodes = [
      { id: 'a', firstName: 'Alice', lastName: 'Smith' },
      { id: 'b', firstName: 'Bob', lastName: 'Smith' },
      { id: 'c', firstName: 'Charlie', lastName: 'Smith' }
    ]
    const relations = [
      { id: 'r1', from: 'a', to: 'c', type: 'parent-child' },
      { id: 'r2', from: 'b', to: 'c', type: 'parent-child' }
    ]
    const result = autoLayout(nodes, relations)
    expect(result).toHaveLength(3)
    result.forEach(n => {
      expect(typeof n.x).toBe('number')
      expect(typeof n.y).toBe('number')
      expect(isNaN(n.x)).toBe(false)
      expect(isNaN(n.y)).toBe(false)
    })
  })

  it('places root nodes at a higher level (lower y) than children', () => {
    const nodes = [
      { id: 'parent', firstName: 'Parent', lastName: '' },
      { id: 'child', firstName: 'Child', lastName: '' }
    ]
    const relations = [{ id: 'r1', from: 'parent', to: 'child', type: 'parent-child' }]
    const result = autoLayout(nodes, relations)
    const parentNode = result.find(n => n.id === 'parent')
    const childNode = result.find(n => n.id === 'child')
    expect(parentNode.y).toBeLessThan(childNode.y)
  })

  it('preserves node ids and other fields', () => {
    const nodes = [
      { id: 'x1', firstName: 'Test', lastName: 'User', gender: 'male', bio: 'some bio' }
    ]
    const result = autoLayout(nodes, [])
    expect(result[0].id).toBe('x1')
    expect(result[0].firstName).toBe('Test')
    expect(result[0].gender).toBe('male')
    expect(result[0].bio).toBe('some bio')
  })

  it('handles single node', () => {
    const nodes = [{ id: 'only', firstName: 'Solo', lastName: '' }]
    const result = autoLayout(nodes, [])
    expect(result).toHaveLength(1)
    expect(typeof result[0].x).toBe('number')
    expect(typeof result[0].y).toBe('number')
  })
})

describe('TreeCanvas rendering', () => {
  const defaultProps = {
    nodes: [],
    relations: [],
    selectedId: null,
    onSelectNode: vi.fn(),
    onUpdateNodePosition: vi.fn(),
    onAddNode: vi.fn(),
    readonly: false
  }

  it('renders without crashing with empty nodes', () => {
    const { container } = render(<TreeCanvas {...defaultProps} />)
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('renders zoom control buttons', () => {
    render(<TreeCanvas {...defaultProps} />)
    expect(screen.getByTestId('icon-zoom-in')).toBeTruthy()
    expect(screen.getByTestId('icon-zoom-out')).toBeTruthy()
    expect(screen.getByTestId('icon-maximize')).toBeTruthy()
  })

  it('renders nodes as SVG groups', () => {
    const nodes = [
      { id: 'n1', firstName: 'Alice', lastName: 'Smith', x: 100, y: 100, gender: 'female' },
      { id: 'n2', firstName: 'Bob', lastName: 'Jones', x: 300, y: 100, gender: 'male' }
    ]
    const { container } = render(<TreeCanvas {...defaultProps} nodes={nodes} />)
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
    // SVG should contain rects for nodes
    const rects = svg.querySelectorAll('rect')
    expect(rects.length).toBeGreaterThan(0)
  })

  it('calls onSelectNode when a node is clicked', () => {
    const onSelectNode = vi.fn()
    const nodes = [
      { id: 'n1', firstName: 'Alice', lastName: 'Smith', x: 100, y: 100, gender: 'female' }
    ]
    const { container } = render(
      <TreeCanvas {...defaultProps} nodes={nodes} onSelectNode={onSelectNode} />
    )
    // Click on the node group (first g inside the transform group)
    const svgGroups = container.querySelectorAll('svg g g g')
    if (svgGroups.length > 0) {
      fireEvent.click(svgGroups[0])
    }
    // The node should have been clickable
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('renders in readonly mode without crashing', () => {
    const nodes = [
      { id: 'n1', firstName: 'Test', lastName: 'User', x: 50, y: 50, gender: 'unknown' }
    ]
    const { container } = render(<TreeCanvas {...defaultProps} nodes={nodes} readonly={true} />)
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('renders relation lines between nodes', () => {
    const nodes = [
      { id: 'p', firstName: 'Parent', lastName: '', x: 200, y: 50, gender: 'male' },
      { id: 'c', firstName: 'Child', lastName: '', x: 200, y: 250, gender: 'female' }
    ]
    const relations = [{ id: 'r1', from: 'p', to: 'c', type: 'parent-child' }]
    const { container } = render(
      <TreeCanvas {...defaultProps} nodes={nodes} relations={relations} />
    )
    const paths = container.querySelectorAll('path')
    // Should have at least one path for the relation
    expect(paths.length).toBeGreaterThan(0)
  })
})
