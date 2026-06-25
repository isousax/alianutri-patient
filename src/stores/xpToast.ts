import { create } from 'zustand'

interface XpToastState {
  amount: number | null
  /** muda a cada show() para re-disparar a animação mesmo se já visível */
  token: number
  show: (amount: number) => void
  clear: () => void
}

/** Feedback visual de "+N XP" flutuante (recompensa ao registrar/postar). */
export const useXpToast = create<XpToastState>((set, get) => ({
  amount: null,
  token: 0,
  show: (amount) => set({ amount, token: get().token + 1 }),
  clear: () => set({ amount: null }),
}))
