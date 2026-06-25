import { useEffect } from 'react'
import { useRemindersStore } from '../stores/reminders'
import { rescheduleReminders } from '../lib/localNotifications'
import { useAuthStore } from '../stores/auth'

/**
 * Hydrates the reminders config and (re)schedules the local daily reminders
 * whenever the user is authenticated or the config changes.
 */
export function useReminders() {
  const accessCode = useAuthStore((s) => s.accessCode)
  const enabled = useRemindersStore((s) => s.enabled)
  const loaded = useRemindersStore((s) => s.loaded)
  const hydrate = useRemindersStore((s) => s.hydrate)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  useEffect(() => {
    if (!accessCode || !loaded) return
    rescheduleReminders(enabled).catch(() => {})
  }, [accessCode, loaded, enabled])
}
