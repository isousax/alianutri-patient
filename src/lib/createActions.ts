// ══════════════════════════════════════════════════════
//  Ações do menu de criação (botão "+" do tab bar)
//  Lógica pura e testável (sem React/React Native).
// ══════════════════════════════════════════════════════

export type CreateActionId =
  | 'publish'
  | 'progress'
  | 'wellness'

export interface CreateAction {
  id: CreateActionId
  label: string
  description: string
  emoji: string
  route: string
}

/**
 * Ações de NAVEGAÇÃO do grid "Outros registros" do RegistroSheet, na ordem de
 * exibição. Água e Peso são registrados INLINE na própria folha (1 toque) — não
 * duplicamos aqui. 'publish' abre o compositor, onde se escolhe Refeição/Diário.
 */
export const CREATE_ACTIONS: readonly CreateAction[] = [
  {
    id: 'publish',
    label: 'Publicar',
    description: 'Refeição (com IA) ou um momento do dia',
    emoji: '�',
    route: '/post-compose',
  },
  {
    id: 'progress',
    label: 'Foto de progresso',
    description: 'Acompanhe sua evolução em fotos',
    emoji: '�',
    route: '/progress-photos',
  },
  {
    id: 'wellness',
    label: 'Bem-estar',
    description: 'Humor, sono, energia e mais em 1 check-in',
    emoji: '🧘',
    route: '/wellness',
  },
] as const

/** Rota de destino de uma ação de criação; null se o id não existir. */
export function routeForCreateAction(id: CreateActionId): string | null {
  return CREATE_ACTIONS.find((a) => a.id === id)?.route ?? null
}
