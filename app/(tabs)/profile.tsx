import { useState } from 'react'
import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  LogOut, User as UserIcon, Ruler, Weight, Phone, Mail,
  Palette, Settings, X, Calendar, TrendingDown,
} from 'lucide-react-native'
import Svg, { Polyline, Circle as SvgCircle, Line, Text as SvgText } from 'react-native-svg'
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated'
import { router } from 'expo-router'
import { useAuthStore } from '../../src/stores/auth'
import { usePortalProfile, useEvolution } from '../../src/hooks/usePortal'
import type { PortalEvolution } from '../../src/types/portal'
import { useThemeColors, useTheme, useThemeStore } from '../../src/stores/theme'
import { THEME_LIST, type AppTheme } from '../../src/theme/themes'

export default function ProfileScreen() {
  const t = useThemeColors()
  const theme = useTheme()
  const setTheme = useThemeStore((s) => s.setTheme)
  const logout = useAuthStore((s) => s.logout)
  const { data: profile, isLoading, refetch, isRefetching } = usePortalProfile()
  const [settingsOpen, setSettingsOpen] = useState(false)

  function handleLogout() {
    Alert.alert('Sair', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: () => {
          logout()
          router.replace('/login')
        },
      },
    ])
  }

  // Build info rows from profile
  const infoRows: { icon: React.ReactNode; label: string; value: string }[] = []
  if (profile?.phone) infoRows.push({ icon: <Phone size={16} color={t.textSecondary} />, label: 'Telefone', value: profile.phone })
  if (profile?.email) infoRows.push({ icon: <Mail size={16} color={t.textSecondary} />, label: 'E-mail', value: profile.email })
  if (profile?.height_cm) infoRows.push({ icon: <Ruler size={16} color={t.textSecondary} />, label: 'Altura', value: `${(profile.height_cm / 100).toFixed(2).replace('.', ',')} m` })
  if (profile?.weight_kg) infoRows.push({ icon: <Weight size={16} color={t.textSecondary} />, label: 'Peso', value: `${profile.weight_kg.toFixed(1).replace('.', ',')} kg` })
  if (profile?.birth_date) infoRows.push({ icon: <Calendar size={16} color={t.textSecondary} />, label: 'Nascimento', value: new Date(profile.birth_date + 'T00:00:00').toLocaleDateString('pt-BR') })

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
      {/* ── Header ── */}
      <View className="px-5 pt-4 pb-2 flex-row items-center justify-between">
        <Text style={{ color: t.text }} className="text-xl font-sans-bold">Perfil</Text>
        <Pressable
          onPress={() => setSettingsOpen(!settingsOpen)}
          hitSlop={12}
          className="h-9 w-9 rounded-xl items-center justify-center"
          style={{ backgroundColor: settingsOpen ? t.primary : t.surface }}
        >
          {settingsOpen ? (
            <X size={16} color={t.primaryText} />
          ) : (
            <Settings size={16} color={t.textSecondary} />
          )}
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={t.primary} />}
      >
        {/* ── Settings panel (collapsible) ── */}
        {settingsOpen && (
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            layout={LinearTransition.duration(200)}
            className="px-5 mb-4"
          >
            <View className="rounded-2xl overflow-hidden" style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.borderLight }}>
              {/* Theme picker */}
              <View className="px-4 pt-4 pb-3">
                <View className="flex-row items-center gap-2 mb-3">
                  <Palette size={14} color={t.textSecondary} />
                  <Text style={{ color: t.textSecondary }} className="text-xs font-sans-semibold uppercase tracking-wider">Tema</Text>
                </View>
                <View className="flex-row gap-2">
                  {THEME_LIST.map((th: AppTheme) => (
                    <Pressable
                      key={th.id}
                      onPress={() => setTheme(th.id)}
                      className="flex-1 py-2.5 rounded-xl items-center"
                      style={{
                        backgroundColor: theme.id === th.id ? t.primary : t.surfacePressed,
                        borderWidth: 1,
                        borderColor: theme.id === th.id ? t.primary : t.borderLight,
                      }}
                    >
                      <Text className="text-base mb-0.5">{th.emoji}</Text>
                      <Text
                        className="text-[10px] font-sans-medium"
                        style={{ color: theme.id === th.id ? t.primaryText : t.textSecondary }}
                      >
                        {th.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Divider */}
              <View className="mx-4" style={{ height: 1, backgroundColor: t.borderLight }} />

              {/* Logout */}
              <Pressable onPress={handleLogout} className="flex-row items-center gap-3 px-4 py-3.5">
                <LogOut size={16} color={t.error} />
                <Text style={{ color: t.error }} className="text-sm font-sans-medium flex-1">Sair da conta</Text>
              </Pressable>
            </View>

            <Text style={{ color: t.textMuted }} className="text-[10px] text-center mt-2 font-sans">
              AliaPatient v1.0.0
            </Text>
          </Animated.View>
        )}

        {/* ── Content ── */}
        {isLoading ? (
          <View className="items-center py-20">
            <ActivityIndicator size="large" color={t.primary} />
          </View>
        ) : (
          <>
            {/* Avatar + name */}
            <View className="items-center mb-6 mt-2">
              <View className="h-20 w-20 rounded-full items-center justify-center mb-3" style={{ backgroundColor: t.primaryLight }}>
                <UserIcon size={36} color={t.primary} />
              </View>
              <Text style={{ color: t.text }} className="text-lg font-sans-semibold">
                {profile?.preferred_name || profile?.name || 'Paciente'}
              </Text>
            </View>

            {/* Info card (consolidated) */}
            {infoRows.length > 0 && (
              <View className="px-5 mb-4">
                <View className="rounded-2xl overflow-hidden" style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.borderLight }}>
                  {infoRows.map((row, i) => (
                    <View key={i}>
                      {i > 0 && <View className="mx-4" style={{ height: 1, backgroundColor: t.borderLight }} />}
                      <View className="flex-row items-center gap-3 px-4 py-3">
                        {row.icon}
                        <View className="flex-1">
                          <Text style={{ color: t.textMuted }} className="text-[10px] font-sans">{row.label}</Text>
                          <Text style={{ color: t.text }} className="text-[13px] font-sans-medium">{row.value}</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Evolution chart */}
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

  const W = 320
  const H = 140
  const padX = 36
  const padTop = 16
  const padBot = 24 // space for x-axis labels
  const chartW = W - padX * 2
  const chartH = H - padTop - padBot

  const weights = points.map((p) => p.weight_kg)
  const minW = Math.min(...weights) - 1
  const maxW = Math.max(...weights) + 1
  const rangeW = maxW - minW || 1

  const coords = points.map((p, i) => ({
    x: padX + (i / (points.length - 1)) * chartW,
    y: padTop + chartH - ((p.weight_kg - minW) / rangeW) * chartH,
  }))

  const polyPoints = coords.map((c) => `${c.x},${c.y}`).join(' ')

  const first = points[0].weight_kg
  const last = points[points.length - 1].weight_kg
  const diff = last - first
  const diffStr = `${diff > 0 ? '+' : ''}${diff.toFixed(1).replace('.', ',')} kg`

  return (
    <View className="px-5 mt-6">
      <View className="rounded-2xl p-4" style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.borderLight }}>
        <View className="flex-row items-center gap-2 mb-3">
          <TrendingDown size={16} color={t.primary} />
          <Text style={{ color: t.text }} className="text-sm font-sans-semibold">Evolução de peso</Text>
          <Text className="text-xs font-sans-medium ml-auto" style={{ color: diff <= 0 ? t.success : t.warning }}>
            {diffStr}
          </Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Svg width={W} height={H}>
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
              const y = padTop + chartH - frac * chartH
              return (
                <Line key={frac} x1={padX} y1={y} x2={W - padX} y2={y} stroke={t.borderLight} strokeWidth={1} />
              )
            })}
            {/* Y labels */}
            <SvgText x={4} y={padTop + 4} fontSize={9} fill={t.textMuted}>{maxW.toFixed(0)}</SvgText>
            <SvgText x={4} y={padTop + chartH + 4} fontSize={9} fill={t.textMuted}>{minW.toFixed(0)}</SvgText>
            {/* Line */}
            <Polyline points={polyPoints} fill="none" stroke={t.primary} strokeWidth={2} strokeLinejoin="round" />
            {/* Dots */}
            {coords.map((c, i) => (
              <SvgCircle key={i} cx={c.x} cy={c.y} r={3} fill={t.primary} />
            ))}
            {/* X labels (first and last date) */}
            <SvgText x={padX} y={H - 4} fontSize={9} fill={t.textMuted} textAnchor="start">
              {fmtShort(points[0].evaluation_date)}
            </SvgText>
            <SvgText x={W - padX} y={H - 4} fontSize={9} fill={t.textMuted} textAnchor="end">
              {fmtShort(points[points.length - 1].evaluation_date)}
            </SvgText>
          </Svg>
        </View>
      </View>
    </View>
  )
}

function fmtShort(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

