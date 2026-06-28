import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Dia (YYYY-MM-DD) em que o paciente dispensou a "Dica do dia".
// Não é dado clínico → AsyncStorage simples (não cifrado).
const DAILY_TIP_DISMISSED_KEY = 'daily_tip_dismissed_date'

interface DailyTipState {
  /** Último dia em que a dica foi dispensada ('' = nunca). */
  dismissedDate: string
  hydrated: boolean
  /** Marca a dica como dispensada para o dia informado. */
  dismiss: (dateStr: string) => void
}

export const useDailyTipStore = create<DailyTipState>((set) => {
  // auto-hidrata na criação
  AsyncStorage.getItem(DAILY_TIP_DISMISSED_KEY)
    .then((v) => set({ dismissedDate: v ?? '', hydrated: true }))
    .catch(() => set({ hydrated: true }))

  return {
    dismissedDate: '',
    hydrated: false,
    dismiss: (dateStr: string) => {
      AsyncStorage.setItem(DAILY_TIP_DISMISSED_KEY, dateStr).catch(() => {})
      set({ dismissedDate: dateStr })
    },
  }
})
