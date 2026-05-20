import * as ImageManipulator from 'expo-image-manipulator'

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
    const context = ImageManipulator.manipulate(uri)
    context.resize({ width: MAX_SIZE })
    const image = await context.renderAsync()
    const result = await image.saveAsync({
      format: ImageManipulator.SaveFormat.JPEG,
      compress: QUALITY,
    })
    return result.uri
  } catch (err) {
    console.warn('[compressImage] Falha na compressão, usando original:', err)
    return uri
  }
}
