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

    accent: '#6366F1',        // indigo-500 (toques inteligentes)
    accentLight: '#EEF2FF',   // indigo-50

    success: '#059669',       // emerald-600 (DIFFERENT from primary)
    successLight: '#D1FAE5',  // emerald-100
    warning: '#F59E0B',       // amber-500
    warningLight: '#FEF3C7',  // amber-100
    error: '#EF4444',         // red-500
    errorLight: '#FEE2E2',    // red-100
    info: '#14B8A6',          // teal-500 (hidratação/dados)
    infoLight: '#CCFBF1',     // teal-100
  },
}

// ═══════════════════════════════════════════════════════
//  NOTURNO — Emerald/Indigo on deep ink (premium, immersive)
//  Inspired by: WHOOP dark UI + Linear depth (tríade)
// ═══════════════════════════════════════════════════════

const AMETHYST_THEME: AppTheme = {
  id: 'amethyst',
  name: 'Noturno',
  emoji: '🌙',
  dark: true,
  colors: {
    primary: '#34D399',       // emerald-400 (bright on dark)
    primaryLight: '#064E3B',  // emerald-900
    primaryMuted: '#10B981',  // emerald-500
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

    tabBar: '#0F172A',        // slate-900: ELEVADO sobre o bg (#020617). No escuro a
                              // sombra preta some contra o quase-preto — a profundidade
                              // do "sheet flutuante" vem do contraste barra↔fundo.
    tabBarBorder: '#1E293B',
    tabBarInactive: '#64748B',

    accent: '#818CF8',        // indigo-400
    accentLight: '#312E81',   // indigo-900

    success: '#34D399',       // emerald-400
    successLight: '#064E3B',  // emerald-900
    warning: '#FBBF24',       // amber-400
    warningLight: '#78350F',  // amber-900
    error: '#F87171',         // red-400
    errorLight: '#7F1D1D',    // red-900
    info: '#2DD4BF',          // teal-400
    infoLight: '#134E4A',     // teal-900
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

    // Papéis semânticos PADRONIZADOS entre os temas (só o `primary` carrega a
    // identidade): success = verde, info = teal (dados/hidratação), accent = indigo
    // (toque premium). Antes o Rosé usava teal p/ success, indigo p/ info e âmbar p/
    // accent — cruzamento que fazia telas concluídas "parecerem de outro tema".
    accent: '#6366F1',        // indigo-500 (toques inteligentes)
    accentLight: '#EEF2FF',   // indigo-50

    success: '#059669',       // emerald-600 (verde = sucesso, universal)
    successLight: '#D1FAE5',  // emerald-100
    warning: '#F59E0B',       // amber-500
    warningLight: '#FEF3C7',  // amber-100
    error: '#E11D48',         // rose-600
    errorLight: '#FFE4E6',    // rose-100
    info: '#14B8A6',          // teal-500 (hidratação/dados)
    infoLight: '#CCFBF1',     // teal-100
  },
}

export const THEMES: Record<AppTheme['id'], AppTheme> = {
  default: DEFAULT_THEME,
  amethyst: AMETHYST_THEME,
  rose: ROSE_THEME,
}

export const THEME_LIST: AppTheme[] = [DEFAULT_THEME, AMETHYST_THEME, ROSE_THEME]
