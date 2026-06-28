import type { ReactNode } from 'react'
import { create } from 'zustand'

export interface ActionSheetItem {
  label: string
  destructive?: boolean
  icon?: ReactNode
  onPress?: () => void
}

export interface ActionSheetOptions {
  title?: string
  message?: string
  options: ActionSheetItem[]
  cancelLabel?: string
}

interface ActionSheetState {
  current: (ActionSheetOptions & { token: number }) | null
  open: (opts: ActionSheetOptions) => void
  close: () => void
}

export const useActionSheetStore = create<ActionSheetState>((set) => ({
  current: null,
  open: (opts) => set({ current: { ...opts, token: Date.now() } }),
  close: () => set({ current: null }),
}))

// API imperativa: showActionSheet({ title, options: [{ label, onPress }] }).
export const showActionSheet = (opts: ActionSheetOptions) =>
  useActionSheetStore.getState().open(opts)
