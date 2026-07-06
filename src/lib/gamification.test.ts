import { describe, it, expect } from 'vitest'
import {
  computeGamification,
  applyDevOverrides,
  LEVEL_THRESHOLDS,
  MAX_LEVEL,
} from './gamification'

// Estado base determinístico: sem sinais → XP 0, nível 1, nenhuma medalha.
const base = () => computeGamification({ streak: 0, loggedDays: 0, goals: [] })

describe('applyDevOverrides (simulador dev)', () => {
  it('sem overrides é no-op', () => {
    const g = base()
    const out = applyDevOverrides(g, {})
    expect(out.level).toBe(1)
    expect(out.xp).toBe(0)
    expect(out.unlockedCount).toBe(0)
  })

  it('xpOverride recalcula nível/faixa a partir dos thresholds', () => {
    const out = applyDevOverrides(base(), { xpOverride: 300 })
    expect(out.xp).toBe(300)
    expect(out.level).toBe(3) // LEVEL_THRESHOLDS = [0,100,300,...]
    expect(out.xpInLevel).toBe(0)
    expect(out.xpPerLevel).toBe(LEVEL_THRESHOLDS[3] - LEVEL_THRESHOLDS[2]) // 600-300
  })

  it('xpOverride no teto leva ao nível máximo', () => {
    const out = applyDevOverrides(base(), { xpOverride: LEVEL_THRESHOLDS[MAX_LEVEL - 1] })
    expect(out.level).toBe(MAX_LEVEL)
  })

  it('unlockedIds força medalhas desbloqueadas e atualiza a contagem', () => {
    const out = applyDevOverrides(base(), { unlockedIds: ['streak3', 'nutriFav'] })
    expect(out.badges.find((b) => b.id === 'streak3')?.unlocked).toBe(true)
    expect(out.badges.find((b) => b.id === 'nutriFav')?.unlocked).toBe(true)
    expect(out.unlockedCount).toBe(2)
  })

  it('não muta o estado original', () => {
    const g = base()
    applyDevOverrides(g, { xpOverride: 4000, unlockedIds: ['streak3'] })
    expect(g.xp).toBe(0)
    expect(g.level).toBe(1)
    expect(g.badges.find((b) => b.id === 'streak3')?.unlocked).toBe(false)
    expect(g.unlockedCount).toBe(0)
  })

  it('ids desconhecidos são ignorados sem quebrar', () => {
    const out = applyDevOverrides(base(), { unlockedIds: ['nao_existe'] })
    expect(out.unlockedCount).toBe(0)
  })
})
