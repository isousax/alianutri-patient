import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LogOut, User as UserIcon, Ruler, Weight, Phone, Mail, TrendingDown } from 'lucide-react-native'
import Svg, { Polyline, Circle as SvgCircle, Line, Text as SvgText } from 'react-native-svg'
import { router } from 'expo-router'
import { useAuthStore } from '../../src/stores/auth'
import { usePortalProfile, useEvolution } from '../../src/hooks/usePortal'
import type { PortalEvolution } from '../../src/types/portal'
import { colors } from '../../src/theme/colors'

export default function ProfileScreen() {
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
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand[600]} />}>
        {/* Header */}
        <View className="px-5 pt-4 pb-6">
          <Text className="text-xl font-sans-bold text-slate-900">Perfil</Text>
        </View>

        {isLoading ? (
          <View className="items-center py-20">
            <ActivityIndicator size="large" color={colors.brand[600]} />
          </View>
        ) : profile ? (
          <>
            {/* Avatar + name */}
            <View className="items-center mb-6">
              <View className="h-20 w-20 rounded-full bg-brand-100 items-center justify-center mb-3">
                <UserIcon size={36} color={colors.brand[600]} />
              </View>
              <Text className="text-lg font-sans-semibold text-slate-900">
                {profile.preferred_name || profile.name}
              </Text>
            </View>

            {/* Info cards */}
            <View className="px-5 gap-2">
              {profile.phone ? (
                <InfoRow icon={<Phone size={18} color="#64748b" />} label="Telefone" value={profile.phone} />
              ) : null}
              {profile.email ? (
                <InfoRow icon={<Mail size={18} color="#64748b" />} label="E-mail" value={profile.email} />
              ) : null}
              {profile.height_cm ? (
                <InfoRow icon={<Ruler size={18} color="#64748b" />} label="Altura" value={`${(profile.height_cm / 100).toFixed(2).replace('.', ',')} m`} />
              ) : null}
              {profile.weight_kg ? (
                <InfoRow icon={<Weight size={18} color="#64748b" />} label="Peso" value={`${profile.weight_kg.toFixed(1).replace('.', ',')} kg`} />
              ) : null}
              {profile.birth_date ? (
                <InfoRow icon={<UserIcon size={18} color="#64748b" />} label="Nascimento" value={new Date(profile.birth_date + 'T00:00:00').toLocaleDateString('pt-BR')} />
              ) : null}
            </View>
          </>
        ) : (
          <View className="items-center mb-6">
            <View className="h-20 w-20 rounded-full bg-brand-100 items-center justify-center mb-3">
              <UserIcon size={36} color={colors.brand[600]} />
            </View>
            <Text className="text-lg font-sans-semibold text-slate-900">Paciente</Text>
          </View>
        )}

        {/* Evolution chart */}
        <WeightChart />

        {/* Logout */}
        <View className="px-5 mt-6">
          <Pressable
            onPress={handleLogout}
            className="flex-row items-center gap-3 bg-white rounded-2xl border border-slate-100 px-4 py-3.5 active:bg-red-50"
          >
            <LogOut size={18} color="#ef4444" />
            <Text className="text-sm font-sans-medium text-red-500 flex-1">Sair</Text>
          </Pressable>
        </View>

        <Text className="text-[10px] text-slate-300 text-center mt-8 font-sans">
          AliaPatient v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

function WeightChart() {
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
      <View className="bg-white rounded-2xl border border-slate-100 p-4">
        <View className="flex-row items-center gap-2 mb-3">
          <TrendingDown size={16} color={colors.brand[600]} />
          <Text className="text-sm font-sans-semibold text-slate-900">Evolução de peso</Text>
          <Text className={`text-xs font-sans-medium ml-auto ${diff <= 0 ? 'text-green-600' : 'text-amber-600'}`}>
            {diffStr}
          </Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Svg width={W} height={H}>
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
              const y = padTop + chartH - frac * chartH
              return (
                <Line key={frac} x1={padX} y1={y} x2={W - padX} y2={y} stroke="#f1f5f9" strokeWidth={1} />
              )
            })}
            {/* Y labels */}
            <SvgText x={4} y={padTop + 4} fontSize={9} fill="#94a3b8">{maxW.toFixed(0)}</SvgText>
            <SvgText x={4} y={padTop + chartH + 4} fontSize={9} fill="#94a3b8">{minW.toFixed(0)}</SvgText>
            {/* Line */}
            <Polyline points={polyPoints} fill="none" stroke={colors.brand[500]} strokeWidth={2} strokeLinejoin="round" />
            {/* Dots */}
            {coords.map((c, i) => (
              <SvgCircle key={i} cx={c.x} cy={c.y} r={3} fill={colors.brand[600]} />
            ))}
            {/* X labels (first and last date) */}
            <SvgText x={padX} y={H - 4} fontSize={9} fill="#94a3b8" textAnchor="start">
              {fmtShort(points[0].evaluation_date)}
            </SvgText>
            <SvgText x={W - padX} y={H - 4} fontSize={9} fill="#94a3b8" textAnchor="end">
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

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View className="flex-row items-center gap-3 bg-white rounded-2xl border border-slate-100 px-4 py-3.5">
      {icon}
      <View className="flex-1">
        <Text className="text-[11px] text-slate-400 font-sans">{label}</Text>
        <Text className="text-sm font-sans-medium text-slate-700">{value}</Text>
      </View>
    </View>
  )
}
