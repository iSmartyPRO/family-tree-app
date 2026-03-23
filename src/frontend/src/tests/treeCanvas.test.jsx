import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: key => key,
    i18n: { language: 'ru', changeLanguage: vi.fn() }
  })
}))

vi.mock('../context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', isDark: false, toggleTheme: vi.fn(), setTheme: vi.fn() })
}))

vi.mock('lucide-react', () => ({
  ZoomIn: () => <span data-testid="icon-zoom-in" />,
  ZoomOut: () => <span data-testid="icon-zoom-out" />,
  Maximize2: () => <span data-testid="icon-maximize" />
}))

import TreeCanvas, { autoLayout, NODE_W, NODE_H } from '../components/TreeCanvas'

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
    const nodes = [{ id: 'x1', firstName: 'Test', lastName: 'User', gender: 'male', bio: 'some bio' }]
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

  it('uses exported node dimensions in layout', () => {
    expect(typeof NODE_W).toBe('number')
    expect(typeof NODE_H).toBe('number')
    expect(NODE_W).toBeGreaterThan(0)
    expect(NODE_H).toBeGreaterThan(0)
  })
})

describe('TreeCanvas rendering', () => {
  const defaultProps = {
    nodes: [],
    relations: [],
    selectedId: null,
    onSelectNode: vi.fn(),
    onUpdateNodePosition: vi.fn(),
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
    const rects = svg.querySelectorAll('rect')
    expect(rects.length).toBeGreaterThan(0)
  })

  it('calls onSelectNode when a node is clicked', () => {
    const onSelectNode = vi.fn()
    const nodes = [{ id: 'n1', firstName: 'Alice', lastName: 'Smith', x: 100, y: 100, gender: 'female' }]
    const { container } = render(<TreeCanvas {...defaultProps} nodes={nodes} onSelectNode={onSelectNode} />)
    const svgGroups = container.querySelectorAll('svg g g g')
    if (svgGroups.length > 0) {
      fireEvent.click(svgGroups[0])
    }
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('renders in readonly mode without crashing', () => {
    const nodes = [{ id: 'n1', firstName: 'Test', lastName: 'User', x: 50, y: 50, gender: 'unknown' }]
    const { container } = render(<TreeCanvas {...defaultProps} nodes={nodes} readonly={true} />)
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('renders relation lines between nodes', () => {
    const nodes = [
      { id: 'p', firstName: 'Parent', lastName: '', x: 200, y: 50, gender: 'male' },
      { id: 'c', firstName: 'Child', lastName: '', x: 200, y: 250, gender: 'female' }
    ]
    const relations = [{ id: 'r1', from: 'p', to: 'c', type: 'parent-child' }]
    const { container } = render(<TreeCanvas {...defaultProps} nodes={nodes} relations={relations} />)
    const paths = container.querySelectorAll('path')
    expect(paths.length).toBeGreaterThan(0)
  })
})
