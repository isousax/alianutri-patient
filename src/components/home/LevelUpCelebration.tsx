import { useEffect } from 'react'
import { View, Text, Modal, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import Animated, {
  useSharedValue, useAnimatedStyle, withDelay, withTiming,
  interpolate, Easing, FadeIn, ZoomIn,
} from 'react-native-reanimated'
import { Trophy, Sparkles } from 'lucide-react-native'
import { useThemeColors } from '../../stores/theme'
import { typography, space, shadows } from '../../theme/tokens'
import { AuroraBackground, Button } from '../ui'

// ── Single confetti piece (falls + drifts + spins, then fades) ──
function ConfettiPiece({ index, color }: { index: number; color: string }) {
  const progress = useSharedValue(0)
  const startX = (index * 37) % 100
  const drift = ((index % 5) - 2) * 34
  const rot = (index % 2 === 0 ? 1 : -1) * (180 + (index % 3) * 120)

  useEffect(() => {
    progress.value = withDelay(
      index * 28,
      withTiming(1, { duration: 1800 + (index % 4) * 320, easing: Easing.out(Easing.cubic) }),
    )
  }, [])

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [-50, 560]) },
      { translateX: interpolate(progress.value, [0, 1], [0, drift]) },
      { rotate: `${interpolate(progress.value, [0, 1], [0, rot])}deg` },
    ],
    opacity: interpolate(progress.value, [0, 0.1, 0.82, 1], [0, 1, 1, 0]),
  }))

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', top: 0, left: `${startX}%`, width: 8, height: 13, borderRadius: 2, backgroundColor: color },
        style,
      ]}
    />
  )
}

interface CelebrationModalProps {
  icon: React.ReactNode
  eyebrow: string
  title: string
  subtitle?: string
  message?: string
  onDismiss: () => void
}

/** Generic fullscreen celebration — Aurora hero + confetti + haptics. */
export function CelebrationModal({ icon, eyebrow, title, subtitle, message, onDismiss }: CelebrationModalProps) {
  const t = useThemeColors()
  const confettiColors = [t.primary, t.info, t.accent, t.warning]

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
    const a = setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), 220)
    const b = setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}), 460)
    return () => { clearTimeout(a); clearTimeout(b) }
  }, [])

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss} statusBarTranslucent>
      <AuroraBackground variant="hero" style={{ flex: 1, backgroundColor: t.background }}>
        <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
          {Array.from({ length: 28 }).map((_, i) => (
            <ConfettiPiece key={i} index={i} color={confettiColors[i % confettiColors.length]} />
          ))}
        </View>

        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space['3xl'] }}>
          <Animated.View entering={ZoomIn.springify().damping(12)} style={{ alignItems: 'center' }}>
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
            <Button label="Continuar" onPress={onDismiss} fullWidth leftIcon={<Sparkles size={16} color={t.primaryFg} />} />
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

/** Level-up celebration (thin wrapper over CelebrationModal). */
export function LevelUpCelebration({ level, onDismiss }: { level: number; onDismiss: () => void }) {
  const t = useThemeColors()
  return (
    <CelebrationModal
      icon={<Trophy size={52} color={t.primaryFg} />}
      eyebrow="Subiu de nível"
      title={`Nível ${level}`}
      subtitle={levelTitle(level)}
      message="Sua constância está valendo a pena — continue cuidando de você todo dia!"
      onDismiss={onDismiss}
    />
  )
}
