import { View, Text } from 'react-native'
import { router } from 'expo-router'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { Target, ChevronRight } from 'lucide-react-native'
import type { PortalGoal } from '../../types/portal'
import { useThemeColors } from '../../stores/theme'
import { typography, space, radius, SCREEN_PADDING } from '../../theme/tokens'
import { Card } from '../ui'

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

interface GoalsPreviewProps {
  goals: PortalGoal[]
}

/** Active-goals preview card (taps through to the full goals screen). */
export function GoalsPreview({ goals }: GoalsPreviewProps) {
  const t = useThemeColors()
  if (goals.length === 0) return null

  return (
    <Animated.View
      entering={FadeInDown.duration(350).delay(240)}
      style={{ paddingHorizontal: SCREEN_PADDING, marginBottom: space.lg }}
    >
      <Card onPress={() => router.push('/goals')}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 28, height: 28, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: t.successLight }}>
              <Target size={14} color={t.success} />
            </View>
            <Text style={[typography.headingSm, { color: t.text, marginLeft: space.sm }]}>Metas</Text>
          </View>
          <ChevronRight size={16} color={t.textMuted} />
        </View>
        {goals.map((goal, i) => {
          const progress = goalProgress(goal)
          return (
            <View key={goal.id} style={i > 0 ? { marginTop: space.md } : undefined}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={[typography.labelMd, { color: t.text, flex: 1, marginRight: space.sm }]} numberOfLines={1}>
                  {goal.title}
                </Text>
                <Text style={[typography.captionBold, { color: progress >= 1 ? t.success : t.primary }]}>
                  {Math.round(progress * 100)}%
                </Text>
              </View>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: t.borderLight, overflow: 'hidden' }}>
                <View style={{ height: 6, borderRadius: 3, width: `${Math.min(progress * 100, 100)}%`, backgroundColor: progress >= 1 ? t.success : t.primary }} />
              </View>
            </View>
          )
        })}
      </Card>
    </Animated.View>
  )
}
