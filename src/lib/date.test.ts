import { describe, it, expect, afterEach, vi } from 'vitest'
import {
  todayBRT,
  todayStr,
  todayISO,
  shiftDate,
  addDays,
  weekdayMon0,
  mondayOf,
  fmtDateLabel,
  fmtDateShort,
} from './date'

afterEach(() => {
  vi.useRealTimers()
})

describe('todayBRT', () => {
  it('usa o dia civil BRT (UTC-3), não o UTC, perto da meia-noite', () => {
    // 01:30Z ainda é 22:30 do dia anterior em BRT.
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-05T01:30:00Z'))
    expect(todayBRT()).toBe('2026-07-04')

    // 02:59Z = 23:59 BRT do dia 04.
    vi.setSystemTime(new Date('2026-07-05T02:59:00Z'))
    expect(todayBRT()).toBe('2026-07-04')

    // 03:00Z = 00:00 BRT → vira o dia 05.
    vi.setSystemTime(new Date('2026-07-05T03:00:00Z'))
    expect(todayBRT()).toBe('2026-07-05')
  })

  it('todayStr e todayISO são aliases de todayBRT', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-10T15:00:00Z'))
    expect(todayStr()).toBe(todayBRT())
    expect(todayISO()).toBe(todayBRT())
  })
})

describe('shiftDate', () => {
  it('soma e subtrai dias', () => {
    expect(shiftDate('2026-07-04', 0)).toBe('2026-07-04')
    expect(shiftDate('2026-07-04', 7)).toBe('2026-07-11')
    expect(shiftDate('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('atravessa fronteiras de mês e ano', () => {
    expect(shiftDate('2025-12-31', 1)).toBe('2026-01-01')
    expect(shiftDate('2026-01-01', -1)).toBe('2025-12-31')
  })

  it('respeita ano bissexto', () => {
    expect(shiftDate('2024-02-28', 1)).toBe('2024-02-29')
    expect(shiftDate('2024-03-01', -1)).toBe('2024-02-29')
    expect(shiftDate('2025-02-28', 1)).toBe('2025-03-01')
  })

  it('addDays é alias de shiftDate', () => {
    expect(addDays('2026-07-04', 3)).toBe(shiftDate('2026-07-04', 3))
  })
})

describe('weekdayMon0 / mondayOf', () => {
  // 2025-01-06 é uma segunda-feira.
  it('weekdayMon0: segunda=0 … domingo=6', () => {
    expect(weekdayMon0('2025-01-06')).toBe(0) // seg
    expect(weekdayMon0('2025-01-07')).toBe(1) // ter
    expect(weekdayMon0('2025-01-05')).toBe(6) // dom
  })

  it('mondayOf retorna a segunda da semana', () => {
    expect(mondayOf('2025-01-06')).toBe('2025-01-06') // já é segunda
    expect(mondayOf('2025-01-08')).toBe('2025-01-06') // quarta → segunda
    expect(mondayOf('2025-01-05')).toBe('2024-12-30') // domingo → segunda anterior
  })
})

describe('formatadores', () => {
  it('retornam string vazia para data inválida', () => {
    expect(fmtDateLabel('não-é-data')).toBe('')
    expect(fmtDateShort('nope')).toBe('')
  })

  it('formatam uma data válida (contém o dia)', () => {
    expect(fmtDateLabel('2026-07-04')).toContain('04')
    expect(fmtDateShort('2026-07-04')).toContain('04')
  })
})
