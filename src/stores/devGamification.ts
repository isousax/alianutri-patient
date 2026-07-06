import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'

// ══════════════════════════════════════════════════════
//  DEV-ONLY: overrides locais de gamificação
//  Permite SIMULAR desbloqueio de medalhas e progressão de nível/XP
//  SEM tocar no backend nem nos sinais reais do paciente. Persistido
//  localmente (AsyncStorage) para as simulações sobreviverem à navegação
//  e a reloads; totalmente limpável. Só é hidratado/mutado em __DEV__.
// ══════════════════════════════════════════════════════

const UNLOCKED_KEY = 'dev_gam_unlocked'
const XP_KEY = 'dev_gam_xp'

interface DevGamState {
  unlockedIds: string[]
  xpOverride: number | null
  hydrated: boolean
  hydrate: () => Promise<void>
  toggleBadge: (id: string) => void
  unlockAll: (ids: string[]) => void
  clearBadges: () => void
  setXpOverride: (xp: number | null) => void
  reset: () => void
}

function persistUnlocked(ids: string[]) {
  AsyncStorage.setItem(UNLOCKED_KEY, JSON.stringify(ids)).catch(() => {})
}

function persistXp(xp: number | null) {
  if (xp == null) AsyncStorage.removeItem(XP_KEY).catch(() => {})
  else AsyncStorage.setItem(XP_KEY, String(xp)).catch(() => {})
}

export const useDevGamStore = create<DevGamState>((set, get) => ({
  unlockedIds: [],
  xpOverride: null,
  hydrated: false,

  hydrate: async () => {
    try {
      const [rawIds, rawXp] = await Promise.all([
        AsyncStorage.getItem(UNLOCKED_KEY),
        AsyncStorage.getItem(XP_KEY),
      ])
      let unlockedIds: string[] = []
      if (rawIds) {
        try {
          const parsed: unknown = JSON.parse(rawIds)
          if (Array.isArray(parsed)) unlockedIds = parsed.filter((x): x is string => typeof x === 'string')
        } catch {
          unlockedIds = []
        }
      }
      const n = rawXp != null ? Number(rawXp) : NaN
      const xpOverride = Number.isFinite(n) ? n : null
      set({ unlockedIds, xpOverride, hydrated: true })
    } catch {
      set({ hydrated: true })
    }
  },

  toggleBadge: (id) => {
    const cur = get().unlockedIds
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    persistUnlocked(next)
    set({ unlockedIds: next })
  },

  unlockAll: (ids) => {
    const next = Array.from(new Set([...get().unlockedIds, ...ids]))
    persistUnlocked(next)
    set({ unlockedIds: next })
  },

  clearBadges: () => {
    persistUnlocked([])
    set({ unlockedIds: [] })
  },

  setXpOverride: (xp) => {
    persistXp(xp)
    set({ xpOverride: xp })
  },

  reset: () => {
    persistUnlocked([])
    persistXp(null)
    set({ unlockedIds: [], xpOverride: null })
  },
}))
