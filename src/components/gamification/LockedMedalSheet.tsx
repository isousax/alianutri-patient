import { View, Text, Modal, Pressable, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { Lock } from 'lucide-react-native'
import { useThemeColors } from '../../stores/theme'
import { typography, space, radius, shadows, glass } from '../../theme/tokens'
import { MedalhasIcon } from '../ui/Medalhas'
import { getMedalMeta } from '../../data/medalContent'
import type { Badge } from '../../lib/gamification'

/**
 * LockedMedalSheet — folha DISCRETA para uma medalha AINDA NÃO conquistada.
 * Deliberadamente NÃO é uma tela de celebração e NÃO exibe a medalha em destaque:
 * a recompensa visual fica reservada ao desbloqueio real. Mostra só o essencial —
 * nome, categoria, o que representa, requisito e progresso (quando aplicável).
 */
export function LockedMedalSheet({
  badge,
  onDismiss,
}: {
  badge: Badge
  onDismiss: () => void
}) {
  const t = useThemeColors()
  const meta = getMedalMeta(badge.id)
  const progress = badge.progress
  const showBar = !!progress && progress.target > 1
  const pct = progress ? Math.max(0, Math.min(1, progress.current / progress.target)) : 0

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar"
          onPress={onDismiss}
          style={{ ...StyleSheet.absoluteFillObject, backgroundColor: glass.scrim }}
        />

        <Animated.View
          entering={FadeInUp.duration(260)}
          style={{
            backgroundColor: t.surface,
            borderTopLeftRadius: radius['2xl'],
            borderTopRightRadius: radius['2xl'],
            ...shadows.xl,
          }}
        >
          <SafeAreaView
            edges={['bottom']}
            style={{ paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: space.lg }}
          >
            {/* Alça */}
            <View
              style={{
                alignSelf: 'center',
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: t.borderLight,
                marginBottom: space.lg,
              }}
            />

            {/* Cabeçalho: medalha esmaecida (pequena) + categoria/nome + chip */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <View style={{ opacity: 0.3 }}>
                <MedalhasIcon medalha={badge.medalha} size={48} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.overline, { color: t.textMuted }]}>{meta.category}</Text>
                <Text style={[typography.headingMd, { color: t.text, marginTop: 2 }]} numberOfLines={1}>
                  {badge.label}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: space.sm,
                  paddingVertical: 4,
                  borderRadius: radius.full,
                  backgroundColor: t.surfaceSecondary,
                }}
              >
                <Lock size={12} color={t.textMuted} />
                <Text style={[typography.captionBold, { color: t.textMuted }]}>Bloqueada</Text>
              </View>
            </View>

            {/* O que a conquista representa */}
            <Text style={[typography.bodyMd, { color: t.textSecondary, marginTop: space.lg, lineHeight: 20 }]}>
              {meta.about}
            </Text>

            {/* Requisito + progresso (quando aplicável) */}
            <View
              style={{
                marginTop: space.lg,
                padding: space.md,
                borderRadius: radius.lg,
                backgroundColor: t.surfaceSecondary,
              }}
            >
              <Text style={[typography.overline, { color: t.textMuted }]}>Como desbloquear</Text>
              <Text style={[typography.labelMd, { color: t.text, marginTop: 4 }]}>{badge.hint}</Text>

              {showBar && progress ? (
                <View style={{ marginTop: space.md }}>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: t.borderLight, overflow: 'hidden' }}>
                    <View
                      style={{
                        height: 6,
                        borderRadius: 3,
                        width: `${Math.round(pct * 100)}%`,
                        backgroundColor: t.primary,
                      }}
                    />
                  </View>
                  <Text style={[typography.caption, { color: t.textMuted, marginTop: 6, textAlign: 'right' }]}>
                    {progress.current}/{progress.target}
                  </Text>
                </View>
              ) : null}
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  )
}
