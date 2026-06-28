// ══════════════════════════════════════════════════════
//  Badge "nova reação do nutri" — lógica pura e testável.
//  Sem imports de React/RN.
// ══════════════════════════════════════════════════════
import type { DiaryPost } from '../types/portal'

// author_type do profissional (ver alianutri-api diaryPostNutri.service.ts:
// authorType = role === 'assistant' ? 'assistant' : 'nutritionist').
const NUTRI_AUTHORS = new Set(['nutritionist', 'assistant'])

/**
 * Converte timestamp do backend em epoch ms.
 * O D1 grava CURRENT_TIMESTAMP no formato 'YYYY-MM-DD HH:MM:SS' (UTC, sem zona),
 * então normalizamos p/ ISO-UTC antes de parsear. Aceita também ISO já zonado.
 */
export function parseServerTs(s: string | null | undefined): number {
  if (!s) return 0
  const hasZone = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(s)
  const iso = (s.includes('T') ? s : s.replace(' ', 'T')) + (hasZone ? '' : 'Z')
  const ms = Date.parse(iso)
  return Number.isFinite(ms) ? ms : 0
}

/** Epoch ms do comentário do nutri/assistente mais recente; 0 se não houver. */
export function latestNutriCommentAt(posts: DiaryPost[]): number {
  let latest = 0
  for (const post of posts) {
    for (const c of post.comments ?? []) {
      if (!NUTRI_AUTHORS.has(c.author_type)) continue
      const ts = parseServerTs(c.created_at)
      if (ts > latest) latest = ts
    }
  }
  return latest
}

/**
 * Há comentário do nutri ainda não visto?
 *
 * Base em `created_at` de COMENTÁRIOS — reações (DiaryPostReaction) não têm
 * timestamp na API, então não disparam o badge (limitação conhecida).
 */
export function hasUnseenNutriActivity(posts: DiaryPost[], seenAt: number): boolean {
  return latestNutriCommentAt(posts) > seenAt
}
