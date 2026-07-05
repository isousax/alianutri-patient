import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { haptics } from './haptics'
// `expo-haptics` é aliasado para o stub em vitest.config.ts.
import * as MockHaptics from 'expo-haptics'

const m = MockHaptics as unknown as { calls: string[]; __reset: (reject?: boolean) => void }

describe('haptics', () => {
  beforeEach(() => {
    m.__reset(false)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('mapeia cada atalho para a chamada nativa correta', () => {
    haptics.selection()
    haptics.light()
    haptics.medium()
    haptics.heavy()
    haptics.success()
    haptics.warning()
    haptics.error()
    expect(m.calls).toEqual([
      'selection',
      'impact:Light',
      'impact:Medium',
      'impact:Heavy',
      'notify:Success',
      'notify:Warning',
      'notify:Error',
    ])
  })

  it('celebrate() dispara a sequência de 5 pulsos ao longo de 900ms', () => {
    vi.useFakeTimers()
    haptics.celebrate()
    // O primeiro pulso é imediato; os demais são agendados.
    expect(m.calls).toEqual(['notify:Success'])
    vi.advanceTimersByTime(1000)
    expect(m.calls).toEqual([
      'notify:Success',
      'impact:Light',
      'impact:Medium',
      'impact:Heavy',
      'notify:Success',
    ])
  })

  it('celebrate() cancel() limpa os timers pendentes', () => {
    vi.useFakeTimers()
    const cancel = haptics.celebrate()
    cancel()
    vi.advanceTimersByTime(1000)
    expect(m.calls).toEqual(['notify:Success']) // apenas o pulso imediato
  })

  it('não lança quando o motor háptico rejeita', () => {
    m.__reset(true)
    vi.useFakeTimers()
    expect(() => {
      haptics.success()
      haptics.selection()
      haptics.celebrate()
      vi.advanceTimersByTime(1000) // dispara os pulsos agendados (todos engolidos)
    }).not.toThrow()
  })
})
