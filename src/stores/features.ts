import { create } from 'zustand'

interface FeaturesState {
  canWrite: boolean
  setCanWrite: (value: boolean) => void
}

export const useFeaturesStore = create<FeaturesState>((set) => ({
  canWrite: true,
  setCanWrite: (value) => set({ canWrite: value }),
}))
