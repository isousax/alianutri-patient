// ══════════════════════════════════════════════════════
//  ProximoPasso — lógica pura do "próximo passo" da Home
//  Sem imports de React/React Native: 100% testável.
// ══════════════════════════════════════════════════════

export type NextStepKind =
  | 'questionnaire'
  | 'meal'
  | 'upcoming'
  | 'water'
  | 'noPlan'
  | 'allDone'

export interface NextStepMeal {
  meal_index: number
  meal_name: string
  /** 'HH:MM' previsto no plano (pode vir vazio/!inválido) */
  meal_time: string
  logged: boolean
}

export interface NextStepInput {
  /** minutos desde a meia-noite (hora local) */
  nowMinutes: number
  meals: NextStepMeal[]
  waterTotalMl: number
  waterGoalMl: number
  pendingQuestionnaires: number
}

export interface NextStep {
  kind: NextStepKind
  title: string
  subtitle: string
  /** rótulo do botão; null quando não há ação (allDone) */
  cta: string | null
  /** rota expo-router; null quando não há ação */
  route: string | null
  /** índice da refeição alvo, quando aplicável */
  mealIndex: number | null
}

const ROUTE_DIARY = '/food-diary'
const ROUTE_WATER = '/water'
const ROUTE_QUESTIONNAIRES = '/questionnaires'

/** Converte 'HH:MM' em minutos desde a meia-noite; null se inválido. */
export function parseTimeToMinutes(time: string | null | undefined): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec((time ?? '').trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h < 0 || h > 23 || min < 0 || min > 59) return null
  return h * 60 + min
}

/** Formata mililitros de forma compacta (sem depender de tokens/RN). */
function fmtMl(ml: number): string {
  return ml >= 1000 ? `${(ml / 1000).toFixed(1).replace('.', ',')}L` : `${ml}ml`
}

/**
 * Decide o "próximo passo" mais relevante para o paciente AGORA.
 *
 * Prioridade:
 *  1. questionário pendente (obrigação externa)
 *  2. refeição já vencida e não registrada (a mais recente)
 *  3. hidratação abaixo da meta
 *  4. próxima refeição futura do dia
 *  5. tudo em dia
 *
 * Função pura — recebe `nowMinutes` injetado para ser determinística.
 */
export function chooseNextStep(input: NextStepInput): NextStep {
  const { nowMinutes, meals, waterTotalMl, waterGoalMl, pendingQuestionnaires } = input

  if (pendingQuestionnaires > 0) {
    return {
      kind: 'questionnaire',
      title:
        pendingQuestionnaires > 1
          ? `${pendingQuestionnaires} questionários pendentes`
          : 'Questionário pendente',
      subtitle: 'Seu nutricionista está aguardando suas respostas',
      cta: 'Responder',
      route: ROUTE_QUESTIONNAIRES,
      mealIndex: null,
    }
  }

  const waterShort = waterGoalMl > 0 && waterTotalMl < waterGoalMl
  const waterStep = (): NextStep => ({
    kind: 'water',
    title: 'Hora de se hidratar',
    subtitle: `Faltam ${fmtMl(Math.max(waterGoalMl - waterTotalMl, 0))} para a meta de hoje`,
    cta: 'Registrar água',
    route: ROUTE_WATER,
    mealIndex: null,
  })

  // Sem plano de refeições — incentivar registro livre.
  if (meals.length === 0) {
    if (waterShort) return waterStep()
    return {
      kind: 'noPlan',
      title: 'Registre sua refeição',
      subtitle: 'Anote o que você comeu para acompanhar seu dia',
      cta: 'Registrar',
      route: ROUTE_DIARY,
      mealIndex: null,
    }
  }

  const unlogged = meals.filter((m) => !m.logged)

  // Vencidas e não registradas (horário <= agora, ou sem horário válido).
  const pastDue = unlogged
    .map((m) => ({ m, t: parseTimeToMinutes(m.meal_time) }))
    .filter(({ t }) => t === null || t <= nowMinutes)
    .sort((a, b) => (a.t ?? -1) - (b.t ?? -1))

  if (pastDue.length > 0) {
    const { m, t } = pastDue[pastDue.length - 1]
    return {
      kind: 'meal',
      title: `Registre: ${m.meal_name}`,
      subtitle: t === null ? 'Toque para registrar' : `Estava previsto para ${m.meal_time}`,
      cta: 'Registrar',
      route: ROUTE_DIARY,
      mealIndex: m.meal_index,
    }
  }

  // Nada vencido — se a água está abaixo da meta, hidratar.
  if (waterShort) return waterStep()

  // Próxima refeição futura do dia.
  const upcoming = unlogged
    .map((m) => ({ m, t: parseTimeToMinutes(m.meal_time) }))
    .filter((x): x is { m: NextStepMeal; t: number } => x.t !== null && x.t > nowMinutes)
    .sort((a, b) => a.t - b.t)

  if (upcoming.length > 0) {
    const { m } = upcoming[0]
    return {
      kind: 'upcoming',
      title: `Próxima: ${m.meal_name}`,
      subtitle: `Prevista para ${m.meal_time}`,
      cta: 'Ver plano',
      route: ROUTE_DIARY,
      mealIndex: m.meal_index,
    }
  }

  // Tudo registrado e hidratação ok.
  return {
    kind: 'allDone',
    title: 'Você está em dia!',
    subtitle: 'Todas as refeições de hoje registradas',
    cta: null,
    route: null,
    mealIndex: null,
  }
}
