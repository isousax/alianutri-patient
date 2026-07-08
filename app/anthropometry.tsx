import { useState } from 'react'
import { View, Text, ScrollView, Pressable, RefreshControl, Dimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { TrendingDown, TrendingUp, Minus, Ruler } from 'lucide-react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useThemeColors } from '../src/stores/theme'
import { useEvolution, usePortalProfile } from '../src/hooks/usePortal'
import type { PortalEvolution } from '../src/types/portal'
import { Card, ScreenHeader, EmptyState, ErrorState, SkeletonList } from '../src/components/ui'
import { LineChart, type LineChartPoint } from '../src/components/charts/LineChart'
import { typography, space, radius, SCREEN_PADDING } from '../src/theme/tokens'

// "Composição corporal" — superfície de LEITURA das avaliações antropométricas que
// o nutricionista registra (GET /p/:code/evolution). O paciente nunca escreve aqui;
// os dados chegam prontos. Reaproveita o LineChart de evolução (fonte única).

type MetricId = 'fat' | 'lean' | 'fatmass' | 'waist' | 'abdomen' | 'hip' | 'weight' | 'bmi'
type Period = 30 | 90 | 0

interface MetricDef {
  id: MetricId
  label: string
  field: keyof PortalEvolution
  unit: string
  decimals: number
  // direção "boa" da tendência (p/ colorir a variação sem prometer diagnóstico)
  dir: 'down' | 'up' | 'none'
}

const METRICS: MetricDef[] = [
  { id: 'fat', label: '% Gordura', field: 'body_fat_pct', unit: '%', decimals: 1, dir: 'down' },
  { id: 'lean', label: 'Massa magra', field: 'lean_mass_kg', unit: 'kg', decimals: 1, dir: 'up' },
  { id: 'fatmass', label: 'Massa gorda', field: 'fat_mass_kg', unit: 'kg', decimals: 1, dir: 'down' },
  { id: 'waist', label: 'Cintura', field: 'waist_cm', unit: 'cm', decimals: 1, dir: 'down' },
  { id: 'abdomen', label: 'Abdômen', field: 'abdomen_cm', unit: 'cm', decimals: 1, dir: 'down' },
  { id: 'hip', label: 'Quadril', field: 'hip_cm', unit: 'cm', decimals: 1, dir: 'none' },
  { id: 'weight', label: 'Peso', field: 'weight_kg', unit: 'kg', decimals: 1, dir: 'none' },
  { id: 'bmi', label: 'IMC', field: 'bmi', unit: '', decimals: 1, dir: 'none' },
]

const PERIODS: { id: Period; label: string }[] = [
  { id: 30, label: '30d' },
  { id: 90, label: '90d' },
  { id: 0, label: 'Tudo' },
]

const PROTOCOL_LABELS: Record<string, string> = {
  jackson_pollock_3: 'Jackson-Pollock 3 dobras',
  jackson_pollock_7: 'Jackson-Pollock 7 dobras',
  durnin_womersley: 'Durnin-Womersley',
  faulkner: 'Faulkner',
  guedes: 'Guedes',
  petroski: 'Petroski',
  bioimpedance: 'Bioimpedância',
  dexa: 'DEXA',
  other: 'Outro protocolo',
}

const CIRCUMFERENCES: { field: keyof PortalEvolution; label: string }[] = [
  { field: 'neck_cm', label: 'Pescoço' },
  { field: 'chest_cm', label: 'Tórax' },
  { field: 'waist_cm', label: 'Cintura' },
  { field: 'abdomen_cm', label: 'Abdômen' },
  { field: 'hip_cm', label: 'Quadril' },
  { field: 'arm_right_cm', label: 'Braço D' },
  { field: 'arm_left_cm', label: 'Braço E' },
  { field: 'forearm_right_cm', label: 'Antebraço D' },
  { field: 'forearm_left_cm', label: 'Antebraço E' },
  { field: 'thigh_right_cm', label: 'Coxa D' },
  { field: 'thigh_left_cm', label: 'Coxa E' },
  { field: 'calf_right_cm', label: 'Panturrilha D' },
  { field: 'calf_left_cm', label: 'Panturrilha E' },
]

const SKINFOLDS: { field: keyof PortalEvolution; label: string }[] = [
  { field: 'skinfold_triceps', label: 'Tríceps' },
  { field: 'skinfold_biceps', label: 'Bíceps' },
  { field: 'skinfold_subscapular', label: 'Subescapular' },
  { field: 'skinfold_suprailiac', label: 'Supra-ilíaca' },
  { field: 'skinfold_abdominal', label: 'Abdominal' },
  { field: 'skinfold_thigh', label: 'Coxa' },
  { field: 'skinfold_chest', label: 'Peitoral' },
  { field: 'skinfold_midaxillary', label: 'Axilar média' },
  { field: 'skinfold_calf', label: 'Panturrilha' },
]

function fmtDayMonth(iso: string): string {
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}
function fmtFullDate(iso: string): string {
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}
function withinPeriod(iso: string, days: Period): boolean {
  if (days === 0) return true
  const ts = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso).getTime()
  if (isNaN(ts)) return true
  return Date.now() - ts <= days * 86400000
}
function bmiCategory(v: number): { label: string; key: 'low' | 'ok' | 'over' | 'obese' } {
  if (v < 18.5) return { label: 'Abaixo do peso', key: 'low' }
  if (v < 25) return { label: 'Peso saudável', key: 'ok' }
  if (v < 30) return { label: 'Sobrepeso', key: 'over' }
  return { label: 'Obesidade', key: 'obese' }
}
const num = (v: number | null | undefined, decimals = 1, unit = '') =>
  v == null ? '—' : `${v.toFixed(decimals).replace('.', ',')}${unit ? ` ${unit}` : ''}`

function StatTile({ label, value, color, hint }: { label: string; value: string; color?: string; hint?: string }) {
  const t = useThemeColors()
  return (
    <View
      style={{
        flexBasis: '31%',
        flexGrow: 1,
        minWidth: 0,
        backgroundColor: t.surfaceSecondary,
        borderRadius: radius.lg,
        paddingVertical: space.sm + 2,
        paddingHorizontal: space.md,
      }}
    >
      <Text numberOfLines={1} style={[typography.caption, { color: t.textMuted }]}>{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={[typography.headingSm, { color: color ?? t.text, marginTop: 2 }]}>{value}</Text>
      {hint ? (
        <Text numberOfLines={1} style={[typography.caption, { color: color ?? t.textMuted, marginTop: 1, fontSize: 10 }]}>{hint}</Text>
      ) : null}
    </View>
  )
}

function Dot({ color }: { color: string }) {
  return <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
}

export default function AnthropometryScreen() {
  const t = useThemeColors()
  const { data: evolution, isLoading, isError, refetch, isRefetching } = useEvolution()
  const { data: profile } = usePortalProfile()
  const [metric, setMetric] = useState<MetricId>('fat')
  const [period, setPeriod] = useState<Period>(90)

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
        <ScreenHeader title="Composição corporal" />
        <SkeletonList />
      </SafeAreaView>
    )
  }
  if (isError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
        <ScreenHeader title="Composição corporal" />
        <ErrorState onRetry={() => refetch()} />
      </SafeAreaView>
    )
  }

  const evals: PortalEvolution[] = [...(evolution ?? [])].sort((a, b) => a.evaluation_date.localeCompare(b.evaluation_date))

  if (evals.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
        <ScreenHeader title="Composição corporal" />
        <EmptyState
          icon={<Ruler size={28} color={t.primary} />}
          title="Sem avaliações ainda"
          description="As avaliações de composição corporal feitas pelo seu nutricionista aparecerão aqui."
          actionLabel="Atualizar"
          onAction={() => refetch()}
        />
      </SafeAreaView>
    )
  }

  const latest = evals[evals.length - 1]
  const heightCm = latest.height_cm ?? profile?.height_cm ?? null

  // Composição: usa massa magra/gorda medida; se ausente, deriva de peso × %gordura.
  let fatMass = latest.fat_mass_kg
  let leanMass = latest.lean_mass_kg
  if ((fatMass == null || leanMass == null) && latest.weight_kg != null && latest.body_fat_pct != null) {
    const derivedFat = (latest.weight_kg * latest.body_fat_pct) / 100
    fatMass = fatMass ?? derivedFat
    leanMass = leanMass ?? latest.weight_kg - derivedFat
  }
  const compTotal = (fatMass ?? 0) + (leanMass ?? 0)
  const fatFrac = compTotal > 0 && fatMass != null ? fatMass / compTotal : null

  // Variação de %gordura vs. avaliação anterior que também tenha o dado.
  const fatEvals = evals.filter((e) => e.body_fat_pct != null)
  const prevFat = fatEvals.length > 1 ? fatEvals[fatEvals.length - 2].body_fat_pct : null
  const fatDelta = latest.body_fat_pct != null && prevFat != null ? latest.body_fat_pct - prevFat : null
  const FatDeltaIcon = fatDelta == null ? Minus : fatDelta < 0 ? TrendingDown : fatDelta > 0 ? TrendingUp : Minus
  const fatDeltaColor = fatDelta == null ? t.textMuted : fatDelta < -0.05 ? t.success : fatDelta > 0.05 ? t.warning : t.textMuted

  // Razões clínicas: RCQ (cintura/quadril) e RCEst (cintura/estatura, sexo-independente).
  const whr = latest.waist_cm != null && latest.hip_cm != null && latest.hip_cm > 0 ? latest.waist_cm / latest.hip_cm : null
  const whtr = latest.waist_cm != null && heightCm ? latest.waist_cm / heightCm : null
  const whtrRisk =
    whtr == null
      ? null
      : whtr < 0.5
      ? { label: 'Saudável', color: t.success }
      : whtr < 0.6
      ? { label: 'Risco aumentado', color: t.warning }
      : { label: 'Risco alto', color: t.error }

  const bmiCat = latest.bmi != null ? bmiCategory(latest.bmi) : null
  const bmiColor = !bmiCat
    ? t.text
    : bmiCat.key === 'ok'
    ? t.success
    : bmiCat.key === 'low'
    ? t.info
    : bmiCat.key === 'over'
    ? t.warning
    : t.error

  // Série da tendência para a métrica selecionada.
  const def = METRICS.find((m) => m.id === metric)!
  const points: LineChartPoint[] = evals
    .filter((e) => (e[def.field] as number | null) != null && withinPeriod(e.evaluation_date, period))
    .map((e) => ({ label: fmtDayMonth(e.evaluation_date), value: e[def.field] as number }))
  const cur = points.length ? points[points.length - 1].value : null
  const first = points.length ? points[0].value : null
  const delta = cur != null && first != null ? cur - first : null
  const decreasing = delta != null && delta < -0.05
  const increasing = delta != null && delta > 0.05
  const DeltaIcon = decreasing ? TrendingDown : increasing ? TrendingUp : Minus
  const deltaColor =
    def.dir === 'none'
      ? t.textMuted
      : def.dir === 'down'
      ? decreasing
        ? t.success
        : increasing
        ? t.warning
        : t.textMuted
      : increasing
      ? t.success
      : decreasing
      ? t.warning
      : t.textMuted

  const chartWidth = Dimensions.get('window').width - SCREEN_PADDING * 2 - space.lg * 2
  const fmtVal = (v: number) => `${v.toFixed(def.decimals).replace('.', ',')}${def.unit ? ` ${def.unit}` : ''}`
  const chartSummary =
    cur == null
      ? undefined
      : `${def.label}: atual ${fmtVal(cur)}${
          delta != null
            ? `, variação ${delta > 0 ? '+' : ''}${delta.toFixed(def.decimals).replace('.', ',')}${def.unit ? ` ${def.unit}` : ''} no período`
            : ''
        }.`

  const history = [...evals].reverse().slice(0, 12)

  const circumferences = CIRCUMFERENCES.filter((c) => latest[c.field] != null)
  const skinfolds = SKINFOLDS.filter((s) => latest[s.field] != null)
  const skinfoldSum = skinfolds.reduce((n, s) => n + (latest[s.field] as number), 0)
  const protocolLabel = latest.protocol ? PROTOCOL_LABELS[latest.protocol] ?? latest.protocol : null

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
      <ScreenHeader title="Composição corporal" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={t.primary} />}
      >
        {/* ═══════ HERO — última avaliação + split de composição ═══════ */}
        <Animated.View entering={FadeInDown.duration(350)} style={{ paddingHorizontal: SCREEN_PADDING, marginTop: space.md }}>
          <Card>
            <Text style={[typography.overline, { color: t.textMuted }]}>ÚLTIMA AVALIAÇÃO</Text>
            <Text style={[typography.caption, { color: t.textSecondary, marginTop: 2 }]}>{fmtFullDate(latest.evaluation_date)}</Text>
            {protocolLabel ? (
              <View style={{ alignSelf: 'flex-start', marginTop: space.sm, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: space.sm, paddingVertical: 3, borderRadius: radius.full, backgroundColor: t.surfaceSecondary }}>
                <Ruler size={12} color={t.textMuted} />
                <Text style={[typography.caption, { color: t.textSecondary }]}>{protocolLabel}</Text>
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: space.sm }}>
              <View>
                <Text style={[typography.caption, { color: t.textMuted }]}>Gordura corporal</Text>
                <Text style={[typography.displaySm, { color: t.text }]}>{num(latest.body_fat_pct, 1, '%')}</Text>
              </View>
              {fatDelta != null && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: space.sm, paddingVertical: 4, borderRadius: radius.md, backgroundColor: t.surfaceSecondary }}>
                  <FatDeltaIcon size={14} color={fatDeltaColor} />
                  <Text style={[typography.captionBold, { color: fatDeltaColor }]}>
                    {fatDelta > 0 ? '+' : ''}{fatDelta.toFixed(1).replace('.', ',')} pp
                  </Text>
                  <Text style={[typography.caption, { color: t.textMuted }]}>vs. anterior</Text>
                </View>
              )}
            </View>

            {fatFrac != null ? (
              <View style={{ marginTop: space.lg }}>
                <View style={{ flexDirection: 'row', height: 12, borderRadius: radius.full, overflow: 'hidden', backgroundColor: t.surfaceSecondary }}>
                  <View style={{ flex: fatFrac, backgroundColor: t.warning }} />
                  <View style={{ flex: 1 - fatFrac, backgroundColor: t.primary }} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: space.sm }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Dot color={t.warning} />
                    <Text style={[typography.caption, { color: t.textSecondary }]}>
                      Massa gorda {num(fatMass, 1, 'kg')} · {Math.round(fatFrac * 100)}%
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Dot color={t.primary} />
                    <Text style={[typography.caption, { color: t.textSecondary }]}>
                      Massa magra {num(leanMass, 1, 'kg')} · {Math.round((1 - fatFrac) * 100)}%
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <Text style={[typography.caption, { color: t.textMuted, marginTop: space.md }]}>
                Sem dados de massa magra/gorda nesta avaliação.
              </Text>
            )}
          </Card>
        </Animated.View>

        {/* ═══════ INDICADORES ═══════ */}
        <View style={{ paddingHorizontal: SCREEN_PADDING, marginTop: space.xl }}>
          <Text style={[typography.overline, { color: t.textMuted, marginBottom: space.sm }]}>INDICADORES</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            <StatTile label="IMC" value={num(latest.bmi, 1)} color={bmiColor} hint={bmiCat?.label} />
            <StatTile label="% Gordura" value={num(latest.body_fat_pct, 1, '%')} />
            <StatTile label="Massa magra" value={num(leanMass, 1, 'kg')} color={t.primary} />
            <StatTile label="Massa gorda" value={num(fatMass, 1, 'kg')} color={t.warning} />
            <StatTile label="Cintura" value={num(latest.waist_cm, 1, 'cm')} />
            <StatTile label="Quadril" value={num(latest.hip_cm, 1, 'cm')} />
            <StatTile label="RCQ (cint/quadril)" value={num(whr, 2)} />
            <StatTile
              label="Cint/Estatura"
              value={num(whtr, 2)}
              color={whtrRisk?.color}
              hint={whtrRisk?.label}
            />
          </View>
        </View>

        {/* ═══════ MEDIDAS ═══════ */}
        {circumferences.length > 0 ? (
          <View style={{ paddingHorizontal: SCREEN_PADDING, marginTop: space.xl }}>
            <Text style={[typography.overline, { color: t.textMuted, marginBottom: space.sm }]}>MEDIDAS (CM)</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {circumferences.map((c) => (
                <StatTile key={c.field as string} label={c.label} value={num(latest[c.field] as number, 1, 'cm')} />
              ))}
            </View>
          </View>
        ) : null}

        {/* ═══════ DOBRAS CUTÂNEAS ═══════ */}
        {skinfolds.length > 0 ? (
          <View style={{ paddingHorizontal: SCREEN_PADDING, marginTop: space.xl }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: space.sm }}>
              <Text style={[typography.overline, { color: t.textMuted }]}>DOBRAS CUTÂNEAS (MM)</Text>
              <Text style={[typography.caption, { color: t.textSecondary }]}>Σ {skinfoldSum.toFixed(1).replace('.', ',')} mm</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {skinfolds.map((s) => (
                <StatTile key={s.field as string} label={s.label} value={num(latest[s.field] as number, 1, 'mm')} />
              ))}
            </View>
          </View>
        ) : null}

        {/* ═══════ TENDÊNCIA ═══════ */}
        <View style={{ marginTop: space.xl }}>
          <Text style={[typography.overline, { color: t.textMuted, marginBottom: space.sm, paddingHorizontal: SCREEN_PADDING }]}>TENDÊNCIA</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingHorizontal: SCREEN_PADDING }}>
            {METRICS.map((m) => {
              const active = metric === m.id
              return (
                <Pressable
                  key={m.id}
                  onPress={() => setMetric(m.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={{ paddingHorizontal: space.lg, paddingVertical: space.sm + 2, borderRadius: radius.full, backgroundColor: active ? t.primary : t.surfaceSecondary }}
                >
                  <Text style={[typography.labelMd, { color: active ? t.primaryFg : t.textSecondary }]}>{m.label}</Text>
                </Pressable>
              )
            })}
          </ScrollView>

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

          <View style={{ paddingHorizontal: SCREEN_PADDING, marginTop: space.lg }}>
            <Card>
              {points.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: space.xl }}>
                  <Text style={[typography.bodyMd, { color: t.textMuted, textAlign: 'center' }]}>
                    Sem registros de {def.label.toLowerCase()} neste período.
                  </Text>
                </View>
              ) : (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: space.lg }}>
                    <View>
                      <Text style={[typography.caption, { color: t.textMuted }]}>Atual</Text>
                      <Text style={[typography.displaySm, { color: t.text }]}>{cur != null ? fmtVal(cur) : '—'}</Text>
                    </View>
                    {delta != null && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: space.sm, paddingVertical: 4, borderRadius: radius.md, backgroundColor: t.surfaceSecondary }}>
                        <DeltaIcon size={14} color={deltaColor} />
                        <Text style={[typography.captionBold, { color: deltaColor }]}>
                          {delta > 0 ? '+' : ''}{delta.toFixed(def.decimals).replace('.', ',')}{def.unit ? ` ${def.unit}` : ''}
                        </Text>
                        <Text style={[typography.caption, { color: t.textMuted }]}>no período</Text>
                      </View>
                    )}
                  </View>
                  <LineChart data={points} width={chartWidth} unit={def.unit} decimals={def.decimals} accessibilityLabel={chartSummary} />
                  <Text style={[typography.caption, { color: t.textMuted, marginTop: space.sm }]}>
                    {points.length} {points.length === 1 ? 'avaliação' : 'avaliações'} no período
                  </Text>
                </>
              )}
            </Card>
          </View>
        </View>

        {/* ═══════ HISTÓRICO ═══════ */}
        <View style={{ paddingHorizontal: SCREEN_PADDING, marginTop: space.xl }}>
          <Text style={[typography.overline, { color: t.textMuted, marginBottom: space.sm }]}>HISTÓRICO</Text>
          <Card>
            {history.map((e, i) => (
              <View
                key={e.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: space.sm + 2,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: t.borderLight,
                }}
              >
                <Text style={[typography.labelMd, { color: t.text }]}>{fmtDayMonth(e.evaluation_date)}</Text>
                <View style={{ flexDirection: 'row', gap: space.lg }}>
                  <Text style={[typography.caption, { color: t.textSecondary }]}>{num(e.body_fat_pct, 1, '%')} gord.</Text>
                  <Text style={[typography.caption, { color: t.textSecondary }]}>{num(e.waist_cm, 0, 'cm')} cint.</Text>
                  <Text style={[typography.caption, { color: t.textSecondary }]}>{num(e.weight_kg, 1, 'kg')}</Text>
                </View>
              </View>
            ))}
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
