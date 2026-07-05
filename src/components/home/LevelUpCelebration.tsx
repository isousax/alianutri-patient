import { useEffect } from 'react'
import { View, Text, Modal } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated'
import { Sparkles } from 'lucide-react-native'
import { useThemeColors } from '../../stores/theme'
import { typography, space, shadows } from '../../theme/tokens'
import { haptics } from '../../lib/haptics'
import { AuroraBackground, Button } from '../ui'
import { ConfettiCelebration } from '../ui/ConfettiCelebration'
import { RewardLight } from '../ui/RewardLight'
import { RewardTrophy } from '../ui/RewardTrophy'

interface CelebrationModalProps {
  icon?: React.ReactNode
  hero?: React.ReactNode
  eyebrow: string
  title: string
  subtitle?: string
  message?: string
  onDismiss: () => void
}

/** Generic fullscreen celebration — Aurora hero + confetti + haptics. */
export function CelebrationModal({ icon, hero, eyebrow, title, subtitle, message, onDismiss }: CelebrationModalProps) {
  const t = useThemeColors()

  useEffect(() => haptics.celebrate(), [])

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
  return (
    <CelebrationModal
      hero={<RewardTrophy size={132} />}
      eyebrow="Subiu de nível"
      title={`Nível ${level}`}
      subtitle={levelTitle(level)}
      message="Sua constância está valendo a pena — continue cuidando de você todo dia!"
      onDismiss={onDismiss}
    />
  )
}
