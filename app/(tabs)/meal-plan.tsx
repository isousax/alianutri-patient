import { useState } from 'react'
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl, Modal } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Utensils, ChevronRight, Clock, ShoppingCart, X } from 'lucide-react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useThemeColors } from '../../src/stores/theme'
import { useMealPlans, useMealPlanDetail } from '../../src/hooks/usePortal'
import { Card, ScreenHeader, EmptyState, LoadingScreen } from '../../src/components/ui'
import { shadows, radius, space, typography, SCREEN_PADDING } from '../../src/theme/tokens'

export default function MealPlanScreen() {
  const t = useThemeColors()
  const { data: plans, isLoading, refetch, isRefetching } = useMealPlans()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { data: detail, isLoading: loadingDetail } = useMealPlanDetail(selectedId)

  // ── Loading ──
  if (isLoading) return <LoadingScreen />

  // ── Empty state ──
  if (!plans || plans.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
        <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space.lg, paddingBottom: space.md }}>
          <Text style={[typography.displaySm, { color: t.text }]}>Plano alimentar</Text>
        </View>
        <EmptyState
          icon={<Utensils size={28} color={t.primary} />}
          title="Nenhum plano ativo"
          description="Quando seu nutricionista publicar um plano alimentar, ele aparecerá aqui."
          actionLabel="Atualizar"
          onAction={() => refetch()}
        />
      </SafeAreaView>
    )
  }

  // ── Detail view ──
  if (selectedId && detail) {
    const meals = Array.isArray(detail.meals) ? detail.meals : []
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
        <ScreenHeader title={detail.name} onBack={() => setSelectedId(null)} />

        {detail.total_kcal ? (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginHorizontal: SCREEN_PADDING,
            marginBottom: space.lg,
            paddingHorizontal: space.lg,
            paddingVertical: space.sm + 2,
            borderRadius: radius.lg,
            backgroundColor: t.primaryLight,
            gap: space.sm,
          }}>
            <Text style={[typography.captionBold, { color: t.primary }]}>
              {detail.total_kcal} kcal
            </Text>
            {detail.total_protein_g ? <Text style={[typography.caption, { color: t.primary }]}>• P {detail.total_protein_g}g</Text> : null}
            {detail.total_carbs_g ? <Text style={[typography.caption, { color: t.primary }]}>• C {detail.total_carbs_g}g</Text> : null}
            {detail.total_fat_g ? <Text style={[typography.caption, { color: t.primary }]}>• G {detail.total_fat_g}g</Text> : null}
          </View>
        ) : null}

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: SCREEN_PADDING, paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={t.primary} />}
        >
          {meals.map((meal: any, idx: number) => (
            <Animated.View key={idx} entering={FadeInDown.duration(250).delay(idx * 50)}>
              <Card style={{ marginBottom: space.lg }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.sm + 2 }}>
                  <View style={{
                    width: 28, height: 28, borderRadius: radius.sm,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: t.primaryLight,
                  }}>
                    <Clock size={12} color={t.primary} />
                  </View>
                  <Text style={[typography.headingSm, { color: t.text, flex: 1 }]}>{meal.name || `Refeição ${idx + 1}`}</Text>
                  {meal.time ? <Text style={[typography.caption, { color: t.textMuted }]}>{meal.time}</Text> : null}
                </View>
                {Array.isArray(meal.foods) && meal.foods.map((food: any, fi: number) => (
                  <View key={fi} style={{ marginLeft: 28 + space.sm, marginBottom: 5, flexDirection: 'row', flexWrap: 'wrap' }}>
                    <Text style={[typography.bodySm, { color: t.textSecondary }]}>• {food.name || food.food_description}</Text>
                    {food.quantity ? <Text style={[typography.caption, { color: t.textMuted }]}> — {food.quantity}{food.unit ? ` ${food.unit}` : ''}</Text> : null}
                  </View>
                ))}
              </Card>
            </Animated.View>
          ))}
          {meals.length === 0 && (
            <Text style={[typography.bodyMd, { color: t.textMuted, textAlign: 'center', marginTop: space['5xl'] }]}>
              Sem detalhes das refeições.
            </Text>
          )}
        </ScrollView>

        {/* Shopping list FAB */}
        {detail.shopping_list ? (
          <ShoppingListFAB shoppingList={detail.shopping_list} />
        ) : null}
      </SafeAreaView>
    )
  }

  // ── Plan list ──
  const activePlans = plans.filter((p) => p.status !== 'superseded')
  const olderPlans = plans.filter((p) => p.status === 'superseded')

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
      <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space.lg, paddingBottom: space.md }}>
        <Text style={[typography.displaySm, { color: t.text }]}>Plano alimentar</Text>
        {plans.length > 1 && (
          <Text style={[typography.caption, { color: t.textMuted, marginTop: 4 }]}>
            {activePlans.length} ativo{activePlans.length > 1 ? 's' : ''}{olderPlans.length > 0 ? ` · ${olderPlans.length} anterior${olderPlans.length > 1 ? 'es' : ''}` : ''}
          </Text>
        )}
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: SCREEN_PADDING, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={t.primary} />}
      >
        {activePlans.map((plan, i) => (
          <Animated.View key={plan.id} entering={FadeInDown.duration(300).delay(i * 60)}>
            <Card onPress={() => setSelectedId(plan.id)} style={{ marginBottom: space.lg }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{
                  width: 44, height: 44,
                  borderRadius: radius.md,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: t.primaryLight,
                  marginRight: space.md,
                }}>
                  <Utensils size={18} color={t.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.headingSm, { color: t.text }]} numberOfLines={1}>{plan.name}</Text>
                  <Text style={[typography.caption, { color: t.textMuted, marginTop: 3 }]}>
                    {plan.total_kcal ? `${plan.total_kcal} kcal` : plan.method}
                  </Text>
                </View>
                <ChevronRight size={16} color={t.textMuted} />
              </View>
            </Card>
          </Animated.View>
        ))}

        {olderPlans.length > 0 && (
          <View style={{ marginTop: space.sm }}>
            <Text style={[typography.overline, { color: t.textMuted, marginBottom: space.sm, marginLeft: 2 }]}>ANTERIORES</Text>
            {olderPlans.map((plan, i) => (
              <Animated.View key={plan.id} entering={FadeInDown.duration(300).delay((activePlans.length + i) * 60)}>
                <Pressable
                  onPress={() => setSelectedId(plan.id)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: space.md + 2,
                    paddingHorizontal: space.md,
                    marginBottom: space.sm,
                    borderRadius: radius.lg,
                    backgroundColor: pressed ? t.surfacePressed : 'transparent',
                  })}
                >
                  <View style={{
                    width: 36, height: 36,
                    borderRadius: radius.sm,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: t.borderLight,
                    marginRight: space.md,
                  }}>
                    <Utensils size={14} color={t.textMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.labelMd, { color: t.textSecondary }]} numberOfLines={1}>{plan.name}</Text>
                    <Text style={[typography.caption, { color: t.textMuted, marginTop: 2 }]}>
                      {plan.total_kcal ? `${plan.total_kcal} kcal` : plan.method}
                    </Text>
                  </View>
                  <ChevronRight size={14} color={t.borderLight} />
                </Pressable>
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>
      {loadingDetail && (
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: t.background + '99',
        }}>
          <ActivityIndicator size="large" color={t.primary} />
        </View>
      )}
    </SafeAreaView>
  )
}

// ── Shopping List FAB + Modal ──

function ShoppingListFAB({ shoppingList }: { shoppingList: string }) {
  const t = useThemeColors()
  const [open, setOpen] = useState(false)

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({
          position: 'absolute',
          bottom: space['3xl'],
          right: SCREEN_PADDING,
          width: 56,
          height: 56,
          borderRadius: 28,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: t.accent,
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.94 : 1 }],
          ...shadows.lg,
        })}
      >
        <ShoppingCart size={22} color="#fff" />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)} />
          <View style={{
            backgroundColor: t.surface,
            borderTopLeftRadius: radius['2xl'],
            borderTopRightRadius: radius['2xl'],
            paddingHorizontal: SCREEN_PADDING,
            paddingTop: space.lg,
            paddingBottom: space['4xl'],
            maxHeight: '70%',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.xl }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <ShoppingCart size={16} color={t.accent} />
                <Text style={[typography.headingMd, { color: t.text }]}>Lista de compras</Text>
              </View>
              <Pressable onPress={() => setOpen(false)} hitSlop={12} style={{ padding: space.xs }}>
                <X size={20} color={t.textMuted} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[typography.bodyMd, { color: t.textSecondary, lineHeight: 22 }]}>{shoppingList}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  )
}
