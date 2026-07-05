import type { ImageSource } from 'expo-image'

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://api.alianutri.com.br'

export type PhotoVariant = 'original' | 'medium' | 'thumb'

/**
 * URL de uma variante da foto de um post do diário.
 * Servida direto do R2 (cada variante é um arquivo) — sem Cloudflare Image Resizing.
 * - thumb  (~200px): grid + preview na Home
 * - medium (~600px): timeline do feed
 * - original (~1200px): fullscreen / detalhe
 */
export function diaryPhotoUrl(
  accessCode: string | null,
  postId: string,
  variant: PhotoVariant = 'medium',
): string {
  return `${API_BASE}/p/${accessCode}/diary/posts/${postId}/photo/${variant}`
}

/**
 * Anexa o header de sessão device-bound (S-2) a uma imagem servida pela rota
 * autenticada do portal. O `expo-image` só envia headers via `source.headers`
 * (o loader nativo não passa pelo `api.ts`); sem isso a imagem recebe 401
 * (PAIRING_REQUIRED) e falha silenciosamente. O cache usa a `uri` como chave →
 * o token (só autenticação) não fragmenta o cache nem invalida ao re-parear.
 */
function withSession(uri: string, sessionToken: string | null): ImageSource {
  return sessionToken ? { uri, headers: { 'X-Patient-Session': sessionToken } } : { uri }
}

/**
 * Source do `expo-image` para QUALQUER imagem servida por proxy autenticado do
 * portal (`/p/:code/...`) — post do diário, foto de refeição, foto de progresso.
 * NÃO é necessário para URLs absolutas de R2 (ex.: `profile_photo_url`).
 * `path` deve começar com '/'.
 */
export function portalImageSource(
  accessCode: string | null,
  sessionToken: string | null,
  path: string,
): ImageSource {
  return withSession(`${API_BASE}/p/${accessCode}${path}`, sessionToken)
}

/** Source da foto de um post do diário (variante), com header de sessão. */
export function diaryPhotoSource(
  accessCode: string | null,
  sessionToken: string | null,
  postId: string,
  variant: PhotoVariant = 'medium',
): ImageSource {
  return withSession(diaryPhotoUrl(accessCode, postId, variant), sessionToken)
}
