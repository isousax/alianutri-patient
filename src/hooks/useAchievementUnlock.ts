import { useEffect, useMemo, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Badge } from '../lib/gamification'

const KEY = 'alianutri_seen_badges'

/**
 * Detects a newly-unlocked achievement by comparing the currently-unlocked
 * badge ids against the persisted "seen" set. First run baselines silently.
 * Returns the freshly-unlocked badge (or null) and dismiss() to acknowledge
 * (which persists the full current set, avoiding a celebration storm).
 */
export function useAchievementUnlock(badges: Badge[]) {
  const [newBadge, setNewBadge] = useState<Badge | null>(null)
  const unlockedIds = useMemo(() => badges.filter((b) => b.unlocked).map((b) => b.id), [badges])
  const sig = unlockedIds.join(',')

  useEffect(() => {
    if (badges.length === 0) return
    let cancelled = false
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (cancelled) return
        let seen: string[] | null = null
        if (raw) {
          try {
            const parsed: unknown = JSON.parse(raw)
            if (Array.isArray(parsed)) seen = parsed as string[]
          } catch {
            seen = null
          }
        }
        if (seen == null) {
          // First run — baseline, don't celebrate retroactively.
          AsyncStorage.setItem(KEY, JSON.stringify(unlockedIds)).catch(() => {})
          return
        }
        const seenSet = seen
        const fresh = badges.find((b) => b.unlocked && !seenSet.includes(b.id))
        if (fresh) setNewBadge(fresh)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig])

  const dismiss = () => {
    AsyncStorage.setItem(KEY, JSON.stringify(unlockedIds)).catch(() => {})
    setNewBadge(null)
  }

  return { newBadge, dismiss }
}
