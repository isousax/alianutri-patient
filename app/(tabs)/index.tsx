import { useState, useMemo } from 'react'
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import {
  Flame, Calendar, Utensils, BookOpen, Check, Circle,
  ChevronRight, Menu, RefreshCw, AlertCircle, Lightbulb,
} from 'lucide-react-native'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { Image } from 'expo-image'
import { usePortalHome, useDiaryToday, useDiaryStreak } from '../../src/hooks/usePortal'
import { useAuthStore } from '../../src/stores/auth'
import { useThemeColors, useTheme } from '../../src/stores/theme'
import MenuSheet from '../../src/components/MenuSheet'

// ── daily tips ──

const TIPS = [
  'Beba pelo menos 2L de água por dia.',
  'Mastigue devagar — leva 20 min pro cérebro sentir saciedade.',
  'Inclua uma porção de verduras em cada refeição.',
  'Comer de 3 em 3 horas ajuda a manter o metabolismo ativo.',
  'Evite usar o celular durante as refeições.',
  'Frutas são ótimas opções para os lanches intermediários.',
  'Durma bem! O sono regula hormônios da fome.',
  'Planeje suas refeições da semana — isso evita escolhas impulsivas.',
  'Prefira alimentos in natura e minimamente processados.',
  'Pratique atividade física que te dê prazer.',
  'Cozinhar em casa é um ato de cuidado consigo mesmo.',
  'Não pule o café da manhã — ele dá energia pro seu dia.',
  'Vegetais coloridos = mais variedade de nutrientes.',
  'Chás são ótimos aliados para hidratação.',
]

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function dayOfYear(): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  return Math.floor((now.getTime() - start.getTime()) / 86400000)
}

function fmtAppointment(iso: string): string {
  const d = new Date(iso)
  const day = d.getDate().toString().padStart(2, '0')
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  return `${day} ${months[d.getMonth()]}. às ${h}:${m}`
}

// ── main screen ──

export default function HomeScreen() {
  const t = useThemeColors()
  const theme = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)

  const { data, isLoading, error, refetch, isRefetching } = usePortalHome()
  const { data: diary } = useDiaryToday(todayStr())
  const { data: streakData } = useDiaryStreak()
  const patient = useAuthStore((s) => s.patient)

  const dailyTip = useMemo(() => TIPS[dayOfYear() % TIPS.length], [])

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

  const displayName = patient?.preferred_name || data.patient.name?.split(' ')[0] || 'Paciente'
  const streak = streakData?.streak ?? 0
  const meals = diary?.meals ?? []
  const totalMeals = meals.length
  const loggedCount = meals.filter((m) => m.entry !== null).length
  const allDone = totalMeals > 0 && loggedCount === totalMeals

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={t.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <Animated.View entering={FadeIn.duration(400)} className="px-6 pt-5 pb-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3 flex-1">
              <View
                style={{ backgroundColor: t.primaryLight, width: 48, height: 48, borderRadius: 24 }}
                className="items-center justify-center"
              >
                {patient?.photo_url ? (
                  <Image source={{ uri: patient.photo_url }} style={{ width: 48, height: 48, borderRadius: 24 }} />
                ) : (
                  <Text style={{ color: t.primary, fontSize: 20, fontFamily: 'Inter_700Bold' }}>
                    {displayName[0]?.toUpperCase()}
                  </Text>
                )}
              </View>
              <View className="flex-1">
                <Text style={{ color: t.textMuted }} className="text-sm font-sans">{getGreeting()},</Text>
                <Text style={{ color: t.text }} className="text-xl font-sans-bold" numberOfLines={1}>
                  {displayName}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => setMenuOpen(true)}
              hitSlop={12}
              className="p-2 rounded-xl"
              style={{ backgroundColor: t.surface }}
            >
              <Menu size={22} color={t.textSecondary} />
            </Pressable>
          </View>
        </Animated.View>

        {/* ── Streak banner ── */}
        {streak > 0 && (
          <Animated.View entering={FadeInDown.duration(400).delay(100)} className="px-6 pb-4">
            <View
              className="flex-row items-center p-4 rounded-2xl"
              style={{ backgroundColor: t.accentLight }}
            >
              <View
                className="h-11 w-11 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: t.accent + '20' }}
              >
                <Flame size={22} color={t.accent} />
              </View>
              <View className="flex-1">
                <Text style={{ color: t.text }} className="text-base font-sans-bold">
                  {streak} {streak === 1 ? 'dia' : 'dias'} de sequência!
                </Text>
                <Text style={{ color: t.textSecondary }} className="text-xs font-sans mt-0.5">
                  {streak < 3 ? 'Continue registrando!' : streak < 7 ? 'Ótimo ritmo!' : 'Incrível! Você é dedicado(a)!'}
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* ── Welcome card (no meal plan yet) ── */}
        {totalMeals === 0 && !data.active_meal_plan && (
          <Animated.View entering={FadeInDown.duration(400).delay(100)} className="px-6 pb-4">
            <View
              className="p-5 rounded-2xl"
              style={{ backgroundColor: t.primaryLight, borderWidth: 1, borderColor: t.primaryMuted }}
            >
              <Text style={{ color: t.primary }} className="text-base font-sans-bold mb-1">
                Bem-vindo(a)!
              </Text>
              <Text style={{ color: t.textSecondary, lineHeight: 20 }} className="text-sm font-sans">
                Assim que seu nutricionista publicar seu plano alimentar, ele vai aparecer aqui para você acompanhar o dia a dia.
              </Text>
            </View>
          </Animated.View>
        )}

        {/* ── Today's diary progress ── */}
        {totalMeals > 0 && (
          <Animated.View entering={FadeInDown.duration(400).delay(200)} className="px-6 pb-4">
            <Pressable
              onPress={() => router.push('/(tabs)/diary')}
              className="rounded-2xl p-5"
              style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.borderLight }}
            >
              <View className="flex-row items-center justify-between mb-4">
                <Text style={{ color: t.text }} className="text-base font-sans-semibold">Hoje</Text>
                <View className="flex-row items-center gap-1">
                  <Text style={{ color: allDone ? t.success : t.primary }} className="text-xs font-sans-semibold">
                    {allDone ? 'Completo!' : `${loggedCount}/${totalMeals}`}
                  </Text>
                  <ChevronRight size={14} color={t.textMuted} />
                </View>
              </View>

              {/* Progress bar */}
              <View className="rounded-full overflow-hidden mb-4" style={{ height: 6, backgroundColor: t.border }}>
                <Animated.View
                  entering={FadeIn.duration(600)}
                  style={{
                    height: '100%',
                    borderRadius: 99,
                    width: `${(loggedCount / totalMeals) * 100}%`,
                    backgroundColor: allDone ? t.success : t.primary,
                  }}
                />
              </View>

              {/* Meal dots */}
              <View className="flex-row flex-wrap gap-y-2 gap-x-4">
                {meals.map((meal, i) => {
                  const isLogged = !!meal.entry
                  return (
                    <View key={i} className="flex-row items-center gap-2">
                      {isLogged ? (
                        <View style={{ backgroundColor: t.primary + '20', borderRadius: 10, padding: 2 }}>
                          <Check size={12} color={t.primary} />
                        </View>
                      ) : (
                        <Circle size={16} color={t.border} />
                      )}
                      <Text
                        className="text-xs font-sans"
                        style={{ color: isLogged ? t.primary : t.textMuted }}
                        numberOfLines={1}
                      >
                        {meal.meal_name}
                      </Text>
                    </View>
                  )
                })}
              </View>
            </Pressable>
          </Animated.View>
        )}

        {/* ── Quick actions ── */}
        <Animated.View entering={FadeInDown.duration(400).delay(300)} className="px-6 pb-4">
          <View className="flex-row gap-3">
            <Pressable
              onPress={() => router.push('/(tabs)/meal-plan')}
              className="flex-1 p-4 rounded-2xl"
              style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.borderLight }}
            >
              <View
                className="h-10 w-10 rounded-xl items-center justify-center mb-3"
                style={{ backgroundColor: t.primaryLight }}
              >
                <Utensils size={18} color={t.primary} />
              </View>
              <Text style={{ color: t.text }} className="text-sm font-sans-semibold">Plano</Text>
              <Text style={{ color: t.textMuted }} className="text-[11px] font-sans mt-0.5" numberOfLines={1}>
                {data.active_meal_plan?.name ?? 'Nenhum ativo'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.push('/(tabs)/diary')}
              className="flex-1 p-4 rounded-2xl"
              style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.borderLight }}
            >
              <View
                className="h-10 w-10 rounded-xl items-center justify-center mb-3"
                style={{ backgroundColor: t.accentLight }}
              >
                <BookOpen size={18} color={t.accent} />
              </View>
              <Text style={{ color: t.text }} className="text-sm font-sans-semibold">Diário</Text>
              <Text style={{ color: t.textMuted }} className="text-[11px] font-sans mt-0.5">
                Registrar refeição
              </Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* ── Next appointment ── */}
        {data.next_appointment && (
          <Animated.View entering={FadeInDown.duration(400).delay(400)} className="px-6 pb-4">
            <View
              className="flex-row items-center p-4 rounded-2xl"
              style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.borderLight }}
            >
              <View
                className="h-11 w-11 rounded-xl items-center justify-center mr-3"
                style={{ backgroundColor: '#eff6ff' }}
              >
                <Calendar size={20} color="#2563eb" />
              </View>
              <View className="flex-1">
                <Text style={{ color: t.textSecondary }} className="text-xs font-sans">Próxima consulta</Text>
                <Text style={{ color: t.text }} className="text-sm font-sans-semibold mt-0.5">
                  {fmtAppointment(data.next_appointment.starts_at)}
                </Text>
              </View>
              <View className="px-2.5 py-1 rounded-full" style={{ backgroundColor: theme.dark ? '#1e3a5f' : '#dbeafe' }}>
                <Text className="text-[10px] font-sans-medium" style={{ color: '#2563eb' }}>
                  {data.next_appointment.type === 'online' ? 'Online' : 'Presencial'}
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* ── Daily tip ── */}
        <Animated.View entering={FadeInDown.duration(400).delay(500)} className="px-6">
          <View
            className="p-4 rounded-2xl"
            style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.borderLight }}
          >
            <View className="flex-row items-center gap-2 mb-2">
              <Lightbulb size={14} color={t.accent} />
              <Text style={{ color: t.accent }} className="text-xs font-sans-semibold uppercase tracking-wider">
                Dica do dia
              </Text>
            </View>
            <Text style={{ color: t.textSecondary, lineHeight: 20 }} className="text-sm font-sans">
              {dailyTip}
            </Text>
          </View>
        </Animated.View>
      </ScrollView>

      <MenuSheet visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </SafeAreaView>
  )
}
