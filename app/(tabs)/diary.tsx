import { useState, useCallback, useRef, useEffect } from 'react'
import {
  View, Text, ScrollView, Pressable, ActivityIndicator, Alert,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  ChevronLeft, ChevronRight, Flame, Check, CircleDashed,
  Camera, Clock, Utensils, AlertCircle, Undo2,
} from 'lucide-react-native'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import * as Haptics from 'expo-haptics'
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated'
import { useThemeColors } from '../../src/stores/theme'
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

// ── main screen ──

export default function DiaryScreen() {
  const t = useThemeColors()
  const [date, setDate] = useState(todayStr())
  const [expandedMeal, setExpandedMeal] = useState<number | null>(null)
  const [loggingIndex, setLoggingIndex] = useState<number | null>(null)
  const [justCompleted, setJustCompleted] = useState(false)
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

  // Celebration when all meals are logged
  useEffect(() => {
    if (totalMeals > 0 && loggedCount === totalMeals && prevLoggedCount.current < totalMeals) {
      setJustCompleted(true)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      const timer = setTimeout(() => setJustCompleted(false), 3000)
      return () => clearTimeout(timer)
    }
    prevLoggedCount.current = loggedCount
  }, [loggedCount, totalMeals])

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
      setExpandedMeal(null)
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
      setExpandedMeal(null)
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
      setExpandedMeal(null)
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
              {loggedCount}/{totalMeals} refeições registradas
            </Text>
            {loggedCount === totalMeals && totalMeals > 0 && (
              justCompleted ? (
                <Animated.Text entering={FadeInUp.duration(400)} style={{ color: t.primary }} className="text-xs font-sans-bold">
                  🎉 Parabéns! Dia completo!
                </Animated.Text>
              ) : (
                <Text style={{ color: t.primary }} className="text-xs font-sans-bold">Completo ✓</Text>
              )
            )}
          </View>
          <View className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: t.border }}>
            <View
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
      ) : !mealPlan ? (
        <NoPlanState />
      ) : meals.length === 0 ? (
        <NoPlanState />
      ) : (
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={t.primary} />}
        >
          {meals.map((meal, idx) => (
            <Animated.View key={idx} entering={FadeInDown.duration(300).delay(idx * 80)}>
              <MealCard
                meal={meal}
                isExpanded={expandedMeal === idx}
                onToggle={() => setExpandedMeal(expandedMeal === idx ? null : idx)}
                onFollow={() => handleMarkFollowed(meal)}
                onPartial={() => handleMarkPartial(meal)}
                onPhoto={() => handlePhoto(meal)}
                onUndo={() => handleUndo(meal)}
                isLogging={loggingIndex === meal.meal_index}
                isDeleting={isDeleting}
                isToday={isToday}
              />
            </Animated.View>
          ))}
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

// ── Meal card ──

function MealCard({
  meal, isExpanded, onToggle, onFollow, onPartial, onPhoto, onUndo,
  isLogging, isDeleting, isToday,
}: {
  meal: DiaryTimelineMeal
  isExpanded: boolean
  onToggle: () => void
  onFollow: () => void
  onPartial: () => void
  onPhoto: () => void
  onUndo: () => void
  isLogging: boolean
  isDeleting: boolean
  isToday: boolean
}) {
  const t = useThemeColors()
  const isLogged = !!meal.entry
  const status = meal.entry?.compliance_status

  return (
    <View className="mb-3">
      <Pressable
        onPress={onToggle}
        className="rounded-2xl p-4"
        style={{
          backgroundColor: isLogged ? t.primaryLight : t.surface,
          borderWidth: 1,
          borderColor: isLogged ? t.primaryMuted : isExpanded ? t.primary : t.borderLight,
          elevation: isLogged ? 0 : isExpanded ? 2 : 0,
        }}
      >
        {/* Header row */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            {/* Status icon */}
            <View
              className="h-9 w-9 rounded-xl items-center justify-center mr-3"
              style={{ backgroundColor: isLogged ? t.primaryMuted : t.border }}
            >
              {isLogged ? (
                <Check size={18} color={t.primary} />
              ) : (
                <CircleDashed size={18} color={t.textMuted} />
              )}
            </View>
            <View className="flex-1">
              <Text style={{ color: isLogged ? t.primary : t.text }} className="text-sm font-sans-semibold">
                {meal.meal_name}
              </Text>
              <View className="flex-row items-center mt-0.5">
                <Clock size={11} color={t.textMuted} />
                <Text style={{ color: t.textMuted }} className="text-xs font-sans ml-1">{meal.meal_time}</Text>
                {isLogged && status && (
                  <View className="ml-2 px-1.5 py-0.5 rounded" style={{ backgroundColor: status === 'followed' ? t.primaryLight : status === 'partial' ? t.accentLight : t.primaryLight }}>
                    <Text className="text-[10px] font-sans-medium" style={{ color: status === 'followed' ? t.primary : status === 'partial' ? t.warning : t.info }}>
                      {status === 'followed' ? 'Seguida' : status === 'partial' ? 'Parcial' : status === 'photo_only' ? 'Foto' : status}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* One-tap follow button (only when collapsed & not logged) */}
          {!isLogged && !isExpanded && (
            <Pressable
              onPress={(e) => { e.stopPropagation?.(); onFollow() }}
              disabled={isLogging}
              className="px-4 py-2 rounded-xl"
              style={{ backgroundColor: t.primary }}
            >
              {isLogging ? (
                <ActivityIndicator color={t.primaryText} size="small" />
              ) : (
                <Text style={{ color: t.primaryText }} className="text-xs font-sans-bold">Segui ✓</Text>
              )}
            </Pressable>
          )}
        </View>

        {/* Logged photo preview */}
        {isLogged && meal.entry?.photo_url && (
          <View className="mt-3 rounded-xl overflow-hidden">
            <Image
              source={{ uri: meal.entry.photo_url }}
              style={{ width: '100%', height: 160 }}
              contentFit="cover"
              className="rounded-xl"
            />
          </View>
        )}

        {/* Foods preview (collapsed, not logged) */}
        {!isExpanded && !isLogged && meal.foods.length > 0 && (
          <View className="mt-2.5 flex-row flex-wrap gap-1.5">
            {meal.foods.slice(0, 4).map((food, i) => (
              <View key={i} className="px-2 py-0.5 rounded-md" style={{ backgroundColor: t.border }}>
                <Text style={{ color: t.textSecondary }} className="text-[10px] font-sans" numberOfLines={1}>
                  {food.name}
                </Text>
              </View>
            ))}
            {meal.foods.length > 4 && (
              <View className="px-2 py-0.5 rounded-md" style={{ backgroundColor: t.border }}>
                <Text style={{ color: t.textMuted }} className="text-[10px] font-sans">
                  +{meal.foods.length - 4}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Expanded: full foods list (both logged and not logged) */}
        {isExpanded && meal.foods.length > 0 && (
          <View className="rounded-xl p-3 mt-3" style={{ backgroundColor: t.surfacePressed }}>
            {meal.foods.map((food, i) => (
              <View key={i} className="flex-row items-center justify-between" style={i > 0 ? { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: t.borderLight } : undefined}>
                <Text style={{ color: t.text }} className="text-xs font-sans flex-1" numberOfLines={1}>
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

        {/* Expanded: action buttons (not logged) */}
        {isExpanded && !isLogged && (
          <View className="mt-3 gap-2">
            <Pressable
              onPress={onFollow}
              disabled={isLogging}
              className="rounded-xl py-3 flex-row items-center justify-center"
              style={{ backgroundColor: t.primary }}
            >
              {isLogging ? (
                <ActivityIndicator color={t.primaryText} size="small" />
              ) : (
                <>
                  <Check size={16} color={t.primaryText} />
                  <Text style={{ color: t.primaryText }} className="text-sm font-sans-semibold ml-2">Segui esta refeição</Text>
                </>
              )}
            </Pressable>

            <View className="flex-row gap-2">
              <Pressable
                onPress={onPartial}
                disabled={isLogging}
                className="flex-1 rounded-xl py-2.5 flex-row items-center justify-center"
                style={{ backgroundColor: t.accentLight, borderWidth: 1, borderColor: t.accent + '40' }}
              >
                <AlertCircle size={14} color={t.warning} />
                <Text style={{ color: t.warning }} className="text-xs font-sans-semibold ml-1.5">Parcial</Text>
              </Pressable>

              <Pressable
                onPress={onPhoto}
                disabled={isLogging}
                className="flex-1 rounded-xl py-2.5 flex-row items-center justify-center"
                style={{ backgroundColor: t.primaryLight, borderWidth: 1, borderColor: t.primary + '40' }}
              >
                <Camera size={14} color={t.info} />
                <Text style={{ color: t.info }} className="text-xs font-sans-semibold ml-1.5">Foto</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Expanded: undo button (logged, today only) */}
        {isExpanded && isLogged && isToday && (
          <Pressable
            onPress={onUndo}
            disabled={isDeleting}
            className="mt-3 flex-row items-center justify-center py-2.5 rounded-xl"
            style={{ borderWidth: 1, borderColor: t.border }}
          >
            <Undo2 size={14} color={t.textSecondary} />
            <Text style={{ color: t.textSecondary }} className="text-xs font-sans-medium ml-1.5">Desfazer registro</Text>
          </Pressable>
        )}
      </Pressable>
    </View>
  )
}
