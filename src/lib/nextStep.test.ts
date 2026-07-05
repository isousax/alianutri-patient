import { describe, it, expect } from 'vitest'
import { chooseNextStep, parseTimeToMinutes, dayPhase, type NextStepMeal } from './nextStep'

const M = (
  meal_index: number,
  meal_name: string,
  meal_time: string,
  logged: boolean,
): NextStepMeal => ({ meal_index, meal_name, meal_time, logged })

describe('parseTimeToMinutes', () => {
  it('parseia HH:MM válido', () => {
    expect(parseTimeToMinutes('08:00')).toBe(480)
    expect(parseTimeToMinutes('12:30')).toBe(750)
    expect(parseTimeToMinutes('23:59')).toBe(1439)
  })

  it('retorna null para entradas inválidas', () => {
    expect(parseTimeToMinutes('')).toBeNull()
    expect(parseTimeToMinutes('25:00')).toBeNull()
    expect(parseTimeToMinutes('12:60')).toBeNull()
    expect(parseTimeToMinutes('abc')).toBeNull()
    expect(parseTimeToMinutes(null)).toBeNull()
    expect(parseTimeToMinutes(undefined)).toBeNull()
  })
})

describe('chooseNextStep', () => {
  // 13:00 local
  const base = { nowMinutes: 13 * 60, waterTotalMl: 2000, waterGoalMl: 2000, pendingQuestionnaires: 0 }

  it('prioriza questionário pendente acima de tudo', () => {
    const s = chooseNextStep({ ...base, meals: [M(0, 'Almoço', '12:00', false)], pendingQuestionnaires: 2 })
    expect(s.kind).toBe('questionnaire')
    expect(s.title).toContain('2')
    expect(s.route).toBe('/questionnaires')
  })

  it('usa singular para 1 questionário', () => {
    const s = chooseNextStep({ ...base, meals: [], pendingQuestionnaires: 1 })
    expect(s.kind).toBe('questionnaire')
    expect(s.title).toBe('Questionário pendente')
  })

  it('sem plano + água na meta → noPlan', () => {
    const s = chooseNextStep({ ...base, meals: [] })
    expect(s.kind).toBe('noPlan')
    expect(s.route).toBe('/food-diary')
  })

  it('sem plano + água abaixo da meta → water', () => {
    const s = chooseNextStep({ ...base, meals: [], waterTotalMl: 500 })
    expect(s.kind).toBe('water')
    expect(s.route).toBe('/water')
  })

  it('refeição vencida não registrada → meal', () => {
    const meals = [M(0, 'Café', '08:00', true), M(1, 'Almoço', '12:00', false)]
    const s = chooseNextStep({ ...base, meals })
    expect(s.kind).toBe('meal')
    expect(s.title).toContain('Almoço')
    expect(s.mealIndex).toBe(1)
  })

  it('com várias vencidas, escolhe a mais recente', () => {
    const meals = [M(0, 'Café', '08:00', false), M(1, 'Almoço', '12:00', false)]
    const s = chooseNextStep({ ...base, meals })
    expect(s.mealIndex).toBe(1)
  })

  it('refeição vencida tem prioridade sobre hidratação', () => {
    const meals = [M(1, 'Almoço', '12:00', false)]
    const s = chooseNextStep({ ...base, meals, waterTotalMl: 0 })
    expect(s.kind).toBe('meal')
  })

  it('refeição com horário inválido é tratada como vencida (acionável)', () => {
    const meals = [M(0, 'Lanche', '', false)]
    const s = chooseNextStep({ ...base, meals })
    expect(s.kind).toBe('meal')
    expect(s.subtitle).toBe('Toque para registrar')
  })

  it('nada vencido + água abaixo → water', () => {
    const meals = [M(2, 'Jantar', '20:00', false)]
    const s = chooseNextStep({ ...base, meals, waterTotalMl: 500 })
    expect(s.kind).toBe('water')
  })

  it('nada vencido + água ok + próxima refeição futura → upcoming', () => {
    const meals = [M(2, 'Jantar', '20:00', false)]
    const s = chooseNextStep({ ...base, meals })
    expect(s.kind).toBe('upcoming')
    expect(s.title).toContain('Jantar')
    expect(s.mealIndex).toBe(2)
  })

  it('tudo registrado + água ok → allDone (sem rota)', () => {
    const meals = [M(0, 'Café', '08:00', true), M(1, 'Almoço', '12:00', true)]
    const s = chooseNextStep({ ...base, meals })
    expect(s.kind).toBe('allDone')
    expect(s.route).toBeNull()
    expect(s.cta).toBeNull()
  })

  it('tudo registrado + água abaixo → water', () => {
    const meals = [M(0, 'Café', '08:00', true)]
    const s = chooseNextStep({ ...base, meals, waterTotalMl: 500 })
    expect(s.kind).toBe('water')
  })

  it('refeição vencida + sequência viva + nada logado → tom de sequência em risco', () => {
    const meals = [M(1, 'Almoço', '12:00', false)]
    const s = chooseNextStep({ ...base, meals, streak: 5 })
    expect(s.kind).toBe('meal')
    expect(s.subtitle).toContain('sequência')
    expect(s.subtitle).toContain('5 dias')
  })

  it('refeição vencida + sequência viva MAS já logou algo hoje → subtítulo padrão', () => {
    const meals = [M(0, 'Café', '08:00', true), M(1, 'Almoço', '12:00', false)]
    const s = chooseNextStep({ ...base, meals, streak: 5 })
    expect(s.kind).toBe('meal')
    expect(s.subtitle).toBe('Estava previsto para 12:00')
  })

  it('sem streak não injeta tom de sequência (compat)', () => {
    const meals = [M(1, 'Almoço', '12:00', false)]
    const s = chooseNextStep({ ...base, meals })
    expect(s.subtitle).toBe('Estava previsto para 12:00')
  })

  it('próxima refeição de manhã + nada logado → saudação matinal', () => {
    const meals = [M(0, 'Café', '08:00', false)]
    const s = chooseNextStep({ ...base, nowMinutes: 7 * 60, meals })
    expect(s.kind).toBe('upcoming')
    expect(s.subtitle).toContain('Bom dia')
  })

  it('allDone + sequência > 1 → elogio com dias seguidos', () => {
    const meals = [M(0, 'Café', '08:00', true)]
    const s = chooseNextStep({ ...base, meals, streak: 7 })
    expect(s.kind).toBe('allDone')
    expect(s.title).toContain('🔥')
    expect(s.subtitle).toContain('7 dias')
  })
})

describe('dayPhase', () => {
  it('classifica manhã/tarde/noite por minutos locais', () => {
    expect(dayPhase(0)).toBe('morning')
    expect(dayPhase(11 * 60 + 59)).toBe('morning')
    expect(dayPhase(12 * 60)).toBe('afternoon')
    expect(dayPhase(17 * 60 + 59)).toBe('afternoon')
    expect(dayPhase(18 * 60)).toBe('evening')
    expect(dayPhase(23 * 60 + 59)).toBe('evening')
  })
})
