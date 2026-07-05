import { View, Text, Pressable } from 'react-native'
import { router } from 'expo-router'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { Droplets, Flame } from 'lucide-react-native'
import { useThemeColors } from '../../stores/theme'
import { typography, space, radius, SCREEN_PADDING, fmtWater } from '../../theme/tokens'
import { Card, ProgressRing, ProgressBar } from '../ui'

interface AnelDoDiaProps {
  loggedCount: number
  totalMeals: number
  diaryPct: number
  waterTotal: number
  waterGoal: number
  waterPct: number
  aiCalories: number
  targetKcal: number | null
}

/**
 * Anel do dia — foco diário consolidado: anel-herói de refeições + calorias
 * e hidratação como métricas de apoio. Substitui o antigo DailyRingsRow.
 */
export function AnelDoDia({
  loggedCount,
  totalMeals,
  diaryPct,
  waterTotal,
  waterGoal,
  waterPct,
  aiCalories,
  targetKcal,
}: AnelDoDiaProps) {
  const t = useThemeColors()
  const mealsComplete = totalMeals > 0 && loggedCount >= totalMeals
  const ringColor = mealsComplete ? t.success : t.primary

  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(100)}
      style={{ paddingHorizontal: SCREEN_PADDING, marginBottom: space.xl }}
    >
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Anel-herói — refeições */}
          <Pressable
            onPress={() => router.push('/food-diary' as never)}
            accessibilityRole="button"
            accessibilityLabel={`${loggedCount} de ${totalMeals || 0} refeições registradas. Toque para ver o diário de hoje`}
          >
            <ProgressRing
              progress={diaryPct}
              size={104}
              strokeWidth={9}
              color={ringColor}
              trackColor={t.borderLight}
            >
              <View style={{ alignItems: 'center' }}>
                <Text style={[typography.displaySm, { color: t.text }]}>
                  {loggedCount}
                  <Text style={[typography.bodySm, { color: t.textMuted }]}>
                    /{totalMeals || '—'}
                  </Text>
                </Text>
                <Text style={[typography.caption, { color: t.textMuted }]}>refeições</Text>
              </View>
            </ProgressRing>
          </Pressable>

          {/* Métricas de apoio — calorias + hidratação */}
          <View style={{ flex: 1, marginLeft: space.xl, gap: space.md }}>
            <View
              accessible
              accessibilityLabel={aiCalories > 0
                ? `Calorias de hoje: aproximadamente ${aiCalories} kcal${targetKcal ? ` de ${targetKcal}` : ''}`
                : 'Calorias de hoje: sem registro'}
              style={{ flexDirection: 'row', alignItems: 'center' }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: radius.sm,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: t.primaryLight,
                }}
              >
                <Flame size={16} color={t.primary} />
              </View>
              <View style={{ marginLeft: space.sm, flex: 1 }}>
                <Text style={[typography.labelMd, { color: t.text }]} numberOfLines={1}>
                  {aiCalories > 0 ? `≈ ${aiCalories} kcal` : 'Sem registro'}
                  {targetKcal ? (
                    <Text style={[typography.caption, { color: t.textMuted }]}>
                      {'  '}de {targetKcal}
                    </Text>
                  ) : null}
                </Text>
                <Text style={[typography.caption, { color: t.textMuted }]}>Calorias de hoje</Text>
              </View>
            </View>

            <Pressable
              onPress={() => router.push('/water' as never)}
              accessibilityRole="button"
              accessibilityLabel={`${waterTotal > 0 ? `Hidratação: ${fmtWater(waterTotal)} de ${fmtWater(waterGoal)}` : 'Hidratação: sem registro'}. Toque para registrar água`}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space.xs }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: radius.sm,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: t.infoLight,
                  }}
                >
                  <Droplets size={16} color={waterPct >= 1 ? t.success : t.info} />
                </View>
                <View style={{ marginLeft: space.sm, flex: 1 }}>
                  <Text style={[typography.labelMd, { color: t.text }]} numberOfLines={1}>
                    {waterTotal > 0 ? `${fmtWater(waterTotal)} / ${fmtWater(waterGoal)}` : 'Sem registro'}
                  </Text>
                  <Text style={[typography.caption, { color: t.textMuted }]}>Hidratação</Text>
                </View>
              </View>
              <ProgressBar
                progress={waterPct}
                height={5}
                color={waterPct >= 1 ? t.success : t.info}
                trackColor={t.borderLight}
              />
            </Pressable>
          </View>
        </View>
      </Card>
    </Animated.View>
  )
}
