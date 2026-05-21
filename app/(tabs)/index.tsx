import { useState, useMemo, useCallback, useReducer, useEffect } from 'react'
import {
  View, Text, ScrollView, Pressable, ActivityIndicator,
  RefreshControl, StyleSheet, Dimensions, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import {
  Calendar, RefreshCw, AlertCircle, ClipboardList, Target,
  Menu, X, ChevronRight, MapPin, Video, Flame, Droplets,
  TrendingDown, TrendingUp, Sparkles, CalendarPlus, MessageCircle,
  Scale, Heart, Camera, Utensils, Sun, Moon, CloudSun,
} from 'lucide-react-native'
import Svg, { Polyline, Circle as SvgCircle, Defs, LinearGradient, Stop } from 'react-native-svg'
import Animated, { FadeIn, FadeInDown, FadeOut, SlideInLeft, SlideOutLeft } from 'react-native-reanimated'
import { LinearGradient as ExpoGradient } from 'expo-linear-gradient'
import { useThemeColors } from '../../src/stores/theme'
import { useFeaturesStore } from '../../src/stores/features'
import {
  usePortalHome, useDiaryStreak, useDiaryToday,
  useGoals, useEvolution, useQuestionnaires, useChatUnreadCount,
  useWaterIntake,
} from '../../src/hooks/usePortal'
import type { PortalGoal, PortalEvolution } from '../../src/types/portal'
import { getTipOfTheDay } from '../../src/data/dailyTips'

const { width: SCREEN_W } = Dimensions.get('window')
const DRAWER_W = Math.min(SCREEN_W * 0.78, 320)

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getGreeting(): { text: string; icon: typeof Sun } {
  const h = new Date().getHours()
  if (h < 12) return { text: 'Bom dia', icon: Sun }
  if (h < 18) return { text: 'Boa tarde', icon: CloudSun }
  return { text: 'Boa noite', icon: Moon }
}

function fmtWater(ml: number): string {
  return ml >= 1000 ? `${(ml / 1000).toFixed(1).replace('.', ',')}L` : `${ml}ml`
}

function goalProgress(goal: PortalGoal): number {
  if (goal.target_value == null || goal.current_value == null || goal.target_value === 0) return 0
  const lowerIsBetter = goal.type === 'weight' || goal.type === 'measurement'
  if (lowerIsBetter && goal.current_value > goal.target_value) {
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

  const [, tick] = useReducer((x: number) => x + 1, 0)
  const today = useMemo(todayStr, [tick]) // eslint-disable-line react-hooks/exhaustive-deps

  const { data: streakData } = useDiaryStreak()
  const { data: diaryToday } = useDiaryToday(today)
  const { data: goals } = useGoals()
  const { data: evolution } = useEvolution()
  const { data: questionnaires } = useQuestionnaires()
  const { data: chatUnread } = useChatUnreadCount()
  const { data: waterData } = useWaterIntake(today)

  const handleRefresh = useCallback(() => {
    refetch()
    qc.invalidateQueries({ queryKey: ['portal', 'diary-streak'] })
    qc.invalidateQueries({ queryKey: ['portal', 'diary-today'] })
    qc.invalidateQueries({ queryKey: ['portal', 'goals'] })
    qc.invalidateQueries({ queryKey: ['portal', 'evolution'] })
    qc.invalidateQueries({ queryKey: ['portal', 'questionnaires'] })
    qc.invalidateQueries({ queryKey: ['portal', 'chat-unread'] })
    qc.invalidateQueries({ queryKey: ['portal', 'water'] })
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
  const greeting = getGreeting()
  const GreetingIcon = greeting.icon
  const streak = streakData?.streak ?? 0
  const meals = diaryToday?.meals ?? []
  const loggedCount = meals.filter((m) => m.entry !== null).length
  const totalMeals = meals.length
  const diaryPct = totalMeals > 0 ? loggedCount / totalMeals : 0
  const activeGoals = (goals ?? []).filter((g: PortalGoal) => g.status === 'active').slice(0, 2)
  const pendingQ = (questionnaires ?? []).filter((q) => q.status === 'sent')
  const waterTotal = waterData?.total_ml ?? 0
  const waterGoal = waterData?.goal_ml ?? 2000
  const waterPct = waterGoal > 0 ? Math.min(waterTotal / waterGoal, 1) : 0
  const hasAnyContent = totalMeals > 0 || activeGoals.length > 0 || (evolution ?? []).length >= 2 || pendingQ.length > 0 || waterTotal > 0

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
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor={t.primary} />}
      >
        {/* ══════ HERO HEADER ══════ */}
        <ExpoGradient
          colors={[t.primary + '18', t.background]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ paddingBottom: 20, paddingTop: 8 }}
        >
          <View className="px-6 pt-3 flex-row items-start justify-between">
            <View className="flex-1">
              <View className="flex-row items-center mb-1">
                <GreetingIcon size={14} color={t.primary} />
                <Text style={{ color: t.primary }} className="text-xs font-sans-semibold ml-1.5">
                  {greeting.text}
                </Text>
              </View>
              <Text style={{ color: t.text }} className="text-[26px] font-sans-bold leading-8">
                {displayName}
              </Text>
              {data.nutritionist?.name ? (
                <Text style={{ color: t.textMuted }} className="text-xs font-sans mt-1">
                  Nutri: {data.nutritionist.name}
                </Text>
              ) : null}
            </View>
            <Pressable
              onPress={() => setDrawerOpen(true)}
              hitSlop={12}
              className="h-11 w-11 rounded-2xl items-center justify-center mt-1"
              style={{ backgroundColor: t.surface, ...SHADOW_SM }}
            >
              <Menu size={20} color={t.textSecondary} />
            </Pressable>
          </View>

          {/* ── Streak + Quick Stats Row ── */}
          {(streak > 0 || totalMeals > 0) && (
            <Animated.View entering={FadeInDown.duration(350).delay(50)} className="flex-row px-6 mt-4 gap-3">
              {streak > 0 && (
                <View
                  className="flex-row items-center px-3.5 py-2 rounded-2xl"
                  style={{ backgroundColor: '#fef3c7', ...SHADOW_SM }}
                >
                  <Flame size={16} color="#f59e0b" />
                  <Text className="text-sm font-sans-bold ml-1.5" style={{ color: '#92400e' }}>
                    {streak}
                  </Text>
                  <Text className="text-[11px] font-sans ml-1" style={{ color: '#a16207' }}>
                    dia{streak > 1 ? 's' : ''}
                  </Text>
                </View>
              )}
              {totalMeals > 0 && (
                <View
                  className="flex-row items-center px-3.5 py-2 rounded-2xl"
                  style={{ backgroundColor: loggedCount === totalMeals ? '#d1fae5' : t.surface, ...SHADOW_SM }}
                >
                  <Utensils size={14} color={loggedCount === totalMeals ? '#059669' : t.textSecondary} />
                  <Text
                    className="text-sm font-sans-bold ml-1.5"
                    style={{ color: loggedCount === totalMeals ? '#065f46' : t.text }}
                  >
                    {loggedCount}/{totalMeals}
                  </Text>
                </View>
              )}
              {chatUnread?.unread != null && chatUnread.unread > 0 && (
                <Pressable
                  onPress={() => router.push('/chat')}
                  className="flex-row items-center px-3.5 py-2 rounded-2xl"
                  style={{ backgroundColor: t.primary + '15' }}
                >
                  <MessageCircle size={14} color={t.primary} />
                  <Text className="text-sm font-sans-bold ml-1.5" style={{ color: t.primary }}>
                    {chatUnread.unread}
                  </Text>
                </Pressable>
              )}
            </Animated.View>
          )}
        </ExpoGradient>

        {/* ══════ URGENT: Pending questionnaires ══════ */}
        {pendingQ.length > 0 && (
          <Animated.View entering={FadeInDown.duration(350).delay(80)} className="px-5 mb-3">
            <Pressable onPress={() => router.push('/questionnaires')}>
              <View
                className="rounded-2xl px-4 py-3.5 flex-row items-center"
                style={{ backgroundColor: t.accent + '12', borderLeftWidth: 3, borderLeftColor: t.accent }}
              >
                <View className="h-9 w-9 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: t.accentLight }}>
                  <ClipboardList size={18} color={t.accent} />
                </View>
                <View className="flex-1">
                  <Text style={{ color: t.text }} className="text-[13px] font-sans-semibold">
                    {pendingQ.length} questionário{pendingQ.length > 1 ? 's' : ''} pendente{pendingQ.length > 1 ? 's' : ''}
                  </Text>
                  <Text style={{ color: t.textMuted }} className="text-[11px] font-sans mt-0.5">
                    Toque para responder
                  </Text>
                </View>
                <ChevronRight size={16} color={t.accent} />
              </View>
            </Pressable>
          </Animated.View>
        )}

        {/* ══════ DAILY PROGRESS: Diary + Water side-by-side ══════ */}
        <Animated.View entering={FadeInDown.duration(350).delay(120)} className="px-5 mb-3">
          <View className="flex-row gap-3">
            {/* Diary progress ring */}
            <Pressable onPress={() => router.push('/(tabs)/diary')} className="flex-1">
              <View
                className="rounded-2xl p-4 items-center"
                style={{ backgroundColor: t.surface, ...SHADOW_SM }}
              >
                <ProgressRing
                  pct={diaryPct}
                  size={64}
                  strokeWidth={5}
                  color={diaryPct >= 1 ? t.success : t.primary}
                  trackColor={t.borderLight}
                />
                <Text style={{ color: t.text }} className="text-sm font-sans-bold mt-3">Refeições</Text>
                <Text style={{ color: t.textMuted }} className="text-[11px] font-sans mt-0.5">
                  {totalMeals > 0
                    ? loggedCount === totalMeals ? 'Completo!' : `${totalMeals - loggedCount} pendente${totalMeals - loggedCount > 1 ? 's' : ''}`
                    : 'Sem plano'}
                </Text>
              </View>
            </Pressable>

            {/* Water progress ring */}
            <Pressable onPress={() => router.push('/water' as never)} className="flex-1">
              <View
                className="rounded-2xl p-4 items-center"
                style={{ backgroundColor: t.surface, ...SHADOW_SM }}
              >
                <ProgressRing
                  pct={waterPct}
                  size={64}
                  strokeWidth={5}
                  color={waterPct >= 1 ? t.success : t.info}
                  trackColor={t.borderLight}
                  label={<Droplets size={18} color={waterPct >= 1 ? t.success : t.info} />}
                />
                <Text style={{ color: t.text }} className="text-sm font-sans-bold mt-3">Água</Text>
                <Text style={{ color: t.textMuted }} className="text-[11px] font-sans mt-0.5">
                  {waterTotal > 0 ? `${fmtWater(waterTotal)} / ${fmtWater(waterGoal)}` : 'Toque para registrar'}
                </Text>
              </View>
            </Pressable>
          </View>
        </Animated.View>

        {/* ══════ ACTIVE GOALS ══════ */}
        {activeGoals.length > 0 && (
          <Animated.View entering={FadeInDown.duration(350).delay(180)} className="px-5 mb-3">
            <Pressable onPress={() => router.push('/goals')}>
              <View className="rounded-2xl p-4" style={{ backgroundColor: t.surface, ...SHADOW_SM }}>
                <View className="flex-row items-center justify-between mb-3.5">
                  <View className="flex-row items-center">
                    <View className="h-6 w-6 rounded-lg items-center justify-center" style={{ backgroundColor: t.success + '18' }}>
                      <Target size={13} color={t.success} />
                    </View>
                    <Text style={{ color: t.text }} className="text-[13px] font-sans-bold ml-2">
                      Metas ativas
                    </Text>
                  </View>
                  <ChevronRight size={14} color={t.textMuted} />
                </View>
                {activeGoals.map((goal: PortalGoal, i: number) => {
                  const progress = goalProgress(goal)
                  const pctText = `${Math.round(progress * 100)}%`
                  return (
                    <View key={goal.id} style={i > 0 ? { marginTop: 12 } : undefined}>
                      <View className="flex-row items-center justify-between mb-1.5">
                        <Text style={{ color: t.text }} className="text-[13px] font-sans-medium flex-1 mr-2" numberOfLines={1}>
                          {goal.title}
                        </Text>
                        <Text
                          className="text-[11px] font-sans-bold"
                          style={{ color: progress >= 1 ? t.success : t.primary }}
                        >
                          {pctText}
                        </Text>
                      </View>
                      <View className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: t.borderLight }}>
                        <View
                          className="h-2 rounded-full"
                          style={{ width: `${progress * 100}%`, backgroundColor: progress >= 1 ? t.success : t.primary }}
                        />
                      </View>
                      {goal.target_value != null && goal.current_value != null && goal.target_unit && (
                        <Text style={{ color: t.textMuted }} className="text-[10px] font-sans mt-1">
                          {goal.current_value}{goal.target_unit} de {goal.target_value}{goal.target_unit}
                        </Text>
                      )}
                    </View>
                  )
                })}
              </View>
            </Pressable>
          </Animated.View>
        )}

        {/* ══════ WEIGHT SPARKLINE ══════ */}
        <WeightSparkline evolution={evolution ?? []} t={t} />

        {/* ══════ NEXT APPOINTMENT ══════ */}
        {apt ? (
          <Animated.View entering={FadeInDown.duration(350).delay(320)} className="px-5 mb-3">
            <View className="rounded-2xl overflow-hidden" style={{ ...SHADOW_SM }}>
              <ExpoGradient
                colors={[t.primary, t.primary + 'cc']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="p-4"
              >
                <View className="flex-row items-center mb-2">
                  <Calendar size={13} color="#ffffffcc" />
                  <Text className="text-[10px] font-sans-bold uppercase tracking-widest ml-1.5" style={{ color: '#ffffffcc' }}>
                    Próxima consulta
                  </Text>
                </View>
                <Text className="text-xl font-sans-bold" style={{ color: '#ffffff' }}>
                  {fmtAppointment(apt.starts_at)}
                </Text>
                <Text className="text-xs font-sans mt-0.5 capitalize" style={{ color: '#ffffffbb' }}>
                  {fmtWeekday(apt.starts_at)}
                </Text>
                <View className="flex-row items-center mt-3">
                  {apt.type === 'online' ? (
                    <View className="flex-row items-center px-2.5 py-1 rounded-lg" style={{ backgroundColor: '#ffffff25' }}>
                      <Video size={12} color="#ffffff" />
                      <Text className="text-[11px] font-sans-medium ml-1" style={{ color: '#ffffff' }}>Online</Text>
                    </View>
                  ) : (
                    <View className="flex-row items-center px-2.5 py-1 rounded-lg" style={{ backgroundColor: '#ffffff25' }}>
                      <MapPin size={12} color="#ffffff" />
                      <Text className="text-[11px] font-sans-medium ml-1" style={{ color: '#ffffff' }}>Presencial</Text>
                    </View>
                  )}
                </View>
              </ExpoGradient>
            </View>
          </Animated.View>
        ) : null}

        {/* ══════ TIP OF THE DAY ══════ */}
        <TipOfTheDay t={t} />

        {/* ══════ EMPTY STATE ══════ */}
        {!hasAnyContent && !apt && (
          <Animated.View entering={FadeIn.duration(400)} className="px-5 mt-6 items-center">
            <View className="h-16 w-16 rounded-3xl items-center justify-center mb-4" style={{ backgroundColor: t.primaryLight }}>
              <Sparkles size={28} color={t.primary} />
            </View>
            <Text style={{ color: t.text }} className="text-lg font-sans-bold text-center">
              Bem-vindo ao AliaNutri!
            </Text>
            <Text style={{ color: t.textMuted }} className="text-sm font-sans text-center mt-2 leading-5 px-4">
              Seus dados aparecerão aqui conforme{'\n'}seu nutricionista atualizar seu plano.
            </Text>
          </Animated.View>
        )}
      </ScrollView>

      {/* ══════ DRAWER ══════ */}
      {drawerOpen && (
        <>
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            style={StyleSheet.absoluteFill}
          >
            <Pressable
              onPress={() => setDrawerOpen(false)}
              style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
            />
          </Animated.View>

          <Animated.View
            entering={SlideInLeft.duration(250)}
            exiting={SlideOutLeft.duration(200)}
            style={[StyleSheet.absoluteFill, { width: DRAWER_W }]}
          >
            <SafeAreaView
              style={{ flex: 1, backgroundColor: t.background }}
              edges={['top', 'bottom']}
            >
              <View className="px-5 pt-4 pb-2 flex-row items-center justify-between">
                <View>
                  <Text style={{ color: t.textMuted }} className="text-[11px] font-sans uppercase tracking-widest">Menu</Text>
                  <Text style={{ color: t.text }} className="text-lg font-sans-bold">{displayName}</Text>
                </View>
                <Pressable
                  onPress={() => setDrawerOpen(false)}
                  hitSlop={12}
                  className="h-9 w-9 rounded-xl items-center justify-center"
                  style={{ backgroundColor: t.surface }}
                >
                  <X size={18} color={t.textSecondary} />
                </Pressable>
              </View>

              <View className="h-px mx-5 my-2" style={{ backgroundColor: t.borderLight }} />

              <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
                <DrawerSection label="Diário">
                  <DrawerItem
                    icon={<ClipboardList size={18} color={t.accent} />}
                    iconBg={t.accentLight}
                    title="Questionários"
                    badge={pendingQ.length > 0 ? pendingQ.length : undefined}
                    t={t}
                    onPress={() => { setDrawerOpen(false); router.push('/questionnaires') }}
                  />
                  <DrawerItem
                    icon={<Droplets size={18} color={t.info} />}
                    iconBg="#e0f2fe"
                    title="Hidratação"
                    t={t}
                    onPress={() => { setDrawerOpen(false); router.push('/water' as never) }}
                  />
                  <DrawerItem
                    icon={<Heart size={18} color="#ec4899" />}
                    iconBg="#fce7f3"
                    title="Bem-estar"
                    t={t}
                    onPress={() => { setDrawerOpen(false); router.push('/wellness' as never) }}
                  />
                </DrawerSection>

                <DrawerSection label="Progresso">
                  <DrawerItem
                    icon={<Target size={18} color={t.success} />}
                    iconBg={t.success + '15'}
                    title="Metas"
                    t={t}
                    onPress={() => { setDrawerOpen(false); router.push('/goals') }}
                  />
                  <DrawerItem
                    icon={<Scale size={18} color={t.accent} />}
                    iconBg={t.accentLight}
                    title="Peso"
                    t={t}
                    onPress={() => { setDrawerOpen(false); router.push('/weight' as never) }}
                  />
                  <DrawerItem
                    icon={<Camera size={18} color={t.primary} />}
                    iconBg={t.primaryLight}
                    title="Fotos de progresso"
                    t={t}
                    onPress={() => { setDrawerOpen(false); router.push('/progress-photos' as never) }}
                  />
                </DrawerSection>

                <DrawerSection label="Comunicação">
                  <DrawerItem
                    icon={<MessageCircle size={18} color={t.primary} />}
                    iconBg={t.primaryLight}
                    title="Chat"
                    badge={chatUnread?.unread}
                    t={t}
                    onPress={() => { setDrawerOpen(false); router.push('/chat') }}
                  />
                  {canWrite && (
                    <DrawerItem
                      icon={<CalendarPlus size={18} color={t.primary} />}
                      iconBg={t.primaryLight}
                      title="Agendar consulta"
                      t={t}
                      onPress={() => { setDrawerOpen(false); router.push('/booking') }}
                    />
                  )}
                </DrawerSection>
              </ScrollView>
            </SafeAreaView>
          </Animated.View>
        </>
      )}
    </SafeAreaView>
  )
}

// ── Shadow helper ──

const SHADOW_SM = Platform.select({
  ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  android: { elevation: 2 },
  default: {},
}) as Record<string, unknown>

// ── Progress ring (SVG) ──

function ProgressRing({ pct, size, strokeWidth, color, trackColor, label }: {
  pct: number; size: number; strokeWidth: number; color: string; trackColor: string; label?: React.ReactNode
}) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const dash = circ * Math.min(pct, 1)

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <SvgCircle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={trackColor} strokeWidth={strokeWidth}
        />
        <SvgCircle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          rotation={-90} origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      {label ?? (
        <Text className="text-sm font-sans-bold" style={{ color }}>
          {Math.round(pct * 100)}%
        </Text>
      )}
    </View>
  )
}

// ── Tip of the day ──

function TipOfTheDay({ t }: { t: ReturnType<typeof useThemeColors> }) {
  const tip = useMemo(() => getTipOfTheDay(), [])
  return (
    <Animated.View entering={FadeInDown.duration(350).delay(400)} className="px-5 mb-3">
      <View
        className="rounded-2xl px-4 py-4 flex-row items-start"
        style={{ backgroundColor: t.primaryLight, ...SHADOW_SM }}
      >
        <View
          className="h-9 w-9 rounded-xl items-center justify-center mr-3"
          style={{ backgroundColor: t.primary + '18' }}
        >
          <Text className="text-base">{tip.emoji}</Text>
        </View>
        <View className="flex-1">
          <Text style={{ color: t.primary }} className="text-[10px] font-sans-bold uppercase tracking-wider mb-1">
            Dica do dia
          </Text>
          <Text style={{ color: t.text }} className="text-[13px] font-sans leading-[19px]">
            {tip.text}
          </Text>
        </View>
      </View>
    </Animated.View>
  )
}

// ── Weight sparkline card ──

function WeightSparkline({ evolution, t }: {
  evolution: PortalEvolution[]
  t: ReturnType<typeof useThemeColors>
}) {
  const points = evolution.filter((e) => e.weight_kg !== null) as (PortalEvolution & { weight_kg: number })[]
  if (points.length < 2) return null

  const W = SCREEN_W - 40 - 32
  const H = 72
  const padX = 4
  const padY = 10
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
  const fillPoints = `${padX},${padY + chartH} ${polyPoints} ${padX + chartW},${padY + chartH}`
  const first = points[0].weight_kg
  const last = points[points.length - 1].weight_kg
  const diff = last - first
  const diffStr = `${diff > 0 ? '+' : ''}${diff.toFixed(1).replace('.', ',')} kg`
  const trendColor = diff <= 0 ? t.success : t.warning
  const TrendIcon = diff <= 0 ? TrendingDown : TrendingUp

  return (
    <Animated.View entering={FadeInDown.duration(350).delay(240)} className="px-5 mb-3">
      <Pressable onPress={() => router.push('/(tabs)/profile')}>
        <View className="rounded-2xl p-4" style={{ backgroundColor: t.surface, ...SHADOW_SM }}>
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <View className="h-6 w-6 rounded-lg items-center justify-center" style={{ backgroundColor: trendColor + '18' }}>
                <TrendIcon size={13} color={trendColor} />
              </View>
              <Text style={{ color: t.text }} className="text-[13px] font-sans-bold ml-2">
                Evolução
              </Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-xs font-sans-bold mr-1" style={{ color: trendColor }}>
                {diffStr}
              </Text>
              <ChevronRight size={14} color={t.textMuted} />
            </View>
          </View>
          <View className="flex-row items-baseline justify-between mb-1">
            <Text style={{ color: t.text }} className="text-lg font-sans-bold">
              {last.toFixed(1).replace('.', ',')}
              <Text className="text-xs font-sans" style={{ color: t.textMuted }}> kg</Text>
            </Text>
            <Text style={{ color: t.textMuted }} className="text-[10px] font-sans">
              {points.length} medições
            </Text>
          </View>
          <Svg width={W} height={H}>
            <Defs>
              <LinearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={t.primary} stopOpacity="0.15" />
                <Stop offset="1" stopColor={t.primary} stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <Polyline points={fillPoints} fill="url(#fill)" stroke="none" />
            <Polyline
              points={polyPoints}
              fill="none"
              stroke={t.primary}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <SvgCircle
              cx={coords[coords.length - 1].x}
              cy={coords[coords.length - 1].y}
              r={4}
              fill="#ffffff"
              stroke={t.primary}
              strokeWidth={2.5}
            />
          </Svg>
        </View>
      </Pressable>
    </Animated.View>
  )
}

// ── Drawer section ──

function DrawerSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="mb-3">
      <Text className="text-[10px] font-sans-bold uppercase tracking-widest px-3 mb-1.5" style={{ color: '#a8a29e' }}>
        {label}
      </Text>
      {children}
    </View>
  )
}

// ── Drawer item ──

function DrawerItem({ icon, iconBg, title, badge, t, onPress }: {
  icon: React.ReactNode
  iconBg: string
  title: string
  badge?: number
  t: ReturnType<typeof useThemeColors>
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 px-3 py-2.5 rounded-xl"
      style={({ pressed }) => ({ backgroundColor: pressed ? t.surfacePressed : 'transparent' })}
    >
      <View className="h-9 w-9 rounded-xl items-center justify-center" style={{ backgroundColor: iconBg }}>
        {icon}
      </View>
      <Text style={{ color: t.text }} className="text-[13px] font-sans-medium flex-1">{title}</Text>
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
        <ChevronRight size={14} color={t.textMuted} />
      )}
    </Pressable>
  )
}
