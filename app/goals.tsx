import { useState } from 'react'
import { View, Text, ScrollView, RefreshControl, Pressable, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Target, CheckCircle2, Circle, Flag, Flame, TrendingUp, Trophy } from 'lucide-react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { haptics } from '../src/lib/haptics'
import { useThemeColors } from '../src/stores/theme'
import { useFeaturesStore } from '../src/stores/features'
import { useGoals, useToggleGoalCheckin, useReportGoalProgress } from '../src/hooks/usePortal'
import { habitStreak, isCheckedToday, streakUnit, cadenceLabel } from '../src/lib/habit'
import { computeWeeklySummary, nextGoalMilestone, nextStreakMilestone, GOAL_MILESTONES } from '../src/lib/goalMilestones'
import type { PortalGoal } from '../src/types/portal'
import { ScreenHeader, Card, SectionLabel, EmptyState, ErrorState, SkeletonList, KeyboardAvoidingWrapper } from '../src/components/ui'
import { ReadOnlyBanner } from '../src/components/ui/ReadOnlyBanner'
import { radius, space, typography, SCREEN_PADDING } from '../src/theme/tokens'

const PRIORITY_LABELS: Record<string, string> = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
}

const TYPE_LABELS: Record<string, string> = {
  weight: 'Peso',
  measurement: 'Medida',
  behavioral: 'Comportamental',
  nutritional: 'Nutricional',
  lab_value: 'Exame',
  custom: 'Personalizada',
}

// P0-1: progresso vem pronto do servidor (fonte única). Sem cálculo local.

export default function GoalsScreen() {
  const t = useThemeColors()
  const canWrite = useFeaturesStore((s) => s.canWrite)
  const { data: goals, isLoading, isError, refetch, isRefetching } = useGoals()

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
        <ScreenHeader title="Metas" />
        <SkeletonList />
      </SafeAreaView>
    )
  }

  if (isError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
        <ScreenHeader title="Metas" />
        <ErrorState onRetry={() => refetch()} />
      </SafeAreaView>
    )
  }

  const goalList: PortalGoal[] = goals ?? []
  const active = goalList.filter((g) => g.status === 'active')
  const completed = goalList.filter((g) => g.status === 'completed')

  if (!goals || goals.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
        <ScreenHeader title="Metas" />
        <EmptyState
          icon={<Target size={28} color={t.primary} />}
          title="Sem metas"
          description="Quando o nutricionista definir metas, elas aparecerão aqui."
        />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
      <ScreenHeader title="Metas" />
      <KeyboardAvoidingWrapper>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: SCREEN_PADDING, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={t.primary} />}
      >
        {!canWrite && (
          <View style={{ marginHorizontal: -SCREEN_PADDING }}>
            <ReadOnlyBanner />
          </View>
        )}
        <WeeklySummaryCard goals={goalList} />
        {active.length > 0 && (
          <>
            <SectionLabel text={`ATIVAS (${active.length})`} />
            {active.map((g, i) => (
              <Animated.View key={g.id} entering={FadeInDown.duration(300).delay(i * 60)}>
                <GoalCard goal={g} />
              </Animated.View>
            ))}
          </>
        )}
        {completed.length > 0 && (
          <View style={{ marginTop: active.length > 0 ? space.xl : 0 }}>
            <SectionLabel text={`CONCLUÍDAS (${completed.length})`} />
            {completed.map((g, i) => (
              <Animated.View key={g.id} entering={FadeInDown.duration(300).delay((active.length + i) * 60)}>
                <GoalCard goal={g} />
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>
      </KeyboardAvoidingWrapper>
    </SafeAreaView>
  )
}

// P1-6: revisão semanal — snapshot dos últimos 7 dias derivado das metas ativas.
function WeeklySummaryCard({ goals }: { goals: PortalGoal[] }) {
  const t = useThemeColors()
  const s = computeWeeklySummary(goals)
  if (s.activeGoals === 0) return null

  const stats = [
    { icon: <CheckCircle2 size={16} color={t.primary} />, value: String(s.checkins), label: s.checkins === 1 ? 'check-in' : 'check-ins' },
    { icon: <Flame size={16} color={t.warning} />, value: String(s.bestStreak), label: 'sequência' },
    { icon: <Trophy size={16} color={t.success} />, value: `${s.reachedGoals}/${s.activeGoals}`, label: 'atingidas' },
  ]

  return (
    <Card style={{ marginBottom: space.md }}>
      <Text style={[typography.headingSm, { color: t.text, marginBottom: space.md }]}>Resumo da semana</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {stats.map((st, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
            {st.icon}
            <Text style={[typography.headingMd, { color: t.text }]}>{st.value}</Text>
            <Text style={[typography.caption, { color: t.textMuted }]}>{st.label}</Text>
          </View>
        ))}
      </View>
    </Card>
  )
}

function GoalCard({ goal }: { goal: PortalGoal }) {
  const t = useThemeColors()
  const canWrite = useFeaturesStore((s) => s.canWrite)
  const progress = goal.progress ?? null
  const pct = progress?.pct ?? null
  const hasValues = goal.target_value != null && goal.current_value != null
  const unit = goal.target_unit ? ` ${goal.target_unit}` : ''
  const isCompleted = goal.status === 'completed'
  const toggle = useToggleGoalCheckin()
  const report = useReportGoalProgress()
  const habit = goal.habit ?? null
  const checkedToday = habit ? isCheckedToday(habit) : false
  const streak = habit ? habitStreak(habit) : 0
  const onToggle = () => {
    if (!canWrite) return
    haptics.light()
    toggle.mutate(goal.id)
  }

  // P1-5: paciente reporta progresso de metas numéricas (não-hábito, não-exame).
  const [reporting, setReporting] = useState(false)
  const [reportValue, setReportValue] = useState('')
  const canReport = canWrite && !isCompleted && !habit && goal.type !== 'lab_value' && goal.type !== 'behavioral'
  const onSaveReport = () => {
    const num = parseFloat(reportValue.replace(',', '.'))
    if (!Number.isFinite(num)) return
    haptics.light()
    report.mutate({ goalId: goal.id, value: num }, { onSuccess: () => setReporting(false) })
  }

  const prioColor = goal.priority === 'high' ? t.error : goal.priority === 'medium' ? t.warning : t.textMuted
  const prioLabel = PRIORITY_LABELS[goal.priority] || goal.priority

  return (
    <Card style={{ marginBottom: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
        <View style={{
          width: 28, height: 28,
          borderRadius: radius.sm,
          alignItems: 'center', justifyContent: 'center',
          marginTop: 2,
          backgroundColor: isCompleted ? t.successLight : t.primaryLight,
        }}>
          {isCompleted
            ? <CheckCircle2 size={16} color={t.success} />
            : <Circle size={16} color={t.primary} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[typography.headingSm, { color: t.text }]}>{goal.title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: 6 }}>
            <Text style={[typography.caption, { color: t.textMuted }]}>
              {TYPE_LABELS[goal.type] || goal.type}
            </Text>
            <View style={{
              paddingHorizontal: 6, paddingVertical: 2,
              borderRadius: radius.sm - 2,
              backgroundColor: prioColor + '15',
            }}>
              <Text style={[typography.captionBold, { color: prioColor, fontSize: 10 }]}>
                {prioLabel}
              </Text>
            </View>
            {goal.due_date ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Flag size={10} color={t.textMuted} />
                <Text style={[typography.caption, { color: t.textMuted }]}>
                  {new Date(goal.due_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {hasValues && (
        <View style={{ marginTop: space.md, marginLeft: 28 + space.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={[typography.caption, { color: t.textMuted }]}>
              {goal.current_value}{unit} de {goal.target_value}{unit}
            </Text>
            <Text style={[typography.captionBold, { color: isCompleted || progress?.reached ? t.success : t.primary }]}>
              {isCompleted || progress?.reached
                ? 'Meta atingida'
                : pct != null
                  ? `${Math.round(pct)}%`
                  : progress?.remaining != null
                    ? `faltam ${progress.remaining}${unit}`
                    : ''}
            </Text>
          </View>
          {pct != null && (
            <>
              <View
                accessibilityRole="progressbar"
                accessibilityLabel={`Progresso da meta: ${Math.round(pct)}%`}
                accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
                style={{ height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: t.borderLight }}
              >
                <View style={{
                  height: 6,
                  borderRadius: 3,
                  width: `${pct}%`,
                  backgroundColor: isCompleted || progress?.reached ? t.success : t.primary,
                }} />
                {/* P1-6: marcos (25/50/75%) como divisórias sobre a barra */}
                {GOAL_MILESTONES.slice(0, -1).map((m) => (
                  <View key={m} style={{
                    position: 'absolute', left: `${m}%`, top: 0, bottom: 0, width: 1.5,
                    backgroundColor: pct >= m ? t.background : t.border, opacity: 0.6,
                  }} />
                ))}
              </View>
              {!isCompleted && !progress?.reached && nextGoalMilestone(pct) != null && (
                <Text style={[typography.caption, { color: t.textMuted, marginTop: 5 }]}>
                  Próximo marco: {nextGoalMilestone(pct)}%
                </Text>
              )}
            </>
          )}
        </View>
      )}
      {canReport && (
        <View style={{ marginTop: space.md, marginLeft: 28 + space.md }}>
          {!reporting ? (
            <Pressable
              onPress={() => { setReportValue(goal.current_value != null ? String(goal.current_value) : ''); setReporting(true) }}
              accessibilityRole="button"
              accessibilityLabel="Reportar progresso"
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
                paddingHorizontal: 12, paddingVertical: 7,
                borderRadius: radius.md, backgroundColor: t.primaryLight,
              }}
            >
              <TrendingUp size={15} color={t.primary} />
              <Text style={[typography.captionBold, { color: t.primary }]}>Atualizar progresso</Text>
            </Pressable>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <TextInput
                value={reportValue}
                onChangeText={setReportValue}
                accessibilityLabel="Valor do progresso"
                keyboardType="numeric"
                autoFocus
                placeholder={goal.target_unit ? `Valor (${goal.target_unit})` : 'Valor atual'}
                placeholderTextColor={t.textMuted}
                style={[typography.bodyMd, {
                  flex: 1, color: t.text,
                  borderWidth: 1, borderColor: t.border, borderRadius: radius.md,
                  paddingHorizontal: 12, paddingVertical: 8,
                }]}
              />
              <Pressable
                onPress={onSaveReport}
                disabled={report.isPending}
                accessibilityRole="button"
                accessibilityLabel="Salvar progresso"
                accessibilityState={{ disabled: report.isPending, busy: report.isPending }}
                style={{
                  paddingHorizontal: 14, paddingVertical: 9,
                  borderRadius: radius.md, backgroundColor: t.primary,
                  opacity: report.isPending ? 0.6 : 1,
                }}
              >
                <Text style={[typography.captionBold, { color: '#fff' }]}>Salvar</Text>
              </Pressable>
              <Pressable onPress={() => setReporting(false)} accessibilityRole="button" accessibilityLabel="Cancelar" style={{ paddingHorizontal: 8, paddingVertical: 9 }}>
                <Text style={[typography.captionBold, { color: t.textMuted }]}>Cancelar</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}
      {habit && (
        <View style={{ marginTop: space.md, marginLeft: 28 + space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 }}>
              {streak > 0 ? (
                <>
                  <Flame size={14} color={t.warning} />
                  <Text style={[typography.captionBold, { color: t.text }]}>{streak}</Text>
                  <Text style={[typography.caption, { color: t.textMuted }]}>{streakUnit(habit, streak)} · {cadenceLabel(habit)}</Text>
                </>
              ) : (
                <Text style={[typography.caption, { color: t.textMuted }]}>Hábito {cadenceLabel(habit)}</Text>
              )}
            </View>
            {!isCompleted && (
              <Pressable
                onPress={onToggle}
                disabled={toggle.isPending || !canWrite}
                accessibilityRole="button"
                accessibilityState={{ checked: checkedToday, disabled: toggle.isPending || !canWrite }}
                accessibilityLabel={checkedToday ? 'Check-in de hoje feito. Toque para desmarcar.' : 'Marcar check-in de hoje.'}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 5,
                  paddingHorizontal: 12, paddingVertical: 7,
                  borderRadius: radius.md,
                  backgroundColor: checkedToday ? t.successLight : t.primaryLight,
                  opacity: !canWrite ? 0.6 : 1,
                }}
              >
                {checkedToday ? <CheckCircle2 size={15} color={t.success} /> : <Circle size={15} color={t.primary} />}
                <Text style={[typography.captionBold, { color: checkedToday ? t.success : t.primary }]}>
                  {checkedToday ? 'Feito hoje' : 'Marcar hoje'}
                </Text>
              </Pressable>
            )}
          </View>
          {/* P1-6: marco de sequência (só cadência diária) */}
          {!isCompleted && habit.cadence === 'daily' && streak > 0 && nextStreakMilestone(streak) != null && (
            <Text style={[typography.caption, { color: t.textMuted, marginTop: 6 }]}>
              {(() => { const nm = nextStreakMilestone(streak)!; const d = nm - streak; return `Faltam ${d} ${d === 1 ? 'dia' : 'dias'} para o marco de ${nm} dias 🔥` })()}
            </Text>
          )}
        </View>
      )}
    </Card>
  )
}
