import { create } from 'zustand'
import { MMKV } from 'react-native-mmkv'
import { THEMES, type AppTheme, type ThemeColors } from '../theme/themes'

const storage = new MMKV({ id: 'theme-storage' })
const THEME_KEY = 'selected_theme'

type ThemeId = AppTheme['id']

interface ThemeState {
  themeId: ThemeId
  setTheme: (id: ThemeId) => void
}

export const useThemeStore = create<ThemeState>((set) => ({
  themeId: (storage.getString(THEME_KEY) as ThemeId) || 'default',

  setTheme: (id) => {
    storage.set(THEME_KEY, id)
    set({ themeId: id })
  },
}))

export function useTheme(): AppTheme {
  const themeId = useThemeStore((s) => s.themeId)
  return THEMES[themeId]
}

export function useThemeColors(): ThemeColors {
  const themeId = useThemeStore((s) => s.themeId)
  return THEMES[themeId].colors
}
