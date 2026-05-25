export interface ThemeColors {
  // ── Brand ──
  primary: string
  primaryLight: string       // tinted bg (e.g. badge background)
  primaryMuted: string       // lighter foreground variant
  primaryFg: string          // text on primary bg

  // ── Surfaces ──
  background: string         // screen bg
  surface: string            // card bg (must contrast against background)
  surfaceSecondary: string   // nested surface / input bg
  surfacePressed: string     // pressed state

  // ── Text ──
  text: string               // primary headings & body
  textSecondary: string      // secondary descriptions
  textMuted: string          // tertiary / disabled
  textInverse: string        // on dark/colored bg

  // ── Borders ──
  border: string             // visible dividers
  borderLight: string        // subtle dividers / track backgrounds
  cardBorder: string         // card outlines (transparent for borderless cards)

  // ── Tab Bar ──
  tabBar: string
  tabBarBorder: string
  tabBarInactive: string

  // ── Accent ──
  accent: string
  accentLight: string

  // ── Semantic ──
  success: string
  successLight: string
  warning: string
  warningLight: string
  error: string
  errorLight: string
  info: string
  infoLight: string
}

export interface AppTheme {
  id: 'default' | 'amethyst' | 'rose'
  name: string
  emoji: string
  colors: ThemeColors
  dark: boolean
}

// ═══════════════════════════════════════════════════════
//  NATUREZA — Emerald on pure white (clean, confident)
//  Inspired by: Apple Health clarity + Oura ring depth
// ═══════════════════════════════════════════════════════

const DEFAULT_THEME: AppTheme = {
  id: 'default',
  name: 'Natureza',
  emoji: '🌿',
  dark: false,
  colors: {
    primary: '#10B981',       // emerald-500 (vibrant, not dark)
    primaryLight: '#ECFDF5',  // emerald-50
    primaryMuted: '#6EE7B7',  // emerald-300
    primaryFg: '#FFFFFF',

    background: '#F8FAFB',    // cool near-white (not warm stone)
    surface: '#FFFFFF',       // TRUE white cards = real depth
    surfaceSecondary: '#F1F5F9', // slate-100
    surfacePressed: '#E2E8F0',   // slate-200

    text: '#0F172A',          // slate-900 (near black, maximum contrast)
    textSecondary: '#475569', // slate-600
    textMuted: '#94A3B8',     // slate-400
    textInverse: '#FFFFFF',

    border: '#E2E8F0',        // slate-200
    borderLight: '#F1F5F9',   // slate-100
    cardBorder: 'transparent', // borderless cards = modern

    tabBar: '#FFFFFF',
    tabBarBorder: '#F1F5F9',
    tabBarInactive: '#94A3B8',

    accent: '#F59E0B',        // amber-500
    accentLight: '#FFFBEB',   // amber-50

    success: '#059669',       // emerald-600 (DIFFERENT from primary)
    successLight: '#D1FAE5',  // emerald-100
    warning: '#F59E0B',       // amber-500
    warningLight: '#FEF3C7',  // amber-100
    error: '#EF4444',         // red-500
    errorLight: '#FEE2E2',    // red-100
    info: '#3B82F6',          // blue-500
    infoLight: '#DBEAFE',     // blue-100
  },
}

// ═══════════════════════════════════════════════════════
//  AMETISTA — Violet on deep ink (premium, immersive)
//  Inspired by: WHOOP dark UI + Linear depth
// ═══════════════════════════════════════════════════════

const AMETHYST_THEME: AppTheme = {
  id: 'amethyst',
  name: 'Ametista',
  emoji: '💎',
  dark: true,
  colors: {
    primary: '#A78BFA',       // violet-400 (bright on dark)
    primaryLight: '#1E1B4B',  // indigo-950
    primaryMuted: '#7C3AED',  // violet-600
    primaryFg: '#FFFFFF',

    background: '#020617',    // slate-950
    surface: '#0F172A',       // slate-900 (visible against bg)
    surfaceSecondary: '#1E293B', // slate-800
    surfacePressed: '#334155',   // slate-700

    text: '#F8FAFC',          // slate-50
    textSecondary: '#CBD5E1', // slate-300
    textMuted: '#64748B',     // slate-500
    textInverse: '#020617',

    border: '#1E293B',        // slate-800
    borderLight: '#0F172A',   // slate-900
    cardBorder: '#1E293B',    // visible borders needed in dark mode

    tabBar: '#020617',
    tabBarBorder: '#1E293B',
    tabBarInactive: '#64748B',

    accent: '#C4B5FD',        // violet-300
    accentLight: '#1E1B4B',

    success: '#34D399',       // emerald-400
    successLight: '#064E3B',  // emerald-900
    warning: '#FBBF24',       // amber-400
    warningLight: '#78350F',  // amber-900
    error: '#F87171',         // red-400
    errorLight: '#7F1D1D',    // red-900
    info: '#60A5FA',          // blue-400
    infoLight: '#1E3A5F',
  },
}

// ═══════════════════════════════════════════════════════
//  ROSÉ — Blush pink on soft petal (warm, feminine)
//  Inspired by: Calm app warmth + Headspace softness
// ═══════════════════════════════════════════════════════

const ROSE_THEME: AppTheme = {
  id: 'rose',
  name: 'Rosé',
  emoji: '🌸',
  dark: false,
  colors: {
    primary: '#EC4899',       // pink-500 (vibrant)
    primaryLight: '#FDF2F8',  // pink-50
    primaryMuted: '#F9A8D4',  // pink-300
    primaryFg: '#FFFFFF',

    background: '#FFFBFE',    // warm near-white
    surface: '#FFFFFF',       // true white cards
    surfaceSecondary: '#FDF2F8', // pink-50
    surfacePressed: '#FCE7F3',   // pink-100

    text: '#1C1917',          // stone-900
    textSecondary: '#57534E', // stone-600
    textMuted: '#A8A29E',     // stone-400
    textInverse: '#FFFFFF',

    border: '#FECDD3',        // rose-200
    borderLight: '#FFF1F2',   // rose-50
    cardBorder: 'transparent',

    tabBar: '#FFFFFF',
    tabBarBorder: '#FFF1F2',
    tabBarInactive: '#A8A29E',

    accent: '#F59E0B',
    accentLight: '#FFFBEB',

    success: '#0D9488',       // teal-600
    successLight: '#CCFBF1',  // teal-100
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    error: '#E11D48',         // rose-600
    errorLight: '#FFE4E6',    // rose-100
    info: '#8B5CF6',          // violet-500
    infoLight: '#EDE9FE',     // violet-100
  },
}

export const THEMES: Record<AppTheme['id'], AppTheme> = {
  default: DEFAULT_THEME,
  amethyst: AMETHYST_THEME,
  rose: ROSE_THEME,
}

export const THEME_LIST: AppTheme[] = [DEFAULT_THEME, AMETHYST_THEME, ROSE_THEME]
