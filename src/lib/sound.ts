import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio'

// ══════════════════════════════════════════════════════
//  Efeitos sonoros de gamificação (espelha src/lib/haptics.ts)
//  Fire-and-forget: NUNCA lança (web/dispositivo sem áudio → no-op).
//  Players ficam em cache p/ baixa latência e sincronia com a animação.
//  Respeita o botão de silêncio do device — a celebração não "fura" o mudo.
//  Assets em assets/audio/.
// ══════════════════════════════════════════════════════

const SOURCES = {
  medalUnlock: require('../../assets/audio/desbloqueio-medalhas.mp3'),
  levelUp: require('../../assets/audio/level-up.mp3'),
} as const

export type SoundKey = keyof typeof SOURCES

// Volume por som (0..1) — discreto/premium; calibre aqui se precisar.
const VOLUME: Record<SoundKey, number> = {
  medalUnlock: 0.8,
  levelUp: 0.9,
}

const players: Partial<Record<SoundKey, AudioPlayer>> = {}
let audioModeReady = false

function ensureAudioMode() {
  if (audioModeReady) return
  audioModeReady = true
  // playsInSilentMode:false → respeita o mudo do usuário (iOS). Sem background.
  setAudioModeAsync({ playsInSilentMode: false, shouldPlayInBackground: false }).catch(() => {})
}

function getPlayer(key: SoundKey): AudioPlayer {
  const cached = players[key]
  if (cached) return cached
  const p = createAudioPlayer(SOURCES[key])
  p.volume = VOLUME[key]
  players[key] = p
  return p
}

export const sound = {
  /** Toca um efeito do início. Silencioso em caso de falha. */
  play(key: SoundKey) {
    try {
      ensureAudioMode()
      const p = getPlayer(key)
      p.volume = VOLUME[key]
      Promise.resolve(p.seekTo(0)).catch(() => {})
      p.play()
    } catch {}
  },
  /** Para e rebobina — usado ao fechar a celebração antes do fim. */
  stop(key: SoundKey) {
    try {
      const p = players[key]
      if (!p) return
      p.pause()
      Promise.resolve(p.seekTo(0)).catch(() => {})
    } catch {}
  },
  /** Libera os players em memória (opcional; ex.: logout). */
  release() {
    ;(Object.keys(players) as SoundKey[]).forEach((k) => {
      try {
        players[k]?.remove()
      } catch {}
      delete players[k]
    })
  },
}
