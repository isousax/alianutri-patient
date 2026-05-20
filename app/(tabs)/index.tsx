import { useState, useMemo, useCallback, useReducer, useEffect } from 'react'
import {
  View, Text, ScrollView, Pressable, ActivityIndicator,
  RefreshControl, StyleSheet, Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import {
  Calendar, RefreshCw, AlertCircle, ClipboardList, Target,
  Menu, X, ChevronRight, MapPin, Video, Flame,
  TrendingDown, TrendingUp, Sparkles, CalendarPlus, MessageCircle,
} from 'lucide-react-native'
import Svg, { Polyline, Circle as SvgCircle } from 'react-native-svg'
import Animated, { FadeIn, FadeInDown, FadeOut, SlideInLeft, SlideOutLeft } from 'react-native-reanimated'
import { useThemeColors } from '../../src/stores/theme'
import { useFeaturesStore } from '../../src/stores/features'
import {
  usePortalHome, useDiaryStreak, useDiaryToday,
  useGoals, useEvolution, useQuestionnaires, useChatUnreadCount,
} from '../../src/hooks/usePortal'
import type { PortalGoal, PortalEvolution } from '../../src/types/portal'

const DRAWER_W = Math.min(Dimensions.get('window').width * 0.78, 320)

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Goal progress: for weight/measurement goals where lower is better, invert progress
function goalProgress(goal: PortalGoal): number {
  if (goal.target_value == null || goal.current_value == null || goal.target_value === 0) return 0
  const lowerIsBetter = goal.type === 'weight' || goal.type === 'measurement'
  if (lowerIsBetter && goal.current_value > goal.target_value) {
    // e.g., current 72kg → target 68kg: we need starting reference
    // Use a simple heuristic: assume started ~20% above target as max
    const ceiling = goal.target_value * 1.3
    const total = ceiling - goal.target_value
    const done = ceiling - goal.current_value
    return Math.max(0, Math.min(done / total, 1))
  }
  return Math.min(goal.current_value / goal.target_value, 1)
}

export default function HomeScreen() {
  const t = useThemeColors()
  const qc = useQueryClient()
  const { data, isLoading, error, refetch, isRefetching } = usePortalHome()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const canWrite = useFeaturesStore((s) => s.canWrite)
  const setCanWrite = useFeaturesStore((s) => s.setCanWrite)

  useEffect(() => {
    if (data?.features) setCanWrite(data.features.can_write)
  }, [data?.features, setCanWrite])

  // Tick to refresh today string across midnight
  const [, tick] = useReducer((x: number) => x + 1, 0)
  const today = useMemo(todayStr, [tick]) // eslint-disable-line react-hooks/exhaustive-deps

  const { data: streakData } = useDiaryStreak()
  const { data: diaryToday } = useDiaryToday(today)
  const { data: goals } = useGoals()
  const { data: evolution } = useEvolution()
  const { data: questionnaires } = useQuestionnaires()
  const { data: chatUnread } = useChatUnreadCount()

  // Pull-to-refresh invalidates ALL dashboard queries
  const handleRefresh = useCallback(() => {
    refetch()
    qc.invalidateQueries({ queryKey: ['portal', 'diary-streak'] })
    qc.invalidateQueries({ queryKey: ['portal', 'diary-today'] })
    qc.invalidateQueries({ queryKey: ['portal', 'goals'] })
    qc.invalidateQueries({ queryKey: ['portal', 'evolution'] })
    qc.invalidateQueries({ queryKey: ['portal', 'questionnaires'] })
    qc.invalidateQueries({ queryKey: ['portal', 'chat-unread'] })
    tick()
  }, [refetch, qc])

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} className="items-center justify-center" edges={['top']}>
        <ActivityIndicator size="large" color={t.primary} />
      </SafeAreaView>
    )
  }

  if (error || !data) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} className="items-center justify-center px-8" edges={['top']}>
        <AlertCircle size={32} color={t.error} />
        <Text style={{ color: t.textSecondary }} className="text-sm text-center mt-3 font-sans">
          Não foi possível carregar os dados.
        </Text>
        <Pressable onPress={() => refetch()} className="mt-4 flex-row items-center gap-2">
          <RefreshCw size={14} color={t.primary} />
          <Text style={{ color: t.primary }} className="text-sm font-sans-medium">Tentar novamente</Text>
        </Pressable>
      </SafeAreaView>
    )
  }

  const displayName = data.patient.name?.split(' ')[0] || 'Paciente'
  const streak = streakData?.streak ?? 0
  const meals = diaryToday?.meals ?? []
  const loggedCount = meals.filter((m) => m.entry !== null).length
  const totalMeals = meals.length
  const activeGoals = (goals ?? []).filter((g: PortalGoal) => g.status === 'active').slice(0, 2)
  const pendingQ = (questionnaires ?? []).filter((q) => q.status === 'sent')
  const hasAnyContent = totalMeals > 0 || activeGoals.length > 0 || (evolution ?? []).length >= 2 || pendingQ.length > 0

  function fmtAppointment(iso: string) {
    const d = new Date(iso)
    const day = d.getDate().toString().padStart(2, '0')
    const month = (d.getMonth() + 1).toString().padStart(2, '0')
    const h = d.getHours().toString().padStart(2, '0')
    const m = d.getMinutes().toString().padStart(2, '0')
    return `${day}/${month} às ${h}:${m}`
  }

  function fmtWeekday(iso: string) {
    return new Date(iso).toLocaleDateString('pt-BR', { weekday: 'long' })
  }

  const apt = data.next_appointment

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
      {/* ── Header ── */}
      <View className="px-5 pt-4 pb-2 flex-row items-center justify-between">
        <View className="flex-1">
          <Text style={{ color: t.textMuted }} className="text-sm font-sans">Olá,</Text>
          <Text style={{ color: t.text }} className="text-2xl font-sans-bold">{displayName}</Text>
        </View>
        <Pressable
          onPress={() => setDrawerOpen(true)}
          hitSlop={12}
          className="h-10 w-10 rounded-xl items-center justify-center"
          style={{ backgroundColor: t.surface }}
        >
          <Menu size={20} color={t.textSecondary} />
        </Pressable>
      </View>

      {/* ── Content ── */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor={t.primary} />}
      >
        {/* Nutritionist badge */}
        {data.nutritionist?.name ? (
          <View className="px-5 mb-4">
            <View className="flex-row items-center px-3 py-2 rounded-xl" style={{ backgroundColor: t.primaryLight }}>
              <View className="h-7 w-7 rounded-full items-center justify-center mr-2.5" style={{ backgroundColor: t.primaryMuted }}>
                <Text className="text-[11px] font-sans-bold" style={{ color: t.primary }}>
                  {data.nutritionist.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View className="flex-1">
                <Text style={{ color: t.textMuted }} className="text-[10px] font-sans">Nutricionista</Text>
                <Text style={{ color: t.primary }} className="text-[13px] font-sans-semibold">{data.nutritionist.name}</Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* ── Pending questionnaires alert (urgent — first) ── */}
        {pendingQ.length > 0 && (
          <Animated.View entering={FadeInDown.duration(300)} className="px-5 mb-3">
            <Pressable onPress={() => router.push('/questionnaires')}>
              <View
                className="rounded-2xl px-4 py-3 flex-row items-center"
                style={{ backgroundColor: t.accentLight, borderWidth: 1, borderColor: t.accent + '30' }}
              >
                <ClipboardList size={18} color={t.accent} />
                <View className="flex-1 ml-3">
                  <Text style={{ color: t.text }} className="text-[13px] font-sans-semibold">
                    {pendingQ.length} questionário{pendingQ.length > 1 ? 's' : ''} pendente{pendingQ.length > 1 ? 's' : ''}
                  </Text>
                  <Text style={{ color: t.textMuted }} className="text-[11px] font-sans">
                    Toque para responder
                  </Text>
                </View>
                <ChevronRight size={16} color={t.accent} />
              </View>
            </Pressable>
          </Animated.View>
        )}

        {/* ── Diary streak + today progress ── */}
        {totalMeals > 0 && (
          <Animated.View entering={FadeInDown.duration(300).delay(80)} className="px-5 mb-3">
            <Pressable onPress={() => router.push('/(tabs)/diary')}>
              <View
                className="rounded-2xl p-4"
                style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.borderLight }}
              >
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center">
                    <Flame size={16} color={streak > 0 ? '#f59e0b' : t.textMuted} />
                    <Text style={{ color: t.text }} className="text-sm font-sans-bold ml-1.5">
                      {streak > 0 ? `${streak} dia${streak > 1 ? 's' : ''}` : 'Sem streak'}
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <Text style={{ color: loggedCount === totalMeals ? t.success : t.textSecondary }} className="text-xs font-sans-semibold mr-1">
                      {loggedCount}/{totalMeals}
                    </Text>
                    <ChevronRight size={14} color={t.textMuted} />
                  </View>
                </View>
                {/* Progress bar */}
                <View className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: t.borderLight }}>
                  <View
                    className="h-2 rounded-full"
                    style={{
                      width: `${(loggedCount / totalMeals) * 100}%`,
                      backgroundColor: loggedCount === totalMeals ? t.success : t.primary,
                    }}
                  />
                </View>
                <Text style={{ color: t.textMuted }} className="text-[11px] font-sans mt-2">
                  {loggedCount === totalMeals
                    ? '✓ Todas as refeições registradas'
                    : `${totalMeals - loggedCount} refeição${totalMeals - loggedCount > 1 ? 'ões' : ''} pendente${totalMeals - loggedCount > 1 ? 's' : ''}`}
                </Text>
              </View>
            </Pressable>
          </Animated.View>
        )}

        {/* ── Active goals ── */}
        {activeGoals.length > 0 && (
          <Animated.View entering={FadeInDown.duration(300).delay(160)} className="px-5 mb-3">
            <Pressable onPress={() => router.push('/goals')}>
              <View
                className="rounded-2xl p-4"
                style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.borderLight }}
              >
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center">
                    <Target size={14} color={t.success} />
                    <Text style={{ color: t.text }} className="text-xs font-sans-bold uppercase tracking-wider ml-1.5">
                      Metas ativas
                    </Text>
                  </View>
                  <ChevronRight size={14} color={t.textMuted} />
                </View>
                {activeGoals.map((goal: PortalGoal, i: number) => {
                  const progress = goalProgress(goal)
                  return (
                    <View key={goal.id} style={i > 0 ? { marginTop: 10 } : undefined}>
                      <View className="flex-row items-center justify-between mb-1">
                        <Text style={{ color: t.text }} className="text-[13px] font-sans-medium flex-1 mr-2" numberOfLines={1}>
                          {goal.title}
                        </Text>
                        {goal.target_value != null && goal.current_value != null && goal.target_unit && (
                          <Text style={{ color: t.textMuted }} className="text-[11px] font-sans">
                            {goal.current_value}{goal.target_unit} → {goal.target_value}{goal.target_unit}
                          </Text>
                        )}
                      </View>
                      <View className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: t.borderLight }}>
                        <View
                          className="h-1.5 rounded-full"
                          style={{ width: `${progress * 100}%`, backgroundColor: progress >= 1 ? t.success : t.primary }}
                        />
                      </View>
                    </View>
                  )
                })}
              </View>
            </Pressable>
          </Animated.View>
        )}

        {/* ── Weight evolution sparkline ── */}
        <WeightSparkline evolution={evolution ?? []} t={t} />

        {/* ── Next appointment card ── */}
        {apt ? (
          <Animated.View entering={FadeInDown.duration(300).delay(320)} className="px-5 mb-3">
            <View
              className="rounded-2xl overflow-hidden"
              style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.borderLight }}
            >
              <View className="px-4 pt-3 pb-1 flex-row items-center">
                <Calendar size={13} color={t.primary} />
                <Text style={{ color: t.primary }} className="text-[11px] font-sans-bold uppercase tracking-wider ml-1.5">
                  Próxima consulta
                </Text>
              </View>
              <View className="px-4 pt-1 pb-4">
                <Text style={{ color: t.text }} className="text-lg font-sans-bold">
                  {fmtAppointment(apt.starts_at)}
                </Text>
                <Text style={{ color: t.textMuted }} className="text-xs font-sans mt-0.5 capitalize">
                  {fmtWeekday(apt.starts_at)}
                </Text>
                <View className="flex-row items-center mt-2.5">
                  {apt.type === 'online' ? (
                    <View className="flex-row items-center px-2 py-1 rounded-lg" style={{ backgroundColor: t.primaryLight }}>
                      <Video size={12} color={t.primary} />
                      <Text style={{ color: t.primary }} className="text-[11px] font-sans-medium ml-1">Online</Text>
                    </View>
                  ) : (
                    <View className="flex-row items-center px-2 py-1 rounded-lg" style={{ backgroundColor: t.accentLight }}>
                      <MapPin size={12} color={t.accent} />
                      <Text style={{ color: t.accent }} className="text-[11px] font-sans-medium ml-1">Presencial</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </Animated.View>
        ) : null}

        {/* ── Welcome empty state (new patient with no data) ── */}
        {!hasAnyContent && !apt && (
          <Animated.View entering={FadeIn.duration(400)} className="px-5 mt-4 items-center">
            <Sparkles size={36} color={t.primaryMuted} />
            <Text style={{ color: t.text }} className="text-base font-sans-semibold mt-3 text-center">
              Bem-vindo ao AliaNutri!
            </Text>
            <Text style={{ color: t.textMuted }} className="text-sm font-sans text-center mt-1.5 leading-5">
              Seus dados aparecerão aqui conforme{'\n'}seu nutricionista atualizar seu plano.
            </Text>
          </Animated.View>
        )}
      </ScrollView>

      {/* ── Drawer overlay ── */}
      {drawerOpen && (
        <>
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            style={StyleSheet.absoluteFill}
          >
            <Pressable
              onPress={() => setDrawerOpen(false)}
              style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]}
            />
          </Animated.View>

          <Animated.View
            entering={SlideInLeft.duration(250)}
            exiting={SlideOutLeft.duration(200)}
            style={[
              StyleSheet.absoluteFill,
              { width: DRAWER_W },
            ]}
          >
            <SafeAreaView
              style={{ flex: 1, backgroundColor: t.background }}
              edges={['top', 'bottom']}
            >
              {/* Drawer header */}
              <View className="px-5 pt-4 pb-6 flex-row items-center justify-between">
                <Text style={{ color: t.text }} className="text-lg font-sans-bold">Menu</Text>
                <Pressable onPress={() => setDrawerOpen(false)} hitSlop={12}>
                  <X size={20} color={t.textSecondary} />
                </Pressable>
              </View>

              {/* Drawer items */}
              <View className="px-4 gap-1">
                <DrawerItem
                  icon={<ClipboardList size={20} color={t.accent} />}
                  iconBg={t.accentLight}
                  title="Questionários"
                  subtitle="Responda os pendentes"
                  t={t}
                  onPress={() => { setDrawerOpen(false); router.push('/questionnaires') }}
                />
                <DrawerItem
                  icon={<Target size={20} color={t.success} />}
                  iconBg={t.primaryLight}
                  title="Metas"
                  subtitle="Acompanhe seu progresso"
                  t={t}
                  onPress={() => { setDrawerOpen(false); router.push('/goals') }}
                />
                <DrawerItem
                  icon={<MessageCircle size={20} color={t.primary} />}
                  iconBg={t.primaryLight}
                  title="Chat"
                  subtitle="Fale com seu nutricionista"
                  badge={chatUnread?.unread}
                  t={t}
                  onPress={() => { setDrawerOpen(false); router.push('/chat') }}
                />
                {canWrite && (
                  <DrawerItem
                    icon={<CalendarPlus size={20} color={t.primary} />}
                    iconBg={t.primaryLight}
                    title="Agendar consulta"
                    subtitle="Marque um hor\u00e1rio"
                    t={t}
                    onPress={() => { setDrawerOpen(false); router.push('/booking') }}
                  />
                )}
              </View>
            </SafeAreaView>
          </Animated.View>
        </>
      )}
    </SafeAreaView>
  )
}

// ── Weight sparkline card ──

function WeightSparkline({ evolution, t }: {
  evolution: PortalEvolution[]
  t: ReturnType<typeof useThemeColors>
}) {
  const points = evolution.filter((e) => e.weight_kg !== null) as (PortalEvolution & { weight_kg: number })[]
  if (points.length < 2) return null

  const W = Dimensions.get('window').width - 40 - 32 // px-5 padding + card padding
  const H = 60
  const padX = 4
  const padY = 8
  const chartW = W - padX * 2
  const chartH = H - padY * 2

  const weights = points.map((p) => p.weight_kg)
  const minW = Math.min(...weights) - 0.5
  const maxW = Math.max(...weights) + 0.5
  const rangeW = maxW - minW || 1

  const coords = points.map((p, i) => ({
    x: padX + (i / (points.length - 1)) * chartW,
    y: padY + chartH - ((p.weight_kg - minW) / rangeW) * chartH,
  }))

  const polyPoints = coords.map((c) => `${c.x},${c.y}`).join(' ')
  const first = points[0].weight_kg
  const last = points[points.length - 1].weight_kg
  const diff = last - first
  const diffStr = `${diff > 0 ? '+' : ''}${diff.toFixed(1).replace('.', ',')} kg`
  const TrendIcon = diff <= 0 ? TrendingDown : TrendingUp

  return (
    <Animated.View entering={FadeInDown.duration(300).delay(240)} className="px-5 mb-3">
      <Pressable onPress={() => router.push('/(tabs)/profile')}>
        <View
          className="rounded-2xl p-4"
          style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.borderLight }}
        >
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center">
              <TrendIcon size={14} color={diff <= 0 ? t.success : t.warning} />
              <Text style={{ color: t.text }} className="text-xs font-sans-bold uppercase tracking-wider ml-1.5">
                Evolução
              </Text>
            </View>
            <View className="flex-row items-center">
              <Text
                className="text-xs font-sans-semibold mr-1"
                style={{ color: diff <= 0 ? t.success : t.warning }}
              >
                {diffStr}
              </Text>
              <ChevronRight size={14} color={t.textMuted} />
            </View>
          </View>
          <View className="flex-row items-center justify-between mb-1">
            <Text style={{ color: t.textMuted }} className="text-[11px] font-sans">
              {last.toFixed(1).replace('.', ',')} kg
            </Text>
            <Text style={{ color: t.textMuted }} className="text-[10px] font-sans">
              {points.length} medições
            </Text>
          </View>
          <Svg width={W} height={H}>
            <Polyline
              points={polyPoints}
              fill="none"
              stroke={t.primary}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <SvgCircle
              cx={coords[coords.length - 1].x}
              cy={coords[coords.length - 1].y}
              r={3}
              fill={t.primary}
            />
          </Svg>
        </View>
      </Pressable>
    </Animated.View>
  )
}

// ── Drawer item ──

function DrawerItem({ icon, iconBg, title, subtitle, badge, t, onPress }: {
  icon: React.ReactNode
  iconBg: string
  title: string
  subtitle: string
  badge?: number
  t: ReturnType<typeof useThemeColors>
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 px-3 py-3 rounded-xl"
      style={({ pressed }) => ({ backgroundColor: pressed ? t.surfacePressed : 'transparent' })}
    >
      <View className="h-10 w-10 rounded-xl items-center justify-center" style={{ backgroundColor: iconBg }}>
        {icon}
      </View>
      <View className="flex-1">
        <Text style={{ color: t.text }} className="text-[13px] font-sans-semibold">{title}</Text>
        <Text style={{ color: t.textMuted }} className="text-[11px] font-sans mt-0.5">{subtitle}</Text>
      </View>
      {badge != null && badge > 0 ? (
        <View
          className="min-w-[20px] h-5 rounded-full items-center justify-center px-1.5"
          style={{ backgroundColor: t.error }}
        >
          <Text className="text-[10px] font-sans-bold" style={{ color: '#fff' }}>
            {badge > 99 ? '99+' : badge}
          </Text>
        </View>
      ) : (
        <ChevronRight size={16} color={t.textMuted} />
      )}
    </Pressable>
  )
}
