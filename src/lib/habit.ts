import type { PortalHabit } from '../types/portal'

// Cálculos de hábito (streak, check-in de hoje) espelhando o backend/dashboard.
// "Hoje" em BRT (UTC-3) para casar com o que o servidor registra.

export function todayISO(): string {
  return new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function mondayOf(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  const dow = (d.getDay() + 6) % 7 // Mon=0
  d.setDate(d.getDate() - dow)
  return d.toISOString().slice(0, 10)
}

export function isCheckedToday(h: PortalHabit, today = todayISO()): boolean {
  return h.checkins.includes(today)
}

export function habitStreak(h: PortalHabit, today = todayISO()): number {
  if (h.cadence === 'weekly') {
    const per = h.per_week ?? 1
    const counts = new Map<string, number>()
    for (const c of h.checkins) { const k = mondayOf(c); counts.set(k, (counts.get(k) ?? 0) + 1) }
    const met = (m: string) => (counts.get(m) ?? 0) >= per
    let monday = mondayOf(today)
    if (!met(monday)) monday = addDays(monday, -7)
    let s = 0
    while (met(monday)) { s++; monday = addDays(monday, -7) }
    return s
  }
  const set = new Set(h.checkins)
  let s = 0
  let cur = set.has(today) ? today : addDays(today, -1)
  while (set.has(cur)) { s++; cur = addDays(cur, -1) }
  return s
}

export function streakUnit(h: PortalHabit, streak: number): string {
  if (h.cadence === 'weekly') return streak === 1 ? 'semana' : 'semanas'
  return streak === 1 ? 'dia' : 'dias'
}

export function cadenceLabel(h: PortalHabit): string {
  return h.cadence === 'weekly' ? `${h.per_week ?? 1}x/semana` : 'diário'
}
