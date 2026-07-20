// ─────────────────────────────────────────────────────────────
// Perfil de Acompanhamento — espelho MÍNIMO no app do paciente (F5).
// Ver docs_temporarias/RFC_OBJETIVO_NUTRICIONAL.md (§4.3, §6.9).
//
// O app NÃO reimplementa a resolução do objetivo nem a semântica de peso:
// isso é server-authoritative e chega no payload (home.objective_profile,
// já com weight_semantics CONCRETA — nunca 'context_dependent').
//
// Aqui vivem apenas:
//   1) o TOM ao paciente por objetivo (framing/celebrate/avoid + ícone) — copy
//      pertence ao app;
//   2) interpretWeightChange — traduz a weight_semantics do payload em um "tom"
//      (verde/âmbar/neutro) para colorir a variação de peso. Espelha 1:1 o
//      helper do web (src/lib/objectiveProfiles.ts) para manter paridade.
//
// Regra de ouro: consumidores NUNCA fazem `if (objective === 'x')`.
// ─────────────────────────────────────────────────────────────

export type NutritionalObjective =
  | 'weight_loss'
  | 'maintenance'
  | 'muscle_gain'
  | 'performance'
  | 'clinical'
  | 'gestational'
  | 'longevity'
  | 'behavioral'
  | 'dietary_transition'

// CONTRATO: mesma lista canônica de web/api (guard de paridade no teste).
export const NUTRITIONAL_OBJECTIVES: readonly NutritionalObjective[] = [
  'weight_loss',
  'maintenance',
  'muscle_gain',
  'performance',
  'clinical',
  'gestational',
  'longevity',
  'behavioral',
  'dietary_transition',
]

/** Semântica de peso já resolvida pela API (nunca 'context_dependent'). */
export type ConcreteWeightSemantics =
  | 'loss_is_progress'
  | 'gain_is_progress'
  | 'stability_is_progress'
  | 'de_emphasized'

/** Subset do objetivo que chega no payload do portal (home.objective_profile). */
export interface ObjectiveProfilePayload {
  objective: NutritionalObjective | null
  source: 'explicit' | 'suggested' | 'none'
  label: string
  weight_semantics: ConcreteWeightSemantics
}

/** Tom ao paciente por objetivo — a copy pertence ao app (não vem do backend). */
export interface ObjectivePatientTone {
  label: string
  /** Nome de ícone lucide (o componente resolve nome → componente). */
  icon: string
  /** Enquadramento acolhedor exibido no hero da Home. */
  framing: string
  /** Métricas que merecem celebração para este objetivo. */
  celebrate: string[]
  /** Enquadramentos a EVITAR (ex.: peso em vermelho para reeducação). */
  avoid: string[]
}

export const OBJECTIVE_TONE = {
  weight_loss: {
    label: 'Emagrecimento',
    icon: 'TrendingDown',
    framing: 'Cada semana consistente conta',
    celebrate: ['waist', 'adherence'],
    avoid: [],
  },
  maintenance: {
    label: 'Manutenção',
    icon: 'Equal',
    framing: 'Manter também é vitória',
    celebrate: ['adherence', 'water'],
    avoid: [],
  },
  muscle_gain: {
    label: 'Ganho de massa',
    icon: 'Dumbbell',
    framing: 'Construindo — o peso subir é parte do plano',
    celebrate: ['strength', 'lean_mass'],
    avoid: ['enquadrar ganho de peso como falha'],
  },
  performance: {
    label: 'Performance esportiva',
    icon: 'Zap',
    framing: 'Foco no rendimento',
    celebrate: ['strength', 'adherence'],
    avoid: [],
  },
  clinical: {
    label: 'Controle clínico',
    icon: 'HeartPulse',
    framing: 'Saúde antes do número',
    celebrate: ['adherence', 'lab_markers'],
    avoid: [],
  },
  gestational: {
    label: 'Gestação e Lactação',
    icon: 'Baby',
    framing: 'Cuidando de vocês dois',
    celebrate: ['adherence', 'symptoms'],
    avoid: ['metas de emagrecimento', 'cor vermelha para ganho de peso'],
  },
  longevity: {
    label: 'Longevidade e Envelhecimento',
    icon: 'HeartHandshake',
    framing: 'Mais energia e independência no dia a dia',
    celebrate: ['function_autonomy', 'strength'],
    avoid: [],
  },
  behavioral: {
    label: 'Reeducação Alimentar',
    icon: 'Sprout',
    framing: 'Pequenas mudanças, todos os dias',
    celebrate: ['diary_streak', 'adherence'],
    avoid: ['mostrar peso em vermelho', 'focar no número da balança'],
  },
  dietary_transition: {
    label: 'Transição Alimentar',
    icon: 'Leaf',
    framing: 'Uma transição saudável, no seu ritmo',
    celebrate: ['diet_transition_progress', 'adherence'],
    avoid: [],
  },
} satisfies Record<NutritionalObjective, ObjectivePatientTone>

/** Tom ao paciente do objetivo (null → sem tom, degrada sem ifs no consumidor). */
export function getObjectiveTone(
  objective: NutritionalObjective | null | undefined,
): ObjectivePatientTone | null {
  return objective && objective in OBJECTIVE_TONE ? OBJECTIVE_TONE[objective] : null
}

/** Julgamento visual da variação de peso: verde (bom), âmbar (contrário), neutro. */
export type WeightTone = 'positive' | 'negative' | 'neutral'

/**
 * Interpreta uma variação de peso à luz da semântica do objetivo (do payload).
 * Espelha o helper do web: ganho de massa → subir é `positive`; emagrecimento →
 * subir é `negative`; reeducação/transição (`de_emphasized`) → sempre `neutral`
 * (peso não é o foco — nunca em vermelho). Sem semântica → legado: perda = bom.
 */
export function interpretWeightChange(
  semantics: ConcreteWeightSemantics | null | undefined,
  deltaKg: number | null | undefined,
): { tone: WeightTone; direction: 'up' | 'down' | 'stable' } {
  const d = deltaKg ?? 0
  const direction: 'up' | 'down' | 'stable' = d < 0 ? 'down' : d > 0 ? 'up' : 'stable'
  if (direction === 'stable') {
    return { tone: semantics === 'stability_is_progress' ? 'positive' : 'neutral', direction }
  }
  switch (semantics) {
    case 'loss_is_progress':
      return { tone: direction === 'down' ? 'positive' : 'negative', direction }
    case 'gain_is_progress':
      return { tone: direction === 'up' ? 'positive' : 'negative', direction }
    case 'de_emphasized':
    case 'stability_is_progress':
      return { tone: 'neutral', direction }
    default:
      return { tone: direction === 'down' ? 'positive' : 'negative', direction }
  }
}

/** Mapeia o tom para uma cor — o componente injeta os tokens do tema. */
export function weightToneColor(
  tone: WeightTone,
  colors: { positive: string; negative: string; neutral: string },
): string {
  return tone === 'positive' ? colors.positive : tone === 'negative' ? colors.negative : colors.neutral
}
