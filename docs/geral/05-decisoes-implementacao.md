# 05 — Decisões de Implementação (P0)

> Registro do que foi efetivamente construído no **P0**, os **desvios** em relação ao plano (docs 01–04), o **checklist anti‑regressão de rotas** e o **resumo por repositório**.
> Documento vivo — atualizar conforme o produto evolui.

---

## 1. Escopo

P0 cobre o redesign do **app do paciente** (`alianutri-patient`, Expo SDK 54 / RN 0.81 / React 19, Expo Router 6, React Query 5 + Zustand 5) e os ajustes de contrato necessários no **backend** (`alianutri-api`, Cloudflare Workers / Hono / D1).

Sete frentes de produto (P0.1–P0.7) + a unificação da **meta de água**. Cada item foi entregue como **commit atômico** (sem PR), validando a cada passo.

---

## 2. Restrições de ambiente (desvios estruturais)

Estas restrições moldaram várias decisões e valem para todo o P0:

- **Sem `npm install`** — a rede corporativa bloqueia o registry. Logo: **nenhuma dependência nova**; só foram usadas libs já presentes (`reanimated`, `gesture-handler`, `lucide-react-native`, `expo-haptics`, `expo-notifications`, `expo-crypto`, etc.). O `.npmrc` com `legacy-peer-deps` (commit `4bec245`) destrava a árvore SDK 54 / React 19 para quem conseguir instalar.
- **Validação local**:
  - `alianutri-patient` → `npm run ts:check` (o `tsconfig` é `strict`, **não** tem `noUnusedLocals`, e **exclui** `**/*.test.ts`).
  - `alianutri-api` → `npx tsc --noEmit` + `npx vitest run`.
  - O **vitest não está instalado no patient**: os testes (`*.test.ts`) foram escritos como contrato/regressão, mas só rodam onde a CI/dev tiver deps.
- **WIP de terceiros não commitado** — `app/(tabs)/meal-plan.tsx` e `src/types/portal.ts` (patient); diversos `ai*.service.ts`, ETL/foods e `package.json` (API). **Nunca** commitados: todo commit usa _pathspec_ explícito (`git commit -- <paths>`).

---

## 3. Decisões por frente

### P0.1 — Navegação (`b9c64fe`)
- **Decisão:** tab bar de 5 posições **[Hoje · Plano · + · Diário · Nutri]** com botão central "+" flutuante; tela **Nutri** vira _hub_ (Conversa / Consultas / Questionários via `SegmentedControl`).
- **Por quê:** Hick's Law (menos escolhas), thumb‑zone e um único ponto de criação.
- **Detalhe:** o "+" (`(tabs)/create.tsx`) **não navega** — o `tabBarButton` intercepta o toque e abre a `RegistroSheet`.

### P0.7 — Streak (`187c332` patient · `6e4d3a3` API)
- **Decisão:** streak canônico vindo de `GET /diary/streak` no header da Home; escada de marcos **7/14/30/60/90**; lembrete diário 21h.
- **Por quê:** fonte única do streak no backend (função pura testável `streak.ts`), evitando recalcular no cliente.
- **Guarda‑corpo ético:** gamifica **consistência**, nunca peso.

### P0.2 — Home "Hoje" (`7564619`)
- **Decisão:** Home focada no presente — `ProximoPasso` (próxima ação sugerida) + `AnelDoDia` (anéis refeições/água) + `RefeicoesDeHoje`.
- **Por quê:** glanceability + gatilho→ação (Hooked).

### P0.3 — Registro rápido + offline (`a600e38` sheet · `263b705` fila · `d10c993` API)
- **Decisão:** `RegistroSheet` (BottomSheet custom) no "+", com água rápida inline; **fila de mutações offline cifrada** com replay no reconnect.
- **Desvio:** a fila persistente **cifrada** (`expo-crypto`) não estava no plano — adicionada para não perder registros em rede instável. Idempotência garantida no backend via `ON CONFLICT(id)` em `/water` e `/food-diary`.

### P0.4 — Diário = feed (`03e54af` feed/stack · `437c911` badge)
- **Decisão:** a aba **Diário** passou a ser o feed social díade; o registro alimentar virou _stack_ `/food-diary`. `app/feed.tsx` permanece como **redirect** para `/(tabs)/diary` (compat de deep links).
- **Badge "novidade do nutri":** como **reações não têm timestamp** na API, o badge sinaliza apenas **comentários** novos do nutri (comparados ao `lastSeen` em `diarySeen` store, via `lib/diaryUnseen`). Decisão consciente para evitar falso‑positivo.

### P0.5 — Primitivas de feedback (`7ec9266` primitivas · `c4d7b2b` migração)
- **Decisão:** `Toast` / `ConfirmDialog` / `ActionSheet` **imperativos** (stores + hosts montados no root); os **41 `Alert.alert` nativos** foram substituídos.
- **Por quê:** consistência visual com o design system e controle de UX (o `Alert` nativo quebra o tom do app).

### P0.6 — Onboarding **ativador** (`4a119ad`)
- **Decisão:** onboarding roda **pós‑login** (`app/index.tsx`: `login → onboarding → (tabs)`), com 3 objetivos: humanizar a nutri, **ativar lembretes** (permissão de notificação) e induzir a **1ª captura** (`/post-compose`).
- **Desvio:** o plano sugeria onboarding pré‑login; mudou para **ativador pós‑login** porque os passos só fazem sentido com paciente autenticado (nome da nutri, lembretes, primeira postagem).

### [API] Meta de água — fonte única (`ee520c5` API · `bec5d74` cliente)
- **Decisão:** o **servidor é a fonte única** da meta. Novo helper puro `alianutri-api/src/shared/domain/waterGoal.ts` → `resolveWaterGoal(water_goal_ml, current_weight_kg_x100)` retorna `{ goal_ml, source }`, com precedência: **`nutri`** (meta prescrita ≠ 2000) → **`baseline`** (`peso_kg × 35`, clamp 2000–4500, arred. 50 ml) → **`default`** (2000 ml).
- **Backend:** `getWaterIntake` agora devolve `goal_ml` + `goal_source`; a análise do nutri (`tracking.service`) usa **o mesmo** `resolveWaterGoal` — paciente e nutri **não podem mais divergir**. Sem migração (colunas já existiam). 9 testes em `test/waterGoal.test.ts`.
- **Cliente:** `useSmartWaterGoal` deixou de recalcular a meta; lê `goal_ml` do servidor e usa `goal_source` para distinguir nutri/baseline (fim da heurística do `2000`; fallback p/ cache antigo). O **clima** virou ajuste **efêmero** ("+X ml hoje", chip na tela de Água), fora da meta oficial — então Home, Água e nutri batem.
- **Nota de tipo:** `goal_source` é lido via _cast_ em `water.tsx` porque `WaterIntakeResponse` (`src/types/portal.ts`) é WIP de terceiros; mover o campo para o tipo quando o WIP integrar.

---

## 4. Checklist anti‑regressão de rotas

Mapa completo (Expo Router). **Nenhuma tela órfã** e **nenhum link pendente** no fechamento do P0.

| Rota (URL) | Arquivo | Alcançada por | Notas |
|---|---|---|---|
| `/` | `app/index.tsx` | bootstrap | redireciona `login` / `onboarding` / `(tabs)` |
| `/login` | `app/login.tsx` | `/` (sem código); logout em `settings`; fallback `p/[code]` e `onboarding` | |
| `/onboarding` | `app/onboarding.tsx` | `/` (pós‑login, `!seen`) | cast `as Href` (typegen) |
| `/` → `(tabs)` | `app/(tabs)/index.tsx` | `/` autenticado; fim do onboarding | Home "Hoje" |
| tab `meal-plan` | `app/(tabs)/meal-plan.tsx` | tab bar | **WIP de terceiros** |
| tab `create` | `app/(tabs)/create.tsx` | — | placeholder; `tabBarButton` → `RegistroSheet` (nunca renderiza) |
| `/diary` (= `/(tabs)/diary`) | `app/(tabs)/diary.tsx` | tab bar; ação na Home; `feed.tsx`; notif `screen:diary` | feed social (P0.4) |
| tab `nutri` | `app/(tabs)/nutri.tsx` | tab bar | hub chat/consultas/quest. |
| `/feed` | `app/feed.tsx` | deep links antigos | **Redirect** → `/(tabs)/diary` (manter) |
| `/food-diary` | `app/food-diary.tsx` | `AnelDoDia`, `RefeicoesDeHoje`, `nextStep` | stack; `as never` |
| `/water` | `app/water.tsx` | `AnelDoDia`, `RegistroSheet`, `nextStep`, `createActions` | |
| `/weight` | `app/weight.tsx` | ação Home, `createActions` | |
| `/goals` | `app/goals.tsx` | ação Home, `GoalsPreview` | |
| `/wellness` | `app/wellness.tsx` | ação Home | ⚠️ duplicata morta `assets/wellness.tsx` (remover) |
| `/chat` | `app/chat.tsx` | ação Home, `HomeHeader`, `nutri` | |
| `/evolution` | `app/evolution.tsx` | ação Home, card Home | |
| `/progress-photos` | `app/progress-photos.tsx` | ação Home | |
| `/questionnaires` | `app/questionnaires.tsx` | ação Home, `nutri`, `nextStep` | |
| `/documents` | `app/documents.tsx` | ação Home | |
| `/guidelines` | `app/guidelines.tsx` | ação Home | |
| `/booking` | `app/booking.tsx` | `nutri` | |
| `/profile` | `app/profile.tsx` | avatar no `HomeHeader` | |
| `/settings` | `app/settings.tsx` | `profile` | |
| `/post-compose` | `app/post-compose.tsx` | FAB do Diário, `createActions`, captura do onboarding | `as never` |
| `/post/[id]` | `app/post/[id].tsx` | deep link de notificação; item do Diário | dinâmica |
| `/p/[code]` | `app/p/[code].tsx` | deep link (login por código) | dinâmica |

**Invariantes a manter:**
- Rota nova de _stack_ → `router.push('...' as never)` até regenerar o typegen do expo‑router (offline). `'/(tabs)'`, `'/login'`, `'/'` não precisam de cast; `'/onboarding'` usa `as Href`.
- `feed.tsx` (redirect) e `create.tsx` (placeholder do "+") são **intencionais** — não remover.
- `/diary` e `/(tabs)/diary` resolvem para a **mesma** tela (o grupo `(tabs)` não entra na URL); manter consistência ao linkar.
- Ao adicionar tela, **linkar** a partir das ações da Home, do hub Nutri ou do `nextStep` para não orfanar.

---

## 5. Resumo por repositório

### `alianutri-patient`

| Commit | Frente | Resumo |
|---|---|---|
| `4bec245` | tooling | `.npmrc legacy-peer-deps` (SDK 54 / React 19) |
| `b9c64fe` | P0.1 | tab bar [Hoje, Plano, +, Diário, Nutri] + hub Nutri |
| `187c332` | P0.7 | streak canônico no header + lembrete 21h |
| `7564619` | P0.2 | Home "Hoje" (ProximoPasso + AnelDoDia + RefeicoesDeHoje) |
| `a600e38` | P0.3 | RegistroSheet no "+" + água rápida inline |
| `263b705` | P0.3 | fila de mutações offline cifrada + replay |
| `03e54af` | P0.4 | Diário = feed; registro alimentar → stack `/food-diary` |
| `437c911` | P0.4 | badge de novos comentários do nutri (lastSeen) |
| `7ec9266` | P0.5 | Toast/ConfirmDialog/ActionSheet imperativos + hosts |
| `c4d7b2b` | P0.5 | troca dos 41 `Alert.alert` nativos |
| `4a119ad` | P0.6 | onboarding ativador pós‑login |
| `bec5d74` | [API] | consome meta de água do servidor + clima efêmero |

### `alianutri-api`

| Commit | Frente | Resumo |
|---|---|---|
| `6e4d3a3` | P0.7 | escada de marcos 7/14/30/60/90 + `streak.ts` testável |
| `d10c993` | P0.3 | idempotência em `/water` e `/food-diary` (`ON CONFLICT id`) |
| `ee520c5` | [API] | meta de água fonte única (`shared/domain/waterGoal.ts` + análise do nutri) |

---

## 6. Validação executada

- **patient:** `npm run ts:check` ✅ verde após cada frente.
- **api:** `npx tsc --noEmit` ✅ + `npx vitest run` ✅ **38/38** (inclui `streak`, `waterGoal` 9, `aiQuota.dates`, `openaiTools`).
- Testes do patient (`nextStep`, `createActions`, `clientId`, `diaryUnseen`, `hydration`/water) escritos como contrato; rodam onde houver `vitest` instalado.

---

## 7. Pendências

**Validar em device (não verificável só por type‑check):**
- Fila offline (P0.3): perder rede, registrar, reconectar → replay sem duplicar.
- Diário/feed + `/food-diary` (P0.4) e badge de comentários do nutri.
- Toast/Confirm/ActionSheet (P0.5) em fluxos reais.
- Onboarding (P0.6): permissão de notificação + navegação.
- Meta de água: anéis de Home/Água = baseline do servidor; chip "+X ml hoje" em dia quente.

**Deferido / follow‑up:**
- **[API/P1]** auto‑post de marco no feed (criar `diary_post` no `checkStreakMilestone`) — _thresholds já alinhados_; falta só a criação do post.
- Remover `assets/wellness.tsx` (duplicata morta de `app/wellness.tsx`).
- Quando o WIP de `src/types/portal.ts` integrar: mover `goal_source` para `WaterIntakeResponse` e remover o _cast_ em `water.tsx`.
- Regenerar o typegen do expo‑router para remover os casts `as never` / `as Href`.
