# 04 — Reconhecimento Técnico (Fase 0)

> Pré-requisito obrigatório antes de qualquer código de feature do P0. Mapeia a **realidade técnica** (API, componentes, navegação, estado) e os **GAPS** entre o redesign proposto (docs 02/03) e o que existe hoje.
>
> Legenda de gap: **[FE]** resolvível só no front · **[BE]** precisa de endpoint novo/alterado na `alianutri-api` · **[INFRA]** precisa de serviço/config nova.
>
> Stack confirmada: Expo **SDK 54** (RN 0.81, React 19, New Arch ON), Expo Router 6 (typedRoutes), React Query 5 + persist-client, Zustand 5, NativeWind 4, reanimated 4, gesture-handler, svg, expo-notifications, expo-image-picker/manipulator, expo-location. **Não há** lib de bottom sheet. (README cita SDK 52 — desatualizado.)

---

## 0.1 Mapeamento de API

**Cliente:** `src/services/api.ts` → `portalApi.{get,post,patch,put,delete,upload}`. Base `https://api.alianutri.com.br`. **Auth = access code na URL** (`/p/:accessCode/...`), sem JWT; 401 → logout. Upload = `multipart/form-data`.
**Backend:** Hono em `alianutri-api/src/modules/patient-portal/` (`api/routes/portal.routes.ts`, `controllers/portal.controller.ts`, `services/portal.service.ts`). Reações/comentários do nutri: `src/modules/patients/services/diaryPostNutri.service.ts`. Push: `src/shared/services/pushNotification.service.ts`.
**Mutações de escrita** passam por `requireWrite` (403 se `canWrite=false`).

### Contratos relevantes ao P0/P1

| Endpoint | Método | Request | Response (essencial) | Observações |
|---|---|---|---|---|
| `/home` | GET | — | `PortalHome` (patient, nutritionist, active_meal_plan, next_appointment, diary_streak, logged_dates, gamification_enabled, supplementation_enabled, supplements, chat_unread, pending_questionnaires, features.can_write) | **Já é um agregado.** Também grava `portal_access_log` (DAU/sessão >5min). `staleTime` 5min no cliente. |
| `/diary/today?date=` | GET | date (YYYY-MM-DD; default hoje) | `DiaryTodayResponse`: `meal_plan{id,name}`, `meals[]`=`{meal_index, meal_name, meal_time, foods[], entry|null}`, `entries[]`, `date` | **Fonte do "Refeições de hoje".** Junta plano ativo + entradas do dia. É **GET** (leitura) — não cria nada. |
| `/food-diary` | POST | `meal_type, entry_date, food_description` (obrig.) + opc.: `compliance_status, meal_plan_id, meal_index, photo_url, energy_kcal, protein_g, carbs_g, fat_g, quantity_g, notes, food_id` | `PortalFoodDiaryEntry` | **Mecanismo de adesão** (1-tap). Faz upsert por (`meal_plan_id`,`meal_index`,`entry_date`). Dispara `checkStreakMilestone` (push). **Sem IA, sem post no feed.** |
| `/food-diary` | GET/DELETE | date / entryId | lista / `{message}` | DELETE só apaga entradas `created_by_type='patient'`. |
| `/diary/upload-photo` | POST | multipart `photo` | `{photo_url}` | usado pelo fluxo de adesão com foto. |
| `/diary/posts` | POST | multipart: `type`(meal/exercise/mood/free), `caption?`, `emoji?`, `photo_original/medium/thumb?` | `DiaryPost` (`ai_status='pending'` se meal+foto) | **IA roda em background** (`waitUntil → analyzePostPhoto`). **Não aceita** `meal_plan_id`/`compliance` → não marca adesão nem conta streak. Tipos fixos (sem "marco"). |
| `/diary/posts` | GET | `cursor?`, `limit?` | `DiaryFeedResponse{posts[], next_cursor}` | cliente faz infinite + polling 5s enquanto houver `ai_status='pending'`. |
| `/diary/posts/:id` | GET/PATCH/DELETE | PATCH `{type}` | `DiaryPost`/`{message}` | PATCH só troca tipo. |
| reações/comentários | (escrita = **nutri**, no app-web) | — | aparecem em `DiaryPost.reactions[]`/`comments[]` | **Push já enviado ao paciente** (ver INFRA). Paciente só lê. |
| `/diary/streak` | GET | — | `{streak, logged_dates}` | streak = dias DISTINTOS consecutivos em `food_diary_entries`. |
| `/diary/weekly-adherence` | GET | — | `{days[]{date,logged,total}}` | total = nº de refeições do plano. |
| `/diary/charts-summary?days=` | GET | days | `ChartsSummary{nutrition[],water[],wellness[],counts{meal_photos,exercise_posts,nutri_reactions,nutri_comments}}` | alimenta gamificação + Progresso. |
| `/water?date=` | GET/POST/DELETE | POST `{date, amount_ml}` | `WaterIntakeResponse{date, goal_ml, total_ml, entries[]}` | `goal_ml` vem do back, mas o cliente recalcula via `useSmartWaterGoal` (peso+clima). **Duas fontes de meta** → reconciliar. |
| `/weight` `/weight/history` | POST/GET | `{date, weight_kg}` | entry / `{entries[]}` | history ~90 entradas. |
| `/symptoms?date=` | GET/POST | `{date, energy_level?, digestion?, bloating?, mood?, sleep_quality?, notes?}` | `SymptomLog` (upsert por data) | **Humor (`mood`) mora aqui** (1–5). |
| `/goals` `/goals/:id/checkin` | GET/POST | — | `PortalGoal[]` / `{checked, checkins[]}` | check-in otimista no cliente; janela 120 dias. |
| `/appointments` | GET | — | `PortalAppointment[]` (status inclui `pending_approval`; `meeting_url`, `location`) | **Dado suficiente p/ tela de Consultas (P1)** — só falta a UI. |
| `/booking/config` `/booking/slots` `/booking/request` | GET/GET/POST | request `{date,start_time,type,location_id?,notes?}` | config/slots/`{id,status,message}` | completo. |
| `/chat` `/chat/unread-count` | GET/POST/GET | POST `{content}` | `ChatMessagesResponse` / `{unread}` | cliente faz polling (10s/15s). |
| `/evolution` | GET | — | `PortalEvolution[]` (peso, IMC, %gordura, massa magra/gorda, cintura, quadril) | antropometria do nutri. |
| `/profile` | GET | — | `PortalProfile` (altura, peso, nascimento, gênero…) | usado p/ meta de água. |
| `/push-token` | POST | `{push_token}` | `{message}` | grava `patients.push_token`. |
| `/meal-plans` `/meal-plans/:id` | GET | — | summary[] / detail (`meals`, `shopping_list`, macros, `payload`) | base do Plano acionável (P1). |
| `/guidelines` `/documents` `/questionnaires(/:id/answer)` | GET/POST | — | listas/detalhe | conteúdo do nutri. |

### Eventos / Analytics (esclarecimento da regra #5)
**Não existe SDK de analytics no cliente.** A telemetria é **derivada no backend**: as escritas chamam `ClinicalTimelineHelper.log(...)` → tabela `patient_timeline_events` (`visibility:'professional'`), e `/home` grava `portal_access_log` (abertura diária). Tudo isso aparece no painel do nutri (`app-web`). **Implicação:** toda ação nova do paciente "emite evento" **automaticamente** desde que passe por um endpoint que registra timeline. Para ações novas que não existam hoje, o evento precisa ser adicionado **no serviço da API** (não no app). Sem Amplitude/Mixpanel/Firebase.

### GAPS de API (P0/P1)

1. **Captura unificada de refeição (foto → IA + adesão + post num só registro)** — **[BE]**. Hoje `/diary/posts` (IA, sem adesão) e `/food-diary` (adesão, sem IA/feed) são **tabelas/fluxos separados**.
   - **P0 (simplificado, [FE]):** o `RegistroSheet` orquestra **2 chamadas** — `POST /diary/posts` (foto+IA+feed) e, se vinculado a uma refeição do plano, `POST /food-diary` (adesão+streak). Cria 2 registros, mas entrega o valor.
   - **Full ([BE], P1+):** `/diary/posts` aceitar `meal_plan_id`/`meal_index`/`compliance_status` e gravar nas duas pontas (ou unificar modelo).
2. **Streak não reflete posts do feed** — **[BE/decisão]**. Streak conta só `food_diary_entries`. Um *meal post* no feed **não** incrementa streak. Decidir: (a) "registrar refeição" sempre grava `food-diary` (recomendado — P0 já faz), e/ou (b) unificar fonte do streak no back.
3. **Marcos automáticos como POST no feed** — **[BE]**. Hoje marcos de streak são **push** (`checkStreakMilestone`), não viram post. P0.4 pede post celebratório. P0: celebração **client-side** (UI) sem post real; post automático real = backend.
4. **Thresholds de marco divergentes** — **[BE/decisão]**. Back: `[5,10,15,20,30,60,90]`; doc 02/P0.4: `7/14/30`. Alinhar.
5. **Badge "nova reação do nutri" na aba Diário** — **[FE]** via `lastSeen` local (comparar `reactions/comments` mais recentes vs timestamp salvo); **[BE-nice]** um `unread-reactions count` seria mais limpo.
6. **Marcação "retroativo" (backfill)** — backfill **já é aceito pela API** (`/food-diary`, `/water`, `/weight`, `/symptoms` aceitam data arbitrária; o bloqueio "só hoje" é **client-side** em `diary.tsx`). Marcar como retroativo: **[FE]** derivável (`created_at` ≠ `entry_date`); **[BE-nice]** flag explícita para o nutri.
7. **Endpoint agregado `/today-summary`** (home + diary/today + water) — **[BE, perf]**. Atende a meta <2s da Home "Hoje" com 1 request. Alternativa [FE]: 3 chamadas paralelas (já cacheadas).
8. **Meta de água: fonte única** — **[FE/decisão]**. `water.goal_ml` (back) vs `useSmartWaterGoal` (cliente). Definir a verdade (recomendado: cliente envia a meta calculada, ou back passa a calcular).

> **Conclusão 0.1:** ~80% do P0 é **[FE]** (reorganização + composição de dados já existentes). Os **[BE]** concentram-se na *unificação real* de refeição/streak/marcos — adiáveis com as versões simplificadas.

---

## 0.2 Mapeamento de componentes

### Design system reutilizável (já existe)
**`src/components/ui/index.tsx`:** `Card`, `ScreenHeader`, `SectionLabel`, **`ProgressRing`** (SVG animado — base do `AnelDoDia`), `EmptyState`, `ListRow`, `PillBadge`, `StatChip`, `SkeletonBlock`, `SkeletonList`, `LoadingScreen`, `Divider`.
**`src/components/ui/*`:** `Button` (4 variantes), `IconButton`, `TextField`, `KeyboardAvoidingWrapper`, `ReadOnlyBanner` (gate `canWrite`), `MacrosBar`, `XpToast`, `AuroraBackground`.
**`src/components/home/*`:** `DailyRingsRow` (→ evolui p/ `AnelDoDia`), `HomeHeader` (→ recebe avatar + streak canônico), `GoalsPreview`, `MiniPostCard` (→ reuso em "Momentos"), `LevelUpCelebration`.
**Outros:** `feed/PostCard` (card de post completo — reuso direto na aba Diário), `charts/LineChart` (Progresso), `Brand` (BrandRing/GlowBlob/AliaWordmark), `Markdown`, `Skeleton`, `SplashGate`.
**Tokens:** `theme/tokens.ts` (space, radius, shadows, typography, motion, haptic, gradients) + 3 temas em `theme/themes.ts`. **Usar sempre estes** (regra #4).

### Componentes novos necessários (P0)
| Componente | Para | Base / nota |
|---|---|---|
| **`BottomSheet`** (genérico) | fundação do `RegistroSheet` e `ActionSheet` | **não há lib** — decidir (ver 0.5 #1). reanimated+gesture-handler presentes. |
| **`RegistroSheet`** | o "+" (P0.3) | usa `BottomSheet`; opções Refeição/Água/Peso/Humor/Foto/Exercício/Anotação; respeita `canWrite`. |
| **`ActionSheet`** | escolha câmera/galeria etc. (P0.5) | substitui `Alert` de escolha. |
| **`Toast`** (genérico) | erros/sucesso (P0.5) | hoje só existe `XpToast`; generalizar. |
| **`AnelDoDia`** | herói da Home (P0.2) | compõe `ProgressRing` (refeições+água); dados de `diary/today`+`water`. |
| **`ProximoPasso`** | CTA contextual (P0.2) | lógica pura (hora + estado) — **testável**. |
| **`RefeicoesDeHoje`** | registro 1-tap na Home (P0.2) | extrai a lógica de adesão de `(tabs)/diary.tsx`; `POST /food-diary`. |
| **`SegmentedControl`** | abas internas Diário e Nutri | novo primitivo. |
| **`Avatar`** | header da Home → Perfil | novo (com fallback de iniciais). |
| `ConfirmDialog` (opcional) | confirmações destrutivas | pode manter `Alert` p/ destrutivo (regra P0.5). |

> `Alert.alert` aparece em **~12 telas** (varredura do P0.5): `(tabs)/_layout`, `diary`, `water`, `weight`, `wellness`, `progress-photos`, `questionnaires`, `post-compose`, `settings`, `booking`, `goals`, `chat`. Escolhas→`ActionSheet`; erros→`Toast`; destrutivo→`ConfirmDialog`/`Alert`.

---

## 0.3 Mapeamento de navegação

### Estrutura atual (Expo Router, `app/`)
- **Root** `app/_layout.tsx`: `Stack` + `PersistQueryClientProvider` + `GestureHandlerRootView` + `SafeAreaProvider` + `SplashGate` + `XpToast`; chama `useNotifications()` e `useReminders()`.
- **Entrada:** `index.tsx` (redirect) · `login.tsx` · `onboarding.tsx` · `p/[code].tsx` (deep link do código).
- **Tabs** `app/(tabs)/_layout.tsx`: `index` (Início) · `meal-plan` (Plano) · `create` (**"+"**, `tabBarButton` intercepta → `Alert`; a tela `create.tsx` é `return null`) · `diary` (Diário=adesão) · `guidelines` (`href:null`, oculta) · `profile` (Perfil).
- **Stack avulso:** `booking`, `chat`, `documents`, `evolution`, `feed`, `goals`, `post-compose`, `progress-photos`, `questionnaires`, `settings`, `water`, `weight`, `wellness`, `post/[id]`.

### Estrutura proposta P0 → [Hoje · Plano · + · Diário · Nutri]
| Ação | Arquivo | Detalhe |
|---|---|---|
| **Mantém** | `(tabs)/index.tsx` | vira "Hoje" (redesign P0.2). |
| **Mantém** | `(tabs)/meal-plan.tsx` | "Plano". |
| **Mantém** | `(tabs)/create.tsx` + `_layout` | "+" agora abre `RegistroSheet` (não `Alert`). |
| **Substitui** | `(tabs)/diary.tsx` | conteúdo passa a ser **o feed** (mover lógica de `app/feed.tsx` p/ cá). A **adesão** sai daqui → absorvida pela Home (`RefeicoesDeHoje`) + `FreeDiary` realocado. |
| **Cria** | `(tabs)/nutri.tsx` | `SegmentedControl`: Conversa (reusa `chat`) · Consultas (nova, P1) · Questionários (reusa `questionnaires`). |
| **Move p/ stack** | `app/profile.tsx` | sai das tabs; acessível pelo avatar do header (Home). |
| **Move p/ stack** | `app/guidelines.tsx` | deixa de ser aba oculta; vira stack (e seção do Plano em P1). |
| **Remove** | `app/feed.tsx` | conteúdo migra p/ `(tabs)/diary.tsx`. |

### Deep links (impacto)
- **Scheme** `aliapatient://`; **Universal/App Links** `https://app.alianutri.com.br/p/...` (iOS `associatedDomains`, Android `intentFilters`).
- **Notificação → `/post/[id]`** (em `useNotifications.ts`). O push de **reação/comentário** manda `{postId}` ✅; o de **marco de streak** manda `{screen:'diary'}` → **não casa** com o handler atual (só trata `postId`). Ajustar handler p/ rota `diary`.
- **typedRoutes ON:** mover/renomear arquivos **regenera tipos**; toda referência (`router.push('/feed'|'/profile'|'/guidelines')` etc.) precisa ser atualizada (há vários no Home e atalhos). Risco de rota órfã — checklist no fim.

---

## 0.4 Mapeamento de estado

- **Server state = React Query 5.** Chaves `['portal', <resource>, ...]`. Persistência via `asyncStoragePersister` (`PersistQueryClientProvider`).
  - ⚠️ **Dados clínicos NÃO são persistidos em disco** (`CLINICAL_RESOURCES` em `app/_layout.tsx`: home, diary-*, food-diary, weight, water, symptoms, evolution, meal-plans, progress-photos, chat, weekly-adherence). Logo, **na abertura a frio offline a Home "Hoje" fica sem cache** → conflita com o critério P0 "offline mostra cache". (Decisão 0.5 #2.) `MMKV` está instalado mas **não** é usado pelo persister (usa AsyncStorage).
- **Escrita offline:** só `useCreatePost` é `networkMode:'offlineFirst'` (otimista + retry); como `diary-posts` não é persistido, um post criado offline **some no cold restart**. As demais mutações (`food-diary`, `water`, `weight`, `symptoms`) usam networkMode padrão → **falham offline**. (Decisão 0.5 #3.)
- **Client state = Zustand:** `auth` (SecureStore: accessCode + PII), `theme`, `features.canWrite` (setado a partir de `home.features.can_write`), `onboarding`, `reminders` (AsyncStorage; **defaults TODOS `true`** — lembretes já nascem ON no store; `useReminders` reagenda ao autenticar), `xpToast`.
- **"Registros do dia"** não têm store único — vivem em RQ por data (`diary-today[date]`, `water[date]`, `symptoms[date]`, `food-diary`). **Unificação** = a Home compõe essas fontes e o `RegistroSheet` invalida as chaves certas (padrão já usado nos hooks). **Gamificação** é derivada client-side (`lib/gamification.ts`, curva `[0,100,300,600,1000,1500,2500,4000]`) a partir de home+charts+goals — sem estado no back.
- **Gate `canWrite`:** espelhado no cliente; `RegistroSheet` e ações devem respeitar (existe `ReadOnlyBanner`).

---

## 0.5 Riscos e decisões pendentes

### Decisões que bloqueiam/condicionam o início do P0
1. **Lib de bottom sheet.** Recomendo **instalar `@gorhom/bottom-sheet`** (maduro, acessível, gestos/teclado resolvidos; deps reanimated+gesture-handler já presentes) em vez de construir do zero. — *precisa de OK.*
2. **Cache clínico offline.** Manter como está (privacidade; Home offline mostra estado vazio elegante) **ou** persistir um `today-summary` mínimo em **MMKV cifrado**. — *decisão de produto/segurança.*
3. **Escrita offline real.** Estender `offlineFirst` + fila de mutações persistida (peso/água/refeição) ou aceitar "online para registrar" no P0. — *escopo.*
4. **Streak.** (a) "registrar refeição" sempre grava `food-diary` (P0 já adota) e (b) thresholds de marco: alinhar `7/14/30` (doc) vs `[5,10,15,20,30,60,90]` (back). Definir se *meal post* do feed conta streak. — *produto + [BE].*
5. **Captura unificada de refeição.** Confirmar P0 **simplificado (2 chamadas)**; full single-record fica [BE]/P1.
6. **Marcos no feed.** P0 = celebração client-side; post automático real = [BE]. Confirmar.
7. **Meta de água** — fonte única (back vs `useSmartWaterGoal`).

### Riscos técnicos
- **Push exige build de dev + EAS projectId.** `app.json` **não tem** `extra.eas.projectId` nem plugin `expo-notifications` configurado; `getExpoPushTokenAsync` falha em Expo Go e sem projectId. **[INFRA]** configurar EAS + dev build para validar push (reação/comentário/marco). O *envio* server-side já existe.
- **Sem test runner.** `package.json` só tem `lint` (eslint) e `ts:check` (tsc) — **não há jest/vitest/RNTL**. O critério P0 (lint+tsc) é atendível; **testes unitários (ProximoPasso, roteamento do "+", streak/backfill) exigem [INFRA]** adicionar runner. — *decisão.*
- **Telas gigantes** `(tabs)/index.tsx` (46KB) e `(tabs)/diary.tsx` (43KB) — refator de alto risco; extrair lógica para componentes com cuidado (sem regressão de tema/haptics).
- **Perf Home <2s:** recomendado endpoint **`/today-summary`** ([BE], temos a API) vs 3 chamadas paralelas.
- **Acessibilidade:** há `fontSize` 9–10.5 em vários pontos; o piso 12px (critério P0) implica varredura ampla.
- **`Alert` em ~12 telas** — varredura cuidadosa (P0.5), preservando confirmações destrutivas.
- **typedRoutes + deep links** ao mover `feed/profile/guidelines` — risco de rota órfã/link quebrado.

### Decisões de produto/nutricionista (não-técnicas)
- `gamification_enabled` é flag do nutri → visibilidade de XP/nível na Home depende dela.
- Lembretes **opt-out** (já default ON) — confirmar consentimento/medida na 1ª abertura.
- UX do modo **somente-leitura** (`canWrite=false`) — tom da comunicação.

---

## Veredito de prontidão para o P0

**Pode começar** assim que decididos os itens **0.5 #1 (bottom sheet)** e **#2 (cache offline)** — os demais têm caminho P0 simplificado já definido e não bloqueiam.

**Sequência sugerida (commits atômicos):** P0.1 nav → P0.7 streak canônico → P0.2 Home "Hoje" (+ `AnelDoDia`/`ProximoPasso`/`RefeicoesDeHoje`) → P0.3 `RegistroSheet` → P0.4 Diário=feed → P0.5 varrer `Alert` → P0.6 onboarding ativador. Desvios serão registrados em `docs/05-decisoes-implementacao.md`.

**Checklist anti-regressão de rotas:** atualizar todos `router.push` de `/feed`,`/profile`,`/guidelines`; remover aba `diary`(adesão) sem deixar link morto; handler de notificação tratar `{screen:'diary'}`; rodar `npm run ts:check` (typedRoutes) e `npm run lint`.
