import { useEffect, useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { router } from 'expo-router'
import { haptics } from '../../lib/haptics'
import { Droplets, Check, Scale, Camera, HeartPulse, ImagePlus, LayoutGrid, Minus, Plus, ChevronRight, type LucideIcon } from 'lucide-react-native'
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
  publish: ImagePlus,
  progress: Camera,
  wellness: HeartPulse,
}

// Rótulos curtos para os tiles do grid (o label completo vai na acessibilidade).
const SHORT_LABEL: Record<CreateActionId, string> = {
  publish: 'Publicar',
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
  const { mutateAsync: logWater } = useLogWater()
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
  const saveWeight = () => {
    if (isSavingWeight) return
    // Check instantâneo; o upsert no histórico é otimista. Erro reverte + avisa.
    haptics.success()
    setSavedWeight(true)
    setTimeout(() => setSavedWeight(false), 1400)
    logWeight({ date: todayStr(), weight_kg: shownWeight }).catch(() => {
      setSavedWeight(false)
      toast.error('Não foi possível salvar o peso.')
    })
  }

  // Cor do ícone + fundo do chip (token *Light) por ação — sem hex-alpha frágil.
  const ACTION_STYLE: Record<CreateActionId, { color: string; light: string }> = {
    publish: { color: t.primary, light: t.primaryLight },
    progress: { color: t.success, light: t.successLight },
    wellness: { color: t.error, light: t.errorLight },
  }

  const go = (route: string) => {
    haptics.light()
    onClose()
    setTimeout(() => router.push(route as never), 180)
  }

  const addWater = (ml: number) => {
    // Feedback instantâneo: check + haptic na hora; o cache é otimista (o anel da
    // Home reflete já). O POST corre em 2º plano; erro reverte o check e avisa.
    haptics.success()
    setJustAdded(ml)
    setTimeout(() => setJustAdded(null), 1200)
    logWater({ date: todayStr(), amount_ml: ml }).catch(() => {
      setJustAdded((cur) => (cur === ml ? null : cur))
      toast.error('Não foi possível registrar a água.')
    })
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
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Droplets size={16} color={t.info} />
                <Text accessibilityRole="header" style={[typography.labelMd, { color: t.text, marginLeft: space.xs }]}>Água rápida</Text>
              </View>
              <Pressable onPress={() => go('/water')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Abrir página de água (histórico)" style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Text style={[typography.caption, { color: t.primary }]}>Histórico</Text>
                <ChevronRight size={13} color={t.primary} />
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              {WATER_QUICK.map((ml) => {
                const added = justAdded === ml
                return (
                  <Pressable
                    key={ml}
                    onPress={() => addWater(ml)}
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

          {/* Peso de hoje — stepper inline (1 toque para ajustar + salvar) */}
          <View style={{ marginBottom: space.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Scale size={16} color={t.accent} />
                <Text accessibilityRole="header" style={[typography.labelMd, { color: t.text, marginLeft: space.xs }]}>Peso de hoje</Text>
              </View>
              <Pressable onPress={() => go('/weight')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Abrir página de peso (histórico e gráfico)" style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Text style={[typography.caption, { color: t.primary }]}>Histórico</Text>
                <ChevronRight size={13} color={t.primary} />
              </Pressable>
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
                style={{ minWidth: 76, height: 44, paddingHorizontal: space.md, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: savedWeight ? t.success : t.accent }}
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
