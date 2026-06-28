// Gera ids compatíveis com o backend (nanoid: 21 chars do alfabeto URL-safe).
// O backend valida com /^[A-Za-z0-9_-]{21}$/ (isValidId) e faz upsert por id,
// então um id estável de cliente garante replay idempotente da fila offline.
//
// Não usamos expo-crypto (não instalado): para um id de LINHA (não segredo),
// Math.random tem entropia de sobra contra colisões no escopo de um paciente.

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-' // 64 chars

export function generateClientId(): string {
  let id = ''
  for (let i = 0; i < 21; i++) {
    id += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  }
  return id
}
