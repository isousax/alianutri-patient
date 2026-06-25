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

// Curva de níveis — XP acumulado para alcançar cada nível (1..8).
// Iniciante · Comprometido · Dedicado · Focado · Disciplinado · Transformador · Inspiração · Lenda
const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2500, 4000]

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
  exercisePostCount?: number
  nutriLikeCount?: number
  nutriCommentCount?: number
}): GamificationState {
  const {
    streak, loggedDays, goals,
    mealPhotoCount = 0, exercisePostCount = 0, nutriLikeCount = 0, nutriCommentCount = 0,
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
    b('athlete', 'Atleta', '10 registros de exercício', 'target', exercisePostCount >= 10),
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
