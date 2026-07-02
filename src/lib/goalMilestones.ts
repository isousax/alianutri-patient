import type { PortalGoal } from '../types/portal'
import { todayISO, habitStreak } from './habit'

// P1-6 — Marcos (milestones) e revisão semanal, calculados no cliente a partir
// das metas que já vêm de GET /goals (sem query extra / sem backend novo).

/** Marcos de progresso numérico (%). */
export const GOAL_MILESTONES = [25, 50, 75, 100] as const

/** Próximo marco de % ainda não alcançado (ou null se já em 100%). */
export function nextGoalMilestone(pct: number): number | null {
  return GOAL_MILESTONES.find((m) => pct < m) ?? null
}

/** Marcos de sequência (streak) de hábito. */
export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100] as const

/** Próximo marco de streak ainda não alcançado (ou null se além do último). */
export function nextStreakMilestone(streak: number): number | null {
  return STREAK_MILESTONES.find((m) => streak < m) ?? null
}

function addDaysISO(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

export interface WeeklySummary {
  checkins: number       // check-ins de hábito nos últimos 7 dias
  bestStreak: number     // melhor sequência ativa entre hábitos
  activeGoals: number    // metas ativas
  reachedGoals: number   // metas ativas que já atingiram o alvo
}

/**
 * Resumo dos últimos 7 dias derivado das metas ativas.
 * Janela: hoje e os 6 dias anteriores (BRT via todayISO).
 */
export function computeWeeklySummary(goals: PortalGoal[]): WeeklySummary {
  const today = todayISO()
  const windowStart = addDaysISO(today, -6)
  const active = goals.filter((g) => g.status === 'active')

  let checkins = 0
  let bestStreak = 0
  for (const g of active) {
    if (g.habit) {
      checkins += g.habit.checkins.filter((d) => d >= windowStart && d <= today).length
      const s = habitStreak(g.habit, today)
      if (s > bestStreak) bestStreak = s
    }
  }

  const reachedGoals = active.filter((g) => g.progress?.reached).length

  return { checkins, bestStreak, activeGoals: active.length, reachedGoals }
}
