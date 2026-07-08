# Roadmap — Exposição de dados clínicos ao paciente (mobile)

Objetivo: tornar acessível no app, de forma **premium, intuitiva e clinicamente responsável**, o
que o nutricionista já registra no web mas hoje não chega ao paciente: **antropometria completa,
perfil clínico/anamnese e exames laboratoriais** — incluindo permitir que o paciente **envie fotos
dos próprios exames** (paridade com o que o nutri já faz).

Repos: `alianutri-api` (backend/portal) + `alianutri-patient` (app). Migrações e redeploy são
**ações do owner** (marcadas 🔧 OWNER).

---

## Princípios de design (valem para todas as fases)

- **Tokens sempre**: `useThemeColors()`, `typography/space/radius/shadows`, `SCREEN_PADDING`. Zero hex fixo.
- **Componentes compartilhados**: `Card`, `ScreenHeader`, `EmptyState`/`ErrorState`/`Skeleton*`,
  `LineChart`. Nada de reinventar gráfico/estado.
- **Gating canônico**: loading → error → empty → conteúdo.
- **Leitura primeiro, escrita depois**: expor visualização antes de habilitar upload.
- **Privacidade/clínico**: nem tudo que o nutri anota é para o paciente ver. Expor campos
  **apropriados ao paciente** (o que ele já sabe/forneceu: alergias, restrições, medicações,
  hábitos, objetivos, medidas). Texto livre de **hipótese/observação clínica** NÃO é exposto sem
  curadoria — cada fase audita os campos reais antes de mapear.
- **Densidade sem ruído**: seções colapsáveis / progressive disclosure; hero com o essencial,
  detalhe sob demanda. Evitar "muro de números".
- **Read-only visível**: telas de leitura deixam claro que o dado vem do nutricionista.

---

## Fase 0 — Fixes e decisões desta rodada

- [x] **Q1** Empty states inconsistentes → `goals` e `questionnaires` agora têm ação "Atualizar"
  (padrão de `guidelines`/`documents`/`meal-plan`/`anthropometry`).
- [x] **Q2** Semântica adesão × macros → DECIDIDO + implementado (backend). Ver abaixo. 🔧 OWNER: redeploy API.
- [x] **Q3** Suplementos: fluxo revisado; correto. Gate = `settings_payload.supplementation_enabled`
  (toggle do módulo no web) **+** ≥1 item. Se não apareceu no teste, o módulo estava desligado.
- [ ] **Q4** Polish leve da página de antropometria (entrada em cascata + haptics nos seletores).

### Q2 — DECIDIDO e implementado
Regra final: **macros só via foto** (nunca injetar macros do plano — evita o cenário de duplicação:
foto igual ao plano + depois "Segui" contariam 2×). PORÉM **foto vinculada a um slot também marca
adesão** (`followed`), pois postar a foto daquele slot = seguiu. Guarda: só preenche a adesão quando
ausente (`COALESCE`), respeitando um `partial`/`skipped` deliberado. Feito em `createPost`
(portal.service.ts, ~L1391/1424). 🔧 OWNER: redeploy da API.

---

## Fase 1 — Antropometria completa (LEITURA) — risco BAIXO ✅ FEITO (código; aguarda redeploy)

> ✅ **Backend**: `getEvolution` expandido (circunferências + 9 dobras + `protocol` + `notes`) e
> **fix**: agora exclui avaliações soft-deleted (`deleted_at IS NULL`) — antes vazavam pro paciente.
> ✅ **App**: `PortalEvolution` estendido; página com chip de protocolo, "Medidas (cm)",
> "Dobras cutâneas (mm)" (+ Σ) e **abdômen** na tendência. Só renderiza medidas presentes. `notes`
> (texto livre) NÃO exposto por privacidade. tsc do app limpo (exit 0). 🔧 OWNER: **redeploy da API**.

Builda sobre `app/anthropometry.tsx` (já existe). Hoje o `/evolution` só devolve subconjunto
(peso, altura, IMC, cintura, quadril, %gordura, massa magra/gorda).

- **API**: expandir `getEvolution` (ou novo `GET /p/:code/anthropometry/:id`) para incluir todas as
  **circunferências** (pescoço, ombro, tórax, abdômen, braço rel/contr, antebraço, coxa, panturrilha),
  as **9 dobras cutâneas**, `protocol`, `source`, `notes`.
- **App**: seções novas na página — "Medidas" (circunferências, grid), "Dobras cutâneas" (quando houver),
  chip de **protocolo** (Jackson-Pollock/DEXA/bioimpedância), nota da avaliação. Manter hero/tendência.
- 🔧 OWNER: redeploy da API.

## Fase 2 — Perfil clínico & Anamnese — ❌ DESCARTADA (decisão do usuário, Jul/2026)

**Auditoria feita**: perfil = `patient_clinical_profiles` (sexo, atividade, objetivo, padrão alimentar,
gestação/lactação, notas) + `patient_conditions` (condições). Anamnese = `anameses` (`responses` JSON
de template + `notes` + `ai_summary`).

**Decisão**: perfil clínico é **interno do nutri** e sensível. O único campo plausível ao paciente seria
`nutritional_objective`, mas ele **não** está em nenhum payload atual (exigiria endpoint/lógica nova) —
não justifica o custo. Anamnese (texto livre clínico) fica fora. Reabrir só se houver curadoria pelo
nutri no web.

## Fase 3 — Exames laboratoriais (LEITURA) — risco MÉDIO

- **Auditar** `labExam.service.ts` (schema de exames, marcadores, faixas de referência, anexos).
- **API**: `GET /p/:code/lab-exams` (lista + detalhe): marcador, valor, unidade, faixa, data, status
  (normal/alterado), anexos existentes do nutri.
- **App**: tela "Exames" premium — histórico por marcador com **tendência** (LineChart) e faixa de
  referência, agrupado por data/painel.
- 🔧 OWNER: redeploy.

## Fase 4 — Exames: UPLOAD pelo paciente (ESCRITA) — risco ALTO

- **Auditar** como o nutri anexa exames hoje (R2 bucket, rota, tabela de anexos) para espelhar.
- **API**: `POST /p/:code/lab-exams/upload` (foto/câmera/PDF) → R2 → registro visível ao nutri;
  respeitar `requireWrite`. Servir via `portalImageSource` (header de sessão).
- **App**: fluxo de captura (câmera/galeria/arquivo) na tela de Exames, com preview e estado de envio.
- 🔧 OWNER: migração (se necessária) + redeploy.

---

## Ordem sugerida
Fase 1 ✅ → (Fase 2 descartada) → Exames (Fase 3/4) a definir por prioridade.

## Status
- Fase 0: Q1 ✅; Q2 ✅ (aguarda redeploy); Q3 ✅; Q4 polish opcional pendente.
- Fase 1: ✅ código feito (aguarda redeploy da API).
- Fase 2: ❌ descartada (perfil clínico é interno do nutri).
- Fases 3–4 (Exames): não iniciadas — aguardando decisão de prioridade.
