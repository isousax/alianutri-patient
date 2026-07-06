import { useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { todayStr } from './date'

// Persistência LEVE da DATA de conquista de cada medalha (YYYY-MM-DD, BRT).
// Separado do baseline de "vistas" (useAchievementUnlock) porque tem outro
// propósito: alimentar a galeria/contemplação ("Conquistada em ..."). Conquistas
// anteriores a este recurso simplesmente não têm data — a UI omite nesse caso.

const KEY = 'alianutri_badge_dates'
export type BadgeDateMap = Record<string, string>

async function readMap(): Promise<BadgeDateMap> {
  try {
    const raw = await AsyncStorage.getItem(KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as BadgeDateMap
    }
  } catch {}
  return {}
}

/** Carimba a data de HOJE (BRT) para ids que ainda não têm — idempotente. */
export async function recordBadgeDates(ids: string[]) {
  if (ids.length === 0) return
  try {
    const map = await readMap()
    const today = todayStr()
    let changed = false
    for (const id of ids) {
      if (!map[id]) {
        map[id] = today
        changed = true
      }
    }
    if (changed) await AsyncStorage.setItem(KEY, JSON.stringify(map))
  } catch {}
}

export async function getBadgeDates(): Promise<BadgeDateMap> {
  return readMap()
}

/** DEV/reset: limpa as datas de conquista. */
export async function clearBadgeDates() {
  try {
    await AsyncStorage.removeItem(KEY)
  } catch {}
}

/** Hook: mapa de datas de conquista (carrega uma vez). */
export function useBadgeDates(): BadgeDateMap {
  const [map, setMap] = useState<BadgeDateMap>({})
  useEffect(() => {
    let alive = true
    getBadgeDates()
      .then((m) => {
        if (alive) setMap(m)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])
  return map
}

/** "6 de julho de 2025" a partir de YYYY-MM-DD. */
export function fmtAchievementDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
}
