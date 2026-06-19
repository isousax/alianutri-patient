import { memo } from 'react'
import { View, Text, type ViewStyle } from 'react-native'
import Svg, {
  Path, Defs, Stop, Circle,
  LinearGradient as SvgLinearGradient,
  RadialGradient as SvgRadialGradient,
} from 'react-native-svg'
import { radius, typography } from '../theme/tokens'

// ══════════════════════════════════════════════════════
//  ALIA BRAND — inline SVG (no raster/asset dependency)
//  A single, recognizable leaf glyph + lowercase wordmark.
//  Fully themeable; renders crisp at any size; tintable.
// ══════════════════════════════════════════════════════

let _seq = 0
const uid = (p: string) => `${p}_${(_seq += 1)}`

interface LeafProps {
  size?: number
  /** Gradient stops for the leaf body (top → bottom). */
  from?: string
  to?: string
  /** Solid override (ignores gradient) — e.g. monochrome lockups. */
  solid?: string
  /** Center-vein color (defaults to a translucent white). */
  vein?: string
}

/**
 * The Alia leaf — a calm, symmetric two-lobe leaf with a soft inner
 * highlight and a center vein. Drawn on a 32×32 grid.
 */
export const AliaLeaf = memo(function AliaLeaf({
  size = 40,
  from = '#34D399',
  to = '#0D9488',
  solid,
  vein = 'rgba(255,255,255,0.55)',
}: LeafProps) {
  const gid = uid('leaf')
  const hid = uid('leafHi')
  const fill = solid ?? `url(#${gid})`

  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Defs>
        <SvgLinearGradient id={gid} x1="16" y1="2" x2="16" y2="30" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={from} />
          <Stop offset="1" stopColor={to} />
        </SvgLinearGradient>
        <SvgLinearGradient id={hid} x1="9" y1="5" x2="16" y2="28" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.55} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </SvgLinearGradient>
      </Defs>

      {/* leaf body */}
      <Path d="M16 2 C 26 8.5, 26.5 22, 16 30 C 5.5 22, 6 8.5, 16 2 Z" fill={fill} />
      {/* inner highlight on the left lobe (adds dimension) */}
      {!solid && (
        <Path d="M16 4.5 C 9.5 10, 8.8 20, 14.4 27.5 C 10.8 20, 11 11, 16 4.5 Z" fill={`url(#${hid})`} />
      )}
      {/* center vein */}
      <Path d="M16 6 C 16 14, 16 20, 16 27" stroke={vein} strokeWidth={1.4} strokeLinecap="round" />
      {/* two side veins */}
      <Path d="M16 13 C 18.6 13.4, 20 14.6, 21 16.4" stroke={vein} strokeWidth={1} strokeLinecap="round" opacity={0.8} />
      <Path d="M16 18.5 C 13.4 18.9, 12 20, 11 21.8" stroke={vein} strokeWidth={1} strokeLinecap="round" opacity={0.8} />
    </Svg>
  )
})

interface MarkProps {
  size?: number
  /** Tile gradient (top-left → bottom-right). */
  from?: string
  to?: string
  /** When true, renders the tile in a translucent "glass" style. */
  glass?: boolean
  glassTint?: string
  leafFrom?: string
  leafTo?: string
  style?: ViewStyle
}

/**
 * AliaMark — the leaf inside a rounded "app-icon" tile.
 * Used as the hero lockup on splash / login.
 */
export const AliaMark = memo(function AliaMark({
  size = 96,
  from = '#10B981',
  to = '#0D9488',
  glass = false,
  glassTint = 'rgba(255,255,255,0.16)',
  leafFrom = '#FFFFFF',
  leafTo = '#D1FAE5',
  style,
}: MarkProps) {
  const gid = uid('mark')
  const br = size * 0.26
  const leafSize = size * 0.56

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: br,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        },
        glass
          ? { backgroundColor: glassTint, borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)' }
          : null,
        style,
      ]}
    >
      {!glass && (
        <Svg width={size} height={size} style={{ position: 'absolute' }} viewBox="0 0 100 100">
          <Defs>
            <SvgLinearGradient id={gid} x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor={from} />
              <Stop offset="1" stopColor={to} />
            </SvgLinearGradient>
          </Defs>
          <Path d="M0 0 H100 V100 H0 Z" fill={`url(#${gid})`} />
        </Svg>
      )}
      <AliaLeaf size={leafSize} from={leafFrom} to={leafTo} vein="rgba(13,148,136,0.45)" />
    </View>
  )
})

interface WordmarkProps {
  /** Visual height of the leaf glyph; text scales with it. */
  size?: number
  color?: string
  leafFrom?: string
  leafTo?: string
  /** Render only the wordmark text, no leaf. */
  textOnly?: boolean
  style?: ViewStyle
}

/**
 * AliaWordmark — leaf + "alianutri" lowercase wordmark in Inter.
 */
export const AliaWordmark = memo(function AliaWordmark({
  size = 30,
  color = '#0F172A',
  leafFrom = '#10B981',
  leafTo = '#14B8A6',
  textOnly = false,
  style,
}: WordmarkProps) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
      {!textOnly && <AliaLeaf size={size} from={leafFrom} to={leafTo} vein="rgba(255,255,255,0.6)" />}
      <Text
        style={{
          ...typography.displaySm,
          fontSize: size * 0.78,
          lineHeight: size * 0.92,
          letterSpacing: -0.6,
          color,
          marginLeft: textOnly ? 0 : size * 0.26,
        }}
      >
        alianutri
      </Text>
    </View>
  )
})

interface GlowBlobProps {
  size: number
  color: string
  /** Peak opacity at the center of the blob. */
  opacity?: number
  style?: ViewStyle
}

/**
 * GlowBlob — a soft radial light source for layered backgrounds
 * (splash / login / onboarding). Pure SVG radial gradient, no blur lib.
 */
export const GlowBlob = memo(function GlowBlob({ size, color, opacity = 0.5, style }: GlowBlobProps) {
  const id = uid('glow')
  return (
    <View pointerEvents="none" style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgRadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={opacity} />
            <Stop offset="0.6" stopColor={color} stopOpacity={opacity * 0.35} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </SvgRadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
      </Svg>
    </View>
  )
})

interface RingProps {
  size: number
  strokeWidth?: number
  from?: string
  to?: string
  trackColor?: string
}

/**
 * BrandRing — a gradient ring (3/4 sweep) used as the animated halo
 * around the splash mark. Rotate it via an Animated.View wrapper.
 */
export const BrandRing = memo(function BrandRing({
  size,
  strokeWidth = 3,
  from = '#34D399',
  to = '#818CF8',
  trackColor = 'rgba(255,255,255,0.12)',
}: RingProps) {
  const id = uid('ring')
  const r = (size - strokeWidth) / 2
  const c = 2 * Math.PI * r
  return (
    <Svg width={size} height={size}>
      <Defs>
        <SvgLinearGradient id={id} x1="0" y1="0" x2={size} y2={size} gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={from} />
          <Stop offset="1" stopColor={to} />
        </SvgLinearGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={`url(#${id})`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={`${c * 0.72} ${c}`}
        fill="none"
        rotation={-90}
        origin={`${size / 2}, ${size / 2}`}
      />
    </Svg>
  )
})

// kept for back-compat with the radius token import elsewhere
export const BRAND_TILE_RADIUS = radius['2xl']
