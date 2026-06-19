import { Platform, type TextStyle, type ViewStyle } from 'react-native'

// ══════════════════════════════════════════════════════
//  ALIA DESIGN SYSTEM — Semantic Tokens
//  "Calm Confidence" — premium healthtech visual language
// ══════════════════════════════════════════════════════

// ── Spacing scale (4px base, golden ratio inspired) ──

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
} as const

// Screen-level horizontal padding (generous, Apple-like)
export const SCREEN_PADDING = 20

// ── Border radius scale ──

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
} as const

// ── Elevation / Shadows ──

export const shadows = {
  none: {} as ViewStyle,

  sm: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 3,
    },
    android: { elevation: 1 },
    default: {},
  }) ?? {},

  md: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
    },
    android: { elevation: 3 },
    default: {},
  }) ?? {},

  lg: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
    },
    android: { elevation: 6 },
    default: {},
  }) ?? {},

  xl: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
    },
    android: { elevation: 10 },
    default: {},
  }) ?? {},

  // Colored glow for primary buttons
  glow: (color: string): ViewStyle =>
    Platform.select<ViewStyle>({
      ios: {
        shadowColor: color,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
      default: {},
    }) ?? {},
} as const

// ── Typography scale (Inter) ──
// Named semantically, not by size. Every text in the app
// should use one of these — no ad-hoc sizes.

export const typography = {
  // Display — hero numbers, big stats
  displayLg: {
    fontFamily: 'Inter_700Bold',
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.5,
  } satisfies TextStyle,

  displayMd: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.3,
  } satisfies TextStyle,

  displaySm: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.2,
  } satisfies TextStyle,

  // Headings — section titles
  headingLg: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
  } satisfies TextStyle,

  headingMd: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.1,
  } satisfies TextStyle,

  headingSm: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    lineHeight: 20,
  } satisfies TextStyle,

  // Body — readable paragraphs
  bodyLg: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    lineHeight: 24,
  } satisfies TextStyle,

  bodyMd: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
  } satisfies TextStyle,

  bodySm: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  } satisfies TextStyle,

  // Labels — buttons, badges, meta
  labelLg: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    lineHeight: 20,
  } satisfies TextStyle,

  labelMd: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    lineHeight: 18,
  } satisfies TextStyle,

  labelSm: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    lineHeight: 16,
  } satisfies TextStyle,

  // Caption — smallest text, timestamps, units
  caption: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 16,
  } satisfies TextStyle,

  captionBold: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
  } satisfies TextStyle,

  // Overline — section labels (ALL CAPS)
  overline: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  } satisfies TextStyle,
} as const

// ── Animation durations ──

export const motion = {
  fast: 150,
  normal: 250,
  slow: 400,
  spring: { damping: 15, stiffness: 150, mass: 0.8 },
  springBouncy: { damping: 12, stiffness: 180, mass: 0.6 },
} as const

// ── Haptic presets ──

export const haptic = {
  light: 'Light' as const,
  medium: 'Medium' as const,
  heavy: 'Heavy' as const,
  success: 'Success' as const,
  warning: 'Warning' as const,
  error: 'Error' as const,
} as const

// ── Brand gradients (for expo-linear-gradient) ──
// Tríade: emerald (marca) · teal (dados/hidratação) · indigo (acento premium)

export const gradients = {
  brand: ['#10B981', '#14B8A6'] as const,      // emerald -> teal
  brandDeep: ['#047857', '#0D9488'] as const,  // emerald-700 -> teal-600 (hero login)
  premium: ['#10B981', '#6366F1'] as const,    // emerald -> indigo (toque "inteligente")
  night: ['#04221A', '#020617'] as const,      // deep ink (splash/login escuro)
  // very soft tri-tone wash for light backgrounds (onboarding)
  mesh: ['#ECFDF5', '#F0FDFA', '#EEF2FF'] as const,   // emerald-50 -> teal-50 -> indigo-50
  meshDark: ['#04221A', '#020617', '#0B1220'] as const,
} as const

// ── Glass / translucent surfaces (overlays & fixed headers; sem expo-blur) ──

export const glass = {
  lightSurface: 'rgba(255,255,255,0.72)',
  lightBorder: 'rgba(15,23,42,0.06)',
  darkSurface: 'rgba(15,23,42,0.72)',
  darkBorder: 'rgba(255,255,255,0.08)',
  scrim: 'rgba(2,6,23,0.45)',
} as const

// ── Date helpers (centralized, no more duplication) ──

export function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function fmtDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
}

export function fmtDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export function fmtWater(ml: number): string {
  return ml >= 1000 ? `${(ml / 1000).toFixed(1).replace('.', ',')}L` : `${ml}ml`
}
