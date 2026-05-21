export const DAILY_TIPS: { emoji: string; text: string }[] = [
  { emoji: '💧', text: 'Beber água ao acordar ajuda a ativar o metabolismo e hidratar o corpo após horas de sono.' },
  { emoji: '🥗', text: 'Inclua pelo menos 3 cores diferentes no seu prato — quanto mais colorido, mais nutrientes.' },
  { emoji: '🍎', text: 'Frutas inteiras são mais saciantes que sucos, pois preservam as fibras.' },
  { emoji: '🥜', text: 'Um punhado de castanhas por dia fornece gorduras boas e ajuda a controlar a fome.' },
  { emoji: '🥦', text: 'Vegetais verde-escuros como brócolis e espinafre são ricos em ferro e cálcio.' },
  { emoji: '🫘', text: 'O arroz com feijão forma uma proteína completa — uma combinação perfeita e acessível.' },
  { emoji: '🧠', text: 'Mastigar devagar melhora a digestão e ajuda a perceber a saciedade antes de comer demais.' },
  { emoji: '🥚', text: 'Ovos são uma das fontes mais completas de proteína e podem ser preparados de diversas formas.' },
  { emoji: '🌾', text: 'Prefira carboidratos integrais — eles liberam energia de forma mais gradual.' },
  { emoji: '🥛', text: 'Iogurte natural é rico em probióticos que ajudam na saúde intestinal.' },
  { emoji: '🍌', text: 'A banana é uma ótima fonte de potássio, mineral essencial para os músculos.' },
  { emoji: '🫒', text: 'O azeite de oliva extra virgem é anti-inflamatório — use em saladas e finalizações.' },
  { emoji: '🍵', text: 'Chás de ervas sem açúcar são ótimas alternativas para manter a hidratação.' },
  { emoji: '🥕', text: 'A cenoura é rica em betacaroteno, importante para a saúde dos olhos e da pele.' },
  { emoji: '🐟', text: 'Peixes como sardinha e salmão são ricos em ômega-3, ótimo para o coração e o cérebro.' },
  { emoji: '🌿', text: 'Temperos naturais como alho, cebola e ervas reduzem a necessidade de sal.' },
  { emoji: '🥑', text: 'O abacate é rico em gorduras monoinsaturadas e ajuda na absorção de vitaminas.' },
  { emoji: '🍠', text: 'A batata-doce é um carboidrato de baixo índice glicêmico, ideal para energia sustentada.' },
  { emoji: '🧘', text: 'Comer com atenção plena (mindful eating) ajuda a evitar excessos e melhora a relação com a comida.' },
  { emoji: '😴', text: 'Dormir bem é essencial para a regulação dos hormônios da fome (grelina e leptina).' },
  { emoji: '🍊', text: 'A vitamina C das frutas cítricas melhora a absorção do ferro dos vegetais.' },
  { emoji: '🥬', text: 'Folhas verdes como couve e rúcula são ricas em fibras e ajudam na digestão.' },
  { emoji: '🏃', text: 'Atividade física regular potencializa os benefícios de uma boa alimentação.' },
  { emoji: '🫐', text: 'Frutas vermelhas e roxas são ricas em antioxidantes que combatem o envelhecimento celular.' },
  { emoji: '⏰', text: 'Manter horários regulares de refeições ajuda a regular o metabolismo.' },
  { emoji: '🥒', text: 'Pepino e melancia são ricos em água — ótimos para hidratação nos dias quentes.' },
  { emoji: '🍞', text: 'Ler rótulos ajuda a identificar açúcares ocultos e sódio em alimentos industrializados.' },
  { emoji: '🌰', text: 'A aveia é rica em beta-glucana, uma fibra que ajuda a reduzir o colesterol.' },
  { emoji: '🧄', text: 'O alho tem propriedades antibacterianas e anti-inflamatórias naturais.' },
  { emoji: '🥩', text: 'Proteínas em cada refeição ajudam a manter a saciedade e a massa muscular.' },
  { emoji: '🍋', text: 'Um copo de água com limão pela manhã pode ajudar na digestão.' },
  { emoji: '🌽', text: 'O milho é fonte de fibras e antioxidantes como a luteína e zeaxantina.' },
  { emoji: '🍇', text: 'Evite pular refeições — isso pode levar a comer mais na refeição seguinte.' },
  { emoji: '🥗', text: 'Comece o almoço pela salada — as fibras ajudam a controlar a quantidade do prato principal.' },
  { emoji: '☀️', text: 'A vitamina D (sol + alimentação) é importante para ossos fortes e imunidade.' },
  { emoji: '🧊', text: 'Preparar marmitas no fim de semana facilita manter a dieta durante a semana.' },
  { emoji: '🫑', text: 'O pimentão é uma das maiores fontes de vitamina C — até mais que a laranja!' },
  { emoji: '🥝', text: 'O kiwi é rico em fibras e vitamina C, ótimo para o intestino.' },
  { emoji: '🍫', text: 'Chocolate 70%+ cacau em pequenas porções fornece antioxidantes e pode melhorar o humor.' },
  { emoji: '💪', text: 'Consistência é mais importante que perfeição. Pequenas mudanças diárias geram grandes resultados.' },
]

/**
 * Returns the tip for a specific day (deterministic based on date).
 * Same tip for all users on the same day.
 */
export function getTipOfTheDay(): typeof DAILY_TIPS[number] {
  const now = new Date()
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000,
  )
  return DAILY_TIPS[dayOfYear % DAILY_TIPS.length]
}
