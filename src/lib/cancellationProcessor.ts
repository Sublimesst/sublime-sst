// ═══════════════════════════════════════════════════════════
// SUBLIME SST — Processor do encerramento efetivo
// (regra de vigência de 12 meses — docs/DECISIONS.md, docs/CONTRACT_MVP_V1.md §3)
//
// Aplica, para cada CancellationRequest pendente cuja effectiveAt já chegou,
// a MESMA sequência fail-closed da PR #23 (Asaas cancelada ANTES da
// transição local de Company) — só que agora no momento certo (a data de
// efeito), nunca no momento do pedido (ver src/app/api/admin/empresas/[id]/cancel/route.ts).
//
// Fronteira explícita entre a chamada externa (Asaas) e a transação local:
// a chamada à Asaas NUNCA participa de uma transação SQL. Em vez de um lock
// de "em processamento" (que ficaria preso para sempre se o processo
// morresse entre os dois lados dessa fronteira, sem estratégia de
// recovery), cada lado é protegido por um compare-and-swap atômico
// (updateMany condicional), e a própria idempotência da Asaas garante que
// reexecutar do zero após uma queda é sempre seguro:
//   - falha ao chamar a Asaas → nada é escrito localmente, o pedido
//     continua "pending" (com lastProcessingError registrado só para
//     diagnóstico) e é retentado automaticamente na próxima execução;
//   - sucesso na Asaas mas o processo morre antes de gravar localmente →
//     a próxima execução chama a Asaas de novo, recebe alreadyCancelled:true
//     (DELETE de assinatura já removida — ver src/lib/asaas.ts), e segue
//     normalmente para a gravação local;
//   - Company já marcada cancelled (por uma execução concorrente que já
//     terminou essa etapa) → pula direto para finalizar o
//     CancellationRequest, sem repetir a chamada à Asaas;
//   - a finalização do CancellationRequest (status pending→processed) usa
//     updateMany condicional — só quem "vence" essa transição envia os
//     e-mails de conclusão, nunca duas notificações para a mesma corrida.
//
// Commission: deliberadamente NÃO mutada aqui. Decisão já encerrada (ver
// docs/DECISIONS.md e o histórico de revisão da tranche): uma mensalidade
// legitimamente paga e não estornada mantém a Commission correspondente —
// o simples encerramento posterior do contrato do cliente NÃO gera clawback
// por si só. O evento que desfaz uma Commission continua sendo exclusivamente
// o refund/chargeback/estorno do Payment correspondente (ver
// src/app/api/webhooks/asaas/route.ts, eventos PAYMENT_REFUNDED/
// PAYMENT_CHARGEBACK_*), nunca o encerramento efetivo do cancelamento.
// ═══════════════════════════════════════════════════════════

import type { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { cancelSubscription } from './asaas'
import { sendCancellationConfirmedClient, notifyPartnerCompanyCancelled } from './mailer'

export interface ProcessCancellationsResult {
  processed: number
  failed: number
  skipped: number
}

type DueCancellationRequest = Prisma.CancellationRequestGetPayload<{
  include: { company: { include: { partner: true } } }
}>

// Código estável controlado pela aplicação — NUNCA a mensagem bruta de
// cancelSubscription(), que pode conter o corpo JSON retornado pela Asaas
// (ver src/lib/asaas.ts: `Asaas API error ${status}: ${JSON.stringify(err)}`).
// lastProcessingError é só para diagnóstico operacional interno; nunca deve
// carregar payload externo, IDs de assinatura/pagamento/cliente, stack ou URL.
const ASAAS_CANCEL_FAILED_CODE = 'asaas_subscription_cancel_failed'
// Extrai SOMENTE o status HTTP numérico de 3 dígitos do prefixo controlado
// da mensagem de erro (formato fixo já usado por asaas.ts) — nunca captura
// nem repassa o que vem depois dos dois-pontos (o corpo JSON externo).
const ASAAS_ERROR_STATUS_RE = /^Asaas API error (\d{3}):/

function describeAsaasCancelFailure(err: unknown): string {
  const message = err instanceof Error ? err.message : ''
  const statusMatch = ASAAS_ERROR_STATUS_RE.exec(message)
  return statusMatch ? `${ASAAS_CANCEL_FAILED_CODE}:${statusMatch[1]}` : ASAAS_CANCEL_FAILED_CODE
}

export async function processDueCancellations(now: Date = new Date()): Promise<ProcessCancellationsResult> {
  const due = await prisma.cancellationRequest.findMany({
    where: { status: 'pending', effectiveAt: { lte: now } },
    include: { company: { include: { partner: true } } },
  })

  let processed = 0
  let failed = 0
  let skipped = 0

  for (const request of due) {
    const outcome = await processSingleCancellation(request, now)
    if (outcome === 'processed') processed++
    else if (outcome === 'failed') failed++
    else skipped++
  }

  return { processed, failed, skipped }
}

type SingleOutcome = 'processed' | 'failed' | 'skipped'

async function processSingleCancellation(request: DueCancellationRequest, now: Date): Promise<SingleOutcome> {
  const { company } = request

  if (company.status !== 'cancelled') {
    if (company.asaasSubscriptionId) {
      try {
        await cancelSubscription(company.asaasSubscriptionId)
      } catch (err) {
        const reason = describeAsaasCancelFailure(err)
        // Nunca loga `err` bruto — a mensagem de cancelSubscription() pode
        // conter o corpo JSON devolvido pela Asaas. Só o código controlado
        // pela aplicação (com o status HTTP, quando extraível) vai para o
        // log e para lastProcessingError.
        console.error(`[CANCELLATION-PROCESSOR] Falha ao cancelar assinatura na Asaas (cancellationRequestId=${request.id}, companyId=${company.id}) — pedido permanece pending para retry. motivo=${reason}`)
        await prisma.cancellationRequest.updateMany({
          where: { id: request.id, status: 'pending' },
          data: { lastProcessingError: reason },
        }).catch(logErr => console.error('[CANCELLATION-PROCESSOR] Falha ao registrar lastProcessingError:', logErr))
        return 'failed'
      }
    }

    await prisma.company.updateMany({
      where: { id: company.id, status: { not: 'cancelled' } },
      data: {
        status: 'cancelled',
        ...(company.asaasSubscriptionId ? { subscriptionStatus: 'inactive' } : {}),
      },
    })
  }

  // Só quem vence esta transição (pending → processed) segue para enviar os
  // e-mails de conclusão — uma execução concorrente que chega depois recebe
  // count: 0 e para aqui, sem reenviar nada.
  const finalize = await prisma.cancellationRequest.updateMany({
    where: { id: request.id, status: 'pending' },
    data: { status: 'processed', processedAt: now, lastProcessingError: null },
  })
  if (finalize.count === 0) {
    return 'skipped'
  }

  try {
    await sendCancellationConfirmedClient({
      to: company.email, responsavel: company.responsavel, companyName: company.razaoSocial,
      requestedAt: request.requestedAt, reason: request.reason,
    })
  } catch (err) {
    console.error(`[CANCELLATION-PROCESSOR] Falha ao enviar e-mail de conclusão ao cliente (cancellationRequestId=${request.id}):`, err)
  }

  if (company.partner) {
    try {
      await notifyPartnerCompanyCancelled({
        to: company.partner.email, partnerName: company.partner.name, companyName: company.razaoSocial,
      })
    } catch (err) {
      console.error(`[CANCELLATION-PROCESSOR] Falha ao enviar e-mail de conclusão ao parceiro (cancellationRequestId=${request.id}):`, err)
    }
  }

  return 'processed'
}
