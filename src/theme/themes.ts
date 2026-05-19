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

// ── Padrão (verde, light) ──

const DEFAULT_THEME: AppTheme = {
  id: 'default',
  name: 'Padrão',
  emoji: '🌿',
  dark: false,
  colors: {
    primary: '#16a34a',
    primaryLight: '#f0fdf4',
    primaryMuted: '#bbf7d0',
    primaryText: '#ffffff',

    background: '#ffffff',
    surface: '#f8fafc',
    surfacePressed: '#f1f5f9',

    text: '#0f172a',
    textSecondary: '#64748b',
    textMuted: '#94a3b8',
    textInverse: '#ffffff',

    border: '#e2e8f0',
    borderLight: '#f1f5f9',

    tabBar: '#ffffff',
    tabBarBorder: '#e2e8f0',
    tabBarInactive: '#94a3b8',

    accent: '#f59e0b',
    accentLight: '#fffbeb',

    success: '#16a34a',
    warning: '#d97706',
    error: '#dc2626',
    info: '#2563eb',
  },
}

// ── Ametista (roxo, dark) ──

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
    surface: '#111827',
    surfacePressed: '#1f2937',

    text: '#f9fafb',
    textSecondary: '#9ca3af',
    textMuted: '#6b7280',
    textInverse: '#030712',

    border: '#1f2937',
    borderLight: '#111827',

    tabBar: '#030712',
    tabBarBorder: '#1f2937',
    tabBarInactive: '#6b7280',

    accent: '#a78bfa',
    accentLight: '#1e1b4b',

    success: '#34d399',
    warning: '#fbbf24',
    error: '#f87171',
    info: '#60a5fa',
  },
}

// ── Rosa (rose, light) ──

const ROSE_THEME: AppTheme = {
  id: 'rose',
  name: 'Rosa',
  emoji: '🌸',
  dark: false,
  colors: {
    primary: '#e11d48',
    primaryLight: '#fff1f2',
    primaryMuted: '#fecdd3',
    primaryText: '#ffffff',

    background: '#ffffff',
    surface: '#fef2f2',
    surfacePressed: '#fce7e7',

    text: '#0f172a',
    textSecondary: '#64748b',
    textMuted: '#94a3b8',
    textInverse: '#ffffff',

    border: '#fce7f3',
    borderLight: '#fff1f2',

    tabBar: '#ffffff',
    tabBarBorder: '#fce7f3',
    tabBarInactive: '#94a3b8',

    accent: '#f472b6',
    accentLight: '#fdf2f8',

    success: '#16a34a',
    warning: '#d97706',
    error: '#dc2626',
    info: '#2563eb',
  },
}

export const THEMES: Record<AppTheme['id'], AppTheme> = {
  default: DEFAULT_THEME,
  amethyst: AMETHYST_THEME,
  rose: ROSE_THEME,
}

export const THEME_LIST: AppTheme[] = [DEFAULT_THEME, AMETHYST_THEME, ROSE_THEME]
