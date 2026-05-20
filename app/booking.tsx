import { useState, useMemo, useCallback } from 'react'
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { ArrowLeft, Calendar, Clock, MapPin, Video, ChevronLeft, ChevronRight, Check } from 'lucide-react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { colors } from '../src/theme/colors'
import { useFeaturesStore } from '../src/stores/features'
import { useBookingConfig, useBookingSlots, useRequestBooking } from '../src/hooks/usePortal'
import type { BookingSlot } from '../src/types/portal'

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
  const { data: config, isLoading: configLoading } = useBookingConfig()
  const canWrite = useFeaturesStore((s) => s.canWrite)
  const requestBooking = useRequestBooking()

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<'online' | 'in_person' | null>(null)

  const { data: slotsData, isLoading: slotsLoading } = useBookingSlots(selectedDate)

  // Calendar grid
  const calendarDays = useMemo(() => {
    const y = currentMonth.getFullYear()
    const m = currentMonth.getMonth()
    const firstDay = new Date(y, m, 1).getDay()
    const daysInMonth = new Date(y, m + 1, 0).getDate()
    const today = toDateStr(new Date())

    const days: { date: string; day: number; enabled: boolean; isToday: boolean; isPast: boolean }[] = []

    // Empty slots for alignment
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

  // Auto-select type if only one mode available
  const effectiveType = useMemo(() => {
    if (selectedType) return selectedType
    if (!config?.consultation_mode) return null
    if (config.consultation_mode === 'online') return 'online'
    if (config.consultation_mode === 'in_person') return 'in_person'
    return null // 'both' → user must choose
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
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center" edges={['top']}>
        <ActivityIndicator color={colors.brand[500]} size="large" />
      </SafeAreaView>
    )
  }

  if (!config || config.booking_mode === 'disabled') {
    return (
      <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
        <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <ArrowLeft size={20} color="#64748b" />
          </Pressable>
          <Text className="text-xl font-sans-bold text-slate-900">Agendar consulta</Text>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <Calendar size={48} color="#94a3b8" />
          <Text className="text-base text-slate-500 text-center mt-4">
            O agendamento online não está disponível no momento.
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={20} color="#64748b" />
        </Pressable>
        <Text className="text-xl font-sans-bold text-slate-900">Agendar consulta</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Calendar */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} className="mx-5 bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          {/* Month nav */}
          <View className="flex-row items-center justify-between mb-4">
            <Pressable onPress={() => setCurrentMonth(addMonths(currentMonth, -1))} hitSlop={12}>
              <ChevronLeft size={20} color="#64748b" />
            </Pressable>
            <Text className="text-sm font-sans-semibold text-slate-900">
              {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </Text>
            <Pressable onPress={() => setCurrentMonth(addMonths(currentMonth, 1))} hitSlop={12}>
              <ChevronRight size={20} color="#64748b" />
            </Pressable>
          </View>

          {/* Weekday headers */}
          <View className="flex-row mb-2">
            {WEEKDAYS.map((w) => (
              <View key={w} className="flex-1 items-center">
                <Text className="text-[10px] font-sans-semibold text-slate-400 uppercase">{w}</Text>
              </View>
            ))}
          </View>

          {/* Days grid */}
          <View className="flex-row flex-wrap">
            {calendarDays.map((d, i) => (
              <View key={i} className="items-center justify-center" style={{ width: '14.28%', height: 40 }}>
                {d.day > 0 && (
                  <Pressable
                    onPress={() => d.enabled && handleDateSelect(d.date)}
                    disabled={!d.enabled}
                    className={`w-8 h-8 rounded-full items-center justify-center ${
                      d.date === selectedDate
                        ? 'bg-brand-500'
                        : d.isToday
                        ? 'border border-brand-400'
                        : ''
                    }`}
                  >
                    <Text
                      className={`text-xs font-sans-semibold ${
                        d.date === selectedDate
                          ? 'text-white'
                          : !d.enabled
                          ? 'text-slate-300'
                          : 'text-slate-700'
                      }`}
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
            <View className="flex-row items-center gap-2 mb-3">
              <Clock size={16} color={colors.brand[500]} />
              <Text className="text-sm font-sans-semibold text-slate-900">Horários disponíveis</Text>
              {slotsLoading && <ActivityIndicator size="small" color={colors.brand[500]} />}
            </View>

            {!slotsLoading && slotsData && slotsData.slots.length === 0 && (
              <View className="bg-white rounded-xl p-4 border border-slate-100">
                <Text className="text-sm text-slate-500 text-center">Nenhum horário disponível neste dia.</Text>
              </View>
            )}

            {!slotsLoading && slotsData && slotsData.slots.length > 0 && (
              <View className="flex-row flex-wrap gap-2">
                {slotsData.slots.map((slot: BookingSlot) => (
                  <Pressable
                    key={slot.time}
                    onPress={() => slot.available && setSelectedSlot(slot.time)}
                    disabled={!slot.available}
                    className={`px-4 py-2.5 rounded-xl border ${
                      selectedSlot === slot.time
                        ? 'bg-brand-500 border-brand-500'
                        : slot.available
                        ? 'bg-white border-slate-200'
                        : 'bg-slate-50 border-slate-100'
                    }`}
                  >
                    <Text
                      className={`text-sm font-sans-semibold ${
                        selectedSlot === slot.time
                          ? 'text-white'
                          : slot.available
                          ? 'text-slate-700'
                          : 'text-slate-300'
                      }`}
                    >
                      {slot.time}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {slotsData && (
              <Text className="text-[10px] text-slate-400 mt-2">
                Duração: {slotsData.duration_minutes} min
              </Text>
            )}
          </Animated.View>
        )}

        {/* Type selector */}
        {showTypeSelector && selectedSlot && (
          <Animated.View entering={FadeInDown.delay(300).duration(400)} className="mx-5 mt-4">
            <Text className="text-sm font-sans-semibold text-slate-900 mb-3">Tipo de consulta</Text>
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setSelectedType('online')}
                className={`flex-1 p-4 rounded-xl border items-center gap-2 ${
                  selectedType === 'online' ? 'bg-brand-50 border-brand-400' : 'bg-white border-slate-200'
                }`}
              >
                <Video size={20} color={selectedType === 'online' ? colors.brand[600] : '#94a3b8'} />
                <Text className={`text-sm font-sans-semibold ${selectedType === 'online' ? 'text-brand-700' : 'text-slate-600'}`}>
                  Online
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setSelectedType('in_person')}
                className={`flex-1 p-4 rounded-xl border items-center gap-2 ${
                  selectedType === 'in_person' ? 'bg-brand-50 border-brand-400' : 'bg-white border-slate-200'
                }`}
              >
                <MapPin size={20} color={selectedType === 'in_person' ? colors.brand[600] : '#94a3b8'} />
                <Text className={`text-sm font-sans-semibold ${selectedType === 'in_person' ? 'text-brand-700' : 'text-slate-600'}`}>
                  Presencial
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        )}

        {/* Info banner */}
        {config.booking_mode === 'approval' && selectedSlot && (
          <Animated.View entering={FadeInDown.delay(350).duration(400)} className="mx-5 mt-4 bg-purple-50 rounded-xl p-3 border border-purple-100">
            <Text className="text-xs text-purple-700">
              Sua solicitação será enviada para o nutricionista aprovar antes de ser confirmada.
            </Text>
          </Animated.View>
        )}

        {/* Price */}
        {config.consultation_price_cents && selectedSlot && (
          <Animated.View entering={FadeInDown.delay(360).duration(400)} className="mx-5 mt-3">
            <Text className="text-xs text-slate-500">
              Valor: R$ {(config.consultation_price_cents / 100).toFixed(2).replace('.', ',')}
            </Text>
          </Animated.View>
        )}
      </ScrollView>

      {/* Bottom CTA */}
      {canBook && (
        <Animated.View entering={FadeInDown.duration(300)} className="absolute bottom-0 left-0 right-0 px-5 pb-8 pt-4 bg-slate-50 border-t border-slate-100">
          <Pressable
            onPress={handleBook}
            disabled={requestBooking.isPending}
            className={`rounded-2xl py-4 flex-row items-center justify-center gap-2 ${
              requestBooking.isPending ? 'bg-brand-300' : 'bg-brand-500'
            }`}
          >
            {requestBooking.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Check size={18} color="#fff" />
            )}
            <Text className="text-white font-sans-bold text-base">
              {config.booking_mode === 'approval' ? 'Solicitar agendamento' : 'Confirmar agendamento'}
            </Text>
          </Pressable>
        </Animated.View>
      )}
    </SafeAreaView>
  )
}
