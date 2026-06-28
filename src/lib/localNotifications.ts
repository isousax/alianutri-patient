import * as Device from 'expo-device'
import Constants from 'expo-constants'

// Lembretes locais de engajamento — funcionam sem backend.
// Mensagens rotacionam a cada reagendamento (a cada abertura do app/config change).

const isExpoGo = Constants.appOwnership === 'expo'

// Categorias de lembrete exibidas em Configurações (toggles). O agendamento
// real é derivado do plano alimentar e da meta de água — ver ReminderSchedule.
export interface ReminderToggle {
  id: 'meals' | 'water' | 'streak' | 'weight'
  label: string
  description: string
}

export const REMINDER_TOGGLES: ReminderToggle[] = [
  { id: 'meals', label: 'Refeições', description: 'Nos horários do seu plano alimentar' },
  { id: 'water', label: 'Hidratação', description: 'Distribuída ao longo do dia conforme sua meta' },
  { id: 'streak', label: 'Ofensiva', description: 'À noite, para manter sua sequência' },
  { id: 'weight', label: 'Peso', description: 'Lembrete leve no fim do dia' },
]

export interface MealTime {
  name: string
  time: string // 'HH:MM'
}

export interface ReminderSchedule {
  meals?: MealTime[]
  waterGoalMl?: number | null
}

const MEAL_POOL = [
  'Hora da sua refeição — registra pra manter o foco 🍽',
  'Bora registrar essa refeição?',
  'Não esqueça de anotar o que comeu 😋',
]
const WATER_POOL = [
  'Pausa pra um copo d’água 💧',
  'Já bebeu água? Bora bater a meta',
  'Hidratação em dia mantém tudo funcionando 💧',
]
const STREAK_POOL = [
  'Ainda dá tempo de registrar hoje e manter sua sequência!',
  'Não perca seu streak — registre uma refeição �',
  'Falta pouco pro dia acabar: garante seu registro de hoje',
]
const WEIGHT_POOL = [
  'Que tal registrar seu peso hoje?',
  'Um minutinho pra anotar seu peso �',
  'Fecha o dia registrando seu progresso',
]

// Refeições padrão quando ainda não há plano (fallback).
const FALLBACK_MEALS = [
  { name: 'Café da manhã', hour: 9, minute: 0 },
  { name: 'Almoço', hour: 12, minute: 30 },
  { name: 'Jantar', hour: 19, minute: 0 },
]

function parseHM(time: string | null | undefined): { hour: number; minute: number } | null {
  const m = /^(\d{1,2}):(\d{2})/.exec((time ?? '').trim())
  if (!m) return null
  const hour = Number(m[1])
  const minute = Number(m[2])
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  return { hour, minute }
}

// Horários de refeição reais do plano (ou fallback), ordenados e limitados a 6.
function resolveMealTimes(meals?: MealTime[]): { name: string; hour: number; minute: number }[] {
  const parsed = (meals ?? [])
    .map((m) => {
      const hm = parseHM(m.time)
      return hm ? { name: m.name?.trim() || 'Refeição', ...hm } : null
    })
    .filter((x): x is { name: string; hour: number; minute: number } => x !== null)
  const list = parsed.length > 0 ? parsed : FALLBACK_MEALS
  return [...list]
    .sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute))
    .slice(0, 6)
}

// Distribui lembretes de água entre 09:00 e 21:00 conforme a meta, evitando
// colidir (±45 min) com refeições para não gerar excesso de notificações.
function waterTimes(goalMl: number | null | undefined, mealMinutes: number[]): { hour: number; minute: number }[] {
  const goal = goalMl && goalMl > 0 ? goalMl : 2000
  const count = goal >= 3200 ? 5 : goal >= 2400 ? 4 : 3
  const start = 9 * 60
  const end = 21 * 60
  const step = count > 1 ? (end - start) / (count - 1) : 0
  const out: { hour: number; minute: number }[] = []
  for (let i = 0; i < count; i++) {
    const total = Math.round(start + step * i)
    if (mealMinutes.some((mm) => Math.abs(mm - total) < 45)) continue
    out.push({ hour: Math.floor(total / 60), minute: total % 60 })
  }
  return out
}

function pick(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)] ?? pool[0]
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (isExpoGo || !Device.isDevice) return false
  const Notifications = await import('expo-notifications')
  const { status } = await Notifications.getPermissionsAsync()
  if (status === 'granted') return true
  const req = await Notifications.requestPermissionsAsync()
  return req.status === 'granted'
}

/** Cancela e reagenda os lembretes habilitados, usando o plano quando houver. */
export async function rescheduleReminders(
  enabled: Record<string, boolean>,
  schedule: ReminderSchedule = {},
): Promise<void> {
  if (isExpoGo || !Device.isDevice) return
  const ok = await ensureNotificationPermission()
  if (!ok) return

  const Notifications = await import('expo-notifications')
  await Notifications.cancelAllScheduledNotificationsAsync()

  const daily = (hour: number, minute: number, title: string, body: string) =>
    Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
    })

  const meals = resolveMealTimes(schedule.meals)
  const mealMinutes = meals.map((m) => m.hour * 60 + m.minute)

  if (enabled.meals) {
    for (const m of meals) await daily(m.hour, m.minute, m.name, pick(MEAL_POOL))
  }
  if (enabled.water) {
    for (const w of waterTimes(schedule.waterGoalMl, mealMinutes)) {
      await daily(w.hour, w.minute, 'Hidratação 💧', pick(WATER_POOL))
    }
  }
  if (enabled.streak) await daily(21, 0, 'Mantenha sua ofensiva 🔥', pick(STREAK_POOL))
  if (enabled.weight) await daily(22, 0, 'Antes de dormir 🌟', pick(WEIGHT_POOL))
}
