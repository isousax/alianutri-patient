import { manipulateAsync, SaveFormat } from 'expo-image-manipulator'

const MAX_SIZE = 1280
const QUALITY = 0.6

/**
 * Compresses an image: resizes to fit within MAX_SIZE and converts to JPEG.
 * Equivalent to the web's compressImage() utility.
 *
 * @param uri  Local file URI from ImagePicker
 * @returns    URI of the compressed JPEG image
 */
export async function compressImage(uri: string): Promise<string> {
  try {
    const result = await manipulateAsync(
      uri,
      [{ resize: { width: MAX_SIZE } }],
      { format: SaveFormat.JPEG, compress: QUALITY },
    )
    return result.uri
  } catch (err) {
    console.warn('[compressImage] Falha na compressão, usando original:', err)
    return uri
  }
}