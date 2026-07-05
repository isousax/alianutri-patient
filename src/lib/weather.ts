// ── Types ──

export interface WeatherData {
  temperature: number        // °C
  humidity: number           // %
  apparentTemperature: number // feels-like °C
  weatherCode: number
  description: string
  icon: string               // emoji
}

// ── Fetch helpers (with timeout) ──
// Caching + persistência são do React Query (ver useWeather). Este módulo só
// busca; em falha LANÇA, para o React Query preservar o último valor bom.

const GEO_TIMEOUT_MS = 5000
const WEATHER_TIMEOUT_MS = 5000

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { signal: ctrl.signal })
  } finally {
    clearTimeout(timer)
  }
}

// ── Weather code mapping ──

const WMO_MAP: Record<number, { desc: string; icon: string }> = {
  0:  { desc: 'Céu limpo', icon: '☀️' },
  1:  { desc: 'Poucas nuvens', icon: '🌤️' },
  2:  { desc: 'Parcialmente nublado', icon: '⛅' },
  3:  { desc: 'Nublado', icon: '☁️' },
  45: { desc: 'Neblina', icon: '🌫️' },
  48: { desc: 'Neblina gelada', icon: '🌫️' },
  51: { desc: 'Garoa leve', icon: '🌦️' },
  53: { desc: 'Garoa', icon: '🌦️' },
  55: { desc: 'Garoa forte', icon: '🌧️' },
  61: { desc: 'Chuva leve', icon: '🌧️' },
  63: { desc: 'Chuva', icon: '🌧️' },
  65: { desc: 'Chuva forte', icon: '🌧️' },
  71: { desc: 'Neve leve', icon: '🌨️' },
  73: { desc: 'Neve', icon: '❄️' },
  75: { desc: 'Neve forte', icon: '❄️' },
  80: { desc: 'Pancadas leves', icon: '🌦️' },
  81: { desc: 'Pancadas', icon: '🌧️' },
  82: { desc: 'Pancadas fortes', icon: '⛈️' },
  95: { desc: 'Trovoadas', icon: '⛈️' },
  96: { desc: 'Trovoadas com granizo', icon: '⛈️' },
  99: { desc: 'Trovoadas severas', icon: '⛈️' },
}

const WMO_NIGHT: Record<number, string> = {
  0: '🌙',
  1: '🌙',
  2: '☁️',
}

function decodeWMO(code: number, isDay = true): { desc: string; icon: string } {
  const entry = WMO_MAP[code] ?? { desc: 'Indisponível', icon: '🌡️' }
  const icon = !isDay && code in WMO_NIGHT ? WMO_NIGHT[code] : entry.icon
  return { desc: entry.desc, icon }
}

// ── IP-based geolocation (no permissions, works in Expo Go) ──

async function getCoords(): Promise<{ lat: number; lon: number }> {
  const res = await fetchWithTimeout('https://ipwho.is/', GEO_TIMEOUT_MS)
  if (!res.ok) throw new Error(`GEO_HTTP_${res.status}`)
  const json = await res.json()
  if (!json?.success) throw new Error('GEO_UNAVAILABLE')
  return { lat: json.latitude, lon: json.longitude }
}

// ── Public API ──

export async function fetchWeather(): Promise<WeatherData> {
  const coords = await getCoords()

  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${coords.lat}&longitude=${coords.lon}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,is_day` +
    `&timezone=auto`

  const res = await fetchWithTimeout(url, WEATHER_TIMEOUT_MS)
  if (!res.ok) throw new Error(`WEATHER_HTTP_${res.status}`)

  const json = await res.json()
  const c = json?.current
  if (!c || c.temperature_2m == null) throw new Error('WEATHER_EMPTY')
  const wmo = decodeWMO(c.weather_code, c.is_day === 1)

  return {
    temperature: c.temperature_2m,
    humidity: c.relative_humidity_2m,
    apparentTemperature: c.apparent_temperature,
    weatherCode: c.weather_code,
    description: wmo.desc,
    icon: wmo.icon,
  }
}
