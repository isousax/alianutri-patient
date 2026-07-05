import { View, Text, Pressable } from 'react-native'
import { router } from 'expo-router'
import Animated, { FadeInDown } from 'react-native-reanimated'
import {
  ClipboardList,
  Utensils,
  Droplets,
  CheckCircle2,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react-native'
import { haptics } from '../../lib/haptics'
import { useThemeColors } from '../../stores/theme'
import { typography, space, radius, SCREEN_PADDING } from '../../theme/tokens'
import { chooseNextStep, type NextStepKind, type NextStepMeal } from '../../lib/nextStep'
import type { DiaryTimelineMeal } from '../../types/portal'

interface ProximoPassoProps {
  meals: DiaryTimelineMeal[]
  waterTotalMl: number
  waterGoalMl: number
  pendingQuestionnaires: number
  streak?: number
}

const ICONS: Record<NextStepKind, LucideIcon> = {
  questionnaire: ClipboardList,
  meal: Utensils,
  upcoming: Utensils,
  water: Droplets,
  noPlan: Utensils,
  allDone: CheckCircle2,
}

/**
 * Cartão "Próximo passo" — surfaça a ÚNICA ação mais relevante agora.
 * A lógica vive em `lib/nextStep` (pura e testável).
 */
export function ProximoPasso({
  meals,
  waterTotalMl,
  waterGoalMl,
  pendingQuestionnaires,
  streak,
}: ProximoPassoProps) {
  const t = useThemeColors()

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
    waterTotalMl,
    waterGoalMl,
    pendingQuestionnaires,
    streak,
  })

  const Icon = ICONS[step.kind]
  const done = step.kind === 'allDone'
  // Conclusão veste a MARCA (não o verde de success) — em Natureza/Noturno primary já
  // é esverdeado, então só o Rosé muda de fato (deixa de "parecer de outro tema").
  const accent = t.primary
  const accentLight = t.primaryLight
  const interactive = !!step.route

  const onPress = () => {
    if (!step.route) return
    haptics.light()
    router.push(step.route as never)
  }

  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(60)}
      style={{ paddingHorizontal: SCREEN_PADDING, marginBottom: space.lg }}
    >
      <Pressable
        onPress={onPress}
        disabled={!interactive}
        accessibilityRole={interactive ? 'button' : undefined}
        accessibilityLabel={interactive ? step.cta ?? step.title : undefined}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: space.lg,
          paddingRight: interactive ? space.lg + 26 : space.lg,
          borderRadius: radius.xl,
          backgroundColor: accentLight,
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: radius.md,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: accent + '22',
            marginRight: space.md,
          }}
        >
          <Icon size={20} color={accent} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[typography.overline, { color: accent, marginBottom: 2 }]}>
            {done ? 'Tudo certo' : 'Próximo passo'}
          </Text>
          <Text style={[typography.headingSm, { color: t.text }]} numberOfLines={1}>
            {step.title}
          </Text>
          <Text
            style={[typography.caption, { color: t.textMuted, marginTop: 1 }]}
            numberOfLines={2}
          >
            {step.subtitle}
          </Text>
        </View>
        {interactive ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              right: space.lg,
              top: 0,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChevronRight size={18} color={accent} />
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  )
}
