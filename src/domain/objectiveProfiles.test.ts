import { describe, it, expect } from 'vitest'
import {
  NUTRITIONAL_OBJECTIVES,
  OBJECTIVE_TONE,
  getObjectiveTone,
  interpretWeightChange,
  weightToneColor,
  type NutritionalObjective,
} from './objectiveProfiles'

// CONTRATO: esta lista canônica é a MESMA dos testes de web
// (alianutri-web/src/lib/objectiveProfiles.test.ts) e api
// (alianutri-api/test/objectiveProfiles.test.ts). Divergência do enum entre os
// repos falha aqui (patient) ou lá — é o guard de paridade cross-repo (§8).
const CANONICAL: NutritionalObjective[] = [
  'weight_loss',
  'maintenance',
  'muscle_gain',
  'performance',
  'clinical',
  'gestational',
  'longevity',
  'behavioral',
  'dietary_transition',
]

describe('objetivos (patient) — paridade com o contrato canônico', () => {
  it('NUTRITIONAL_OBJECTIVES tem exatamente os 9 canônicos', () => {
    expect([...NUTRITIONAL_OBJECTIVES].sort()).toEqual([...CANONICAL].sort())
  })

  it('OBJECTIVE_TONE cobre os 9 com framing/icon/label preenchidos', () => {
    expect(Object.keys(OBJECTIVE_TONE).sort()).toEqual([...CANONICAL].sort())
    for (const id of CANONICAL) {
      const tone = OBJECTIVE_TONE[id]
      expect(tone.framing.length).toBeGreaterThan(0)
      expect(tone.icon.length).toBeGreaterThan(0)
      expect(tone.label.length).toBeGreaterThan(0)
    }
  })
})

describe('getObjectiveTone — degradação neutra', () => {
  it('objetivo conhecido retorna o tom', () => {
    expect(getObjectiveTone('gestational')?.framing).toBe('Cuidando de vocês dois')
  })

  it('null/undefined/desconhecido → null (sem ifs no consumidor)', () => {
    expect(getObjectiveTone(null)).toBeNull()
    expect(getObjectiveTone(undefined)).toBeNull()
    expect(getObjectiveTone('banana' as NutritionalObjective)).toBeNull()
  })
})

describe('interpretWeightChange (F5) — espelha o helper do web', () => {
  it('loss_is_progress: perder é positivo, ganhar é negativo', () => {
    expect(interpretWeightChange('loss_is_progress', -1).tone).toBe('positive')
    expect(interpretWeightChange('loss_is_progress', 1).tone).toBe('negative')
  })

  it('gain_is_progress: ganhar é positivo, perder é negativo', () => {
    expect(interpretWeightChange('gain_is_progress', 1).tone).toBe('positive')
    expect(interpretWeightChange('gain_is_progress', -1).tone).toBe('negative')
  })

  it('stability_is_progress: estável é positivo; mudança é neutra', () => {
    expect(interpretWeightChange('stability_is_progress', 0).tone).toBe('positive')
    expect(interpretWeightChange('stability_is_progress', 1).tone).toBe('neutral')
    expect(interpretWeightChange('stability_is_progress', -1).tone).toBe('neutral')
  })

  it('de_emphasized: sempre neutro (peso nunca em vermelho)', () => {
    expect(interpretWeightChange('de_emphasized', -2).tone).toBe('neutral')
    expect(interpretWeightChange('de_emphasized', 2).tone).toBe('neutral')
    expect(interpretWeightChange('de_emphasized', 0).tone).toBe('neutral')
  })

  it('sem semântica (null/undefined): legado — perder é positivo', () => {
    expect(interpretWeightChange(null, -1).tone).toBe('positive')
    expect(interpretWeightChange(undefined, 1).tone).toBe('negative')
  })

  it('direção reflete o sinal do delta', () => {
    expect(interpretWeightChange('loss_is_progress', -1).direction).toBe('down')
    expect(interpretWeightChange('loss_is_progress', 1).direction).toBe('up')
    expect(interpretWeightChange('loss_is_progress', 0).direction).toBe('stable')
  })
})

describe('weightToneColor — mapeia o tom para o token do tema', () => {
  const colors = { positive: 'GREEN', negative: 'AMBER', neutral: 'GRAY' }

  it('positive→positive, negative→negative, neutral→neutral', () => {
    expect(weightToneColor('positive', colors)).toBe('GREEN')
    expect(weightToneColor('negative', colors)).toBe('AMBER')
    expect(weightToneColor('neutral', colors)).toBe('GRAY')
  })
})
