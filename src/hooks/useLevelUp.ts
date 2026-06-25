import { useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = 'alianutri_last_level'

/**
 * Detects a level-up by comparing the current gamification level against the
 * last-celebrated level (persisted in AsyncStorage). On first run it baselines
 * silently (no celebration). Returns the level to celebrate (or null) and a
 * dismiss() to acknowledge it (which persists the new baseline).
 */
export function useLevelUp(currentLevel: number | null) {
  const [celebrateLevel, setCelebrateLevel] = useState<number | null>(null)

  useEffect(() => {
    if (currentLevel == null || currentLevel < 1) return
    let cancelled = false
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (cancelled) return
        const last = raw != null ? parseInt(raw, 10) : null
        if (last == null || Number.isNaN(last)) {
          // First run — establish baseline, don't celebrate retroactively.
          AsyncStorage.setItem(KEY, String(currentLevel)).catch(() => {})
          return
        }
        if (currentLevel > last) setCelebrateLevel(currentLevel)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [currentLevel])

  const dismiss = () => {
    if (celebrateLevel != null) {
      AsyncStorage.setItem(KEY, String(celebrateLevel)).catch(() => {})
      setCelebrateLevel(null)
    }
  }

  return { celebrateLevel, dismiss }
}
