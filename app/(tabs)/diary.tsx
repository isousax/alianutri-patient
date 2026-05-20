import { useState, useCallback, useRef, useEffect, useMemo, useReducer } from 'react'
import {
  View, Text, ScrollView, Pressable, ActivityIndicator, Alert,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  ChevronLeft, ChevronRight, Flame, Check, CircleDashed,
  Camera, Clock, Utensils, Undo2,
  Sparkles, ChevronDown, X,
} from 'lucide-react-native'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import * as Haptics from 'expo-haptics'
import Animated, {
  FadeIn, FadeInDown, FadeInUp,
  LinearTransition,
} from 'react-native-reanimated'
import { useThemeColors, type ThemeColors } from '../../src/stores/theme'
import { useFeaturesStore } from '../../src/stores/features'
import { useDiaryToday, useDiaryStreak, useLogFoodDiary, useDeleteFoodDiary, useUploadDiaryPhoto } from '../../src/hooks/usePortal'
import type { DiaryTimelineMeal } from '../../src/types/portal'

// ── helpers ──

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function shiftDate(dateStr: string, days: number) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
}

function nowTime() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function currentHHMM(): number {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

function parseHHMM(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

// ── main screen ──

export default function DiaryScreen() {
  const t = useThemeColors()
  const canWrite = useFeaturesStore((s) => s.canWrite)
  const [date, setDate] = useState(todayStr())
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)
  const [loggingIndex, setLoggingIndex] = useState<number | null>(null)
  const [justCompleted, setJustCompleted] = useState(false)
  const [expandedLogged, setExpandedLogged] = useState<number | null>(null)
  const prevLoggedCount = useRef(0)

  const { data: diary, isLoading, refetch, isRefetching } = useDiaryToday(date)
  const { data: streakData } = useDiaryStreak()
  const { mutateAsync: logEntry } = useLogFoodDiary()
  const { mutateAsync: deleteEntry, isPending: isDeleting } = useDeleteFoodDiary()
  const { mutateAsync: uploadPhoto } = useUploadDiaryPhoto()

  const isToday = date === todayStr()
  const streak = streakData?.streak ?? 0
  const mealPlan = diary?.meal_plan
  const meals = diary?.meals ?? []
  const loggedCount = meals.filter((m) => m.entry !== null).length
  const totalMeals = meals.length
  const allDone = totalMeals > 0 && loggedCount === totalMeals

  // Tick counter that increments every 60s to refresh time-based logic
  const [, tick] = useReducer((x: number) => x + 1, 0)
  useEffect(() => {
    if (!isToday) return
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [isToday])

  // Derive the "smart" next meal index (first pending closest to now)
  const smartNextIndex = useMemo(() => {
    if (!isToday || meals.length === 0) {
      return meals.findIndex((m) => !m.entry)
    }
    const now = currentHHMM()
    // Find first pending meal whose time is >= now
    let idx = meals.findIndex((m) => !m.entry && parseHHMM(m.meal_time) >= now)
    // If none found, use first pending meal overall
    if (idx === -1) idx = meals.findIndex((m) => !m.entry)
    return idx
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meals, isToday, tick])

  // Guard: reset focus if the focused meal got logged (e.g. via refetch)
  useEffect(() => {
    if (focusedIndex !== null && meals[focusedIndex]?.entry) {
      setFocusedIndex(null)
    }
  }, [focusedIndex, meals])

  // The active hero index: user override or smart default
  const isManualFocus = focusedIndex !== null && !meals[focusedIndex]?.entry
  const heroIndex = (isManualFocus ? focusedIndex : null) ?? (smartNextIndex >= 0 ? smartNextIndex : null)

  // Split meals into sections
  const loggedMeals = useMemo(() =>
    meals.map((m, i) => ({ meal: m, originalIndex: i })).filter(({ meal }) => !!meal.entry),
    [meals],
  )
  const pendingMeals = useMemo(() =>
    meals.map((m, i) => ({ meal: m, originalIndex: i })).filter(({ meal }) => !meal.entry),
    [meals],
  )
  const remainingPending = useMemo(() =>
    pendingMeals.filter(({ originalIndex }) => originalIndex !== heroIndex),
    [pendingMeals, heroIndex],
  )

  // Celebration when all meals are logged
  useEffect(() => {
    if (totalMeals > 0 && loggedCount === totalMeals && prevLoggedCount.current < totalMeals) {
      setJustCompleted(true)
      setFocusedIndex(null)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      const timer = setTimeout(() => setJustCompleted(false), 4000)
      return () => clearTimeout(timer)
    }
    prevLoggedCount.current = loggedCount
  }, [loggedCount, totalMeals])

  // Reset focused when date changes
  useEffect(() => {
    setFocusedIndex(null)
    setExpandedLogged(null)
  }, [date])

  const handleMarkFollowed = useCallback(async (meal: DiaryTimelineMeal) => {
    if (!mealPlan || loggingIndex !== null) return
    setLoggingIndex(meal.meal_index)
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      await logEntry({
        meal_type: 'other',
        entry_date: date,
        entry_time: nowTime(),
        food_description: meal.foods.map((f) => f.name).join(', ') || meal.meal_name,
        compliance_status: 'followed',
        meal_plan_id: mealPlan.id,
        meal_index: meal.meal_index,
      })
      setFocusedIndex(null)
    } catch {
      Alert.alert('Erro', 'Não foi possível registrar.')
    } finally {
      setLoggingIndex(null)
    }
  }, [mealPlan, date, logEntry, loggingIndex])

  const handleMarkPartial = useCallback(async (meal: DiaryTimelineMeal) => {
    if (!mealPlan || loggingIndex !== null) return
    setLoggingIndex(meal.meal_index)
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      await logEntry({
        meal_type: 'other',
        entry_date: date,
        entry_time: nowTime(),
        food_description: `${meal.meal_name} (parcial)`,
        compliance_status: 'partial',
        meal_plan_id: mealPlan.id,
        meal_index: meal.meal_index,
        notes: 'Segui parcialmente',
      })
      setFocusedIndex(null)
    } catch {
      Alert.alert('Erro', 'Não foi possível registrar.')
    } finally {
      setLoggingIndex(null)
    }
  }, [mealPlan, date, logEntry, loggingIndex])

  const handlePhoto = useCallback(async (meal: DiaryTimelineMeal) => {
    if (loggingIndex !== null) return
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso às fotos para registrar.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    })

    if (result.canceled || !result.assets?.[0]) return

    setLoggingIndex(meal.meal_index)
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      const { photo_url } = await uploadPhoto(result.assets[0].uri)
      await logEntry({
        meal_type: 'other',
        entry_date: date,
        entry_time: nowTime(),
        food_description: meal.meal_name,
        compliance_status: 'photo_only',
        meal_plan_id: mealPlan?.id,
        meal_index: meal.meal_index,
        photo_url,
      })
      setFocusedIndex(null)
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a foto.')
    } finally {
      setLoggingIndex(null)
    }
  }, [mealPlan, date, logEntry, uploadPhoto, loggingIndex])

  const handleUndo = useCallback(async (meal: DiaryTimelineMeal) => {
    if (!meal.entry) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    Alert.alert(
      'Desfazer registro',
      `Remover o registro de "${meal.meal_name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desfazer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEntry(meal.entry!.id)
              setExpandedLogged(null)
            } catch {
              Alert.alert('Erro', 'Não foi possível desfazer.')
            }
          },
        },
      ],
    )
  }, [deleteEntry])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
      {/* ── Header ── */}
      <View className="px-5 pt-4 pb-2">
        <View className="flex-row items-center justify-between">
          <Text style={{ color: t.text }} className="text-xl font-sans-bold">Diário</Text>
          {streak > 0 && (
            <Animated.View entering={FadeIn.duration(400)} className="flex-row items-center px-3 py-1.5 rounded-full" style={{ backgroundColor: t.accentLight }}>
              <Flame size={14} color={t.accent} />
              <Text style={{ color: t.accent }} className="text-xs font-sans-bold ml-1">{streak} {streak === 1 ? 'dia' : 'dias'}</Text>
            </Animated.View>
          )}
        </View>
      </View>

      {/* ── Date nav ── */}
      <View className="flex-row items-center justify-center gap-4 pb-3">
        <Pressable onPress={() => setDate(shiftDate(date, -1))} hitSlop={12}>
          <ChevronLeft size={20} color={t.textSecondary} />
        </Pressable>
        <Pressable onPress={() => setDate(todayStr())}>
          <Text style={{ color: t.text }} className="text-sm font-sans-semibold">
            {isToday ? 'Hoje' : fmtDate(date)}
          </Text>
        </Pressable>
        <Pressable onPress={() => setDate(shiftDate(date, 1))} hitSlop={12} disabled={isToday}>
          <ChevronRight size={20} color={isToday ? t.border : t.textSecondary} />
        </Pressable>
      </View>

      {/* ── Progress bar ── */}
      {totalMeals > 0 && (
        <View className="px-5 pb-3">
          <View className="flex-row items-center justify-between mb-1.5">
            <Text style={{ color: t.textMuted }} className="text-xs font-sans">
              {loggedCount}/{totalMeals} refeições
            </Text>
            {allDone && (
              justCompleted ? (
                <Animated.Text entering={FadeInUp.duration(400)} style={{ color: t.primary }} className="text-xs font-sans-bold">
                  Parabéns! Dia completo!
                </Animated.Text>
              ) : (
                <Text style={{ color: t.primary }} className="text-xs font-sans-bold">Completo ✓</Text>
              )
            )}
          </View>
          <View className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: t.border }}>
            <Animated.View
              className="h-full rounded-full"
              style={{
                width: `${totalMeals > 0 ? (loggedCount / totalMeals) * 100 : 0}%`,
                backgroundColor: t.primary,
              }}
            />
          </View>
        </View>
      )}

      {/* ── Content ── */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={t.primary} />
        </View>
      ) : !mealPlan || meals.length === 0 ? (
        <NoPlanState />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={t.primary} />}
        >
          {/* ── Logged meals section ── */}
          {loggedMeals.length > 0 && (
            <View className="px-5 mb-2">
              {loggedMeals.map(({ meal, originalIndex }, i) => (
                <Animated.View
                  key={`logged-${originalIndex}`}
                  entering={FadeInDown.duration(250).delay(i * 50)}
                  layout={LinearTransition.duration(200)}
                >
                  <CompactLoggedRow
                    meal={meal}
                    isExpanded={expandedLogged === originalIndex}
                    onPress={() => setExpandedLogged(expandedLogged === originalIndex ? null : originalIndex)}
                    onUndo={() => handleUndo(meal)}
                    isToday={isToday}
                    isDeleting={isDeleting}
                    canWrite={canWrite}
                    t={t}
                  />
                </Animated.View>
              ))}
            </View>
          )}

          {/* ── Hero card (next/focused pending meal) ── */}
          {heroIndex !== null && !allDone && (
            <Animated.View
              key={`hero-${heroIndex}`}
              entering={FadeInDown.duration(350)}
              className="px-5 mb-2"
            >
              <HeroMealCard
                meal={meals[heroIndex]}
                onFollow={() => handleMarkFollowed(meals[heroIndex])}
                onPartial={() => handleMarkPartial(meals[heroIndex])}
                onPhoto={() => handlePhoto(meals[heroIndex])}
                isLogging={loggingIndex === meals[heroIndex].meal_index}
                isToday={isToday}
                isManualFocus={isManualFocus}
                onDismissFocus={() => setFocusedIndex(null)}
                canWrite={canWrite}
                t={t}
              />
            </Animated.View>
          )}

          {/* ── All-done celebration ── */}
          {allDone && (
            <Animated.View entering={FadeIn.duration(500)} className="px-5 mb-2">
              <CompletionCard t={t} justCompleted={justCompleted} />
            </Animated.View>
          )}

          {/* ── Remaining pending meals ── */}
          {remainingPending.length > 0 && (
            <View className="px-5 mt-1">
              <Text style={{ color: t.textMuted }} className="text-[11px] font-sans-semibold uppercase tracking-wider mb-2 ml-1">
                Próximas
              </Text>
              {remainingPending.map(({ meal, originalIndex }, i) => (
                <Animated.View
                  key={`pending-${originalIndex}`}
                  entering={FadeInDown.duration(250).delay(i * 50)}
                  layout={LinearTransition.duration(200)}
                >
                  <CompactPendingRow
                    meal={meal}
                    onFocus={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                      setFocusedIndex(originalIndex)
                    }}
                    onQuickFollow={() => handleMarkFollowed(meal)}
                    isLogging={loggingIndex === meal.meal_index}
                    canWrite={canWrite}
                    t={t}
                  />
                </Animated.View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

// ── Empty state ──

function NoPlanState() {
  const t = useThemeColors()
  return (
    <View className="flex-1 items-center justify-center px-8">
      <View className="h-16 w-16 rounded-2xl items-center justify-center mb-4" style={{ backgroundColor: t.surface }}>
        <Utensils size={28} color={t.textMuted} />
      </View>
      <Text style={{ color: t.text }} className="text-base font-sans-semibold mb-1">
        Nenhum plano ativo
      </Text>
      <Text style={{ color: t.textMuted }} className="text-sm text-center font-sans">
        Aguarde seu nutricionista publicar um plano alimentar para começar a registrar.
      </Text>
    </View>
  )
}

// ── Completion celebration ──

function CompletionCard({ t, justCompleted }: { t: ThemeColors; justCompleted: boolean }) {
  return (
    <View
      className="rounded-2xl p-5 items-center"
      style={{ backgroundColor: t.primaryLight, borderWidth: 1, borderColor: t.primaryMuted }}
    >
      <View className="h-12 w-12 rounded-full items-center justify-center mb-3" style={{ backgroundColor: t.primaryMuted }}>
        <Sparkles size={24} color={t.primary} />
      </View>
      <Text style={{ color: t.primary }} className="text-base font-sans-bold mb-1">
        {justCompleted ? 'Parabéns!' : 'Dia completo'}
      </Text>
      <Text style={{ color: t.textSecondary }} className="text-xs font-sans text-center">
        {justCompleted
          ? 'Todas as refeições registradas. Continue assim!'
          : 'Você registrou todas as refeições de hoje.'}
      </Text>
    </View>
  )
}

// ── Hero meal card (the focused/next meal) ──

const HERO_MAX_FOODS = 5

function HeroMealCard({
  meal, onFollow, onPartial, onPhoto, isLogging, isToday, isManualFocus, onDismissFocus, canWrite, t,
}: {
  meal: DiaryTimelineMeal
  onFollow: () => void
  onPartial: () => void
  onPhoto: () => void
  isLogging: boolean
  isToday: boolean
  isManualFocus: boolean
  onDismissFocus: () => void
  canWrite: boolean
  t: ThemeColors
}) {
  const [showAllFoods, setShowAllFoods] = useState(false)
  const hasManyFoods = meal.foods.length > HERO_MAX_FOODS
  const visibleFoods = showAllFoods ? meal.foods : meal.foods.slice(0, HERO_MAX_FOODS)

  return (
    <View
      className="rounded-2xl overflow-hidden"
      style={{
        backgroundColor: t.surface,
        borderWidth: 1.5,
        borderColor: t.primary + '30',
      }}
    >
      {/* Label */}
      <View className="px-4 pt-3 pb-1 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <View className="h-2 w-2 rounded-full mr-2" style={{ backgroundColor: t.primary }} />
          <Text style={{ color: t.primary }} className="text-[11px] font-sans-bold uppercase tracking-wider">
            {isManualFocus ? meal.meal_name : isToday ? 'Próxima refeição' : 'Refeição'}
          </Text>
        </View>
        {isManualFocus && (
          <Pressable onPress={onDismissFocus} hitSlop={10}>
            <X size={14} color={t.textMuted} />
          </Pressable>
        )}
      </View>

      {/* Meal info */}
      <View className="px-4 pt-1 pb-3">
        <View className="flex-row items-center justify-between">
          <Text style={{ color: t.text }} className="text-base font-sans-bold">{meal.meal_name}</Text>
          <View className="flex-row items-center">
            <Clock size={12} color={t.textMuted} />
            <Text style={{ color: t.textMuted }} className="text-xs font-sans ml-1">{meal.meal_time}</Text>
          </View>
        </View>

        {/* Foods list (truncated) */}
        {meal.foods.length > 0 && (
          <View className="rounded-xl p-3 mt-3" style={{ backgroundColor: t.surfacePressed }}>
            {visibleFoods.map((food, i) => (
              <View
                key={i}
                className="flex-row items-center justify-between"
                style={i > 0 ? { marginTop: 5, paddingTop: 5, borderTopWidth: 1, borderTopColor: t.borderLight } : undefined}
              >
                <Text style={{ color: t.text }} className="text-[13px] font-sans flex-1" numberOfLines={1}>
                  {food.name}
                </Text>
                {food.quantity && (
                  <Text style={{ color: t.textMuted }} className="text-[11px] font-sans ml-2">
                    {food.quantity}
                  </Text>
                )}
              </View>
            ))}
            {hasManyFoods && !showAllFoods && (
              <Pressable onPress={() => setShowAllFoods(true)} className="mt-2 flex-row items-center justify-center">
                <Text style={{ color: t.primary }} className="text-[11px] font-sans-semibold">Ver todos ({meal.foods.length})</Text>
                <ChevronDown size={12} color={t.primary} className="ml-0.5" />
              </Pressable>
            )}
          </View>
        )}
      </View>

      {/* Action buttons */}
      {canWrite && (
        <View className="px-4 pb-4">
          <View className="flex-row gap-2">
            <Pressable
              onPress={onPhoto}
              disabled={isLogging}
              className="flex-row items-center justify-center py-3 rounded-xl flex-1"
              style={{ backgroundColor: t.surfacePressed, borderWidth: 1, borderColor: t.borderLight }}
            >
              <Camera size={16} color={t.textSecondary} />
              <Text style={{ color: t.textSecondary }} className="text-sm font-sans-semibold ml-2">Foto</Text>
            </Pressable>
            <Pressable
              onPress={onFollow}
              disabled={isLogging}
              className="flex-row items-center justify-center py-3 rounded-xl flex-[1.4]"
              style={{ backgroundColor: t.primary }}
            >
              {isLogging ? (
                <ActivityIndicator color={t.primaryText} size="small" />
              ) : (
                <>
                  <Check size={16} color={t.primaryText} />
                  <Text style={{ color: t.primaryText }} className="text-sm font-sans-bold ml-2">Segui</Text>
                </>
              )}
            </Pressable>
          </View>
          <Pressable
            onPress={onPartial}
            disabled={isLogging}
            className="mt-2 flex-row items-center justify-center py-2"
          >
            <Text style={{ color: t.textMuted }} className="text-xs font-sans-medium">Segui parcialmente</Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}

// ── Compact row for logged meals ──

function CompactLoggedRow({
  meal, isExpanded, onPress, onUndo, isToday, isDeleting, canWrite, t,
}: {
  meal: DiaryTimelineMeal
  isExpanded: boolean
  onPress: () => void
  onUndo: () => void
  isToday: boolean
  isDeleting: boolean
  canWrite: boolean
  t: ThemeColors
}) {
  const status = meal.entry?.compliance_status
  return (
    <View className="mb-1.5">
      <Pressable
        onPress={onPress}
        className="flex-row items-center py-2.5 px-3 rounded-xl"
        style={{ backgroundColor: t.primaryLight }}
      >
        <View className="h-6 w-6 rounded-full items-center justify-center mr-3" style={{ backgroundColor: t.primaryMuted }}>
          <Check size={13} color={t.primary} />
        </View>
        <Text style={{ color: t.primary }} className="text-[13px] font-sans-semibold flex-1" numberOfLines={1}>
          {meal.meal_name}
        </Text>
        <Text style={{ color: t.textMuted }} className="text-[11px] font-sans mr-2">{meal.meal_time}</Text>
        {status && (
          <View className="px-1.5 py-0.5 rounded" style={{
            backgroundColor: status === 'followed' ? t.primaryMuted : status === 'partial' ? t.accentLight : t.primaryMuted,
          }}>
            <Text className="text-[10px] font-sans-medium" style={{
              color: status === 'followed' ? t.primary : status === 'partial' ? t.warning : t.info,
            }}>
              {status === 'followed' ? 'Seguida' : status === 'partial' ? 'Parcial' : status === 'photo_only' ? 'Foto' : '✓'}
            </Text>
          </View>
        )}
        <ChevronDown size={12} color={t.primaryMuted} className="ml-1" />
      </Pressable>

      {/* Expanded: photo + undo */}
      {isExpanded && (
        <Animated.View entering={FadeIn.duration(200)} className="ml-9 mt-1 mb-1">
          {meal.entry?.photo_url && (
            <View className="rounded-xl overflow-hidden mb-2">
              <Image
                source={{ uri: meal.entry.photo_url }}
                style={{ width: '100%', height: 140 }}
                contentFit="cover"
                className="rounded-xl"
              />
            </View>
          )}
          {/* Foods list */}
          {meal.foods.length > 0 && (
            <View className="rounded-lg p-2.5 mb-2" style={{ backgroundColor: t.surfacePressed }}>
              {meal.foods.map((food, i) => (
                <View
                  key={i}
                  className="flex-row items-center justify-between"
                  style={i > 0 ? { marginTop: 4, paddingTop: 4, borderTopWidth: 1, borderTopColor: t.borderLight } : undefined}
                >
                  <Text style={{ color: t.textSecondary }} className="text-[12px] font-sans flex-1" numberOfLines={1}>
                    {food.name}
                  </Text>
                  {food.quantity && (
                    <Text style={{ color: t.textMuted }} className="text-[10px] font-sans ml-2">
                      {food.quantity}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}
          {isToday && canWrite && (
            <Pressable
              onPress={onUndo}
              disabled={isDeleting}
              className="flex-row items-center py-1.5"
            >
              <Undo2 size={12} color={t.textMuted} />
              <Text style={{ color: t.textMuted }} className="text-[11px] font-sans-medium ml-1.5">Desfazer</Text>
            </Pressable>
          )}
        </Animated.View>
      )}
    </View>
  )
}

// ── Compact row for pending meals (not the hero) ──

function CompactPendingRow({
  meal, onFocus, onQuickFollow, isLogging, canWrite, t,
}: {
  meal: DiaryTimelineMeal
  onFocus: () => void
  onQuickFollow: () => void
  isLogging: boolean
  canWrite: boolean
  t: ThemeColors
}) {
  return (
    <View
      className="flex-row items-center py-2.5 px-3 rounded-xl mb-1.5"
      style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.borderLight }}
    >
      <Pressable onPress={onFocus} className="flex-row items-center flex-1" hitSlop={{ top: 8, bottom: 8, left: 8 }}>
        <View className="h-6 w-6 rounded-full items-center justify-center mr-3" style={{ borderWidth: 1.5, borderColor: t.border }}>
          <CircleDashed size={12} color={t.textMuted} />
        </View>
        <Text style={{ color: t.text }} className="text-[13px] font-sans-medium flex-1" numberOfLines={1}>
          {meal.meal_name}
        </Text>
        <Text style={{ color: t.textMuted }} className="text-[11px] font-sans mr-3">{meal.meal_time}</Text>
      </Pressable>
      {canWrite && (
        <Pressable
          onPress={onQuickFollow}
          disabled={isLogging}
          hitSlop={{ top: 8, bottom: 8, right: 8 }}
          className="px-3 py-1.5 rounded-lg"
          style={{ backgroundColor: t.primary + '15' }}
        >
          {isLogging ? (
            <ActivityIndicator color={t.primary} size="small" />
          ) : (
            <Text style={{ color: t.primary }} className="text-[11px] font-sans-bold">Segui</Text>
          )}
        </Pressable>
      )}
    </View>
  )
}
