import { View, Text } from 'react-native'
import { router } from 'expo-router'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { Utensils, Droplets } from 'lucide-react-native'
import { useThemeColors } from '../../stores/theme'
import { typography, space, SCREEN_PADDING, fmtWater } from '../../theme/tokens'
import { Card, ProgressRing } from '../ui'

interface DailyRingsRowProps {
  diaryPct: number
  loggedCount: number
  totalMeals: number
  waterPct: number
  waterTotal: number
  waterGoal: number
  aiCalories?: number
}

/** Twin progress rings (meals + hydration) shown near the top of the Home. */
export function DailyRingsRow({
  diaryPct, loggedCount, totalMeals, waterPct, waterTotal, waterGoal, aiCalories = 0,
}: DailyRingsRowProps) {
  const t = useThemeColors()
  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(120)}
      style={{ paddingHorizontal: SCREEN_PADDING, marginBottom: space.xl }}
    >
      <View style={{ flexDirection: 'row', gap: space.md }}>
        {/* Meals ring */}
        <Card
          style={{ flex: 1, alignItems: 'center', paddingVertical: space.xl }}
          onPress={() => router.push('/(tabs)/diary')}
        >
          <ProgressRing
            progress={diaryPct}
            size={80}
            strokeWidth={7}
            color={diaryPct >= 1 ? t.success : t.primary}
            trackColor={t.borderLight}
          >
            <Utensils size={20} color={diaryPct >= 1 ? t.success : t.primary} strokeWidth={1.8} />
          </ProgressRing>
          <View style={{ marginTop: space.md, alignItems: 'center', minHeight: 42, justifyContent: 'flex-start' }}>
            <Text style={[typography.headingSm, { color: t.text, textAlign: 'center' }]}>Refeições</Text>
            <Text style={[typography.caption, { color: t.textMuted, marginTop: 2, textAlign: 'center' }]}>
              {totalMeals > 0
                ? loggedCount === totalMeals
                  ? 'Completo!'
                  : `${loggedCount} de ${totalMeals}`
                : 'Sem plano'}
            </Text>
            {aiCalories > 0 ? (
              <Text style={[typography.caption, { color: t.primary, marginTop: 1, textAlign: 'center' }]}>
                ≈ {aiCalories} kcal
              </Text>
            ) : null}
          </View>
        </Card>

        {/* Water ring */}
        <Card
          style={{ flex: 1, alignItems: 'center', paddingVertical: space.xl }}
          onPress={() => router.push('/water' as never)}
        >
          <ProgressRing
            progress={waterPct}
            size={80}
            strokeWidth={7}
            color={waterPct >= 1 ? t.success : t.info}
            trackColor={t.borderLight}
          >
            <Droplets size={20} color={waterPct >= 1 ? t.success : t.info} strokeWidth={1.8} />
          </ProgressRing>
          <View style={{ marginTop: space.md, alignItems: 'center', minHeight: 42, justifyContent: 'flex-start' }}>
            <Text style={[typography.headingSm, { color: t.text, textAlign: 'center' }]}>Hidratação</Text>
            <Text style={[typography.caption, { color: t.textMuted, marginTop: 2, textAlign: 'center' }]}>
              {waterTotal > 0 ? `${fmtWater(waterTotal)} / ${fmtWater(waterGoal)}` : 'Sem registro'}
            </Text>
          </View>
        </Card>
      </View>
    </Animated.View>
  )
}
