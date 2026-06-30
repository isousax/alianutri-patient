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

/**
 * Gera 3 variantes de tamanho a partir da URI de uma foto, no próprio app
 * (expo-image-manipulator — funciona no Expo Go). A compressão acontece aqui,
 * então NÃO precisamos do Cloudflare Image Resizing (que é pago por transformação).
 */
export async function generateImageVariants(uri: string): Promise<ImageVariants> {
  const [original, medium, thumb] = await Promise.all([
    manipulateAsync(uri, [{ resize: { width: 1200 } }], { compress: 0.7, format: SaveFormat.JPEG }),
    manipulateAsync(uri, [{ resize: { width: 600 } }], { compress: 0.65, format: SaveFormat.JPEG }),
    manipulateAsync(uri, [{ resize: { width: 220 } }], { compress: 0.6, format: SaveFormat.JPEG }),
  ])
  return { original, medium, thumb }
}
