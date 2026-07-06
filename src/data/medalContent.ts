// Metadados de cada medalha para a GALERIA de conquistas. Mantido separado da
// lógica pura (src/lib/gamification.ts) para facilitar revisão de texto e evoluir
// sem tocar em regras.
//
//  • category → agrupa a conquista (contemplação + futura filtragem).
//  • about    → descrição curta do que a conquista representa. Usada na medalha
//               BLOQUEADA (LockedMedalSheet) para dar contexto — SEM entregar a
//               recompensa visual, que fica reservada ao desbloqueio real.
//  • story    → NARRATIVA exclusiva por medalha (um momento da jornada). Ainda
//               não escrita: quando existir, a contemplação a renderiza sozinha.
//               NÃO preencher com texto genérico.

export type MedalCategory =
  | 'Sequência'
  | 'Registro'
  | 'Metas'
  | 'Hábitos'
  | 'Diário'
  | 'Vínculo'

export interface MedalMeta {
  category: MedalCategory
  about: string
  story?: string
}

export const MEDAL_META: Record<string, MedalMeta> = {
  streak3: {
    category: 'Sequência',
    about: 'Os três primeiros dias são os mais difíceis — é aqui que o hábito começa a nascer.',
  },
  streak7: {
    category: 'Sequência',
    about: 'Uma semana inteira sem quebrar a sequência. Cuidar de você já faz parte do seu dia.',
  },
  streak30: {
    category: 'Sequência',
    about: 'Trinta dias de constância. O que antes era esforço agora é rotina.',
  },
  streak100: {
    category: 'Sequência',
    about: 'Cem dias seguidos. Deixou de ser um hábito: virou parte de quem você é.',
  },
  logged7: {
    category: 'Registro',
    about: 'Sete dias registrando refeições. Consciência é o primeiro passo de qualquer mudança.',
  },
  logged30: {
    category: 'Registro',
    about: 'Trinta dias de registros. Uma base sólida que deixa todo o resto mais leve.',
  },
  firstGoal: {
    category: 'Metas',
    about: 'Sua primeira meta definida. Ter um destino claro muda toda a jornada.',
  },
  goalDone: {
    category: 'Metas',
    about: 'Uma meta definida e concluída. A prova de que você é capaz.',
  },
  habit: {
    category: 'Hábitos',
    about: 'Dez check-ins de hábito. Pequenas ações repetidas constroem grandes mudanças.',
  },
  photographer: {
    category: 'Diário',
    about: 'Trinta fotos de refeição. Cada registro é um presente para o seu acompanhamento.',
  },
  diarist: {
    category: 'Diário',
    about: 'Dez momentos compartilhados no diário. Sua história de cuidado ganhou voz.',
  },
  nutriFav: {
    category: 'Vínculo',
    about: 'Vinte curtidas do seu nutricionista. Seu esforço está sendo visto e reconhecido.',
  },
}

const FALLBACK: MedalMeta = {
  category: 'Sequência',
  about: 'Uma conquista na sua jornada de cuidado com você.',
}

export function getMedalMeta(id: string): MedalMeta {
  return MEDAL_META[id] ?? FALLBACK
}
