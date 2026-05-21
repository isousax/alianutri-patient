import { useState, useMemo, useCallback } from 'react'
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Calendar, Clock, MapPin, Video, ChevronLeft, ChevronRight, Check, Info } from 'lucide-react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useThemeColors } from '../src/stores/theme'
import { useFeaturesStore } from '../src/stores/features'
import { useBookingConfig, useBookingSlots, useRequestBooking } from '../src/hooks/usePortal'
import type { BookingSlot } from '../src/types/portal'

const SHADOW_SM = Platform.select({
  ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  android: { elevation: 2 },
  default: {},
}) as Record<string, unknown>

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}

export default function BookingScreen() {
  const t = useThemeColors()
  const { data: config, isLoading: configLoading } = useBookingConfig()
  const canWrite = useFeaturesStore((s) => s.canWrite)
  const requestBooking = useRequestBooking()

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<'online' | 'in_person' | null>(null)

  const { data: slotsData, isLoading: slotsLoading } = useBookingSlots(selectedDate)

  const calendarDays = useMemo(() => {
    const y = currentMonth.getFullYear()
    const m = currentMonth.getMonth()
    const firstDay = new Date(y, m, 1).getDay()
    const daysInMonth = new Date(y, m + 1, 0).getDate()
    const today = toDateStr(new Date())

    const days: { date: string; day: number; enabled: boolean; isToday: boolean; isPast: boolean }[] = []

    for (let i = 0; i < firstDay; i++) {
      days.push({ date: '', day: 0, enabled: false, isToday: false, isPast: true })
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(y, m, d)
      const dateStr = toDateStr(dt)
      const dayOfWeek = dt.getDay()
      const isPast = dateStr < today
      const isDayEnabled = config?.enabled_days?.includes(dayOfWeek) ?? false

      days.push({
        date: dateStr,
        day: d,
        enabled: !isPast && isDayEnabled,
        isToday: dateStr === today,
        isPast,
      })
    }

    return days
  }, [currentMonth, config])

  const effectiveType = useMemo(() => {
    if (selectedType) return selectedType
    if (!config?.consultation_mode) return null
    if (config.consultation_mode === 'online') return 'online'
    if (config.consultation_mode === 'in_person') return 'in_person'
    return null
  }, [selectedType, config])

  const canBook = canWrite && selectedDate && selectedSlot && effectiveType
  const showTypeSelector = config?.consultation_mode === 'both'

  const handleDateSelect = useCallback((date: string) => {
    setSelectedDate(date)
    setSelectedSlot(null)
  }, [])

  const handleBook = useCallback(async () => {
    if (!selectedDate || !selectedSlot || !effectiveType) return

    try {
      const result = await requestBooking.mutateAsync({
        date: selectedDate,
        start_time: selectedSlot,
        type: effectiveType,
      })
      Alert.alert('Sucesso', result.message, [
        { text: 'OK', onPress: () => router.back() },
      ])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao solicitar agendamento.'
      Alert.alert('Erro', msg)
    }
  }, [selectedDate, selectedSlot, effectiveType, requestBooking])

  if (configLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} className="items-center justify-center" edges={['top']}>
        <ActivityIndicator color={t.primary} size="large" />
      </SafeAreaView>
    )
  }

  if (!config || config.booking_mode === 'disabled') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
        <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <ChevronLeft size={22} color={t.textSecondary} />
          </Pressable>
          <Text style={{ color: t.text }} className="text-xl font-sans-bold">Agendar consulta</Text>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <View className="h-16 w-16 rounded-3xl items-center justify-center mb-4" style={{ backgroundColor: t.primaryLight }}>
            <Calendar size={28} color={t.primary} />
          </View>
          <Text style={{ color: t.textSecondary }} className="text-base text-center mt-2 font-sans">
            O agendamento online não está disponível no momento.
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={22} color={t.textSecondary} />
        </Pressable>
        <View className="h-8 w-8 rounded-xl items-center justify-center" style={{ backgroundColor: t.primary + '15' }}>
          <Calendar size={16} color={t.primary} />
        </View>
        <Text style={{ color: t.text }} className="text-xl font-sans-bold">Agendar consulta</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Calendar */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} className="mx-5 rounded-2xl p-4" style={{ backgroundColor: t.surface, ...SHADOW_SM }}>
          {/* Month nav */}
          <View className="flex-row items-center justify-between mb-4">
            <Pressable onPress={() => setCurrentMonth(addMonths(currentMonth, -1))} hitSlop={12}>
              <ChevronLeft size={20} color={t.textSecondary} />
            </Pressable>
            <Text style={{ color: t.text }} className="text-sm font-sans-bold">
              {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </Text>
            <Pressable onPress={() => setCurrentMonth(addMonths(currentMonth, 1))} hitSlop={12}>
              <ChevronRight size={20} color={t.textSecondary} />
            </Pressable>
          </View>

          {/* Weekday headers */}
          <View className="flex-row mb-2">
            {WEEKDAYS.map((w) => (
              <View key={w} className="flex-1 items-center">
                <Text style={{ color: t.textMuted }} className="text-[10px] font-sans-bold uppercase">{w}</Text>
              </View>
            ))}
          </View>

          {/* Days grid */}
          <View className="flex-row flex-wrap">
            {calendarDays.map((d, i) => (
              <View key={i} className="items-center justify-center" style={{ width: '14.28%', height: 42 }}>
                {d.day > 0 && (
                  <Pressable
                    onPress={() => d.enabled && handleDateSelect(d.date)}
                    disabled={!d.enabled}
                    className="w-9 h-9 rounded-xl items-center justify-center"
                    style={
                      d.date === selectedDate
                        ? { backgroundColor: t.primary }
                        : d.isToday
                        ? { borderWidth: 1.5, borderColor: t.primary }
                        : undefined
                    }
                  >
                    <Text
                      className="text-xs font-sans-semibold"
                      style={{
                        color: d.date === selectedDate
                          ? t.primaryText
                          : !d.enabled
                          ? t.borderLight
                          : t.text,
                      }}
                    >
                      {d.day}
                    </Text>
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Time slots */}
        {selectedDate && (
          <Animated.View entering={FadeInDown.delay(200).duration(400)} className="mx-5 mt-4">
            <View className="flex-row items-center gap-2 mb-3 ml-1">
              <Clock size={14} color={t.primary} />
              <Text style={{ color: t.text }} className="text-sm font-sans-bold">Horários disponíveis</Text>
              {slotsLoading && <ActivityIndicator size="small" color={t.primary} />}
            </View>

            {!slotsLoading && slotsData && slotsData.slots.length === 0 && (
              <View className="rounded-2xl p-4" style={{ backgroundColor: t.surface, ...SHADOW_SM }}>
                <Text style={{ color: t.textMuted }} className="text-sm text-center font-sans">Nenhum horário disponível neste dia.</Text>
              </View>
            )}

            {!slotsLoading && slotsData && slotsData.slots.length > 0 && (
              <View className="flex-row flex-wrap gap-2">
                {slotsData.slots.map((slot: BookingSlot) => (
                  <Pressable
                    key={slot.time}
                    onPress={() => slot.available && setSelectedSlot(slot.time)}
                    disabled={!slot.available}
                    className="px-4 py-2.5 rounded-xl"
                    style={
                      selectedSlot === slot.time
                        ? { backgroundColor: t.primary }
                        : slot.available
                        ? { backgroundColor: t.surface, ...SHADOW_SM }
                        : { backgroundColor: t.borderLight }
                    }
                  >
                    <Text
                      className="text-sm font-sans-semibold"
                      style={{
                        color: selectedSlot === slot.time
                          ? t.primaryText
                          : slot.available
                          ? t.text
                          : t.textMuted,
                      }}
                    >
                      {slot.time}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {slotsData && (
              <Text style={{ color: t.textMuted }} className="text-[10px] font-sans mt-2 ml-1">
                Duração: {slotsData.duration_minutes} min
              </Text>
            )}
          </Animated.View>
        )}

        {/* Type selector */}
        {showTypeSelector && selectedSlot && (
          <Animated.View entering={FadeInDown.delay(300).duration(400)} className="mx-5 mt-4">
            <Text style={{ color: t.text }} className="text-sm font-sans-bold mb-3 ml-1">Tipo de consulta</Text>
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setSelectedType('online')}
                className="flex-1 p-4 rounded-2xl items-center gap-2"
                style={
                  selectedType === 'online'
                    ? { backgroundColor: t.primaryLight, borderWidth: 1.5, borderColor: t.primary }
                    : { backgroundColor: t.surface, ...SHADOW_SM }
                }
              >
                <Video size={20} color={selectedType === 'online' ? t.primary : t.textMuted} />
                <Text className="text-sm font-sans-semibold" style={{ color: selectedType === 'online' ? t.primary : t.text }}>
                  Online
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setSelectedType('in_person')}
                className="flex-1 p-4 rounded-2xl items-center gap-2"
                style={
                  selectedType === 'in_person'
                    ? { backgroundColor: t.primaryLight, borderWidth: 1.5, borderColor: t.primary }
                    : { backgroundColor: t.surface, ...SHADOW_SM }
                }
              >
                <MapPin size={20} color={selectedType === 'in_person' ? t.primary : t.textMuted} />
                <Text className="text-sm font-sans-semibold" style={{ color: selectedType === 'in_person' ? t.primary : t.text }}>
                  Presencial
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        )}

        {/* Info banner */}
        {config.booking_mode === 'approval' && selectedSlot && (
          <Animated.View
            entering={FadeInDown.delay(350).duration(400)}
            className="mx-5 mt-4 rounded-xl p-3 flex-row items-start gap-2"
            style={{ backgroundColor: t.accent + '12' }}
          >
            <Info size={14} color={t.accent} style={{ marginTop: 1 }} />
            <Text style={{ color: t.accent }} className="text-xs font-sans flex-1">
              Sua solicitação será enviada para o nutricionista aprovar antes de ser confirmada.
            </Text>
          </Animated.View>
        )}

        {/* Price */}
        {config.consultation_price_cents && selectedSlot && (
          <Animated.View entering={FadeInDown.delay(360).duration(400)} className="mx-5 mt-3 ml-6">
            <Text style={{ color: t.textMuted }} className="text-xs font-sans">
              Valor: R$ {(config.consultation_price_cents / 100).toFixed(2).replace('.', ',')}
            </Text>
          </Animated.View>
        )}
      </ScrollView>

      {/* Bottom CTA */}
      {canBook && (
        <Animated.View
          entering={FadeInDown.duration(300)}
          className="absolute bottom-0 left-0 right-0 px-5 pb-8 pt-4"
          style={{ backgroundColor: t.background, borderTopWidth: 1, borderTopColor: t.borderLight }}
        >
          <Pressable
            onPress={handleBook}
            disabled={requestBooking.isPending}
            className="rounded-2xl py-4 flex-row items-center justify-center gap-2"
            style={{
              backgroundColor: requestBooking.isPending ? t.primary + '80' : t.primary,
              ...SHADOW_SM,
            }}
          >
            {requestBooking.isPending ? (
              <ActivityIndicator color={t.primaryText} size="small" />
            ) : (
              <Check size={18} color={t.primaryText} />
            )}
            <Text style={{ color: t.primaryText }} className="font-sans-bold text-base">
              {config.booking_mode === 'approval' ? 'Solicitar agendamento' : 'Confirmar agendamento'}
            </Text>
          </Pressable>
        </Animated.View>
      )}
    </SafeAreaView>
  )
}
