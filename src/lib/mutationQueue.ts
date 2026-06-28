// ══════════════════════════════════════════════════════════════
//  Fila de mutações offline (cifrada) — food-diary e água
//
//  Por quê custom (e não o persister do react-query): dados clínicos NÃO
//  são persistidos em AsyncStorage (não cifrado) — ver CLINICAL_RESOURCES
//  em app/_layout.tsx. A fila grava em expo-secure-store (cifrado).
//
//  Idempotência: cada item carrega um `id` (nanoid) que vai no payload e
//  vira o id da linha no backend (upsert via ON CONFLICT). Assim o replay
//  é seguro mesmo se um POST chegou ao servidor mas a resposta se perdeu.
//
//  Armazenamento: uma chave por item (`aliaq_item_<id>`) + um índice
//  (`aliaq_index_v1`) com os ids em ordem FIFO — evita o limite de ~2KB
//  por valor do SecureStore no Android.
// ══════════════════════════════════════════════════════════════
import * as SecureStore from 'expo-secure-store'
import { portalApi, ApiError } from '../services/api'
import { useAuthStore } from '../stores/auth'

export type QueuedMutationType = 'water' | 'food-diary'

export interface QueuedMutation {
  id: string // nanoid — também o id da linha no backend (idempotência)
  type: QueuedMutationType
  code: string // accessCode dono do registro
  path: string // '/water' | '/food-diary'
  payload: Record<string, unknown>
  createdAt: number
  attempts: number
}

const INDEX_KEY = 'aliaq_index_v1'
const itemKey = (id: string) => `aliaq_item_${id}`
const MAX_ATTEMPTS = 25

async function readIndex(): Promise<string[]> {
  try {
    const raw = await SecureStore.getItemAsync(INDEX_KEY)
    if (!raw) return []
    const arr: unknown = JSON.parse(raw)
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

async function writeIndex(ids: string[]): Promise<void> {
  try {
    await SecureStore.setItemAsync(INDEX_KEY, JSON.stringify(ids))
  } catch {
    // best-effort
  }
}

async function readItem(id: string): Promise<QueuedMutation | null> {
  try {
    const raw = await SecureStore.getItemAsync(itemKey(id))
    if (!raw) return null
    const obj = JSON.parse(raw) as QueuedMutation
    return obj && typeof obj.id === 'string' && typeof obj.path === 'string' ? obj : null
  } catch {
    return null
  }
}

async function deleteItem(id: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(itemKey(id))
  } catch {
    // best-effort
  }
  const ids = await readIndex()
  if (ids.includes(id)) await writeIndex(ids.filter((x) => x !== id))
}

export async function enqueueMutation(item: QueuedMutation): Promise<void> {
  try {
    await SecureStore.setItemAsync(itemKey(item.id), JSON.stringify(item))
  } catch {
    return // sem persistência, não indexa
  }
  const ids = await readIndex()
  if (!ids.includes(item.id)) {
    ids.push(item.id)
    await writeIndex(ids)
  }
}

export async function getQueuedMutations(): Promise<QueuedMutation[]> {
  const ids = await readIndex()
  const items: QueuedMutation[] = []
  for (const id of ids) {
    const it = await readItem(id)
    if (it) items.push(it)
  }
  return items.sort((a, b) => a.createdAt - b.createdAt)
}

export async function getQueuedCount(): Promise<number> {
  return (await readIndex()).length
}

export async function clearQueue(): Promise<void> {
  const ids = await readIndex()
  for (const id of ids) {
    try {
      await SecureStore.deleteItemAsync(itemKey(id))
    } catch {
      // best-effort
    }
  }
  await writeIndex([])
}

/**
 * Envia o POST agora; se falhar por rede (offline/timeout), enfileira para
 * replay e RESOLVE como sucesso (o update otimista permanece). Erros
 * permanentes (4xx) são relançados para que o chamador faça rollback.
 */
export async function sendOrQueue(args: {
  type: QueuedMutationType
  path: string
  payload: Record<string, unknown> & { id: string }
}): Promise<{ queued: boolean }> {
  const code = useAuthStore.getState().accessCode
  try {
    await portalApi.post(args.path, args.payload)
    return { queued: false }
  } catch (e) {
    const offline = !(e instanceof ApiError) // fetch lançou → sem rede
    const serverBusy = e instanceof ApiError && (e.status >= 500 || e.status === 408 || e.status === 429)
    if ((offline || serverBusy) && code) {
      await enqueueMutation({
        id: args.payload.id,
        type: args.type,
        code,
        path: args.path,
        payload: args.payload,
        createdAt: Date.now(),
        attempts: 0,
      })
      return { queued: true }
    }
    throw e // 4xx (ou sem accessCode) → erro real, deixa o chamador reverter
  }
}

let flushing = false

/**
 * Drena a fila (uma vez). Processa apenas itens do `code` atual. Em erro de
 * rede para o flush (tenta no próximo gatilho); em 5xx conta tentativa e
 * segue; em 4xx descarta o item. Chama `onSynced` se algo foi resolvido.
 */
export async function flushQueue(opts: { code: string; onSynced?: () => void }): Promise<void> {
  if (flushing) return
  flushing = true
  try {
    const items = await getQueuedMutations()
    let syncedAny = false
    for (const item of items) {
      if (item.code !== opts.code) continue
      try {
        await portalApi.post(item.path, item.payload)
        await deleteItem(item.id)
        syncedAny = true
      } catch (e) {
        if (e instanceof ApiError) {
          const serverBusy = e.status >= 500 || e.status === 408 || e.status === 429
          if (serverBusy) {
            const next = item.attempts + 1
            if (next >= MAX_ATTEMPTS) {
              await deleteItem(item.id)
              syncedAny = true
            } else {
              await enqueueMutation({ ...item, attempts: next })
            }
            continue // servidor instável: tenta os demais
          }
          // 4xx permanente → descarta
          await deleteItem(item.id)
          syncedAny = true
          continue
        }
        break // offline (fetch lançou) → para; tenta no próximo reconnect
      }
    }
    if (syncedAny) opts.onSynced?.()
  } finally {
    flushing = false
  }
}
