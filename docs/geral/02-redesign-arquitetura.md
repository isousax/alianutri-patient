# Redesign de Arquitetura — Evolução sobre a base atual

> Proposta pragmática, implementável sobre o que já existe. Para a visão sem amarras, ver [`03-visao-zero-e-comparativo.md`](./03-visao-zero-e-comparativo.md).

## North Star
*O paciente abre o app todo dia porque registrar é fácil, ver progresso é gratificante, e a nutricionista está do outro lado.*

## A Grande Ideia — Diário como rede social privada (díade paciente↔nutri)
O Diário evolui para um feed social **fechado**, cujo público é a **nutricionista + a IA Alia** — nunca estranhos.
- **Por quê:** captura a recompensa variável das redes (curtidas/comentários) sem a comparação social tóxica (perigosa num app de peso/corpo). Prestação de contas a uma pessoa real é o maior preditor de adesão.

## Princípios (inspiração → princípio, não cópia)
- **Apple Health → anéis** (glanceability).
- **Strava → kudos de quem importa** (feed + reações reais).
- **Duolingo → streak + meta diária + celebração** (loss aversion gentil).
- **Spotify → Wrapped** (recap semanal).
- **Uber/99 → a ação certa na hora certa** (reduz paralisia).
- **Notion → divulgação progressiva**. **Airbnb → confiança via rostos e qualidade visual.**

## Nova navegação — 4 abas + ação central

| Slot | Aba | Job-to-be-done | Frequência |
|---|---|---|---|
| 1 | **Início (Hoje)** | "O que faço agora / como estou hoje" | Diária |
| 2 | **Plano** | "O que como / como sigo" (referência acionável) | Diária/Semanal |
| 3 | **➕ Registrar** | "Capturar o que aconteceu" | Diária |
| 4 | **Diário** | "Minha jornada" (feed privado + progresso + conquistas) | Diária |
| 5 | **Nutri** | "Minha nutricionista" (chat + consultas + questionários) | Diária/Semanal |

Perfil/Config → avatar no header do Início.

**Resolve:** colisão "Diário" (só existe um, o feed); Perfil deixa de gastar slot; Consultas ganham casa (Nutri); Evolução vira segmento Progresso no Diário + atalho pelos anéis.

## Mapa de navegação
```
ACESSO → ONBOARDING ATIVADOR → [APP]
├─ Início (Hoje): anel do dia (→Progresso) · próximo passo · refeições 1-tap · momentos · vínculo
├─ Plano: hoje em destaque ▸ semana ▸ lista de compras ▸ orientações ▸ suplementos
├─ ➕ Registrar (sheet): Refeição·Água·Peso·Humor·Foto·Exercício·Anotação
├─ Diário: [ Feed | Progresso | Conquistas ] + recap "Sua Semana"
└─ Nutri: [ Conversa | Consultas | Questionários ]
```

## Nova Home — "Hoje"
Princípio: **uma tela, uma pergunta — "estou no caminho hoje e qual meu próximo passo?"**
1. Header: saudação + avatar + **streak único** (1 lugar canônico).
2. **Anel do dia** (herói; refeições+água; toque → Progresso).
3. **Próximo passo** (1 CTA contextual/temporal).
4. **Refeições de hoje** (registro 1-tap — absorve a aba de adesão).
5. **Momentos** ("Dra. reagiu 🔥" → Diário).
6. Card de vínculo (chat/consulta) — some se vazio.
7. Celebração esporádica (recompensa variável).

## Diário redesenhado (engine de engajamento)
- **Feed (rede privada):** posts (refeição c/ IA, exercício, humor, foto, **marcos automáticos**, anotação) + reações/comentários da nutri.
- **Progresso:** migra `evolution` (peso/IMC/%gordura/nutrição/água/bem-estar) em destaque; remove gráficos duplicados.
- **Conquistas:** nível/XP, badges, streak; desbloqueios viram post.
- **"Sua Semana":** recap estilo Wrapped aos domingos (peak-end rule).

## Registro unificado — o "+"
Bottom sheet de marca (substitui `Alert`). **Roteamento inteligente:** uma foto de refeição (a) posta no Diário, (b) roda IA de macros, (c) vincula à refeição do plano → marca adesão. Acaba com a fragmentação.

## Demais destinos
- **Plano:** hoje-first + semana + lista de compras + substituições + orientações + suplementos; "registrar" inline.
- **Nutri:** Chat + **Consultas (tela nova)** + Questionários.
- **Perfil (via avatar):** dados, foto, tema, lembretes, privacidade, sair.

## Gamificação e progresso (com guarda-corpo ético)
- Streak = espinha (1 lugar); XP no ponto da ação + anel de nível; meta semanal; reação da nutri = recompensa suprema.
- **⚠️ Ético:** gamificar comportamento/consistência, NÃO peso; sem punir recaída; motivar por maestria, não ansiedade.

## Onboarding + notificações
- Onboarding ativador: humaniza nutri → ativa lembretes (defaults smart) → 1ª ação imediata.
- Notificações comportamentais: hora da refeição · proteção de streak · "sua nutri reagiu" · recap pronto · consulta.

## Fluxos
- **Diário (Hooked):** gatilho → "+" foto refeição (2 toques) → IA macros + anel + XP + reação da nutri → streak +1.
- **Semanal:** peso → Progresso → foto → recap "Sua Semana" → consulta → novo plano.

## Prioridades
- **P0:** nova tab bar · Início "Hoje" · registro unificado · Diário com reações da nutri · streak canônico · fim dos `Alert` · onboarding+lembretes.
- **P1:** Progresso+Conquistas · Nutri hub (chat+consultas+questionários) · Plano acionável · recap semanal · acessibilidade.
- **P2:** backfill · desafios · comparador de fotos · refino de gamificação · suavizar read-only.

## Métricas
DAU/MAU · % dias com registro · D1/D7/D30 · sobrevivência de streak · aderência média · reações da nutri/semana · tempo até registrar (<10s).
