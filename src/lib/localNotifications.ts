import * as Device from 'expo-device'
import Constants from 'expo-constants'

// Lembretes locais de engajamento — funcionam sem backend.
// Mensagens rotacionam a cada reagendamento (a cada abertura do app/config change).

const isExpoGo = Constants.appOwnership === 'expo'

export interface ReminderDef {
  id: string
  label: string
  hour: number
  minute: number
  title: string
  pool: string[]
}

export const REMINDERS: ReminderDef[] = [
  {
    id: 'breakfast',
    label: 'Café da manhã (09:00)',
    hour: 9,
    minute: 0,
    title: 'Café da manhã ☀️',
    pool: [
      'Bom dia! Já registrou seu café da manhã?',
      'Comece bem o dia — anote seu café ☕',
      'Que tal registrar o café da manhã agora?',
    ],
  },
  {
    id: 'lunch',
    label: 'Almoço (12:30)',
    hour: 12,
    minute: 30,
    title: 'Hora do almoço 🍽',
    pool: [
      'Hora do almoço! Registre sua refeição',
      'Não esqueça de anotar o almoço 😋',
      'Almoçou? Registra pra manter o foco',
    ],
  },
  {
    id: 'water',
    label: 'Hidratação (15:00)',
    hour: 15,
    minute: 0,
    title: 'Hidratação 💧',
    pool: [
      'Já bebeu água hoje?',
      'Pausa pra um copo d’água 💧',
      'Hidratação em dia? Bora bater a meta',
    ],
  },
  {
    id: 'dinner',
    label: 'Jantar (19:00)',
    hour: 19,
    minute: 0,
    title: 'Jantar 🌙',
    pool: [
      'Como foi o jantar? Registre pra manter seu streak',
      'Anota o jantar antes de relaxar 🌙',
      'Último registro do dia: o jantar!',
    ],
  },
  {
    id: 'weight',
    label: 'Peso (21:00)',
    hour: 21,
    minute: 0,
    title: 'Antes de dormir 🌟',
    pool: [
      'Que tal registrar seu peso hoje?',
      'Um minutinho pra anotar seu peso 💪',
      'Fecha o dia registrando seu progresso',
    ],
  },
]

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

/** Cancels and re-schedules all enabled daily reminders. */
export async function rescheduleReminders(enabled: Record<string, boolean>): Promise<void> {
  if (isExpoGo || !Device.isDevice) return
  const ok = await ensureNotificationPermission()
  if (!ok) return

  const Notifications = await import('expo-notifications')
  await Notifications.cancelAllScheduledNotificationsAsync()

  for (const r of REMINDERS) {
    if (!enabled[r.id]) continue
    await Notifications.scheduleNotificationAsync({
      content: { title: r.title, body: pick(r.pool), sound: true },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: r.hour,
        minute: r.minute,
      },
    })
  }
}
