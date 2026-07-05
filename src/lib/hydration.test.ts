import { describe, it, expect } from 'vitest'
import { weatherBonusMl, calculateHydrationGoal, hydrationMessage } from './hydration'
import type { WeatherData } from './weather'

// Builder de clima — só os campos que o cálculo lê importam.
const W = (over: Partial<WeatherData> = {}): WeatherData => ({
  temperature: 20,
  humidity: 50,
  apparentTemperature: 20,
  weatherCode: 0,
  description: '',
  icon: '',
  ...over,
})

describe('weatherBonusMl', () => {
  it('sem clima → 0', () => {
    expect(weatherBonusMl(null)).toBe(0)
  })

  it('faixas de temperatura (23/28/33)', () => {
    expect(weatherBonusMl(W({ apparentTemperature: 22 }))).toBe(0)
    expect(weatherBonusMl(W({ apparentTemperature: 23 }))).toBe(200)
    expect(weatherBonusMl(W({ apparentTemperature: 28 }))).toBe(400)
    expect(weatherBonusMl(W({ apparentTemperature: 33 }))).toBe(600)
  })

  it('usa a sensação térmica (apparent) no lugar da temperatura seca', () => {
    expect(weatherBonusMl(W({ temperature: 18, apparentTemperature: 30 }))).toBe(400)
  })

  it('ar seco: <30% → +200, <20% → +300', () => {
    expect(weatherBonusMl(W({ apparentTemperature: 20, humidity: 25 }))).toBe(200)
    expect(weatherBonusMl(W({ apparentTemperature: 20, humidity: 15 }))).toBe(300)
  })

  it('soma calor + ar seco', () => {
    expect(weatherBonusMl(W({ apparentTemperature: 34, humidity: 10 }))).toBe(900)
  })
})

describe('calculateHydrationGoal', () => {
  it('sem peso e sem clima → 2000 e não personalizado', () => {
    const r = calculateHydrationGoal({}, null)
    expect(r.goal_ml).toBe(2000)
    expect(r.isPersonalized).toBe(false)
    expect(r.factors).toEqual([])
    expect(r.message).toBeTruthy()
  })

  it('peso × 35 com piso de 2000', () => {
    expect(calculateHydrationGoal({ weight_kg: 80 }, null).goal_ml).toBe(2800)
    expect(calculateHydrationGoal({ weight_kg: 40 }, null).goal_ml).toBe(2000)
  })

  it('personaliza quando há qualquer fator', () => {
    const r = calculateHydrationGoal({ weight_kg: 80 }, null)
    expect(r.isPersonalized).toBe(true)
    expect(r.factors.length).toBeGreaterThan(0)
  })

  it('soma ajuste de calor e de ar seco', () => {
    expect(calculateHydrationGoal({ weight_kg: 80 }, W({ apparentTemperature: 34 })).goal_ml).toBe(3400)
    expect(calculateHydrationGoal({ weight_kg: 80 }, W({ apparentTemperature: 20, humidity: 15 })).goal_ml).toBe(3100)
  })

  it('arredonda para o múltiplo de 50 mais próximo', () => {
    // 71 × 35 = 2485 → 2500
    expect(calculateHydrationGoal({ weight_kg: 71 }, null).goal_ml).toBe(2500)
  })

  it('faz clamp no teto de 4500ml', () => {
    expect(calculateHydrationGoal({ weight_kg: 200 }, null).goal_ml).toBe(4500)
  })

  it('idade > 65 reduz 200ml', () => {
    const r = calculateHydrationGoal({ weight_kg: 80, birth_date: '1950-01-01' }, null)
    expect(r.goal_ml).toBe(2600)
    expect(r.factors.some((f) => f.includes('Idade'))).toBe(true)
  })

  it('menor de 18 (com peso) soma 100ml', () => {
    const r = calculateHydrationGoal({ weight_kg: 60, birth_date: '2015-01-01' }, null)
    expect(r.goal_ml).toBe(2200)
    expect(r.factors.some((f) => f.includes('Jovem'))).toBe(true)
  })
})

describe('hydrationMessage', () => {
  it('sem clima → mensagem neutra', () => {
    expect(hydrationMessage(null)).toBe('Mantenha-se hidratado ao longo do dia!')
  })

  it('escolhe a mensagem pela faixa de sensação térmica', () => {
    expect(hydrationMessage(W({ apparentTemperature: 34 }))).toContain('muito quente')
    expect(hydrationMessage(W({ apparentTemperature: 29 }))).toContain('mais frequência')
    expect(hydrationMessage(W({ apparentTemperature: 24 }))).toContain('agradável')
    expect(hydrationMessage(W({ apparentTemperature: 18 }))).toContain('não esqueça')
    expect(hydrationMessage(W({ apparentTemperature: 10 }))).toContain('Friozinho')
  })
})
