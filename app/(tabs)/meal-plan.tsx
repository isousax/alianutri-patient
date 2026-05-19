import { useState } from 'react'
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Utensils, ChevronRight, RefreshCw, Clock } from 'lucide-react-native'
import { colors } from '../../src/theme/colors'
import { useMealPlans, useMealPlanDetail } from '../../src/hooks/usePortal'

export default function MealPlanScreen() {
  const { data: plans, isLoading, refetch, isRefetching } = useMealPlans()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { data: detail, isLoading: loadingDetail } = useMealPlanDetail(selectedId)

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center" edges={['top']}>
        <ActivityIndicator size="large" color={colors.brand[600]} />
      </SafeAreaView>
    )
  }

  if (!plans || plans.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
        <View className="px-5 pt-4 pb-3">
          <Text className="text-xl font-sans-bold text-slate-900">Plano alimentar</Text>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <View className="h-16 w-16 rounded-2xl bg-brand-50 items-center justify-center mb-4">
            <Utensils size={28} color={colors.brand[600]} />
          </View>
          <Text className="text-base font-sans-semibold text-slate-900 mb-1">Nenhum plano ativo</Text>
          <Text className="text-sm text-slate-400 text-center font-sans">
            Quando seu nutricionista publicar um plano alimentar, ele aparecerá aqui.
          </Text>
          <Pressable onPress={() => refetch()} className="mt-4 flex-row items-center gap-2">
            <RefreshCw size={14} color={colors.brand[600]} />
            <Text className="text-sm font-sans-medium text-brand-600">Atualizar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  if (selectedId && detail) {
    const meals = Array.isArray(detail.meals) ? detail.meals : []
    return (
      <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
        <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
          <Pressable onPress={() => setSelectedId(null)}>
            <Text className="text-sm font-sans-medium text-brand-600">← Voltar</Text>
          </Pressable>
          <Text className="text-lg font-sans-bold text-slate-900 flex-1" numberOfLines={1}>{detail.name}</Text>
        </View>

        {detail.total_kcal ? (
          <View className="mx-5 mb-3 bg-brand-50 rounded-xl px-4 py-2.5 flex-row items-center gap-2">
            <Text className="text-xs font-sans-semibold text-brand-700">
              {detail.total_kcal} kcal
            </Text>
            {detail.total_protein_g ? <Text className="text-xs text-brand-600 font-sans">• P {detail.total_protein_g}g</Text> : null}
            {detail.total_carbs_g ? <Text className="text-xs text-brand-600 font-sans">• C {detail.total_carbs_g}g</Text> : null}
            {detail.total_fat_g ? <Text className="text-xs text-brand-600 font-sans">• G {detail.total_fat_g}g</Text> : null}
          </View>
        ) : null}

        <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={colors.brand[600]} />}>
          {meals.map((meal: any, idx: number) => (
            <View key={idx} className="mb-4 bg-white rounded-2xl border border-slate-100 p-4">
              <View className="flex-row items-center gap-2 mb-2">
                <Clock size={14} color="#64748b" />
                <Text className="text-sm font-sans-semibold text-slate-900">{meal.name || `Refeição ${idx + 1}`}</Text>
                {meal.time ? <Text className="text-xs text-slate-400 font-sans">{meal.time}</Text> : null}
              </View>
              {Array.isArray(meal.foods) && meal.foods.map((food: any, fi: number) => (
                <View key={fi} className="ml-6 mb-1 flex-row">
                  <Text className="text-xs text-slate-500 font-sans">• {food.name || food.food_description}</Text>
                  {food.quantity ? <Text className="text-xs text-slate-400 font-sans"> — {food.quantity}{food.unit ? ` ${food.unit}` : ''}</Text> : null}
                </View>
              ))}
            </View>
          ))}
          {meals.length === 0 && (
            <Text className="text-sm text-slate-400 text-center font-sans mt-8">Sem detalhes das refeições.</Text>
          )}
        </ScrollView>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <View className="px-5 pt-4 pb-3">
        <Text className="text-xl font-sans-bold text-slate-900">Plano alimentar</Text>
      </View>
      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand[600]} />}>
        {plans.map((plan) => (
          <Pressable
            key={plan.id}
            onPress={() => setSelectedId(plan.id)}
            className="mb-3 bg-white rounded-2xl border border-slate-100 p-4 flex-row items-center active:bg-slate-50"
          >
            <View className="h-10 w-10 rounded-xl bg-brand-50 items-center justify-center mr-3">
              <Utensils size={18} color={colors.brand[600]} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-sans-semibold text-slate-900">{plan.name}</Text>
              <Text className="text-xs text-slate-400 font-sans mt-0.5">
                {plan.total_kcal ? `${plan.total_kcal} kcal` : plan.method}
              </Text>
            </View>
            <ChevronRight size={16} color="#cbd5e1" />
          </Pressable>
        ))}
      </ScrollView>
      {loadingDetail && (
        <View className="absolute inset-0 items-center justify-center bg-white/60">
          <ActivityIndicator size="large" color={colors.brand[600]} />
        </View>
      )}
    </SafeAreaView>
  )
}
