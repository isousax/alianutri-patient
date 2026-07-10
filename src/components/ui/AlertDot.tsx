import { useEffect } from 'react'
import { View } from 'react-native'
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, cancelAnimation,
} from 'react-native-reanimated'
import { useThemeColors } from '../../stores/theme'

interface AlertDotProps {
  /** Cor do ponto (default: primary — igual ao badge de chat na tab bar). */
  color?: string
  /** Cor do anel de contorno, para separar o dot do fundo onde é sobreposto. */
  ringColor?: string
  /** Diâmetro do ponto em px (default 8, igual ao da tab bar). */
  size?: number
  /** Pulso "radar" contínuo e lento (default true). */
  pulse?: boolean
}

/**
 * AlertDot — ponto de alerta "algo novo", idêntico ao badge de mensagens não
 * lidas na tab bar (ver app/(tabs)/_layout.tsx: TabIcon). Halo pulsante bem
 * sutil + anel de contorno. Renderize condicionalmente (só quando há pendência).
 */
export function AlertDot({ color, ringColor, size = 8, pulse = true }: AlertDotProps) {
  const t = useThemeColors()
  const dotColor = color ?? t.primary
  const ring = ringColor ?? t.surface
  const p = useSharedValue(0)

  useEffect(() => {
    if (pulse) {
      p.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.out(Easing.ease) }), -1, false)
    } else {
      cancelAnimation(p)
      p.value = 0
    }
    return () => cancelAnimation(p)
  }, [pulse])

  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.4 * (1 - p.value),
    transform: [{ scale: 1 + p.value * 2.2 }],
  }))

  const r = size / 2
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[{ position: 'absolute', width: size, height: size, borderRadius: r, backgroundColor: dotColor }, haloStyle]}
      />
      <View style={{ width: size, height: size, borderRadius: r, backgroundColor: dotColor, borderWidth: 1.5, borderColor: ring }} />
    </View>
  )
}
