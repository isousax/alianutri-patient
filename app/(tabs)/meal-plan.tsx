import { useState } from 'react'
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Utensils, ChevronRight, RefreshCw, Clock } from 'lucide-react-native'
import { useThemeColors } from '../../src/stores/theme'
import { useMealPlans, useMealPlanDetail } from '../../src/hooks/usePortal'

export default function MealPlanScreen() {
  const t = useThemeColors()
  const { data: plans, isLoading, refetch, isRefetching } = useMealPlans()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { data: detail, isLoading: loadingDetail } = useMealPlanDetail(selectedId)

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} className="items-center justify-center" edges={['top']}>
        <ActivityIndicator size="large" color={t.primary} />
      </SafeAreaView>
    )
  }

  if (!plans || plans.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
        <View className="px-5 pt-4 pb-3">
          <Text style={{ color: t.text }} className="text-xl font-sans-bold">Plano alimentar</Text>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <View className="h-16 w-16 rounded-2xl items-center justify-center mb-4" style={{ backgroundColor: t.primaryLight }}>
            <Utensils size={28} color={t.primary} />
          </View>
          <Text style={{ color: t.text }} className="text-base font-sans-semibold mb-1">Nenhum plano ativo</Text>
          <Text style={{ color: t.textMuted }} className="text-sm text-center font-sans">
            Quando seu nutricionista publicar um plano alimentar, ele aparecerá aqui.
          </Text>
          <Pressable onPress={() => refetch()} className="mt-4 flex-row items-center gap-2">
            <RefreshCw size={14} color={t.primary} />
            <Text style={{ color: t.primary }} className="text-sm font-sans-medium">Atualizar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  if (selectedId && detail) {
    const meals = Array.isArray(detail.meals) ? detail.meals : []
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
        <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
          <Pressable onPress={() => setSelectedId(null)}>
            <Text style={{ color: t.primary }} className="text-sm font-sans-medium">← Voltar</Text>
          </Pressable>
          <Text style={{ color: t.text }} className="text-lg font-sans-bold flex-1" numberOfLines={1}>{detail.name}</Text>
        </View>

        {detail.total_kcal ? (
          <View className="mx-5 mb-3 rounded-xl px-4 py-2.5 flex-row items-center gap-2" style={{ backgroundColor: t.primaryLight }}>
            <Text style={{ color: t.primary }} className="text-xs font-sans-semibold">
              {detail.total_kcal} kcal
            </Text>
            {detail.total_protein_g ? <Text style={{ color: t.primary }} className="text-xs font-sans">• P {detail.total_protein_g}g</Text> : null}
            {detail.total_carbs_g ? <Text style={{ color: t.primary }} className="text-xs font-sans">• C {detail.total_carbs_g}g</Text> : null}
            {detail.total_fat_g ? <Text style={{ color: t.primary }} className="text-xs font-sans">• G {detail.total_fat_g}g</Text> : null}
          </View>
        ) : null}

        <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={t.primary} />}>
          {meals.map((meal: any, idx: number) => (
            <View key={idx} className="mb-4 rounded-2xl p-4" style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.borderLight }}>
              <View className="flex-row items-center gap-2 mb-2">
                <Clock size={14} color={t.textSecondary} />
                <Text style={{ color: t.text }} className="text-sm font-sans-semibold">{meal.name || `Refeição ${idx + 1}`}</Text>
                {meal.time ? <Text style={{ color: t.textMuted }} className="text-xs font-sans">{meal.time}</Text> : null}
              </View>
              {Array.isArray(meal.foods) && meal.foods.map((food: any, fi: number) => (
                <View key={fi} className="ml-6 mb-1 flex-row">
                  <Text style={{ color: t.textSecondary }} className="text-xs font-sans">• {food.name || food.food_description}</Text>
                  {food.quantity ? <Text style={{ color: t.textMuted }} className="text-xs font-sans"> — {food.quantity}{food.unit ? ` ${food.unit}` : ''}</Text> : null}
                </View>
              ))}
            </View>
          ))}
          {meals.length === 0 && (
            <Text style={{ color: t.textMuted }} className="text-sm text-center font-sans mt-8">Sem detalhes das refeições.</Text>
          )}
        </ScrollView>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
      <View className="px-5 pt-4 pb-3">
        <Text style={{ color: t.text }} className="text-xl font-sans-bold">Plano alimentar</Text>
      </View>
      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={t.primary} />}>
        {plans.map((plan) => (
          <Pressable
            key={plan.id}
            onPress={() => setSelectedId(plan.id)}
            className="mb-3 rounded-2xl p-4 flex-row items-center"
            style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.borderLight }}
          >
            <View className="h-10 w-10 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: t.primaryLight }}>
              <Utensils size={18} color={t.primary} />
            </View>
            <View className="flex-1">
              <Text style={{ color: t.text }} className="text-sm font-sans-semibold">{plan.name}</Text>
              <Text style={{ color: t.textMuted }} className="text-xs font-sans mt-0.5">
                {plan.total_kcal ? `${plan.total_kcal} kcal` : plan.method}
              </Text>
            </View>
            <ChevronRight size={16} color={t.textMuted} />
          </Pressable>
        ))}
      </ScrollView>
      {loadingDetail && (
        <View className="absolute inset-0 items-center justify-center" style={{ backgroundColor: t.background + '99' }}>
          <ActivityIndicator size="large" color={t.primary} />
        </View>
      )}
    </SafeAreaView>
  )
}
