import { MMKV } from 'react-native-mmkv'
import type { Persister } from '@tanstack/react-query-persist-client'

const storage = new MMKV({ id: 'react-query-cache' })

const CACHE_KEY = 'REACT_QUERY_OFFLINE_CACHE'

export const mmkvPersister: Persister = {
  persistClient: async (client) => {
    storage.set(CACHE_KEY, JSON.stringify(client))
  },
  restoreClient: async () => {
    const data = storage.getString(CACHE_KEY)
    return data ? JSON.parse(data) : undefined
  },
  removeClient: async () => {
    storage.delete(CACHE_KEY)
  },
}
