import { useMemo } from 'react'
import { useWeather } from './useWeather'
import { weatherBonusMl, hydrationMessage } from '../lib/hydration'
import type { WaterGoalSource } from '../types/portal'

export type { WaterGoalSource }

/**
 * Meta de água exibida. A FONTE ÚNICA é o servidor (`goal_ml` + `goal_source`):
 *  - 'nutri'    → meta prescrita pelo nutricionista
 *  - 'baseline' → calculada pelo peso no backend (peso × 35)
 *  - 'default'  → 2000ml (sem peso nem meta do nutri)
 *
 * O clima é um ajuste EFÊMERO do dia ("+X ml hoje"), apenas sugerido — NÃO entra
 * na meta oficial. Assim Home, tela de Água e a análise do nutri batem entre si.
 */
export function useSmartWaterGoal(apiGoalMl: number, goalSource?: WaterGoalSource) {
  const { weather, status: weatherStatus, updatedAt: weatherUpdatedAt } = useWeather()

  // Compat: respostas em cache antigas (sem goal_source) caem na heurística do 2000.
  const nutriSetCustomGoal = goalSource ? goalSource === 'nutri' : apiGoalMl !== 2000
  const isPersonalized = goalSource === 'baseline'

  const bonusMl = useMemo(() => weatherBonusMl(weather), [weather])
  const message = useMemo(() => hydrationMessage(weather), [weather])

  return {
    goal: apiGoalMl,
    weather,
    weatherStatus,
    weatherUpdatedAt,
    nutriSetCustomGoal,
    isPersonalized,
    weatherBonusMl: bonusMl,
    message,
  }
}
