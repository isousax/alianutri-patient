# Visão do Zero — "O melhor app de acompanhamento nutricional do mundo"

> Exercício deliberadamente **sem amarras**: esquecemos a arquitetura atual e projetamos a experiência ideal conhecendo **apenas o conjunto de capacidades** que existe. A comparação com o app atual vem só no final (seção 9).

---

## 1. Premissa e tese

### 1.1 O que de fato existe (capacidades, abstraídas de telas)
- **Relação com nutricionista humano:** plano alimentar (quantitativo/equivalentes/qualitativo, substituições, lista de compras), chat, consultas (online/presencial, aprovação), orientações, documentos (atestado/laudo/receita), questionários, reações/comentários do nutri.
- **Inteligência (Alia / IA):** geração de plano alimentar por IA, análise de foto de refeição em macros, composição corporal a partir de foto/3D (PyMAF/SMPL — existe no ecossistema).
- **Autorregistro:** refeições/adesão, água (meta inteligente por clima), peso, medidas/antropometria (IMC, %gordura), sintomas/bem-estar (energia, humor, sono, digestão), fotos de progresso, exercício.
- **Progresso:** séries temporais (peso/IMC/gordura/nutrição/água/bem-estar).
- **Motivação:** metas (peso/medida/comportamental/nutricional/lab/custom), hábitos com check-in, gamificação (XP/nível/badge/streak), lembretes locais, temas.

### 1.2 A verdade do domínio
As pessoas **não falham por falta de informação** — falham (a) na lacuna diária entre intenção e ação, (b) por se sentirem sozinhas, e (c) por não *sentirem* progresso. Um app de informação não resolve isso. Um **companheiro de coaching** resolve.

### 1.3 Tese de produto
> **O melhor app de nutrição não é um rastreador — é um relacionamento.** O paciente é o herói; o app é o guia. Há **dois guias**: a **Alia (IA)** — instantânea, sem julgamento, 24/7 — e a **nutricionista humana** — especialista, profunda, periódica. Tudo gira em torno de tornar a ação certa **sem esforço no momento certo** e de fazer o **esforço e o progresso serem sentidos**.

Metáfora (StoryBrand / Jornada do Herói): o paciente é Luke; a Alia + a nutri são Yoda. O app nunca rouba o protagonismo — ele guia.

---

## 2. Princípios de design (first principles)

1. **Fricção zero para capturar.** Registrar deve parecer *tirar uma foto*, não *preencher um formulário*. (Maior dor do MyFitnessPal: logar é tedioso, e as pessoas param.)
2. **A ação certa, na hora certa.** O app conhece o plano e o horário; ele *propõe* — não obriga a navegar. (Uber/99: um próximo passo claro.)
3. **Recompensa variável e humana.** A validação vem de quem importa (a nutri) e de um corpo/energia que muda — não de estranhos. (Strava kudos, sem comparação tóxica.)
4. **Progresso sentido, não só plotado.** Progresso é narrativa emocional ("você está mais leve e com mais energia"), com gráficos como aprofundamento. (Spotify Wrapped + Apple Health.)
5. **IA como companheira onipresente, não como feature.** "Aponte para o prato", "posso comer isto?", "me dá uma troca" — em qualquer lugar.
6. **Plano vivo, não PDF.** O plano se reorganiza ao redor de hoje, sugere trocas, aprende preferências; nutri + IA co-editam.
7. **Calma e confiança (premium).** Menos por tela, hierarquia clara, movimento com significado. Efeito estética-usabilidade: bonito é percebido como mais fácil e confiável.
8. **Ética acima de engajamento.** É saúde. Gamificar **consistência/comportamento**, jamais peso; nunca induzir restrição perigosa; linguagem que acolhe recaída.

---

## 3. O paradigma da experiência

Três camadas, não cinco features soltas:

- **A. O Dia (execução guiada):** o coração. Um fluxo *time-aware* que conduz o paciente pelo dia — manhã ("seu dia"), refeições (nudge, captura em 1 foto, feedback da Alia), noite (reflexão + proteger streak).
- **B. A Jornada (memória + progresso):** o diário privado (refeições, marcos, humor, fotos, exercícios) que a nutri acompanha e celebra, somado à narrativa de progresso.
- **C. O Cuidado (humano + IA):** a nutri (plano vivo, chat, consultas) e a Alia (perguntar, analisar, adaptar) num só lugar de "estou cuidado".

Atravessando tudo: **captura onipresente (câmera)** e **Alia (IA) acessível de qualquer tela**.

---

## 4. Arquitetura de navegação ideal

**4 destinos + captura central.** Cada um é um *modo de relação* do herói com sua jornada.

Barra inferior (esquerda para direita): **Hoje** · **Jornada** · **( 📷 Capturar )** · **Plano** · **Cuidado**

| Slot | Destino | Pergunta que responde | Quem brilha |
|---|---|---|---|
| 1 | **Hoje** | "O que faço agora e como estou indo?" | O Dia + Alia proativa |
| 2 | **Jornada** | "De onde vim e quanto avancei?" | Diário privado + Progresso narrativo |
| 3 | **📷 Capturar** | "Registrar isto em 1 gesto" | Câmera + IA |
| 4 | **Plano** | "O que/como comer?" | Plano vivo + Alia (trocas) |
| 5 | **Cuidado** | "Estou amparado?" | Nutri (humano) + Alia (IA) |

- **Perfil/Config:** avatar no header de **Hoje** (não merece slot — baixa frequência).
- **Por que 5 e não 3 ou 7:** 3 não acomoda a captura sagrada + os 4 modos distintos; 7 estoura o alcance do polegar e a clareza (Hick/Fitts). 4+1 é o ponto de equilíbrio comprovado (IG/Strava).
- **Por que "Capturar" no centro:** é a ação mais frequente e mais prazerosa — merece o melhor ponto de toque (Fitts) e o gesto mais nobre (IG).

---

## 5. Os destinos em detalhe

### 5.1 Hoje (o Dia guiado)
Princípio: **glanceability + um próximo passo**. *Time-aware* — a tela de manhã, meio-dia e noite é diferente.

Estrutura (de cima para baixo):

- **Header:** avatar (toque abre Perfil/Config) · "Bom dia, Ana" · "com Dra. Camila" · **🔥 streak único** (1 lugar canônico).
- **Anel "Seu Dia" (herói):** resumo refeições + água + movimento; legenda "no caminho · falta o almoço"; toque abre Jornada/Progresso.
- **Alia proativa (1 mensagem):** "Bora registrar o almoço? É só uma foto." com botão 📷.
- **Seu plano hoje (fatia acionável):** lista de refeições com registro 1-tap (✓ / 📷 / troca ⇄).
- **Água inline:** barra de progresso + botão "+ copo".
- **Vínculo (some se vazio):** "Camila respondeu" · "consulta amanhã 9h".
- **À noite:** card "Como foi seu dia?" → reflexão de 10s + proteger streak.

**Por quê:** mata a paralisia (um foco), torna o registro contíguo à intenção (endowed progress/Zeigarnik com "falta o almoço") e coloca a **Alia coachando** no topo do hábito.

### 5.2 Capturar (📷 — câmera-first, IA-nativa)
Não é um menu — é uma **câmera que entende contexto**.
- **Padrão:** abre na câmera. Foto do prato → IA reconhece, estima macros, sugere a qual refeição do plano pertence, e pergunta "publicar na Jornada?". **Um gesto = registro + análise + adesão + post.**
- **Atalhos** (chips abaixo do obturador): Água · Peso · Como me sinto · Foto de progresso · Exercício · Anotação · **Perguntar à Alia**.
- **Entrada por voz/texto:** "comi 2 ovos e café" → IA estrutura.
- **Por quê:** elimina a fragmentação de logging na raiz e transforma a tarefa mais tediosa do gênero numa interação de 2s e prazerosa. É o maior diferencial competitivo possível.

### 5.3 Jornada (memória + progresso narrativo)
Segmentos: **Feed · Progresso · Conquistas**.
- **Feed (rede privada díade):** posts (refeição c/ macros da IA, exercício, humor, foto, **marcos automáticos**, anotação). Público = **só a nutri + a Alia**. A nutri reage (❤️👏💪🔥⭐) e comenta — *kudos de quem importa*.
- **Progresso narrativo:** abre com uma **frase-resumo** ("−2,1 kg em 6 semanas · energia subindo · 18 dias de registro") e *depois* os gráficos (peso/medidas/%gordura/nutrição/água/bem-estar). Inclui a **linha do tempo visual** das fotos.
- **Conquistas:** nível/XP, badges, streak; cada desbloqueio vira post celebrável.
- **Sua Semana / Seu Mês (Wrapped):** recap automático, bonito, "mostrável" pra nutri (peak-end rule + antecipação).
- **Por quê:** une o *porquê emocional* (feed) ao *quanto racional* (progresso) numa só narrativa — o motivo nº1 de voltar toda semana é sentir que avançou.

### 5.4 Plano (vivo e adaptativo)
- **Hoje em destaque** → semana → macros → **lista de compras** → orientações → suplementos.
- **Alia integrada:** "não gosto de peixe" → troca equivalente na hora; "tô na rua, o que peço?" → sugestão alinhada ao plano.
- **Co-edição nutri+IA:** mudanças do nutri chegam como "seu plano foi atualizado ✨"; a IA propõe ajustes que o nutri aprova.
- **Registrar inline:** cada refeição tem ✓ / 📷 / troca — plano e execução no mesmo lugar.
- **Por quê:** transforma o entregável estático (PDF/print) no **organismo vivo** que acompanha a vida real — onde a adesão de fato quebra.

### 5.5 Cuidado (humano + IA num só lugar)
- **Alia (IA):** thread sempre disponível — perguntar qualquer coisa, analisar, motivar; **triagem** (responde na hora; escala pro nutri quando é clínico).
- **Nutri (humana):** chat com a pessoa real (foto/nome — confiança Airbnb), **Consultas** (próximas + histórico + sala online/endereço + status de aprovação + agendar), **Questionários**, **Documentos**.
- **Por quê:** "me sentir cuidado" é a emoção que retém em saúde. Unir IA (instantânea) + humano (profundo) cobre tanto a dúvida das 23h quanto o acompanhamento clínico — sem o paciente ter que decidir "onde falo o quê".

### 5.6 Rituais premium (diferenciais de "uau")
- **Body Scan mensal (PyMAF):** foto → malha 3D → composição corporal e evolução do corpo no tempo. Ritual mensal celebrado. (Capacidade já existe no ecossistema — subutilizada.)
- **Reflexão noturna de 10s:** humor + 1 linha → alimenta bem-estar e dá fecho ao dia (peak-end).
- **"Sua Semana":** recap Wrapped.

---

## 6. A camada de IA (Alia) — transversal
- **Onipresente:** botão/captura de "Perguntar à Alia" em todas as telas.
- **Capacidades:** foto em macros, foto em composição corporal, gerar/adaptar plano, responder "posso comer X?", trocas, motivação contextual, triagem pro humano.
- **Personalidade:** acolhedora, sem julgamento, breve. Nunca substitui a nutri — **amplia** o alcance dela.
- **Por quê:** é o que torna o coaching **escalável e 24/7**, e o que move a captura de "formulário" para "conversa/câmera".

---

## 7. Gamificação e senso de progresso (com ética no centro)
- **Streak = espinha** (1 lugar canônico) com **proteção gentil**, nunca vergonha.
- **XP no ponto da ação** + anel de nível em Conquistas; **meta semanal** (Duolingo).
- **Reação da nutri = recompensa suprema** (validação de figura de cuidado).
- **⚠️ Guarda-corpo:** premiar **comportamento/consistência** (registrei, segui, me hidratei), **nunca o número da balança**; sem ranking entre pacientes; linguagem que normaliza recaída ("recomeçar faz parte"). Motivação por **autonomia + maestria + vínculo** (autodeterminação), não por ansiedade.

---

## 8. Fluxos

### 8.1 Onboarding (ativador + relacional)
1. Acesso pelo link do nutri → **conhece a Alia + vê foto/nome da nutri** (humaniza desde o 1º segundo).
2. **Ativa lembretes** (defaults inteligentes pré-marcados) — a maior alavanca de retenção.
3. **Primeira captura agora** ("tire a foto da sua próxima refeição") → "aha moment" imediato + Alia elogia.
4. (Se aplicável) IA monta um rascunho de plano que a nutri refina.

### 8.2 Fluxo diário (modelo Hooked)
- **Gatilho:** notificação na hora da refeição / proteção de streak à noite / "sua nutri reagiu".
- **Ação (2 toques):** 📷 → foto do prato.
- **Recompensa variável:** Alia mostra macros + anel preenche + "+XP" + (depois) kudos da nutri.
- **Investimento:** streak +1, foto na Jornada, dado pro nutri → aumenta o valor de voltar amanhã.

### 8.3 Fluxo semanal
Peso → Progresso (linha desce) → foto → **Sua Semana** (recap) → compartilha conquista com a nutri.

### 8.4 Fluxo mensal / lifecycle
**Body Scan 3D** → ver corpo mudar → consulta (sala online/endereço) → **novo plano vivo** ("atualizado ✨") → novo ciclo. Marcos viram conquistas e posts.

---

## 9. Comparativo com a arquitetura atual

> Só agora olhamos para o app existente. A boa notícia: **as capacidades já existem** — o que falta é *arquitetura, fluxo e camada de IA conversacional*.

### 9.1 De → Para (estrutural)

| Dimensão | Hoje (atual) | Ideal (visão zero) |
|---|---|---|
| Navegação | Início · Plano · + · Diário(adesão) · Perfil | Hoje · Jornada · 📷 · Plano · Cuidado |
| "Diário" | 2 conceitos colidindo (adesão x feed) | 1 conceito: Jornada (feed+progresso) |
| Registrar | `Alert` nativo, 3 opções, 4 caminhos | **Câmera-first IA**, 1 gesto, roteado |
| IA | só análise de foto em 2º plano | **Alia conversacional onipresente** |
| Plano | viewer read-only | **Plano vivo** (trocas IA, registro inline) |
| Progresso | tela "Evolução" enterrada + 3 gráficos de peso | **Progresso narrativo** em destaque, fonte única |
| Humano | chat solto, sem tela de consultas | **Cuidado** (nutri + consultas + IA) unificado |
| Perfil | ocupa slot da tab bar | avatar no header |
| Onboarding | carrossel promocional | **ativador + relacional** |
| Body comp. | modal isolado (subutilizado) | **ritual Body Scan 3D** mensal |

### 9.2 Mudanças por impacto (o que move mais o ponteiro)

Ranqueado por **impacto × esforço** (▲ impacto, ⏱ esforço relativo). As 3 primeiras concentram ~80% do ganho.

1. **📷 Captura câmera-first com IA** — ▲▲▲ · ⏱⏱
   *Por quê:* ataca a causa-raiz do abandono (logar é chato) e unifica os 4 caminhos de refeição + 2 de humor + 3 de foto. Maior salto isolado em engajamento diário e percepção premium. *Já existe* análise foto em macros; falta a UX de câmera + roteamento.
2. **Reestruturar navegação + Home "Hoje" guiada** — ▲▲▲ · ⏱
   *Por quê:* resolve a colisão "Diário", o Home sobrecarregado, Perfil/Evolução mal posicionados e a paralisia de decisão — com baixo esforço (reorganização + 1 tela de cockpit). Melhora simultânea de facilidade, frequência e clareza.
3. **Diário → rede privada com kudos da nutri** — ▲▲▲ · ⏱⏱
   *Por quê:* injeta recompensa variável humana (o motor das redes) sem toxicidade. Reações/comentários do nutri **já existem** no backend; falta torná-las o coração do feed + notificações "sua nutri reagiu".
4. **Alia conversacional onipresente (IA coach)** — ▲▲▲ · ⏱⏱⏱
   *Por quê:* escala o coaching pra 24/7, vira a captura em conversa e cria diferencial competitivo. Maior esforço (produto de IA), mas transformador. Começar pela triagem + "perguntar à Alia" + análise de foto.
5. **Plano vivo (trocas IA + registro inline)** — ▲▲ · ⏱⏱⏱
   *Por quê:* conecta plano↔execução (lacuna real de adesão) e mata o "PDF morto". Esforço alto pela co-edição/trocas.
6. **Progresso narrativo + "Sua Semana"** — ▲▲ · ⏱⏱
   *Por quê:* converte dado em emoção; recap semanal é forte alavanca de retorno. Reaproveita a tela `evolution` existente.
7. **Cuidado unificado + tela de Consultas** — ▲▲ · ⏱
   *Por quê:* fecha a lacuna de consultas e fortalece o vínculo humano (retenção). Esforço baixo.
8. **Onboarding ativador + lembretes ligados** — ▲▲ · ⏱
   *Por quê:* lembretes são a maior alavanca de retenção e hoje nascem desligados/escondidos; ativar no onboarding muda a curva de D7/D30.
9. **Body Scan 3D como ritual mensal** — ▲▲ (uau) · ⏱⏱⏱
   *Por quê:* diferencial "premium" memorável; a capacidade **já existe** no modal de antropometria, mas está fora da jornada do paciente.
10. **Substituir `Alert` por sheets + acessibilidade + ética da gamificação** — ▲ · ⏱
    *Por quê:* polimento de percepção premium, inclusão e segurança em saúde; baixo esforço, alto retorno de confiança.

### 9.3 Leitura estratégica
- **O ativo escondido é a IA.** O ecossistema já tem foto em macros, geração de plano e composição corporal 3D — mas a IA está em 2º plano. Trazê-la para o centro (câmera + Alia + plano vivo) é o que separa "mais um tracker" do **"melhor app de nutrição do mundo"**.
- **80/20:** itens **1–3** entregam a maior parte do ganho de engajamento/retenção, com esforço baixo-médio e quase nenhum backend novo → começar por aqui.
- **O fosso competitivo** está em **4–5 + 9** (Alia conversacional, plano vivo, Body Scan) — investimentos maiores que tornam o produto difícil de copiar.

---

## 10. Métricas de sucesso
- **Engajamento:** DAU/MAU; % de dias com ≥1 captura; capturas/dia; tempo até registrar (meta < 5s com câmera).
- **Retenção:** D1/D7/D30; sobrevivência de streak; % com lembretes ativos; abertura do recap semanal.
- **Progresso/vínculo:** aderência média ao plano; nº de interações nutri↔paciente/semana; uso da Alia.
- **Premium/saúde:** NPS; conclusão do "próximo passo"; zero incentivos a comportamento de risco (auditoria ética contínua).
