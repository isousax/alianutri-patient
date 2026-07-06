import { useMemo } from 'react'
import { applyDevOverrides, type GamificationState } from '../lib/gamification'
import { useDevGamStore } from '../stores/devGamification'

// Aplica overrides LOCAIS de desenvolvimento (medalhas desbloqueadas + XP/nível)
// sobre um GamificationState já calculado. No-op em produção (__DEV__ === false).
// A ordem de hooks é estável entre renders (os seletores são sempre chamados).
export function useDevGamification(gam: GamificationState): GamificationState
export function useDevGamification(gam: GamificationState | null): GamificationState | null
export function useDevGamification(gam: GamificationState | null): GamificationState | null {
  const unlockedIds = useDevGamStore((s) => s.unlockedIds)
  const xpOverride = useDevGamStore((s) => s.xpOverride)
  return useMemo(
    () => (__DEV__ && gam ? applyDevOverrides(gam, { unlockedIds, xpOverride }) : gam),
    [gam, unlockedIds, xpOverride],
  )
}
