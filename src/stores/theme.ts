import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { THEMES, type AppTheme, type ThemeColors } from '../theme/themes'
export type { ThemeColors }

const THEME_KEY = 'selected_theme'

type ThemeId = AppTheme['id']

interface ThemeState {
  themeId: ThemeId
  setTheme: (id: ThemeId) => void
  hydrateTheme: () => Promise<void>
}

export const useThemeStore = create<ThemeState>((set) => ({
  themeId: 'default',

  setTheme: (id) => {
    AsyncStorage.setItem(THEME_KEY, id)
    set({ themeId: id })
  },

  hydrateTheme: async () => {
    try {
      const stored = await AsyncStorage.getItem(THEME_KEY)
      if (stored && stored in THEMES) {
        set({ themeId: stored as ThemeId })
      }
    } catch {}
  },
}))

export function useTheme(): AppTheme {
  const themeId = useThemeStore((s) => s.themeId)
  return THEMES[themeId]
}

// Backward-compatible color accessor: maps old property names to new ones
// so existing screens compile while being migrated to the new design system.
type CompatColors = ThemeColors & {
  primaryText: string    // → primaryFg
}

export function useThemeColors(): CompatColors {
  const themeId = useThemeStore((s) => s.themeId)
  const c = THEMES[themeId].colors
  return {
    ...c,
    // Legacy aliases
    primaryText: c.primaryFg,
  }
}
