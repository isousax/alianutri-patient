import { useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { Droplets, Check, ChevronRight, Utensils, Scale, Smile, Camera, Dumbbell, Pencil, type LucideIcon } from 'lucide-react-native'
import { useThemeColors } from '../../stores/theme'
import { typography, space, radius, fmtWater, todayStr } from '../../theme/tokens'
import { BottomSheet } from '../ui/BottomSheet'
import { ReadOnlyBanner } from '../ui/ReadOnlyBanner'
import { useLogWater } from '../../hooks/usePortal'
import { CREATE_ACTIONS, type CreateActionId } from '../../lib/createActions'

const WATER_QUICK = [200, 300, 500]

// Ícone lucide por ação (robusto a encoding — substitui os emojis).
const ACTION_ICONS: Record<CreateActionId, LucideIcon> = {
  meal: Utensils,
  weight: Scale,
  mood: Smile,
  progress: Camera,
  exercise: Dumbbell,
  note: Pencil,
}

interface RegistroSheetProps {
  visible: boolean
  onClose: () => void
  canWrite: boolean
}

/**
 * Folha do botão "+": registra água inline (1 toque) e leva às demais ações
 * de criação. Substitui o Alert.alert nativo do CreateFab.
 */
export function RegistroSheet({ visible, onClose, canWrite }: RegistroSheetProps) {
  const t = useThemeColors()
  const { mutateAsync: logWater, isPending } = useLogWater()
  const [justAdded, setJustAdded] = useState<number | null>(null)

  const actionColors: Record<CreateActionId, string> = {
    meal: t.primary,
    weight: t.accent,
    mood: t.info,
    progress: t.success,
    exercise: t.warning,
    note: t.textSecondary,
  }

  const go = (route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
    onClose()
    setTimeout(() => router.push(route as never), 180)
  }

  const addWater = async (ml: number) => {
    if (isPending) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
    try {
      await logWater({ date: todayStr(), amount_ml: ml })
      setJustAdded(ml)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
      setTimeout(() => setJustAdded(null), 1200)
    } catch {
      // Offline/erro: tratado pela fila de mutações (próxima etapa do P0.3).
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Registrar">
      {!canWrite ? (
        <View style={{ paddingBottom: space.sm }}>
          <ReadOnlyBanner />
        </View>
      ) : (
        <>
          {/* Água — quick add inline */}
          <View style={{ marginBottom: space.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space.sm }}>
              <Droplets size={16} color={t.info} />
              <Text style={[typography.labelMd, { color: t.text, marginLeft: space.xs }]}>Água rápida</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              {WATER_QUICK.map((ml) => {
                const added = justAdded === ml
                return (
                  <Pressable
                    key={ml}
                    onPress={() => addWater(ml)}
                    disabled={isPending}
                    accessibilityRole="button"
                    accessibilityLabel={`Adicionar ${fmtWater(ml)} de água`}
                    style={({ pressed }) => ({
                      flex: 1,
                      alignItems: 'center',
                      paddingVertical: space.md,
                      borderRadius: radius.lg,
                      backgroundColor: added ? t.successLight : t.infoLight,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    {added ? (
                      <Check size={18} color={t.success} />
                    ) : (
                      <Text style={[typography.labelMd, { color: t.info }]}>{fmtWater(ml)}</Text>
                    )}
                  </Pressable>
                )
              })}
            </View>
          </View>

          {/* Demais registros */}
          <View style={{ height: 1, backgroundColor: t.borderLight, marginBottom: space.xs }} />
          {CREATE_ACTIONS.map((a, i) => {
            const Icon = ACTION_ICONS[a.id]
            const color = actionColors[a.id]
            return (
              <View key={a.id}>
                {i > 0 ? <View style={{ height: 1, backgroundColor: t.borderLight }} /> : null}
                <Pressable
                  onPress={() => go(a.route)}
                  accessibilityRole="button"
                  accessibilityLabel={a.label}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: space.md,
                    paddingRight: space.lg + 26,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: radius.md,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: color + '22',
                      marginRight: space.md,
                    }}
                  >
                    <Icon size={20} color={color} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[typography.labelLg, { color: t.text }]}>{a.label}</Text>
                    <Text style={[typography.caption, { color: t.textMuted }]}>{a.description}</Text>
                  </View>
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      right: space.xs,
                      top: 0,
                      bottom: 0,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ChevronRight size={18} color={t.textMuted} />
                  </View>
                </Pressable>
              </View>
            )
          })}
        </>
      )}
    </BottomSheet>
  )
}
