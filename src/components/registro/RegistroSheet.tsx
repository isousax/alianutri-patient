import { useEffect, useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { router } from 'expo-router'
import { haptics } from '../../lib/haptics'
import { Droplets, Check, Utensils, Scale, Smile, Camera, BookOpen, HeartPulse, LayoutGrid, Minus, Plus, type LucideIcon } from 'lucide-react-native'
import { useThemeColors } from '../../stores/theme'
import { toast } from '../../stores/toast'
import { typography, space, radius, fmtWater, todayStr } from '../../theme/tokens'
import { BottomSheet } from '../ui/BottomSheet'
import { ReadOnlyBanner } from '../ui/ReadOnlyBanner'
import { useLogWater, useLogWeight, useWeightHistory, usePortalProfile } from '../../hooks/usePortal'
import { CREATE_ACTIONS, type CreateActionId } from '../../lib/createActions'
import { QuickActionTile } from '../ui/QuickActionTile'

const WATER_QUICK = [200, 300, 500]
const WEIGHT_MIN = 20
const WEIGHT_MAX = 400
const WEIGHT_FALLBACK = 70

const clampWeight = (v: number) => Math.min(WEIGHT_MAX, Math.max(WEIGHT_MIN, Math.round(v * 10) / 10))

// Ícone lucide por ação (robusto a encoding — substitui os emojis).
const ACTION_ICONS: Record<CreateActionId, LucideIcon> = {
  meal: Utensils,
  diary: BookOpen,
  weight: Scale,
  mood: Smile,
  progress: Camera,
  wellness: HeartPulse,
}

// Rótulos curtos para os tiles do grid (o label completo vai na acessibilidade).
const SHORT_LABEL: Record<CreateActionId, string> = {
  meal: 'Refeição',
  diary: 'Diário',
  weight: 'Peso',
  mood: 'Humor',
  progress: 'Progresso',
  wellness: 'Bem-estar',
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
  const { mutateAsync: logWeight, isPending: isSavingWeight } = useLogWeight()
  const { data: weightHistory } = useWeightHistory()
  const { data: profile } = usePortalProfile()
  const [justAdded, setJustAdded] = useState<number | null>(null)
  const [weightVal, setWeightVal] = useState<number | null>(null)
  const [savedWeight, setSavedWeight] = useState(false)

  // Pré-preenche o stepper com o último peso conhecido (registro do paciente ou
  // do perfil). Só semeia quando os dados chegam — evita travar no fallback.
  useEffect(() => {
    if (weightVal != null) return
    const entries = weightHistory?.entries ?? []
    const latest = entries.length
      ? [...entries].sort((a, b) => b.entry_date.localeCompare(a.entry_date))[0]?.weight_kg
      : undefined
    const seed = latest ?? profile?.weight_kg
    if (seed != null) setWeightVal(clampWeight(seed))
  }, [weightHistory, profile, weightVal])

  const shownWeight = weightVal ?? WEIGHT_FALLBACK
  const stepWeight = (delta: number) => {
    haptics.selection()
    setWeightVal(clampWeight(shownWeight + delta))
    setSavedWeight(false)
  }
  const saveWeight = async () => {
    if (isSavingWeight) return
    haptics.light()
    try {
      await logWeight({ date: todayStr(), weight_kg: shownWeight })
      setSavedWeight(true)
      haptics.success()
      setTimeout(() => setSavedWeight(false), 1400)
    } catch {
      toast.error('Não foi possível salvar o peso.')
    }
  }

  // Cor do ícone + fundo do chip (token *Light) por ação — sem hex-alpha frágil.
  const ACTION_STYLE: Record<CreateActionId, { color: string; light: string }> = {
    meal: { color: t.primary, light: t.primaryLight },
    diary: { color: t.warning, light: t.warningLight },
    weight: { color: t.accent, light: t.accentLight },
    mood: { color: t.info, light: t.infoLight },
    progress: { color: t.success, light: t.successLight },
    wellness: { color: t.error, light: t.errorLight },
  }

  const go = (route: string) => {
    haptics.light()
    onClose()
    setTimeout(() => router.push(route as never), 180)
  }

  const addWater = async (ml: number) => {
    if (isPending) return
    haptics.light()
    try {
      await logWater({ date: todayStr(), amount_ml: ml })
      setJustAdded(ml)
      haptics.success()
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
              <Text accessibilityRole="header" style={[typography.labelMd, { color: t.text, marginLeft: space.xs }]}>Água rápida</Text>
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
                    accessibilityState={{ disabled: isPending }}
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

          {/* Peso de hoje — stepper inline (1 toque para ajustar + salvar) */}
          <View style={{ marginBottom: space.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space.sm }}>
              <Scale size={16} color={t.accent} />
              <Text accessibilityRole="header" style={[typography.labelMd, { color: t.text, marginLeft: space.xs }]}>Peso de hoje</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <Pressable
                onPress={() => stepWeight(-0.1)}
                accessibilityRole="button"
                accessibilityLabel="Diminuir 0,1 kg"
                style={{ width: 44, height: 44, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: t.accentLight }}
              >
                <Minus size={18} color={t.accent} />
              </Pressable>
              <View accessible accessibilityLabel={`Peso atual: ${shownWeight.toFixed(1).replace('.', ',')} quilos`} style={{ flex: 1, alignItems: 'center', paddingVertical: space.sm, borderRadius: radius.lg, backgroundColor: t.surfaceSecondary }}>
                <Text style={[typography.headingSm, { color: t.text }]}>{shownWeight.toFixed(1).replace('.', ',')} kg</Text>
              </View>
              <Pressable
                onPress={() => stepWeight(0.1)}
                accessibilityRole="button"
                accessibilityLabel="Aumentar 0,1 kg"
                style={{ width: 44, height: 44, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: t.accentLight }}
              >
                <Plus size={18} color={t.accent} />
              </Pressable>
              <Pressable
                onPress={saveWeight}
                disabled={isSavingWeight}
                accessibilityRole="button"
                accessibilityLabel={`Salvar peso ${shownWeight.toFixed(1).replace('.', ',')} kg`}
                accessibilityState={{ disabled: isSavingWeight, busy: isSavingWeight }}
                style={{ minWidth: 76, height: 44, paddingHorizontal: space.md, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: savedWeight ? t.success : t.accent, opacity: isSavingWeight ? 0.6 : 1 }}
              >
                {savedWeight ? <Check size={18} color="#fff" /> : <Text style={[typography.labelMd, { color: '#fff' }]}>Salvar</Text>}
              </Pressable>
            </View>
          </View>

          {/* Outros registros — grid de atalhos (mesmo tile da Home) */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space.sm }}>
            <LayoutGrid size={16} color={t.textMuted} />
            <Text accessibilityRole="header" style={[typography.labelMd, { color: t.text, marginLeft: space.xs }]}>Outros registros</Text>
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
