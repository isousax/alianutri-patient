import { create } from 'zustand'

export interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  // Se ausente → diálogo de 1 botão (alerta/informativo).
  cancelLabel?: string
  destructive?: boolean
  onConfirm?: () => void
  onCancel?: () => void
}

interface ConfirmState {
  current: (ConfirmOptions & { token: number }) | null
  open: (opts: ConfirmOptions) => void
  close: () => void
}

export const useConfirmStore = create<ConfirmState>((set) => ({
  current: null,
  open: (opts) => set({ current: { ...opts, token: Date.now() } }),
  close: () => set({ current: null }),
}))

// API imperativa: confirm({ title, message, cancelLabel, onConfirm }).
export const confirm = (opts: ConfirmOptions) => useConfirmStore.getState().open(opts)

// Alerta informativo de 1 botão (substitui Alert.alert sem ações).
export const alertInfo = (title: string, message?: string, onConfirm?: () => void) =>
  useConfirmStore.getState().open({ title, message, confirmLabel: 'OK', onConfirm })
