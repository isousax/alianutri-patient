import { useEffect } from 'react'
import { onlineManager, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../stores/auth'
import { flushQueue } from '../lib/mutationQueue'

const INVALIDATE_RESOURCES = ['water', 'food-diary', 'diary-today', 'diary-streak', 'home'] as const

/**
 * Drena a fila de mutações offline ao iniciar e sempre que a rede voltar.
 * Montar uma única vez dentro do QueryClientProvider.
 */
export function useOfflineQueueSync(): void {
  const qc = useQueryClient()

  useEffect(() => {
    const onSynced = () => {
      for (const resource of INVALIDATE_RESOURCES) {
        qc.invalidateQueries({ queryKey: ['portal', resource] })
      }
    }

    const tryFlush = () => {
      const code = useAuthStore.getState().accessCode
      if (code && onlineManager.isOnline()) {
        flushQueue({ code, onSynced }).catch(() => {})
      }
    }

    tryFlush() // boot

    const unsubscribe = onlineManager.subscribe((online) => {
      if (online) tryFlush()
    })
    return unsubscribe
  }, [qc])
}
