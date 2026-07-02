import { View, Text, StyleSheet } from 'react-native'
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated'
import { Sparkles, Heart, CalendarDays, Flame, Droplets } from 'lucide-react-native'
import { useThemeColors } from '../../stores/theme'
import { useWeeklyAdherence, useChartsSummary, useDiaryStreak } from '../../hooks/usePortal'
import { typography, space, radius, SCREEN_PADDING, shadows } from '../../theme/tokens'

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

  if (loggedDays === 0 && streak === 0 && mealPhotos === 0 && waterL === 0) return null

  return (
    <Animated.View entering={FadeInDown.duration(350)} style={styles.wrapper}>
      <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border || 'transparent' }, shadows.sm]}>
        {/* Barra colorida superior */}
        <View style={[styles.accentBar, { backgroundColor: t.primary }]} />

        <View style={styles.content}>
          {/* Cabeçalho */}
          <View style={styles.header}>
            <Text style={[typography.overline, { color: t.primary, opacity: 0.8, letterSpacing: 1 }]}>
              SUA SEMANA
            </Text>
          </View>

          <Text style={[typography.headingMd, { color: t.text, fontWeight: '700', marginBottom: space.md }]}>
            {recapHeadline(loggedDays, totalDays)}
          </Text>


          {/* Nutri */}
          {nutriLove > 0 && (
            <View style={[styles.nutriRow, { borderTopColor: t.border || 'rgba(0,0,0,0.06)' }]}>
              <Heart size={13} color={t.primary} fill={t.primary} />
              <Text style={[typography.caption, { color: t.textSecondary }]}>
                Sua nutri reagiu {nutriLove} {nutriLove === 1 ? 'vez' : 'vezes'} essa semana
              </Text>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: SCREEN_PADDING,
    marginBottom: space.md,
  },
  card: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
  },
  accentBar: {
    height: 4,
    width: '100%',
  },
  content: {
    padding: space.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: space.xs,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0,0,0,0.03)', // sutil, funciona em temas claros/escuros com opacidade baixa
    borderRadius: radius.lg,
    paddingVertical: space.sm,
    paddingHorizontal: space.xs,
    marginBottom: space.md,
  },
  statBox: {
    alignItems: 'center',
    gap: 2,
    flex: 1,
  },
  nutriRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: space.sm,
    borderTopWidth: 1,
  },
})