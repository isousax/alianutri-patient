import { useMemo, useState } from 'react'
import { View, Text, ScrollView, Pressable, Dimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { TrendingDown, TrendingUp, Minus, LineChart as LineChartIcon } from 'lucide-react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useThemeColors } from '../src/stores/theme'
import { useWeightHistory, useEvolution, useChartsSummary } from '../src/hooks/usePortal'
import { ScreenHeader, Card, EmptyState, MacrosBar } from '../src/components/ui'
import { LineChart, type LineChartPoint } from '../src/components/charts/LineChart'
import { typography, space, radius, SCREEN_PADDING } from '../src/theme/tokens'

type Metric = 'weight' | 'bmi' | 'fat' | 'nutrition' | 'water' | 'wellness'
type Period = 30 | 90 | 0

const METRICS: { id: Metric; label: string }[] = [
  { id: 'weight', label: 'Peso' },
  { id: 'bmi', label: 'IMC' },
  { id: 'fat', label: '% Gordura' },
  { id: 'nutrition', label: 'Nutrição' },
  { id: 'water', label: 'Água' },
  { id: 'wellness', label: 'Bem-estar' },
]
const PERIODS: { id: Period; label: string }[] = [
  { id: 30, label: '30d' },
  { id: 90, label: '90d' },
  { id: 0, label: 'Tudo' },
]

const EMPTY_DESC: Record<Metric, string> = {
  weight: 'Registre seu peso para acompanhar sua evolução aqui.',
  bmi: 'Os dados aparecem após avaliações do seu nutricionista.',
  fat: 'Os dados aparecem após avaliações do seu nutricionista.',
  nutrition: 'Tire fotos das suas refeições para acompanhar seus macros aqui!',
  water: 'Registre sua água para ver o histórico de hidratação.',
  wellness: 'Registre seu bem-estar para acompanhar sua energia ao longo do tempo.',
}

function fmtDayMonth(iso: string): string {
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function withinPeriod(iso: string, days: Period): boolean {
  if (days === 0) return true
  const ts = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso).getTime()
  if (isNaN(ts)) return true
  return Date.now() - ts <= days * 86400000
}

export default function EvolutionScreen() {
  const t = useThemeColors()
  const [metric, setMetric] = useState<Metric>('weight')
  const [period, setPeriod] = useState<Period>(90)
  const { data: weightData } = useWeightHistory()
  const { data: evolution } = useEvolution()
  const { data: charts } = useChartsSummary(period === 0 ? 365 : period)

  const series = useMemo<{ points: LineChartPoint[]; unit: string; decimals: number }>(() => {
    if (metric === 'weight') {
      const entries = [...(weightData?.entries ?? [])]
        .filter((e) => withinPeriod(e.entry_date, period))
        .sort((a, b) => a.entry_date.localeCompare(b.entry_date))
      return { points: entries.map((e) => ({ label: fmtDayMonth(e.entry_date), value: e.weight_kg })), unit: 'kg', decimals: 1 }
    }
    if (metric === 'bmi' || metric === 'fat') {
      const field = metric === 'bmi' ? 'bmi' : 'body_fat_pct'
      const entries = [...(evolution ?? [])]
        .filter((e) => e[field] != null && withinPeriod(e.evaluation_date, period))
        .sort((a, b) => a.evaluation_date.localeCompare(b.evaluation_date))
      return {
        points: entries.map((e) => ({ label: fmtDayMonth(e.evaluation_date), value: e[field] as number })),
        unit: metric === 'fat' ? '%' : '',
        decimals: 1,
      }
    }
    if (metric === 'nutrition') {
      const pts = (charts?.nutrition ?? []).map((d) => ({ label: fmtDayMonth(d.date), value: Math.round(d.calories || 0) }))
      return { points: pts, unit: 'kcal', decimals: 0 }
    }
    if (metric === 'water') {
      const pts = (charts?.water ?? []).map((d) => ({ label: fmtDayMonth(d.date), value: Number(((d.total_ml || 0) / 1000).toFixed(2)) }))
      return { points: pts, unit: 'L', decimals: 1 }
    }
    const pts = (charts?.wellness ?? []).map((d) => ({ label: fmtDayMonth(d.date), value: d.energy }))
    return { points: pts, unit: '', decimals: 1 }
  }, [metric, period, weightData, evolution, charts])

  const points = series.points
  const current = points.length ? points[points.length - 1].value : null
  const first = points.length ? points[0].value : null
  const delta = current != null && first != null ? current - first : null
  const decreasing = delta != null && delta < -0.05
  const increasing = delta != null && delta > 0.05
  const DeltaIcon = decreasing ? TrendingDown : increasing ? TrendingUp : Minus
  // Peso/IMC/%Gordura: cair é o objetivo (verde). Nutrição/Água/Bem-estar: subir é bom.
  const lowerIsBetter = metric === 'weight' || metric === 'bmi' || metric === 'fat'
  const deltaColor = lowerIsBetter
    ? decreasing ? t.success : increasing ? t.warning : t.textMuted
    : increasing ? t.success : decreasing ? t.warning : t.textMuted

  const macroTotals = useMemo(() => {
    if (metric !== 'nutrition' || !charts?.nutrition?.length) return null
    return charts.nutrition.reduce(
      (acc, d) => ({ protein: acc.protein + (d.protein_g || 0), carbs: acc.carbs + (d.carbs_g || 0), fat: acc.fat + (d.fat_g || 0) }),
      { protein: 0, carbs: 0, fat: 0 },
    )
  }, [metric, charts])

  const chartWidth = Dimensions.get('window').width - SCREEN_PADDING * 2 - space.lg * 2
  const fmtVal = (v: number) => `${v.toFixed(series.decimals).replace('.', ',')}${series.unit ? ` ${series.unit}` : ''}`
  const currentLabel = metric === 'nutrition' || metric === 'water' ? 'Último dia' : 'Atual'

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
      <ScreenHeader title="Minha Evolução" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Métricas (scroll horizontal) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: space.sm, paddingHorizontal: SCREEN_PADDING, marginTop: space.md }}
        >
          {METRICS.map((m) => {
            const active = metric === m.id
            return (
              <Pressable
                key={m.id}
                onPress={() => setMetric(m.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={{
                  paddingHorizontal: space.lg,
                  paddingVertical: space.sm + 2,
                  borderRadius: radius.lg,
                  backgroundColor: active ? t.primary : t.surfaceSecondary,
                }}
              >
                <Text style={[typography.labelMd, { color: active ? t.primaryFg : t.textSecondary }]}>{m.label}</Text>
              </Pressable>
            )
          })}
        </ScrollView>

        {/* Período */}
        <View style={{ flexDirection: 'row', gap: space.sm, paddingHorizontal: SCREEN_PADDING, marginTop: space.sm }}>
          {PERIODS.map((p) => {
            const active = period === p.id
            return (
              <Pressable
                key={p.id}
                onPress={() => setPeriod(p.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={{ paddingHorizontal: space.md, paddingVertical: space.xs + 2, borderRadius: radius.full, backgroundColor: active ? t.primaryLight : 'transparent' }}
              >
                <Text style={[typography.labelSm, { color: active ? t.primary : t.textMuted }]}>{p.label}</Text>
              </Pressable>
            )
          })}
        </View>

        {points.length === 0 ? (
          <View style={{ marginTop: space['4xl'] }}>
            <EmptyState icon={<LineChartIcon size={28} color={t.primary} />} title="Sem dados ainda" description={EMPTY_DESC[metric]} />
          </View>
        ) : (
          <Animated.View entering={FadeInDown.duration(350)} style={{ paddingHorizontal: SCREEN_PADDING, marginTop: space.lg }}>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: space.lg }}>
                <View>
                  <Text style={[typography.caption, { color: t.textMuted }]}>{currentLabel}</Text>
                  <Text style={[typography.displaySm, { color: t.text }]}>{current != null ? fmtVal(current) : '—'}</Text>
                </View>
                {delta != null && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: space.sm, paddingVertical: 4, borderRadius: radius.md, backgroundColor: t.surfaceSecondary }}>
                    <DeltaIcon size={14} color={deltaColor} />
                    <Text style={[typography.captionBold, { color: deltaColor }]}>
                      {delta > 0 ? '+' : ''}{delta.toFixed(series.decimals).replace('.', ',')}{series.unit ? ` ${series.unit}` : ''}
                    </Text>
                    <Text style={[typography.caption, { color: t.textMuted }]}>no período</Text>
                  </View>
                )}
              </View>

              <LineChart data={points} width={chartWidth} unit={series.unit} decimals={series.decimals} />

              {macroTotals && (
                <View style={{ marginTop: space.lg }}>
                  <Text style={[typography.caption, { color: t.textMuted, marginBottom: space.xs }]}>Macros estimados no período</Text>
                  <MacrosBar protein_g={macroTotals.protein} carbs_g={macroTotals.carbs} fat_g={macroTotals.fat} />
                </View>
              )}

              <Text style={[typography.caption, { color: t.textMuted, marginTop: space.sm }]}>
                {points.length} {points.length === 1 ? 'registro' : 'registros'} no período
              </Text>
            </Card>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
