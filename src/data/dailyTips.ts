export const DAILY_TIPS: { emoji: string; text: string }[] = [
  {
    emoji: "💧",
    text: "Depois de uma noite de sono, um copo de água é uma boa forma de começar o dia.",
  },
  {
    emoji: "🥗",
    text: "Um prato colorido costuma ser um prato mais nutritivo.",
  },
  {
    emoji: "🍎",
    text: "Frutas inteiras são mais saciantes que sucos, pois preservam as fibras.",
  },
  {
    emoji: "🥜",
    text: "Castanhas são uma ótima opção de lanche e ajudam na saciedade.",
  },
  {
    emoji: "🥦",
    text: "Vegetais verde-escuros como brócolis e espinafre são ricos em ferro e cálcio – seus ossos agradecem!",
  },
  {
    emoji: "🫘",
    text: "Arroz com feijão garante proteína completa e não pesa no bolso.",
  },
  {
    emoji: "🧠",
    text: "Comer devagar dá mais tempo para o corpo perceber quando já está satisfeito.",
  },
  {
    emoji: "🥚",
    text: "Ovos são campeões de proteína e ainda dá pra prepará-los de várias formas.",
  },
  {
    emoji: "🌾",
    text: "Carboidratos integrais dão energia gradualmente, mantendo você firme por mais tempo.",
  },
  {
    emoji: "🥛",
    text: "Iogurte natural pode contribuir para a saúde da intestinal.",
  },
  {
    emoji: "🍌",
    text: "A banana é uma ótima fonte de potássio, mineral essencial para os músculos.",
  },
  {
    emoji: "🫒",
    text: "Azeite extra-virgem é a gordurinha do bem – anti-inflamatório natural que deixa qualquer salada ainda mais gostosa.",
  },
  {
    emoji: "🍵",
    text: "Chá de ervas (sem açúcar!) é ótima pedida para manter você hidratado com sabor.",
  },
  {
    emoji: "🥕",
    text: "Cenoura é pra ver a vida inteira: rica em betacaroteno, ajuda na saúde dos olhos e da pele.",
  },
  {
    emoji: "🐟",
    text: "Salmão, sardinha e outros peixinhos são fonte de ômega-3 – seu coração e cérebro agradecem.",
  },
  {
    emoji: "🌿",
    text: "Alho, cebola e ervas dão sabor sem precisar de muito sal – temperos naturais capricham no sabor!",
  },
  {
    emoji: "🥑",
    text: "Abacate é pura gordura boa – ajuda seu corpo a aproveitar melhor as vitaminas dos alimentos.",
  },
  {
    emoji: "🍠",
    text: "Batata-doce dá energia constante – ideal pra ter pique sem altos de açúcar.",
  },
  {
    emoji: "🧘",
    text: "Comer com calma e atenção plena evita exageros – fica mais fácil curtir a comida sem culpa.",
  },
  {
    emoji: "😴",
    text: "Uma boa noite de sono acerta os hormônios da fome – resultado: menos fome maluca!",
  },
  {
    emoji: "🍊",
    text: "Frutas cítricas + vegetais verde-escuro: a vitamina C ajuda seu corpo a absorver melhor o ferro!",
  },
  {
    emoji: "🥬",
    text: "Couve, rúcula e outras folhas verdes carregam muita fibra – ajudam a manter o intestino em ordem!",
  },
  {
    emoji: "🏃",
    text: "Exercício + alimentação equilibrada = um combo que turbina sua saúde!",
  },
  {
    emoji: "🫐",
    text: "Frutas vermelhas e roxas estão lotadas de antioxidantes – protegem suas células do envelhecimento!",
  },
  {
    emoji: "⏰",
    text: "Comer em horários regulares ajuda o corpo a ajustar o metabolismo – e a controlar a fome.",
  },
  {
    emoji: "🥒",
    text: "Pepino e melancia são praticamente água pura – ótimos para hidratar nos dias quentes.",
  },
  {
    emoji: "🍞",
    text: "Fique de olho no rótulo: ele revela açúcares e sódio escondidos nos processados.",
  },
  {
    emoji: "🌰",
    text: "Aveia é cheia de fibra boa (beta-glucana), que ajuda a manter o colesterol sob controle.",
  },
  {
    emoji: "🧄",
    text: "Alho tem poderes: combate bactérias e inflamações de forma natural.",
  },
  {
    emoji: "🥩",
    text: "Inclua proteína em todas as refeições: ajuda a segurar a fome e manter os músculos firmes.",
  },
  {
    emoji: "🍋",
    text: "Comece o dia com água com limão – dizem que ajuda na digestão.",
  },
  {
    emoji: "🌽",
    text: "Milho tem fibra e antioxidantes (luteína e zeaxantina) – ótimo para a saúde dos olhos.",
  },
  {
    emoji: "🍇",
    text: "Não pule refeições – além de ficar faminto, você acaba comendo mais depois.",
  },
  {
    emoji: "🥗",
    text: "Comece a refeição pelas folhas: a fibra dá aquela segurada na fome antes do prato principal.",
  },
  {
    emoji: "☀️",
    text: "Solzinho + bons alimentos = vitamina D, aquela força pros ossos e pra imunidade!",
  },
  {
    emoji: "🧊",
    text: "Preparar marmitas no fim de semana deixa a dieta na linha durante a semana toda!",
  },
  { emoji: "🫑", text: "Pimentão tem vitamina C até mais do que a laranja!" },
  {
    emoji: "🥝",
    text: "Kiwi combina fibras e vitamina C em dobro – ótimo para o intestino funcionar direitinho!",
  },
  {
    emoji: "🍫",
    text: "Um pedacinho de chocolate 70%+ cacau entrega antioxidantes e ainda dá um up no humor!",
  },
  {
    emoji: "💪",
    text: "Nem precisa ser perfeito: pequenas mudanças todo dia fazem uma baita diferença!",
  },
];

/**
 * Returns the tip for a specific day (deterministic based on date).
 * Same tip for all users on the same day.
 */
export function getTipOfTheDay(): (typeof DAILY_TIPS)[number] {
  const now = new Date();
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000,
  );
  return DAILY_TIPS[dayOfYear % DAILY_TIPS.length];
}
