# PATIENT_APP_ROADMAP.md

> Fonte oficial da próxima fase de evolução do **App do Paciente** (`alianutri-patient`).
> Documento de auditoria + plano priorizado. **Fundações (Ondas 0–3) concluídas** (ver marcações ✅ por item); pendentes: enriquecimento de acompanhamento (P-3/P-4/P-5), UX (U-*) e técnico (T-6/T-7/T-8), além de QA em device e S-4/S-5(app).
> Data da auditoria: Jul/2026 · Escopo: `alianutri-patient` (Expo/React Native) com dependências em `alianutri-api` (Cloudflare Workers) e `alianutri-web` (dashboard do nutri).

---

## 1. Resumo executivo

O app está maduro em superfície (design system próprio, animações, gamificação, IA de fotos, offline queue), mas a auditoria revelou **três classes de risco que precedem qualquer nova feature**:

1. **Estabilidade de teclado** — o padrão de `KeyboardAvoidingView` é inconsistente entre telas e o `BottomSheet` (usado por vários fluxos de registro) **não tem tratamento de teclado nenhum**. Isso cobre inputs em várias telas.
2. **Modelo de acesso frágil** — o **código de acesso É a autenticação**. Ele viaja na URL de toda requisição, não há binding de dispositivo, sessão, nem rate-limiting no resolve. Qualquer pessoa com o código tem acesso clínico total e permanente.
3. **Estratégia comercial invertida** — hoje `canWrite = nutricionista tem plano pago`. Isso **bloqueia o registro do paciente inteiro** quando o nutri é free, o que contradiz a nova estratégia (acesso liberado para todos; limite comercial = nº de pacientes ativos + features premium).

Além disso, há **oportunidades altas de produto** subaproveitadas: os dados de peso e nutrição já existem mas são exibidos de forma pobre (sparkline sem média móvel/meta/projeção), e o registro de peso é preso ao dia atual (barreira para migração de outros apps).

**Recomendação:** executar em ondas — primeiro **fundações** (teclado, resiliência de clima, inversão do modelo free/premium, hardening de segurança), depois **enriquecimento de acompanhamento** (peso/nutrição/retroativo), e por fim **polish de UX e futuro**.

### Legenda de prioridade
- **Crítica** — risco de segurança, perda de dado, ou bloqueio direto de receita/uso. Fazer primeiro.
- **Alta** — impacto forte em engajamento/percepção ou pré-requisito de outras features.
- **Média** — melhora relevante, sem bloqueio.
- **Baixa** — refinamento incremental.

### Escala de complexidade
- **P** (pequena): ≤1 dia, 1 repo. · **M** (média): 2–4 dias, possivelmente 2 repos. · **G** (grande): 1–2 semanas, os 3 repos + migração de schema.

---

## 2. Diagnóstico da situação atual

### 2.1 Arquitetura observada
- **App**: Expo 54, expo-router (file-based), React Query + persist (AsyncStorage), Zustand para stores locais, NativeWind + design tokens próprios (`src/theme/tokens`), Reanimated, react-native-svg (gráficos caseiros), fila de mutações offline (`src/lib/mutationQueue.ts`), notificações locais.
- **Auth**: `src/stores/auth.ts` guarda `accessCode` no `SecureStore`. `src/services/api.ts` monta toda request como `GET/POST {API}/p/{accessCode}{path}`. **Sem JWT, sem refresh, sem device id enviado ao servidor.**
- **API**: `resolveAccessCode.ts` faz `SELECT ... FROM patients WHERE access_code = ?`. Sem rate-limit, sem lockout, sem device binding. `canWrite = SubscriptionRepository.isPaidPlan(nutritionist_id)`.
- **Gating**: `requireWrite` (403) protege TODAS as rotas de escrita do paciente (food-diary, água, peso via evolution, goals checkin/progress, questionnaires answer, push-token, foto de perfil, upload de foto do diário).
- **PII**: `_layout.tsx` intencionalmente **não persiste** recursos clínicos no disco (AsyncStorage não é cifrado) — bom.

### 2.1.1 Fatos do schema (confirmados em `alianutri-api/migrations/tenant/schemaTenants.sql`)
> Verificados diretamente no schema para que a implementação **respeite os fluxos existentes** (não inventar campos/fluxos).
- **`patients`**: `access_code TEXT UNIQUE CHECK(length(access_code) >= 16)`, `birth_date TEXT` (opcional), `cpf TEXT` (**AES-GCM, opcional**), `cpf_hash TEXT` (**SHA-256 hex do CPF completo**, indexado, `UNIQUE(nutritionist_id, cpf_hash)`), `phone`/`email` (via `getProfile`), `push_token TEXT`, `payload` (JSON de estado), `archived_at`, `deleted_at`.
- **Não existe** hoje nenhuma coluna/tabela de **dispositivo ou sessão** para paciente → a sessão device-bound (S-2) exige **migração de schema** no tenant DB.
- **Rotação de código já existe**: a timeline registra `access_code_generated` e `access_code_regenerated` → o "resetar acesso/sessão" (S-2/S-5) deve **estender esse fluxo existente**, não criar um paralelo.
- **Padrão de sessão a reaproveitar**: o core (`schemaCore.sql`) já tem `user_sessions` (refresh token hash, `revoked`, `expires_at`) e `users.session_version` (invalidação por incremento) para nutris. A sessão do paciente deve **espelhar esse padrão** (consistência + código já testado).
- **Implicação para S-3**: `cpf_hash` é hash do **CPF inteiro** → validar identidade por CPF significa "digite o CPF completo" (hash e compara), **não** "últimos dígitos" (não dá para derivar dígitos parciais de um hash). `birth_date` e `phone` são comparáveis diretamente no servidor.

### 2.2 Estado por tela (resumo)
| Tela | Registro | Feedback | Observações |
|---|---|---|---|
| Home `(tabs)/index.tsx` | — | bom | Sincroniza `canWrite`; usa `weather` no header (some se falha) |
| Água `water.tsx` | otimista, bom | bom | Meta vem do servidor (resiliente); card de clima **some** se API falha |
| Peso `weight.tsx` | **só hoje** | ok | Sparkline simples; sem média móvel/meta/projeção; sem data retroativa |
| Diário `food-diary.tsx` | Modal + KAV | ok | Modal no Android depende de `adjustResize` (não configurado) |
| Metas `goals.tsx` | inputs inline | ok | — |
| Questionários `questionnaires.tsx` | ScrollView+KAV | pobre | Tela vazia relatada ao abrir (ver bug B-6) |
| Chat `chat.tsx` | FlatList + KAV | bom | — |
| Registro (BottomSheet) | **sem KAV** | — | Inputs dentro de sheet ficam cobertos |
| Perfil `profile.tsx` | Modal foto | ok | Foto redonda/quadrada relatada (ver B-7) |

---

## 3. Bugs críticos

### B-1 · Teclado cobre campos (inconsistência sistêmica) — ✅ **CÓDIGO CONCLUÍDO (Jul/2026) — pendente QA em device**
- **Decisão:** Expo Go (sem módulo nativo) → melhor solução disponível = padrão único de RN + `BottomSheet` keyboard-aware via Reanimated. `react-native-keyboard-controller` foi **descartado** (é nativo, exigiria dev build).
- **✅ Implementado:**
  - `app.json`: `android.softwareKeyboardLayoutMode: "resize"` (telas full-screen empurram o conteúdo acima do teclado no Android).
  - `src/components/ui/BottomSheet.tsx`: **keyboard-aware** — ouve `keyboardWillShow/Hide` (iOS) / `keyboardDidShow/Hide` (Android) e, via shared value `kb`, **eleva a folha** (`translateY: ty - kb`) e **limita a altura** (`maxHeight: 0.9*tela - kb`) para o topo nunca sair da tela. Independe do bug de resize de `Modal` no Android → funciona no Expo Go. Beneficia `RegistroSheet` e `ActionSheetHost` automaticamente.
  - `app/food-diary.tsx`: modal próprio (`Modal` + `KeyboardAvoidingView` sem scroll) **migrado para o `BottomSheet`** corrigido — elimina o caso especial (removidos imports `Modal`/`KeyboardAvoidingView`/`Platform`).
  - Padrão único `KeyboardAvoidingWrapper` (iOS `padding`, Android `undefined`+resize) aplicado/consistente em `weight.tsx` (era KAV inline), `login.tsx` (era `behavior:'height'` problemático), `questionnaires.tsx` (não tinha KAV) e `goals.tsx` (não tinha KAV); todas com `keyboardShouldPersistTaps="handled"`.
  - Sem mudança em `chat.tsx` (já no padrão) e `post-compose.tsx` (já usa o wrapper). `onboarding.tsx`/`profile.tsx` **não têm `TextInput`** → sem ação.
  - `npm run ts:check` = 0 erros. (ESLint não tem config no projeto; gate = tsc.)
- **⚠️ Pendente (Definition of Done):** **QA em device físico** (iOS + Android). Checklist abaixo — teclado é específico de SO e não é verificável por tsc.
  - [ ] BottomSheet: `RegistroSheet` (água rápida), `ActionSheetHost`, food-diary "Nova refeição" (input multiline) — a folha sobe acima do teclado, botão salvar visível, fecha ok.
  - [ ] `weight.tsx` (decimal-pad), `goals.tsx` (report inline autoFocus no fim de lista longa), `questionnaires.tsx` (text/textarea + botão Enviar), `post-compose.tsx`, `login.tsx` (código de acesso) — campo focado nunca coberto; scroll ok; tap fora fecha.
  - [ ] Android edge-to-edge: sem sobreposição da barra de navegação; resize correto.
- **Problema (original):** Não há um padrão único. Convivem: (a) `KeyboardAvoidingWrapper` com `behavior=undefined` no Android; (b) `KeyboardAvoidingView` inline com `'height'`/`'padding'`; (c) `BottomSheet` (`src/components/ui/BottomSheet.tsx`) **sem nenhum** tratamento de teclado — seu `ScrollView` interno não reage ao teclado; (d) `food-diary.tsx` usa um `Modal` com view ancorada no rodapé e `KeyboardAvoidingView` sem `ScrollView` interno; (e) `app.json` **não define** `android.softwareKeyboardLayoutMode`, deixando o comportamento do Android indefinido com `newArchEnabled: true` + edge-to-edge.
- **Locais afetados (mapeados):** `BottomSheet.tsx` (⇒ `RegistroSheet`, `ActionSheetHost`), `food-diary.tsx` (modal de refeição, textarea multiline no rodapé), `questionnaires.tsx`, `goals.tsx` (report de progresso), `post-compose.tsx`, `weight.tsx`, `profile.tsx` (modal), `chat.tsx`, `login.tsx`, `onboarding.tsx`.
- **Impacto:** usuário não vê o que digita; abandono de registro; percepção de app quebrado.
- **Risco:** baixo de regressão se centralizado; médio se corrigido tela a tela (divergência).
- **Prioridade — justificativa:** citado pelo usuário como recorrente; afeta o ato central do app (registrar).
- **Direção recomendada:**
  1. Adotar **`react-native-keyboard-controller`** (compatível com New Arch) OU padronizar 100% em torno de um único wrapper + `ScrollView` com `keyboardShouldPersistTaps="handled"` e `automaticallyAdjustKeyboardInsets` (iOS).
  2. Definir `android.softwareKeyboardLayoutMode: "resize"` (ou `"pan"`) no `app.json` e validar edge-to-edge.
  3. **Dar ao `BottomSheet` awareness de teclado** (KeyboardAvoidingView interno + `keyboardVerticalOffset` derivado dos insets, ou `KeyboardAwareScrollView`). Este é o maior ofensor porque é reutilizado.
  4. Converter o modal do `food-diary` para usar o mesmo `BottomSheet` corrigido (elimina caso especial).
  5. Criar checklist de QA de teclado (iOS + Android físico) para todas as telas listadas.

### B-2 · Falha da API de clima degrada a experiência — ✅ **CONCLUÍDO (Jul/2026)**
- **✅ Implementado (correção de causa-raiz, melhor que o plano original):** a análise inicial supôs que o clima não era persistido; na verdade **já era** (queryKey `['weather','v22']` não está em `CLINICAL_RESOURCES` → `shouldDehydrateQuery` persiste, 24h). A causa-raiz real era `fetchWeather` **retornar `null` em falha** → o React Query gravava `data=null` como `success`, sobrescrevendo/persistindo por cima do último clima bom.
  - `src/lib/weather.ts`: `fetchWeather` agora **lança** em falha (o RQ preserva o último valor bom e nunca persiste erro); **removido** o cache em memória redundante (fonte única = RQ) e o dead code `clearWeatherCache`; adicionado helper `fetchWithTimeout` aplicado às **duas** chamadas (resolve **B-4** — timeout no `open-meteo`, 5s).
  - `src/hooks/useWeather.ts`: expõe estado semântico `{ weather, status: 'loading'|'ok'|'stale'|'unavailable', updatedAt }`; queryKey `v21→v22`; `gcTime` 1h→24h (alinha com a persistência). Resolve **T-5** (persistência já existia; agora nunca é poluída por `null`).
  - `src/hooks/useSmartWaterGoal.ts` + `app/water.tsx`: card mostra **último clima + "atualizado HH:MM"** quando `stale`, **"Carregando clima…"** e **"Clima indisponível"** em vez de sumir. `HomeHeader` passa a exibir o último conhecido automaticamente (sem mudança de código).
  - Verificação: `npm run ts:check` = **0 erros**.
- **Observações fora de escopo (documentadas para depois):** (a) o card de água só renderiza quando `weather || isPersonalized`; para meta definida pelo nutri (não personalizada) sem clima, o card — e a badge "NUTRI" — continuam ocultos (quirk pré-existente, não regressão); (b) a etiqueta "atualizado HH:MM" mostra só hora (dado tem no máx. 24h pela `maxAge`); avaliar rótulo relativo se necessário.
- **Problema (original):** `src/lib/weather.ts` faz `getCoords()` via `ipwho.is` → `open-meteo`. Em falha retorna `null`. Cache é **só em memória** (`let cached`), perdido ao reabrir o app. Consequências:
  - `HomeHeader` e o card de clima de `water.tsx` **somem silenciosamente** (`{weather && ...}`), sem estado de "indisponível".
  - `weatherBonusMl`/mensagem contextual desaparecem.
  - **Ponto positivo já existente:** a meta oficial de água vem do servidor (`goal_ml`/`goal_source`), então a *meta em si* NÃO quebra — o clima é só bônus efêmero. Isso reduz a gravidade, mas o comportamento "some sem avisar" ainda é ruim.
- **Impacto:** inconsistência visual, sensação de bug, perda do "porquê" da meta ajustada.
- **Risco:** baixo.
- **Prioridade — justificativa:** citado explicitamente; correção barata e isola dependência externa.
- **Estados hoje:** só sucesso (mostra) e ausência (some). Faltam: **carregando**, **último clima conhecido (stale)**, **indisponível (erro explícito e discreto)**.
- **Direção recomendada:**
  1. **Persistir o último clima conhecido** (React Query já persiste, mas `weather` está fora do allowlist clínico — pode persistir sem PII; ou usar AsyncStorage direto com timestamp).
  2. Renderizar "último clima às HH:MM" quando stale; e um estado discreto "clima indisponível" (sem quebrar layout) em vez de sumir.
  3. Timeout/AbortController já existe em `getCoords` mas **não** na chamada do `open-meteo` (linha do `fetch(url)` sem signal) → adicionar timeout lá também.
  4. Garantir que `weatherBonusMl` só aparece quando há dado real; nunca afetar a meta oficial (manter contrato atual).

### B-3 · Sessão órfã em downgrade / arquivamento — ✅ **CONCLUÍDO (Jul/2026)**
- **✅ Implementado (`tsc` 0 erros nos 2 repos):** `resolveAccessCode` agora marca o 403 de arquivado com `code: "ACCESS_DISABLED"`; `api.ts` captura `code` (via T-3); a **Home** (`(tabs)/index.tsx`) mostra uma **tela dedicada** "Acesso desativado" com ação **Voltar ao login** (logout + `router.replace('/login')`); e o **login** (`validateAccessCode`) passa a exibir a **mensagem específica** do servidor (não mais "Erro ao validar código") quando o paciente arquivado tenta entrar.
- **Problema:** Se o nutri arquiva o paciente, `resolveAccessCode` retorna 403 e o app **não trata** especificamente (só 401 dá logout em `api.ts`). Um 403 de `requireWrite` é tratado como erro genérico nas mutations, mas o 403 de `archived_at` no `GET /home` deixaria o app em estado ambíguo.
- **Impacto:** paciente arquivado pode ver telas em estado inconsistente.
- **Risco:** médio.
- **Direção recomendada:** tratar 403 com corpo semântico (ex.: `code: 'ACCESS_DISABLED'`) → tela dedicada "acesso desativado, fale com seu nutricionista".

### B-4 · `open-meteo` fetch sem timeout — ✅ **CONCLUÍDO (Jul/2026)** (junto com B-2)
- **✅ Implementado:** helper `fetchWithTimeout(url, ms)` em `weather.ts` (AbortController 5s) aplicado tanto ao `ipwho.is` quanto ao `open-meteo`. Sem mais spinner preso em rede ruim.
- **Problema (original):** `getCoords` tem AbortController (5s), mas o segundo `fetch(url)` do forecast não. Em rede ruim, promete travar até o timeout default do RN.

### B-5 · `clientId` sem entropia criptográfica — ✅ **CONCLUÍDO (Jul/2026)**
- **✅ Implementado:** `src/lib/clientId.ts` agora usa `expo-crypto` (`getRandomBytes`, CSPRNG) mapeado no alfabeto nanoid (byte & 63 → sem viés de módulo), com fallback defensivo para `Math.random`. Formato (21 chars URL-safe) e idempotência preservados. Depende de `npm install` do `expo-crypto` (adicionado ao package.json).
- **Problema:** `src/lib/clientId.ts` usa `Math.random()` para o id de linha idempotente da fila offline. O comentário reconhece o trade-off. Colisão é improvável mas não impossível entre dispositivos do mesmo paciente.
- **Impacto:** baixo hoje; relevante se sessão multi-dispositivo evoluir.
- **Direção:** usar `expo-crypto` (já há libs nativas no projeto) para `getRandomValues`.

### B-6 · Questionário abre vazio — ⏸ **EM ESPERA (aguardando evidência concreta / reprodução)** — Jul/2026
- **Decisão (owner):** não corrigir especulativamente; o bug não foi reproduzido nem observado em 1ª mão. Deixar como está até haver evidência concreta.
- **Investigação (Jul/2026) — a hipótese original de "descompasso de shape" provavelmente NÃO é a causa ativa:** o único produtor de linhas em `patient_questionnaires` hoje é `QuestionnaireService.create` (modal manual/templates no `alianutri-web`), que grava `{ text, type: text|select|scale|boolean, options?, required? }` — **shape que já bate** com o app. O `auto_questionnaire` (`AutomationsTab`, formato `{ label, type: textarea|number|... }`) **só é salvo em settings**; não há consumidor que o envie como questionário (portanto esse shape não chega ao paciente hoje).
- **Duas causas candidatas concretas (para investigar quando houver evidência):**
  - **(A) Gate `canWrite` ao ABRIR pendente** — `app/questionnaires.tsx`: `onPress={() => (canWrite ? setSelected(q) : null)}`. Nutri free/trial (`canWrite=false`) → tocar no pendente **não navega**. Ligado ao **P-1** (no novo modelo, visualizar nunca deveria ser bloqueado; só o *submit*).
  - **(B) Fragilidade de shape (latente)** — o app lê **só `q.text`** e trata só `text/select/boolean/scale`. O web já lê defensivamente `q.text ?? q.question ?? q.label` (ver `QuestionnairesPanel.tsx` `QuestionCard`/print) e o auto-questionnaire usa `label`/`textarea`/`number`. Quando essa origem for ligada, o app mostra **título em branco + sem input**.
- **Correção proposta (quando priorizado):** (1) sempre permitir abrir/visualizar (remover o gate no toque; `ReadOnlyBanner` + submit desabilitado quando `!canWrite`); (2) tolerância de shape: `text ?? question ?? label`, tratar `textarea`(multiline)/`number`(teclado numérico) + fallback de input para tipo desconhecido.
- **Impacto:** feature inutilizável quando/se ocorrer.

### B-7 · Foto de perfil "redonda e quadrada ao mesmo tempo" — ✅ **VALIDADO: não é bug (Jul/2026)**
- **Validação (revisão de código, sem mudança):** os dois pontos que renderizam a foto do usuário estão **corretos**:
  - `src/components/ui/Avatar.tsx` (Home): `frame` com `borderRadius: size/2` + `overflow:'hidden'` + `borderWidth` no mesmo container; `Image` `size×size` com `contentFit="cover"`. Círculo correto.
  - `app/profile.tsx`: `borderRadius: AVATAR_SIZE/2` + `overflow:'hidden'` + `contentFit="cover"` na imagem 88×88. Sem preview quadrado coexistindo.
- **Conclusão:** item era desatualização do roadmap; não reproduzível no código atual. Nenhuma ação necessária. (Se ressurgir, capturar screenshot + tela/OS específicos como evidência.)
- **Problema (original relatado):** foto aparecendo "redonda e quadrada ao mesmo tempo".

---

## 4. Melhorias de Produto

### P-1 · Inverter o modelo free/premium (acesso liberado; premium = features) — ✅ **NÚCLEO IMPLEMENTADO (Jul/2026) — pendente QA + T-2/T-3**
- **✅ Implementado (backend `alianutri-api` + app, `tsc` 0 erros nos dois):**
  - `SubscriptionRepository.isPatientOverLimit(nutriUserId, {id, created_at}, tenantDb)` — rank por criação (decisão 12.6), mesma base do `countActive` (concorda com o gate global).
  - `middleware/resolveAccessCode.ts`: `canWrite = !isPatientOverLimit` (era `isPaid`). Ilimitado/dentro do limite → escreve; excedente → read-only. SELECT passou a trazer `created_at`.
  - `portal.routes.ts`: `POST /chat` e `POST /push-token` **saíram** do `requireWrite` (decisão 12.7 — comunicação, não dado clínico). Mensagem do `requireWrite` agora carrega `code: "PATIENT_OVER_LIMIT"`.
  - `portal.service.ts`: IA de foto **sem gate `canWrite`**; cota/dia por plano do nutri via `isPaidPlan` — **pago=10, free=3** (constantes `MAX_DAILY_AI_ANALYSES_PAID/FREE`); `QUOTA_EXCEEDED` mantido.
  - App: `(tabs)/index.tsx` já espelha `features.can_write`; `ReadOnlyBanner` já é genérico (sem "nutri free"). `PostCard.tsx`: mensagem de `QUOTA_EXCEEDED` melhorada ("Foto salva… liberam amanhã").
- **⏳ Falta (itens próprios, não bloqueiam o núcleo):**
  - **T-2:** expandir `features` (backend `getHome` + `src/stores/features.ts`) para objeto de capacidades (`ai_meal_analysis: { limit, used, period }`) para UX de cota precisa.
  - **T-3:** tratar 403 `PATIENT_OVER_LIMIT` semanticamente no app (`api.ts`) + garantir que a fila offline não enfileire para excedente (edge 8/13).
  - **QA:** validar em runtime (nutri free com paciente dentro/fora do limite; IA 3 vs 10/dia; chat/push do excedente).
  - Marketing/WhatsApp (#5) — fora do escopo de código.
- **Problema:** Hoje `canWrite = isPaidPlan(nutri)` e `requireWrite` bloqueia **todo** registro do paciente (diário, água, peso, metas, questionários, foto). Estratégia nova: **qualquer nutri (mesmo free) libera o app do paciente por completo** para os pacientes **dentro do limite**; o limite comercial passa a ser **nº de pacientes ativos** e **features premium**.
- **Decisões fechadas (ver seção 12):**
  - **IA de foto = por DIA.** Nutri **pago → 10/dia**; nutri **free → 3/dia** por paciente. Objetivo: o paciente do free consegue usar, mas com limite que protege a saúde/custo da plataforma.
  - **Paciente excedente (acima do limite em downgrade) → READ-ONLY** (não escreve). Racional do produto: se o excedente pudesse registrar normalmente, o nutri não teria **incentivo** para regularizar. Assim ele **arquiva inativos** (volta ao limite) ou **assina o plano ilimitado**.
- **Impacto:** desbloqueia aquisição/viralização (paciente é canal de marketing) e cria pressão comercial clara no downgrade.
- **Risco:** **alto** — mexe no coração do gating; precisa de matriz clara do que é free vs premium por feature; envolve os 3 repos e billing.
- **Prioridade — justificativa:** decisão estratégica central; muitos outros itens dependem de definir o que é premium.
- **Direção recomendada:**
  1. **Aposentar `canWrite` como "tem plano pago"**. Substituir por capacidades granulares: `features: { can_write: <derivado de dentro/fora do limite>, ai_meal_analysis: { allowed, limit, used, period: 'day' }, ... }`. Default seguro em falha: assume free (nunca liberar premium por engano).
  2. **Análise de imagem por IA**: hoje `analyzePostPhoto`/`createPost` é gated por `ctx.canWrite` + cap diário `MAX_DAILY_AI_ANALYSES = 10`. Novo modelo: contar por **dia** por paciente e aplicar limite conforme o plano do nutri (**free=3, pago=10**). Aposentar o gate `ctx.canWrite` da IA (free passa a ter 3, não 0). Padronizar a UX do estado `QUOTA_EXCEEDED` (hoje o post fica `skipped` sem mensagem clara no app).
  3. **`can_write` do paciente**: `true` quando o paciente está **dentro do limite** do nutri (independente de free/pago); `false` apenas quando é **excedente** (ver P-2). Nunca depende de "nutri é free".
  4. `ReadOnlyBanner` passa a significar **exclusivamente** "você é um paciente excedente; peça ao seu nutricionista para regularizar" — nunca mais "nutri é free".
  5. Atualizar `WhatsApp/marketing`: nunca citar número de créditos (ver memória de branding); descrever capacidade.
- **Dependências:** P-2 (define quem é excedente e o contrato `features`); toca `resolveAccessCode.ts`, `portal.service.getHome`, `requireWrite`, `createPost`/`analyzePostPhoto`, `src/stores/features.ts`.

### P-2 · Domínio de downgrade / limite de pacientes ativos — ✅ **VALIDADO + MATRIZ DOCUMENTADA (Jul/2026)** · **Crítica** · **G**
> Matriz `plano × entidade × ação` + achados de validação no bloco "✅ P-2 VALIDADO + MATRIZ" abaixo. Decisões de produto **fechadas** (chat + push-token abertos p/ excedente — decisão 12.7).
- **Problema:** Falta um modelo explícito para "nutri tinha plano pago com N pacientes e cancelou". Hoje o efeito é grosseiro (tudo vira read-only via `isPaidPlan=false`). Precisamos de regras determinísticas e testáveis.
- **Impacto:** evita perda de dados/confiança; define a monetização.
- **Risco:** alto (edge cases financeiros + clínicos).
- **Política DECIDIDA (seção 12) — duas penalidades distintas:**
  - **Penalidade do NUTRI (global, independente do paciente) — JÁ EXISTE:** quando `patients_overlimit`, o nutri perde **toda** ação de escrita em pacientes no web (`usePatientLimitGate.guardWriteAction`). Pune o **decisor**, não o paciente. Nada novo a construir no web aqui.
  - **Penalidade do PACIENTE (por paciente, só excedentes):** apenas os pacientes **excedentes** entram em READ-ONLY no app. **Critério fechado (seção 12.6): CAP PELOS MAIS ANTIGOS** — slots por **ordem de criação** (`created_at` asc, só ativos): os **N mais antigos** (= `max_patients`) mantêm o slot; os que passam de N (mais novos) são excedentes → read-only. Vale igual no downgrade e em criação sobre o limite.
  - **Novos pacientes** sobre o limite: **tela de decisão** (upgrade / arquivar inativo p/ liberar slot / prosseguir como excedente read-only), em vez de erro seco.
  - **Regularização** (upgrade OU arquivar inativos): quem volta a caber no limite **destrava sem perda** (dados nunca apagados, só o registro fica pausado).
- **Como derivar o excedente (sem migração, sem flag armazenado):** hoje `patients_overlimit`/`patients_readonly` são calculados **on-the-fly** em `me.service.getSubscription` como `max_patients !== null && active_patients > max_patients` (global/binário; `active_patients` = `nutritionists.active_patient_count`; `max_patients` = plano, `null` = ilimitado). Para o **por paciente**, o resolve do portal calcula o **rank de criação** na hora (já tem o `created_at` do paciente + `max_patients` do nutri):
  ```sql
  SELECT COUNT(*) AS rank FROM patients
  WHERE nutritionist_id = ? AND archived_at IS NULL AND deleted_at IS NULL
    AND (created_at < :cat OR (created_at = :cat AND id <= :pid))
  ```
  Excedente ⇔ `max_patients IS NOT NULL AND rank > max_patients`. **Query indexada barata** (`idx_patients_nutritionist`), **sem migração** e **sem manutenção de flag**.
  - **Tie-break por `id`** → fronteira determinística quando dois `created_at` colidem.
  - **Arquivar libera slot automaticamente**: ao arquivar um ativo, o rank de todos os posteriores cai 1 → o excedente mais antigo é promovido (exatamente o incentivo desejado).
- **⚠️ Cuidado de implementação (validar antes de codar):** o gate global do nutri usa `active_patient_count`, que é um **contador denormalizado** em `nutritionists` (não um `COUNT` ao vivo — ver `me.repository.getUsageStats`). A query de rank do paciente faz um `COUNT` real com `archived_at IS NULL AND deleted_at IS NULL`. **Se os gatilhos que incrementam/decrementam `active_patient_count` não usarem exatamente esse mesmo critério** (ex.: contam soft-deletes, ou não decrementam ao arquivar), a fronteira por-paciente pode divergir do gate global em ±1. **Ação:** localizar onde `active_patient_count` é mantido e garantir critério idêntico ao da query de rank (ou trocar o gate global por `COUNT` ao vivo para eliminar a fonte de drift).
- **Edge cases:** ver seção 9.
- **Direção recomendada:** documentar a matriz `plano × entidade × ação` e só então implementar. **Reusar** o downgrade lifecycle da API e o `usePatientLimitGate` do web — o read-only do paciente deve derivar do **mesmo** cálculo de excedente (cap por `created_at`), nunca de um paralelo.

#### ✅ P-2 VALIDADO + MATRIZ (Jul/2026) — pré-requisito do P-1

**Achados da validação no backend (`alianutri-api`):**
- **Drift do `active_patient_count`: praticamente resolvido (melhor que o temido).** `patient.service.syncPatientCount()` recalcula via `repo.countActive()` = `COUNT(*) WHERE archived_at IS NULL AND deleted_at IS NULL` — **exatamente o critério da query de rank** — em create, archive, unarchive, softDelete, restore e import CSV. Logo o gate global (`me.service.getSubscription` → `patients_readonly = active_patients > max_patients`, via `active_patient_count`) e o rank por-paciente do portal **concordam por construção**. **Único resíduo:** `public-booking.service` usa `+1` cru (sem resync) → risco de ±1 só se o contador já estivesse defasado (baixo). *Ação P-1:* derivar excedente da **mesma** query de rank ao vivo no portal; opcionalmente trocar o `+1` do public-booking por `syncPatientCount`.
- **CORREÇÃO: o limite free NÃO é 3.** O limite de **pacientes** do plano free/sem-assinatura = `max_patients` = **5** (confirmado em `patient.service` `?? 5`, `me.service` `|| 5`, swagger "Default 5 se sem plano"). O "3" do edge case 7 confundiu com a **cota de IA/dia** (free=3/dia). O excedente usa o `max_patients` real do plano, **nunca** um número fixo. → *edge case 7 corrigido abaixo.*
- **Chat e push-token do paciente são gated por `requireWrite`.** Sob "excedente = read-only", um excedente **não conseguiria falar com o nutri** (pedir regularização) nem registrar push. Ver decisão pendente na matriz.

**Dois eixos independentes:**
- **`can_write`** (escrita geral): `true` se o paciente está **dentro do limite** (rank ≤ `max_patients`), **independente** do nutri ser free/pago; `false` só para **excedente**. (Hoje é `= isPaid` no `resolveAccessCode` → muda no P-1.)
- **Cota de IA de foto/dia**: depende do **plano do nutri** — free = 3/dia, pago = 10/dia (por paciente, reset meia-noite BRT). Só relevante quando `can_write=true`.

**Matriz `entidade × ação` (todas as rotas `requireWrite` mapeadas em `portal.routes.ts`):**

| Entidade / rota | Dentro do limite (nutri free OU pago) | Excedente (read-only) |
|---|---|---|
| Diário alimentar `POST/DELETE /food-diary` | ✅ | 🔒 |
| Foto do diário `POST /diary/upload-photo` | ✅ | 🔒 |
| Posts do feed `POST/DELETE/PATCH /diary/posts` | ✅ | 🔒 |
| Água `POST/DELETE /water` | ✅ | 🔒 |
| Peso `POST /weight` | ✅ | 🔒 |
| Sintomas/bem-estar `POST /symptoms` | ✅ | 🔒 |
| Metas check-in `POST /goals/:id/checkin` | ✅ | 🔒 |
| Metas progresso `POST /goals/:id/progress` | ✅ | 🔒 |
| Questionários `POST /questionnaires/:id/answer` | ✅ | 🔒 |
| Fotos de progresso `POST/DELETE /progress-photos` | ✅ | 🔒 |
| Foto de perfil `POST/DELETE /profile/photo` | ✅ | 🔒 |
| Agendamento `POST /booking/request` | ✅ | 🔒 |
| Push token `POST /push-token` | ✅ | ✅ **(decisão 12.7)** — comunicação, não dado clínico |
| Chat `POST /chat` | ✅ | ✅ **(decisão 12.7)** — canal p/ pedir regularização |
| **IA de foto** (análise) | ✅ com cota **nutri pago 10/dia · free 3/dia**; hoje gated por `canWrite` (free=0) → **mudar** | 🔒 (sem escrita → sem post → sem IA) |
| **Leituras (todos os GET)** | ✅ sempre | ✅ sempre (só não escreve) |

> Paciente **arquivado** ≠ **excedente**: arquivado → `resolveAccessCode` 403 (tela dedicada, B-3); excedente **lê tudo**, só não escreve.
>
> **⚠️ Implicação de implementação (decisão 12.7):** o read-only do excedente **não pode** ser um único flag `can_write` aplicado a todas as rotas de escrita. `POST /chat` e `POST /push-token` devem **sair** do gate de excedente (continuar exigindo só acesso válido/não-arquivado, nunca `!excedente`). Ou seja, o `requireWrite` dessas 2 rotas deve virar um gate mais leve (ex.: `requireAccess`), e `can_write` (excedente) protege apenas as rotas de dado clínico.

**Mudanças concretas do P-1 (referência p/ a próxima etapa):**
1. `middleware/resolveAccessCode.ts`: `canWrite = isPaid` → `canWrite = !isExcedente` (rank ≤ `max_patients` via query de rank + `getPatientLimit`; `max_patients IS NULL` = ilimitado → sempre dentro).
2. `portal.service` IA (`createPost`/`analyzePostPhoto`): aposentar o gate `ctx.canWrite`; cota/dia = free 3 / pago 10 (plano do nutri); UX amigável do `QUOTA_EXCEEDED`.
3. App `src/stores/features.ts`: expandir de `canWrite` para objeto de capacidades (resto do T-2).
4. `ReadOnlyBanner`: passa a significar **só** "excedente".

### P-3 · Registro retroativo de peso (calendário) — ✅ **CONCLUÍDO (Jul/2026)**
- **✅ Implementado (tsc 0 nos 2 repos; pendente QA em device):**
  - **Auditoria:** o backend `POST /p/:code/weight` **já aceitava `date` arbitrária** e faz **upsert por data** (`INSERT OR REPLACE` na `UNIQUE(patient_id, nutritionist_id, entry_date, source)`), e `syncCurrentWeight` deriva o peso atual pelo `entry_date` mais recente (data passada não sobrescreve o header — edge 18 ok). Retroativo = **só frontend**.
  - **App:** novo `src/components/ui/CalendarSheet.tsx` (grade de mês própria em `BottomSheet`, **dias futuros desabilitados**, sem dependência nova). `weight.tsx`: seletor de data (default hoje) → registra na data escolhida; **editar** = tocar num registro `source='patient'` pré-preenche data+peso (salvar substitui, aviso "já há X kg nesse dia"); **excluir** = ícone lixeira nos registros do paciente → `ConfirmDialog` → `DELETE /weight/:date`. Registros do nutri (`source='nutritionist'`) mostram tag "nutri" e não são editáveis/excluíveis.
  - **Backend:** novo `DELETE /p/:code/weight/:date` (`requireWrite`) → `deleteWeight` remove só `source='patient'` da data + `syncCurrentWeight`. Hook `useDeleteWeight` no app.
- **Problema (original):** `weight.tsx` só envia `date: todayStr()`. Não há como registrar peso de dias anteriores → barreira para quem migra de outro app.
- **Impacto:** onboarding de novos usuários, riqueza histórica imediata dos gráficos.
- **Risco:** baixo/médio (precisa validar duplicidade por data e o contrato do backend).
- **Direção recomendada:**
  1. Seletor de data **por calendário** (mês, com dias futuros desabilitados) — não "voltar um dia por vez". Avaliar um date-picker leve (bottom sheet com grade de mês própria, para não adicionar dependência pesada).
  2. Backend: confirmar/estender o endpoint de log de peso para aceitar datas passadas (hoje o peso do paciente entra via qual rota? auditar — parece via evolution/food-diary; **verificar contrato** antes).
  3. Regra de "upsert por data" (registrar 2x no mesmo dia sobrescreve ou pergunta).
  4. Permitir **editar/excluir** um registro histórico (hoje a lista de histórico é read-only).

### P-4 · Peso: transformar dado em narrativa — ✅ **CONCLUÍDO (Jul/2026)**
- **✅ Implementado (tsc 0; pendente QA em device):**
  - Util puro **`src/lib/weightStats.ts`**: `movingAverage(values, w)` (trailing, janela parcial no início), `weeklyRate(points)` (velocidade kg/sem por regressão linear mínimos quadrados) e `weeksToTarget(current, target, rate)` (ETA; `null` se ~0 ou afastando-se). Desenhado para T-6 (testável; sem runner ainda no app).
  - **`LineChart`** ganhou prop `overlay?: { values, color?, dashed? }` (2ª linha alinhada 1:1 — média móvel), somada ao `target` (linha tracejada) e `band` (faixa) já existentes.
  - **`weight.tsx`**: sparkline caseiro trocado pelo `LineChart` compartilhado com **série bruta + média móvel 7d + linha de meta (goal `weight`) + faixa saudável (IMC 18,5–25 × altura)**; legenda; **chips de insight** (Ritmo kg/sem, Meta em ~N sem/atingida); **cor de tendência por distância à faixa saudável** (ou à meta; fallback perda=verde) — mesma lógica do `ProgressView`.
  - **`ProgressView`**: passa `target` (meta de peso) na métrica de peso (antes só `band`).
- **Problema (original):** `weight.tsx` e `ProgressView` mostram sparkline/linha básica. Faltam elementos que "contam a história": **média móvel** (suaviza ruído diário), **linha de meta** (o `LineChart` já suporta `target`, mas peso não passa meta), **velocidade** (kg/semana), **projeção** para a meta, comparações (7d/30d), e feedback visual de "no ritmo / acelerando / estagnou".
- **Impacto:** engajamento e percepção de valor; reforça adesão.
- **Risco:** baixo (dados já existem).
- **Direção recomendada:**
  1. Média móvel de 7 dias sobreposta à série bruta.
  2. Integrar meta de peso (de `goals` tipo `weight`) como `target` no `LineChart`.
  3. Cartão de insight: variação no período, média/semana, e (se houver meta) ETA estimada.
  4. Cor de tendência já usa "distância à faixa saudável" no `ProgressView` — trazer essa lógica para a tela de peso.

### P-5 · Nutrição: insights úteis, sem exagero — ✅ **CONCLUÍDO (Jul/2026)**
- **✅ Implementado (tsc 0; só frontend; pendente QA em device):** tudo no `ProgressView` (métrica nutrição):
  - **Linha de meta calórica** no gráfico (`target` do `LineChart`) = `active_meal_plan.target_kcal ?? total_kcal` (via `usePortalHome`).
  - **Card de aderência** (3 `StatTile`): *Média/dia* (kcal médio dos dias com registro), *Da meta* (% da média vs `target_kcal`, colorido: 90–110% verde / <90% info / >110% atenção) e *Registrados* (nº de dias).
  - **Média diária de macros** (`MacrosBar` com média, não soma do período) + legenda **"Meta do plano: P·C·G"** quando `useMealPlanDetail(activePlan.id)` traz `target_protein/carbs/fat_g`.
  - Escopo contido (qualidade > quantidade): reusa `target` do `LineChart` (P-4) e componentes locais `StatTile`/`fmtG`.
- **Problema (original):** `ProgressView` (métrica nutrição) mostra só calorias/dia + macros somados do período. Subaproveita `food_diary_entries` (que já tem macros reais via IA).
- **Impacto:** dá sentido ao registro de fotos; fecha o loop "registrei → aprendi algo".
- **Risco:** baixo.
- **Direção recomendada (qualidade > quantidade):**
  1. **Aderência à meta calórica** do plano ativo (dias dentro da faixa vs fora) — o plano já expõe `target_kcal`.
  2. Distribuição média de macros vs recomendado (barra comparativa).
  3. "Dias registrados no período" com incentivo (conecta à gamificação existente).
  4. Evitar poluir: no máximo 2–3 cartões, com 1 número-herói cada.

### P-6 · Onboarding de identidade + coleta progressiva — **Alta** · **M** (liga com S-3)
- **Problema:** primeiro acesso só pede o código. Não confirma identidade nem completa dados faltantes.
- **Impacto:** segurança (ver S-3) + qualidade dos dados (peso/altura/nascimento alimentam metas, hidratação, IMC).
- **Direção recomendada:** ver S-3 (validação de identidade) — aproveitar o primeiro login para, de forma leve e opcional, completar dados que faltam (nascimento/altura), explicando o benefício ("para personalizar sua meta de água").

---

## 5. Melhorias de Segurança

> **Contexto crítico:** o código de acesso É a autenticação, viaja na URL de toda request, é permanente, sem device binding, sem rate-limit e sem expiração. Qualquer vazamento (print, WhatsApp encaminhado, histórico de navegador) = acesso clínico total e indefinido.

### S-1 · Rate-limiting + lockout no resolve do código — ✅ **CONCLUÍDO (Jul/2026)**
- **✅ Implementado (`tsc` 0 erros):** **lockout por falhas** no `resolveAccessCode` (choke point da auth do portal). Novo helper `patient-portal/middleware/portalAuthLockout.ts` (`checkPortalAuthLockout` / `recordPortalAuthFailure`) sobre o **`RATE_LIMIT_KV`** existente + `getClientIp` (sem mecanismo paralelo). Só tentativas **inválidas** por IP contam (`portal_auth_fail:{ip}`); **código válido nunca incrementa** → tráfego legítimo não é afetado. Threshold **20 falhas / 10 min → 429** com `Retry-After` (janela desliza no TTL do KV). **Fail-open** se KV indisponível. App: 429 vem com `code: "RATE_LIMITED"` (capturado por `ApiError`); o login já exibe a mensagem do servidor. Trade-off aceito: NAT compartilhado pode somar falhas (threshold generoso mitiga).
- **Problema:** `resolveAccessCode` faz lookup direto sem throttling. O código aleatório tem ~64 bits (16 hex, 1º char ∈ 6 letras), então brute-force online é impraticável **se** houver rate-limit — mas hoje **não há**. Enumeração/força bruta distribuída é teoricamente possível e barata sem limites.
- **Impacto:** exposição de dados de saúde (LGPD).
- **Risco:** médio de implementação (Workers + KV/DO para contadores).
- **Direção recomendada:** rate-limit por IP e por prefixo de tenant no endpoint de resolve; backoff exponencial; alertar em picos. Barato e alto retorno.

### S-2 · Sessão confiável vinculada ao dispositivo — ✅ **CONCLUÍDO (Jul/2026) — pendente QA em device + deploy da migração 0011**
- **✅ Implementado (tsc 0 nos 3 repos; 14 testes da cascata verdes):** migração tenant `0011_patient_session_binding.sql` (device_id/session_token_hash/session_version/identity_verified_at); `PatientSessionRepository` + `PatientSessionService` (pareamento + cascata); endpoints `POST /p/:code/session/pairing/start|verify` (isentos do enforcement); enforcement em `resolveAccessCode` atrás da flag `PATIENT_SESSION_BINDING` (default ON) → 401 `PAIRING_REQUIRED`; conflito de device → 409 `DEVICE_ALREADY_BOUND`. App: `device_id` (expo-crypto) + token no SecureStore + header `X-Patient-Session` + tela `app/pair.tsx` + `PairingGate`. Web+API nutri: `POST /patients/:id/reset-session` + `ResetSessionModal` no `PatientDetailPage`.
> 📋 **Plano detalhado (Jul/2026):** `alianutri-api/docs/DESIGN_S2_S3_PATIENT_SESSION.md` — migração `0011`, contrato de pareamento, enforcement atrás de feature-flag, rollout e decisões em aberto. S-2 e S-3 serão executados juntos (acoplados pelo estado de sessão).
- **Decisões fechadas (seção 12):** **1 dispositivo por paciente** (sessão única). **Reset apenas pelo nutri** (sem self-service).
- **Racional do usuário (registrado):** o processo chato é só no 1º contato — depois o app **permanece conectado**. O reset só pelo nutri é a trava proposital: mesmo que um atacante tenha os **dados** do paciente (vazamentos são o vetor mais comum hoje), ele não consegue parear um novo device sozinho. O código de acesso existente cumpre exatamente esse papel de **trava**.
- **Análise crítica:** a estratégia é boa (onboarding simples, sem SMS/WhatsApp, custo ~zero), mas só fecha o buraco se **o código deixar de ser suficiente por si só** após o pareamento — caso contrário o código encaminhado continua abrindo tudo em qualquer device.
- **Desenho recomendado (device-bound token, espelhando `user_sessions`/`session_version` do core):**
  1. No 1º acesso válido (código + validação de identidade — S-3), o servidor **emite um token de sessão** ligado a um `device_id` gerado no cliente (guardado em `SecureStore`).
  2. Requests passam a autenticar por **esse token** (header), não mais pelo código na URL (ver S-4). O código vira **credencial de pareamento inicial** apenas.
  3. **Schema (migração necessária — hoje não existe):** adicionar em `patients` (ou tabela `patient_sessions`) os campos de dispositivo/sessão — `device_id`, `session_token_hash`, `session_bound_at`, `last_seen_at`, e um `session_version`/`revoked` para invalidação (mesmo padrão de `users.session_version`). Como é **1 device**, colunas em `patients` bastam.
  4. Novo device com o mesmo código ⇒ **bloqueado** até o nutri **resetar** ⇒ incrementa `session_version` (invalida o token atual) e permite novo pareamento.
  5. **Reset pelo nutri:** **estender o fluxo já existente** de código (a timeline já tem `access_code_regenerated`). "Resetar acesso do paciente" = limpar binding + (opcional) regenerar código, registrando o evento na timeline.
  6. **Migração/rollout**: sessões atuais (só código) seguem válidas até o 1º upgrade; **feature-flag** + telemetria para rollout gradual.
- **Alternativas consideradas (descartadas):** magic link por e-mail (atrito + nem todo paciente tem e-mail); OTP SMS/WhatsApp (descartado pelo usuário: custo + atrito). *PIN local biométrico* fica como item **complementar futuro** (F-1), só para reabrir o app — não substitui o binding.
- **Impacto:** elimina o cenário "código encaminhado = acesso eterno de terceiros".
- **Risco:** alto (auth ponta a ponta + fluxo de suporte "troquei de celular"). Feature-flag obrigatório.
- **Prioridade — justificativa:** maior impacto de segurança e priorizado pelo usuário.
- **Dependências:** S-3 (validação no pareamento); tela do nutri no `alianutri-web` (botão "resetar acesso", reusando o fluxo de código); **migração de schema** no tenant DB.

### S-3 · Validação de identidade no primeiro acesso — ✅ **CONCLUÍDO (Jul/2026)**
- **✅ Implementado:** cascata `birth_date → cpf(completo, hash) → phone(últimos 8 dígitos) → coletar nascimento` 100% server-side em `PatientSessionService.verify` (nunca envia o valor esperado ao cliente); falha alimenta o lockout S-1 (anti-oráculo) + audit `identity_verify_failed`. App pede o dado conforme o `method` retornado pelo `start` (dica dos 2 últimos dígitos no telefone).
> 📋 **Plano detalhado (Jul/2026):** `alianutri-api/docs/DESIGN_S2_S3_PATIENT_SESSION.md` — a validação de identidade acontece **no pareamento** (S-2); a cascata `birth_date → cpf → phone → coletar` está especificada lá, com comparação server-side + lockout S-1.
- **Problema:** hoje o código sozinho pareia. Proposta: no 1º acesso, confirmar identidade com dados **já existentes** no cadastro.
- **Campos confirmados no schema** (`patients`): `birth_date` (texto, opcional), `cpf` (AES-GCM, opcional) + `cpf_hash` (SHA-256 do **CPF completo**), `phone` (via profile). Todos podem ser nulos → a cascata precisa lidar com cadastro incompleto.
- **Direção recomendada (cascata inteligente):**
  1. Se houver **data de nascimento** → pedir confirmação (baixo atrito, alta memorabilidade).
  2. Senão, se houver **CPF** → pedir o **CPF completo** e comparar `sha256(cpf_input) == cpf_hash` **no servidor**. ⚠️ Não dá para pedir "últimos dígitos" porque `cpf_hash` é hash do CPF **inteiro** (não se derivam dígitos parciais de um hash).
  3. Senão, se houver **telefone** → confirmar final do número.
  4. Se **nada** existir → pedir **um** dado leve (ex.: nascimento) antes de concluir — também melhora personalização (P-6).
- **Notas de implementação:** comparação **sempre no servidor** (nunca enviar o valor correto ao cliente); normalizar formato (data/CPF/telefone) antes de comparar; **limitar tentativas** (liga com S-1) para não virar oráculo de brute-force de CPF/nascimento.
- **Impacto:** aumenta muito a segurança do pareamento com atrito mínimo.
- **Risco:** médio (cadastros incompletos + risco de virar oráculo se não houver rate-limit).

### S-4 · Endurecer transporte do código enquanto S-2 não existe — **Alta** · **P**
- **Problema:** o código na URL aparece em logs de proxy/observabilidade e histórico. Enquanto a sessão device-bound (S-2) não chega, mitigar.
- **Direção:** avaliar mover o código para header `Authorization`/custom em vez de path (mudança de contrato na API — planejar junto de S-2 para não fazer duas vezes); garantir que logs do Worker não persistam o path completo.

### S-5 · Logout/rotação e "esqueci meu acesso" — ✅ **CONCLUÍDO (Jul/2026)**
- **✅ Feito:** (a) ação unificada do nutri "Resetar acesso do app" (web `PatientDetailPage` → `POST /patients/:id/reset-session` → `resetSession` limpa binding + `session_version++` + audit/timeline); (b) tela de ajuda `app/help-access.tsx` (rota `/help-access`) orientando 3 cenários (perdi/esqueci o código, troquei de aparelho, não confirmo identidade) → falar com o nutri; link "Preciso de ajuda para entrar" no `login.tsx` e nas fases conflict/error/question do `pair.tsx`.
- **Correção da análise:** a **rotação de código já existe** no lado do nutri (a timeline registra `access_code_generated` / `access_code_regenerated`). O que falta é o **auto-atendimento no app** e a integração com o reset de sessão (S-2).
- **Direção:** no app, tela de ajuda "perdi o acesso" que orienta a falar com o nutri; unificar "regenerar código" (existente) + "resetar sessão/binding" (S-2) numa **única ação do nutri** ("Resetar acesso do paciente") para não ter dois botões confusos.

---

## 6. Melhorias de UX

### U-1 · Estados de erro/vazio/carregando consistentes — ✅ **CONCLUÍDO (Jul/2026)**
- **Problema original:** telas ignoravam `isError` — falha de rede caía no `EmptyState` "Sem X" (enganoso, sem retry). Loading/empty já eram consistentes (`SkeletonList`/`LoadingScreen`/`EmptyState`).
- **✅ Feito:** novo componente **`ErrorState`** em `src/components/ui/index.tsx` (espelha o `EmptyState`: ícone `CloudOff` em `errorLight`, título/descrição padrão "Não foi possível carregar / Verifique sua conexão…", botão **"Tentar novamente"** → `onRetry`, `accessibilityRole="alert"`). Ordem de gating padronizada: **loading → error → empty → conteúdo**.
- **Telas cobertas:** `guidelines`, `documents`, `questionnaires`, `goals`, `profile`, `meal-plan`, `progress-photos`, `chat`, `booking` (config), `nutri` (home + consultas), `diary` (feed), `post/[id]`, e home (`(tabs)/index.tsx` refatorado p/ usar `ErrorState`, mantendo o ramo `ACCESS_DISABLED`).
- **Exceções deliberadas:** `food-diary` (erro cai no `FreeDiary`, fallback melhor que bloquear); `ProgressView` (agregador de 6 queries — degrada p/ empty + pull-to-refresh no pai). `tsc` 0.

### U-2 · Registro em 1 toque a partir da Home e do plano — ✅ **CONCLUÍDO (Jul/2026)**
- **Problema original:** água já era 1-toque no `RegistroSheet` (200/300/500 ml), mas **peso exigia navegar** até `/weight` (via tile do grid), e o plano não oferecia registrar refeição com foto no mesmo lugar.
- **✅ Feito (1) Peso rápido inline:** nova seção "Peso de hoje" no `RegistroSheet` (`src/components/registro/RegistroSheet.tsx`) — stepper `−/valor/+` (passo 0,1 kg, clamp 20–400) **pré-preenchido com o último peso** (registro do paciente > `profile.weight_kg` > fallback 70) + botão **"Salvar"** (`useLogWeight`, feedback ✓ + XP toast, sem sair da folha). O tile "Peso" do grid foi **mantido** (é a única porta para `/weight`: histórico/retroativo/gráfico).
- **✅ Feito (2) Foto no plano:** botão-atalho **Câmera** na linha de ações de cada refeição não-registrada (`app/(tabs)/meal-plan.tsx`, ao lado de "Segui/Parcial") → abre `/post-compose?type=meal`.
- **Verificação:** `tsc` 0 · 51/51 testes verdes.

### U-3 · Microinterações e feedback de conquista — ✅ **CONCLUÍDO (Jul/2026)**
- **Problema original:** haptics dispersos e inconsistentes — muitas chamadas `Haptics.*Async(...)` **sem `.catch()`** (unhandled rejection em web/sem motor háptico), duas sequências de celebração "na mão" divergentes (`food-diary` 5 pulsos × `CelebrationModal` 3), e nenhuma guideline de quando usar cada feedback.
- **✅ Feito — helper central `src/lib/haptics.ts`** (fire-and-forget, nunca lança): `selection/light/medium/heavy/success/warning/error` + `celebrate()` (sequência multi-toque unificada de 5 pulsos que retorna `cancel()` p/ limpar timers). Teste `src/lib/haptics.test.ts` (4 casos: mapeamento, sequência, cancel, no-throw) via alias `expo-haptics`→mock no `vitest.config.ts`.
- **✅ Migrados p/ o helper:** `food-diary` (9 chamadas, incl. celebração), `weight`, `chat`, `wellness`, `meal-plan`, `RegistroSheet`, `XpToast`, `LevelUpCelebration/CelebrationModal`. Design-system (`src/components/ui/*`: Button, IconButton, SegmentedControl, etc.) já usava `.catch()` — fica como legado seguro, migra oportunisticamente. (`assets/wellness.tsx` é **código morto** não-importado — candidato a remoção fora do escopo.)
- **📋 Guideline de feedback (canônica):**
  - **Toast** = mensagem que o usuário precisa **ler** (sucesso com texto, erro, info). Sempre pareado com haptic.
  - **Haptic** = confirmação **tátil** de intenção: `selection` (toggle/stepper/segmented), `light` (navegação/sheet), `medium` (ação primária/Button), `success/warning/error` (resultado de operação).
  - **Animação** (`SuccessBurst`/`XpToast`) = recompensa **leve e frequente** (registrar refeição, +XP).
  - **Celebração** (`CelebrationModal`/confetti + `haptics.celebrate()`) = marco **raro** (subir de nível, plano do dia 100%). **Máx. uma por evento** — nunca empilhar celebração + burst juntos.
- **Verificação:** `tsc` 0 · 55/55 testes verdes.

### U-4 · Hierarquia visual do card "completar perfil" no mobile — ✅ **VERIFICADO — não se aplica (Jul/2026)**
- **Achado:** o problema do web-audit **não existe no app**. A home mobile já segue o padrão desejado (preenchimento progressivo): o único nudge sempre-visível é o `ProximoPasso` (`src/components/home/ProximoPasso.tsx`) — card **compacto de ação única** cuja lógica é a pura `lib/nextStep` (kinds: questionnaire/meal/upcoming/water/noPlan/allDone; **não há** kind "completar perfil"). Todos os cards secundários se **auto-ocultam** quando vazios (`GoalsPreview` retorna `null` sem metas; `WeightSparkline` exige ≥2 pontos; aderência exige dias; feed exige posts). Não existe card pesado de "completar perfil".
- **✅ Limpeza:** removida a variável **morta `hasAnyContent`** em `app/(tabs)/index.tsx` (computada e nunca usada — resquício de um welcome/empty-state removido). `tsc` 0.

### U-5 · Acessibilidade — � **CONCLUÍDO (varredura app-wide, Jul/2026)**
- **✅ Gráficos:** `LineChart` ganhou prop `accessibilityLabel` → a `View` externa vira 1 elemento acessível (`role="image"`) e o SVG fica `importantForAccessibility="no-hide-descendants"`. Resumos em `weight.tsx`, `ProgressView`, `profile.tsx`, home `WeightSparkline`.
- **✅ Fluxos críticos:** login/pair (títulos `header`, botões com `state`, erros com `liveRegion`, marca decorativa oculta), home (`HomeHeader` nome=header + streak agrupado; `AnelDoDia` labels com **progresso** de refeições/calorias/água), chat (`TextInput` rotulado, bolha = 1 elemento com remetente+status), food-diary (botões só-ícone rotulados, chips `state.selected`, rows `state.expanded`), RegistroSheet (headers de seção, `state` em água/peso).
- **✅ Telas secundárias (Jul/2026):** `settings` (temas `state.selected`, `Switch` rotulado, logout/rows role+label), `water` (opções/histórico/excluir com label+state, toggle `expanded`), `goals` (report: iniciar/input/salvar/cancelar), `questionnaires` (itens pendente/respondido, inputs rotulados, opções select/boolean/scale com `state.selected`, enviar com `state`), `booking` (nav de mês, dias/locais/horários/tipo com `state.selected/disabled`, confirmar), `wellness` (opções com `state.selected`, salvar), `progress-photos` (categoria `state.selected`, câmera/galeria), `documents` (via `Card`).
- **✅ Primitivos:** `Card` ganhou `role="button"` + prop opcional `accessibilityLabel` (beneficia todo uso com `onPress`, ex.: `documents`); `ListRow`/`EmptyState` ganharam role+label; `Button`/`IconButton`/`SegmentedControl`/`Avatar` já tinham role/label/state.
- **⏳ Resta (nice-to-have):** verificação de contraste com ferramenta automatizada + teste real de navegação por leitor de tela (TalkBack/VoiceOver) em device. `tsc` 0 · 55/55 testes.

### U-6 · Data/fuso consistente (BRT) — ✅ **CONCLUÍDO (Jul/2026)**
- **✅ Feito:** criado `src/lib/date.ts` como **fonte única** (BRT/UTC-3, o dia civil que o backend grava): `todayBRT()` (+ aliases `todayStr`/`todayISO`), `shiftDate()`/`addDays()` (aritmética ancorada ao meio-dia UTC → sem off-by-one por fuso), `mondayOf()`/`weekdayMon0()`, `fmtDateLabel()`/`fmtDateShort()`.
  - **Diagnóstico corrigido:** havia **duas noções de "hoje"** — `todayStr` (em `tokens.ts` + 4 cópias locais) usava **fuso do dispositivo**, enquanto `habit.todayISO()` usava BRT. Agora todos convergem para BRT.
  - **Delegação/dedup:** `theme/tokens` reexporta de `lib/date`; `lib/habit` delega `todayISO`/`addDays`/`mondayOf` (corrige off-by-one latente em devices a leste de UTC). Removidas as cópias locais em `food-diary.tsx`, `water.tsx`, `meal-plan.tsx`, `useReminders.ts` e o inline do `ProgressView`. tsc 0.
  - **Fora de escopo (proposital):** `chat.tsx` (agrupamento por timestamp via `ensureUTC`), formatação de `starts_at`, e `booking.tsx` (células de calendário selecionadas pelo usuário) — não são o "hoje" de registro diário.
- **Observação (original):** havia tratamento de BRT no backend e `ensureUTC` no chat; no app múltiplas construções manuais de `YYYY-MM-DD`. Risco de off-by-one perto da meia-noite.

---

## 7. Melhorias Técnicas

### T-1 · Padrão único de teclado (base para B-1) — ✅ **CÓDIGO CONCLUÍDO (Jul/2026)** (junto com B-1)
- Padrão único = `KeyboardAvoidingWrapper` (full-screen) + `BottomSheet` keyboard-aware (sheets/modais) + `app.json` `softwareKeyboardLayoutMode: resize`. Detalhes e checklist de QA em **B-1**. Pendente QA em device.

### T-2 · Contrato `features` tipado e versionado — ✅ **CONCLUÍDO (Jul/2026)**
- ✅ **CONCLUÍDO (Jul/2026):** `src/stores/features.ts` virou objeto de capacidades tipado (`canWrite` + `aiMealAnalysis: { limit, used, period }`) com `setFeatures` e defaults seguros (ausente → free). Backend `getHome` expõe `features.ai_meal_analysis`; `types/portal.ts` tipa o contrato; `(tabs)/index.tsx` usa `setFeatures`; `post-compose.tsx` mostra "restam X de Y hoje" / estado esgotado.
- ✅ **CONCLUÍDO (Jul/2026):** `water.tsx` lia `goal_source` via cast (`as {...}`) porque `WaterIntakeResponse` estava desatualizado. Adicionado o tipo `WaterGoalSource` (`'nutri'|'baseline'|'default'`) + campo `goal_source` em `src/types/portal.ts`; `useSmartWaterGoal` passou a importá-lo de lá (re-exporta p/ compat); cast removido em `water.tsx` (`const goalSource = data?.goal_source`). Sem mudança de runtime. `npm run ts:check` = 0 erros.

### T-3 · Camada de rede resiliente — ✅ **NÚCLEO CONCLUÍDO (Jul/2026)**
- ✅ **Implementado:** `api.ts` agora captura `code` do corpo (`ApiError.code`), trata **403 `PATIENT_OVER_LIMIT`** semanticamente (reflete read-only na UI via `setCanWrite(false)`), e aplica **timeout explícito** (`fetchWithTimeout` — 15s JSON / 30s upload) em todas as chamadas. Retry/backoff de 5xx/offline **já** é coberto pela fila offline (`mutationQueue`: 4xx → rollback/descarta, 5xx/408/429/offline → reenfileira; edge 8/13 satisfeito). `tsc` 0 erros.
- ✅ **B-3 concluído (Jul/2026):** 403 `ACCESS_DISABLED` agora tem `code` no backend + tela dedicada na Home + mensagem específica no login.
- **Original:** `api.ts` só tratava 401 (logout).

### T-4 · Segredos/entropia — ✅ **CONCLUÍDO (Jul/2026)** (junto com B-5)
- **✅ Implementado:** `clientId` migrado para `expo-crypto`. `device_id` (S-2) também usa `expo-crypto` (`randomUUID`). Auditoria: os demais usos de `Math.random` restantes são de UI/animação (não-sensíveis).

### T-5 · Cache de clima persistente + allowlist — ✅ **CONCLUÍDO (Jul/2026)** (junto com B-2)
- **✅ Constatado + corrigido:** a persistência já existia via React Query (allowlist por `key[1]`, não-clínico). O que faltava era **não poluí-la com `null`** — resolvido fazendo `fetchWeather` lançar. `dataUpdatedAt` fornece o timestamp do "último clima conhecido". Sem AsyncStorage paralelo (alinha à diretriz "não criar mecanismos paralelos").
- **Nota:** a allowlist usa `key[1]` como "resource"; para `['weather','v22']` isso é a versão (`'v22'`), que por não ser clínica é persistida — funciona, ainda que de forma um tanto acidental. Sem ação necessária.

### T-6 · Testes — ✅ **CONCLUÍDO (Jul/2026)** — runner + cobertura das libs puras
- **✅ Runner:** wired o **vitest** (antes os `.test.ts` eram dormentes — sem runner instalado). `package.json` ganhou `test`/`test:watch`; `vitest.config.ts` (env node, `include: src/**/*.test.ts`, alias `expo-crypto`/`expo-haptics` → stubs em `src/test/mocks/`); `tsconfig` exclui `**/*.test.ts`/config/mocks. **Requer Node compatível:** vitest **3.x** (o 2.x quebrava no loader ESM do Node 25). Instalar com `npm install --legacy-peer-deps` (conflito peer pré-existente: lucide-react-native@0.468 × React 19).
- **✅ Extensão (Jul/2026):** cobertos os 3 alvos que faltavam →
  - **Cálculo de hidratação** — `src/lib/hydration.test.ts` (15): `weatherBonusMl` (faixas temp/umidade, apparent vs seca), `calculateHydrationGoal` (peso×35 c/ piso 2000, ajustes calor/ar seco/idade, clamp 2000–4500, arredondamento p/ 50, `isPersonalized`/`factors`), `hydrationMessage`.
  - **Máquina de capacidades** — `src/stores/features.test.ts` (7): default **fail-open** (`can_write` ausente/`undefined` → `true`), modo somente-leitura, sincronização e limpeza da cota de IA, `setCanWrite` isolado.
  - **Contrato de DTO do portal** — `src/lib/habit.test.ts` (14): `habitStreak` diário (consecutivos, grace de "hoje ainda não marcado", buraco encerra) e semanal (`per_week`, grace da semana atual, fallback 1), `isCheckedToday`, `streakUnit`, `cadenceLabel` — tudo determinístico via `today` injetado.
- **Suíte: 10 arquivos / 91 testes verdes.** `tsc` 0.
- **⏳ Futuro (opcional):** cobrir `gamification.ts`/`goalMilestones.ts` (mais consumidores de DTO) e, se um dia entrar RTL, testar componentes.

### T-7 · Observabilidade de erros — **Média** · **M**
- Não há captura de erros de runtime (Sentry/equivalente). Para uma base de pacientes leigos, telemetria de crash/erro é essencial para achar os "some silenciosamente".

### T-8 · Reduzir gráficos caseiros duplicados — ✅ **CONCLUÍDO (Jul/2026)**
- **✅ Feito:** os 3 sparklines caseiros de peso (P-4 já migrou `weight.tsx`; agora `profile.tsx` `WeightChart` + home `WeightSparkline` em `app/(tabs)/index.tsx`) usam o `LineChart` compartilhado. Removidos os `Svg/Polyline/Circle/Defs/LinearGradient/Stop` duplicados (no `index.tsx` ficaram só `Svg`+`Rect` para as barras de aderência semanal, que não são sparkline). tsc 0.
- **Nota:** o gráfico de barras de aderência semanal (home) segue caseiro por ser de barras — fora do escopo do `LineChart` (linha).

---

## 8. Oportunidades futuras (backlog estratégico)

- **F-1 · PIN/biométrico local** para reabrir o app (complementa S-2; protege se o celular fica desbloqueado com terceiros).
- **F-2 · Widgets/atalhos** (iOS/Android) para "registrar água" sem abrir o app.
- **F-3 · Lembretes inteligentes** baseados em padrões (já há `useReminders`/notificações locais — evoluir para adaptativo).
- **F-4 · Exportar meu progresso** (PDF/imagem compartilhável) — reforça motivação e marketing orgânico.
- **F-5 · Integração com HealthKit/Google Fit** (peso, passos, hidratação) — reduz atrito de registro.
- **F-6 · Central de notificações in-app** (espelha a ideia já registrada para o web).
- **F-7 · Reconhecimento de rótulo/código de barras** para registro nutricional (usa o catálogo de alimentos já robusto na API).
- **F-8 · Modo offline mais rico** (já há fila de mutações; ampliar cobertura e feedback de "pendente de sincronização").

---

## 9. Edge cases identificados

**Segurança / sessão (S-2/S-3) — política: 1 device, reset só pelo nutri:**
1. Paciente troca de celular legítimo → **só o nutri reseta** (decisão fechada). O app deve mostrar mensagem clara "peça ao seu nutricionista para liberar o novo aparelho" (não é bug, é a trava). Medir volume de suporte gerado.
2. Paciente reinstala/limpa dados → `SecureStore`: no iOS o Keychain pode sobreviver à reinstalação; no Android normalmente não → definir comportamento e mensagem (pode exigir novo reset pelo nutri).
3. Paciente tem celular **e** tablet → com "1 device", o 2º aparelho exige reset → **aceito como trade-off** de segurança (decisão fechada). Comunicar com clareza.
4. Cadastro sem nascimento/CPF/telefone → fallback do S-3 (pedir 1 dado) precisa ser suave.
5. Data de nascimento (ou CPF) cadastrada errada pelo nutri → paciente não valida → caminho de escape (avisar nutri, que corrige e/ou reseta).
6. Código encaminhado antes do 1º pareamento → quem parear primeiro + passar no S-3 "ganha" o device → mitigado por S-3 (identidade) + S-1 (rate-limit). Depois do binding, o código sozinho não abre em outro device.

**Downgrade / limites (P-1/P-2) — política: excedente = READ-ONLY:**
7. Nutri paga → cancela com N pacientes ativos > limite free: excedentes = **os mais novos** (cap pelos N mais antigos por `created_at`; decisão 12.6). Ex. (limite free = `max_patients` = **5**, confirmado no backend — não 3, que é a cota de IA/dia): 50 pacientes → free → os **5 mais antigos** mantêm slot; os **45 mais novos** viram read-only. O **nutri** perde edição no web (global) até regularizar.
8. Paciente **excedente** tenta registrar → **bloqueado (read-only)** com `ReadOnlyBanner` explicando; dado **não** é aceito (decisão fechada). Garantir que a fila offline **não** enfileire e depois falhe silenciosamente para excedentes.
9. Nutri regulariza (upgrade **ou** arquiva inativos) → excedente destrava **sem perda** (dados nunca apagados).
10. IA de foto no limite: **por dia** — free=3, pago=10. O post nº 4 (free) / nº 11 (pago) → `skipped` com `QUOTA_EXCEEDED`; **criar UX amigável** desse estado no app (hoje não existe) e resetar a contagem à meia-noite BRT.
11. Paciente de nutri em `past_due` (período de graça) → tratar como pago (o web já faz; alinhar no portal).
12. Grupo (plano group) → `resolveEffectiveSubscriptionUserId` já resolve owner; validar que o portal usa o mesmo caminho para plano E para contagem de limite.
13. Paciente **excedente** cujo dado já estava na fila offline **antes** do downgrade → decidir se sincroniza o que já foi registrado (recomendado: sim, pois foi feito quando ainda era ativo) ou descarta.

**Clima / dados (B-2):**
14. `ipwho.is` responde mas `open-meteo` falha (ou vice-versa) → estado stale parcial.
15. Usuário viaja de cidade/fuso → cache de 30min pode mostrar clima da cidade anterior (aceitável).
16. Meia-noite BRT → bucket de calorias/água do "hoje" muda (já há tratamento no backend; validar no cliente).

**Registro retroativo (P-3):**
17. Dois pesos no mesmo dia (retroativo + hoje) → upsert vs duplicar.
18. Peso retroativo anterior à primeira avaliação do nutri → não deve quebrar gráficos de evolução/IMC.

---

## 10. Dependências entre funcionalidades

```
S-1 (rate-limit)  ─────────────┐
                               ├──► S-2 (sessão device-bound) ──► S-4 (transporte) ──► S-5 (rotação/reset)
S-3 (validação identidade) ────┘            │
                                            └──► precisa de tela "resetar sessão" no alianutri-web

P-1 (inverter free/premium) ──► define contrato `features` (T-2) ──► ajustes em todas as telas com ReadOnlyBanner
        │
        └──► depende de P-2 (política de downgrade/limite de pacientes) para saber o que bloquear

B-1 (teclado) ──► T-1 (padrão único) ──► corrige BottomSheet ──► food-diary passa a reusar BottomSheet

B-2 (clima) ──► T-5 (cache persistente) ; B-4 (timeout) é subitem de B-2

P-3 (peso retroativo) ──► P-4 (peso storytelling) usa a série mais rica ; ambos dependem de confirmar contrato de log de peso na API

P-4/P-5 (insights) ──► U-5 (a11y: resumo textual dos gráficos) ; T-8 (consolidar gráficos)
```

---

## 11. Ordem recomendada de implementação

> Princípio: **fundações antes de features**. Não construir enriquecimento sobre teclado quebrado, gating invertido ou auth frágil.

### Onda 0 — Correções rápidas de estabilidade (dias)
1. ✅ **CONCLUÍDO** — **B-4** timeout no fetch de clima · **B-2** último clima + estados (indisponível/stale/loading) · **T-5** (persistência já existia; corrigido o `return null` que a poluía).
2. ⏸ **B-6** questionário vazio — **EM ESPERA** (não reproduzido; aguardando evidência, ver seção B-6). · ✅ **B-7** avatar redondo/quadrado — **VALIDADO: não é bug** (código correto).
3. ✅ **CONCLUÍDO** — **T-2 (parcial)** tipar `WaterIntakeResponse.goal_source` (`WaterGoalSource`) e remover o cast em `water.tsx`. (Resto do T-2 — objeto de capacidades — fica na Onda 2/P-1.)

> **Onda 0 encerrada:** B-2/B-4/T-5 ✅ · B-6 ⏸ (sem evidência) · B-7 ✅ (não é bug) · T-2 parcial ✅.

### Onda 1 — Teclado (fundação de UX) 
4. ✅ **CÓDIGO CONCLUÍDO (Jul/2026)** — **B-1 / T-1**: padrão único de teclado + `app.json` + `BottomSheet` keyboard-aware + food-diary migrado ao BottomSheet. **Pendente: QA em device físico** (checklist em B-1).

### Onda 2 — Modelo comercial (fundação de produto)
5. ✅ **CONCLUÍDO (Jul/2026)** — **P-2**: matriz `plano × entidade × ação` documentada + validação backend (drift do `active_patient_count` mitigado; limite free = 5, não 3). Decisões de produto fechadas (12.7: chat + push-token abertos p/ excedente).
6. ✅ **CONCLUÍDO (Jul/2026)** — **P-1** (núcleo: `canWrite=!excedente`, chat/push liberados, IA free=3/pago=10, UX `QUOTA_EXCEEDED`) + **T-2** (objeto de capacidades tipado + cota de IA no `post-compose`) + **T-3** (403 `PATIENT_OVER_LIMIT` semântico + timeouts; fila offline já cobria 4xx/5xx). **Pendente:** QA runtime. (B-3 `ACCESS_DISABLED` ✅ concluído.)

### Onda 3 — Segurança (fundação de confiança)
7. ✅ **CONCLUÍDO (Jul/2026)** — **S-1** lockout por falhas no `resolveAccessCode` (KV `RATE_LIMIT_KV`, 20 falhas/10min → 429; código válido não conta; fail-open).
8. ✅ **CONCLUÍDO (Jul/2026)** — **S-3** validação de identidade no 1º acesso (cascata server-side).
9. ✅ **CONCLUÍDO (Jul/2026)** — **S-2** sessão device-bound (app/pair.tsx + PairingGate) sob flag `PATIENT_SESSION_BINDING` + reset do nutri no web (`reset-session`); **S-5** (reset unificado + tela `help-access` no app). **⏳ Único aberto da onda:** **S-4** (mover código do path→header) — despriorizado, pois com o S-2 o código já não basta sozinho. Deploy: aplicar migração `0011` no tenant DB.

### Onda 4 — Enriquecimento de acompanhamento
10. ✅ **CONCLUÍDO (Jul/2026)** — **P-3** peso retroativo (CalendarSheet + editar via tap + excluir via `DELETE /weight/:date`). Pendente QA em device.
11. ✅ **CONCLUÍDO (Jul/2026)** — **P-4** peso storytelling: `weightStats.ts` (MA/velocidade/ETA) + `LineChart` overlay + `weight.tsx` (MA 7d + meta + faixa + insights) + `target` no `ProgressView`. Pendente QA em device.
12. ✅ **CONCLUÍDO (Jul/2026)** — **P-5** insights de nutrição no `ProgressView`: linha de meta calórica + card de aderência (média/dia, % da meta, dias registrados) + média diária de macros vs meta do plano. Pendente QA em device.
13. ✅ **CONCLUÍDO (Jul/2026)** — **T-8** (3 sparklines de peso consolidados no `LineChart`: weight/profile/home) + **U-5 parcial** (resumo textual a11y dos gráficos via prop `accessibilityLabel`). **Onda 4 completa.** (Varredura a11y ampla = Onda 5.)

### Onda 5 — Polish de UX e técnico
14. ✅ **U-6** data/fuso BRT + ✅ **U-1** `ErrorState` (13 telas) + ✅ **U-2** registro 1-toque + ✅ **U-3** feedback (helper `haptics`, migração **app-wide**) + ✅ **U-4** (verificado, não se aplica) + ✅ **U-5** a11y (gráficos + fluxos críticos + **todas as telas secundárias** + primitivos) — Jul/2026. **UX da onda completa.** Resta só verificação de contraste + teste em device (nice-to-have).
    - **Correção de bug (Jul/2026):** a migração U-3 original tinha deixado **vários arquivos com `Haptics.*` direto**, alguns **sem `.catch`** (risco de unhandled promise rejection): `settings.tsx` (1), `water.tsx` (3), `progress-photos.tsx` (3). Todos migrados para o helper `haptics.*`. Agora **nenhuma** chamada direta a `expo-haptics` fora de `src/lib/haptics.ts`. Removido `assets/wellness.tsx` (duplicado morto, não-rota, com haptics sem catch).
15. ✅ **T-6** runner (vitest 3.x) + suíte **completa das libs puras** — **10 arq./91 testes verdes** (Jul/2026): estendido com hidratação (`hydration`), máquina de capacidades (`features`) e contrato de DTO (`habit`), além de `date`/`weightStats`/`nextStep`/`createActions`/`diaryUnseen`/`clientId`/`haptics`. Resta: **T-7** observabilidade (Sentry) — **despriorizado** (exige DSN/conta). ~~**B-5/T-4** entropia~~ ✅.

### Futuro (quando as ondas 0–5 estiverem estáveis)
16. Backlog F-1…F-8 conforme prioridade de negócio.

---

## 12. Decisões de produto (fechadas em Jul/2026)

> Decisões do owner (5 perguntas originais + 1 de refinamento). **Vinculantes** para a implementação.

1. **Downgrade × registro do paciente → EXCEDENTE = READ-ONLY** (refinado pela decisão 6). Só os pacientes **excedentes** ficam read-only (não todos); a penalização ampla é do **nutri** (edição global travada no web). Incentivo: o nutri **arquiva inativos** (recupera slots) ou **assina o plano ilimitado**. *(reflete em P-1, P-2, `ReadOnlyBanner`, edge cases 7–9,13)*
2. **Cota de IA de foto → POR DIA.** Nutri pago = **10/dia**; nutri free = **3/dia** por paciente. Objetivo: o paciente do free consegue usar, mas com limite que protege a saúde/custo da plataforma. *(reflete em P-1, edge case 10)*
3. **Sessão device-bound → 1 DISPOSITIVO por paciente.** *(reflete em S-2, edge case 3)*
4. **Reset de sessão → SOMENTE pelo nutri (sem self-service).** É mais seguro: mesmo que um atacante tenha os **dados** do paciente (vazamentos são o vetor mais comum hoje), ele não consegue parear um novo device sozinho — o código funciona como **trava**. O atrito existe só no 1º contato; depois o app **permanece conectado**. *(reflete em S-2, S-5, edge cases 1–2)*
5. **CPF existe no schema** (`cpf` AES-GCM + `cpf_hash` SHA-256 do CPF completo). A validação de identidade (S-3) pode usá-lo, mas via **CPF completo** (hash e compara), não "últimos dígitos". *(reflete em S-3 e seção 2.1.1)*
6. **Critério de excedente → CAP PELOS MAIS ANTIGOS.** Slots por **ordem de criação** (`created_at` asc, ativos): os **N mais antigos** mantêm o slot; os mais novos que passam de N são excedentes → read-only no app. Vale no downgrade e em criação sobre o limite. Complementa a decisão 1: a penalização do **nutri** é **global** (perde edição no web, `guardWriteAction` — já existe) e a do **paciente** é **por paciente** (só excedentes). *(reflete em P-1, P-2, edge case 7)*

7. **Excedente — exceções de comunicação.** Paciente excedente = read-only para **dado clínico**, mas mantém **chat** (`POST /chat`) e **push-token** (`POST /push-token`) **abertos** — são comunicação (não dado clínico), e o chat é o canal para pedir regularização ao nutri. Implicação: essas 2 rotas **saem** do gate de excedente (viram `requireAccess`, não `requireWrite`). *(reflete em P-1, matriz P-2, edge cases 7–9)*

> **Diretriz geral (pedido do owner):** ao implementar, **respeitar os fluxos e o schema existentes** — reusar `usePatientLimitGate` (web), o downgrade lifecycle da API, os eventos de timeline `access_code_(re)generated`, e o padrão de sessão do core (`user_sessions`/`session_version`). Não criar mecanismos paralelos.

---

*Fim do documento. As 7 decisões de produto estão fechadas. Próximo passo sugerido: iniciar pela Onda 0 (correções rápidas de estabilidade) enquanto se detalha a matriz `plano × entidade × ação` da Onda 2.*
