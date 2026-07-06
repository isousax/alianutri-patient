import { useEffect } from 'react'
import { View } from 'react-native'
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  interpolate,
  Extrapolation,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { useThemeColors } from '../../stores/theme'
import { shadows } from '../../theme/tokens'
import { MedalhasIcon } from './Medalhas'

// ══════════════════════════════════════════════════════════════
//  PHYSICAL MEDAL — a medalha como OBJETO físico (2.5D)
//  • tilt 3D ao arrastar o dedo sobre ela (perspective rotateX/Y)
//  • brilho especular que varre a superfície conforme a inclinação
//  • profundidade: disco "cunhado" + sombra colorida (glow) fixa no
//    chão, então a medalha parece flutuar acima da superfície
//  • idle discreto: respira/inclina de leve para captar a luz
//  Sem 3D real (three.js): só reanimated + gesture-handler +
//  expo-linear-gradient. Reutilizável (contemplação, celebração…).
//
//  OBS: auto-embrulha o gesto num GestureHandlerRootView próprio para
//  funcionar DENTRO de <Modal> do RN (o root global não alcança lá).
// ══════════════════════════════════════════════════════════════

const MAX_TILT = 14 // graus — sutil, "premium", nunca exagerado

export function PhysicalMedal({
  medalha,
  size = 128,
  interactive = true,
  locked = false,
  idle = true,
}: {
  medalha: string
  size?: number
  /** habilita o tilt por arraste (desligue em listas roláveis) */
  interactive?: boolean
  /** medalha ainda não conquistada — inerte e esmaecida */
  locked?: boolean
  /** micro-animação de "respiro" quando ocioso */
  idle?: boolean
}) {
  const t = useThemeColors()
  const disc = Math.round(size * 1.32) // diâmetro do disco/pedestal
  const SHEEN = disc * 1.7 // faixa de luz maior que o disco p/ varrer
  const sheenOffset = -(SHEEN - disc) / 2

  const liveIdle = idle && !locked
  const liveSheen = !locked

  const ax = useSharedValue(0) // rotateX vindo do gesto
  const ay = useSharedValue(0) // rotateY vindo do gesto
  const engaged = useSharedValue(0) // 0→1 enquanto o dedo está pressionando
  const phase = useSharedValue(0) // loop 0..1 do idle

  useEffect(() => {
    if (liveIdle) {
      phase.value = withRepeat(
        withTiming(1, { duration: 4200, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      )
    } else {
      cancelAnimation(phase)
      phase.value = 0
    }
    return () => cancelAnimation(phase)
  }, [liveIdle])

  const pan = Gesture.Pan()
    .enabled(interactive)
    .onBegin(() => {
      engaged.value = withTiming(1, { duration: 160 })
    })
    .onUpdate((e) => {
      ay.value = interpolate(e.translationX, [-size, size], [-MAX_TILT, MAX_TILT], Extrapolation.CLAMP)
      ax.value = interpolate(e.translationY, [-size, size], [MAX_TILT, -MAX_TILT], Extrapolation.CLAMP)
    })
    .onFinalize(() => {
      engaged.value = withTiming(0, { duration: 420 })
      ax.value = withSpring(0, { damping: 12, stiffness: 120 })
      ay.value = withSpring(0, { damping: 12, stiffness: 120 })
    })

  // Inclinação efetiva = gesto + idle (o idle some enquanto o dedo age).
  const cardStyle = useAnimatedStyle(() => {
    const fade = 1 - engaged.value
    const idleX = liveIdle ? interpolate(phase.value, [0, 1], [-2.5, 2.5]) * fade : 0
    const idleY = liveIdle ? interpolate(phase.value, [0, 1], [3.5, -3.5]) * fade : 0
    return {
      transform: [
        { perspective: 700 },
        { rotateX: `${ax.value + idleX}deg` },
        { rotateY: `${ay.value + idleY}deg` },
        { scale: 1 + engaged.value * 0.05 },
      ],
    }
  })

  const sheenStyle = useAnimatedStyle(() => {
    const fade = 1 - engaged.value
    const idleX = liveIdle ? interpolate(phase.value, [0, 1], [-2.5, 2.5]) * fade : 0
    const idleY = liveIdle ? interpolate(phase.value, [0, 1], [3.5, -3.5]) * fade : 0
    const rx = ax.value + idleX
    const ry = ay.value + idleY
    // o brilho corre na direção OPOSTA à inclinação (como luz real)
    return {
      opacity: 0.26 + engaged.value * 0.32,
      transform: [
        { translateX: interpolate(ry, [-MAX_TILT, MAX_TILT], [disc * 0.55, -disc * 0.55]) },
        { translateY: interpolate(rx, [-MAX_TILT, MAX_TILT], [-disc * 0.55, disc * 0.55]) },
      ],
    }
  })

  const discView = (
    <Animated.View
      style={[
        {
          width: disc,
          height: disc,
          borderRadius: disc / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: locked ? t.surfaceSecondary : t.primaryLight,
          overflow: 'hidden',
        },
        cardStyle,
      ]}
    >
      <View style={{ opacity: locked ? 0.4 : 1 }}>
        <MedalhasIcon medalha={medalha} size={size} />
      </View>

      {liveSheen && (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              width: SHEEN,
              height: SHEEN,
              left: sheenOffset,
              top: sheenOffset,
            },
            sheenStyle,
          ]}
        >
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.6)', 'transparent']}
            locations={[0.32, 0.5, 0.68]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1 }}
          />
        </Animated.View>
      )}
    </Animated.View>
  )

  // Sombra fica no wrapper ESTÁTICO (não inclina) → sensação de "flutuar".
  return (
    <View
      style={{
        width: disc,
        height: disc,
        alignItems: 'center',
        justifyContent: 'center',
        ...(locked ? shadows.md : shadows.glow(t.primary)),
      }}
    >
      {interactive ? (
        <GestureHandlerRootView style={{ width: disc, height: disc }}>
          <GestureDetector gesture={pan}>{discView}</GestureDetector>
        </GestureHandlerRootView>
      ) : (
        discView
      )}
    </View>
  )
}
