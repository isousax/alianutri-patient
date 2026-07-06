// Copy BESPOKE por conquista (tela de contemplação). Nada genérico: cada medalha
// carrega uma descrição do que representa e uma mensagem exclusiva — pensada para
// transmitir orgulho, progresso e reconhecimento. Chaveado por id do Badge
// (ver src/lib/gamification.ts). Mantido separado da lógica para facilitar revisão
// de texto sem tocar em regras.

export interface MedalContent {
  description: string
  message: string
}

export const MEDAL_CONTENT: Record<string, MedalContent> = {
  streak3: {
    description:
      'Os três primeiros dias são os mais difíceis — e você atravessou. É aqui que nasce o hábito que muda tudo.',
    message: 'Todo grande resultado começa com uma decisão pequena, repetida. Você deu o primeiro passo.',
  },
  streak7: {
    description:
      'Uma semana inteira sem quebrar a sequência. Cuidar de você já virou parte natural do seu dia.',
    message: 'Sete dias seguidos não são sorte — são compromisso. Continue alimentando essa chama.',
  },
  streak30: {
    description:
      'Trinta dias de constância. O que antes era esforço agora é rotina — e a rotina é o seu superpoder.',
    message: 'Um mês inteiro cuidando de você. Poucas pessoas chegam até aqui. Você é uma delas.',
  },
  streak100: {
    description: 'Cem dias seguidos. Isso deixou de ser um hábito: virou parte de quem você é.',
    message: 'Cem dias. Uma história de disciplina que fala por si. Você é, oficialmente, uma lenda.',
  },
  logged7: {
    description:
      'Sete dias registrando suas refeições. Consciência é o primeiro ingrediente de qualquer mudança.',
    message: 'Quem registra, enxerga. Quem enxerga, evolui. Sua fidelidade ao diário está valendo a pena.',
  },
  logged30: {
    description:
      'Trinta dias de registros. Você construiu uma base sólida — daqui pra frente, tudo fica mais leve.',
    message: 'Rotina forte, resultados fortes. Você transformou o ato de registrar em algo natural.',
  },
  firstGoal: {
    description: 'Você definiu sua primeira meta. Ter um destino claro muda completamente a jornada.',
    message: 'Foco é escolher para onde ir. Você escolheu — e isso já é metade do caminho.',
  },
  goalDone: {
    description: 'Uma meta definida, uma meta concluída. Você provou a si mesmo do que é capaz.',
    message: 'Do plano à conquista. Guarde essa sensação: ela é o combustível da próxima meta.',
  },
  habit: {
    description: 'Dez check-ins de hábito. Pequenas ações, repetidas, constroem grandes transformações.',
    message: 'A constância vence a intensidade. Você descobriu o segredo de quem chega longe.',
  },
  photographer: {
    description: 'Trinta fotos de refeição. Cada registro visual é um presente para o seu acompanhamento.',
    message: 'Você documenta sua jornada com cuidado. Seu nutri agradece — e seus resultados também.',
  },
  diarist: {
    description: 'Dez momentos compartilhados no diário. Sua história de cuidado ganhou voz.',
    message: 'Registrar como você se sente é um ato de autoconhecimento. Continue escrevendo sua jornada.',
  },
  nutriFav: {
    description: 'Vinte curtidas do seu nutricionista. Seu esforço está sendo visto e reconhecido.',
    message:
      'Quando quem entende do assunto reconhece o seu empenho, é porque você está no caminho certo.',
  },
}

const FALLBACK: MedalContent = {
  description: 'Uma conquista na sua jornada de cuidado com você.',
  message: 'Cada passo conta. Continue — você está indo muito bem.',
}

export function getMedalContent(id: string): MedalContent {
  return MEDAL_CONTENT[id] ?? FALLBACK
}
