import { useQuery } from '@tanstack/react-query'
import { fetchWeather, type WeatherData } from '../lib/weather'

/**
 * Weather com estado semântico. O React Query mantém o último valor bom em
 * memória e no disco (persist, 24h); fetchWeather LANÇA em falha, então um erro
 * nunca sobrescreve/persiste por cima do último clima conhecido.
 *
 * - loading:     primeira busca, sem valor conhecido ainda
 * - ok:          valor atual (última busca teve sucesso)
 * - stale:       temos o último valor conhecido, mas a busca mais recente falhou
 * - unavailable: nunca obtivemos clima (ex.: 1ª abertura offline / local negado)
 */
export type WeatherStatus = 'loading' | 'ok' | 'stale' | 'unavailable'

export interface WeatherState {
  weather: WeatherData | null
  status: WeatherStatus
  updatedAt: number | null
}

export function useWeather(): WeatherState {
  const q = useQuery({
    queryKey: ['weather', 'v22'],
    queryFn: fetchWeather,
    staleTime: 30 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  })

  const weather = q.data ?? null
  const status: WeatherStatus = weather
    ? q.isError
      ? 'stale'
      : 'ok'
    : q.isLoading
      ? 'loading'
      : 'unavailable'

  return { weather, status, updatedAt: weather ? q.dataUpdatedAt : null }
}
