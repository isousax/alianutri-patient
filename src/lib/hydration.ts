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
    goal = profile.weight_kg * 35
    factors.push(`Peso (${profile.weight_kg}kg × 35ml)`)
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
  goal = Math.max(1500, Math.min(4500, goal))
  goal = Math.round(goal / 50) * 50 // round to nearest 50ml

  // ── Contextual message ──
  const message = buildMessage(weather)

  const isPersonalized = factors.length > 0
  return { goal_ml: goal, message, factors, isPersonalized }
}

// ── Message builder ──

function buildMessage(weather: WeatherData | null): string {
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
