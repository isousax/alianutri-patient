import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Timestamp (epoch ms) em que o paciente viu o feed pela última vez.
// Não é dado clínico → pode ir em AsyncStorage (não cifrado).
const DIARY_SEEN_KEY = 'diary_seen_at'

interface DiarySeenState {
  seenAt: number
  hydrated: boolean
  markSeen: () => void
}

export const useDiarySeenStore = create<DiarySeenState>((set) => {
  // auto-hidrata na criação
  AsyncStorage.getItem(DIARY_SEEN_KEY)
    .then((v) => {
      const n = v ? Number(v) : 0
      set({ seenAt: Number.isFinite(n) ? n : 0, hydrated: true })
    })
    .catch(() => set({ hydrated: true }))

  return {
    seenAt: 0,
    hydrated: false,
    markSeen: () => {
      const now = Date.now()
      AsyncStorage.setItem(DIARY_SEEN_KEY, String(now)).catch(() => {})
      set({ seenAt: now })
    },
  }
})
