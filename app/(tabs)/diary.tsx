import { useState, useCallback, useRef, useEffect } from 'react'
import {
  View, Text, ScrollView, Pressable, ActivityIndicator, Alert,
  RefreshControl, ActionSheetIOS, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  ChevronLeft, ChevronRight, Flame, Check,
  Camera, Clock, Utensils, ChevronDown,
} from 'lucide-react-native'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import * as Haptics from 'expo-haptics'
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated'
import { colors } from '../../src/theme/colors'
import {
  useDiaryToday, useDiaryStreak, useLogFoodDiary,
  useDeleteFoodDiary, useUploadDiaryPhoto,
} from '../../src/hooks/usePortal'
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

const STATUS_LABEL: Record<string, string> = {
  followed: 'Seguida',
  partial: 'Parcial',
  photo_only: 'Com foto',
}

// ── main screen ──

export default function DiaryScreen() {
  const [date, setDate] = useState(todayStr())
  const [loggingIndex, setLoggingIndex] = useState<number | null>(null)
  const [justCompleted, setJustCompleted] = useState(false)
  const prevLoggedCount = useRef(0)

  const { data: diary, isLoading, refetch, isRefetching } = useDiaryToday(date)
  const { data: streakData } = useDiaryStreak()
  const { mutateAsync: logEntry } = useLogFoodDiary()
  const { mutateAsync: deleteEntry } = useDeleteFoodDiary()
  const { mutateAsync: uploadPhoto } = useUploadDiaryPhoto()

  const isToday = date === todayStr()
  const streak = streakData?.streak ?? 0
  const mealPlan = diary?.meal_plan
  const meals = diary?.meals ?? []
  const loggedCount = meals.filter((m) => m.entry !== null).length
  const totalMeals = meals.length

  useEffect(() => {
    if (totalMeals > 0 && loggedCount === totalMeals && prevLoggedCount.current < totalMeals) {
      setJustCompleted(true)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      const timer = setTimeout(() => setJustCompleted(false), 3000)
      return () => clearTimeout(timer)
    }
    prevLoggedCount.current = loggedCount
  }, [loggedCount, totalMeals])

  // ── actions ──

  const handleFollow = useCallback(async (meal: DiaryTimelineMeal) => {
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
    } catch {
      Alert.alert('Erro', 'Não foi possível registrar.')
    } finally {
      setLoggingIndex(null)
    }
  }, [mealPlan, date, logEntry, loggingIndex])

  const handlePhoto = useCallback(async (meal: DiaryTimelineMeal) => {
    if (!mealPlan || loggingIndex !== null) return

    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera para fotografar sua refeição.')
      return
    }

    const result = await ImagePicker.launchCameraAsync({
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
        meal_plan_id: mealPlan.id,
        meal_index: meal.meal_index,
        photo_url,
      })
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a foto.')
    } finally {
      setLoggingIndex(null)
    }
  }, [mealPlan, date, logEntry, uploadPhoto, loggingIndex])

  const handleLongPress = useCallback((meal: DiaryTimelineMeal) => {
    if (!mealPlan) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    const isLogged = !!meal.entry
    const options = isLogged
      ? ['Desfazer registro', 'Cancelar']
      : ['Segui esta refeição', 'Segui parcialmente', 'Tirar foto', 'Cancelar']
    const cancelIndex = options.length - 1
    const destructiveIndex = isLogged ? 0 : -1

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: cancelIndex, destructiveButtonIndex: destructiveIndex },
        async (idx) => {
          if (isLogged) {
            if (idx === 0) confirmUndo(meal)
          } else {
            if (idx === 0) handleFollow(meal)
            else if (idx === 1) handlePartial(meal)
            else if (idx === 2) handlePhoto(meal)
          }
        },
      )
    } else {
      if (isLogged) {
        confirmUndo(meal)
      } else {
        Alert.alert('Registrar refeição', meal.meal_name, [
          { text: 'Segui', onPress: () => handleFollow(meal) },
          { text: 'Parcial', onPress: () => handlePartial(meal) },
          { text: 'Foto', onPress: () => handlePhoto(meal) },
          { text: 'Cancelar', style: 'cancel' },
        ])
      }
    }
  }, [mealPlan, handleFollow, handlePhoto])

  const handlePartial = useCallback(async (meal: DiaryTimelineMeal) => {
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
    } catch {
      Alert.alert('Erro', 'Não foi possível registrar.')
    } finally {
      setLoggingIndex(null)
    }
  }, [mealPlan, date, logEntry, loggingIndex])

  const confirmUndo = useCallback((meal: DiaryTimelineMeal) => {
    if (!meal.entry) return
    Alert.alert('Desfazer registro', `Remover "${meal.meal_name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desfazer', style: 'destructive',
        onPress: async () => {
          try { await deleteEntry(meal.entry!.id) } catch {
            Alert.alert('Erro', 'Não foi possível desfazer.')
          }
        },
      },
    ])
  }, [deleteEntry])

  // ── render ──

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* ── Header ── */}
      <View className="px-6 pt-5 pb-3">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-2xl font-sans-bold text-slate-900">Meu Diário</Text>
          {streak > 0 && (
            <Animated.View entering={FadeIn.duration(400)} className="flex-row items-center bg-amber-50 px-3.5 py-2 rounded-full">
              <Flame size={15} color="#f59e0b" />
              <Text className="text-xs font-sans-bold text-amber-600 ml-1.5">{streak} {streak === 1 ? 'dia' : 'dias'}</Text>
            </Animated.View>
          )}
        </View>

        {/* Date nav */}
        <View className="flex-row items-center justify-between bg-slate-50 rounded-2xl px-4 py-3">
          <Pressable onPress={() => setDate(shiftDate(date, -1))} hitSlop={16} className="p-1">
            <ChevronLeft size={20} color="#64748b" />
          </Pressable>
          <Pressable onPress={() => setDate(todayStr())}>
            <Text className="text-sm font-sans-semibold text-slate-700">
              {isToday ? 'Hoje' : fmtDate(date)}
            </Text>
          </Pressable>
          <Pressable onPress={() => setDate(shiftDate(date, 1))} hitSlop={16} disabled={isToday} className="p-1">
            <ChevronRight size={20} color={isToday ? '#cbd5e1' : '#64748b'} />
          </Pressable>
        </View>
      </View>

      {/* ── Progress ── */}
      {totalMeals > 0 && (
        <View className="px-6 pb-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm font-sans-medium text-slate-500">
              {loggedCount} de {totalMeals} refeições
            </Text>
            {loggedCount === totalMeals && (
              justCompleted ? (
                <Animated.Text entering={FadeInUp.duration(400)} className="text-sm font-sans-bold text-brand-600">
                  Dia completo!
                </Animated.Text>
              ) : (
                <Text className="text-sm font-sans-bold text-brand-600">Completo</Text>
              )
            )}
          </View>
          <View className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <Animated.View
              entering={FadeIn.duration(600)}
              className="h-full rounded-full"
              style={{
                width: `${(loggedCount / totalMeals) * 100}%`,
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
      ) : !mealPlan || meals.length === 0 ? (
        <View className="flex-1 items-center justify-center px-10">
          <View className="h-20 w-20 rounded-3xl bg-slate-50 items-center justify-center mb-5">
            <Utensils size={32} color="#94a3b8" />
          </View>
          <Text className="text-lg font-sans-semibold text-slate-900 mb-2 text-center">
            Nenhum plano ativo
          </Text>
          <Text className="text-sm text-slate-400 text-center font-sans leading-5">
            Aguarde seu nutricionista publicar um plano alimentar para começar a registrar.
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand[600]} />}
          showsVerticalScrollIndicator={false}
        >
          {meals.map((meal, idx) => (
            <Animated.View key={idx} entering={FadeInDown.duration(300).delay(idx * 60)}>
              <MealSection
                meal={meal}
                isLast={idx === meals.length - 1}
                onFollow={() => handleFollow(meal)}
                onPhoto={() => handlePhoto(meal)}
                onLongPress={() => handleLongPress(meal)}
                isLogging={loggingIndex === meal.meal_index}
                isToday={isToday}
              />
            </Animated.View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

// ── Meal section (timeline style) ──

function MealSection({
  meal, isLast, onFollow, onPhoto, onLongPress, isLogging, isToday,
}: {
  meal: DiaryTimelineMeal
  isLast: boolean
  onFollow: () => void
  onPhoto: () => void
  onLongPress: () => void
  isLogging: boolean
  isToday: boolean
}) {
  const isLogged = !!meal.entry
  const status = meal.entry?.compliance_status
  const photoUrl = meal.entry?.photo_url
  const foodsText = meal.foods.map((f) => f.name).join(', ')

  return (
    <View className="flex-row mb-1">
      {/* Timeline spine */}
      <View className="items-center mr-4 pt-1">
        <View className={`h-3 w-3 rounded-full ${isLogged ? 'bg-brand-500' : 'bg-slate-200'}`} />
        {!isLast && (
          <View className={`w-0.5 flex-1 mt-1 ${isLogged ? 'bg-brand-200' : 'bg-slate-100'}`} />
        )}
      </View>

      {/* Card content */}
      <Pressable
        onPress={isLogged && isToday ? onLongPress : undefined}
        onLongPress={isToday ? onLongPress : undefined}
        delayLongPress={400}
        className="flex-1 pb-5"
      >
        {/* Meal header */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-1">
            <Text className={`text-base font-sans-semibold ${isLogged ? 'text-brand-700' : 'text-slate-900'}`}>
              {meal.meal_name}
            </Text>
            <View className="flex-row items-center mt-0.5">
              <Clock size={12} color="#94a3b8" />
              <Text className="text-xs text-slate-400 font-sans ml-1">{meal.meal_time}</Text>
              {isLogged && status && (
                <View className={`ml-2.5 px-2 py-0.5 rounded-full ${
                  status === 'followed' ? 'bg-brand-50' : status === 'partial' ? 'bg-amber-50' : 'bg-blue-50'
                }`}>
                  <Text className={`text-xs font-sans-medium ${
                    status === 'followed' ? 'text-brand-600' : status === 'partial' ? 'text-amber-600' : 'text-blue-600'
                  }`}>
                    {STATUS_LABEL[status] ?? status}
                  </Text>
                </View>
              )}
            </View>
          </View>
          {isLogged && (
            <View className="h-8 w-8 rounded-full bg-brand-50 items-center justify-center">
              <Check size={16} color={colors.brand[600]} />
            </View>
          )}
        </View>

        {/* Photo — hero display */}
        {isLogged && photoUrl && (
          <View className="rounded-2xl overflow-hidden mb-3" style={{ aspectRatio: 4 / 3 }}>
            <Image
              source={{ uri: photoUrl }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
            />
          </View>
        )}

        {/* Food list — flowing text */}
        {!isLogged && foodsText.length > 0 && (
          <Text className="text-sm text-slate-400 font-sans leading-5 mb-4" numberOfLines={2}>
            {foodsText}
          </Text>
        )}

        {/* Action buttons — always visible for non-logged meals */}
        {!isLogged && (
          <View className="flex-row gap-3">
            <Pressable
              onPress={onPhoto}
              disabled={isLogging}
              className="flex-row items-center bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 active:bg-slate-100"
            >
              <Camera size={16} color="#64748b" />
              <Text className="text-sm font-sans-medium text-slate-600 ml-2">Foto</Text>
            </Pressable>
            <Pressable
              onPress={onFollow}
              disabled={isLogging}
              className="flex-1 flex-row items-center justify-center bg-brand-600 rounded-2xl px-4 py-3 active:bg-brand-700"
            >
              {isLogging ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Check size={16} color="#fff" />
                  <Text className="text-sm font-sans-semibold text-white ml-2">Segui</Text>
                </>
              )}
            </Pressable>
          </View>
        )}

        {/* Logged: hint for long-press */}
        {isLogged && isToday && (
          <View className="flex-row items-center justify-center pt-1">
            <ChevronDown size={12} color="#cbd5e1" />
            <Text className="text-[11px] text-slate-300 font-sans ml-1">Toque para opções</Text>
          </View>
        )}
      </Pressable>
    </View>
  )
}
