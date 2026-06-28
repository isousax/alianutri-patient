import type { WeatherData } from './weather'

// ── Types ──

export interface HydrationProfile {
  weight_kg?: number | null
  height_cm?: number | null
  birth_date?: string | null   // YYYY-MM-DD
  gender?: string | null       // 'M' | 'F' | null
}

export interface HydrationResult {
  goal_ml: number
  message: string
  factors: string[]
  isPersonalized: boolean
}

// ── Helpers ──

function ageFromBirthDate(birth: string): number {
  const today = new Date()
  const b = new Date(birth + 'T00:00:00')
  let age = today.getFullYear() - b.getFullYear()
  const m = today.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--
  return age
}

/**
 * Ajuste climático EFÊMERO do dia ("+X ml hoje") — quanto beber a mais por causa
 * de calor/ar seco. NÃO entra na meta oficial (que vem do servidor); é só uma
 * sugestão do dia. Espelha a régua de clima de `calculateHydrationGoal`.
 */
export function weatherBonusMl(weather: WeatherData | null): number {
  if (!weather) return 0
  let bonus = 0
  const temp = weather.apparentTemperature ?? weather.temperature
  if (temp >= 33) bonus += 600
  else if (temp >= 28) bonus += 400
  else if (temp >= 23) bonus += 200
  if (weather.humidity < 30) bonus += weather.humidity < 20 ? 300 : 200
  return bonus
}

// ── Calculator ──

/**
 * Calculates a personalized daily hydration goal based on biometrics and weather.
 *
 * Base: weight × 35 ml/kg (common guideline)
 * Adjustments for temperature, humidity, age, and activity (if available).
 *
 * Falls back to 2000ml if no profile data is available.
 */
export function calculateHydrationGoal(
  profile: HydrationProfile,
  weather: WeatherData | null,
): HydrationResult {
  const factors: string[] = []

  // ── Base ──
  let goal: number
  if (profile.weight_kg && profile.weight_kg > 0) {
    const byWeight = profile.weight_kg * 35
    goal = Math.max(byWeight, 2000)
    factors.push(`Peso (${profile.weight_kg}kg × 35ml${byWeight < 2000 ? ', mín. 2L' : ''})`)
  } else {
    goal = 2000
  }

  // ── Temperature ──
  if (weather) {
    const temp = weather.apparentTemperature ?? weather.temperature
    if (temp >= 33) {
      goal += 600
      factors.push(`Calor intenso ${Math.round(temp)}°C (+600ml)`)
    } else if (temp >= 28) {
      goal += 400
      factors.push(`Dia quente ${Math.round(temp)}°C (+400ml)`)
    } else if (temp >= 23) {
      goal += 200
      factors.push(`Temperatura amena ${Math.round(temp)}°C (+200ml)`)
    }
  }

  // ── Humidity ──
  if (weather && weather.humidity < 30) {
    const extra = weather.humidity < 20 ? 300 : 200
    goal += extra
    factors.push(`Ar seco ${weather.humidity}% (+${extra}ml)`)
  }

  // ── Age ──
  if (profile.birth_date) {
    const age = ageFromBirthDate(profile.birth_date)
    if (age > 65) {
      goal -= 200
      factors.push(`Idade ${age} anos (-200ml)`)
    } else if (age < 18 && profile.weight_kg) {
      // Younger people: slightly higher per kg
      goal += 100
      factors.push(`Jovem ${age} anos (+100ml)`)
    }
  }

  // ── Clamp & round ──
  goal = Math.max(2000, Math.min(4500, goal))
  goal = Math.round(goal / 50) * 50 // round to nearest 50ml

  // ── Contextual message ──
  const message = hydrationMessage(weather)

  const isPersonalized = factors.length > 0
  return { goal_ml: goal, message, factors, isPersonalized }
}

// ── Message builder ──

export function hydrationMessage(weather: WeatherData | null): string {
  if (!weather) return 'Mantenha-se hidratado ao longo do dia!'

  const t = weather.apparentTemperature ?? weather.temperature

  if (t >= 33)
    return 'Dia muito quente! Priorize a hidratação e evite longos períodos sem beber água 🥵'
  if (t >= 28)
    return `Sensação ${Math.round(t)}°C — beba água com mais frequência hoje ☀️`
  if (t >= 23)
    return `Temperatura agradável (${Math.round(t)}°C), boa hidratação! 😊`
  if (t >= 15)
    return `Sensação ${Math.round(t)}°C hoje — não esqueça da água mesmo sem calor 🌤️`
  if (t < 15)
    return `Friozinho de ${Math.round(t)}°C, mas seu corpo ainda precisa de água! 🧣`

  return 'Mantenha-se hidratado ao longo do dia!'
}
