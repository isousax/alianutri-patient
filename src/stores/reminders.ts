import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = 'alianutri_reminders'
const DEFAULTS: Record<string, boolean> = {
  breakfast: true,
  lunch: true,
  water: true,
  dinner: true,
  weight: true,
}

interface RemindersState {
  enabled: Record<string, boolean>
  loaded: boolean
  toggle: (id: string) => void
  hydrate: () => Promise<void>
}

export const useRemindersStore = create<RemindersState>((set, get) => ({
  enabled: DEFAULTS,
  loaded: false,
  toggle: (id) => {
    const next = { ...get().enabled, [id]: !get().enabled[id] }
    set({ enabled: next })
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {})
  },
  hydrate: async () => {
    if (get().loaded) return
    try {
      const raw = await AsyncStorage.getItem(KEY)
      if (raw) {
        const parsed: unknown = JSON.parse(raw)
        if (parsed && typeof parsed === 'object') {
          set({ enabled: { ...DEFAULTS, ...(parsed as Record<string, boolean>) }, loaded: true })
          return
        }
      }
      set({ loaded: true })
    } catch {
      set({ loaded: true })
    }
  },
}))
