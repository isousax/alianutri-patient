// Copy de SUBIDA DE NÍVEL (level-up). A metáfora aqui é CRESCIMENTO contínuo —
// diferente da conquista pontual de uma medalha. Mensagens escritas sob medida,
// chaveadas pelo número do nível alcançado (2..8). Fácil de revisar o texto sem
// tocar em lógica (espelha src/data/medalContent.ts).

export const LEVEL_MESSAGES: Record<number, string> = {
  2: 'Você provou que não foi só um impulso. O compromisso está tomando forma.',
  3: 'Sua dedicação virou constância — e a constância é o que transforma.',
  4: 'Cada escolha te aproxima de quem você quer ser. Foco afiado.',
  5: 'Disciplina é liberdade. Você está construindo a sua, dia após dia.',
  6: 'A mudança que você buscava agora acontece de dentro pra fora.',
  7: 'Seu progresso inspira — inclusive você, quando olha pra trás e vê o caminho.',
  8: 'O ponto mais alto da jornada. Agora você é referência do próprio cuidado.',
}

const FALLBACK = 'Você subiu de nível. Sua constância está te levando cada vez mais longe.'

export function getLevelMessage(level: number): string {
  return LEVEL_MESSAGES[level] ?? FALLBACK
}
