import { useState, useCallback, useRef, useEffect, useMemo, useReducer } from 'react'
import {
  View, Text, ScrollView, Pressable, ActivityIndicator, Alert,
  RefreshControl, Dimensions, TextInput, Modal, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  ChevronLeft, ChevronRight, Flame, Check, CircleDashed,
  Camera, Clock, Utensils, Undo2, Plus,
  Sparkles, ChevronDown, X, Trophy,
} from 'lucide-react-native'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import * as Haptics from 'expo-haptics'
import Animated, {
  FadeIn, FadeInDown, FadeInUp,
  LinearTransition,
  useSharedValue, useAnimatedStyle, withTiming, withDelay,
  withSequence, withSpring, withRepeat, interpolate, Easing,
} from 'react-native-reanimated'
import { useThemeColors, type ThemeColors } from '../../src/stores/theme'
import { useFeaturesStore } from '../../src/stores/features'
import { useAuthStore } from '../../src/stores/auth'
import { useDiaryToday, useDiaryStreak, useLogFoodDiary, useDeleteFoodDiary, useUploadDiaryPhoto, useFoodDiary } from '../../src/hooks/usePortal'
import type { DiaryTimelineMeal, PortalFoodDiaryEntry } from '../../src/types/portal'
import { SkeletonBlock } from '../../src/components/ui'
import { typography, space } from '../../src/theme/tokens'

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://api.alianutri.com.br'

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
  const meals: DiaryTimelineMeal[] = diary?.meals ?? []
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
      // Multi-burst haptic sequence (Duolingo-inspired)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 200)
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 400)
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 600)
      setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 900)
      const timer = setTimeout(() => setJustCompleted(false), 6000)
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
        <Pressable onPress={() => setDate(shiftDate(date, -1))} hitSlop={12} accessibilityRole="button" accessibilityLabel="Dia anterior">
          <ChevronLeft size={20} color={t.textSecondary} />
        </Pressable>
        <Pressable onPress={() => setDate(todayStr())} accessibilityRole="button" accessibilityLabel="Ir para hoje">
          <Text style={{ color: t.text }} className="text-sm font-sans-semibold">
            {isToday ? 'Hoje' : fmtDate(date)}
          </Text>
        </Pressable>
        <Pressable onPress={() => setDate(shiftDate(date, 1))} hitSlop={12} disabled={isToday} accessibilityRole="button" accessibilityLabel="Próximo dia">
          <ChevronRight size={20} color={isToday ? t.border : t.textSecondary} />
        </Pressable>
      </View>

      {!isToday && (
        <Text style={[typography.caption, { color: t.textMuted, textAlign: 'center', marginVertical: space.sm }]}>
          Registros só podem ser feitos no dia atual.
        </Text>
      )}

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
        <View className="flex-1 px-5 pt-3" style={{ gap: 12 }}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} className="flex-row items-center py-2" style={{ gap: 12 }}>
              <SkeletonBlock width={44} height={44} borderRadius={14} />
              <View style={{ flex: 1, gap: 6 }}>
                <SkeletonBlock width="55%" height={14} />
                <SkeletonBlock width="35%" height={11} />
              </View>
              <SkeletonBlock width={26} height={26} borderRadius={13} />
            </View>
          ))}
        </View>
      ) : !mealPlan || meals.length === 0 ? (
        <FreeDiary date={date} isToday={isToday} canWrite={canWrite} logEntry={logEntry} />
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
            <>
              {justCompleted && <ConfettiBurst t={t} />}
              <Animated.View entering={FadeIn.duration(500)} className="px-5 mb-2">
                <CompletionCard t={t} justCompleted={justCompleted} streak={streak} />
              </Animated.View>
            </>
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
                    isToday={isToday}
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

// ── Free diary (no plan) ──

const FREE_MEAL_TYPES = [
  { value: 'breakfast', label: 'Café da manhã', emoji: '☕' },
  { value: 'morning_snack', label: 'Lanche da manhã', emoji: '🍎' },
  { value: 'lunch', label: 'Almoço', emoji: '🍽️' },
  { value: 'afternoon_snack', label: 'Lanche da tarde', emoji: '🥪' },
  { value: 'dinner', label: 'Jantar', emoji: '🌙' },
  { value: 'supper', label: 'Ceia', emoji: '🍵' },
  { value: 'other', label: 'Outro', emoji: '📝' },
]

function FreeDiary({
  date, isToday, canWrite, logEntry,
}: {
  date: string; isToday: boolean; canWrite: boolean;
  logEntry: (entry: {
    meal_type: string; entry_date: string; food_description: string;
    compliance_status?: string;
  }) => Promise<unknown>
}) {
  const t = useThemeColors()
  const [showModal, setShowModal] = useState(false)
  const [mealType, setMealType] = useState('lunch')
  const [description, setDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const { data: entries, refetch } = useFoodDiary(date)
  const { mutateAsync: deleteEntry } = useDeleteFoodDiary()

  const dayEntries: PortalFoodDiaryEntry[] = entries ?? []

  const handleSave = useCallback(async () => {
    if (!description.trim()) {
      Alert.alert('Descrição obrigatória', 'Descreva o que você comeu.')
      return
    }
    setIsSaving(true)
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      await logEntry({
        meal_type: mealType,
        entry_date: date,
        food_description: description.trim(),
      })
      setDescription('')
      setShowModal(false)
      refetch()
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar.')
    } finally {
      setIsSaving(false)
    }
  }, [description, mealType, date, logEntry, refetch])

  const handleDelete = useCallback(async (id: string) => {
    Alert.alert('Remover', 'Remover este registro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover', style: 'destructive', onPress: async () => {
          try { await deleteEntry(id); refetch() } catch { Alert.alert('Erro', 'Falha ao remover.') }
        },
      },
    ])
  }, [deleteEntry, refetch])

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
      {/* Prompt to log */}
      <Animated.View entering={FadeIn.duration(300)} className="px-5 mt-4 mb-4 items-center">
        <View className="h-14 w-14 rounded-2xl items-center justify-center mb-3" style={{ backgroundColor: t.primaryLight }}>
          <Utensils size={26} color={t.primary} />
        </View>
        <Text style={{ color: t.text }} className="text-base font-sans-semibold mb-1 text-center">
          Registre suas refeições
        </Text>
        <Text style={{ color: t.textMuted }} className="text-sm font-sans text-center leading-5">
          Mesmo sem plano alimentar, registrar o que você come ajuda seu nutricionista a te orientar melhor.
        </Text>
      </Animated.View>

      {isToday && canWrite && (
        <Animated.View entering={FadeInDown.duration(300).delay(100)} className="px-5 mb-4">
          <Pressable
            onPress={() => setShowModal(true)}
            className="flex-row items-center justify-center py-3.5 rounded-xl"
            style={{ backgroundColor: t.primary }}
          >
            <Plus size={18} color={t.primaryFg} />
            <Text style={{ color: t.primaryFg }} className="text-sm font-sans-bold ml-2">Registrar refeição</Text>
          </Pressable>
        </Animated.View>
      )}

      {/* Day entries */}
      {dayEntries.length > 0 && (
        <Animated.View entering={FadeInDown.duration(300).delay(200)} className="px-5">
          <Text style={{ color: t.textMuted }} className="text-xs font-sans-semibold uppercase tracking-wider mb-2">
            Refeições do dia ({dayEntries.length})
          </Text>
          {dayEntries.map((entry) => {
            const type = FREE_MEAL_TYPES.find((m) => m.value === entry.meal_type)
            return (
              <View
                key={entry.id}
                className="rounded-xl p-3 mb-1.5 flex-row items-start"
                style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.borderLight }}
              >
                <Text className="text-lg mr-2">{type?.emoji ?? '🍽️'}</Text>
                <View className="flex-1">
                  <Text style={{ color: t.text }} className="text-sm font-sans-semibold">
                    {type?.label ?? entry.meal_type}
                  </Text>
                  <Text style={{ color: t.textSecondary }} className="text-[12px] font-sans mt-0.5 leading-4">
                    {entry.food_description}
                  </Text>
                </View>
                {isToday && (
                  <Pressable onPress={() => handleDelete(entry.id)} hitSlop={8} className="ml-2 mt-0.5">
                    <X size={14} color={t.textMuted} />
                  </Pressable>
                )}
              </View>
            )
          })}
        </Animated.View>
      )}

      {/* Modal for adding entry */}
      <Modal visible={showModal} transparent animationType="slide">
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View className="rounded-t-3xl px-5 pt-5 pb-8" style={{ backgroundColor: t.background }}>
              <View className="flex-row items-center justify-between mb-4">
                <Text style={{ color: t.text }} className="text-lg font-sans-bold">Nova refeição</Text>
                <Pressable onPress={() => setShowModal(false)} hitSlop={12}>
                  <X size={20} color={t.textSecondary} />
                </Pressable>
              </View>

              {/* Meal type picker */}
              <Text style={{ color: t.textMuted }} className="text-xs font-sans-semibold uppercase tracking-wider mb-2">
                Tipo de refeição
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                <View className="flex-row gap-2">
                  {FREE_MEAL_TYPES.map((mt) => (
                    <Pressable
                      key={mt.value}
                      onPress={() => { setMealType(mt.value); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) }}
                      className="px-3 py-2 rounded-xl items-center"
                      style={{
                        backgroundColor: mealType === mt.value ? t.primaryLight : t.surface,
                        borderWidth: mealType === mt.value ? 1.5 : 1,
                        borderColor: mealType === mt.value ? t.primary : t.borderLight,
                      }}
                    >
                      <Text className="text-base">{mt.emoji}</Text>
                      <Text
                        style={{ color: mealType === mt.value ? t.primary : t.textSecondary }}
                        className="text-[10px] font-sans-medium mt-0.5"
                      >
                        {mt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              {/* Description */}
              <Text style={{ color: t.textMuted }} className="text-xs font-sans-semibold uppercase tracking-wider mb-2">
                O que você comeu?
              </Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Ex: Arroz, feijão, frango grelhado e salada"
                placeholderTextColor={t.textMuted}
                multiline
                numberOfLines={3}
                className="rounded-xl p-3 text-sm font-sans mb-4"
                style={{
                  color: t.text,
                  backgroundColor: t.surface,
                  borderWidth: 1,
                  borderColor: t.borderLight,
                  minHeight: 80,
                  textAlignVertical: 'top',
                }}
              />

              <Pressable
                onPress={handleSave}
                disabled={isSaving || !description.trim() || !canWrite}
                className="py-3.5 rounded-xl items-center"
                style={{ backgroundColor: description.trim() ? t.primary : t.borderLight }}
              >
                <Text
                  className="text-sm font-sans-bold"
                  style={{ color: description.trim() ? t.primaryFg : t.textMuted }}
                >
                  {isSaving ? 'Salvando...' : 'Salvar refeição'}
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </ScrollView>
  )
}

// ── Completion celebration ──

const CELEBRATE_MESSAGES = [
  'Todas as refeições registradas!',
  'Dia 100% completo!',
  'Mandou muito bem hoje!',
  'Compromisso é tudo!',
  'Consistência gera resultados!',
]

function CompletionCard({ t, justCompleted, streak }: { t: ThemeColors; justCompleted: boolean; streak: number }) {
  const scale = useSharedValue(0)
  const glow = useSharedValue(0)
  const messageIdx = useMemo(() => Math.floor(Math.random() * CELEBRATE_MESSAGES.length), [])

  useEffect(() => {
    if (justCompleted) {
      scale.value = withSequence(
        withTiming(0, { duration: 0 }),
        withSpring(1.15, { damping: 6, stiffness: 150 }),
        withSpring(1, { damping: 10, stiffness: 200 }),
      )
      glow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      )
    } else {
      scale.value = withTiming(1, { duration: 300 })
      glow.value = 0
    }
  }, [justCompleted, scale, glow])

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 1], [0, 0.6]),
    transform: [{ scale: interpolate(glow.value, [0, 1], [1, 1.6]) }],
  }))

  return (
    <View
      className="rounded-2xl p-6 items-center overflow-hidden"
      style={{ backgroundColor: t.primaryLight, borderWidth: 1.5, borderColor: t.primaryMuted }}
    >
      {/* Glow ring behind icon */}
      <View className="items-center justify-center mb-4" style={{ width: 72, height: 72 }}>
        <Animated.View
          style={[{
            position: 'absolute', width: 72, height: 72, borderRadius: 36,
            backgroundColor: t.primary,
          }, glowStyle]}
        />
        <Animated.View
          style={[{
            width: 56, height: 56, borderRadius: 28,
            backgroundColor: t.primaryMuted,
            alignItems: 'center', justifyContent: 'center',
          }, iconStyle]}
        >
          {justCompleted ? (
            <Trophy size={28} color={t.primary} />
          ) : (
            <Sparkles size={24} color={t.primary} />
          )}
        </Animated.View>
      </View>

      <Text style={{ color: t.primary }} className="text-lg font-sans-bold mb-1">
        {justCompleted ? 'Parabéns! 🎉' : 'Dia completo'}
      </Text>

      <Text style={{ color: t.textSecondary }} className="text-sm font-sans text-center mb-3">
        {justCompleted
          ? CELEBRATE_MESSAGES[messageIdx]
          : 'Você registrou todas as refeições de hoje.'}
      </Text>

      {/* Streak badge */}
      {streak > 0 && (
        <Animated.View
          entering={FadeInUp.duration(400).delay(300)}
          className="flex-row items-center px-4 py-2 rounded-full"
          style={{ backgroundColor: t.accentLight }}
        >
          <Flame size={16} color={t.accent} />
          <Text style={{ color: t.accent }} className="text-sm font-sans-bold ml-1.5">
            {streak} {streak === 1 ? 'dia' : 'dias'} seguidos
          </Text>
        </Animated.View>
      )}
    </View>
  )
}

// ── Confetti burst (full-screen overlay) ──

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')
const CONFETTI_COUNT = 28
const CONFETTI_COLORS = ['#10B981', '#34D399', '#14B8A6', '#6366F1', '#F59E0B', '#EC4899']

function ConfettiPiece({ index, t }: { index: number; t: ThemeColors }) {
  const progress = useSharedValue(0)
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length]
  const startX = SCREEN_W * 0.5 + (Math.random() - 0.5) * 60
  const endX = startX + (Math.random() - 0.5) * SCREEN_W * 0.8
  const rotation = Math.random() * 720 - 360
  const size = 6 + Math.random() * 6
  const isCircle = index % 3 === 0
  const delay = Math.random() * 200

  useEffect(() => {
    progress.value = withDelay(delay, withTiming(1, { duration: 1800 + Math.random() * 600, easing: Easing.out(Easing.quad) }))
  }, [progress, delay])

  const style = useAnimatedStyle(() => {
    const y = interpolate(progress.value, [0, 1], [-20, SCREEN_H * 0.7 + Math.random() * 100])
    const x = interpolate(progress.value, [0, 0.3, 1], [startX, startX + (endX - startX) * 0.6, endX])
    const rotate = interpolate(progress.value, [0, 1], [0, rotation])
    const opacity = interpolate(progress.value, [0, 0.1, 0.7, 1], [0, 1, 1, 0])
    const scale = interpolate(progress.value, [0, 0.15, 0.5, 1], [0, 1.2, 1, 0.6])

    return {
      position: 'absolute',
      left: x,
      top: y,
      width: size,
      height: isCircle ? size : size * 2.5,
      borderRadius: isCircle ? size / 2 : 2,
      backgroundColor: color,
      opacity,
      transform: [{ rotate: `${rotate}deg` }, { scale }],
    }
  })

  return <Animated.View style={style} />
}

function ConfettiBurst({ t }: { t: ThemeColors }) {
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }}
    >
      {Array.from({ length: CONFETTI_COUNT }).map((_, i) => (
        <ConfettiPiece key={i} index={i} t={t} />
      ))}
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
      {isToday && canWrite && (
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
                <ActivityIndicator color={t.primaryFg} size="small" />
              ) : (
                <>
                  <Check size={16} color={t.primaryFg} />
                  <Text style={{ color: t.primaryFg }} className="text-sm font-sans-bold ml-2">Segui</Text>
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
  const accessCode = useAuthStore((s) => s.accessCode)
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
                source={{ uri: `${API_BASE}/p/${accessCode}/diary/photo/${meal.entry.id}` }}
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
  meal, onFocus, onQuickFollow, isLogging, isToday, canWrite, t,
}: {
  meal: DiaryTimelineMeal
  onFocus: () => void
  onQuickFollow: () => void
  isLogging: boolean
  isToday: boolean
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
      {isToday && canWrite && (
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
