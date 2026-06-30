import { useEffect, useId } from 'react'
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native'
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg'
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withDelay,
  interpolate, Easing,
} from 'react-native-reanimated'
import { useThemeColors } from '../../stores/theme'

// ══════════════════════════════════════════════════════
//  AURORA BACKGROUND — "Galaxy AI" soft color blobs
//  Blurred-color aurora behind content. No expo-blur:
//  uses SVG RadialGradient (color → transparent) + slow
//  reanimated drift. Performant, runs on the UI thread.
// ══════════════════════════════════════════════════════

export type AuroraVariant = 'subtle' | 'prominent' | 'hero'

const VARIANT_OPACITY: Record<AuroraVariant, number> = {
  subtle: 0.16,
  prominent: 0.26,
  hero: 0.38,
}

interface BlobSpec {
  color: string
  /** size as fraction of the layer width */
  size: number
  top?: `${number}%`
  left?: `${number}%`
  right?: `${number}%`
  bottom?: `${number}%`
  driftX: number
  driftY: number
  duration: number
  delay: number
}

function BlobSvg({ id, color, size }: { id: string; color: string; size: number }) {
  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={1} />
          <Stop offset="0.55" stopColor={color} stopOpacity={0.5} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
    </Svg>
  )
}

function AuroraBlob({ spec, baseSize }: { spec: BlobSpec; baseSize: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const size = Math.round(baseSize * spec.size)
  const p = useSharedValue(0)

  useEffect(() => {
    p.value = withDelay(
      spec.delay,
      withRepeat(withTiming(1, { duration: spec.duration, easing: Easing.inOut(Easing.sin) }), -1, true),
    )
  }, [])

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(p.value, [0, 1], [0, spec.driftX]) },
      { translateY: interpolate(p.value, [0, 1], [0, spec.driftY]) },
      { scale: interpolate(p.value, [0, 1], [1, 1.14]) },
    ],
  }))

  return (
    <Animated.View
      pointerEvents="none"
      renderToHardwareTextureAndroid
      shouldRasterizeIOS
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          top: spec.top,
          left: spec.left,
          right: spec.right,
          bottom: spec.bottom,
        },
        animStyle,
      ]}
    >
      <BlobSvg id={id} color={spec.color} size={size} />
    </Animated.View>
  )
}

// Static blob: paints the SVG once (no reanimated driver). Use inside
// scrolling lists so we never run continuous animations per row.
function StaticBlob({ spec, baseSize }: { spec: BlobSpec; baseSize: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const size = Math.round(baseSize * spec.size)
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: size,
        height: size,
        top: spec.top,
        left: spec.left,
        right: spec.right,
        bottom: spec.bottom,
      }}
    >
      <BlobSvg id={id} color={spec.color} size={size} />
    </View>
  )
}

interface AuroraBackgroundProps {
  children?: React.ReactNode
  variant?: AuroraVariant
  /** override blob colors; defaults to the brand triad (emerald · teal · indigo) */
  colors?: [string, string] | [string, string, string]
  /** approximate layer width used to scale blobs (defaults to a wide value) */
  baseSize?: number
  /**
   * Drift the blobs with a continuous reanimated loop. Defaults to true.
   * Set false inside scrolling lists (e.g. feed cards) so we don't run
   * many infinite animations at once — that competes with the scroll on
   * the UI thread and causes jank/freezing.
   */
  animated?: boolean
  style?: StyleProp<ViewStyle>
}

export function AuroraBackground({
  children,
  variant = 'subtle',
  colors,
  baseSize = 420,
  animated = true,
  style,
}: AuroraBackgroundProps) {
  const t = useThemeColors()
  const palette = colors ?? [t.primary, t.info, t.accent]

  const blobs: BlobSpec[] = [
    { color: palette[0], size: 0.95, top: '-18%', left: '-12%', driftX: 26, driftY: 18, duration: 9000, delay: 0 },
    { color: palette[1] ?? palette[0], size: 0.85, top: '-8%', right: '-14%', driftX: -22, driftY: 24, duration: 11000, delay: 800 },
    { color: palette[2] ?? palette[1] ?? palette[0], size: 0.8, bottom: '-22%', left: '14%', driftX: 18, driftY: -20, duration: 12500, delay: 1600 },
  ]

  const Blob = animated ? AuroraBlob : StaticBlob

  return (
    <View style={[{ position: 'relative', overflow: 'hidden' }, style]}>
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, { opacity: VARIANT_OPACITY[variant] }]}
      >
        {blobs.map((spec, i) => (
          <Blob key={i} spec={spec} baseSize={baseSize} />
        ))}
      </View>
      {children}
    </View>
  )
}
