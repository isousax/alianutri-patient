import { useEffect } from 'react'
import { View, Text, Modal } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, {
  FadeIn,
  FadeInUp,
  ZoomIn,
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withDelay,
  interpolate,
  Easing,
} from 'react-native-reanimated'
import { ChevronsUp } from 'lucide-react-native'
import { useThemeColors } from '../../stores/theme'
import { typography, space, shadows } from '../../theme/tokens'
import { haptics } from '../../lib/haptics'
import { sound, type SoundKey } from '../../lib/sound'
import { AuroraBackground, Button } from '../ui'
import { ConfettiCelebration } from '../ui/ConfettiCelebration'
import { RewardLight } from '../ui/RewardLight'
import Svg, { Circle } from 'react-native-svg'
import { getLevelMessage } from '../../data/levelContent'

interface CelebrationModalProps {
  icon?: React.ReactNode
  hero?: React.ReactNode
  eyebrow: string
  title: string
  subtitle?: string
  message?: string
  soundKey?: SoundKey
  onDismiss: () => void
}

/** Generic fullscreen celebration — Aurora hero + confetti + haptics. */
export function CelebrationModal({ icon, hero, eyebrow, title, subtitle, message, soundKey, onDismiss }: CelebrationModalProps) {
  const t = useThemeColors()

  useEffect(() => {
    const stopHaptics = haptics.celebrate()
    if (soundKey) sound.play(soundKey)
    return () => {
      if (soundKey) sound.stop(soundKey)
      stopHaptics()
    }
  }, [])

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss} statusBarTranslucent>
      <AuroraBackground variant="hero" style={{ flex: 1, backgroundColor: t.background }}>
        <ConfettiCelebration />

        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space['3xl'] }}>
          <Animated.View entering={ZoomIn.springify().damping(12)} style={{ alignItems: 'center' }}>
            {hero ? (
              hero
            ) : (
              <View style={{ width: 152, height: 152, alignItems: 'center', justifyContent: 'center' }}>
                <RewardLight size={208} />
                <View
                  style={{
                    width: 112,
                    height: 112,
                    borderRadius: 56,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: t.primary,
                    ...shadows.glow(t.primary),
                  }}
                >
                  {icon}
                </View>
              </View>
            )}
            <Text style={[typography.overline, { color: t.primary, marginTop: space.xl }]}>{eyebrow}</Text>
            <Text style={[typography.displayLg, { color: t.text, marginTop: space.xs, textAlign: 'center' }]}>{title}</Text>
            {subtitle && (
              <Text style={[typography.headingMd, { color: t.textSecondary, marginTop: space.xs, textAlign: 'center' }]}>{subtitle}</Text>
            )}
            <Text style={[typography.bodyMd, { color: t.textMuted, textAlign: 'center', marginTop: space.md }]}>
              {message ?? 'Continue cuidando de você todo dia — cada registro te aproxima dos seus objetivos!'}
            </Text>
          </Animated.View>

          <Animated.View entering={FadeIn.delay(420)} style={{ marginTop: space['4xl'], alignSelf: 'stretch' }}>
            <Button label="Continuar" onPress={onDismiss} fullWidth  />
          </Animated.View>
        </SafeAreaView>
      </AuroraBackground>
    </Modal>
  )
}

const LEVEL_TITLES = [
  'Iniciante', 'Comprometido', 'Dedicado', 'Focado',
  'Disciplinado', 'Transformador', 'Inspiração', 'Lenda',
]
function levelTitle(level: number): string {
  return LEVEL_TITLES[Math.min(Math.max(level - 1, 0), LEVEL_TITLES.length - 1)] ?? 'Lenda'
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

// Anel de nível: fecha (0→100%) ao subir, "cravando" o novo nível no centro.
// O RewardLight por trás dá o brilho; o número entra com o ZoomIn do container.
function LevelRing({ level }: { level: number }) {
  const t = useThemeColors()
  const SIZE = 172
  const STROKE = 10
  const R = (SIZE - STROKE) / 2
  const C = 2 * Math.PI * R
  const p = useSharedValue(0)
  useEffect(() => {
    p.value = withDelay(220, withTiming(1, { duration: 950, easing: Easing.out(Easing.cubic) }))
  }, [])
  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: C * (1 - p.value) }))
  return (
    <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
      <RewardLight size={Math.round(SIZE * 1.5)} />
      <Svg width={SIZE} height={SIZE} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={t.borderLight} strokeWidth={STROKE} fill="none" />
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          stroke={t.primary}
          strokeWidth={STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={C}
          animatedProps={ringProps}
        />
      </Svg>
      <View style={{ alignItems: 'center' }}>
        <Text style={[typography.overline, { color: t.primary }]}>NÍVEL</Text>
        <Text style={[typography.displayLg, { color: t.text, fontSize: 48, lineHeight: 54 }]}>{level}</Text>
      </View>
    </View>
  )
}

// Motes de luz que SOBEM e somem — assinatura do level-up (crescimento), em
// contraste com o confete que CAI no desbloqueio de medalha.
function RisingMote({ index, color }: { index: number; color: string }) {
  const y = useSharedValue(0)
  useEffect(() => {
    y.value = withDelay(
      index * 480,
      withRepeat(withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.quad) }), -1, false),
    )
  }, [])
  const size = 5 + (index % 3) * 2
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(y.value, [0, 0.15, 0.8, 1], [0, 0.65, 0.65, 0]),
    transform: [
      { translateY: interpolate(y.value, [0, 1], [40, -260]) },
      { translateX: interpolate(y.value, [0, 0.5, 1], [0, index % 2 ? 10 : -10, 0]) },
    ],
  }))
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          bottom: '32%',
          left: `${12 + index * 14}%`,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  )
}

/**
 * Subida de nível — experiência PRÓPRIA (não reusa o CelebrationModal). Mesma
 * linguagem visual (Aurora hero + marca + haptics), mas a metáfora é de
 * CRESCIMENTO: o anel fecha cravando o novo nível, motes de luz sobem e a copy
 * fala de progressão. Sem confete (reservado ao desbloqueio de medalha).
 */
export function LevelUpCelebration({ level, onDismiss }: { level: number; onDismiss: () => void }) {
  const t = useThemeColors()
  useEffect(() => {
    const stopHaptics = haptics.celebrate()
    sound.play('levelUp')
    return () => {
      sound.stop('levelUp')
      stopHaptics()
    }
  }, [])

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss} statusBarTranslucent>
      <AuroraBackground variant="hero" style={{ flex: 1, backgroundColor: t.background }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <RisingMote key={i} index={i} color={t.primary} />
        ))}

        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space['3xl'] }}>
          <Animated.View entering={ZoomIn.springify().damping(13)} style={{ alignItems: 'center' }}>
            <LevelRing level={level} />
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(260).duration(420)} style={{ alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space.xl }}>
              <ChevronsUp size={16} color={t.primary} />
              <Text style={[typography.overline, { color: t.primary }]}>Subiu de nível</Text>
            </View>
            <Text style={[typography.displayLg, { color: t.text, marginTop: space.xs, textAlign: 'center' }]}>
              {levelTitle(level)}
            </Text>
            <Text style={[typography.bodyMd, { color: t.textSecondary, textAlign: 'center', marginTop: space.md }]}>
              {getLevelMessage(level)}
            </Text>
          </Animated.View>

          <Animated.View entering={FadeIn.delay(560)} style={{ marginTop: space['4xl'], alignSelf: 'stretch' }}>
            <Button label="Continuar" onPress={onDismiss} fullWidth />
          </Animated.View>
        </SafeAreaView>
      </AuroraBackground>
    </Modal>
  )
}
