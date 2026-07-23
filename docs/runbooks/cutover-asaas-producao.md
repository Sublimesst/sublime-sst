# Runbook — Corte Asaas Sandbox → Produção (Sublime SST)

> Documento operacional de **cutover**. Executar passo a passo **somente quando a
> conta Asaas produção estiver liberada** (FASE 0). Nenhum passo aqui deve ser
> feito antecipadamente. O runbook não altera código — o código já está pronto e
> validado em `origin/main` @ `19dd5c4`. Toda mudança é de **configuração**
> (variáveis Vercel + painel Asaas) e **verificação**.
>
> **Regra de ouro:** nunca trocar `ASAAS_API_KEY` sem trocar `ASAAS_BASE_URL` no
> mesmo passo (FASE 2). Chave de produção contra URL de sandbox = 401 em toda
> cobrança → cadastro quebra (incidente já ocorrido, ver
> `docs/runbooks/homologacao-asaas-sandbox-2026-07.md` e memória do projeto).

---

## Papéis

| Sigla | Quem | Responsabilidade central |
|---|---|---|
| **SÓCIAS** | Ariane / sócia-administradora | Concluir cadastro da conta Asaas produção; fornecer chave API e token de webhook de produção |
| **OP** | Operador do corte (Leonardo) | Alterar variáveis na Vercel, forçar redeploy, configurar webhook no painel Asaas, realizar o pagamento do smoke test, confirmar Ready/logs nos painéis |
| **CLAUDE** | Assistente | **Apenas leitura/verificação**: rodar queries read-only no banco, conferir estado de Payment/Company/Commission, dirigir o preenchimento do cadastro no navegador (**nunca inserir dados de cartão**), gerar relatórios |

> ⚠️ **Nenhum segredo (chave API, token) deve ser colado neste documento nem em
> commit.** Onde o runbook pede "evidência" de variável, registrar apenas o
> **nome** da variável, se está **definida (sim/não)** e, no máximo, os **4
> últimos caracteres** da chave para conferência — nunca o valor completo.

---

## FASE 0 — Pré-condições obrigatórias

**Não iniciar o corte enquanto todos os itens abaixo não estiverem ✅.**

| # | Pré-condição | Responsável | Como confirmar | Evidência |
|---|---|---|---|---|
| 0.1 | Conta Asaas produção com cadastro concluído e **movimentação liberada** (não mostra mais "conclua seu cadastro para movimentar saldo") | SÓCIAS | Login no painel Asaas produção | `____________________` |
| 0.2 | Chave API de **produção** disponível | SÓCIAS → OP | Painel Asaas → Integrações → API Key | Últimos 4: `________` |
| 0.3 | Token do webhook de **produção** definido | OP | Gerar/definir token forte (ex.: 32 bytes hex) | Últimos 4: `________` |
| 0.4 | `RESEND_API_KEY` confirmada e ativa na Vercel (produção) | OP | Painel Vercel → Env Vars | Definida? `sim/não` |
| 0.5 | Deploy atual **Ready** no commit `19dd5c4` | OP | Painel Vercel → Deployments | `____________________` |
| 0.6 | Backup Supabase confirmado + restore documentado | OP | `docs/runbooks/backup-supabase.md` + painel Supabase (backup automático ativo) | `____________________` |
| 0.7 | **Decisão registrada** sobre os dados de homologação Sandbox no banco (ver nota) | OP | Escolha explícita: manter / limpar antes do corte | `manter / limpar` |

> **Nota 0.7 — dados de homologação no banco.** O banco Supabase de **produção**
> é o mesmo usado na homologação Sandbox. Há empresas/pagamentos/comissões de
> teste com IDs Asaas de **sandbox** (que não existem em produção), identificáveis
> pelos e-mails `leonardo.rodrigues123654+...@gmail.com` e CNPJs fictícios
> `20.260.7xx/...`. Eles **não quebram** contratações novas (cada uma cria seus
> próprios registros), mas poluem relatórios/admin. Decidir **antes** do corte se
> serão limpos (em sessão separada, com aprovação explícita — **nunca apagados
> automaticamente por este runbook**). CLAUDE pode **listar** esses registros em
> leitura para apoiar a decisão (query em Anexo A).

**Portão FASE 0:** só avance para FASE 1 com 0.1–0.7 todos ✅.

---

## FASE 1 — Fotografar estado anterior (baseline)

Registrar o estado **antes** de qualquer mudança, para permitir rollback e auditoria.

| # | Item | Responsável | Evidência |
|---|---|---|---|
| 1.1 | Nomes das variáveis Asaas na Vercel + se estão definidas (sem valor completo) | OP | `ASAAS_API_KEY`(………), `ASAAS_BASE_URL`=`____`, `ASAAS_WEBHOOK_TOKEN`(………), `ASAAS_SUBSCRIPTION_BILLING_TYPE`=`ausente?` |
| 1.2 | Commit atualmente publicado | OP | `____________________` (esperado `19dd5c4`) |
| 1.3 | URL do webhook **Sandbox** atualmente configurada | OP | `____________________` |
| 1.4 | Status da fila do webhook Sandbox (ativa / pausada) | OP | `____________________` |
| 1.5 | Contagens no banco (Company / Payment / Commission / CancellationRequest) | CLAUDE (leitura) | rodar **Anexo A** → colar saída: `____________________` |
| 1.6 | Horário de início do corte (ISO, com fuso) | OP | `____________________` |

**Portão FASE 1:** baseline completo e salvo (colar neste doc ou em anexo datado).

---

## FASE 2 — Troca coordenada das variáveis Vercel

> **CRÍTICO — passo atômico.** Alterar as três variáveis **na mesma janela**,
> antes de qualquer redeploy. Nunca deixar `ASAAS_API_KEY` de produção conviver
> com `ASAAS_BASE_URL` de sandbox (ou vice-versa).

| # | Variável | Novo valor | Responsável |
|---|---|---|---|
| 2.1 | `ASAAS_API_KEY` | chave de **produção** (0.2) | OP |
| 2.2 | `ASAAS_BASE_URL` | `https://api.asaas.com/v3` | OP |
| 2.3 | `ASAAS_WEBHOOK_TOKEN` | token de **produção** (0.3) | OP |
| 2.4 | `ASAAS_SUBSCRIPTION_BILLING_TYPE` | **manter ausente** (default `UNDEFINED` no código) | OP |

- [ ] 2.1, 2.2, 2.3 alteradas na mesma sessão de edição
- [ ] 2.4 confirmada ausente
- [ ] Nenhum valor colado em documento/commit

**Portão FASE 2:** as três variáveis trocadas juntas + 2.4 ausente. **Ainda não redeployado.**

---

## FASE 3 — Redeploy

| # | Passo | Responsável | Evidência |
|---|---|---|---|
| 3.1 | Forçar redeploy (variáveis só valem após novo deploy) | OP | id do deploy: `________` |
| 3.2 | Confirmar status **Ready** | OP | `____________________` |
| 3.3 | Confirmar commit publicado = `19dd5c4` | OP | `____________________` |
| 3.4 | Abrir `https://www.sublimesst.com` (domínio **www**) | OP/CLAUDE | carrega OK? `sim/não` |
| 3.5 | Validar login admin (senha + OTP) | OP | acessou dashboard? `sim/não` |
| 3.6 | Verificar logs por erros **401/403/500** | OP | Vercel → Logs. Sem erros? `sim/não` |
| 3.7 | **Não criar cliente ainda** | — | — |

> Sinal de alarme: se aparecer no log `[ASAAS] ASAAS_API_KEY ausente/inválida em
> PRODUÇÃO — ... rodando em modo mock`, a chave não foi aplicada → **abortar** e
> revisar FASE 2 antes de seguir.

**Portão FASE 3:** Ready + `19dd5c4` + www OK + admin OK + logs limpos.

---

## FASE 4 — Configurar webhook Asaas produção

**URL exata (com `www`):**

```
https://www.sublimesst.com/api/webhooks/asaas
```

> Sem `www` a Vercel responde **308 (redirect)** e o Asaas **não segue** o
> redirect → webhook nunca chega. Já ocorreu na homologação.

**Eventos a habilitar:**

| Evento | Habilitar? |
|---|---|
| `PAYMENT_CONFIRMED` | ✅ |
| `PAYMENT_RECEIVED` | ✅ |
| `PAYMENT_OVERDUE` | ✅ |
| `PAYMENT_REFUNDED` | ✅ |
| `PAYMENT_CREDIT_CARD_CAPTURE_REFUSED` | ✅ |
| `PAYMENT_CHARGEBACK_REQUESTED` | ✅ |
| `PAYMENT_CHARGEBACK_DISPUTE` | ✅ |
| `PAYMENT_AWAITING_CHARGEBACK_REVERSAL` | ✅ |

**Confirmações obrigatórias:**

| # | Item | Responsável | Evidência |
|---|---|---|---|
| 4.1 | URL exata com `www` cadastrada | OP | `____________________` |
| 4.2 | Todos os 8 eventos habilitados | OP | `____________________` |
| 4.3 | Token do webhook **idêntico** ao `ASAAS_WEBHOOK_TOKEN` da Vercel (2.3) | OP | conferido? `sim/não` |
| 4.4 | Fila do webhook **ativa** (não pausada) | OP | `____________________` |
| 4.5 | Sem redirect 308 no teste de envio (se o painel oferecer "testar") | OP | HTTP recebido: `________` |

> ⚠️ Mismatch de token (4.3) → o webhook responde **401** (`timingSafeEqual`
> contra `ASAAS_WEBHOOK_TOKEN`) e nenhum pagamento é conciliado. Conferir os dois
> lados byte a byte.

**Portão FASE 4:** URL www + 8 eventos + token casado + fila ativa.

---

## FASE 5 — Smoke test controlado

> ⚠️ **Isto cria uma cobrança REAL de dinheiro em produção.** Usar valor
> baixo/cancelável, e-mail real controlado e método de pagamento próprio do OP.
> **CLAUDE dirige o cadastro no navegador, mas o OP realiza o pagamento** (Claude
> nunca insere dados de cartão).

| # | Passo | Responsável | Evidência |
|---|---|---|---|
| 5.1 | Criar cliente orgânico de teste **claramente identificado**, **sem parceiro**, Essencial, **sem LTCAT**, e-mail real controlado (aba nova / sessionStorage limpo) | CLAUDE (cadastro) | CNPJ usado: `________` |
| 5.2 | Confirmar `asaasCustomerId` e `asaasSubscriptionId` **de produção** (sem `_mock_`, sem prefixo/ID de sandbox) | CLAUDE (leitura) | ids mascarados: `____________________` |
| 5.3 | Validar checkout no domínio **`asaas.com`** (produção, não `sandbox.asaas.com`) | OP/CLAUDE | URL: `____________________` |
| 5.4 | Realizar pagamento controlado | **OP** | forma/valor: `________` |
| 5.5 | Confirmar webhook **HTTP 200** no log Asaas | OP | `____________________` |
| 5.6 | Confirmar `Payment` implantação `confirmed` no banco | CLAUDE (leitura) | `____________________` |
| 5.7 | Confirmar `Commission = 0` (cliente sem parceiro) | CLAUDE (leitura) | `____________________` |
| 5.8 | Confirmar e-mail de boas-vindas **recebido** com plano, faixa e valores corretos; **sem menção a LTCAT** | OP | recebido? `sim/não` |
| 5.9 | Confirmar acesso ao portal do cliente (magic link) | OP/CLAUDE | `____________________` |
| 5.10 | Cancelar a assinatura pelo admin | OP | `____________________` |
| 5.11 | Confirmar `DELETE /subscriptions` **HTTP 200** | OP | `____________________` |
| 5.12 | Confirmar `Company.status = cancelled` | CLAUDE (leitura) | `____________________` |

> **Não testar refund nem chargeback** neste smoke test sem decisão específica
> (refund real move dinheiro; chargeback não é simulável). Ambos ficam como
> pendência pós-go-live, já registrada.

**Portão FASE 5:** 5.1–5.12 todos com evidência ✅.

---

## FASE 6 — Go/No-Go

**Critérios mínimos para GO** (todos obrigatórios):

| Verificação | Evidência | Responsável | Status | Bloqueia? |
|---|---|---|---|---|
| Conta Asaas produção liberada | `____` | SÓCIAS | ☐ | Sim |
| Deploy Ready @ `19dd5c4` | `____` | OP | ☐ | Sim |
| Variáveis de produção corretas (key+URL+token juntos) | `____` | OP | ☐ | Sim |
| Webhook produção HTTP 200 | `____` | OP | ☐ | Sim |
| Payment conciliado no banco | `____` | CLAUDE | ☐ | Sim |
| E-mail de boas-vindas recebido | `____` | OP | ☐ | Sim |
| Cancelamento validado (`DELETE` 200 + `cancelled`) | `____` | OP/CLAUDE | ☐ | Sim |
| Backup Supabase confirmado | `____` | OP | ☐ | Sim |
| Nenhum erro crítico nos logs (401/403/500) | `____` | OP | ☐ | Sim |

- **GO** apenas se **todas** as linhas acima = ✅.
- Qualquer linha ❌ → **NO-GO** → seguir FASE 7 se já houver produção parcial, ou corrigir e repetir a fase correspondente.

**Decisão final:** `GO / NO-GO` — por: `____________` — em: `____________`

---

## FASE 7 — Rollback (somente se o corte falhar)

> Executar apenas se, após FASE 2+, algo crítico falhar e a decisão for **voltar
> ao Sandbox**. Rollback é reversão de **configuração**, não de dados.

| # | Passo | Responsável |
|---|---|---|
| 7.1 | **Interromper novas contratações** imediatamente (avisar equipe; se possível, pausar divulgação do link) | OP |
| 7.2 | **Não misturar** chave e `BASE_URL` de ambientes em nenhum momento | OP |
| 7.3 | Restaurar as **três** variáveis Sandbox **juntas** (`ASAAS_API_KEY`, `ASAAS_BASE_URL=https://sandbox.asaas.com/api/v3`, `ASAAS_WEBHOOK_TOKEN`) — **somente se** a decisão for voltar ao Sandbox | OP |
| 7.4 | Forçar redeploy | OP |
| 7.5 | Confirmar status **Ready** | OP |
| 7.6 | **Registrar quais registros foram criados em produção** durante a janela (rodar Anexo A de novo e comparar com o baseline da FASE 1) | CLAUDE (leitura) |
| 7.7 | **Não apagar dados financeiros automaticamente** — `Payment`/`Commission`/`Company` criados ficam para tratamento consciente | OP |
| 7.8 | **Escalar qualquer cobrança real criada** para tratamento manual no painel Asaas (cancelar cobrança pendente / estornar se já pago), caso a decisão seja não prosseguir | OP + SÓCIAS |

> Se uma cobrança real chegou a ser paga durante um corte abortado, isso é
> dinheiro real do cliente — tratar como incidente: contato com o cliente,
> estorno manual no Asaas, e registro do ocorrido. Nunca deixar "órfão".

---

## Anexos

### Anexo A — Query read-only de baseline/verificação

> Rodar de dentro do repo, lendo `DATABASE_URL` do ambiente. **Somente leitura.**
> CLAUDE pode executar; salvar a saída como evidência (FASE 1.5 e FASE 7.6).

```js
// _baseline.mjs — SOMENTE LEITURA. Não escreve nada.
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const [companies, payments, commissions, cancellations] = await Promise.all([
  prisma.company.count(),
  prisma.payment.count(),
  prisma.commission.count(),
  prisma.cancellationRequest.count(),
])
// Registros de teste de homologação (para a decisão 0.7), sem expor dados sensíveis:
const testCompanies = await prisma.company.count({
  where: { email: { contains: 'leonardo.rodrigues123654+' } },
})
console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  companies, payments, commissions, cancellations,
  companiesDeTeste: testCompanies,
}, null, 2))
await prisma.$disconnect()
```

Execução (exemplo): copiar para o repo como `_baseline.mjs`, rodar
`node --env-file=.env.local _baseline.mjs` (ou com `DATABASE_URL` de produção
exportada), **e remover o arquivo ao final** (não commitar).

### Anexo B — Sinais de alarme (abortar imediatamente)

- Log `[ASAAS] ASAAS_API_KEY ausente/inválida em PRODUÇÃO ... modo mock` → chave não aplicada.
- Erro `401` da Asaas em `createOrFindCustomer`/`createImplantacaoCharge` → chave × BASE_URL de ambientes trocados.
- Webhook retornando `401` → token Vercel ≠ token painel Asaas.
- Webhook retornando `308` → URL sem `www`.
- Checkout abrindo em `sandbox.asaas.com` durante o smoke test → `ASAAS_BASE_URL` não trocada.
- Qualquer `_mock_`/ID de sandbox em `asaasCustomerId`/`asaasSubscriptionId` de cliente novo → ambiente inconsistente.

---

## Resumo por dependência

### Depende das SÓCIAS
- Concluir cadastro da conta Asaas produção (0.1) — **bloqueador-raiz**.
- Fornecer a chave API de produção (0.2).
- Tratamento manual de cobranças reais em caso de rollback (7.8).

### Depende do OPERADOR (Leonardo)
- Definir token de webhook produção (0.3); confirmar `RESEND_API_KEY` (0.4); confirmar deploy Ready (0.5) e backup (0.6); decisão 0.7.
- Trocar as 3 variáveis juntas na Vercel (FASE 2) + redeploy (FASE 3).
- Configurar o webhook no painel Asaas (FASE 4).
- Realizar o pagamento do smoke test (5.4) e conferências de painel (logs, Ready, webhook 200).
- Executar/decidir o rollback (FASE 7).

### CLAUDE — apenas leitura/verificação
- Rodar queries read-only de baseline e verificação (Anexo A).
- Conferir estado de `Payment`/`Company`/`Commission`/`CancellationRequest` no banco.
- Dirigir o preenchimento do cadastro no navegador no smoke test — **sem inserir dados de cartão**.
- Gerar relatórios e comparar baseline × pós-corte.
- **Nunca**: alterar variáveis, criar deploy, configurar webhook, inserir dados de pagamento, apagar dados.

---

## Checklist curto do operador (destacar/imprimir)

- [ ] FASE 0: conta Asaas liberada + chave + token + Resend + deploy Ready `19dd5c4` + backup + decisão 0.7
- [ ] FASE 1: baseline fotografado (variáveis, commit, webhook Sandbox, contagens, hora)
- [ ] FASE 2: `ASAAS_API_KEY` + `ASAAS_BASE_URL=api.asaas.com/v3` + `ASAAS_WEBHOOK_TOKEN` trocados **juntos**; `SUBSCRIPTION_BILLING_TYPE` ausente
- [ ] FASE 3: redeploy → Ready → `19dd5c4` → www OK → admin OK → logs limpos (sem 401/403/500)
- [ ] FASE 4: webhook `https://www.sublimesst.com/api/webhooks/asaas` + 8 eventos + token casado + fila ativa + sem 308
- [ ] FASE 5: smoke test completo (customer/subscription produção → pagamento → webhook 200 → Payment confirmed → Commission 0 → e-mail OK → portal → cancelamento `DELETE` 200 → `cancelled`)
- [ ] FASE 6: Go/No-Go — todos os 9 critérios ✅
- [ ] (Se falhar) FASE 7: rollback controlado, sem apagar financeiro, escalando cobrança real

## Tempo estimado por fase

| Fase | Estimativa | Observação |
|---|---|---|
| 0 | variável | depende das sócias (conta pode levar dias); checklist em si ~30 min |
| 1 | ~15 min | |
| 2 | ~10 min | |
| 3 | ~15 min | redeploy ~2–5 min + verificações |
| 4 | ~15 min | |
| 5 | ~30–45 min | E2E completo com pagamento real |
| 6 | ~15 min | consolidação de evidências |
| 7 | ~20 min | só se acionado |

---

## Critérios para ABORTAR o corte (a qualquer momento)

- FASE 0 incompleta (qualquer pré-condição ❌).
- Log de "modo mock" em produção após FASE 3.
- `401`/`403`/`500` persistente nos logs após redeploy.
- Checkout abrindo em `sandbox.asaas.com` no smoke test.
- Webhook não retorna `200` (recebe `308`/`401`) e não resolve rápido.
- Qualquer `_mock_`/ID de sandbox em cliente novo de produção.
- Dúvida sobre segredo exposto/commitado → parar e sanear antes de seguir.

Ao abortar: **não prosseguir para novas contratações**, seguir FASE 7 se já houver
estado parcial em produção, e registrar o incidente.
