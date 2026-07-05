import { create } from 'zustand'
import { Appearance } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { THEMES, type AppTheme, type ThemeColors } from '../theme/themes'
export type { ThemeColors }

// ── Aparência ──
// A escolha do usuário é decomposta em (1) MODO e (2) IDENTIDADE CLARA:
//   • mode: 'system' segue o SO · 'light' força claro · 'dark' força Noturno.
//   • lightTheme: qual tema claro usar (Natureza ou Rosé) — vale no modo claro E
//     quando o sistema está claro. O escuro é sempre Noturno (único tema escuro).
// `themeId` é DERIVADO desses sinais (mode + lightTheme + esquema do SO).

const MODE_KEY = 'appearance_mode'
const LIGHT_KEY = 'appearance_light'
const LEGACY_KEY = 'selected_theme' // formato antigo (tema único) — migrado 1x

type ThemeId = AppTheme['id']
export type AppearanceMode = 'system' | 'light' | 'dark'
export type LightThemeId = 'default' | 'rose'
type SystemScheme = 'light' | 'dark'

const DARK_ID: ThemeId = 'amethyst'

function resolveThemeId(mode: AppearanceMode, lightTheme: LightThemeId, system: SystemScheme): ThemeId {
  if (mode === 'dark') return DARK_ID
  if (mode === 'light') return lightTheme
  return system === 'dark' ? DARK_ID : lightTheme
}

// Guardado em try/catch: em ambiente de teste o Appearance pode não existir.
function currentSystem(): SystemScheme {
  try {
    return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

let listenerAttached = false

interface ThemeState {
  mode: AppearanceMode
  lightTheme: LightThemeId
  system: SystemScheme
  themeId: ThemeId
  setMode: (m: AppearanceMode) => void
  setLightTheme: (id: LightThemeId) => void
  setSystem: (s: SystemScheme) => void
  hydrateTheme: () => Promise<void>
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'system',
  lightTheme: 'default',
  system: currentSystem(),
  themeId: resolveThemeId('system', 'default', currentSystem()),

  setMode: (mode) => {
    AsyncStorage.setItem(MODE_KEY, mode)
    const { lightTheme, system } = get()
    set({ mode, themeId: resolveThemeId(mode, lightTheme, system) })
  },

  setLightTheme: (lightTheme) => {
    AsyncStorage.setItem(LIGHT_KEY, lightTheme)
    const { mode, system } = get()
    set({ lightTheme, themeId: resolveThemeId(mode, lightTheme, system) })
  },

  setSystem: (system) => {
    const { mode, lightTheme } = get()
    set({ system, themeId: resolveThemeId(mode, lightTheme, system) })
  },

  hydrateTheme: async () => {
    try {
      const [mode, light, legacy] = await Promise.all([
        AsyncStorage.getItem(MODE_KEY),
        AsyncStorage.getItem(LIGHT_KEY),
        AsyncStorage.getItem(LEGACY_KEY),
      ])
      const system = currentSystem()
      let nextMode: AppearanceMode = mode === 'light' || mode === 'dark' || mode === 'system' ? mode : 'system'
      let nextLight: LightThemeId = light === 'rose' ? 'rose' : 'default'

      // Migração 1x da escolha antiga (tema único) para o novo modelo.
      if (!mode && legacy) {
        if (legacy === 'amethyst') nextMode = 'dark'
        else if (legacy === 'rose') { nextMode = 'light'; nextLight = 'rose' }
        else if (legacy === 'default') { nextMode = 'light'; nextLight = 'default' }
        AsyncStorage.setItem(MODE_KEY, nextMode)
        AsyncStorage.setItem(LIGHT_KEY, nextLight)
        AsyncStorage.removeItem(LEGACY_KEY)
      }

      set({ mode: nextMode, lightTheme: nextLight, system, themeId: resolveThemeId(nextMode, nextLight, system) })

      // Reage ao claro/escuro do SO em tempo real (só afeta o modo 'system').
      if (!listenerAttached) {
        listenerAttached = true
        try {
          Appearance.addChangeListener(({ colorScheme }) => {
            useThemeStore.getState().setSystem(colorScheme === 'dark' ? 'dark' : 'light')
          })
        } catch {}
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
