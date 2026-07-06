import { PhysicalMedal } from '../ui/PhysicalMedal'
import type { Badge } from '../../lib/gamification'

/**
 * MedalShowcase — ponto ÚNICO de renderização da medalha "em destaque"
 * (contemplação de uma conquista). Hoje entrega a arte 2D via PhysicalMedal.
 *
 * PREPARADO PARA 3D: quando os modelos GLB de cada medalha existirem, a troca
 * para um viewer 3D acontece SOMENTE aqui — as telas consomem esta abstração e
 * NÃO a imagem 2D diretamente, evitando refatoração. O momento de DESBLOQUEIO
 * continua usando a arte 2D (PhysicalMedal) de propósito.
 *
 * Evolução esperada (esboço, não implementar agora):
 *   const model = getMedalModel(badge.id)   // registry: id -> require('....glb')
 *   if (model) return <Medal3D model={model} size={size} interactive={interactive} />
 */
export function MedalShowcase({
  badge,
  size = 160,
  interactive = true,
}: {
  badge: Badge
  size?: number
  interactive?: boolean
}) {
  return <PhysicalMedal medalha={badge.medalha} size={size} interactive={interactive} />
}
