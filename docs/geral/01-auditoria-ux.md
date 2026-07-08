# Auditoria de Produto — App do Paciente AliaNutri

> Auditoria (não redesign). Base: leitura completa de navegação, 5 abas, 14 telas de stack, hooks de dados (`usePortal.ts`), modelo (`types/portal.ts`), design system (`theme/`), gamificação (`lib/gamification.ts`) e lembretes (`lib/localNotifications.ts`).

## 1. Mapa da arquitetura atual

**Tab bar (5 slots):**
- **Início** — dashboard com ~13 seções verticais.
- **Plano** — leitor do plano alimentar (read-only).
- **+ (FAB central)** — abre `Alert` nativo com 3 opções: *Postar no diário · Registrar água · Registrar peso*.
- **Diário** — timeline de **adesão ao plano** (Segui / Parcial / Foto / Pulei).
- **Perfil** — dados pessoais + 1 gráfico de peso + engrenagem de config.

**Stack (atalhos / cards / deep link):** `booking`, `chat`, `documents`, `evolution`, `feed`, `goals`, `post-compose`, `progress-photos`, `questionnaires`, `settings`, `water`, `weight`, `wellness`, `post/[id]`.

**Órfã:** `guidelines` é aba escondida (`href: null`).

**Pontos fortes (para calibrar a crítica):** design system semântico e coeso (3 temas, escala Inter, espaçamento/raio/sombra padronizados); gamificação derivada de dados reais; feed offline-first; háptica farta; skeletons; dark mode real. A base técnica e visual é forte — os problemas são de **arquitetura da informação e modelo mental**.

## 2. Frequência de uso x organização atual

- **Diária:** registrar refeições do plano · água · ler resposta do nutri · (eventual) humor/foto.
- **Semanal:** peso · evolução/progresso · foto de progresso · questionário · consulta.
- **Rara:** ler plano completo · orientações · documentos · config.

**Desencontro central:** a navegação permanente está ocupada por ações de baixa frequência (Plano = ler; Perfil = dados estáticos), enquanto ações diárias/semanais ficam soltas em stack ou enterradas na pasta "Mais" (água, evolução). A estrutura não reflete o comportamento real.

## 3. Achados detalhados

### 3.1 Colisão de nome "Diário" — **Crítico**
- **Problema:** a aba **Diário** é a *timeline de adesão*; a tela `/feed` (título "Diário") é um *feed social*. Dois produtos, um nome.
- **Causa:** features de fases diferentes nunca reconciliadas.
- **Impacto:** impossível formar modelo mental ("onde posto a foto do prato?"). Canibalização das duas features mais diárias.
- **Solução:** nomes distintos — execução = "Hoje"; feed = "Diário/Jornada".

### 3.2 Logging fragmentado — **Crítico**
- **Problema:** "registrar refeição" tem 4 caminhos (adesão, FreeDiary manual, post social com IA, foto de adesão); humor tem 2 (wellness vs post "mood"); foto tem 3 sistemas.
- **Impacto:** o paciente não sabe o que "conta"; dado clínico espalhado/inconsistente; fricção derruba a taxa de registro.
- **Solução:** modelo único de "registro", roteado internamente.

### 3.3 Botão "+" fraco e incoerente — **Crítico**
- **Problema:** FAB central abre `Alert` nativo (feio, fora da marca) com 3 itens; não inclui registrar refeição do plano (ação nº1).
- **Impacto:** o gesto mais proeminente entrega o menos útil.
- **Solução:** bottom sheet de marca com as ações diárias certas.

### 3.4 Home sobrecarregado — **Importante**
- **Problema:** ~13 seções, com 3–4 visões redundantes de "progresso".
- **Impacto:** sem foco de "o que faço agora"; fadiga.
- **Solução:** 1 herói (dia) + consolidar progresso.

### 3.5 "Evolução" enterrada — **Importante**
- **Problema:** a tela mais rica (peso/IMC/%gordura/nutrição/água/bem-estar) vive na pasta "Mais"; peso aparece duplicado em 3 lugares.
- **Impacto:** a recompensa de "ver progresso" fica difícil de achar.
- **Solução:** promover Evolução; remover gráficos duplicados.

### 3.6 Plano read-only e desconectado do registro — **Importante**
- **Problema:** Plano não tem CTA "segui"; registro mora na aba Diário (mesmo dado, duas abas).
- **Solução:** Plano + execução como um destino.

### 3.7 Perfil ocupa slot nobre com pouco valor — **Importante**
- **Solução:** demover para avatar no header (padrão IG/Strava).

### 3.8 Sem tela de Consultas — **Importante**
- **Problema:** consultas só no card "próxima" + booking; sem lista/histórico/status.
- **Solução:** destino de Consultas (lista + detalhe + sala/endereço + status).

### 3.9 `Alert` nativo em ações primárias — **Importante**
- **Solução:** sheets/modais do design system.

### 3.10 Gamificação "parafusada" — **Desejável**
- **Problema:** streak em 3 lugares; XP/nível só num card; sem tela de conquistas; gated.
- **Solução:** streak canônico; progresso no ponto da ação; visão de conquistas.

### 3.11 Acessibilidade — **Importante**
- **Problema:** fontes 9–10.5px; estados só por cor; sem Dynamic Type.
- **Solução:** piso de fonte; escala do sistema; estado ≠ só cor.

### 3.12 Onboarding não-ativador + lembretes escondidos — **Importante**
- **Problema:** carrossel promocional; lembretes nascem desligados em Settings.
- **Solução:** onboarding que dispara 1ª ação e ativa lembretes.

### 3.13 Sem backfill — **Desejável**
- **Problema:** "registros só no dia atual"; perde dado e streak.

### 3.14 Modo somente-leitura abrupto — **Desejável**
- **Problema:** `can_write=false` trava tudo; paciente sente punição.

## 4. Respostas diretas
- **Prioridade:** registrar refeição · água · ver progresso · chat.
- **Secundário:** plano completo · perfil · suplementos · dica.
- **Mudar de lugar:** Evolução → 1º nível; Perfil → avatar; água → status diário; Orientações → fim da aba órfã.
- **Desaparecer/fundir:** gráficos de peso duplicados; `Alert` do "+"; nome duplicado "Diário".
- **Destaque:** o ato de registrar; progresso; streak único; próximo passo.
- **Unificar:** os dois "Diários"; caminhos de refeição; dois humores; visões de progresso.
- **Dividir:** Home ("hoje" x "insights"); Plano (referência) x Hoje (execução).

## 5. Lista priorizada

**Críticas:** C1 colisão "Diário" · C2 unificar registro de refeição/humor · C3 refazer o "+".
**Importantes:** I1 reduzir Home · I2 promover Evolução · I3 Plano+execução · I4 demover Perfil · I5 tela de Consultas · I6 fim dos `Alert` · I7 acessibilidade · I8 onboarding ativador + lembretes.
**Desejáveis:** D1 gamificação no loop · D2 backfill · D3 suavizar read-only · D4 padronizar iconografia.

**Diagnóstico em uma frase:** acabamento premium sobre uma arquitetura da informação confusa — ativos fortes organizados por *feature*, não pelo *comportamento diário*, com duplicação de conceitos que corrói o modelo mental.
