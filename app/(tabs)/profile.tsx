import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LogOut, User as UserIcon, Ruler, Weight, Phone, Mail, TrendingDown, Palette } from 'lucide-react-native'
import Svg, { Polyline, Circle as SvgCircle, Line, Text as SvgText } from 'react-native-svg'
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top']}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={t.primary} />}>
        {/* Header */}
        <View className="px-5 pt-4 pb-6">
          <Text style={{ color: t.text }} className="text-xl font-sans-bold">Perfil</Text>
        </View>

        {isLoading ? (
          <View className="items-center py-20">
            <ActivityIndicator size="large" color={t.primary} />
          </View>
        ) : profile ? (
          <>
            {/* Avatar + name */}
            <View className="items-center mb-6">
              <View className="h-20 w-20 rounded-full items-center justify-center mb-3" style={{ backgroundColor: t.primaryLight }}>
                <UserIcon size={36} color={t.primary} />
              </View>
              <Text style={{ color: t.text }} className="text-lg font-sans-semibold">
                {profile.preferred_name || profile.name}
              </Text>
            </View>

            {/* Info cards */}
            <View className="px-5 gap-2">
              {profile.phone ? (
                <InfoRow icon={<Phone size={18} color={t.textSecondary} />} label="Telefone" value={profile.phone} t={t} />
              ) : null}
              {profile.email ? (
                <InfoRow icon={<Mail size={18} color={t.textSecondary} />} label="E-mail" value={profile.email} t={t} />
              ) : null}
              {profile.height_cm ? (
                <InfoRow icon={<Ruler size={18} color={t.textSecondary} />} label="Altura" value={`${(profile.height_cm / 100).toFixed(2).replace('.', ',')} m`} t={t} />
              ) : null}
              {profile.weight_kg ? (
                <InfoRow icon={<Weight size={18} color={t.textSecondary} />} label="Peso" value={`${profile.weight_kg.toFixed(1).replace('.', ',')} kg`} t={t} />
              ) : null}
              {profile.birth_date ? (
                <InfoRow icon={<UserIcon size={18} color={t.textSecondary} />} label="Nascimento" value={new Date(profile.birth_date + 'T00:00:00').toLocaleDateString('pt-BR')} t={t} />
              ) : null}
            </View>
          </>
        ) : (
          <View className="items-center mb-6">
            <View className="h-20 w-20 rounded-full items-center justify-center mb-3" style={{ backgroundColor: t.primaryLight }}>
              <UserIcon size={36} color={t.primary} />
            </View>
            <Text style={{ color: t.text }} className="text-lg font-sans-semibold">Paciente</Text>
          </View>
        )}

        {/* Evolution chart */}
        <WeightChart />

        {/* Theme picker */}
        <View className="px-5 mt-6">
          <View className="flex-row items-center gap-2 mb-3">
            <Palette size={16} color={t.textSecondary} />
            <Text style={{ color: t.textSecondary }} className="text-sm font-sans-semibold">Tema</Text>
          </View>
          <View className="flex-row gap-2">
            {THEME_LIST.map((th: AppTheme) => (
              <Pressable
                key={th.id}
                onPress={() => setTheme(th.id)}
                className="flex-1 py-3 rounded-xl items-center"
                style={{
                  backgroundColor: theme.id === th.id ? t.primary : t.surface,
                  borderWidth: 1,
                  borderColor: theme.id === th.id ? t.primary : t.borderLight,
                }}
              >
                <Text className="text-base mb-0.5">{th.emoji}</Text>
                <Text
                  className="text-[11px] font-sans-medium"
                  style={{ color: theme.id === th.id ? t.primaryText : t.textSecondary }}
                >
                  {th.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Logout */}
        <View className="px-5 mt-6">
          <Pressable
            onPress={handleLogout}
            className="flex-row items-center gap-3 rounded-2xl px-4 py-3.5"
            style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.borderLight }}
          >
            <LogOut size={18} color={t.error} />
            <Text style={{ color: t.error }} className="text-sm font-sans-medium flex-1">Sair</Text>
          </Pressable>
        </View>

        <Text style={{ color: t.textMuted }} className="text-[10px] text-center mt-8 font-sans">
          AliaPatient v1.0.0
        </Text>
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

function InfoRow({ icon, label, value, t }: { icon: React.ReactNode; label: string; value: string; t: ReturnType<typeof useThemeColors> }) {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl px-4 py-3.5" style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.borderLight }}>
      {icon}
      <View className="flex-1">
        <Text style={{ color: t.textMuted }} className="text-[11px] font-sans">{label}</Text>
        <Text style={{ color: t.text }} className="text-sm font-sans-medium">{value}</Text>
      </View>
    </View>
  )
}
