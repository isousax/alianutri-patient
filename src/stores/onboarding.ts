import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'

const ONBOARDING_KEY = 'onboarding_seen'

interface OnboardingState {
  seen: boolean
  hydrated: boolean
  setSeen: () => void
  hydrateOnboarding: () => Promise<void>
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  seen: false,
  hydrated: false,

  setSeen: () => {
    AsyncStorage.setItem(ONBOARDING_KEY, '1').catch(() => {})
    set({ seen: true })
  },

  hydrateOnboarding: async () => {
    try {
      const stored = await AsyncStorage.getItem(ONBOARDING_KEY)
      set({ seen: stored === '1', hydrated: true })
    } catch {
      set({ hydrated: true })
    }
  },
}))
