export interface ThemeColors {
  primary: string
  primaryLight: string
  primaryMuted: string
  primaryText: string

  background: string
  surface: string
  surfacePressed: string

  text: string
  textSecondary: string
  textMuted: string
  textInverse: string

  border: string
  borderLight: string

  tabBar: string
  tabBarBorder: string
  tabBarInactive: string

  accent: string
  accentLight: string

  success: string
  warning: string
  error: string
  info: string
}

export interface AppTheme {
  id: 'default' | 'amethyst' | 'rose'
  name: string
  emoji: string
  colors: ThemeColors
  dark: boolean
}

// ── Natureza (emerald on warm stone — organic, calming) ──

const DEFAULT_THEME: AppTheme = {
  id: 'default',
  name: 'Natureza',
  emoji: '🌿',
  dark: false,
  colors: {
    primary: '#059669',
    primaryLight: '#ecfdf5',
    primaryMuted: '#6ee7b7',
    primaryText: '#ffffff',

    background: '#fafaf9',
    surface: '#f5f5f4',
    surfacePressed: '#e7e5e4',

    text: '#1c1917',
    textSecondary: '#57534e',
    textMuted: '#a8a29e',
    textInverse: '#ffffff',

    border: '#e7e5e4',
    borderLight: '#f5f5f4',

    tabBar: '#fafaf9',
    tabBarBorder: '#e7e5e4',
    tabBarInactive: '#a8a29e',

    accent: '#d97706',
    accentLight: '#fffbeb',

    success: '#059669',
    warning: '#d97706',
    error: '#dc2626',
    info: '#0284c7',
  },
}

// ── Ametista (violet on deep ink — premium, immersive) ──

const AMETHYST_THEME: AppTheme = {
  id: 'amethyst',
  name: 'Ametista',
  emoji: '💎',
  dark: true,
  colors: {
    primary: '#8b5cf6',
    primaryLight: '#1e1b4b',
    primaryMuted: '#6d28d9',
    primaryText: '#ffffff',

    background: '#030712',
    surface: '#0f1628',
    surfacePressed: '#1a2540',

    text: '#f1f0fb',
    textSecondary: '#a0a0b8',
    textMuted: '#6b6b80',
    textInverse: '#030712',

    border: '#1e2a44',
    borderLight: '#141d32',

    tabBar: '#030712',
    tabBarBorder: '#1e2a44',
    tabBarInactive: '#6b6b80',

    accent: '#a78bfa',
    accentLight: '#1e1b4b',

    success: '#34d399',
    warning: '#fbbf24',
    error: '#f87171',
    info: '#60a5fa',
  },
}

// ── Rosé (blush pink on petal — garden, feminine, warm) ──

const ROSE_THEME: AppTheme = {
  id: 'rose',
  name: 'Rosé',
  emoji: '🌸',
  dark: false,
  colors: {
    primary: '#db2777',
    primaryLight: '#fce7f3',
    primaryMuted: '#f472b6',
    primaryText: '#ffffff',

    background: '#fdf2f8',
    surface: '#fce7f3',
    surfacePressed: '#fbcfe8',

    text: '#1e0a1b',
    textSecondary: '#764360',
    textMuted: '#c09ab2',
    textInverse: '#ffffff',

    border: '#f5c2db',
    borderLight: '#fce7f3',

    tabBar: '#fdf2f8',
    tabBarBorder: '#f5c2db',
    tabBarInactive: '#c09ab2',

    accent: '#d97706',
    accentLight: '#fef3c7',

    success: '#0d9488',
    warning: '#ea580c',
    error: '#e11d48',
    info: '#7c3aed',
  },
}

export const THEMES: Record<AppTheme['id'], AppTheme> = {
  default: DEFAULT_THEME,
  amethyst: AMETHYST_THEME,
  rose: ROSE_THEME,
}

export const THEME_LIST: AppTheme[] = [DEFAULT_THEME, AMETHYST_THEME, ROSE_THEME]
