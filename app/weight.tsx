import { useState, useCallback } from 'react'
import {
  View, Text, ScrollView, Pressable, TextInput, Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  Scale, TrendingDown, TrendingUp, Minus, CalendarDays, ChevronDown, Trash2,
} from 'lucide-react-native'
import { haptics } from '../src/lib/haptics'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { useThemeColors } from '../src/stores/theme'
import { useFeaturesStore } from '../src/stores/features'
import { toast } from '../src/stores/toast'
import { confirm } from '../src/stores/confirm'
import { useLogWeight, useWeightHistory, useDeleteWeight, useGoals, usePortalProfile } from '../src/hooks/usePortal'
import type { WeightLogEntry } from '../src/types/portal'
import { LineChart, type LineChartPoint } from '../src/components/charts/LineChart'
import { movingAverage, weeklyRate, weeksToTarget } from '../src/lib/weightStats'
import { ScreenHeader, Card, SectionLabel, KeyboardAvoidingWrapper, CalendarSheet } from '../src/components/ui'
import { ReadOnlyBanner } from '../src/components/ui/ReadOnlyBanner'
import { shadows, radius, space, typography, SCREEN_PADDING, todayStr } from '../src/theme/tokens'

function LegendDot({ color, label }: { color: string; label: string }) {
  const t = useThemeColors()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text style={[typography.caption, { color: t.textMuted }]}>{label}</Text>
    </View>
  )
}

function InsightChip({ label, value }: { label: string; value: string }) {
  const t = useThemeColors()
  return (
    <View style={{ flex: 1, backgroundColor: t.surfaceSecondary, borderRadius: radius.lg, paddingVertical: space.sm, paddingHorizontal: space.md }}>
      <Text style={[typography.caption, { color: t.textMuted }]}>{label}</Text>
      <Text style={[typography.labelMd, { color: t.text, marginTop: 2 }]}>{value}</Text>
    </View>
  )
}

export default function WeightScreen() {
  const t = useThemeColors()
  const canWrite = useFeaturesStore((s) => s.canWrite)
  const [value, setValue] = useState('')
  const [date, setDate] = useState(todayStr())
  const [showCalendar, setShowCalendar] = useState(false)
  const { data } = useWeightHistory()
  const { mutateAsync: logWeight, isPending } = useLogWeight()
  const { mutateAsync: deleteWeight } = useDeleteWeight()
  const { data: goals } = useGoals()
  const { data: profile } = usePortalProfile()

  const entries: WeightLogEntry[] = data?.entries ?? []
  const existingForDate = entries.find((e) => e.entry_date === date && e.source === 'patient')

  const dateLabel = date === todayStr()
    ? 'Hoje'
    : new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const handleSave = useCallback(async () => {
    if (!canWrite) return
    const kg = parseFloat(value.replace(',', '.'))
    if (isNaN(kg) || kg < 20 || kg > 400) {
      toast.error('Informe um peso entre 20 e 400 kg.')
      return
    }
    try {
      haptics.success()
      await logWeight({ date, weight_kg: kg })
      setValue('')
      setDate(todayStr())
      toast.success(`${kg.toFixed(1).replace('.', ',')} kg registrado!`)
    } catch {
      toast.error('Não foi possível salvar.')
    }
  }, [value, date, logWeight, canWrite])

  const startEdit = useCallback((entry: WeightLogEntry) => {
    setDate(entry.entry_date)
    setValue(entry.weight_kg.toFixed(1).replace('.', ','))
    haptics.selection()
  }, [])

  const handleDelete = useCallback((entry: WeightLogEntry) => {
    const fmt = new Date(entry.entry_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })
    confirm({
      title: 'Excluir registro?',
      message: `O peso de ${entry.weight_kg.toFixed(1).replace('.', ',')} kg de ${fmt} será removido.`,
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
      destructive: true,
      onConfirm: async () => {
        try {
          await deleteWeight(entry.entry_date)
          toast.success('Registro removido.')
        } catch {
          toast.error('Não foi possível remover.')
        }
      },
    })
  }, [deleteWeight])

  // Evolução (P-4): série bruta + média móvel 7d + meta do nutri + faixa saudável + insights.
  const points = [...entries].reverse() // ascendente por data
  const chartWidth = Dimensions.get('window').width - SCREEN_PADDING * 2 - space.lg * 2

  const weightGoal = goals?.find((g) => g.type === 'weight' && g.status === 'active' && g.target_value != null)
  const target = weightGoal?.target_value ?? null
  const heightM = profile?.height_cm ? profile.height_cm / 100 : null
  const band = heightM ? { from: 18.5 * heightM * heightM, to: 25 * heightM * heightM } : null

  let sparkline = null
  if (points.length >= 2) {
    const values = points.map((p) => p.weight_kg)
    const chartPoints: LineChartPoint[] = points.map((p) => ({
      label: new Date(p.entry_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
      value: p.weight_kg,
    }))
    const ma7 = movingAverage(values, 7)
    const first = values[0]
    const last = values[values.length - 1]
    const diff = last - first
    const diffStr = `${diff > 0 ? '+' : ''}${diff.toFixed(1).replace('.', ',')} kg`
    const rate = weeklyRate(points.map((p) => ({ date: p.entry_date, value: p.weight_kg })))
    const eta = target != null && rate != null ? weeksToTarget(last, target, rate) : null

    // Cor da tendência: aproximar-se da faixa saudável (se há altura) ou da meta
    // do nutri (se há); senão, perda de peso = verde.
    const distBand = (v: number) => (band ? (v < band.from ? band.from - v : v > band.to ? v - band.to : 0) : null)
    const trendColor = (() => {
      if (band) {
        const dc = distBand(last)!; const df = distBand(first)!
        return dc < df - 0.05 ? t.success : dc > df + 0.05 ? t.warning : t.textMuted
      }
      if (target != null) {
        const dc = Math.abs(target - last); const df = Math.abs(target - first)
        return dc < df - 0.05 ? t.success : dc > df + 0.05 ? t.warning : t.textMuted
      }
      return diff <= 0 ? t.success : t.warning
    })()
    const TrendIcon = diff < -0.05 ? TrendingDown : diff > 0.05 ? TrendingUp : Minus
    const summary = `Evolução de peso: atual ${last.toFixed(1).replace('.', ',')} kg, ${diff === 0 ? 'sem variação' : `${diff > 0 ? 'aumento' : 'redução'} de ${Math.abs(diff).toFixed(1).replace('.', ',')} kg`} em ${points.length} registros${rate != null ? `, ritmo de ${rate > 0 ? '+' : ''}${rate.toFixed(1).replace('.', ',')} kg por semana` : ''}${target != null && eta != null ? (eta <= 0 ? ', meta atingida' : `, meta em cerca de ${Math.max(1, Math.round(eta))} semanas`) : ''}.`

    sparkline = (
      <Animated.View entering={FadeInDown.duration(300)} style={{ paddingHorizontal: SCREEN_PADDING, marginBottom: space.lg }}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 28, height: 28, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: t.surfaceSecondary }}>
                <TrendIcon size={14} color={trendColor} />
              </View>
              <Text style={[typography.headingSm, { color: t.text, marginLeft: space.sm }]}>Evolução</Text>
            </View>
            <Text style={[typography.captionBold, { color: trendColor }]}>{diffStr}</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: space.sm }}>
            <Text style={[typography.headingLg, { color: t.text }]}>
              {last.toFixed(1).replace('.', ',')}
              <Text style={[typography.caption, { color: t.textMuted }]}> kg</Text>
            </Text>
            <Text style={[typography.caption, { color: t.textMuted }]}>{points.length} registros</Text>
          </View>

          <LineChart
            data={chartPoints}
            width={chartWidth}
            height={150}
            unit="kg"
            decimals={1}
            target={target}
            band={band ? { from: band.from, to: band.to, color: t.success } : null}
            overlay={{ values: ma7, color: t.info, dashed: true }}
            accessibilityLabel={summary}
          />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.sm, flexWrap: 'wrap' }}>
            <LegendDot color={t.primary} label="Peso" />
            <LegendDot color={t.info} label="Média 7 dias" />
            {band ? <LegendDot color={t.success} label="Faixa saudável" /> : null}
            {target != null ? <LegendDot color={t.textMuted} label={`Meta ${target.toFixed(1).replace('.', ',')} kg`} /> : null}
          </View>

          {(rate != null || target != null) && (
            <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.md }}>
              {rate != null ? (
                <InsightChip label="Ritmo" value={`${rate > 0 ? '+' : ''}${rate.toFixed(1).replace('.', ',')} kg/sem`} />
              ) : null}
              {target != null ? (
                <InsightChip label="Meta" value={eta == null ? '—' : eta <= 0 ? 'atingida' : eta < 1 ? '< 1 sem' : `~${Math.round(eta)} sem`} />
              ) : null}
            </View>
          )}
        </Card>
      </Animated.View>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
      <ScreenHeader title="Registro de Peso" />

      <KeyboardAvoidingWrapper>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {!canWrite && <ReadOnlyBanner />}
          {/* Input card */}
          <Animated.View entering={FadeIn.duration(300)} style={{ paddingHorizontal: SCREEN_PADDING, marginTop: space.lg, marginBottom: space.lg }}>
            <Card>
              <Text style={[typography.overline, { color: t.textMuted, marginBottom: space.md }]}>
                REGISTRAR PESO
              </Text>
              <Pressable
                onPress={() => { if (canWrite) setShowCalendar(true) }}
                disabled={!canWrite}
                accessibilityRole="button"
                accessibilityLabel="Selecionar data do registro"
                style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, alignSelf: 'flex-start', paddingVertical: space.sm, paddingHorizontal: space.md, borderRadius: radius.lg, backgroundColor: t.surfaceSecondary, borderWidth: 1, borderColor: t.borderLight, marginBottom: existingForDate ? space.xs : space.md }}
              >
                <CalendarDays size={16} color={t.primary} />
                <Text style={[typography.labelMd, { color: t.text }]}>{dateLabel}</Text>
                <ChevronDown size={16} color={t.textMuted} />
              </Pressable>
              {existingForDate ? (
                <Text style={[typography.caption, { color: t.textMuted, marginBottom: space.md }]}>
                  Já há {existingForDate.weight_kg.toFixed(1).replace('.', ',')} kg nesse dia — salvar substitui.
                </Text>
              ) : null}
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
                  {isPending ? 'Salvando...' : existingForDate ? 'Atualizar peso' : 'Registrar peso'}
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
                const isPatient = entry.source === 'patient'
                const isEditing = entry.entry_date === date && isPatient
                return (
                  <Pressable
                    key={`${entry.entry_date}-${entry.source}`}
                    onPress={isPatient && canWrite ? () => startEdit(entry) : undefined}
                    disabled={!isPatient || !canWrite}
                    accessibilityRole={isPatient ? 'button' : undefined}
                    accessibilityLabel={isPatient ? `Editar registro de ${fmtDate}` : undefined}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: space.sm + 2,
                      paddingHorizontal: space.md,
                      borderRadius: radius.lg,
                      marginBottom: 6,
                      backgroundColor: t.surface,
                      borderWidth: isEditing ? 1.5 : 0,
                      borderColor: t.primary,
                      ...shadows.sm,
                    }}
                  >
                    <Scale size={14} color={t.accent} />
                    <Text style={[typography.labelMd, { color: t.text, marginLeft: space.sm }]}>
                      {entry.weight_kg.toFixed(1).replace('.', ',')} kg
                    </Text>
                    {!isPatient ? (
                      <View style={{ marginLeft: space.sm, paddingHorizontal: 6, paddingVertical: 1, borderRadius: radius.sm, backgroundColor: t.surfaceSecondary }}>
                        <Text style={[typography.caption, { color: t.textMuted, fontSize: 10 }]}>nutri</Text>
                      </View>
                    ) : null}
                    <View style={{ flex: 1 }} />
                    {diff !== 0 && (
                      <Text
                        style={[typography.captionBold, { color: diff < 0 ? t.success : t.warning, marginRight: space.sm }]}
                      >
                        {diff > 0 ? '+' : ''}{diff.toFixed(1).replace('.', ',')}
                      </Text>
                    )}
                    <Text style={[typography.caption, { color: t.textMuted }]}>{fmtDate}</Text>
                    {isPatient && canWrite ? (
                      <Pressable
                        onPress={() => handleDelete(entry)}
                        hitSlop={10}
                        accessibilityRole="button"
                        accessibilityLabel={`Excluir registro de ${fmtDate}`}
                        style={{ marginLeft: space.md, padding: 2 }}
                      >
                        <Trash2 size={15} color={t.textMuted} />
                      </Pressable>
                    ) : null}
                  </Pressable>
                )
              })}
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingWrapper>

      <CalendarSheet
        visible={showCalendar}
        onClose={() => setShowCalendar(false)}
        selected={date}
        onSelect={setDate}
      />
    </SafeAreaView>
  )
}
