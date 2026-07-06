import { useEffect } from 'react'
import { View, Text, Modal, Pressable, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated'
import { X, Lock } from 'lucide-react-native'
import { useThemeColors } from '../../stores/theme'
import { typography, space, radius, shadows } from '../../theme/tokens'
import { haptics } from '../../lib/haptics'
import { AuroraBackground, Button } from '../ui'
import { PhysicalMedal } from '../ui/PhysicalMedal'
import { getMedalContent } from '../../data/medalContent'
import type { Badge } from '../../lib/gamification'

/**
 * Contemplação de uma conquista — variação CALMA da celebração (mesma linguagem
 * visual: Aurora hero), porém SEM confete e com entrada mais suave. Foca em
 * apreciar a medalha: destaque, nome, descrição rica e uma mensagem exclusiva
 * daquela conquista. Medalhas bloqueadas mostram o requisito de desbloqueio.
 */
export function AchievementDetailModal({
  badge,
  onDismiss,
}: {
  badge: Badge
  onDismiss: () => void
}) {
  const t = useThemeColors()
  const content = getMedalContent(badge.id)
  const unlocked = badge.unlocked

  useEffect(() => {
    haptics.light()
  }, [])

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss} statusBarTranslucent>
      <AuroraBackground
        variant={unlocked ? 'hero' : 'subtle'}
        style={{ flex: 1, backgroundColor: t.background }}
      >
        <SafeAreaView style={{ flex: 1 }}>
          {/* Fechar (canto superior) */}
          <View style={{ alignItems: 'flex-end', paddingHorizontal: space.lg, paddingTop: space.sm }}>
            <Pressable
              onPress={onDismiss}
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              hitSlop={12}
              style={({ pressed }) => ({
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: t.surfaceSecondary,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <X size={18} color={t.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: space['3xl'],
              paddingVertical: space.xl,
            }}
            showsVerticalScrollIndicator={false}
          >
            {/* Medalha como objeto físico — arraste para inclinar */}
            <Animated.View entering={ZoomIn.springify().damping(14)} style={{ alignItems: 'center' }}>
              <PhysicalMedal medalha={badge.medalha} size={132} locked={!unlocked} />
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(120).duration(360)}
              style={{ alignItems: 'center' }}
            >
              <Text
                style={[
                  typography.overline,
                  { color: unlocked ? t.primary : t.textMuted, marginTop: space.xl },
                ]}
              >
                {unlocked ? 'Conquista desbloqueada' : 'Conquista bloqueada'}
              </Text>
              <Text
                style={[
                  typography.displaySm,
                  { color: t.text, marginTop: space.xs, textAlign: 'center' },
                ]}
              >
                {badge.label}
              </Text>
              <Text
                style={[
                  typography.bodyMd,
                  { color: t.textSecondary, textAlign: 'center', marginTop: space.md },
                ]}
              >
                {content.description}
              </Text>
            </Animated.View>

            {/* Mensagem exclusiva (conquistada) OU requisito (bloqueada) */}
            <Animated.View
              entering={FadeInDown.delay(240).duration(360)}
              style={{
                alignSelf: 'stretch',
                marginTop: space.xl,
                padding: space.lg,
                borderRadius: radius.lg,
                backgroundColor: t.surface,
                borderLeftWidth: 3,
                borderLeftColor: unlocked ? t.primary : t.border,
                ...shadows.sm,
              }}
            >
              {unlocked ? (
                <Text style={[typography.headingSm, { color: t.text, lineHeight: 22 }]}>
                  {content.message}
                </Text>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                  <Lock size={16} color={t.textMuted} />
                  <Text style={[typography.bodyMd, { color: t.textSecondary, flex: 1 }]}>
                    Como desbloquear: {badge.hint}
                  </Text>
                </View>
              )}
            </Animated.View>
          </ScrollView>

          <Animated.View
            entering={FadeIn.delay(360)}
            style={{ paddingHorizontal: space['3xl'], paddingBottom: space.xl }}
          >
            <Button
              label="Fechar"
              onPress={onDismiss}
              fullWidth
              variant={unlocked ? 'primary' : 'secondary'}
            />
          </Animated.View>
        </SafeAreaView>
      </AuroraBackground>
    </Modal>
  )
}
