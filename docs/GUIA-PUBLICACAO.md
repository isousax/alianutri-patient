# Guia Completo — Do código à Play Store (AliaPatient)

Este é o seu **guia absoluto**. Ele parte do zero: você tem apenas o app em Expo, **não tem conta de desenvolvedor Google**, e nunca publicou nada. Ao final você vai saber:

1. **Gerar o APK** (o arquivo que instala no celular) para testar.
2. **Publicar na Google Play Store** — desde criar a conta até o app no ar.
3. **Fazer o deeplink funcionar** — o link `app.alianutri.com.br/p/CÓDIGO` abrindo o app direto.

> **Como usar este guia:** leia na ordem. Cada passo diz **o que fazer** e **por que**. Onde tiver um comando, é só copiar e colar no terminal. Onde tiver `⚠️`, preste atenção — são os pontos que costumam travar iniciantes.

---

## Sumário

- [Parte 0 — 6 conceitos que fazem tudo fazer sentido](#parte-0)
- [Os dados de identidade do seu app](#identidade)
- [Parte 1 — Preparar seu computador (uma vez só)](#parte-1)
- [Parte 2 — Gerar o APK (para testar no celular)](#parte-2)
- [Parte 3 — Publicar na Play Store (do zero)](#parte-3)
- [Parte 4 — Deeplink (o link abrindo o app)](#parte-4)
- [Parte 5 — Lançar atualizações no futuro](#parte-5)
- [Parte 6 — Problemas comuns](#parte-6)
- [Cola de comandos](#cola)

---

<a name="parte-0"></a>
## Parte 0 — 6 conceitos que fazem tudo fazer sentido

Não pule esta parte. São 5 minutos que evitam 5 horas de confusão.

### 1. APK vs AAB — os dois "arquivos do app"
- **APK** (`.apk`): o pacote que **instala direto** num celular Android. Serve para **você testar** (manda pra si mesmo, instala, abre). A Play Store **não aceita** APK para publicar.
- **AAB** (`.aab`, *Android App Bundle*): o formato que a **Play Store exige** para publicar. Você **não instala** um AAB direto; você **envia** ele para o Google, e o Google gera os APKs otimizados para cada celular.

> **Resumo:** APK = testar você mesmo. AAB = publicar na loja. Você vai gerar os dois (com o mesmo comando, mudando um parâmetro).

### 2. EAS Build — a "fábrica na nuvem"
Seu app é Expo. Para virar APK/AAB, ele precisa ser **compilado**. Fazer isso no seu PC exigiria instalar Android Studio, SDKs, Java, etc. — horas de dor de cabeça.

O **EAS Build** é o serviço da Expo que **compila na nuvem para você**: você roda um comando, ele monta o app nos servidores da Expo e te devolve um link para baixar o arquivo. É gratuito para começar (tem uma fila no plano free, mas funciona).

### 3. Conta Expo ≠ Conta Google Play
São **duas contas diferentes**:
- **Conta Expo** (grátis): usada pelo EAS para compilar. Você já deve ter (ou cria em 1 minuto).
- **Conta Google Play Console** (US$ 25, pagamento único): a conta de **desenvolvedor** para publicar na loja. É obrigatória e você ainda não tem — a gente cria na Parte 3.

### 4. Assinatura digital (keystore) + Play App Signing
Todo app Android é **assinado digitalmente** — é uma "impressão digital" que prova que a atualização veio de você, e não de um impostor. Essa impressão fica num arquivo chamado **keystore**.

- **Boa notícia:** o **EAS cria e guarda seu keystore automaticamente**. Você não precisa gerar nada à mão. ⚠️ Só **não perca sua conta Expo** — é onde o keystore vive.
- **Play App Signing:** ao publicar, o Google oferece (e recomenda) guardar uma **chave de assinatura final** por você. Ou seja, existem **duas chaves**:
  - **Chave de upload** (a do EAS): assina o arquivo que você **envia** ao Google.
  - **Chave de assinatura do app** (a do Google): assina o app que o **usuário baixa**.
  
  Isso vai importar **muito** na Parte 4 (deeplink), então guarde essa ideia: *"tem duas impressões digitais — a do EAS e a do Google."*

### 5. Deeplink / App Links — o link que abre o app
Hoje, se alguém clica em `https://app.alianutri.com.br/p/ABC123`, abre o navegador. O que você quer: **abrir o app direto** na tela de pareamento.

No Android, isso se chama **App Links**. Para o Android confiar que o **seu** app pode abrir aquele domínio, ele checa um arquivo público no seu servidor (`assetlinks.json`) que diz *"o app com o pacote `com.alianutri.patient` e a impressão digital X pode abrir os links de `app.alianutri.com.br`"*. É uma **prova de que você é dono do domínio E do app**.

No seu projeto isso já está **quase pronto** (o app já declara o domínio, e a API já responde o arquivo) — só falta preencher a impressão digital. Faremos na Parte 4.

### 6. Os "documentos de identidade" do seu app
<a name="identidade"></a>
Estes são os valores reais do **seu** projeto (tirados do `app.json` e da API). Você vai reusar vários deles:

| O quê | Valor | Onde vive |
|---|---|---|
| Nome do app | **AliaPatient** | `app.json` → `expo.name` |
| Identificador Android (package) | **`com.alianutri.patient`** | `app.json` → `android.package` |
| Identificador iOS (bundle) | **`com.alianutri.patient`** | `app.json` → `ios.bundleIdentifier` |
| Versão visível | **1.0.0** | `app.json` → `expo.version` |
| Esquema próprio (link curto) | **`aliapatient://`** | `app.json` → `expo.scheme` |
| Domínio do deeplink | **`app.alianutri.com.br`** | `app.json` (Android `intentFilters` / iOS `associatedDomains`) |
| Caminho do deeplink | **`/p/*`** (ex.: `/p/ABC123`) | idem |
| Tela que trata o link | `app/p/[code].tsx` | app → redireciona para `/pair?code=...` |
| Endpoint do `assetlinks` | `https://app.alianutri.com.br/.well-known/assetlinks.json` | `alianutri-api/src/index.ts` |

> ⚠️ **Não mude o `package` (`com.alianutri.patient`) depois de publicar.** Ele é o "CPF" do app na loja — é permanente. Escolhido, é para sempre.

---

<a name="parte-1"></a>
## Parte 1 — Preparar seu computador (uma vez só)

Você faz isso **uma única vez** na sua máquina.

### 1.1 Instalar o Node.js
Se você já roda o projeto (`npm start`), **pule** — já tem. Se não: baixe a versão **LTS** em [nodejs.org](https://nodejs.org) e instale (next, next, finish).

Confirme abrindo o PowerShell e rodando:
```powershell
node --version
```
Deve aparecer algo como `v20.x`.

### 1.2 Criar sua conta Expo (grátis)
Acesse [expo.dev](https://expo.dev) → **Sign Up**. Guarde o e-mail e senha. ⚠️ É aqui que seu keystore vai ficar guardado — **não perca o acesso**.

### 1.3 Instalar o EAS CLI (a ferramenta de linha de comando)
No PowerShell:
```powershell
npm install -g eas-cli
```
Confirme:
```powershell
eas --version
```

### 1.4 Fazer login
```powershell
eas login
```
Digite o e-mail e senha da conta Expo.

### 1.5 Vincular o projeto à sua conta Expo
Entre na pasta do app e rode o `init`:
```powershell
eas init
```
> **O que isso faz:** cria um "projeto" no painel da Expo e escreve um `projectId` dentro do seu `app.json` (em `extra.eas.projectId`). É como registrar seu app na fábrica. Aceite as perguntas (owner = sua conta).

Pronto. Máquina preparada. As próximas partes você repete sempre que for lançar.

---

<a name="parte-2"></a>
## Parte 2 — Gerar o APK (para testar no celular)

Objetivo: ter um `.apk` no seu celular para abrir o app de verdade, fora do Expo Go.

### 2.1 Criar o `eas.json` (a "receita de build")
Na **raiz da pasta `alianutri-patient`**, crie um arquivo chamado **`eas.json`** com este conteúdo:

```json
{
  "cli": {
    "version": ">= 12.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "autoIncrement": true,
      "android": { "buildType": "app-bundle" }
    }
  },
  "submit": {
    "production": {
      "android": {
        "track": "internal"
      }
    }
  }
}
```

> **O que cada "profile" (receita) significa:**
> - **`preview`** → gera **APK** para você testar (instala direto). É o que vamos usar agora.
> - **`production`** → gera **AAB** para a Play Store (Parte 3). O `autoIncrement` faz o EAS subir o número interno de versão sozinho a cada build (você não precisa mexer nisso à mão).
> - **`development`** → build especial para depurar com o "dev client" (não precisamos agora).
> - **`appVersionSource: "remote"`** → o EAS controla o número técnico de versão (`versionCode`) na nuvem. Você só troca o `version` legível (`1.0.0`) no `app.json` quando quiser.

### 2.2 Rodar o build do APK
```powershell
eas build --platform android --profile preview
```
> Na **primeira vez** ele vai perguntar se pode **gerar um novo keystore** — responda **Yes** (Sim). O EAS cria e guarda para você. Depois é só esperar: aparece um link acompanhando a fila e a compilação (costuma levar de 5 a 20 min).

### 2.3 Instalar no celular
Quando terminar, o terminal (e a página do build em [expo.dev](https://expo.dev)) mostram um **link** e um **QR Code**.
1. No **celular Android**, abra o link (ou leia o QR).
2. Baixe o `.apk`.
3. Toque no arquivo para instalar. O Android vai pedir para **permitir instalar apps de fontes desconhecidas** — permita (é só porque não veio da loja ainda).
4. Abra o **AliaPatient**. 🎉

> **Por que "fontes desconhecidas"?** Porque esse APK não passou pela Play Store. É normal e seguro (é o seu próprio app). Some quando você instalar pela loja.

---

<a name="parte-3"></a>
## Parte 3 — Publicar na Play Store (do zero)

Aqui a gente cria a conta e coloca o app no ar. Reserve um tempo tranquilo: a **primeira vez** tem burocracia.

### 3.1 Criar a conta de desenvolvedor Google Play (US$ 25)
1. Acesse [play.google.com/console](https://play.google.com/console) e entre com uma **conta Google** (crie uma dedicada ao negócio, ex.: `dev@...`, se preferir separar).
2. Escolha o tipo de conta:
   - **Pessoal** (mais simples) — ou
   - **Organização/Empresa** (exige um número **D-U-N-S**; use só se tiver CNPJ e quiser a conta no nome da empresa).
3. Pague a taxa **única de US$ 25**.
4. Faça a **verificação de identidade** que o Google pedir (nome, endereço, telefone e, às vezes, documento). Pode levar de horas a alguns dias para aprovar.

> ⚠️ **REGRA IMPORTANTE (contas pessoais novas):** o Google exige que, **antes de liberar a produção**, você rode um **teste fechado com no mínimo 12 testadores** que fiquem **opted-in por 14 dias seguidos**. Ou seja: para contas pessoais criadas recentemente, o caminho é `Teste interno → Teste fechado (12 pessoas / 14 dias) → Produção`. Já vá pensando em **12 pessoas** (amigos, família, colegas) que topem instalar e deixar o app no celular por 2 semanas. *(Políticas mudam — confira a mensagem que o próprio Console te mostrar.)*

### 3.2 Preparar os materiais da ficha (junte antes, agiliza muito)
A loja vai pedir:
- **Ícone**: PNG **512×512**.
- **Feature graphic** (banner): **1024×500**.
- **Screenshots do celular**: pelo menos **2** (tire prints do app rodando — telas Hoje, Diário, etc.).
- **Nome** (até 30 caracteres), **descrição curta** (até 80) e **descrição completa** (até 4000).
- **Política de Privacidade (URL)** — ⚠️ **obrigatória**, ainda mais para um app de **saúde/nutrição** que coleta dados. Hospede uma página, por ex. `https://alianutri.com.br/privacidade`, explicando quais dados são coletados e como são usados. (Existem geradores de política de privacidade online para começar.)
- **E-mail de contato** do desenvolvedor.

### 3.3 Gerar o AAB de produção
Este é o arquivo que você envia à loja:
```powershell
eas build --platform android --profile production
```
Ao terminar, **baixe o arquivo `.aab`** pela página do build (você vai subir ele no Console).

### 3.4 Criar o app no Play Console + entender o Play App Signing
1. No Play Console → **Criar app**. Preencha nome, idioma padrão (Português-Brasil), tipo (App), grátis/pago.
2. Vá em **Testar e lançar → Produção** (ou primeiro **Teste interno** — recomendado, ver 3.5) → **Criar nova versão**.
3. Na primeira versão, o Console vai oferecer o **Play App Signing** — **aceite** (é o padrão e o recomendado). 
   > **O que acontece:** você envia o AAB assinado com a **chave de upload** (a do EAS). O Google **re-assina** com a **chave de assinatura do app** (que ele guarda). É seguro e evita que você perca tudo se perder uma chave. Guarde essa informação: **haverá duas impressões digitais SHA-256** — anote as duas (vamos usá-las na Parte 4).

### 3.5 Subir o AAB (comece pelo Teste Interno)
> **Por quê teste interno primeiro?** É a faixa mais rápida (aprovação quase imediata) e onde você valida tudo antes do público. E, para contas pessoais, é o começo do caminho obrigatório de testes (ver aviso 3.1).

1. Em **Testar e lançar → Teste interno → Criar nova versão**.
2. **Envie o arquivo `.aab`** que você baixou.
3. Dê um nome à versão e escreva as **notas da versão** (ex.: "Primeira versão").
4. Salve e **avance a versão para revisão**.
5. Crie a **lista de testadores** (e-mails) e compartilhe o **link de opt-in** com eles.

### 3.6 Preencher os questionários obrigatórios
O Console mostra um checklist ("Configurar o app"). Os principais:
- **Política de Privacidade** (cole a URL).
- **Segurança dos dados (Data Safety)** — ⚠️ crítico para app de saúde: declare **quais dados você coleta** (nome, e-mail, dados de saúde/nutrição, fotos, etc.), se são criptografados em trânsito e se o usuário pode pedir exclusão. Seja honesto e completo.
- **Classificação de conteúdo** (questionário IARC) — responda e receba a faixa etária.
- **Público-alvo e conteúdo** (faixa etária do app).
- **Anúncios**: declare se o app tem anúncios (provavelmente **não**).
- **Categoria** do app (ex.: Saúde e fitness) e detalhes de contato.

> Preencha **todos** os itens do checklist até ficarem verdes. Enquanto houver pendência, não sai da revisão.

### 3.7 Ir para produção
Depois de validar no teste interno (e cumprir a regra dos 12 testadores/14 dias, se a sua conta exigir):
1. **Testar e lançar → Produção → Criar nova versão**.
2. Reaproveite o mesmo AAB (ou gere um novo com `production`).
3. Preencha notas da versão e **envie para revisão**.
4. A revisão do Google costuma levar de **algumas horas a alguns dias**. Depois disso, o app fica **no ar**. 🎉

### 3.8 (Opcional) Enviar direto pelo terminal — `eas submit`
Dá para pular o upload manual do AAB. Depois de configurar uma **conta de serviço Google** (chave JSON) e apontá-la no `eas.json`:
```powershell
eas submit --platform android --profile production
```
> Para iniciante, na **primeira** publicação, prefira o **upload manual** (3.5) — é mais visual e você entende o que está acontecendo. O `eas submit` brilha nas **atualizações** seguintes.

---

<a name="parte-4"></a>
## Parte 4 — Deeplink (o link `app.alianutri.com.br/p/CÓDIGO` abrindo o app)

Aqui é onde entra o "só falta saber o que responder". Vamos preencher a impressão digital que falta.

### 4.1 Como funciona (o fluxo completo)
1. A nutricionista manda um link: `https://app.alianutri.com.br/p/ABC123`.
2. O paciente (com o app instalado) toca no link.
3. O Android vê que o app **AliaPatient** declarou esse domínio (`intentFilters` no `app.json`) **e** confirma no arquivo `assetlinks.json` do servidor que a impressão digital bate.
4. Confirmado → **abre o app** direto na tela `app/p/[code].tsx`, que redireciona para `/pair?code=ABC123` e **pareia o device**. Sem navegador no meio.

### 4.2 O que já está pronto no seu projeto
- ✅ O app **declara o domínio** (`app.json` → `android.intentFilters` com `autoVerify: true`, e iOS `associatedDomains`).
- ✅ A tela `app/p/[code].tsx` **trata o código** e pareia.
- ✅ A API **responde os dois arquivos** `.well-known` (em `alianutri-api/src/index.ts`).
- ❌ **Falta:** trocar o **placeholder da impressão digital** (Android) e do **Team ID** (iOS) pelos valores reais.

### 4.3 Passo A — Pegar a(s) impressão(ões) digital(is) SHA-256 (Android)
Você precisa de **duas** (lembra do Play App Signing?). Pegue as duas — quanto mais completo, mais robusto:

**Impressão da chave de UPLOAD (EAS):**
```powershell
eas credentials
```
Escolha **Android → production** (ou o profile usado). Ele mostra o keystore e uma linha **SHA-256 Fingerprint** — copie (formato `AB:CD:EF:...`).

**Impressão da chave de ASSINATURA DO APP (Google):**
1. No Play Console → **Testar e lançar → Configuração → Integridade do app** (*App integrity / App signing*).
2. Ali aparecem **duas certidões**: *App signing key certificate* e *Upload key certificate*, cada uma com um **SHA-256**.
3. Copie o **SHA-256 da "App signing key"** (a do Google) — é a que assina o app que o usuário baixa da loja.

> 💡 **Atalho:** nessa mesma tela de *App integrity*, o Google geralmente já mostra um **JSON de Digital Asset Links pronto** para copiar. Se aparecer, use-o como fonte de verdade — ele já traz o(s) SHA-256 corretos.

### 4.3 Passo B — Editar o `assetlinks.json` na API
Abra **`alianutri-api/src/index.ts`**. Hoje o trecho está assim (com placeholder):

```ts
// ── .well-known: Android Asset Links (App Links) ──
if (url.pathname === "/.well-known/assetlinks.json") {
  return applySecurityHeaders(new Response(
    JSON.stringify([
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "com.alianutri.patient",
          sha256_cert_fingerprints: [
            // TODO: Replace with actual signing certificate fingerprint
            "SHA256_FINGERPRINT_HERE",
          ],
        },
      },
    ]),
    { status: 200, headers: { "Content-Type": "application/json" } },
  ));
}
```

Troque a lista `sha256_cert_fingerprints` pelas **duas impressões reais** (upload do EAS + assinatura do Google). Fica assim:

```ts
sha256_cert_fingerprints: [
  "AB:CD:EF:...:11",   // chave de ASSINATURA DO APP (Google Play App Signing)
  "12:34:56:...:99",   // chave de UPLOAD (EAS) — para os APKs de teste
],
```

> **Por que as duas?** O app baixado da **loja** é assinado pela chave do **Google** → precisa da 1ª. O APK que você instala em **teste** (Parte 2) é assinado pela chave do **EAS** → precisa da 2ª. Colocando as duas, o deeplink funciona nos dois cenários.

### 4.3 Passo C — (iOS, para o futuro) Preencher o Team ID
Você não tem conta Apple ainda, então **pode pular** — mas quando fizer o iOS: pegue seu **Team ID** em [developer.apple.com](https://developer.apple.com) → **Membership** (um código de 10 caracteres, ex.: `A1B2C3D4E5`) e troque `TEAM_ID` no mesmo `src/index.ts`:

```ts
appIDs: ["A1B2C3D4E5.com.alianutri.patient"],
```

### 4.4 Publicar a API e verificar
1. **Publique a API** (deploy do Worker):
   ```powershell
   npx wrangler deploy
   ```
   *(rode dentro da pasta `alianutri-api`)*
2. ⚠️ **Confirme que o domínio `app.alianutri.com.br` aponta para essa API.** No seu `wrangler.jsonc` **não há rota** para esse subdomínio — provavelmente ele é configurado no **painel do Cloudflare** (Workers & Pages → seu Worker → *Triggers/Custom Domains* ou *Routes*). Teste abrindo no navegador:
   ```
   https://app.alianutri.com.br/.well-known/assetlinks.json
   ```
   - Se aparecer o **JSON com as impressões** → ótimo, o domínio está certo.
   - Se der **404 / página de erro** → o subdomínio não está roteando para o Worker. Vá no Cloudflare e adicione o **Custom Domain** `app.alianutri.com.br` (ou uma *Route* `app.alianutri.com.br/*`) apontando para o Worker `alianutri-api`.

### 4.5 Testar o deeplink no celular
- **Jeito simples:** com o app instalado, mande o link `https://app.alianutri.com.br/p/ALGUMCODIGO` para o seu WhatsApp e **toque nele**. Deve abrir o app na validação do código. ⚠️ A verificação automática do Android acontece na **instalação** — para um teste limpo, **reinstale** o app depois de publicar o `assetlinks.json`.
- **Jeito técnico (opcional, com `adb`):**
  ```powershell
  adb shell am start -a android.intent.action.VIEW -d "https://app.alianutri.com.br/p/ABC123"
  adb shell pm get-app-links com.alianutri.patient
  ```
  O segundo comando mostra se o domínio está `verified`.
- **Validador do Google:** cole seu domínio em [Statement List Tester](https://developers.google.com/digital-asset-links/tools/generator) para conferir se o `assetlinks.json` está válido.

> **Ordem importa:** primeiro publique o `assetlinks.json` real (4.4), **depois** gere/instale o app. Se instalar antes, o Android não verifica e o link abre no navegador.

---

<a name="parte-5"></a>
## Parte 5 — Lançar atualizações no futuro

Quando você mexer no app e quiser subir uma nova versão:

1. No `app.json`, suba o **`version`** legível (ex.: `1.0.0` → `1.0.1`). *(O número técnico `versionCode` o EAS incrementa sozinho, graças ao `autoIncrement`.)*
2. Gere o novo AAB:
   ```powershell
   eas build --platform android --profile production
   ```
3. Suba no Console (**Produção → Criar nova versão**) **ou** use `eas submit`.
4. Envie para revisão.

> Para **corrigir só JS/estilo** sem passar pela loja, existe o **EAS Update** (atualização "over the air"). É um tema à parte — quando quiser, peça que eu monto o passo a passo.

---

<a name="parte-6"></a>
## Parte 6 — Problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| `eas: command not found` | CLI não instalado | `npm install -g eas-cli` |
| Build falha logo no início | Não fez login / projeto não vinculado | `eas login` e `eas init` |
| APK não instala ("app não instalado") | Bloqueio de fonte desconhecida ou versão antiga instalada | Permita fontes desconhecidas; desinstale versão antiga antes |
| Play recusa o upload | Você enviou **APK** na produção | Envie o **AAB** (profile `production`) |
| "Você precisa de 12 testadores" | Regra de contas pessoais novas | Rode o teste fechado 12 pessoas / 14 dias antes da produção |
| Link abre no navegador, não no app | `assetlinks.json` sem a impressão certa, ou app instalado **antes** de publicar o arquivo | Ponha os **dois** SHA-256, publique a API, **reinstale** o app |
| `app.alianutri.com.br/.well-known/...` dá 404 | Subdomínio não roteia para o Worker | Adicione Custom Domain/Route no Cloudflare (ver 4.4) |
| Deeplink funciona no APK de teste mas não no da loja | Faltou o SHA-256 da **App signing key** do Google | Adicione a impressão da *App signing key* (Play Console → Integridade do app) |
| Perdi meu keystore | Está na conta Expo | Não recrie à toa; recupere o acesso à conta Expo. Com Play App Signing, o Google ainda protege a assinatura final |

---

<a name="cola"></a>
## Cola de comandos (copiar e colar)

```powershell
# --- Preparar (uma vez) ---
npm install -g eas-cli
eas login
eas init                       # vincula o projeto (dentro de alianutri-patient)

# --- Gerar APK para testar ---
eas build --platform android --profile preview

# --- Gerar AAB para a loja ---
eas build --platform android --profile production

# --- Ver a impressão digital (SHA-256) da chave de upload ---
eas credentials                # Android -> production -> SHA-256 Fingerprint

# --- Publicar a API (dentro de alianutri-api) ---
npx wrangler deploy

# --- Conferir o assetlinks no ar ---
# abra no navegador:
# https://app.alianutri.com.br/.well-known/assetlinks.json

# --- (Opcional) Enviar à loja pelo terminal ---
eas submit --platform android --profile production
```

### Ordem recomendada, do zero ao ar
1. Parte 1 (preparar máquina) → 2. Parte 2 (APK e testar no celular) → 3. Parte 3.1 (criar conta Google, já vai adiantando a verificação) → 4. Parte 3.3–3.6 (AAB + teste interno + questionários) → 5. **Parte 4** (deeplink: SHA-256 → API → verificar) → 6. Parte 3.7 (produção).

> Faça o **deeplink (Parte 4) antes de ir para produção**, para o app já sair da loja com os links funcionando.

---

**Dúvida em qualquer passo?** Volte na tabela de [identidade do app](#identidade) — a maioria dos erros é usar um valor errado (package, domínio ou SHA-256). Boa publicação! 🚀
