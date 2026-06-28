import { create } from 'zustand'

export type ToastVariant = 'success' | 'error' | 'info'

export interface ToastItem {
  token: number
  message: string
  variant: ToastVariant
}

interface ToastState {
  current: ToastItem | null
  show: (message: string, variant: ToastVariant) => void
  clear: () => void
}

export const useToastStore = create<ToastState>((set) => ({
  current: null,
  show: (message, variant) =>
    set({ current: { token: Date.now() + Math.random(), message, variant } }),
  clear: () => set({ current: null }),
}))

// API imperativa (estilo Alert): toast.success('...') / toast.error('...').
// Chamável de fora de componentes React (handlers, catch, etc.).
export const toast = {
  success: (message: string) => useToastStore.getState().show(message, 'success'),
  error: (message: string) => useToastStore.getState().show(message, 'error'),
  info: (message: string) => useToastStore.getState().show(message, 'info'),
}
