import { useState, useCallback } from 'react'
import {
  View, Text, ScrollView, Pressable, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import {
  Droplets, Plus, Minus, Trash2, ChevronLeft, ChevronRight,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated'
import Svg, { Circle as SvgCircle } from 'react-native-svg'
import { useThemeColors } from '../src/stores/theme'
import { useWaterIntake, useLogWater, useDeleteWater } from '../src/hooks/usePortal'

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

const QUICK_AMOUNTS = [150, 200, 250, 300, 500]

export default function WaterScreen() {
  const t = useThemeColors()
  const [date, setDate] = useState(todayStr())
  const isToday = date === todayStr()
  const [customAmount, setCustomAmount] = useState(250)

  const { data, refetch } = useWaterIntake(date)
  const { mutateAsync: logWater, isPending: isLogging } = useLogWater()
  const { mutateAsync: deleteWater } = useDeleteWater()

  const goal = data?.goal_ml ?? 2000
  const total = data?.total_ml ?? 0
  const entries = data?.entries ?? []
  const progress = goal > 0 ? Math.min(total / goal, 1) : 0

  // Circular progress
  const RADIUS = 80
  const STROKE = 10
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS

  const handleAdd = useCallback(async (amount: number) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      await logWater({ date, amount_ml: amount })
      if (progress < 1 && (total + amount) >= goal) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível registrar.')
    }
  }, [date, logWater, progress, total, goal])

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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-4 pb-2 flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={22} color={t.textSecondary} />
        </Pressable>
        <Droplets size={22} color={t.info} />
        <Text style={{ color: t.text }} className="text-xl font-sans-bold">Hidratação</Text>
      </View>

      {/* Date nav */}
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

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Circular progress */}
        <Animated.View entering={FadeIn.duration(400)} className="items-center mt-4 mb-6">
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
              <SvgCircle
                cx={RADIUS + STROKE}
                cy={RADIUS + STROKE}
                r={RADIUS}
                stroke={progress >= 1 ? t.success : t.info}
                strokeWidth={STROKE}
                fill="none"
                strokeDasharray={`${CIRCUMFERENCE}`}
                strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
                strokeLinecap="round"
              />
            </Svg>
            <View
              className="absolute items-center justify-center"
              style={{ top: STROKE, left: STROKE, width: RADIUS * 2, height: RADIUS * 2 }}
            >
              <Droplets size={24} color={progress >= 1 ? t.success : t.info} />
              <Text style={{ color: t.text }} className="text-2xl font-sans-bold mt-1">
                {total >= 1000 ? `${(total / 1000).toFixed(1).replace('.', ',')}L` : `${total}ml`}
              </Text>
              <Text style={{ color: t.textMuted }} className="text-xs font-sans">
                de {goal >= 1000 ? `${(goal / 1000).toFixed(1).replace('.', ',')}L` : `${goal}ml`}
              </Text>
            </View>
          </View>

          {progress >= 1 && (
            <Animated.View entering={FadeInUp.duration(400)} className="mt-3">
              <Text style={{ color: t.success }} className="text-sm font-sans-bold">
                Meta atingida! 🎉
              </Text>
            </Animated.View>
          )}
        </Animated.View>

        {/* Quick add buttons */}
        {isToday && (
          <Animated.View entering={FadeInDown.duration(300).delay(100)} className="px-5 mb-6">
            <Text style={{ color: t.textMuted }} className="text-xs font-sans-semibold uppercase tracking-wider mb-3">
              Adicionar rápido
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {QUICK_AMOUNTS.map((ml) => (
                <Pressable
                  key={ml}
                  onPress={() => handleAdd(ml)}
                  disabled={isLogging}
                  className="flex-row items-center px-4 py-2.5 rounded-xl"
                  style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.borderLight }}
                >
                  <Plus size={14} color={t.info} />
                  <Text style={{ color: t.text }} className="text-sm font-sans-semibold ml-1.5">
                    {ml}ml
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Custom amount */}
            <View className="flex-row items-center mt-3 gap-2">
              <Pressable
                onPress={() => setCustomAmount(Math.max(50, customAmount - 50))}
                className="h-10 w-10 rounded-xl items-center justify-center"
                style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.borderLight }}
              >
                <Minus size={16} color={t.textSecondary} />
              </Pressable>
              <View className="flex-1 items-center">
                <Text style={{ color: t.text }} className="text-lg font-sans-bold">{customAmount}ml</Text>
              </View>
              <Pressable
                onPress={() => setCustomAmount(Math.min(2000, customAmount + 50))}
                className="h-10 w-10 rounded-xl items-center justify-center"
                style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.borderLight }}
              >
                <Plus size={16} color={t.textSecondary} />
              </Pressable>
              <Pressable
                onPress={() => handleAdd(customAmount)}
                disabled={isLogging}
                className="px-5 py-2.5 rounded-xl"
                style={{ backgroundColor: t.info }}
              >
                <Text style={{ color: '#fff' }} className="text-sm font-sans-bold">Adicionar</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}

        {/* History for the day */}
        {entries.length > 0 && (
          <Animated.View entering={FadeInDown.duration(300).delay(200)} className="px-5">
            <Text style={{ color: t.textMuted }} className="text-xs font-sans-semibold uppercase tracking-wider mb-2">
              Registros ({entries.length})
            </Text>
            {entries.map((entry, i) => {
              const time = new Date(entry.created_at)
              const timeStr = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`
              return (
                <View
                  key={entry.id}
                  className="flex-row items-center py-2.5 px-3 rounded-xl mb-1"
                  style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.borderLight }}
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
      </ScrollView>
    </SafeAreaView>
  )
}
