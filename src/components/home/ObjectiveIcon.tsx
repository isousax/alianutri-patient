import type { ComponentType } from 'react'
import {
  TrendingDown,
  Equal,
  Dumbbell,
  Zap,
  HeartPulse,
  Baby,
  HeartHandshake,
  Sprout,
  Leaf,
  Target,
} from 'lucide-react-native'

type IconProps = { size?: number; color?: string; strokeWidth?: number }

// Mapa nome→ícone. O mirror do domínio (src/domain/objectiveProfiles.ts) guarda
// apenas o NOME do ícone (mantendo-se puro/testável); a resolução para o
// componente lucide acontece aqui, na camada de UI.
const OBJECTIVE_ICONS: Record<string, ComponentType<IconProps>> = {
  TrendingDown,
  Equal,
  Dumbbell,
  Zap,
  HeartPulse,
  Baby,
  HeartHandshake,
  Sprout,
  Leaf,
}

/** Ícone do objetivo pelo nome vindo do mirror (fallback: Target). */
export function ObjectiveIcon({ name, size = 14, color, strokeWidth = 2 }: { name: string } & IconProps) {
  const Icon = OBJECTIVE_ICONS[name] ?? Target
  return <Icon size={size} color={color} strokeWidth={strokeWidth} />
}
