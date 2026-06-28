import { useState, useCallback } from 'react'
import {
  View, Text, ScrollView, Pressable, TextInput, Dimensions, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  Scale, TrendingDown, TrendingUp,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import Svg, { Polyline, Circle as SvgCircle, Defs, LinearGradient, Stop } from 'react-native-svg'
import { useThemeColors } from '../src/stores/theme'
import { useFeaturesStore } from '../src/stores/features'
import { toast } from '../src/stores/toast'
import { useLogWeight, useWeightHistory } from '../src/hooks/usePortal'
import type { WeightLogEntry } from '../src/types/portal'
import { ScreenHeader, Card, SectionLabel } from '../src/components/ui'
import { ReadOnlyBanner } from '../src/components/ui/ReadOnlyBanner'
import { shadows, radius, space, typography, SCREEN_PADDING, todayStr } from '../src/theme/tokens'

export default function WeightScreen() {
  const t = useThemeColors()
  const canWrite = useFeaturesStore((s) => s.canWrite)
  const [value, setValue] = useState('')
  const { data } = useWeightHistory()
  const { mutateAsync: logWeight, isPending } = useLogWeight()

  const entries: WeightLogEntry[] = data?.entries ?? []

  const handleSave = useCallback(async () => {
    if (!canWrite) return
    const kg = parseFloat(value.replace(',', '.'))
    if (isNaN(kg) || kg < 20 || kg > 400) {
      toast.error('Informe um peso entre 20 e 400 kg.')
      return
    }
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      await logWeight({ date: todayStr(), weight_kg: kg })
      setValue('')
      toast.success(`${kg.toFixed(1).replace('.', ',')} kg registrado!`)
    } catch {
      toast.error('Não foi possível salvar.')
    }
  }, [value, logWeight, canWrite])

  // Sparkline
  const points = [...entries].reverse()
  const W = Dimensions.get('window').width - 40 - 32
  const H = 80

  let sparkline = null
  if (points.length >= 2) {
    const weights = points.map((p) => p.weight_kg)
    const minW = Math.min(...weights) - 0.5
    const maxW = Math.max(...weights) + 0.5
    const rangeW = maxW - minW || 1
    const padX = 4
    const padY = 8
    const chartW = W - padX * 2
    const chartH = H - padY * 2

    const coords = points.map((p, i) => ({
      x: padX + (i / (points.length - 1)) * chartW,
      y: padY + chartH - ((p.weight_kg - minW) / rangeW) * chartH,
    }))
    const polyPoints = coords.map((c) => `${c.x},${c.y}`).join(' ')
    const first = points[0].weight_kg
    const last = points[points.length - 1].weight_kg
    const diff = last - first
    const diffStr = `${diff > 0 ? '+' : ''}${diff.toFixed(1).replace('.', ',')} kg`
    const TrendIcon = diff <= 0 ? TrendingDown : TrendingUp

    const fillPoints = `${padX},${padY + chartH} ${polyPoints} ${padX + chartW},${padY + chartH}`
    const trendColor = diff <= 0 ? t.success : t.warning

    sparkline = (
      <Animated.View entering={FadeInDown.duration(300)} style={{ paddingHorizontal: SCREEN_PADDING, marginBottom: space.lg }}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 28, height: 28, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: diff <= 0 ? t.successLight : t.warningLight }}>
                <TrendIcon size={14} color={trendColor} />
              </View>
              <Text style={[typography.headingSm, { color: t.text, marginLeft: space.sm }]}>
                Evolução
              </Text>
            </View>
            <Text style={[typography.captionBold, { color: trendColor }]}>
              {diffStr}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: space.sm }}>
            <Text style={[typography.headingLg, { color: t.text }]}>
              {last.toFixed(1).replace('.', ',')}
              <Text style={[typography.caption, { color: t.textMuted }]}> kg</Text>
            </Text>
            <Text style={[typography.caption, { color: t.textMuted }]}>{points.length} registros</Text>
          </View>
          <Svg width={W} height={H}>
            <Defs>
              <LinearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={t.primary} stopOpacity="0.15" />
                <Stop offset="1" stopColor={t.primary} stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <Polyline points={fillPoints} fill="url(#weightFill)" stroke="none" />
            <Polyline
              points={polyPoints}
              fill="none"
              stroke={t.primary}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <SvgCircle
              cx={coords[coords.length - 1].x}
              cy={coords[coords.length - 1].y}
              r={4}
              fill={t.surface}
              stroke={t.primary}
              strokeWidth={2.5}
            />
          </Svg>
        </Card>
      </Animated.View>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
      <ScreenHeader title="Registro de Peso" />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {!canWrite && <ReadOnlyBanner />}
          {/* Input card */}
          <Animated.View entering={FadeIn.duration(300)} style={{ paddingHorizontal: SCREEN_PADDING, marginTop: space.lg, marginBottom: space.lg }}>
            <Card>
              <Text style={[typography.overline, { color: t.textMuted, marginBottom: space.md }]}>
                PESO DE HOJE
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <TextInput
                  value={value}
                  onChangeText={setValue}
                  editable={canWrite}
                  placeholder="Ex: 72,5"
                  placeholderTextColor={t.textMuted}
                  keyboardType="decimal-pad"
                  style={[
                    typography.displaySm,
                    {
                      flex: 1,
                      paddingVertical: space.md,
                      paddingHorizontal: space.lg,
                      borderRadius: radius.lg,
                      color: t.text,
                      backgroundColor: t.surfaceSecondary,
                      borderWidth: 1,
                      borderColor: t.borderLight,
                    },
                  ]}
                />
                <Text style={[typography.headingMd, { color: t.textSecondary }]}>kg</Text>
              </View>
              <Pressable
                onPress={handleSave}
                disabled={isPending || !value.trim() || !canWrite}
                style={{
                  marginTop: space.lg,
                  paddingVertical: space.md,
                  borderRadius: radius.lg,
                  alignItems: 'center',
                  backgroundColor: value.trim() && canWrite ? t.primary : t.borderLight,
                }}
              >
                <Text style={[typography.labelMd, { color: value.trim() && canWrite ? t.primaryFg : t.textMuted }]}>
                  {isPending ? 'Salvando...' : 'Registrar peso'}
                </Text>
              </Pressable>
            </Card>
          </Animated.View>

          {/* Chart */}
          {sparkline}

          {/* History list */}
          {entries.length > 0 && (
            <Animated.View entering={FadeInDown.duration(300).delay(100)} style={{ paddingHorizontal: SCREEN_PADDING }}>
              <SectionLabel text="HISTÓRICO" />
              {entries.slice(0, 30).map((entry, i) => {
                const fmtDate = new Date(entry.entry_date + 'T00:00:00').toLocaleDateString('pt-BR', {
                  day: '2-digit', month: 'short',
                })
                const prev = entries[i + 1]
                const diff = prev ? entry.weight_kg - prev.weight_kg : 0
                return (
                  <View
                    key={`${entry.entry_date}-${entry.source}`}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: space.sm + 2,
                      paddingHorizontal: space.md,
                      borderRadius: radius.lg,
                      marginBottom: 6,
                      backgroundColor: t.surface,
                      ...shadows.sm,
                    }}
                  >
                    <Scale size={14} color={t.accent} />
                    <Text style={[typography.labelMd, { color: t.text, marginLeft: space.sm, flex: 1 }]}>
                      {entry.weight_kg.toFixed(1).replace('.', ',')} kg
                    </Text>
                    {diff !== 0 && (
                      <Text
                        style={[typography.captionBold, { color: diff < 0 ? t.success : t.warning, marginRight: space.sm }]}
                      >
                        {diff > 0 ? '+' : ''}{diff.toFixed(1).replace('.', ',')}
                      </Text>
                    )}
                    <Text style={[typography.caption, { color: t.textMuted }]}>{fmtDate}</Text>
                  </View>
                )
              })}
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
