import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { ChevronLeft, Target, CheckCircle2, Circle, Flag } from 'lucide-react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useThemeColors } from '../src/stores/theme'
import { useGoals } from '../src/hooks/usePortal'
import type { PortalGoal } from '../src/types/portal'

const SHADOW_SM = Platform.select({
  ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  android: { elevation: 2 },
  default: {},
}) as Record<string, unknown>

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

  const active = (goals ?? []).filter((g) => g.status === 'active')
  const completed = (goals ?? []).filter((g) => g.status === 'completed')

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={22} color={t.textSecondary} />
        </Pressable>
        <View className="h-8 w-8 rounded-xl items-center justify-center" style={{ backgroundColor: t.success + '15' }}>
          <Target size={16} color={t.success} />
        </View>
        <Text style={{ color: t.text }} className="text-xl font-sans-bold">Metas</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={t.primary} />
        </View>
      ) : !goals || goals.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="h-16 w-16 rounded-3xl items-center justify-center mb-4" style={{ backgroundColor: t.primaryLight }}>
            <Target size={28} color={t.primary} />
          </View>
          <Text style={{ color: t.text }} className="text-base font-sans-semibold mb-1">Sem metas</Text>
          <Text style={{ color: t.textMuted }} className="text-sm text-center font-sans">
            Quando o nutricionista definir metas, elas aparecerão aqui.
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={t.primary} />}
        >
          {active.length > 0 && (
            <>
              <Text style={{ color: t.textMuted }} className="text-[10px] font-sans-bold uppercase tracking-widest mb-2 ml-1">
                Ativas ({active.length})
              </Text>
              {active.map((g, i) => (
                <Animated.View key={g.id} entering={FadeInDown.duration(300).delay(i * 60)}>
                  <GoalCard goal={g} />
                </Animated.View>
              ))}
            </>
          )}
          {completed.length > 0 && (
            <>
              <Text style={{ color: t.textMuted }} className="text-[10px] font-sans-bold uppercase tracking-widest mb-2 mt-4 ml-1">
                Concluídas ({completed.length})
              </Text>
              {completed.map((g, i) => (
                <Animated.View key={g.id} entering={FadeInDown.duration(300).delay((active.length + i) * 60)}>
                  <GoalCard goal={g} />
                </Animated.View>
              ))}
            </>
          )}
        </ScrollView>
      )}
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
    <View className="mb-3 rounded-2xl p-4" style={{ backgroundColor: t.surface, ...SHADOW_SM }}>
      <View className="flex-row items-start gap-3">
        {isCompleted ? (
          <View className="h-7 w-7 rounded-lg items-center justify-center mt-0.5" style={{ backgroundColor: t.success + '18' }}>
            <CheckCircle2 size={16} color={t.success} />
          </View>
        ) : (
          <View className="h-7 w-7 rounded-lg items-center justify-center mt-0.5" style={{ backgroundColor: t.primary + '12' }}>
            <Circle size={16} color={t.primary} />
          </View>
        )}
        <View className="flex-1">
          <Text style={{ color: t.text }} className="text-[13px] font-sans-semibold">{goal.title}</Text>
          <View className="flex-row items-center gap-2 mt-1.5">
            <Text style={{ color: t.textMuted }} className="text-[11px] font-sans">
              {TYPE_LABELS[goal.type] || goal.type}
            </Text>
            <View className="px-1.5 py-0.5 rounded-md" style={{ backgroundColor: prioColor + '15' }}>
              <Text className="text-[10px] font-sans-medium" style={{ color: prioColor }}>
                {prioLabel}
              </Text>
            </View>
            {goal.due_date ? (
              <View className="flex-row items-center gap-0.5">
                <Flag size={10} color={t.textMuted} />
                <Text style={{ color: t.textMuted }} className="text-[11px] font-sans">
                  {new Date(goal.due_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {pct !== null && (
        <View className="mt-3 ml-10">
          <View className="flex-row justify-between mb-1.5">
            <Text style={{ color: t.textMuted }} className="text-[11px] font-sans">
              {goal.current_value}{goal.target_unit ? ` ${goal.target_unit}` : ''} de {goal.target_value}{goal.target_unit ? ` ${goal.target_unit}` : ''}
            </Text>
            <Text
              className="text-[11px] font-sans-bold"
              style={{ color: isCompleted ? t.success : t.primary }}
            >
              {pct}%
            </Text>
          </View>
          <View className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: t.borderLight }}>
            <View
              className="h-2 rounded-full"
              style={{
                width: `${pct}%`,
                backgroundColor: isCompleted ? t.success : t.primary,
              }}
            />
          </View>
        </View>
      )}
    </View>
  )
}
