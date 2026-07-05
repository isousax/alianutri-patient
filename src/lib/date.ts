// Util canônico de data/fuso do cliente (U-6).
//
// O backend registra o "dia civil" em BRT (America/São Paulo, UTC-3, sem horário
// de verão desde 2019). Portanto "hoje" e a aritmética de dias devem ser calculados
// em BRT — e NÃO no fuso do dispositivo — para evitar off-by-one perto da meia-noite
// (ex.: um device configurado em UTC ou em outro fuso registraria água/peso/diário
// no "dia" errado em relação ao servidor).
//
// Esta é a única fonte da verdade. `theme/tokens` e `lib/habit` reexportam/delegam
// para cá; código novo deve importar diretamente daqui.

const BRT_OFFSET_MS = 3 * 60 * 60 * 1000

/** Hoje em BRT no formato YYYY-MM-DD (casa com o dia civil do backend). */
export function todayBRT(): string {
  return new Date(Date.now() - BRT_OFFSET_MS).toISOString().slice(0, 10)
}

/** Alias histórico de {@link todayBRT}. Prefira `todayBRT()` em código novo. */
export const todayStr = todayBRT
/** Alias histórico de {@link todayBRT}. Prefira `todayBRT()` em código novo. */
export const todayISO = todayBRT

/**
 * Soma `days` (pode ser negativo) a uma data YYYY-MM-DD e devolve YYYY-MM-DD.
 * Aritmética ancorada ao meio-dia UTC → determinística e independente do fuso do
 * dispositivo (não sofre off-by-one na borda do dia).
 */
export function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Alias de {@link shiftDate}. */
export const addDays = shiftDate

/** Dia da semana como Mon=0 … Sun=6 para uma data YYYY-MM-DD (via UTC, sem drift). */
export function weekdayMon0(dateStr: string): number {
  const d = new Date(dateStr + 'T12:00:00Z')
  return (d.getUTCDay() + 6) % 7
}

/** Segunda-feira (YYYY-MM-DD) da semana que contém `dateStr`. */
export function mondayOf(dateStr: string): string {
  return shiftDate(dateStr, -weekdayMon0(dateStr))
}

/**
 * Rótulo curto de uma data YYYY-MM-DD: "04 de jul.".
 * Usa meia-noite local só para extrair os componentes do calendário (o rótulo é o
 * mesmo em qualquer fuso, pois a data já vem "sem hora").
 */
export function fmtDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

/** Rótulo com dia da semana: "qua., 04 de jul.". */
export function fmtDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
}
