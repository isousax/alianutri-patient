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
