import { describe, it, expect, beforeEach } from 'vitest'
import { useFeaturesStore } from './features'

// Reseta o store aos defaults entre casos (zustand é global).
const reset = () => useFeaturesStore.setState({ canWrite: true, aiMealAnalysis: null })

describe('features store (máquina de capacidades)', () => {
  beforeEach(reset)

  it('default é fail-open: canWrite=true, sem cota de IA', () => {
    const s = useFeaturesStore.getState()
    expect(s.canWrite).toBe(true)
    expect(s.aiMealAnalysis).toBeNull()
  })

  it('setFeatures(undefined) mantém fail-open (canWrite=true)', () => {
    useFeaturesStore.getState().setFeatures(undefined)
    expect(useFeaturesStore.getState().canWrite).toBe(true)
    expect(useFeaturesStore.getState().aiMealAnalysis).toBeNull()
  })

  it('DTO malformado (sem can_write) cai no default true', () => {
    useFeaturesStore.getState().setFeatures({} as never)
    expect(useFeaturesStore.getState().canWrite).toBe(true)
  })

  it('can_write=false ativa o modo somente-leitura', () => {
    useFeaturesStore.getState().setFeatures({ can_write: false })
    expect(useFeaturesStore.getState().canWrite).toBe(false)
  })

  it('sincroniza a cota de análise por IA', () => {
    useFeaturesStore.getState().setFeatures({
      can_write: true,
      ai_meal_analysis: { limit: 3, used: 1, period: 'day' },
    })
    expect(useFeaturesStore.getState().aiMealAnalysis).toEqual({ limit: 3, used: 1, period: 'day' })
  })

  it('setFeatures sem ai_meal_analysis limpa a cota (não fica presa em valor antigo)', () => {
    useFeaturesStore.getState().setFeatures({ can_write: true, ai_meal_analysis: { limit: 3, used: 3, period: 'day' } })
    useFeaturesStore.getState().setFeatures({ can_write: true })
    expect(useFeaturesStore.getState().aiMealAnalysis).toBeNull()
  })

  it('setCanWrite altera só a escrita, preservando a cota', () => {
    useFeaturesStore.getState().setFeatures({ can_write: true, ai_meal_analysis: { limit: 5, used: 2, period: 'day' } })
    useFeaturesStore.getState().setCanWrite(false)
    const s = useFeaturesStore.getState()
    expect(s.canWrite).toBe(false)
    expect(s.aiMealAnalysis).toEqual({ limit: 5, used: 2, period: 'day' })
  })
})
