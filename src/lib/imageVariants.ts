import { manipulateAsync, SaveFormat } from 'expo-image-manipulator'

export interface ImageVariant {
  uri: string
  width: number
  height: number
}

export interface ImageVariants {
  original: ImageVariant // ~1200px (fullscreen)
  medium: ImageVariant // ~600px (timeline + IA)
  thumb: ImageVariant // ~200px (grid + preview)
}

/** Redimensiona/comprime uma variante; se o manipulador falhar, usa a foto original. */
async function makeVariant(uri: string, width: number, compress: number): Promise<ImageVariant> {
  try {
    return await manipulateAsync(uri, [{ resize: { width } }], { compress, format: SaveFormat.JPEG })
  } catch (err) {
    console.warn(`[generateImageVariants] Falha ao gerar variante ${width}px, usando original:`, err)
    return { uri, width: 0, height: 0 }
  }
}

/**
 * Gera 3 variantes de tamanho a partir da URI de uma foto, no próprio app
 * (expo-image-manipulator — funciona no Expo Go). A compressão acontece aqui,
 * então NÃO precisamos do Cloudflare Image Resizing (que é pago por transformação).
 *
 * Resiliente: se o manipulador falhar (imagem grande, HEIC, erro nativo), cada
 * variante cai para a foto ORIGINAL em vez de derrubar a publicação inteira — a
 * API aceita `photo_original` e faz medium/thumb caírem para ela.
 */
export async function generateImageVariants(uri: string): Promise<ImageVariants> {
  const [original, medium, thumb] = await Promise.all([
    makeVariant(uri, 1200, 0.7),
    makeVariant(uri, 600, 0.65),
    makeVariant(uri, 220, 0.6),
  ])
  return { original, medium, thumb }
}
