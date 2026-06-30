import { useMemo, useState } from 'react'
import { View, Text, ScrollView, Pressable, Dimensions } from 'react-native'
import { TrendingDown, TrendingUp, Minus, LineChart as LineChartIcon } from 'lucide-react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useThemeColors } from '../../stores/theme'
import { useWeightHistory, useEvolution, useChartsSummary, usePortalProfile } from '../../hooks/usePortal'
import { Card, EmptyState, MacrosBar } from '../ui'
import { LineChart, type LineChartPoint } from '../charts/LineChart'
import { typography, space, radius, SCREEN_PADDING } from '../../theme/tokens'

// Conteúdo de "Progresso" (gráficos de evolução), reusado pela rota /evolution
// e pelo segmento Progresso do Diário (P1). Renderiza só a área rolável — quem
// monta cabeçalho/SafeArea é o chamador.

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
  bmi: 'Registre seu peso para acompanhar seu IMC ao longo do tempo.',
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

// Faixas de IMC (OMS) para o selo de classificação.
function bmiCategory(v: number): { label: string; key: 'low' | 'ok' | 'over' | 'obese' } {
  if (v < 18.5) return { label: 'Abaixo do peso', key: 'low' }
  if (v < 25) return { label: 'Peso saudável', key: 'ok' }
  if (v < 30) return { label: 'Sobrepeso', key: 'over' }
  return { label: 'Obesidade', key: 'obese' }
}

// Distância de um valor à faixa saudável (0 = dentro). Permite colorir a
// tendência por "aproximar-se da meta", e não por "subir/descer".
function distToBand(v: number | null, band: [number, number] | null): number | null {
  if (v == null || !band) return null
  if (v < band[0]) return band[0] - v
  if (v > band[1]) return v - band[1]
  return 0
}

export function ProgressView({ bottomPadding = 40 }: { bottomPadding?: number }) {
  const t = useThemeColors()
  const [metric, setMetric] = useState<Metric>('weight')
  const [period, setPeriod] = useState<Period>(90)
  const { data: weightData } = useWeightHistory()
  const { data: evolution } = useEvolution()
  const { data: charts } = useChartsSummary(period === 0 ? 365 : period)
  const { data: profile } = usePortalProfile()
  const heightM = profile?.height_cm ? profile.height_cm / 100 : null
  // Faixa saudável (IMC 18,5–25) na unidade da métrica: direto p/ IMC; convertida
  // p/ kg via altura no peso. Alimenta a faixa do gráfico e a cor da tendência.
  const healthyBand: [number, number] | null =
    metric === 'bmi'
      ? [18.5, 25]
      : metric === 'weight' && heightM
      ? [18.5 * heightM * heightM, 25 * heightM * heightM]
      : null

  const series = useMemo<{ points: LineChartPoint[]; unit: string; decimals: number }>(() => {
    if (metric === 'weight') {
      const entries = [...(weightData?.entries ?? [])]
        .filter((e) => withinPeriod(e.entry_date, period))
        .sort((a, b) => a.entry_date.localeCompare(b.entry_date))
      return { points: entries.map((e) => ({ label: fmtDayMonth(e.entry_date), value: e.weight_kg })), unit: 'kg', decimals: 1 }
    }
    if (metric === 'bmi') {
      // IMC calculado a partir do peso registrado × altura do perfil; a medição
      // do nutricionista (evolution.bmi) tem precedência quando existe na data.
      const byDate = new Map<string, number>()
      if (heightM && heightM > 0) {
        for (const w of weightData?.entries ?? []) {
          if (w.weight_kg != null && withinPeriod(w.entry_date, period)) {
            byDate.set(w.entry_date, w.weight_kg / (heightM * heightM))
          }
        }
      }
      for (const e of evolution ?? []) {
        if (e.bmi != null && withinPeriod(e.evaluation_date, period)) {
          byDate.set(e.evaluation_date, e.bmi)
        }
      }
      const sorted = [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0]))
      return { points: sorted.map(([date, value]) => ({ label: fmtDayMonth(date), value })), unit: '', decimals: 1 }
    }
    if (metric === 'fat') {
      const entries = [...(evolution ?? [])]
        .filter((e) => e.body_fat_pct != null && withinPeriod(e.evaluation_date, period))
        .sort((a, b) => a.evaluation_date.localeCompare(b.evaluation_date))
      return {
        points: entries.map((e) => ({ label: fmtDayMonth(e.evaluation_date), value: e.body_fat_pct as number })),
        unit: '%',
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
  }, [metric, period, weightData, evolution, charts, heightM])

  const points = series.points
  const current = points.length ? points[points.length - 1].value : null
  const first = points.length ? points[0].value : null
  const delta = current != null && first != null ? current - first : null
  const decreasing = delta != null && delta < -0.05
  const increasing = delta != null && delta > 0.05
  const DeltaIcon = decreasing ? TrendingDown : increasing ? TrendingUp : Minus
  // Cor da tendência = aproximar-se da meta clínica, não "descer = verde".
  // Peso/IMC: bom quando se move para a faixa saudável. %Gordura: menor. Demais: maior.
  const deltaColor = (() => {
    if (healthyBand) {
      const dCur = distToBand(current, healthyBand)
      const dFirst = distToBand(first, healthyBand)
      if (dCur == null || dFirst == null) return t.textMuted
      if (dCur < dFirst - 0.05) return t.success
      if (dCur > dFirst + 0.05) return t.warning
      return t.textMuted
    }
    if (metric === 'fat') return decreasing ? t.success : increasing ? t.warning : t.textMuted
    return increasing ? t.success : decreasing ? t.warning : t.textMuted
  })()

  const macroTotals = useMemo(() => {
    if (metric !== 'nutrition' || !charts?.nutrition?.length) return null
    return charts.nutrition.reduce(
      (acc, d) => ({ protein: acc.protein + (d.protein_g || 0), carbs: acc.carbs + (d.carbs_g || 0), fat: acc.fat + (d.fat_g || 0) }),
      { protein: 0, carbs: 0, fat: 0 },
    )
  }, [metric, charts])

  // A Nutrição vem só de fotos de refeição analisadas pela IA; os registros de
  // hoje só entram no gráfico depois que a análise conclui. Detecta se hoje já
  // tem ponto para avisar o usuário (evita a impressão de "faltou dado").
  const todayStr = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })()
  const nutritionMissingToday =
    metric === 'nutrition' && !(charts?.nutrition ?? []).some((d) => d.date === todayStr)

  const chartWidth = Dimensions.get('window').width - SCREEN_PADDING * 2 - space.lg * 2
  const fmtVal = (v: number) => `${v.toFixed(series.decimals).replace('.', ',')}${series.unit ? ` ${series.unit}` : ''}`
  const currentLabel = metric === 'nutrition' || metric === 'water' ? 'Último dia' : 'Atual'
  const bmiCat = metric === 'bmi' && current != null ? bmiCategory(current) : null
  const bmiCatColor = !bmiCat ? t.textMuted
    : bmiCat.key === 'ok' ? t.success
    : bmiCat.key === 'low' ? t.info
    : bmiCat.key === 'over' ? t.warning
    : t.error
  const bmiCatBg = !bmiCat ? t.surfaceSecondary
    : bmiCat.key === 'ok' ? t.successLight
    : bmiCat.key === 'low' ? t.infoLight
    : bmiCat.key === 'over' ? t.warningLight
    : t.errorLight

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: bottomPadding }} showsVerticalScrollIndicator={false}>
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
                borderRadius: radius.full,
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
              style={{ paddingHorizontal: space.md, paddingVertical: space.xs + 2, borderRadius: radius.full, backgroundColor: active ? t.primary : t.surfaceSecondary }}
            >
              <Text style={[typography.labelSm, { color: active ? t.primaryFg : t.textMuted }]}>{p.label}</Text>
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
                {bmiCat && (
                  <View style={{ alignSelf: 'flex-start', marginTop: space.xs, paddingHorizontal: space.sm, paddingVertical: 3, borderRadius: radius.full, backgroundColor: bmiCatBg }}>
                    <Text style={[typography.captionBold, { color: bmiCatColor }]}>{bmiCat.label}</Text>
                  </View>
                )}
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

            <LineChart
              data={points}
              width={chartWidth}
              unit={series.unit}
              decimals={series.decimals}
              band={healthyBand ? { from: healthyBand[0], to: healthyBand[1], color: t.success } : null}
            />

            {macroTotals && (
              <View style={{ marginTop: space.lg }}>
                <Text style={[typography.caption, { color: t.textMuted, marginBottom: space.xs }]}>Macros estimados no período</Text>
                <MacrosBar protein_g={macroTotals.protein} carbs_g={macroTotals.carbs} fat_g={macroTotals.fat} />
              </View>
            )}

            <Text style={[typography.caption, { color: t.textMuted, marginTop: space.sm }]}>
              {points.length} {points.length === 1 ? 'registro' : 'registros'} no período
            </Text>

            {metric === 'nutrition' && (
              <Text style={[typography.caption, { color: t.textMuted, marginTop: space.xs }]}>
                Calorias estimadas pela IA a partir das fotos de refeição.
                {nutritionMissingToday ? ' Os registros de hoje aparecem aqui assim que a análise das fotos concluir.' : ''}
              </Text>
            )}
          </Card>
        </Animated.View>
      )}
    </ScrollView>
  )
}
