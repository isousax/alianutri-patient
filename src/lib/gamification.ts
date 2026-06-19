import type { PortalGoal } from '../types/portal'

// Gamification v1 — DERIVADO dos sinais que o paciente já gera (streak de diário,
// dias registrados, metas, check-ins de hábito). Sem motor de pontos persistido:
// tudo é função pura e determinística sobre os dados já carregados.

export type BadgeIconKey = 'flame' | 'award' | 'star' | 'target' | 'trophy' | 'utensils' | 'sparkles'

export interface Badge {
  id: string
  label: string
  hint: string
  icon: BadgeIconKey
  unlocked: boolean
}

export interface GamificationState {
  level: number
  xp: number
  xpInLevel: number
  xpPerLevel: number
  streak: number
  badges: Badge[]
  unlockedCount: number
}

const XP_PER_LEVEL = 150

export function computeGamification(params: {
  streak: number
  loggedDays: number
  goals: PortalGoal[]
}): GamificationState {
  const { streak, loggedDays, goals } = params
  const goalsActive = goals.filter((g) => g.status === 'active').length
  const goalsCompleted = goals.filter((g) => g.status === 'completed').length
  const habitCheckins = goals.reduce((n, g) => n + (g.habit?.checkins?.length ?? 0), 0)

  const xp = streak * 10 + loggedDays * 8 + goalsActive * 20 + goalsCompleted * 80 + habitCheckins * 4
  const level = Math.floor(xp / XP_PER_LEVEL) + 1
  const xpInLevel = xp % XP_PER_LEVEL

  const b = (id: string, label: string, hint: string, icon: BadgeIconKey, unlocked: boolean): Badge =>
    ({ id, label, hint, icon, unlocked })

  const badges: Badge[] = [
    b('streak3', 'Começou!', '3 dias seguidos de registro', 'flame', streak >= 3),
    b('streak7', 'Em chamas', '7 dias seguidos', 'flame', streak >= 7),
    b('streak30', 'Imparável', '30 dias seguidos', 'award', streak >= 30),
    b('streak100', 'Lenda', '100 dias seguidos', 'trophy', streak >= 100),
    b('logged7', 'Diário fiel', '7 dias registrados', 'utensils', loggedDays >= 7),
    b('logged30', 'Rotina forte', '30 dias registrados', 'utensils', loggedDays >= 30),
    b('firstGoal', 'Com foco', '1ª meta definida', 'target', goalsActive + goalsCompleted >= 1),
    b('goalDone', 'Missão cumprida', 'Concluiu uma meta', 'star', goalsCompleted >= 1),
    b('habit', 'Constância', '10 check-ins de hábito', 'sparkles', habitCheckins >= 10),
  ]

  return {
    level,
    xp,
    xpInLevel,
    xpPerLevel: XP_PER_LEVEL,
    streak,
    badges,
    unlockedCount: badges.filter((x) => x.unlocked).length,
  }
}
