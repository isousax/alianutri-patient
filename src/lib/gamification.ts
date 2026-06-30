import type { PortalGoal } from '../types/portal'

// Gamification v1 — DERIVADO dos sinais que o paciente já gera (streak de diário,
// dias registrados, metas, check-ins de hábito). Sem motor de pontos persistido:
// tudo é função pura e determinística sobre os dados já carregados.

export type BadgeIconKey = 'flame' | 'award' | 'star' | 'target' | 'trophy' | 'utensils' | 'sparkles' | 'droplet'

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

// Curva de níveis — XP acumulado para alcançar cada nível (1..8).
const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2500, 4000]

// Título humano de cada nível (1..8), na ordem da curva acima.
export const LEVEL_TITLES = [
  'Iniciante', 'Comprometido', 'Dedicado', 'Focado',
  'Disciplinado', 'Transformador', 'Inspiração', 'Lenda',
]

/** Título do nível (clampado em 1..8). */
export function levelTitle(level: number): string {
  const i = Math.min(Math.max(level, 1), LEVEL_TITLES.length) - 1
  return LEVEL_TITLES[i]
}

/** Nível máximo da curva (barra de XP cheia, sem "próximo nível"). */
export const MAX_LEVEL = LEVEL_THRESHOLDS.length

function levelFromXp(xp: number): { level: number; xpInLevel: number; xpPerLevel: number } {
  let level = 1
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1
      break
    }
  }
  const floor = LEVEL_THRESHOLDS[level - 1]
  if (level >= LEVEL_THRESHOLDS.length) {
    // Nível máximo: barra cheia.
    return { level, xpInLevel: 1, xpPerLevel: 1 }
  }
  const ceil = LEVEL_THRESHOLDS[level]
  return { level, xpInLevel: xp - floor, xpPerLevel: ceil - floor }
}

export function computeGamification(params: {
  streak: number
  loggedDays: number
  goals: PortalGoal[]
  mealPhotoCount?: number
  diaryPostCount?: number
  nutriLikeCount?: number
  nutriCommentCount?: number
}): GamificationState {
  const {
    streak, loggedDays, goals,
    mealPhotoCount = 0, diaryPostCount = 0, nutriLikeCount = 0, nutriCommentCount = 0,
  } = params
  const goalsActive = goals.filter((g) => g.status === 'active').length
  const goalsCompleted = goals.filter((g) => g.status === 'completed').length
  const habitCheckins = goals.reduce((n, g) => n + (g.habit?.checkins?.length ?? 0), 0)

  const xp =
    streak * 10 + loggedDays * 8 + goalsActive * 20 + goalsCompleted * 80 + habitCheckins * 4 +
    nutriLikeCount * 5 + nutriCommentCount * 10
  const { level, xpInLevel, xpPerLevel } = levelFromXp(xp)

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
    b('photographer', 'Fotógrafo', '30 fotos de refeição', 'utensils', mealPhotoCount >= 30),
    b('diarist', 'Diarista', '10 momentos no diário', 'star', diaryPostCount >= 10),
    b('nutriFav', 'Favorito do Nutri', '20 curtidas do seu nutri', 'star', nutriLikeCount >= 20),
  ]

  return {
    level,
    xp,
    xpInLevel,
    xpPerLevel,
    streak,
    badges,
    unlockedCount: badges.filter((x) => x.unlocked).length,
  }
}

export interface WeeklyChallenge {
  id: string
  label: string
  hint: string
  icon: BadgeIconKey
  current: number
  target: number
  done: boolean
}

const STREAK_TARGETS = [7, 14, 30, 60, 90]

/** Próximo marco de streak ainda não alcançado (ou o máximo da escada). */
export function nextStreakMilestone(streak: number): number {
  return STREAK_TARGETS.find((m) => m > streak) ?? STREAK_TARGETS[STREAK_TARGETS.length - 1]
}

/**
 * Desafios da semana — DERIVADOS client-side dos sinais que o paciente já gera.
 * Sem motor de desafios no back; é uma leitura motivacional do progresso semanal.
 */
export function computeWeeklyChallenges(params: {
  loggedDaysThisWeek: number
  waterDaysThisWeek: number
  postsThisWeek: number
  streak: number
}): WeeklyChallenge[] {
  const { loggedDaysThisWeek, waterDaysThisWeek, postsThisWeek, streak } = params
  const mk = (id: string, label: string, hint: string, icon: BadgeIconKey, current: number, target: number): WeeklyChallenge => ({
    id, label, hint, icon, current: Math.max(0, Math.min(current, target)), target, done: current >= target,
  })
  return [
    mk('log5', 'Diário em dia', 'Registre em 5 dias nesta semana', 'utensils', loggedDaysThisWeek, 5),
    mk('water7', 'Hidratação diária', 'Beba água em 7 dias', 'droplet', waterDaysThisWeek, 7),
    mk('streak', 'Mantenha a sequência', `Chegue a ${nextStreakMilestone(streak)} dias seguidos`, 'flame', streak, nextStreakMilestone(streak)),
    mk('share3', 'Compartilhe momentos', 'Poste 3 vezes no diário', 'star', postsThisWeek, 3),
  ]
}
