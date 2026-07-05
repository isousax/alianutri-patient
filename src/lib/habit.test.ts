import { describe, it, expect } from 'vitest'
import { isCheckedToday, habitStreak, streakUnit, cadenceLabel } from './habit'
import type { PortalHabit } from '../types/portal'

// Fixtures enxutas — habit.ts só lê cadence/per_week/checkins do DTO.
// (Datas: 2026-01-01 é quinta; portanto 05 e 12 de jan/2026 são segundas.)
const daily = (checkins: string[]): PortalHabit => ({ cadence: 'daily', checkins } as PortalHabit)
const weekly = (checkins: string[], per_week?: number): PortalHabit =>
  ({ cadence: 'weekly', ...(per_week != null ? { per_week } : {}), checkins } as PortalHabit)

describe('isCheckedToday', () => {
  it('true quando hoje está nos check-ins', () => {
    expect(isCheckedToday(daily(['2026-01-15']), '2026-01-15')).toBe(true)
  })
  it('false caso contrário', () => {
    expect(isCheckedToday(daily(['2026-01-14']), '2026-01-15')).toBe(false)
  })
})

describe('habitStreak — diário', () => {
  it('sem check-ins → 0', () => {
    expect(habitStreak(daily([]), '2026-01-15')).toBe(0)
  })
  it('só hoje → 1', () => {
    expect(habitStreak(daily(['2026-01-15']), '2026-01-15')).toBe(1)
  })
  it('dias consecutivos terminando hoje', () => {
    expect(habitStreak(daily(['2026-01-13', '2026-01-14', '2026-01-15']), '2026-01-15')).toBe(3)
  })
  it('conta a partir de ontem quando hoje ainda não foi marcado (grace)', () => {
    expect(habitStreak(daily(['2026-01-13', '2026-01-14']), '2026-01-15')).toBe(2)
  })
  it('um buraco encerra a sequência', () => {
    expect(habitStreak(daily(['2026-01-10', '2026-01-14', '2026-01-15']), '2026-01-15')).toBe(2)
  })
})

describe('habitStreak — semanal', () => {
  it('conta semanas que batem a meta per_week', () => {
    // Semana de 12/jan (13,14) e semana de 05/jan (05,08) — ambas com 2 check-ins.
    const h = weekly(['2026-01-13', '2026-01-14', '2026-01-05', '2026-01-08'], 2)
    expect(habitStreak(h, '2026-01-14')).toBe(2)
  })
  it('semana atual incompleta não zera a sequência anterior (grace)', () => {
    // Semana atual (12/jan) só tem 1; a anterior (05/jan) tem 2 → streak 1.
    const h = weekly(['2026-01-14', '2026-01-05', '2026-01-06'], 2)
    expect(habitStreak(h, '2026-01-14')).toBe(1)
  })
  it('per_week default 1: um check-in por semana já conta', () => {
    const h = weekly(['2026-01-13', '2026-01-06'])
    expect(habitStreak(h, '2026-01-14')).toBe(2)
  })
})

describe('streakUnit', () => {
  it('diário: dia/dias', () => {
    expect(streakUnit(daily([]), 1)).toBe('dia')
    expect(streakUnit(daily([]), 2)).toBe('dias')
  })
  it('semanal: semana/semanas', () => {
    expect(streakUnit(weekly([]), 1)).toBe('semana')
    expect(streakUnit(weekly([]), 3)).toBe('semanas')
  })
})

describe('cadenceLabel', () => {
  it('diário', () => {
    expect(cadenceLabel(daily([]))).toBe('diário')
  })
  it('semanal usa per_week (com fallback 1)', () => {
    expect(cadenceLabel(weekly([], 3))).toBe('3x/semana')
    expect(cadenceLabel(weekly([]))).toBe('1x/semana')
  })
})
