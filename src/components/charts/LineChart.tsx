import { useEffect } from 'react'
import { View, Text } from 'react-native'
import Svg, { Polyline, Line, Circle, Rect, Defs, LinearGradient, Stop } from 'react-native-svg'
import Animated, { useSharedValue, useAnimatedProps, withTiming, Easing } from 'react-native-reanimated'
import { useThemeColors } from '../../stores/theme'
import { typography, space } from '../../theme/tokens'

const AnimatedPolyline = Animated.createAnimatedComponent(Polyline)

export interface LineChartPoint {
  label: string
  value: number
}

interface LineChartProps {
  data: LineChartPoint[]
  width: number
  height?: number
  color?: string
  /** optional dashed reference line (e.g. nutritionist's target) */
  target?: number | null
  /** optional shaded healthy range (e.g. IMC 18,5–25) drawn behind the line */
  band?: { from: number; to: number; color?: string } | null
  unit?: string
  decimals?: number
}

const PAD_X = 14
const PAD_TOP = 16
const PAD_BOTTOM = 10

/** Reusable evolution line chart — gradient area, animated draw, highlighted last point. */
export function LineChart({ data, width, height = 180, color, target, band, unit, decimals = 1 }: LineChartProps) {
  const t = useThemeColors()
  const stroke = color ?? t.primary

  const chartW = width - PAD_X * 2
  const chartH = height - PAD_TOP - PAD_BOTTOM

  const values = data.map((d) => d.value)
  const all = [...values, ...(target != null ? [target] : []), ...(band ? [band.from, band.to] : [])]
  const minV = all.length ? Math.min(...all) : 0
  const maxV = all.length ? Math.max(...all) : 1
  const span = maxV - minV || 1
  const lo = minV - span * 0.15
  const hi = maxV + span * 0.15
  const rng = hi - lo || 1

  const xAt = (i: number) => PAD_X + (data.length <= 1 ? chartW / 2 : (i / (data.length - 1)) * chartW)
  const yAt = (v: number) => PAD_TOP + chartH - ((v - lo) / rng) * chartH

  const coords = data.map((d, i) => ({ x: xAt(i), y: yAt(d.value) }))
  const linePts = coords.map((c) => `${c.x},${c.y}`).join(' ')
  const areaPts = coords.length
    ? `${coords[0].x},${PAD_TOP + chartH} ${linePts} ${coords[coords.length - 1].x},${PAD_TOP + chartH}`
    : ''

  let len = 0
  for (let i = 1; i < coords.length; i++) {
    len += Math.hypot(coords[i].x - coords[i - 1].x, coords[i].y - coords[i - 1].y)
  }

  const draw = useSharedValue(0)
  useEffect(() => {
    draw.value = 0
    draw.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) })
  }, [linePts])
  const animProps = useAnimatedProps(() => ({ strokeDashoffset: len * (1 - draw.value) }))

  if (data.length === 0) return null

  const fmt = (v: number) => `${v.toFixed(decimals).replace('.', ',')}${unit ? ` ${unit}` : ''}`

  return (
    <View>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="lcArea" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={stroke} stopOpacity="0.18" />
            <Stop offset="1" stopColor={stroke} stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {band && band.to > band.from && (
          <Rect
            x={PAD_X}
            y={yAt(band.to)}
            width={chartW}
            height={yAt(band.from) - yAt(band.to)}
            fill={band.color ?? t.success}
            fillOpacity={0.1}
          />
        )}

        {target != null && (
          <Line
            x1={PAD_X}
            y1={yAt(target)}
            x2={PAD_X + chartW}
            y2={yAt(target)}
            stroke={t.textMuted}
            strokeWidth={1}
            strokeDasharray="4 5"
          />
        )}

        {data.length > 1 && <Polyline points={areaPts} fill="url(#lcArea)" stroke="none" />}

        {data.length > 1 && (
          <AnimatedPolyline
            points={linePts}
            fill="none"
            stroke={stroke}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray={len}
            animatedProps={animProps}
          />
        )}

        {coords.map((c, i) => {
          const isLast = i === coords.length - 1
          return (
            <Circle
              key={i}
              cx={c.x}
              cy={c.y}
              r={isLast ? 4.5 : 2.5}
              fill={isLast ? stroke : t.surface}
              stroke={stroke}
              strokeWidth={isLast ? 2.5 : 1.5}
            />
          )
        })}
      </Svg>

      {/* x-axis: first + last labels */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: PAD_X, marginTop: space.xs }}>
        <Text style={[typography.caption, { color: t.textMuted }]}>{data[0].label}</Text>
        {data.length > 1 && <Text style={[typography.caption, { color: t.textMuted }]}>{data[data.length - 1].label}</Text>}
      </View>

      {/* y range hint */}
      {target != null && (
        <Text style={[typography.caption, { color: t.textMuted, textAlign: 'right', paddingHorizontal: PAD_X, marginTop: 2 }]}>
          Meta: {fmt(target)}
        </Text>
      )}
    </View>
  )
}
