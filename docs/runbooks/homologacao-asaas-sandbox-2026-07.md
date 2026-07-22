# Homologação Asaas Sandbox — Sublime Digital (2026-07)

> Registro de resultado de teste. Não é um runbook de execução — é a ata da
> rodada de homologação E2E feita em Asaas Sandbox nas sessões de 20-22/07/2026.
> Nenhum dado de teste foi apagado; nenhum código de produção foi alterado para
> gerar este documento.

## Objetivo

Validar ponta a ponta o fluxo financeiro da Sublime Digital (cadastro →
cobrança → assinatura → webhook → comissão → portais → cancelamento) contra o
ambiente Asaas Sandbox, antes de qualquer venda real em produção.

## Ambiente

- `ASAAS_BASE_URL=https://sandbox.asaas.com/api/v3`, `ASAAS_API_KEY` e
  `ASAAS_WEBHOOK_TOKEN` de Sandbox configurados na Vercel.
- Empresa de teste: **Homologação Sandbox Teste LTDA** (CNPJ fictício de
  homologação `20.260.720/0001-01`, gerado com checksum válido, aprovado
  previamente pelo usuário — não corresponde a empresa real).
- Parceiro de teste: **Parceiro Teste Homologação**, indicando a empresa acima
  via `?ref=`.

## Resultado — validado

| Item | Resultado |
|---|---|
| Cadastro via link de parceiro (`?ref=`) | ✅ Lead/Company vinculados ao `partnerId` corretamente |
| Criação de customer Asaas Sandbox | ✅ `asaasCustomerId: cus_000008443104` real, sem `_mock_` |
| Cobrança de implantação | ✅ R$149,00 (promo 24h), `invoiceUrl` real em `sandbox.asaas.com` |
| Assinatura com 1ª mensalidade no ato | ✅ `asaasSubscriptionId: sub_mf8urmqcz78apzio`, `nextDueDate` = data da contratação |
| Webhook `PAYMENT_CONFIRMED`/`PAYMENT_RECEIVED` | ✅ HTTP 200 (após corrigir a URL configurada no painel Asaas para `https://www.sublimesst.com/api/webhooks/asaas`) |
| `Payment` implantação | ✅ `confirmed` |
| `Payment` mensalidade | ✅ `confirmed` (evento chegou junto com o da implantação nesta rodada) |
| `Commission` #1 `em_carencia` | ✅ R$19,90 (10% de R$199,00), `mensalidadeNum:1`, liberação prevista 19/08/2026 |
| Portal do Cliente | ✅ login via magic link, Company/status corretos, sem erro no console |
| Portal do Parceiro | ✅ login via magic link, indicação e comissão exibidas corretamente |
| Cancelamento local (`Company.status → cancelled`) | ✅ via admin, motivo/valores registrados em `CancellationRequest` |
| Cancelamento da assinatura na Asaas | ✅ validado por log de requisição `DELETE /subscriptions/{id}` com retorno HTTP 200, executado automaticamente **antes** da transição local (comportamento do commit `8974df3`, confirmado ainda vigente) |
| `Commission` estornada no cancelamento | ✅ `em_carencia → estornada` |
| Admin exibindo mensalidade correta | ✅ corrigido (commit `b1330a2`) — lê `Company.mensalidadeValor`, não mais `Plan.monthlyPrice` |
| Alerta obsoleto "cancelamento Asaas ainda é manual" | ✅ removido/corrigido (commit `b1330a2`) — texto agora reflete o cancelamento automático |

## Pendência — não validada nesta rodada

**Estorno de pagamento (`PAYMENT_REFUNDED`) não validado ponta a ponta.**

- Um estorno manual foi feito no painel Asaas Sandbox para uma das duas
  cobranças; a outra não pôde ser estornada por saldo insuficiente na conta
  Sandbox (limitação operacional do ambiente de testes, não do código).
- **Nenhum dos dois `Payment` mudou de `confirmed` para `refunded`** no banco
  — indício de que o evento `PAYMENT_REFUNDED` não chegou ou não foi
  processado pelo nosso webhook nesta rodada.
- **Sem log de entrega de webhook para esse evento, não há evidência de falha
  no código da Sublime** — o handler de `PAYMENT_REFUNDED` já existe em
  `webhook/asaas/route.ts` e foi validado em sessões anteriores (ver memória
  do projeto, sessão "cartão e chargeback"); o que falta é confirmar a entrega
  do evento em si neste ambiente.
- **Registrado como pendência**: revalidar `PAYMENT_REFUNDED` numa nova rodada
  Sandbox (confirmando antes que o evento está habilitado no painel Asaas) ou
  em produção controlada, antes de considerar o ciclo financeiro 100% coberto.

## Dados de teste no banco (não apagados)

`Partner` "Parceiro Teste Homologação" (`active`) · `Company` "Homologação
Sandbox Teste LTDA" (`cancelled`) · 2 `Payment` (`confirmed`) · 1 `Commission`
(`estornada`) · 1 `CancellationRequest`. Sem duplicidade em nenhuma tabela em
nenhum ponto da homologação.

## Próximo passo recomendado

Antes de migrar para Asaas produção: (1) revalidar `PAYMENT_REFUNDED` numa
nova rodada; (2) aguardar a conclusão cadastral das sócias na conta Asaas
(pendência já registrada na memória do projeto).
