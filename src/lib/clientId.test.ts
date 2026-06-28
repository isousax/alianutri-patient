import { describe, it, expect } from 'vitest'
import { generateClientId } from './clientId'

const NANOID_RE = /^[A-Za-z0-9_-]{21}$/

describe('generateClientId', () => {
  it('gera ids no formato nanoid (21 chars URL-safe)', () => {
    for (let i = 0; i < 500; i++) {
      expect(generateClientId()).toMatch(NANOID_RE)
    }
  })

  it('gera ids únicos em massa (sem colisão prática)', () => {
    const set = new Set<string>()
    for (let i = 0; i < 10000; i++) set.add(generateClientId())
    expect(set.size).toBe(10000)
  })
})
