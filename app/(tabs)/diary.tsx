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
import { colors } from '../../src/theme/colors'
import { useDiaryToday, useDiaryStreak, useLogFoodDiary, useDeleteFoodDiary } from '../../src/hooks/usePortal'
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
  const [date, setDate] = useState(todayStr())
  const [expandedMeal, setExpandedMeal] = useState<number | null>(null)
  const [loggingIndex, setLoggingIndex] = useState<number | null>(null)
  const [justCompleted, setJustCompleted] = useState(false)
  const prevLoggedCount = useRef(0)

  const { data: diary, isLoading, refetch, isRefetching } = useDiaryToday(date)
  const { data: streakData } = useDiaryStreak()
  const { mutateAsync: logEntry } = useLogFoodDiary()
  const { mutateAsync: deleteEntry, isPending: isDeleting } = useDeleteFoodDiary()

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
      await logEntry({
        meal_type: 'other',
        entry_date: date,
        entry_time: nowTime(),
        food_description: meal.meal_name,
        compliance_status: 'photo_only',
        meal_plan_id: mealPlan?.id,
        meal_index: meal.meal_index,
        // TODO: upload photo to R2 and use real URL instead of local URI
        photo_url: result.assets[0].uri,
      })
      setExpandedMeal(null)
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a foto.')
    } finally {
      setLoggingIndex(null)
    }
  }, [mealPlan, date, logEntry, loggingIndex])

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
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      {/* ── Header ── */}
      <View className="px-5 pt-4 pb-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-sans-bold text-slate-900">Diário</Text>
          {streak > 0 && (
            <Animated.View entering={FadeIn.duration(400)} className="flex-row items-center bg-amber-50 px-3 py-1.5 rounded-full">
              <Flame size={14} color="#f59e0b" />
              <Text className="text-xs font-sans-bold text-amber-600 ml-1">{streak} {streak === 1 ? 'dia' : 'dias'}</Text>
            </Animated.View>
          )}
        </View>
      </View>

      {/* ── Date nav ── */}
      <View className="flex-row items-center justify-center gap-4 pb-3">
        <Pressable onPress={() => setDate(shiftDate(date, -1))} hitSlop={12}>
          <ChevronLeft size={20} color="#64748b" />
        </Pressable>
        <Pressable onPress={() => setDate(todayStr())}>
          <Text className="text-sm font-sans-semibold text-slate-700">
            {isToday ? 'Hoje' : fmtDate(date)}
          </Text>
        </Pressable>
        <Pressable onPress={() => setDate(shiftDate(date, 1))} hitSlop={12} disabled={isToday}>
          <ChevronRight size={20} color={isToday ? '#cbd5e1' : '#64748b'} />
        </Pressable>
      </View>

      {/* ── Progress bar ── */}
      {totalMeals > 0 && (
        <View className="px-5 pb-3">
          <View className="flex-row items-center justify-between mb-1.5">
            <Text className="text-xs font-sans text-slate-400">
              {loggedCount}/{totalMeals} refeições registradas
            </Text>
            {loggedCount === totalMeals && totalMeals > 0 && (
              justCompleted ? (
                <Animated.Text entering={FadeInUp.duration(400)} className="text-xs font-sans-bold text-brand-600">
                  🎉 Parabéns! Dia completo!
                </Animated.Text>
              ) : (
                <Text className="text-xs font-sans-bold text-brand-600">Completo ✓</Text>
              )
            )}
          </View>
          <View className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <View
              className="h-full rounded-full"
              style={{
                width: `${totalMeals > 0 ? (loggedCount / totalMeals) * 100 : 0}%`,
                backgroundColor: loggedCount === totalMeals ? colors.brand[600] : colors.brand[400],
              }}
            />
          </View>
        </View>
      )}

      {/* ── Content ── */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.brand[600]} />
        </View>
      ) : !mealPlan ? (
        <NoPlanState />
      ) : meals.length === 0 ? (
        <NoPlanState />
      ) : (
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand[600]} />}
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
  return (
    <View className="flex-1 items-center justify-center px-8">
      <View className="h-16 w-16 rounded-2xl bg-slate-100 items-center justify-center mb-4">
        <Utensils size={28} color="#94a3b8" />
      </View>
      <Text className="text-base font-sans-semibold text-slate-900 mb-1">
        Nenhum plano ativo
      </Text>
      <Text className="text-sm text-slate-400 text-center font-sans">
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
  const isLogged = !!meal.entry
  const status = meal.entry?.compliance_status

  return (
    <View className="mb-3">
      <Pressable
        onPress={onToggle}
        className={`bg-white rounded-2xl border p-4 ${
          isLogged
            ? 'border-brand-200 bg-brand-50'
            : isExpanded
              ? 'border-brand-300'
              : 'border-slate-100'
        }`}
        style={isLogged ? undefined : { elevation: isExpanded ? 2 : 0 }}
      >
        {/* Header row */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            {/* Status icon */}
            <View
              className={`h-9 w-9 rounded-xl items-center justify-center mr-3 ${
                isLogged ? 'bg-brand-100' : 'bg-slate-100'
              }`}
            >
              {isLogged ? (
                <Check size={18} color={colors.brand[600]} />
              ) : (
                <CircleDashed size={18} color="#94a3b8" />
              )}
            </View>
            <View className="flex-1">
              <Text className={`text-sm font-sans-semibold ${isLogged ? 'text-brand-700' : 'text-slate-900'}`}>
                {meal.meal_name}
              </Text>
              <View className="flex-row items-center mt-0.5">
                <Clock size={11} color="#94a3b8" />
                <Text className="text-xs text-slate-400 font-sans ml-1">{meal.meal_time}</Text>
                {isLogged && status && (
                  <View className={`ml-2 px-1.5 py-0.5 rounded ${
                    status === 'followed' ? 'bg-brand-100' : status === 'partial' ? 'bg-amber-100' : 'bg-blue-100'
                  }`}>
                    <Text className={`text-[10px] font-sans-medium ${
                      status === 'followed' ? 'text-brand-700' : status === 'partial' ? 'text-amber-700' : 'text-blue-700'
                    }`}>
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
              className="bg-brand-600 px-4 py-2 rounded-xl active:bg-brand-700"
            >
              {isLogging ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text className="text-xs font-sans-bold text-white">Segui ✓</Text>
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
              <View key={i} className="bg-slate-50 px-2 py-0.5 rounded-md">
                <Text className="text-[10px] text-slate-500 font-sans" numberOfLines={1}>
                  {food.name}
                </Text>
              </View>
            ))}
            {meal.foods.length > 4 && (
              <View className="bg-slate-50 px-2 py-0.5 rounded-md">
                <Text className="text-[10px] text-slate-400 font-sans">
                  +{meal.foods.length - 4}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Expanded: full foods list (both logged and not logged) */}
        {isExpanded && meal.foods.length > 0 && (
          <View className="bg-slate-50 rounded-xl p-3 mt-3">
            {meal.foods.map((food, i) => (
              <View key={i} className={`flex-row items-center justify-between ${i > 0 ? 'mt-1.5 pt-1.5 border-t border-slate-100' : ''}`}>
                <Text className="text-xs text-slate-700 font-sans flex-1" numberOfLines={1}>
                  {food.name}
                </Text>
                {food.quantity && (
                  <Text className="text-[10px] text-slate-400 font-sans ml-2">
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
              className="bg-brand-600 rounded-xl py-3 flex-row items-center justify-center active:bg-brand-700"
            >
              {isLogging ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Check size={16} color="#fff" />
                  <Text className="text-sm font-sans-semibold text-white ml-2">Segui esta refeição</Text>
                </>
              )}
            </Pressable>

            <View className="flex-row gap-2">
              <Pressable
                onPress={onPartial}
                disabled={isLogging}
                className="flex-1 bg-amber-50 border border-amber-200 rounded-xl py-2.5 flex-row items-center justify-center active:bg-amber-100"
              >
                <AlertCircle size={14} color="#d97706" />
                <Text className="text-xs font-sans-semibold text-amber-700 ml-1.5">Parcial</Text>
              </Pressable>

              <Pressable
                onPress={onPhoto}
                disabled={isLogging}
                className="flex-1 bg-blue-50 border border-blue-200 rounded-xl py-2.5 flex-row items-center justify-center active:bg-blue-100"
              >
                <Camera size={14} color="#2563eb" />
                <Text className="text-xs font-sans-semibold text-blue-700 ml-1.5">Foto</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Expanded: undo button (logged, today only) */}
        {isExpanded && isLogged && isToday && (
          <Pressable
            onPress={onUndo}
            disabled={isDeleting}
            className="mt-3 flex-row items-center justify-center py-2.5 rounded-xl border border-slate-200 active:bg-slate-50"
          >
            <Undo2 size={14} color="#64748b" />
            <Text className="text-xs font-sans-medium text-slate-500 ml-1.5">Desfazer registro</Text>
          </Pressable>
        )}
      </Pressable>
    </View>
  )
}
