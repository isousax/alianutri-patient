import { useState } from 'react'
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl, Modal } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Utensils, ChevronRight, Clock, ShoppingCart, X, Scale, Replace, FileText, Check, Undo2, Camera } from 'lucide-react-native'
import { router } from 'expo-router'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useThemeColors } from '../../src/stores/theme'
import { haptics } from '../../src/lib/haptics'
import { useMealPlans, useMealPlanDetail, useDiaryToday, useLogFoodDiary, useDeleteFoodDiary } from '../../src/hooks/usePortal'
import { useFeaturesStore } from '../../src/stores/features'
import { toast } from '../../src/stores/toast'
import { Card, ScreenHeader, EmptyState, ErrorState, SkeletonList, MacrosBar, ProgressBar } from '../../src/components/ui'
import { shadows, radius, space, typography, SCREEN_PADDING, todayStr } from '../../src/theme/tokens'
import type { PortalMealPlanSummary, PortalMeal, QuantMeal, QuantFood, QuantFoodSubstitute, EquivMeal, EquivGroup, EquivGroupFood, QualMeal } from '../../src/types/portal'

const asArray = <T,>(x: unknown): T[] => (Array.isArray(x) ? (x as T[]) : [])

// nowTime = relógio de parede do dispositivo (hora do registro da refeição).
const nowTime = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function MealPlanScreen() {
  const t = useThemeColors()
  const { data: plans, isLoading, isError, refetch, isRefetching } = useMealPlans()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [shoppingOpen, setShoppingOpen] = useState(false)
  const { data: detail, isLoading: loadingDetail } = useMealPlanDetail(selectedId)
  const canWrite = useFeaturesStore((s) => s.canWrite)
  const today = todayStr()
  const { data: diaryToday } = useDiaryToday(today)
  const { mutateAsync: logEntry } = useLogFoodDiary()
  const { mutateAsync: deleteEntry } = useDeleteFoodDiary()
  const [busyIdx, setBusyIdx] = useState<number | null>(null)

  // Método → acento da tríade (emerald / teal / indigo) + ícone
  const methodMeta = (method: string) =>
    method === 'qualitative'
      ? { color: t.accent, bg: t.accentLight, Icon: FileText }
      : method === 'equivalents'
      ? { color: t.info, bg: t.infoLight, Icon: Replace }
      : { color: t.primary, bg: t.primaryLight, Icon: Scale }

  // ── Loading ──
  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
        <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space.lg, paddingBottom: space.md }}>
          <Text style={[typography.displaySm, { color: t.text }]}>Plano alimentar</Text>
        </View>
        <SkeletonList />
      </SafeAreaView>
    )
  }

  // ── Error state ──
  if (isError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
        <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space.lg, paddingBottom: space.md }}>
          <Text style={[typography.displaySm, { color: t.text }]}>Plano alimentar</Text>
        </View>
        <ErrorState onRetry={() => refetch()} />
      </SafeAreaView>
    )
  }

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
    const meals: PortalMeal[] = Array.isArray(detail.meals) ? (detail.meals as PortalMeal[]) : []
    const dm = methodMeta(detail.method)
    const MethodIcon = dm.Icon
    // "Plano acionável": registrar adesão inline quando este for o plano ativo de hoje.
    const isActiveToday = !!diaryToday?.meal_plan && diaryToday.meal_plan.id === detail.id
    const todayMeals = diaryToday?.meals ?? []
    const loggedToday = todayMeals.filter((m) => m.entry).length
    const progress = todayMeals.length > 0 ? loggedToday / todayMeals.length : 0
    const planId = detail.id
    const handleFollow = async (idx: number, fallbackName: string) => {
      if (busyIdx !== null) return
      const tm = todayMeals.find((m) => m.meal_index === idx)
      setBusyIdx(idx)
      try {
        haptics.medium()
        await logEntry({
          meal_type: 'other',
          entry_date: today,
          entry_time: nowTime(),
          food_description: tm?.foods?.map((f) => f.name).join(', ') || tm?.meal_name || fallbackName,
          compliance_status: 'followed',
          meal_plan_id: planId,
          meal_index: idx,
        })
      } catch {
        toast.error('Não foi possível registrar.')
      } finally {
        setBusyIdx(null)
      }
    }
    const handlePartial = async (idx: number, fallbackName: string) => {
      if (busyIdx !== null) return
      const tm = todayMeals.find((m) => m.meal_index === idx)
      setBusyIdx(idx)
      try {
        haptics.light()
        await logEntry({
          meal_type: 'other',
          entry_date: today,
          entry_time: nowTime(),
          food_description: `${tm?.meal_name || fallbackName} (parcial)`,
          compliance_status: 'partial',
          meal_plan_id: planId,
          meal_index: idx,
          notes: 'Segui parcialmente',
        })
      } catch {
        toast.error('Não foi possível registrar.')
      } finally {
        setBusyIdx(null)
      }
    }
    const handleUndo = async (idx: number) => {
      const tm = todayMeals.find((m) => m.meal_index === idx)
      if (!tm?.entry || busyIdx !== null) return
      setBusyIdx(idx)
      try {
        haptics.light()
        await deleteEntry(tm.entry.id)
      } catch {
        toast.error('Não foi possível desfazer.')
      } finally {
        setBusyIdx(null)
      }
    }
    return (
      <View style={{ flex: 1, backgroundColor: t.background }}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <ScreenHeader title={detail.name} onBack={() => setSelectedId(null)} />

          {/* Hero do plano — método-aware */}
          <View style={{ marginHorizontal: SCREEN_PADDING, marginBottom: space.lg }}>
            <View style={{ borderRadius: radius.xl, backgroundColor: dm.bg, padding: space.lg }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 4, paddingRight: space.sm + 2, paddingVertical: 5, borderRadius: radius.full, backgroundColor: dm.color }}>
                  <View style={{ width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.22)' }}>
                    <MethodIcon size={11} color="#fff" />
                  </View>
                  <Text style={[typography.captionBold, { color: '#fff' }]}>Seu plano</Text>
                </View>
                {meals.length > 0 ? (
                  <Text style={[typography.caption, { color: dm.color }]}>{meals.length} {meals.length === 1 ? 'refeição' : 'refeições'}</Text>
                ) : null}
              </View>

              {detail.total_kcal ? (
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: space.md }}>
                  <Text style={[typography.displaySm, { color: dm.color, fontWeight: '800' }]}>{detail.total_kcal}</Text>
                  <Text style={[typography.caption, { color: dm.color, opacity: 0.8, marginBottom: 5 }]}>kcal / dia</Text>
                </View>
              ) : null}

              {(detail.total_protein_g || detail.total_carbs_g || detail.total_fat_g) ? (
                <View style={{ marginTop: space.md }}>
                  <MacrosBar
                    protein_g={detail.total_protein_g ?? 0}
                    carbs_g={detail.total_carbs_g ?? 0}
                    fat_g={detail.total_fat_g ?? 0}
                    animated={false}
                  />
                </View>
              ) : null}
            </View>
          </View>

          {isActiveToday && todayMeals.length > 0 && (
            <View style={{ marginHorizontal: SCREEN_PADDING, marginBottom: space.lg }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={[typography.captionBold, { color: t.text }]}>Adesão de hoje</Text>
                <Text style={[typography.caption, { color: t.textMuted }]}>{loggedToday}/{todayMeals.length} registradas</Text>
              </View>
              <ProgressBar progress={progress} color={dm.color} />
            </View>
          )}

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: SCREEN_PADDING, paddingBottom: 80 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={t.primary} />}
          >
            {meals.map((meal, idx) => {
              const qm = meal as QuantMeal
              const em = meal as EquivMeal
              const lm = meal as QualMeal
              const tm = todayMeals.find((m) => m.meal_index === idx)
              const entry = tm?.entry
              const status = entry?.compliance_status
              const busy = busyIdx === idx
              return (
              <Animated.View key={idx} entering={FadeInDown.duration(250).delay(idx * 50)}>
                <Card style={{ marginBottom: space.lg, overflow: 'hidden' }}>
                  <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: dm.color, opacity: 0.55 }} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.sm + 2 }}>
                    <View style={{
                      width: 28, height: 28, borderRadius: radius.full,
                      alignItems: 'center', justifyContent: 'center',
                      backgroundColor: dm.bg,
                    }}>
                      <Text style={[typography.captionBold, { color: dm.color }]}>{idx + 1}</Text>
                    </View>
                    <Text style={[typography.headingSm, { color: t.text, flex: 1 }]}>{meal.name || `Refeição ${idx + 1}`}</Text>
                    {meal.time ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: space.sm, paddingVertical: 3, borderRadius: radius.full, backgroundColor: t.surfaceSecondary }}>
                        <Clock size={10} color={t.textMuted} />
                        <Text style={[typography.caption, { color: t.textMuted }]}>{meal.time}</Text>
                      </View>
                    ) : null}
                  </View>
                  {/* Quantitativo */}
                  {detail.method !== 'equivalents' && detail.method !== 'qualitative' && asArray<QuantFood>(qm.foods).map((food, fi) => {
                    const subs = asArray<QuantFoodSubstitute>(food.substitutes)
                    return (
                      <View key={fi} style={{ marginLeft: 28 + space.sm, marginBottom: 5 }}>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                          <Text style={[typography.bodySm, { color: t.textSecondary }]}>• {food.name || food.food_description}</Text>
                          {food.measure ? (
                            <Text style={[typography.caption, { color: t.textMuted }]}> — {food.measure.label}{food.quantity ? ` (${food.quantity}${food.unit ? ` ${food.unit}` : ''})` : ''}</Text>
                          ) : food.quantity ? (
                            <Text style={[typography.caption, { color: t.textMuted }]}> — {food.quantity}{food.unit ? ` ${food.unit}` : ''}</Text>
                          ) : null}
                        </View>
                        {subs.length > 0 ? (
                          <Text style={[typography.caption, { color: t.primary, marginLeft: 12, marginTop: 1 }]}>
                            ou: {subs.map((s) => `${s.name ?? ''}${s.quantity ? ` (${s.quantity}${s.unit ? ` ${s.unit}` : ''})` : ''}`).filter(Boolean).join('   ·   ')}
                          </Text>
                        ) : null}
                      </View>
                    )
                  })}

                  {/* Equivalentes — grupos × porções (+ alimentos opcionais) */}
                  {detail.method === 'equivalents' && asArray<EquivGroup>(em.groups).map((g, gi) => (
                    <View key={gi} style={{ marginLeft: 28 + space.sm, marginBottom: space.sm }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
                        <Text style={[typography.bodySm, { color: t.text, fontWeight: '600', flex: 1 }]}>{g.groupLabel || g.group}</Text>
                        <View style={{ paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.full, backgroundColor: dm.bg }}>
                          <Text style={[typography.caption, { color: dm.color }]}>{g.portions} {Number(g.portions) === 1 ? 'porção' : 'porções'}</Text>
                        </View>
                      </View>
                      {asArray<EquivGroupFood>(g.foods).map((fd, j) => (
                        <Text key={j} style={[typography.caption, { color: t.textMuted, marginTop: 2 }]}>• {fd.name}{fd.measure ? ` (${fd.measure})` : ''}</Text>
                      ))}
                    </View>
                  ))}

                  {/* Qualitativo — descritivo */}
                  {detail.method === 'qualitative' && (
                    <View style={{ marginLeft: 28 + space.sm }}>
                      {lm.guidance ? <Text style={[typography.bodySm, { color: t.textSecondary, lineHeight: 20 }]}>{lm.guidance}</Text> : null}
                      {asArray<string | { description: string }>(lm.items).map((it, j) => (
                        <Text key={j} style={[typography.bodySm, { color: t.textSecondary, marginTop: 2 }]}>• {typeof it === 'string' ? it : it.description}</Text>
                      ))}
                    </View>
                  )}

                  {isActiveToday && (entry ? (
                    <View style={{ marginLeft: 28 + space.sm, marginTop: space.md, flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: space.sm + 2, paddingVertical: 5, borderRadius: radius.full, backgroundColor: status === 'partial' ? t.warningLight : t.primaryLight }}>
                        <Check size={13} color={status === 'partial' ? t.warning : t.primary} />
                        <Text style={[typography.caption, { color: status === 'partial' ? t.warning : t.primary, fontWeight: '600' }]}>{status === 'partial' ? 'Parcial' : 'Seguida'}</Text>
                      </View>
                      {canWrite && (
                        <Pressable onPress={() => handleUndo(idx)} disabled={busy} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5, paddingHorizontal: space.sm }}>
                          <Undo2 size={12} color={t.textMuted} />
                          <Text style={[typography.caption, { color: t.textMuted }]}>Desfazer</Text>
                        </Pressable>
                      )}
                    </View>
                  ) : canWrite ? (
                    <View style={{ marginLeft: 28 + space.sm, marginTop: space.md, flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                      <Pressable onPress={() => handleFollow(idx, meal.name || `Refeição ${idx + 1}`)} disabled={busy} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: space.sm + 1, paddingHorizontal: space.lg, borderRadius: radius.lg, backgroundColor: dm.color }}>
                        <Check size={15} color="#fff" />
                        <Text style={[typography.labelMd, { color: '#fff' }]}>Segui</Text>
                      </Pressable>
                      <Pressable onPress={() => handlePartial(idx, meal.name || `Refeição ${idx + 1}`)} disabled={busy} style={{ paddingVertical: space.sm + 1, paddingHorizontal: space.md, borderRadius: radius.lg, backgroundColor: t.surfaceSecondary }}>
                        <Text style={[typography.labelMd, { color: t.textSecondary }]}>Parcial</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => { haptics.light(); router.push('/post-compose?type=meal' as never) }}
                        accessibilityRole="button"
                        accessibilityLabel="Registrar esta refeição com foto"
                        style={{ width: 40, height: 40, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: t.surfaceSecondary }}
                      >
                        <Camera size={16} color={t.textSecondary} />
                      </Pressable>
                    </View>
                  ) : null)}
                </Card>
              </Animated.View>
              )
            })}
            {meals.length === 0 && (
              <Text style={[typography.bodyMd, { color: t.textMuted, textAlign: 'center', marginTop: space['5xl'] }]}>
                Sem detalhes das refeições.
              </Text>
            )}
          </ScrollView>
        </SafeAreaView>

        {/* Shopping list FAB — inline to avoid Fragment/absolute positioning bug */}
        {detail.shopping_list ? (
          <View style={{
            position: 'absolute',
            bottom: 24,
            right: SCREEN_PADDING,
            width: 56,
            height: 56,
            borderRadius: 28,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: t.accent,
            zIndex: 999,
            elevation: 10,
            ...shadows.lg,
          }}>
            <Pressable
              onPress={() => setShoppingOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Lista de compras"
              style={{ width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' }}
            >
              <ShoppingCart size={22} color="#fff" />
            </Pressable>
          </View>
        ) : null}

        {/* Shopping list bottom sheet */}
        <Modal visible={shoppingOpen} animationType="slide" transparent statusBarTranslucent presentationStyle="overFullScreen" onRequestClose={() => setShoppingOpen(false)}>
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' }}>
            <Pressable style={{ flex: 1 }} onPress={() => setShoppingOpen(false)} />
            <View style={{
              backgroundColor: t.surface,
              borderTopLeftRadius: radius['2xl'],
              borderTopRightRadius: radius['2xl'],
              paddingHorizontal: SCREEN_PADDING,
              paddingTop: space.lg,
              paddingBottom: 100,
              maxHeight: '80%',
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.xl }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                  <ShoppingCart size={16} color={t.accent} />
                  <Text style={[typography.headingMd, { color: t.text }]}>Lista de compras</Text>
                </View>
                <Pressable onPress={() => setShoppingOpen(false)} hitSlop={12} style={{ padding: space.xs }}>
                  <X size={20} color={t.textMuted} />
                </Pressable>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={[typography.bodyMd, { color: t.textSecondary, lineHeight: 22 }]}>{detail.shopping_list}</Text>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    )
  }

  // ── Plan list ──
  const planList: PortalMealPlanSummary[] = plans
  const activePlans = planList.filter((p) => p.status !== 'superseded')
  const olderPlans = planList.filter((p) => p.status === 'superseded')

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
        {activePlans.map((plan, i) => {
          const pm = methodMeta(plan.method)
          const PlanIcon = pm.Icon
          return (
          <Animated.View key={plan.id} entering={FadeInDown.duration(300).delay(i * 60)}>
            <Card onPress={() => setSelectedId(plan.id)} style={{ marginBottom: space.lg }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{
                  width: 46, height: 46,
                  borderRadius: radius.lg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: pm.bg,
                  marginRight: space.md,
                }}>
                  <PlanIcon size={18} color={pm.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.headingSm, { color: t.text }]} numberOfLines={1}>{plan.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <View style={{ paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.full, backgroundColor: pm.bg }}>
                      <Text style={[typography.overline, { color: pm.color }]}>{plan.total_kcal ? `${plan.total_kcal} kcal/dia` : 'Plano alimentar'}</Text>
                    </View>
                  </View>
                </View>
                <ChevronRight size={16} color={t.textMuted} />
              </View>
            </Card>
          </Animated.View>
          )
        })}

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
                      {plan.total_kcal ? `${plan.total_kcal} kcal` : 'Plano anterior'}
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
