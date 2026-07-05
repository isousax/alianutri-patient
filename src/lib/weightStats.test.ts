import { describe, it, expect } from 'vitest'
import { movingAverage, weeklyRate, weeksToTarget, type DatedValue } from './weightStats'

describe('movingAverage', () => {
  it('janela 2: primeiro ponto é ele mesmo, depois média do par', () => {
    expect(movingAverage([1, 2, 3, 4], 2)).toEqual([1, 1.5, 2.5, 3.5])
  })

  it('janela maior que o array usa janela parcial crescente', () => {
    expect(movingAverage([2, 4], 7)).toEqual([2, 3])
  })

  it('janela 1 devolve a própria série', () => {
    expect(movingAverage([5, 7, 9], 1)).toEqual([5, 7, 9])
  })

  it('janela < 1 devolve uma cópia', () => {
    const src = [1, 2]
    const out = movingAverage(src, 0)
    expect(out).toEqual([1, 2])
    expect(out).not.toBe(src)
  })

  it('array vazio', () => {
    expect(movingAverage([], 7)).toEqual([])
  })
})

describe('weeklyRate', () => {
  const P = (date: string, value: number): DatedValue => ({ date, value })

  it('retorna null com menos de 2 pontos', () => {
    expect(weeklyRate([])).toBeNull()
    expect(weeklyRate([P('2026-01-01', 80)])).toBeNull()
  })

  it('ganho de 1 kg em 7 dias ≈ +1 kg/semana', () => {
    const r = weeklyRate([P('2026-01-01', 80), P('2026-01-08', 81)])
    expect(r).toBeCloseTo(1, 5)
  })

  it('perda de 2 kg em 14 dias ≈ -1 kg/semana', () => {
    const r = weeklyRate([P('2026-01-01', 82), P('2026-01-15', 80)])
    expect(r).toBeCloseTo(-1, 5)
  })

  it('regressão linear sobre 3 pontos perfeitos', () => {
    const r = weeklyRate([P('2026-01-01', 80), P('2026-01-08', 80.5), P('2026-01-15', 81)])
    expect(r).toBeCloseTo(0.5, 5)
  })
})

describe('weeksToTarget', () => {
  it('0 quando já atingiu (dentro de 0,05 kg)', () => {
    expect(weeksToTarget(75.02, 75, -1)).toBe(0)
  })

  it('estima semanas quando indo na direção da meta', () => {
    expect(weeksToTarget(80, 75, -1)).toBeCloseTo(5, 5)
    expect(weeksToTarget(70, 75, 1)).toBeCloseTo(5, 5)
  })

  it('null quando indo na direção contrária à meta', () => {
    expect(weeksToTarget(80, 75, 1)).toBeNull()
  })

  it('null quando a velocidade é ~0', () => {
    expect(weeksToTarget(80, 75, 0)).toBeNull()
    expect(weeksToTarget(80, 75, 0.005)).toBeNull()
  })
})
