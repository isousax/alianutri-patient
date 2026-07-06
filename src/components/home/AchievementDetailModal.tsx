import { useEffect } from 'react'
import { View, Text, Modal, Pressable, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated'
import { X } from 'lucide-react-native'
import { useThemeColors } from '../../stores/theme'
import { typography, space, radius } from '../../theme/tokens'
import { haptics } from '../../lib/haptics'
import { AuroraBackground, Button } from '../ui'
import { MedalShowcase } from '../gamification/MedalShowcase'
import { getMedalMeta } from '../../data/medalContent'
import { useBadgeDates, fmtAchievementDate } from '../../lib/badgeDates'
import type { Badge } from '../../lib/gamification'

/**
 * Contemplação de uma medalha JÁ CONQUISTADA — uma galeria pessoal, calma e
 * atemporal. NÃO reproduz a celebração do desbloqueio (o ápice fica reservado ao
 * momento real). Aqui o foco é orgulho tranquilo: a medalha em destaque (via
 * MedalShowcase — 2D hoje, pronta para 3D), nome, data e categoria.
 *
 * O espaço da futura NARRATIVA exclusiva de cada conquista já existe (meta.story)
 * e é renderizado assim que o texto chegar — sem redesenho. Deve ser aberto
 * apenas para badges unlocked; medalhas bloqueadas usam o LockedMedalSheet.
 */
export function AchievementDetailModal({
  badge,
  onDismiss,
}: {
  badge: Badge
  onDismiss: () => void
}) {
  const t = useThemeColors()
  const meta = getMedalMeta(badge.id)
  const dates = useBadgeDates()
  const dateStr = dates[badge.id]

  useEffect(() => {
    haptics.light()
  }, [])

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss} statusBarTranslucent>
      <AuroraBackground variant="hero" style={{ flex: 1, backgroundColor: t.background }}>
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
            {/* Medalha em destaque — arraste para inclinar (2D agora, 3D depois) */}
            <Animated.View entering={ZoomIn.springify().damping(14)} style={{ alignItems: 'center' }}>
              <MedalShowcase badge={badge} size={168} />
            </Animated.View>

            {/* Categoria · Nome · Data */}
            <Animated.View
              entering={FadeInDown.delay(120).duration(360)}
              style={{ alignItems: 'center', marginTop: space['2xl'] }}
            >
              <Text style={[typography.overline, { color: t.primary }]}>{meta.category}</Text>
              <Text
                style={[
                  typography.displaySm,
                  { color: t.text, marginTop: space.xs, textAlign: 'center' },
                ]}
              >
                {badge.label}
              </Text>
              {dateStr ? (
                <Text style={[typography.caption, { color: t.textMuted, marginTop: space.sm }]}>
                  Conquistada em {fmtAchievementDate(dateStr)}
                </Text>
              ) : null}
            </Animated.View>

            {/* Espaço reservado à NARRATIVA futura (exclusiva por medalha). Só
                aparece quando o texto existir — nada genérico por enquanto. */}
            {meta.story ? (
              <Animated.View
                entering={FadeInDown.delay(240).duration(360)}
                style={{
                  alignSelf: 'stretch',
                  marginTop: space['2xl'],
                  padding: space.lg,
                  borderRadius: radius.lg,
                  backgroundColor: t.surface,
                }}
              >
                <Text style={[typography.bodyMd, { color: t.textSecondary, lineHeight: 22 }]}>
                  {meta.story}
                </Text>
              </Animated.View>
            ) : null}
          </ScrollView>

          <Animated.View
            entering={FadeIn.delay(360)}
            style={{ paddingHorizontal: space['3xl'], paddingBottom: space.xl }}
          >
            <Button label="Fechar" onPress={onDismiss} fullWidth />
          </Animated.View>
        </SafeAreaView>
      </AuroraBackground>
    </Modal>
  )
}
