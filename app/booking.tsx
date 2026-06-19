import { useState, useMemo, useCallback } from 'react'
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Calendar, Clock, MapPin, Video, ChevronLeft, ChevronRight, Check, Info, Wifi } from 'lucide-react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { useThemeColors } from '../src/stores/theme'
import { useFeaturesStore } from '../src/stores/features'
import { useBookingConfig, useBookingSlots, useRequestBooking } from '../src/hooks/usePortal'
import type { BookingSlot, BookingLocationItem } from '../src/types/portal'
import { ScreenHeader, Card, EmptyState, LoadingScreen } from '../src/components/ui'
import { shadows, radius, space, typography, SCREEN_PADDING } from '../src/theme/tokens'

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
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)

  const ms = config?.mode_status
  const onlineBookable = ms?.online.bookable ?? false
  const inPersonBookable = ms?.in_person.bookable ?? false
  const bothBookable = onlineBookable && inPersonBookable
  const anyBookable = onlineBookable || inPersonBookable
  const bothEnabled = (ms?.online.enabled ?? false) && (ms?.in_person.enabled ?? false)

  const effectiveType = useMemo((): 'online' | 'in_person' | null => {
    if (selectedType) return selectedType
    if (bothBookable) return null
    if (onlineBookable) return 'online'
    if (inPersonBookable) return 'in_person'
    return null
  }, [selectedType, bothBookable, onlineBookable, inPersonBookable])

  // Filter locations by selected type
  const filteredLocations = useMemo(() => {
    if (!config?.locations) return []
    if (!effectiveType) return config.locations
    return config.locations.filter((l: BookingLocationItem) =>
      effectiveType === 'online' ? l.type === 'ONLINE' : l.type === 'PHYSICAL'
    )
  }, [config, effectiveType])

  // Auto-select first matching location
  const activeLocationId = useMemo(() => {
    if (selectedLocationId && filteredLocations.some((l: BookingLocationItem) => l.id === selectedLocationId)) {
      return selectedLocationId
    }
    return filteredLocations[0]?.id ?? null
  }, [filteredLocations, selectedLocationId])

  const { data: slotsData, isLoading: slotsLoading } = useBookingSlots(selectedDate, activeLocationId ?? undefined)

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
      // When a specific location is selected, use its per-location enabled_days
      let activeDays: number[]
      if (activeLocationId) {
        const loc = config?.locations.find((l: BookingLocationItem) => l.id === activeLocationId)
        activeDays = loc?.enabled_days?.length ? loc.enabled_days
          : effectiveType === 'online' ? (config?.enabled_days_online ?? [])
          : effectiveType === 'in_person' ? (config?.enabled_days_in_person ?? [])
          : (config?.enabled_days ?? [])
      } else {
        activeDays = effectiveType === 'online'
          ? (config?.enabled_days_online ?? [])
          : effectiveType === 'in_person'
          ? (config?.enabled_days_in_person ?? [])
          : (config?.enabled_days ?? [])
      }
      const isDayEnabled = activeDays.includes(dayOfWeek)

      days.push({
        date: dateStr,
        day: d,
        enabled: !isPast && isDayEnabled,
        isToday: dateStr === today,
        isPast,
      })
    }

    return days
  }, [currentMonth, config, effectiveType, activeLocationId])

  const canBook = canWrite && selectedDate && selectedSlot && effectiveType

  const handleDateSelect = useCallback((date: string) => {
    setSelectedDate(date)
    setSelectedSlot(null)
  }, [])

  const handleLocationSelect = useCallback((locId: string) => {
    setSelectedLocationId(locId)
    setSelectedSlot(null)
  }, [])

  const handleBook = useCallback(async () => {
    if (!selectedDate || !selectedSlot || !effectiveType) return

    try {
      const result = await requestBooking.mutateAsync({
        date: selectedDate,
        start_time: selectedSlot,
        type: effectiveType,
        location_id: activeLocationId ?? undefined,
      })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
      Alert.alert('Sucesso', result.message, [
        { text: 'OK', onPress: () => router.back() },
      ])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao solicitar agendamento.'
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {})
      Alert.alert('Erro', msg)
    }
  }, [selectedDate, selectedSlot, effectiveType, activeLocationId, requestBooking])

  if (configLoading) return <LoadingScreen />

  if (!config || config.booking_mode === 'disabled') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
        <ScreenHeader title="Agendar consulta" />
        <EmptyState
          icon={<Calendar size={28} color={t.primary} />}
          title="Indisponível"
          description="O agendamento online não está disponível no momento."
        />
      </SafeAreaView>
    )
  }

  if (!anyBookable) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
        <ScreenHeader title="Agendar consulta" />
        <EmptyState
          icon={<Calendar size={28} color={t.primary} />}
          title="Nenhum horário disponível"
          description="Este profissional ainda não possui horários configurados para agendamento."
        />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
      <ScreenHeader title="Agendar consulta" />

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Calendar */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={{ paddingHorizontal: SCREEN_PADDING }}>
          <Card>
          {/* Month nav */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.lg }}>
            <Pressable onPress={() => setCurrentMonth(addMonths(currentMonth, -1))} hitSlop={12}>
              <ChevronLeft size={20} color={t.textSecondary} />
            </Pressable>
            <Text style={[typography.headingSm, { color: t.text }]}>
              {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </Text>
            <Pressable onPress={() => setCurrentMonth(addMonths(currentMonth, 1))} hitSlop={12}>
              <ChevronRight size={20} color={t.textSecondary} />
            </Pressable>
          </View>

          {/* Weekday headers */}
          <View style={{ flexDirection: 'row', marginBottom: space.sm }}>
            {WEEKDAYS.map((w) => (
              <View key={w} style={{ flex: 1, alignItems: 'center' }}>
                <Text style={[typography.captionBold, { color: t.textMuted, fontSize: 10, textTransform: 'uppercase' }]}>{w}</Text>
              </View>
            ))}
          </View>

          {/* Days grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {calendarDays.map((d, i) => (
              <View key={i} style={{ alignItems: 'center', justifyContent: 'center', width: '14.28%', height: 42 }}>
                {d.day > 0 && (
                  <Pressable
                    onPress={() => d.enabled && handleDateSelect(d.date)}
                    disabled={!d.enabled}
                    style={{
                      width: 36, height: 36,
                      borderRadius: radius.lg,
                      alignItems: 'center', justifyContent: 'center',
                      ...(d.date === selectedDate
                        ? { backgroundColor: t.primary }
                        : d.isToday
                        ? { borderWidth: 1.5, borderColor: t.primary }
                        : {}),
                    }}
                  >
                    <Text
                      style={[typography.captionBold, {
                        color: d.date === selectedDate
                          ? t.primaryFg
                          : !d.enabled
                          ? t.borderLight
                          : t.text,
                      }]}
                    >
                      {d.day}
                    </Text>
                  </Pressable>
                )}
              </View>
            ))}
          </View>
          </Card>
        </Animated.View>

        {/* Location selector */}
        {filteredLocations.length > 1 && selectedDate && (
          <Animated.View entering={FadeInDown.delay(150).duration(400)} style={{ paddingHorizontal: SCREEN_PADDING, marginTop: space.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.md, marginLeft: 2 }}>
              <MapPin size={14} color={t.primary} />
              <Text style={[typography.headingSm, { color: t.text }]}>Local</Text>
            </View>
            <View style={{ gap: space.sm }}>
              {filteredLocations.map((loc: BookingLocationItem) => (
                <Pressable
                  key={loc.id}
                  onPress={() => handleLocationSelect(loc.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space.md,
                    padding: space.md,
                    borderRadius: radius.lg,
                    ...(activeLocationId === loc.id
                      ? { backgroundColor: t.primaryLight, borderWidth: 1.5, borderColor: t.primary }
                      : { backgroundColor: t.surface, ...shadows.sm }),
                  }}
                >
                  {loc.type === 'ONLINE'
                    ? <Wifi size={16} color={activeLocationId === loc.id ? t.primary : t.textMuted} />
                    : <MapPin size={16} color={activeLocationId === loc.id ? t.primary : t.textMuted} />
                  }
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.labelMd, { color: activeLocationId === loc.id ? t.primary : t.text }]}>
                      {loc.name}
                    </Text>
                    {loc.address && (
                      <Text style={[typography.caption, { color: t.textMuted, marginTop: 1 }]} numberOfLines={1}>
                        {loc.address}
                      </Text>
                    )}
                  </View>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Time slots */}
        {selectedDate && (
          <Animated.View entering={FadeInDown.delay(200).duration(400)} style={{ paddingHorizontal: SCREEN_PADDING, marginTop: space.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.md, marginLeft: 2 }}>
              <Clock size={14} color={t.primary} />
              <Text style={[typography.headingSm, { color: t.text }]}>Horários disponíveis</Text>
              {slotsLoading && <ActivityIndicator size="small" color={t.primary} />}
            </View>

            {!slotsLoading && slotsData && slotsData.slots.length === 0 && (
              <Card>
                <Text style={[typography.bodyMd, { color: t.textMuted, textAlign: 'center' }]}>Nenhum horário disponível neste dia.</Text>
              </Card>
            )}

            {!slotsLoading && slotsData && slotsData.slots.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                {slotsData.slots.map((slot: BookingSlot) => (
                  <Pressable
                    key={slot.time}
                    onPress={() => { if (slot.available) { Haptics.selectionAsync().catch(() => {}); setSelectedSlot(slot.time) } }}
                    disabled={!slot.available}
                    style={{
                      paddingHorizontal: space.lg,
                      paddingVertical: space.sm + 2,
                      borderRadius: radius.lg,
                      ...(selectedSlot === slot.time
                        ? { backgroundColor: t.primary }
                        : slot.available
                        ? { backgroundColor: t.surface, ...shadows.sm }
                        : { backgroundColor: t.borderLight }),
                    }}
                  >
                    <Text
                      style={[typography.labelMd, {
                        color: selectedSlot === slot.time
                          ? t.primaryFg
                          : slot.available
                          ? t.text
                          : t.textMuted,
                      }]}
                    >
                      {slot.time}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {slotsData && (
              <Text style={[typography.caption, { color: t.textMuted, marginTop: space.sm, marginLeft: 2 }]}>
                Duração: {slotsData.duration_minutes} min
              </Text>
            )}
          </Animated.View>
        )}

        {/* Type selector — show when both modes are enabled */}
        {bothEnabled && selectedSlot && (
          <Animated.View entering={FadeInDown.delay(300).duration(400)} style={{ paddingHorizontal: SCREEN_PADDING, marginTop: space.lg }}>
            <Text style={[typography.headingSm, { color: t.text, marginBottom: space.md, marginLeft: 2 }]}>Tipo de consulta</Text>
            <View style={{ flexDirection: 'row', gap: space.md }}>
              <Pressable
                onPress={() => onlineBookable && setSelectedType('online')}
                disabled={!onlineBookable}
                style={{
                  flex: 1,
                  padding: space.lg,
                  borderRadius: radius.xl,
                  alignItems: 'center',
                  gap: space.sm,
                  opacity: onlineBookable ? 1 : 0.5,
                  ...(selectedType === 'online'
                    ? { backgroundColor: t.primaryLight, borderWidth: 1.5, borderColor: t.primary }
                    : { backgroundColor: t.surface, ...shadows.sm }),
                }}
              >
                <Video size={20} color={selectedType === 'online' ? t.primary : t.textMuted} />
                <Text style={[typography.labelMd, { color: selectedType === 'online' ? t.primary : t.text }]}>
                  Online
                </Text>
                {!onlineBookable && (
                  <Text style={[typography.caption, { color: t.textMuted, fontSize: 10, textAlign: 'center' }]}>
                    Sem hor\u00e1rios
                  </Text>
                )}
              </Pressable>
              <Pressable
                onPress={() => inPersonBookable && setSelectedType('in_person')}
                disabled={!inPersonBookable}
                style={{
                  flex: 1,
                  padding: space.lg,
                  borderRadius: radius.xl,
                  alignItems: 'center',
                  gap: space.sm,
                  opacity: inPersonBookable ? 1 : 0.5,
                  ...(selectedType === 'in_person'
                    ? { backgroundColor: t.primaryLight, borderWidth: 1.5, borderColor: t.primary }
                    : { backgroundColor: t.surface, ...shadows.sm }),
                }}
              >
                <MapPin size={20} color={selectedType === 'in_person' ? t.primary : t.textMuted} />
                <Text style={[typography.labelMd, { color: selectedType === 'in_person' ? t.primary : t.text }]}>
                  Presencial
                </Text>
                {!inPersonBookable && (
                  <Text style={[typography.caption, { color: t.textMuted, fontSize: 10, textAlign: 'center' }]}>
                    Sem hor\u00e1rios
                  </Text>
                )}
              </Pressable>
            </View>
          </Animated.View>
        )}

        {/* Info banner */}
        {config.booking_mode === 'approval' && selectedSlot && (
          <Animated.View
            entering={FadeInDown.delay(350).duration(400)}
            style={{
              marginHorizontal: SCREEN_PADDING,
              marginTop: space.lg,
              borderRadius: radius.lg,
              padding: space.md,
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: space.sm,
              backgroundColor: t.accentLight,
            }}
          >
            <Info size={14} color={t.accent} style={{ marginTop: 1 }} />
            <Text style={[typography.bodySm, { color: t.accent, flex: 1 }]}>
              Sua solicitação será enviada para o nutricionista aprovar antes de ser confirmada.
            </Text>
          </Animated.View>
        )}

        {/* Price */}
        {config.consultation_price_cents && selectedSlot && (
          <Animated.View entering={FadeInDown.delay(360).duration(400)} style={{ paddingHorizontal: SCREEN_PADDING, marginTop: space.md }}>
            <Text style={[typography.caption, { color: t.textMuted, marginLeft: 2 }]}>
              Valor: R$ {(config.consultation_price_cents / 100).toFixed(2).replace('.', ',')}
            </Text>
          </Animated.View>
        )}
      </ScrollView>

      {/* Bottom CTA */}
      {canBook && (
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={{
            position: 'absolute',
            bottom: 0, left: 0, right: 0,
            paddingHorizontal: SCREEN_PADDING,
            paddingBottom: space['3xl'],
            paddingTop: space.lg,
            backgroundColor: t.background,
            borderTopWidth: 1,
            borderTopColor: t.borderLight,
          }}
        >
          <Pressable
            onPress={handleBook}
            disabled={requestBooking.isPending}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: space.sm,
              paddingVertical: space.lg,
              borderRadius: radius.xl,
              backgroundColor: requestBooking.isPending ? t.primary + '80' : t.primary,
              ...shadows.glow(t.primary),
            }}
          >
            {requestBooking.isPending ? (
              <ActivityIndicator color={t.primaryFg} size="small" />
            ) : (
              <Check size={18} color={t.primaryFg} />
            )}
            <Text style={[typography.headingSm, { color: t.primaryFg }]}>
              {config.booking_mode === 'approval' ? 'Solicitar agendamento' : 'Confirmar agendamento'}
            </Text>
          </Pressable>
        </Animated.View>
      )}
    </SafeAreaView>
  )
}
