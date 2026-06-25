import { memo } from 'react'
import { View, Text, type ViewStyle } from 'react-native'
import Svg, {
  Defs, Stop, Circle,
  LinearGradient as SvgLinearGradient,
  RadialGradient as SvgRadialGradient,
} from 'react-native-svg'
import { radius, typography } from '../theme/tokens'

// Alia brand helpers (inline SVG): wordmark + glow/ring. No raster deps.

let _seq = 0
const uid = (p: string) => `${p}_${(_seq += 1)}`

interface WordmarkProps {
  size?: number
  color?: string
  /** Compat: aceito mas ignorado (o wordmark agora e sempre so o texto). */
  textOnly?: boolean
  style?: ViewStyle
}

/** AliaWordmark - "alianutri" lowercase wordmark in Inter. */
export const AliaWordmark = memo(function AliaWordmark({
  size = 30,
  color = '#0F172A',
  style,
}: WordmarkProps) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
      <Text
        style={{
          ...typography.displaySm,
          fontSize: size * 0.78,
          lineHeight: size * 0.92,
          letterSpacing: -0.6,
          color,
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

/** GlowBlob - soft radial light source for layered backgrounds. */
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

/** BrandRing - gradient ring (3/4 sweep) used as the animated halo. */
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