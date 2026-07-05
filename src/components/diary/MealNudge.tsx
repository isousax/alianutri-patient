import { useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { router } from 'expo-router'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { Utensils, ChevronRight, X } from 'lucide-react-native'
import { haptics } from '../../lib/haptics'
import { useThemeColors } from '../../stores/theme'
import { typography, space, radius, SCREEN_PADDING } from '../../theme/tokens'
import { chooseNextStep, type NextStepMeal } from '../../lib/nextStep'
import type { DiaryTimelineMeal } from '../../types/portal'

interface MealNudgeProps {
  meals: DiaryTimelineMeal[]
  streak: number
}

/**
 * Empurrãozinho contextual no Diário — reusa o MESMO motor `nextStep` da Home
 * (mensagem única e consistente, sem ruído). Só aparece quando há uma refeição
 * ATRASADA e não registrada (ou não há plano); some sozinho ao registrar. É
 * dispensável (X) e nunca repete água/questionário — esses vivem noutros lugares.
 */
export function MealNudge({ meals, streak }: MealNudgeProps) {
  const t = useThemeColors()
  const [dismissed, setDismissed] = useState(false)

  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const stepMeals: NextStepMeal[] = meals.map((m) => ({
    meal_index: m.meal_index,
    meal_name: m.meal_name,
    meal_time: m.meal_time,
    logged: m.entry !== null,
  }))

  const step = chooseNextStep({
    nowMinutes,
    meals: stepMeals,
    waterTotalMl: 0,
    waterGoalMl: 0,
    pendingQuestionnaires: 0,
    streak,
  })

  const relevant = step.kind === 'meal' || step.kind === 'noPlan'
  if (dismissed || !relevant) return null

  return (
    <Animated.View
      entering={FadeInDown.duration(300)}
      style={{ paddingHorizontal: SCREEN_PADDING, marginBottom: space.sm }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: space.sm + 2,
          paddingHorizontal: space.md,
          borderRadius: radius.lg,
          backgroundColor: t.primaryLight,
        }}
      >
        <Pressable
          onPress={() => {
            haptics.light()
            router.push('/food-diary' as never)
          }}
          accessibilityRole="button"
          accessibilityLabel={`${step.title}. ${step.subtitle}`}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', minWidth: 0 }}
        >
          <Utensils size={16} color={t.primary} />
          <View style={{ flex: 1, marginLeft: space.sm, minWidth: 0 }}>
            <Text style={[typography.labelSm, { color: t.text }]} numberOfLines={1}>
              {step.title}
            </Text>
            <Text style={[typography.caption, { color: t.textMuted }]} numberOfLines={1}>
              {step.subtitle}
            </Text>
          </View>
          <ChevronRight size={16} color={t.primary} />
        </Pressable>
        <Pressable
          onPress={() => {
            haptics.light()
            setDismissed(true)
          }}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Dispensar sugestão"
          style={{ marginLeft: space.sm, padding: 2 }}
        >
          <X size={14} color={t.textMuted} />
        </Pressable>
      </View>
    </Animated.View>
  )
}
