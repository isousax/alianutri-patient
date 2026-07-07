import { useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, interpolate, Extrapolation, Easing, runOnJS,
} from 'react-native-reanimated'
import { haptics } from '../../lib/haptics'
import { Sparkles } from 'lucide-react-native'
import { useThemeColors } from '../../stores/theme'
import { typography, radius, space, shadows } from '../../theme/tokens'
import { useXpToast } from '../../stores/xpToast'
import {XPUpIcon} from './XPUpIcon'

/**
 * Overlay global de recompensa: mostra "+N XP" flutuando pra cima e sumindo.
 * Renderizar uma vez no layout raiz; disparar com useXpToast.getState().show(n).
 */
export function XpToast() {
  const t = useThemeColors()
  const amount = useXpToast((s) => s.amount)
  const token = useXpToast((s) => s.token)
  const clear = useXpToast((s) => s.clear)
  const p = useSharedValue(0)

  useEffect(() => {
    if (amount == null) return
    haptics.success()
    p.value = 0
    p.value = withTiming(1, { duration: 1300, easing: Easing.out(Easing.quad) }, (finished) => {
      if (finished) runOnJS(clear)()
    })
  }, [token])

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 0.12, 0.7, 1], [0, 1, 1, 0]),
    transform: [
      { translateY: interpolate(p.value, [0, 1], [12, -54]) },
      { scale: interpolate(p.value, [0, 0.12], [0.8, 1], Extrapolation.CLAMP) },
    ],
  }))

  if (amount == null) return null

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
      <Animated.View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.xs,
            paddingHorizontal: space.lg,
            paddingVertical: space.sm + 2,
            borderRadius: radius.full,
            backgroundColor: t.primary,
            ...shadows.glow(t.primary),
          },
          style,
        ]}
      >
        <XPUpIcon size={35} />
        <Text style={[typography.headingSm, { color: t.primaryFg }]}>+{amount} XP</Text>
      </Animated.View>
    </View>
  )
}
