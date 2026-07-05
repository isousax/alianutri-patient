import { useEffect, useState } from 'react'
import { View, type ViewStyle, type StyleProp } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated'
import { useThemeColors } from '../../stores/theme'

interface ProgressBarProps {
  /** Progresso de 0 a 1. */
  progress: number
  /** Cor do preenchimento (default: primary). */
  color?: string
  /** Cor do trilho (default: surfaceSecondary). */
  trackColor?: string
  /** Altura da barra em px (o raio acompanha para ficar arredondada). */
  height?: number
  /** Anima a transição do preenchimento (default true). */
  animated?: boolean
  style?: StyleProp<ViewStyle>
}

const clamp01 = (v: number) => (Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0)

/**
 * Barra de progresso fina com preenchimento ANIMADO (withTiming). Substitui os
 * "flex split"/width-% estáticos que pulavam ao mudar o valor (ex.: a adesão do
 * plano ao tocar "Segui"). Mede a largura via onLayout e anima o preenchimento
 * em pixels — mesmo padrão do MacrosBar (robusto no Reanimated).
 */
export function ProgressBar({
  progress,
  color,
  trackColor,
  height = 6,
  animated = true,
  style,
}: ProgressBarProps) {
  const t = useThemeColors()
  const pct = clamp01(progress)
  const [w, setW] = useState(0)
  const p = useSharedValue(animated ? 0 : pct)

  useEffect(() => {
    p.value = animated
      ? withTiming(pct, { duration: 480, easing: Easing.out(Easing.cubic) })
      : pct
  }, [pct, animated, p])

  const fillStyle = useAnimatedStyle(() => ({ width: w * p.value }))

  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={[
        { height, borderRadius: height / 2, backgroundColor: trackColor ?? t.surfaceSecondary, overflow: 'hidden' },
        style,
      ]}
    >
      <Animated.View
        style={[{ height: '100%', borderRadius: height / 2, backgroundColor: color ?? t.primary }, fillStyle]}
      />
    </View>
  )
}
