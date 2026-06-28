import { useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { Droplets, Check, Utensils, Scale, Smile, Camera, Dumbbell, Pencil, type LucideIcon } from 'lucide-react-native'
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

// Rótulos curtos para os tiles do grid (o label completo vai na acessibilidade).
const SHORT_LABEL: Record<CreateActionId, string> = {
  meal: 'Refeição',
  weight: 'Peso',
  mood: 'Humor',
  progress: 'Progresso',
  exercise: 'Exercício',
  note: 'Anotação',
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

          {/* Demais registros — grid de atalhos */}
          <View style={{ height: 1, backgroundColor: t.borderLight, marginBottom: space.md }} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -space.xs }}>
            {CREATE_ACTIONS.map((a) => {
              const Icon = ACTION_ICONS[a.id]
              const color = actionColors[a.id]
              return (
                <View key={a.id} style={{ width: '33.333%', padding: space.xs }}>
                  <Pressable
                    onPress={() => go(a.route)}
                    accessibilityRole="button"
                    accessibilityLabel={a.label}
                    style={({ pressed }) => ({
                      alignItems: 'center',
                      paddingVertical: space.md,
                      paddingHorizontal: space.xs,
                      borderRadius: radius.lg,
                      backgroundColor: t.surfaceSecondary,
                      opacity: pressed ? 0.6 : 1,
                    })}
                  >
                    <View
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: radius.md,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: color + '22',
                        marginBottom: space.sm,
                      }}
                    >
                      <Icon size={22} color={color} />
                    </View>
                    <Text style={[typography.captionBold, { color: t.text }]} numberOfLines={1}>
                      {SHORT_LABEL[a.id]}
                    </Text>
                  </Pressable>
                </View>
              )
            })}
          </View>
        </>
      )}
    </BottomSheet>
  )
}
