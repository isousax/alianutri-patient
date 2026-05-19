import type { Persister } from '@tanstack/react-query-persist-client'

const CACHE_KEY = 'REACT_QUERY_OFFLINE_CACHE'

let storage: {
  getItem: (k: string) => Promise<string | null>
  setItem: (k: string, v: string) => Promise<void>
  removeItem: (k: string) => Promise<void>
} | null = null

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('@react-native-async-storage/async-storage')
  storage = mod?.default ?? mod
} catch {
  console.warn('AsyncStorage not available, offline cache disabled')
}

export const asyncStoragePersister: Persister = {
  persistClient: async (client) => {
    try {
      await storage?.setItem(CACHE_KEY, JSON.stringify(client))
    } catch {}
  },
  restoreClient: async () => {
    try {
      const raw = await storage?.getItem(CACHE_KEY)
      return raw ? JSON.parse(raw) : undefined
    } catch {
      return undefined
    }
  },
  removeClient: async () => {
    try {
      await storage?.removeItem(CACHE_KEY)
    } catch {}
  },
}
