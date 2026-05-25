import { View, Text, ScrollView, Pressable, RefreshControl, Dimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  Ruler, Weight, Phone, Mail,
  Settings, Calendar, TrendingDown, TrendingUp,
} from 'lucide-react-native'
import Svg, { Polyline, Circle as SvgCircle, Defs, LinearGradient, Stop } from 'react-native-svg'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { usePortalProfile, useEvolution } from '../../src/hooks/usePortal'
import type { PortalEvolution } from '../../src/types/portal'
import { useThemeColors } from '../../src/stores/theme'
import { Card, LoadingScreen } from '../../src/components/ui'
import { shadows, radius, space, typography, SCREEN_PADDING, fmtDateLabel } from '../../src/theme/tokens'

const { width: SCREEN_W } = Dimensions.get('window')
const AVATAR_SIZE = 88

export default function ProfileScreen() {
  const t = useThemeColors()
  const { data: profile, isLoading, refetch, isRefetching } = usePortalProfile()

  if (isLoading) return <LoadingScreen />

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
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={t.primary} />}
      >
        {/* ═══════ HEADER BAR ═══════ */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingHorizontal: SCREEN_PADDING,
          paddingTop: space.md,
          paddingBottom: space.xs,
        }}>
          <Pressable
            onPress={() => router.push('/settings')}
            hitSlop={12}
            style={{
              width: 38,
              height: 38,
              borderRadius: radius.md,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: t.surfaceSecondary,
            }}
          >
            <Settings size={18} color={t.textSecondary} strokeWidth={1.8} />
          </Pressable>
        </View>

        {/* ═══════ AVATAR + NAME ═══════ */}
        <Animated.View entering={FadeIn.duration(400)} style={{
          alignItems: 'center',
          paddingBottom: space['3xl'],
        }}>
          {profile?.profile_photo_url ? (
            <View style={{
              width: AVATAR_SIZE, height: AVATAR_SIZE,
              borderRadius: AVATAR_SIZE / 2,
              overflow: 'hidden',
              marginBottom: space.lg,
              borderWidth: 3,
              borderColor: t.primaryLight,
              ...shadows.md,
            }}>
              <Image
                source={{ uri: profile.profile_photo_url }}
                style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
                contentFit="cover"
              />
            </View>
          ) : (
            <View style={{
              width: AVATAR_SIZE, height: AVATAR_SIZE,
              borderRadius: AVATAR_SIZE / 2,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: space.lg,
              backgroundColor: t.primary,
              ...shadows.md,
            }}>
              <Text style={[typography.displaySm, { color: t.primaryFg }]}>{initials}</Text>
            </View>
          )}
          <Text style={[typography.displaySm, { color: t.text }]}>{displayName}</Text>
        </Animated.View>

        {/* ═══════ INFO CARD ═══════ */}
        {infoRows.length > 0 && (
          <Animated.View entering={FadeInDown.duration(350).delay(80)} style={{ paddingHorizontal: SCREEN_PADDING, marginBottom: space.xl }}>
            <Card padded={false}>
              {infoRows.map((row, i) => (
                <View key={i}>
                  {i > 0 && (
                    <View style={{ height: 1, backgroundColor: t.borderLight, marginHorizontal: space.lg }} />
                  )}
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: space.lg,
                    paddingVertical: space.md + 2,
                    gap: space.md,
                  }}>
                    <View style={{
                      width: 34, height: 34,
                      borderRadius: radius.md,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: t.primaryLight,
                    }}>
                      {row.icon}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.overline, { color: t.textMuted, marginBottom: 2 }]}>{row.label}</Text>
                      <Text style={[typography.labelMd, { color: t.text }]}>{row.value}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </Card>
          </Animated.View>
        )}

        {/* ═══════ EVOLUTION CHART ═══════ */}
        <WeightChart />
      </ScrollView>
    </SafeAreaView>
  )
}

function WeightChart() {
  const t = useThemeColors()
  const { data: evolution } = useEvolution()

  const points = (evolution ?? []).filter((e) => e.weight_kg !== null) as (PortalEvolution & { weight_kg: number })[]
  if (points.length < 2) return null

  const W = SCREEN_W - SCREEN_PADDING * 2 - space.lg * 2
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
    <Animated.View entering={FadeInDown.duration(350).delay(160)} style={{ paddingHorizontal: SCREEN_PADDING, marginBottom: space.lg }}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{
              width: 28, height: 28, borderRadius: radius.sm,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: diff <= 0 ? t.successLight : t.warningLight,
            }}>
              <TrendIcon size={14} color={trendColor} />
            </View>
            <Text style={[typography.headingSm, { color: t.text, marginLeft: space.sm }]}>
              Evolução de peso
            </Text>
          </View>
          <Text style={[typography.captionBold, { color: trendColor }]}>{diffStr}</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: space.sm }}>
          <Text style={[typography.headingLg, { color: t.text }]}>
            {last.toFixed(1).replace('.', ',')}
            <Text style={[typography.caption, { color: t.textMuted }]}> kg</Text>
          </Text>
          <Text style={[typography.caption, { color: t.textMuted }]}>
            {fmtDateLabel(points[0].evaluation_date)} — {fmtDateLabel(points[points.length - 1].evaluation_date)}
          </Text>
        </View>

        <Svg width={W} height={H}>
          <Defs>
            <LinearGradient id="profileFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={t.primary} stopOpacity="0.12" />
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
            fill={t.surface}
            stroke={t.primary}
            strokeWidth={2.5}
          />
        </Svg>
      </Card>
    </Animated.View>
  )
}
