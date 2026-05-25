import { View, Text, ScrollView, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Target, CheckCircle2, Circle, Flag } from 'lucide-react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useThemeColors } from '../src/stores/theme'
import { useGoals } from '../src/hooks/usePortal'
import type { PortalGoal } from '../src/types/portal'
import { ScreenHeader, Card, SectionLabel, EmptyState, LoadingScreen } from '../src/components/ui'
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

function progressPct(goal: PortalGoal): number | null {
  if (goal.target_value == null || goal.current_value == null || goal.target_value === 0) return null
  return Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
}

export default function GoalsScreen() {
  const t = useThemeColors()
  const { data: goals, isLoading, refetch, isRefetching } = useGoals()

  if (isLoading) return <LoadingScreen />

  const active = (goals ?? []).filter((g) => g.status === 'active')
  const completed = (goals ?? []).filter((g) => g.status === 'completed')

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
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: SCREEN_PADDING, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={t.primary} />}
      >
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
    </SafeAreaView>
  )
}

function GoalCard({ goal }: { goal: PortalGoal }) {
  const t = useThemeColors()
  const pct = progressPct(goal)
  const isCompleted = goal.status === 'completed'

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

      {pct !== null && (
        <View style={{ marginTop: space.md, marginLeft: 28 + space.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={[typography.caption, { color: t.textMuted }]}>
              {goal.current_value}{goal.target_unit ? ` ${goal.target_unit}` : ''} de {goal.target_value}{goal.target_unit ? ` ${goal.target_unit}` : ''}
            </Text>
            <Text style={[typography.captionBold, { color: isCompleted ? t.success : t.primary }]}>
              {pct}%
            </Text>
          </View>
          <View style={{ height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: t.borderLight }}>
            <View style={{
              height: 6,
              borderRadius: 3,
              width: `${pct}%`,
              backgroundColor: isCompleted ? t.success : t.primary,
            }} />
          </View>
        </View>
      )}
    </Card>
  )
}
