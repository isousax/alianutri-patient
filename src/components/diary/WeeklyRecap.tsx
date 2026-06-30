import { View, Text } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { Sparkles, Heart } from 'lucide-react-native'
import { useThemeColors } from '../../stores/theme'
import { useWeeklyAdherence, useChartsSummary, useDiaryStreak } from '../../hooks/usePortal'
import { typography, space, radius, SCREEN_PADDING, shadows } from '../../theme/tokens'

// "Sua semana" — recap estilo Wrapped no topo do Feed (P1). Resume os últimos 7
// dias a partir de sinais que o paciente já gera (adesão, sequência, água,
// carinho do nutri). Peak-end rule: tom sempre encorajador. Some quando não há
// nada para recapitular.

function recapHeadline(loggedDays: number, totalDays: number): string {
  const ratio = totalDays > 0 ? loggedDays / totalDays : 0
  if (loggedDays === 0) return 'Bora começar essa semana? ✨'
  if (ratio >= 0.85) return 'Semana impecável! 🔥'
  if (ratio >= 0.55) return 'Semana firme 💪'
  return 'Bom começo — dá pra subir 📈'
}

export function WeeklyRecap() {
  const t = useThemeColors()
  const { data: adherence } = useWeeklyAdherence()
  const { data: charts } = useChartsSummary(7)
  const { data: streakData } = useDiaryStreak()

  const days = adherence?.days ?? []
  const totalDays = days.length || 7
  const loggedDays = days.filter((d) => d.logged > 0).length
  const waterL = (charts?.water ?? []).reduce((s, d) => s + (d.total_ml || 0), 0) / 1000
  const mealPhotos = charts?.counts?.meal_photos ?? 0
  const nutriLove = (charts?.counts?.nutri_reactions ?? 0) + (charts?.counts?.nutri_comments ?? 0)
  const streak = streakData?.streak ?? 0

  // Nada relevante p/ recapitular ainda — não mostra o card.
  if (loggedDays === 0 && streak === 0 && mealPhotos === 0 && waterL === 0) return null

  const stats = [
    { key: 'days', value: `${loggedDays}/${totalDays}`, label: totalDays === 1 ? 'dia' : 'dias' },
    { key: 'streak', value: `${streak}`, label: streak === 1 ? 'dia seguido' : 'dias seguidos' },
    { key: 'water', value: waterL.toFixed(1).replace('.', ','), label: 'litros' },
  ]

  return (
    <Animated.View entering={FadeInDown.duration(350)} style={{ paddingHorizontal: SCREEN_PADDING, marginBottom: space.md }}>
      <View style={{ borderRadius: radius.xl, overflow: 'hidden', ...shadows.sm }}>
        <LinearGradient colors={[t.primary, t.primaryMuted]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: space.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: space.xs }}>
            <Sparkles size={14} color={t.primaryFg} />
            <Text style={[typography.overline, { color: t.primaryFg, opacity: 0.85 }]}>SUA SEMANA</Text>
          </View>
          <Text style={[typography.headingMd, { color: t.primaryFg }]}>{recapHeadline(loggedDays, totalDays)}</Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: space.lg }}>
            {stats.map((s, i) => (
              <View key={s.key} style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                {i > 0 ? <View style={{ width: 1, height: 26, backgroundColor: 'rgba(255,255,255,0.22)', marginRight: space.md }} /> : null}
                <View style={{ flex: 1 }}>
                  <Text style={[typography.headingMd, { color: t.primaryFg }]} numberOfLines={1}>{s.value}</Text>
                  <Text style={[typography.caption, { color: t.primaryFg, opacity: 0.8 }]} numberOfLines={1}>{s.label}</Text>
                </View>
              </View>
            ))}
          </View>

          {nutriLove > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space.md, paddingTop: space.md, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.18)' }}>
              <Heart size={13} color={t.primaryFg} fill={t.primaryFg} />
              <Text style={[typography.caption, { color: t.primaryFg, opacity: 0.95 }]}>
                Sua nutri reagiu {nutriLove} {nutriLove === 1 ? 'vez' : 'vezes'} essa semana
              </Text>
            </View>
          )}
        </LinearGradient>
      </View>
    </Animated.View>
  )
}
