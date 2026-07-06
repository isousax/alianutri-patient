import type { PortalGoal } from "../types/portal";

// Gamification v1 — DERIVADO dos sinais que o paciente já gera (streak de diário,
// dias registrados, metas, check-ins de hábito). Sem motor de pontos persistido:
// tudo é função pura e determinística sobre os dados já carregados.

export type MedalhaKey =
  | "comecou"
  | "em_chamas"
  | "imparavel"
  | "lenda"
  | "diario_fiel"
  | "rotina_forte"
  | "com_foco"
  | "missao_cumprida"
  | "constancia"
  | "fotografo"
  | "diarista"
  | "favorito_da_nutri";

export interface Badge {
  id: string;
  label: string;
  hint: string;
  medalha: MedalhaKey;
  unlocked: boolean;
}

export interface GamificationState {
  level: number;
  xp: number;
  xpInLevel: number;
  xpPerLevel: number;
  streak: number;
  badges: Badge[];
  unlockedCount: number;
}

// Curva de níveis — XP acumulado para alcançar cada nível (1..8).
const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2500, 4000];

// Título humano de cada nível (1..8).
export const LEVEL_TITLES = [
  "Iniciante",
  "Comprometido",
  "Dedicado",
  "Focado",
  "Disciplinado",
  "Transformador",
  "Inspiração",
  "Lenda",
];

export function levelTitle(level: number): string {
  const i = Math.min(Math.max(level, 1), LEVEL_TITLES.length) - 1;
  return LEVEL_TITLES[i];
}

export const MAX_LEVEL = LEVEL_THRESHOLDS.length;

function levelFromXp(xp: number): {
  level: number;
  xpInLevel: number;
  xpPerLevel: number;
} {
  let level = 1;

  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }

  const floor = LEVEL_THRESHOLDS[level - 1];

  if (level >= LEVEL_THRESHOLDS.length) {
    return { level, xpInLevel: 1, xpPerLevel: 1 };
  }

  const ceil = LEVEL_THRESHOLDS[level];

  return {
    level,
    xpInLevel: xp - floor,
    xpPerLevel: ceil - floor,
  };
}

export function computeGamification(params: {
  streak: number;
  loggedDays: number;
  goals: PortalGoal[];
  mealPhotoCount?: number;
  diaryPostCount?: number;
  nutriLikeCount?: number;
  nutriCommentCount?: number;
}): GamificationState {
  const {
    streak,
    loggedDays,
    goals,
    mealPhotoCount = 0,
    diaryPostCount = 0,
    nutriLikeCount = 0,
    nutriCommentCount = 0,
  } = params;

  const goalsActive = goals.filter((g) => g.status === "active").length;
  const goalsCompleted = goals.filter(
    (g) => g.status === "completed",
  ).length;

  const habitCheckins = goals.reduce(
    (n, g) => n + (g.habit?.checkins?.length ?? 0),
    0,
  );

  const xp =
    streak * 10 +
    loggedDays * 8 +
    goalsActive * 20 +
    goalsCompleted * 80 +
    habitCheckins * 4 +
    nutriLikeCount * 5 +
    nutriCommentCount * 10;

  const { level, xpInLevel, xpPerLevel } = levelFromXp(xp);

  const b = (
    id: string,
    label: string,
    hint: string,
    medalha: MedalhaKey,
    unlocked: boolean,
  ): Badge => ({
    id,
    label,
    hint,
    medalha,
    unlocked,
  });

  const badges: Badge[] = [
    b("streak3", "Começou!", "3 dias seguidos de registro", "comecou", streak >= 3),
    b("streak7", "Em chamas", "7 dias seguidos", "em_chamas", streak >= 7),
    b("streak30", "Imparável", "30 dias seguidos", "imparavel", streak >= 30),
    b("streak100", "Lenda", "100 dias seguidos", "lenda", streak >= 100),

    b("logged7", "Diário fiel", "7 dias registrados", "diario_fiel", loggedDays >= 7),
    b("logged30", "Rotina forte", "30 dias registrados", "rotina_forte", loggedDays >= 30),

    b(
      "firstGoal",
      "Com foco",
      "1ª meta definida",
      "com_foco",
      goalsActive + goalsCompleted >= 1,
    ),
    b(
      "goalDone",
      "Missão cumprida",
      "Concluiu uma meta",
      "missao_cumprida",
      goalsCompleted >= 1,
    ),

    b("habit", "Constância", "10 check-ins de hábito", "constancia", habitCheckins >= 10),

    b("photographer", "Fotógrafo", "30 fotos de refeição", "fotografo", mealPhotoCount >= 30),
    b("diarist", "Diarista", "10 momentos no diário", "diarista", diaryPostCount >= 10),

    b(
      "nutriFav",
      "Favorito do Nutri",
      "20 curtidas do seu nutri",
      "favorito_da_nutri",
      nutriLikeCount >= 20,
    ),
  ];

  return {
    level,
    xp,
    xpInLevel,
    xpPerLevel,
    streak,
    badges,
    unlockedCount: badges.filter((b) => b.unlocked).length,
  };
}

export interface WeeklyChallenge {
  id: string;
  label: string;
  hint: string;
  medalha: MedalhaKey;
  current: number;
  target: number;
  done: boolean;
}

const STREAK_TARGETS = [7, 14, 30, 60, 90];

export function nextStreakMilestone(streak: number): number {
  return (
    STREAK_TARGETS.find((m) => m > streak) ??
    STREAK_TARGETS[STREAK_TARGETS.length - 1]
  );
}

export function computeWeeklyChallenges(params: {
  loggedDaysThisWeek: number;
  waterDaysThisWeek: number;
  postsThisWeek: number;
  streak: number;
}): WeeklyChallenge[] {
  const { loggedDaysThisWeek, waterDaysThisWeek, postsThisWeek, streak } =
    params;

  const mk = (
    id: string,
    label: string,
    hint: string,
    medalha: MedalhaKey,
    current: number,
    target: number,
  ): WeeklyChallenge => ({
    id,
    label,
    hint,
    medalha,
    current: Math.max(0, Math.min(current, target)),
    target,
    done: current >= target,
  });

  return [
    mk(
      "log5",
      "Diário em dia",
      "Registre em 5 dias nesta semana",
      "diario_fiel",
      loggedDaysThisWeek,
      5,
    ),
    mk(
      "water7",
      "Hidratação diária",
      "Beba água em 7 dias",
      "constancia",
      waterDaysThisWeek,
      7,
    ),
    mk(
      "streak",
      "Mantenha a sequência",
      `Chegue a ${nextStreakMilestone(streak)} dias seguidos`,
      "em_chamas",
      streak,
      nextStreakMilestone(streak),
    ),
    mk(
      "share3",
      "Compartilhe momentos",
      "Poste 3 vezes no diário",
      "diarista",
      postsThisWeek,
      3,
    ),
  ];
}