import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl, Platform, Dimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  Ruler, Weight, Phone, Mail,
  Settings, Calendar, TrendingDown, TrendingUp,
} from 'lucide-react-native'
import Svg, { Polyline, Circle as SvgCircle, Defs, LinearGradient, Stop } from 'react-native-svg'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { LinearGradient as ExpoGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { usePortalProfile, useEvolution } from '../../src/hooks/usePortal'
import type { PortalEvolution } from '../../src/types/portal'
import { useThemeColors } from '../../src/stores/theme'

const { width: SCREEN_W } = Dimensions.get('window')

const SHADOW_SM = Platform.select({
  ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  android: { elevation: 2 },
  default: {},
}) as Record<string, unknown>

export default function ProfileScreen() {
  const t = useThemeColors()
  const { data: profile, isLoading, refetch, isRefetching } = usePortalProfile()

  const infoRows: { icon: React.ReactNode; label: string; value: string }[] = []
  if (profile?.phone) infoRows.push({ icon: <Phone size={15} color={t.primary} />, label: 'Telefone', value: profile.phone })
  if (profile?.email) infoRows.push({ icon: <Mail size={15} color={t.primary} />, label: 'E-mail', value: profile.email })
  if (profile?.height_cm) infoRows.push({ icon: <Ruler size={15} color={t.primary} />, label: 'Altura', value: `${(profile.height_cm / 100).toFixed(2).replace('.', ',')} m` })
  if (profile?.weight_kg) infoRows.push({ icon: <Weight size={15} color={t.primary} />, label: 'Peso', value: `${profile.weight_kg.toFixed(1).replace('.', ',')} kg` })
  if (profile?.birth_date) infoRows.push({ icon: <Calendar size={15} color={t.primary} />, label: 'Nascimento', value: new Date(profile.birth_date + 'T00:00:00').toLocaleDateString('pt-BR') })

  const displayName = profile?.preferred_name || profile?.name || 'Paciente'
  const initials = displayName.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={t.primary} />}
      >
        {isLoading ? (
          <View className="items-center py-20">
            <ActivityIndicator size="large" color={t.primary} />
          </View>
        ) : (
          <>
            {/* ══════ HERO HEADER ══════ */}
            <ExpoGradient
              colors={[t.primary + '20', t.background]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={{ paddingBottom: 24 }}
            >
              <View className="flex-row items-center justify-end px-5 pt-3 mb-2">
                <Pressable
                  onPress={() => router.push('/settings')}
                  hitSlop={12}
                  className="h-10 w-10 rounded-2xl items-center justify-center"
                  style={{ backgroundColor: t.surface, ...SHADOW_SM }}
                >
                  <Settings size={16} color={t.textSecondary} />
                </Pressable>
              </View>

              <Animated.View entering={FadeIn.duration(400)} className="items-center">
                <ExpoGradient
                  colors={[t.primary, t.primary + 'cc']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className="h-20 w-20 rounded-3xl items-center justify-center mb-3"
                  style={SHADOW_SM}
                >
                  <Text className="text-2xl font-sans-bold" style={{ color: '#ffffff' }}>{initials}</Text>
                </ExpoGradient>
                <Text style={{ color: t.text }} className="text-xl font-sans-bold">{displayName}</Text>
              </Animated.View>
            </ExpoGradient>

            {/* ══════ INFO CARD ══════ */}
            {infoRows.length > 0 && (
              <Animated.View entering={FadeInDown.duration(350).delay(80)} className="px-5 mb-4">
                <View className="rounded-2xl overflow-hidden" style={{ backgroundColor: t.surface, ...SHADOW_SM }}>
                  {infoRows.map((row, i) => (
                    <View key={i}>
                      {i > 0 && <View className="mx-4" style={{ height: 1, backgroundColor: t.borderLight }} />}
                      <View className="flex-row items-center gap-3 px-4 py-3.5">
                        <View className="h-8 w-8 rounded-xl items-center justify-center" style={{ backgroundColor: t.primary + '12' }}>
                          {row.icon}
                        </View>
                        <View className="flex-1">
                          <Text style={{ color: t.textMuted }} className="text-[10px] font-sans uppercase tracking-wider">{row.label}</Text>
                          <Text style={{ color: t.text }} className="text-[13px] font-sans-medium mt-0.5">{row.value}</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </Animated.View>
            )}

            {/* ══════ EVOLUTION CHART ══════ */}
            <WeightChart />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function WeightChart() {
  const t = useThemeColors()
  const { data: evolution } = useEvolution()

  const points = (evolution ?? []).filter((e) => e.weight_kg !== null) as (PortalEvolution & { weight_kg: number })[]
  if (points.length < 2) return null

  const W = SCREEN_W - 40 - 32
  const H = 100
  const padX = 4
  const padTop = 10
  const padBot = 10
  const chartW = W - padX * 2
  const chartH = H - padTop - padBot

  const weights = points.map((p) => p.weight_kg)
  const minW = Math.min(...weights) - 0.5
  const maxW = Math.max(...weights) + 0.5
  const rangeW = maxW - minW || 1

  const coords = points.map((p, i) => ({
    x: padX + (i / (points.length - 1)) * chartW,
    y: padTop + chartH - ((p.weight_kg - minW) / rangeW) * chartH,
  }))

  const polyPoints = coords.map((c) => `${c.x},${c.y}`).join(' ')
  const fillPoints = `${padX},${padTop + chartH} ${polyPoints} ${padX + chartW},${padTop + chartH}`

  const first = points[0].weight_kg
  const last = points[points.length - 1].weight_kg
  const diff = last - first
  const diffStr = `${diff > 0 ? '+' : ''}${diff.toFixed(1).replace('.', ',')} kg`
  const trendColor = diff <= 0 ? t.success : t.warning
  const TrendIcon = diff <= 0 ? TrendingDown : TrendingUp

  return (
    <Animated.View entering={FadeInDown.duration(350).delay(160)} className="px-5 mb-4">
      <View className="rounded-2xl p-4" style={{ backgroundColor: t.surface, ...SHADOW_SM }}>
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <View className="h-7 w-7 rounded-lg items-center justify-center" style={{ backgroundColor: trendColor + '18' }}>
              <TrendIcon size={14} color={trendColor} />
            </View>
            <Text style={{ color: t.text }} className="text-[13px] font-sans-bold ml-2">
              Evolução de peso
            </Text>
          </View>
          <Text className="text-xs font-sans-bold" style={{ color: trendColor }}>{diffStr}</Text>
        </View>

        <View className="flex-row items-baseline justify-between mb-2">
          <Text style={{ color: t.text }} className="text-xl font-sans-bold">
            {last.toFixed(1).replace('.', ',')}
            <Text className="text-xs font-sans" style={{ color: t.textMuted }}> kg</Text>
          </Text>
          <Text style={{ color: t.textMuted }} className="text-[10px] font-sans">
            {fmtShort(points[0].evaluation_date)} — {fmtShort(points[points.length - 1].evaluation_date)}
          </Text>
        </View>

        <Svg width={W} height={H}>
          <Defs>
            <LinearGradient id="profileFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={t.primary} stopOpacity="0.15" />
              <Stop offset="1" stopColor={t.primary} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Polyline points={fillPoints} fill="url(#profileFill)" stroke="none" />
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
    </Animated.View>
  )
}

function fmtShort(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

