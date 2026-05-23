import { useMemo } from 'react'
import { useWeather } from './useWeather'
import { usePortalProfile } from './usePortal'
import { calculateHydrationGoal, type HydrationResult } from '../lib/hydration'

/**
 * Single source of truth for the resolved water goal.
 *
 * Priority:
 *  1. Nutritionist-defined goal (apiGoal ≠ 2000)
 *  2. Smart goal (weight × climate) when personalized
 *  3. API default (2000ml fallback)
 *
 * Both the home screen and the water screen consume this hook
 * so the displayed goal is always consistent.
 */
export function useSmartWaterGoal(apiGoalMl: number) {
  const { data: weather } = useWeather()
  const { data: profile } = usePortalProfile()

  const hydration: HydrationResult = useMemo(() => calculateHydrationGoal(
    {
      weight_kg: profile?.weight_kg,
      height_cm: profile?.height_cm,
      birth_date: profile?.birth_date,
      gender: profile?.gender,
    },
    weather ?? null,
  ), [profile?.weight_kg, profile?.height_cm, profile?.birth_date, profile?.gender, weather])

  const nutriSetCustomGoal = apiGoalMl !== 2000

  const goal = nutriSetCustomGoal
    ? apiGoalMl
    : (hydration.isPersonalized ? hydration.goal_ml : apiGoalMl)

  return {
    goal,
    hydration,
    weather: weather ?? null,
    nutriSetCustomGoal,
  }
}
