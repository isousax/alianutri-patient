import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { ArrowLeft, Target, CheckCircle2, Circle, Flag } from 'lucide-react-native'
import { colors } from '../src/theme/colors'
import { useGoals } from '../src/hooks/usePortal'
import type { PortalGoal } from '../src/types/portal'

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  high: { bg: 'bg-red-50', text: 'text-red-600' },
  medium: { bg: 'bg-amber-50', text: 'text-amber-600' },
  low: { bg: 'bg-slate-50', text: 'text-slate-500' },
}

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
  const { data: goals, isLoading, refetch, isRefetching } = useGoals()

  const active = (goals ?? []).filter((g) => g.status === 'active')
  const completed = (goals ?? []).filter((g) => g.status === 'completed')

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={20} color="#64748b" />
        </Pressable>
        <Text className="text-xl font-sans-bold text-slate-900">Metas</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.brand[600]} />
        </View>
      ) : !goals || goals.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="h-16 w-16 rounded-2xl bg-emerald-50 items-center justify-center mb-4">
            <Target size={28} color="#059669" />
          </View>
          <Text className="text-base font-sans-semibold text-slate-900 mb-1">Sem metas</Text>
          <Text className="text-sm text-slate-400 text-center font-sans">
            Quando o nutricionista definir metas, elas aparecerão aqui.
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#059669" />}>
          {active.length > 0 && (
            <>
              <Text className="text-xs font-sans-semibold text-slate-400 uppercase tracking-wide mb-2">Ativas</Text>
              {active.map((g) => <GoalCard key={g.id} goal={g} />)}
            </>
          )}
          {completed.length > 0 && (
            <>
              <Text className="text-xs font-sans-semibold text-slate-400 uppercase tracking-wide mb-2 mt-4">Concluídas</Text>
              {completed.map((g) => <GoalCard key={g.id} goal={g} />)}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

function GoalCard({ goal }: { goal: PortalGoal }) {
  const pct = progressPct(goal)
  const prio = PRIORITY_COLORS[goal.priority] || PRIORITY_COLORS.medium

  return (
    <View className="mb-3 bg-white rounded-2xl border border-slate-100 p-4">
      <View className="flex-row items-start gap-3">
        {goal.status === 'completed'
          ? <CheckCircle2 size={20} color="#16a34a" />
          : <Circle size={20} color="#cbd5e1" />}
        <View className="flex-1">
          <Text className="text-sm font-sans-semibold text-slate-900">{goal.title}</Text>
          <View className="flex-row items-center gap-2 mt-1">
            <Text className="text-[11px] text-slate-400 font-sans">{TYPE_LABELS[goal.type] || goal.type}</Text>
            <View className={`px-1.5 py-0.5 rounded ${prio.bg}`}>
              <Text className={`text-[10px] font-sans-medium ${prio.text}`}>{PRIORITY_LABELS[goal.priority]}</Text>
            </View>
            {goal.due_date ? (
              <View className="flex-row items-center gap-0.5">
                <Flag size={10} color="#94a3b8" />
                <Text className="text-[11px] text-slate-400 font-sans">
                  {new Date(goal.due_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {pct !== null && (
        <View className="mt-3">
          <View className="flex-row justify-between mb-1">
            <Text className="text-[11px] text-slate-400 font-sans">
              {goal.current_value}{goal.target_unit ? ` ${goal.target_unit}` : ''} / {goal.target_value}{goal.target_unit ? ` ${goal.target_unit}` : ''}
            </Text>
            <Text className="text-[11px] font-sans-medium text-slate-500">{pct}%</Text>
          </View>
          <View className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <View
              className={`h-2 rounded-full ${goal.status === 'completed' ? 'bg-green-500' : 'bg-brand-500'}`}
              style={{ width: `${pct}%` }}
            />
          </View>
        </View>
      )}
    </View>
  )
}
