import { useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { Droplets, Check, Utensils, Scale, Smile, Camera, Dumbbell, Pencil, LayoutGrid, type LucideIcon } from 'lucide-react-native'
import { useThemeColors } from '../../stores/theme'
import { typography, space, radius, fmtWater, todayStr } from '../../theme/tokens'
import { BottomSheet } from '../ui/BottomSheet'
import { ReadOnlyBanner } from '../ui/ReadOnlyBanner'
import { useLogWater } from '../../hooks/usePortal'
import { CREATE_ACTIONS, type CreateActionId } from '../../lib/createActions'
import { QuickActionTile } from '../ui/QuickActionTile'

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

  // Cor do ícone + fundo do chip (token *Light) por ação — sem hex-alpha frágil.
  const ACTION_STYLE: Record<CreateActionId, { color: string; light: string }> = {
    meal: { color: t.primary, light: t.primaryLight },
    weight: { color: t.accent, light: t.accentLight },
    mood: { color: t.info, light: t.infoLight },
    progress: { color: t.success, light: t.successLight },
    exercise: { color: t.warning, light: t.warningLight },
    note: { color: t.textSecondary, light: t.border },
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
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      paddingVertical: space.md,
                      borderRadius: radius.lg,
                      backgroundColor: added ? t.successLight : t.infoLight,
                    }}
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

          {/* Outros registros — grid de atalhos (mesmo tile da Home) */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space.sm }}>
            <LayoutGrid size={16} color={t.textMuted} />
            <Text style={[typography.labelMd, { color: t.text, marginLeft: space.xs }]}>Outros registros</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -space.xs }}>
            {CREATE_ACTIONS.map((a) => {
              const Icon = ACTION_ICONS[a.id]
              const s = ACTION_STYLE[a.id]
              return (
                <View key={a.id} style={{ width: '33.333%', paddingHorizontal: space.xs }}>
                  <QuickActionTile
                    variant="surface"
                    icon={<Icon size={20} color={s.color} />}
                    label={SHORT_LABEL[a.id]}
                    //chipColor={s.light}
                    labelLines={1}
                    accessibilityLabel={a.label}
                    onPress={() => go(a.route)}
                  />
                </View>
              )
            })}
          </View>
        </>
      )}
    </BottomSheet>
  )
}
