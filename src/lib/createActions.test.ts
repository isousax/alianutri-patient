import { describe, it, expect } from 'vitest'
import { CREATE_ACTIONS, routeForCreateAction, type CreateActionId } from './createActions'

describe('createActions', () => {
  it('tem as ações P0 na ordem esperada', () => {
    expect(CREATE_ACTIONS.map((a) => a.id)).toEqual([
      'meal',
      'weight',
      'mood',
      'progress',
      'exercise',
      'note',
    ])
  })

  it('ids e rotas são únicos', () => {
    expect(new Set(CREATE_ACTIONS.map((a) => a.id)).size).toBe(CREATE_ACTIONS.length)
    expect(new Set(CREATE_ACTIONS.map((a) => a.route)).size).toBe(CREATE_ACTIONS.length)
  })

  it('roteia cada id para a rota correta', () => {
    expect(routeForCreateAction('meal')).toBe('/post-compose?type=meal')
    expect(routeForCreateAction('weight')).toBe('/weight')
    expect(routeForCreateAction('mood')).toBe('/post-compose?type=mood')
    expect(routeForCreateAction('progress')).toBe('/progress-photos')
    expect(routeForCreateAction('exercise')).toBe('/post-compose?type=exercise')
    expect(routeForCreateAction('note')).toBe('/post-compose?type=free')
  })

  it('retorna null para id inexistente', () => {
    expect(routeForCreateAction('nope' as CreateActionId)).toBeNull()
  })

  it('toda ação tem label, descrição, emoji e rota absoluta', () => {
    for (const a of CREATE_ACTIONS) {
      expect(a.label.length).toBeGreaterThan(0)
      expect(a.description.length).toBeGreaterThan(0)
      expect(a.emoji.length).toBeGreaterThan(0)
      expect(a.route.startsWith('/')).toBe(true)
    }
  })
})
