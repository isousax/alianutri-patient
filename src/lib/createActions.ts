// ══════════════════════════════════════════════════════
//  Ações do menu de criação (botão "+" do tab bar)
//  Lógica pura e testável (sem React/React Native).
// ══════════════════════════════════════════════════════

export type CreateActionId =
  | 'meal'
  | 'weight'
  | 'mood'
  | 'progress'
  | 'exercise'
  | 'note'

export interface CreateAction {
  id: CreateActionId
  label: string
  description: string
  emoji: string
  route: string
}

/**
 * Ações do RegistroSheet, na ordem de exibição.
 * Água é registrada inline na própria folha (1 toque), por isso não está aqui.
 */
export const CREATE_ACTIONS: readonly CreateAction[] = [
  {
    id: 'meal',
    label: 'Refeição',
    description: 'Foto do prato + análise por IA',
    emoji: '🍽️',
    route: '/post-compose?type=meal',
  },
  {
    id: 'weight',
    label: 'Peso',
    description: 'Atualize seu peso de hoje',
    emoji: '⚖️',
    route: '/weight',
  },
  {
    id: 'mood',
    label: 'Como me sinto',
    description: 'Como você está hoje? Em 1 toque',
    emoji: '🙂',
    route: '/wellness?focus=mood',
  },
  {
    id: 'progress',
    label: 'Foto de progresso',
    description: 'Acompanhe sua evolução em fotos',
    emoji: '📸',
    route: '/progress-photos',
  },
  {
    id: 'exercise',
    label: 'Exercício',
    description: 'Registre um treino ou atividade',
    emoji: '🏃',
    route: '/post-compose?type=exercise',
  },
  {
    id: 'note',
    label: 'Anotação',
    description: 'Escreva uma nota no diário',
    emoji: '📝',
    route: '/post-compose?type=free',
  },
] as const

/** Rota de destino de uma ação de criação; null se o id não existir. */
export function routeForCreateAction(id: CreateActionId): string | null {
  return CREATE_ACTIONS.find((a) => a.id === id)?.route ?? null
}
