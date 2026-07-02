import { View, Text } from 'react-native'
import { router } from 'expo-router'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { Target, ChevronRight } from 'lucide-react-native'
import type { PortalGoal } from '../../types/portal'
import { useThemeColors } from '../../stores/theme'
import { typography, space, radius, SCREEN_PADDING } from '../../theme/tokens'
import { Card } from '../ui'

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
          // P0-1: progresso vem pronto do servidor (fonte única). Sem cálculo local.
          const pct = goal.progress?.pct ?? null
          const reached = goal.progress?.reached ?? false
          const accent = reached ? t.success : t.primary
          return (
            <View key={goal.id} style={i > 0 ? { marginTop: space.md } : undefined}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={[typography.labelMd, { color: t.text, flex: 1, marginRight: space.sm }]} numberOfLines={1}>
                  {goal.title}
                </Text>
                <Text style={[typography.captionBold, { color: accent }]}>
                  {reached ? '100%' : pct != null ? `${Math.round(pct)}%` : '—'}
                </Text>
              </View>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: t.borderLight, overflow: 'hidden' }}>
                <View style={{ height: 6, borderRadius: 3, width: `${pct ?? 0}%`, backgroundColor: accent }} />
              </View>
            </View>
          )
        })}
      </Card>
    </Animated.View>
  )
}
