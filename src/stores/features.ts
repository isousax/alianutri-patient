import { create } from 'zustand'

export interface AiMealAnalysisCap {
  limit: number
  used: number
  period: 'day'
}

interface FeaturesState {
  canWrite: boolean
  aiMealAnalysis: AiMealAnalysisCap | null
  /** Sincroniza tudo a partir do `features` do /home (default seguro se ausente). */
  setFeatures: (features?: { can_write: boolean; ai_meal_analysis?: AiMealAnalysisCap }) => void
  setCanWrite: (value: boolean) => void
}

export const useFeaturesStore = create<FeaturesState>((set) => ({
  canWrite: true,
  aiMealAnalysis: null,
  setFeatures: (features) =>
    set({
      canWrite: features?.can_write ?? true,
      aiMealAnalysis: features?.ai_meal_analysis ?? null,
    }),
  setCanWrite: (value) => set({ canWrite: value }),
}))
