// Gera ids compatíveis com o backend (nanoid: 21 chars do alfabeto URL-safe).
// O backend valida com /^[A-Za-z0-9_-]{21}$/ (isValidId) e faz upsert por id,
// então o id de linha garante replay idempotente da fila offline.
//
// Entropia via expo-crypto (CSPRNG). Fallback defensivo para Math.random caso
// o módulo nativo não esteja disponível — id de LINHA (não segredo) tolera.
import * as Crypto from 'expo-crypto'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-' // 64 chars

function randomBytes(len: number): Uint8Array {
  try {
    return Crypto.getRandomBytes(len)
  } catch {
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) bytes[i] = Math.floor(Math.random() * 256)
    return bytes
  }
}

export function generateClientId(): string {
  const bytes = randomBytes(21)
  let id = ''
  for (let i = 0; i < 21; i++) {
    id += ALPHABET[bytes[i] & 63] // 64 = 2^6 → mapa uniforme, sem viés de módulo
  }
  return id
}
