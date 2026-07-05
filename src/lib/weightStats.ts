// Estatísticas puras de peso (P-4 — "transformar dado em narrativa").
// Sem dependências de UI → fáceis de testar (T-6).

export interface DatedValue {
  date: string // YYYY-MM-DD
  value: number
}

/**
 * Média móvel simples "trailing" (janela terminando no índice atual).
 * Retorna um array do mesmo tamanho de `values`; os primeiros pontos usam uma
 * janela menor (não há dados anteriores suficientes), o que evita "buracos" no
 * início da linha suavizada.
 */
export function movingAverage(values: number[], window: number): number[] {
  if (window < 1) return [...values]
  const out: number[] = []
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - window + 1)
    let sum = 0
    for (let j = start; j <= i; j++) sum += values[j]
    out.push(sum / (i - start + 1))
  }
  return out
}

const DAY_MS = 86400000

/**
 * Velocidade em kg/semana via regressão linear (mínimos quadrados) sobre pontos
 * datados. Positivo = ganhando; negativo = perdendo. `null` se < 2 pontos ou
 * sem variação de tempo.
 */
export function weeklyRate(points: DatedValue[]): number | null {
  if (points.length < 2) return null
  const t0 = new Date(points[0].date + 'T00:00:00').getTime()
  if (Number.isNaN(t0)) return null

  const xs: number[] = []
  const ys: number[] = []
  for (const p of points) {
    const ts = new Date(p.date + 'T00:00:00').getTime()
    if (Number.isNaN(ts)) return null
    xs.push((ts - t0) / DAY_MS) // dias desde o primeiro ponto
    ys.push(p.value)
  }

  const n = xs.length
  const sx = xs.reduce((a, b) => a + b, 0)
  const sy = ys.reduce((a, b) => a + b, 0)
  const sxx = xs.reduce((a, b) => a + b * b, 0)
  const sxy = xs.reduce((a, b, i) => a + b * ys[i], 0)
  const denom = n * sxx - sx * sx
  if (denom === 0) return null

  const slopePerDay = (n * sxy - sx * sy) / denom
  return slopePerDay * 7
}

/**
 * Semanas estimadas para atingir a meta, dado o valor atual e a velocidade
 * (kg/semana). Retorna:
 *  - 0 se já atingiu (dentro de 0,05 kg);
 *  - `null` se a velocidade é ~0 ou está indo na direção contrária à meta.
 */
export function weeksToTarget(current: number, target: number, ratePerWeek: number): number | null {
  const gap = target - current
  if (Math.abs(gap) < 0.05) return 0
  if (Math.abs(ratePerWeek) < 0.01) return null
  if (Math.sign(gap) !== Math.sign(ratePerWeek)) return null // afastando-se da meta
  return gap / ratePerWeek
}
