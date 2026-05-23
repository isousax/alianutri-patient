import { useQuery } from '@tanstack/react-query'
import { fetchWeather, type WeatherData } from '../lib/weather'

/**
 * Fetches current weather based on user location (Open-Meteo, no API key).
 * Stale for 30 min, cached for 1 hour. Returns null gracefully if location
 * permission is denied or network fails.
 */
export function useWeather() {
  return useQuery<WeatherData | null>({
    queryKey: ['weather', 'v21'],
    queryFn: fetchWeather,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  })
}
