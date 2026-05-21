import { useState, useCallback, useEffect, useRef } from 'react'
import {
  View, Text, ScrollView, Pressable, Alert, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import {
  Droplets, Trash2, ChevronLeft, ChevronRight, ChevronDown,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import Animated, { FadeIn, FadeInDown, FadeInUp, FadeOutUp, useSharedValue, useAnimatedProps, withTiming, Easing } from 'react-native-reanimated'
import Svg, { Circle as SvgCircle } from 'react-native-svg'
import { useThemeColors } from '../src/stores/theme'
import { useWaterIntake, useLogWater, useDeleteWater } from '../src/hooks/usePortal'

const AnimatedSvgCircle = Animated.createAnimatedComponent(SvgCircle)

const SHADOW_SM = Platform.select({
  ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  android: { elevation: 2 },
  default: {},
}) as Record<string, unknown>

const SHADOW_MD = Platform.select({
  ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  android: { elevation: 4 },
  default: {},
}) as Record<string, unknown>

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
}

function shiftDate(dateStr: string, days: number) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const WATER_OPTIONS = [
  { ml: 200, label: 'Copo', emoji: '🥤' },
  { ml: 300, label: 'Copo grande', emoji: '🫗' },
  { ml: 500, label: 'Garrafa', emoji: '🧴' },
]

export default function WaterScreen() {
  const t = useThemeColors()
  const [date, setDate] = useState(todayStr())
  const isToday = date === todayStr()
  const [showHistory, setShowHistory] = useState(false)
  const localBoostRef = useRef(0)
  const [lastAdded, setLastAdded] = useState<{ amount: number; key: number } | null>(null)
  const [, rerender] = useState(0)
  const prevServerTotal = useRef(0)

  const { data, refetch } = useWaterIntake(date)
  const { mutateAsync: logWater, isPending: isLogging } = useLogWater()
  const { mutateAsync: deleteWater } = useDeleteWater()

  const goal = data?.goal_ml ?? 2000
  const total = data?.total_ml ?? 0
  const entries = data?.entries ?? []

  // Absorb server delta synchronously during render (no flicker)
  if (total !== prevServerTotal.current) {
    const delta = total - prevServerTotal.current
    if (delta > 0) localBoostRef.current = Math.max(0, localBoostRef.current - delta)
    prevServerTotal.current = total
  }

  // Optimistic display values
  const displayTotal = total + localBoostRef.current
  const displayProgress = goal > 0 ? Math.min(displayTotal / goal, 1) : 0
  const pct = Math.round(displayProgress * 100)

  // Auto-dismiss floating toast
  useEffect(() => {
    if (!lastAdded) return
    const timer = setTimeout(() => setLastAdded(null), 1400)
    return () => clearTimeout(timer)
  }, [lastAdded])

  // Animated circular progress
  const RADIUS = 85
  const STROKE = 12
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS
  const animatedProgress = useSharedValue(0)

  useEffect(() => {
    animatedProgress.value = withTiming(displayProgress, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    })
  }, [displayProgress])

  const animatedCircleProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - animatedProgress.value),
  }))

  const handleAdd = useCallback(async (amount: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    localBoostRef.current += amount
    rerender((n) => n + 1)
    setLastAdded({ amount, key: Date.now() })

    // Celebrate if crossing goal
    if (displayTotal < goal && (displayTotal + amount) >= goal) {
      setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 600)
    }

    try {
      await logWater({ date, amount_ml: amount })
    } catch {
      localBoostRef.current = Math.max(0, localBoostRef.current - amount)
      rerender((n) => n + 1)
      Alert.alert('Erro', 'Não foi possível registrar.')
    }
  }, [date, logWater, displayTotal, goal])

  const handleDelete = useCallback(async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    Alert.alert('Remover', 'Remover este registro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover', style: 'destructive', onPress: async () => {
          try {
            await deleteWater(id)
            refetch()
          } catch { Alert.alert('Erro', 'Não foi possível remover.') }
        },
      },
    ])
  }, [deleteWater, refetch])

  const ringColor = displayProgress >= 1 ? t.success : t.info

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-4 pb-2 flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={22} color={t.textSecondary} />
        </Pressable>
        <View className="h-8 w-8 rounded-xl items-center justify-center" style={{ backgroundColor: t.info + '15' }}>
          <Droplets size={16} color={t.info} />
        </View>
        <Text style={{ color: t.text }} className="text-xl font-sans-bold">Hidratação</Text>
      </View>

      {/* Discrete date nav */}
      <View className="flex-row items-center justify-center gap-3 pb-2">
        <Pressable onPress={() => setDate(shiftDate(date, -1))} hitSlop={12}>
          <ChevronLeft size={16} color={t.textMuted} />
        </Pressable>
        <Pressable onPress={() => setDate(todayStr())}>
          <Text style={{ color: t.textMuted }} className="text-xs font-sans-medium">
            {isToday ? 'Hoje' : fmtDate(date)}
          </Text>
        </Pressable>
        <Pressable onPress={() => setDate(shiftDate(date, 1))} hitSlop={12} disabled={isToday}>
          <ChevronRight size={16} color={isToday ? t.borderLight : t.textMuted} />
        </Pressable>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Circular progress */}
        <Animated.View entering={FadeIn.duration(400)} className="items-center mt-6 mb-8">
          <View style={{ width: RADIUS * 2 + STROKE * 2, height: RADIUS * 2 + STROKE * 2 }}>
            <Svg
              width={RADIUS * 2 + STROKE * 2}
              height={RADIUS * 2 + STROKE * 2}
              style={{ transform: [{ rotate: '-90deg' }] }}
            >
              <SvgCircle
                cx={RADIUS + STROKE}
                cy={RADIUS + STROKE}
                r={RADIUS}
                stroke={t.borderLight}
                strokeWidth={STROKE}
                fill="none"
              />
              <AnimatedSvgCircle
                cx={RADIUS + STROKE}
                cy={RADIUS + STROKE}
                r={RADIUS}
                stroke={ringColor}
                strokeWidth={STROKE}
                fill="none"
                strokeDasharray={`${CIRCUMFERENCE}`}
                animatedProps={animatedCircleProps}
                strokeLinecap="round"
              />
            </Svg>
            <View
              className="absolute items-center justify-center"
              style={{ top: STROKE, left: STROKE, width: RADIUS * 2, height: RADIUS * 2 }}
            >
              <Droplets size={22} color={ringColor} />
              <Text style={{ color: t.text }} className="text-3xl font-sans-bold mt-1">
                {displayTotal >= 1000 ? `${(displayTotal / 1000).toFixed(1).replace('.', ',')}` : `${displayTotal}`}
              </Text>
              <Text style={{ color: t.textMuted }} className="text-xs font-sans">
                {displayTotal >= 1000 ? 'litros' : 'ml'} de {goal >= 1000 ? `${(goal / 1000).toFixed(1).replace('.', ',')}L` : `${goal}ml`}
              </Text>
            </View>
          </View>

          {/* Percentage badge */}
          <View className="mt-3 px-3 py-1 rounded-full" style={{ backgroundColor: ringColor + '15' }}>
            <Text style={{ color: ringColor }} className="text-xs font-sans-bold">
              {displayProgress >= 1 ? 'Meta atingida! 🎉' : `${pct}% da meta`}
            </Text>
          </View>

          {/* Floating toast */}
          {lastAdded && (
            <Animated.Text
              key={lastAdded.key}
              entering={FadeInUp.duration(250)}
              exiting={FadeOutUp.duration(350)}
              style={{ color: t.info }}
              className="text-base font-sans-bold mt-2"
            >
              +{lastAdded.amount}ml
            </Animated.Text>
          )}
        </Animated.View>

        {/* 3 quick-add cards */}
        {isToday && (
          <Animated.View entering={FadeInDown.duration(300).delay(100)} className="px-5 mb-6">
            <View className="flex-row gap-3">
              {WATER_OPTIONS.map((opt) => {
                return (
                  <Pressable
                    key={opt.ml}
                    onPress={() => handleAdd(opt.ml)}
                    disabled={isLogging}
                    className="flex-1 items-center py-4 rounded-2xl"
                    style={{ backgroundColor: t.surface, ...SHADOW_MD }}
                  >
                    <View
                      className="h-11 w-11 rounded-xl items-center justify-center mb-2"
                      style={{ backgroundColor: t.info + '12' }}
                    >
                      <Text className="text-xl">{opt.emoji}</Text>
                    </View>
                    <Text style={{ color: t.text }} className="text-base font-sans-bold">
                      {opt.ml}ml
                    </Text>
                    <Text style={{ color: t.textMuted }} className="text-[10px] font-sans mt-0.5">
                      {opt.label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </Animated.View>
        )}

        {/* Collapsible history */}
        {entries.length > 0 && (
          <Animated.View entering={FadeInDown.duration(300).delay(200)} className="px-5">
            <Pressable
              onPress={() => setShowHistory(!showHistory)}
              className="flex-row items-center justify-between py-3 px-4 rounded-2xl"
              style={{ backgroundColor: t.surface, ...SHADOW_SM }}
            >
              <View className="flex-row items-center gap-2">
                <Droplets size={14} color={t.info} />
                <Text style={{ color: t.text }} className="text-[13px] font-sans-semibold">
                  {entries.length} {entries.length === 1 ? 'registro' : 'registros'} hoje
                </Text>
              </View>
              <ChevronDown
                size={16}
                color={t.textMuted}
                style={{ transform: [{ rotate: showHistory ? '180deg' : '0deg' }] }}
              />
            </Pressable>

            {showHistory && (
              <Animated.View entering={FadeInDown.duration(200)} className="mt-2">
                {entries.map((entry) => {
                  const time = new Date(entry.created_at)
                  const timeStr = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`
                  return (
                    <View
                      key={entry.id}
                      className="flex-row items-center py-2.5 px-3 rounded-xl mb-1.5"
                      style={{ backgroundColor: t.surface, ...SHADOW_SM }}
                    >
                      <Droplets size={14} color={t.info} />
                      <Text style={{ color: t.text }} className="text-sm font-sans-semibold ml-2 flex-1">
                        {entry.amount_ml}ml
                      </Text>
                      <Text style={{ color: t.textMuted }} className="text-xs font-sans mr-3">{timeStr}</Text>
                      {isToday && (
                        <Pressable onPress={() => handleDelete(entry.id)} hitSlop={8}>
                          <Trash2 size={14} color={t.textMuted} />
                        </Pressable>
                      )}
                    </View>
                  )
                })}
              </Animated.View>
            )}
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
