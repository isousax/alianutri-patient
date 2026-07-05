import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRemindersStore } from '../stores/reminders'
import { rescheduleReminders, type MealTime } from '../lib/localNotifications'
import { useAuthStore } from '../stores/auth'
import { portalApi } from '../services/api'
import type { DiaryTodayResponse, WaterIntakeResponse } from '../types/portal'
import { todayStr } from '../lib/date'

/**
 * Hydrates the reminders config and (re)schedules local daily reminders using
 * the patient's real meal-plan times and water goal. Re-runs when auth, the
 * toggles, or the plan/goal change. Queries are auth-gated and share the cache
 * with the rest of the app (no duplicate fetches).
 */
export function useReminders() {
  const accessCode = useAuthStore((s) => s.accessCode)
  const enabled = useRemindersStore((s) => s.enabled)
  const loaded = useRemindersStore((s) => s.loaded)
  const hydrate = useRemindersStore((s) => s.hydrate)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  const today = todayStr()
  const { data: diary } = useQuery({
    queryKey: ['portal', 'diary-today', today],
    queryFn: () => portalApi.get<DiaryTodayResponse>(`/diary/today?date=${today}`),
    enabled: !!accessCode,
  })
  const { data: water } = useQuery({
    queryKey: ['portal', 'water', today],
    queryFn: () => portalApi.get<WaterIntakeResponse>(`/water?date=${today}`),
    enabled: !!accessCode,
  })

  const meals = useMemo<MealTime[]>(
    () => (diary?.meals ?? []).map((m) => ({ name: m.meal_name, time: m.meal_time })),
    [diary],
  )
  const waterGoalMl = water?.goal_ml ?? null
  const mealsKey = meals.map((m) => `${m.name}@${m.time}`).join('|')

  useEffect(() => {
    if (!accessCode || !loaded) return
    rescheduleReminders(enabled, { meals, waterGoalMl }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessCode, loaded, enabled, mealsKey, waterGoalMl])
}
