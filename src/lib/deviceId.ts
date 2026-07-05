import * as Crypto from 'expo-crypto'

// ══════════════════════════════════════════════════════════════
//  device_id — identificador da INSTALAÇÃO (S-2, pareamento).
//
//  NÃO é segredo: serve só para vincular a sessão a este app/instalação.
//  O token de sessão (esse sim sensível) é gerado no SERVIDOR com CSPRNG.
//
//  Fonte primária: expo-crypto (Crypto.randomUUID, CSPRNG nativo). Fallback
//  defensivo (crypto.getRandomValues → Math.random) cobre ambientes onde o
//  módulo nativo não estiver disponível; um id de instalação persistido uma
//  única vez tolera essa raríssima degradação.
// ══════════════════════════════════════════════════════════════

function randomBytes(len: number): Uint8Array {
  const bytes = new Uint8Array(len)
  const g = (globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } }).crypto
  if (g?.getRandomValues) {
    g.getRandomValues(bytes)
  } else {
    for (let i = 0; i < len; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  return bytes
}

/** Gera um UUID v4 (formato canônico com hífens). */
export function generateUuidV4(): string {
  try {
    return Crypto.randomUUID()
  } catch {
    return fallbackUuidV4()
  }
}

function fallbackUuidV4(): string {
  const b = randomBytes(16)
  b[6] = (b[6] & 0x0f) | 0x40 // versão 4
  b[8] = (b[8] & 0x3f) | 0x80 // variante RFC 4122
  const hex = Array.from(b, (x) => x.toString(16).padStart(2, '0'))
  return (
    hex.slice(0, 4).join('') +
    '-' +
    hex.slice(4, 6).join('') +
    '-' +
    hex.slice(6, 8).join('') +
    '-' +
    hex.slice(8, 10).join('') +
    '-' +
    hex.slice(10, 16).join('')
  )
}
