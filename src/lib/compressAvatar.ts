import { manipulateAsync, SaveFormat } from 'expo-image-manipulator'

const AVATAR_SIZE = 512
const QUALITY = 0.75

/**
 * Prepara uma imagem para uso como avatar (foto de perfil):
 * - Redimensiona para caber em AVATAR_SIZE mantendo a proporção
 * - Converte para JPEG (aplica a orientação EXIF automaticamente, evitando
 *   fotos "deitadas" tiradas da câmera)
 *
 * O recorte quadrado é feito antes, pelo ImagePicker (allowsEditing + aspect 1:1).
 * Se o manipulador falhar, retorna a URI original — o servidor ainda valida e
 * faz o strip de EXIF, então nunca ficamos sem foto por causa da compressão.
 *
 * @param uri  URI local vinda do ImagePicker
 * @returns    URI da imagem JPEG processada
 */
export async function compressAvatar(uri: string): Promise<string> {
  try {
    const result = await manipulateAsync(
      uri,
      [{ resize: { width: AVATAR_SIZE } }],
      { format: SaveFormat.JPEG, compress: QUALITY },
    )
    return result.uri
  } catch (err) {
    console.warn('[compressAvatar] Falha na compressão, usando original:', err)
    return uri
  }
}
