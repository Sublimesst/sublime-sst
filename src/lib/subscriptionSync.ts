// ═══════════════════════════════════════════════════════════
// SUBLIME SST — Sincronização da 1ª mensalidade da assinatura
// Etapa 1A do plano de correção do fluxo de contratação.
// Somente leitura no Asaas (GET /subscriptions/{id}/payments) — nunca cria
// cobrança nova. Cria o Payment local no máximo uma vez (idempotente por
// asaasId, via constraint única + captura de conflito — nunca faz
// findUnique+create separados, que abririam uma janela de corrida). Nunca
// atualiza um Payment já existente (evita qualquer regressão de status já
// persistido) e nunca aceita um asaasId cujo registro pertença a outra
// empresa/tipo/valor.
// ═══════════════════════════════════════════════════════════

import { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { listSubscriptionPayments, type AsaasCharge } from './asaas'

export type SyncResult =
  | { outcome: 'synced'; paymentId: string }
  | { outcome: 'already_exists'; paymentId: string }
  | { outcome: 'conflict'; paymentId: string }
  | { outcome: 'not_found' }
  | { outcome: 'ambiguous'; candidatesCount: number }
  | { outcome: 'error'; reason: string }

const RETRY_ATTEMPTS = 3
const RETRY_DELAY_MS = 1000 // 3 tentativas, ~2s de espera total (< 3s de orçamento)

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Mapeia status da Asaas para os status que já existem no projeto
// (pending | confirmed | overdue | refunded | disputed — vistos em uso real
// no webhook). Nunca inventa status novo; desconhecido cai em 'pending', o
// estado mais seguro para uma cobrança recém-criada.
function mapAsaasStatus(asaasStatus: string): string {
  switch (asaasStatus) {
    case 'PENDING':                    return 'pending'
    case 'CONFIRMED':
    case 'RECEIVED':                   return 'confirmed'
    case 'OVERDUE':                    return 'overdue'
    case 'REFUNDED':                   return 'refunded'
    case 'CHARGEBACK_REQUESTED':
    case 'CHARGEBACK_DISPUTE':         return 'disputed'
    default:                          return 'pending'
  }
}

// Conversão monetária segura — nunca compara floats diretamente. Rejeita
// valor não finito ou negativo (retorna null, nunca lança).
function reaisToCentsSafe(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null
  return Math.round(value * 100)
}

// Valida o formato de data que a Asaas usa (YYYY-MM-DD) antes de virar Date —
// nunca deixa passar Invalid Date para o Prisma.
function parseDueDate(raw: unknown): Date | null {
  if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null
  const d = new Date(`${raw}T00:00:00.000Z`)
  return Number.isNaN(d.getTime()) ? null : d
}

interface Candidate { charge: AsaasCharge; amountCents: number; dueDate: Date }

// Escolhe, entre as cobranças com valor exatamente igual à mensalidade
// esperada (comparação de inteiros em centavos, nunca floats) e dueDate
// válido, a de menor dueDate. Empate no mínimo → ambíguo, nada é escolhido.
function pickFirstCharge(charges: AsaasCharge[], expectedAmountCents: number):
  { candidate: Candidate } | { ambiguous: true; count: number } | { notFound: true } {
  const candidates: Candidate[] = []
  for (const charge of charges) {
    const amountCents = reaisToCentsSafe(charge.value)
    if (amountCents === null || amountCents !== expectedAmountCents) continue
    const dueDate = parseDueDate(charge.dueDate)
    if (dueDate === null) continue
    candidates.push({ charge, amountCents, dueDate })
  }
  if (candidates.length === 0) return { notFound: true }

  const minTime = Math.min(...candidates.map(c => c.dueDate.getTime()))
  const atMin = candidates.filter(c => c.dueDate.getTime() === minTime)
  if (atMin.length > 1) return { ambiguous: true, count: atMin.length }
  return { candidate: atMin[0] }
}

export async function syncFirstSubscriptionPayment(params: {
  companyId: string
  subscriptionId: string
  expectedAmountCents: number
}): Promise<SyncResult> {
  const { companyId, subscriptionId, expectedAmountCents } = params

  if (!Number.isInteger(expectedAmountCents) || expectedAmountCents <= 0) {
    return { outcome: 'error', reason: 'expectedAmountCents inválido' }
  }

  try {
    let charges: AsaasCharge[] = []
    for (let attempt = 0; attempt < RETRY_ATTEMPTS; attempt++) {
      charges = await listSubscriptionPayments(subscriptionId)
      if (charges.length > 0) break
      if (attempt < RETRY_ATTEMPTS - 1) await sleep(RETRY_DELAY_MS)
    }

    const picked = pickFirstCharge(charges, expectedAmountCents)
    if ('notFound' in picked) return { outcome: 'not_found' }
    if ('ambiguous' in picked) return { outcome: 'ambiguous', candidatesCount: picked.count }

    const { charge, amountCents, dueDate } = picked.candidate

    try {
      const created = await prisma.payment.create({
        data: {
          companyId,
          asaasId:     charge.id,
          type:        'mensalidade',
          amount:      amountCents,
          status:      mapAsaasStatus(charge.status),
          dueDate,
          checkoutUrl: charge.invoiceUrl,
          invoiceUrl:  charge.invoiceUrl,
        },
      })
      return { outcome: 'synced', paymentId: created.id }
    } catch (createErr) {
      // asaasId já existe — atômico por constraint única (nunca findUnique
      // seguido de create separado, que abriria janela de corrida). Cobre
      // tanto corrida real quanto reexecução após sucesso anterior.
      const isUniqueConflict =
        createErr instanceof Prisma.PrismaClientKnownRequestError && createErr.code === 'P2002'
      if (!isUniqueConflict) throw createErr

      const existing = await prisma.payment.findUnique({ where: { asaasId: charge.id } })
      if (!existing) return { outcome: 'error', reason: 'conflito de unicidade sem registro correspondente' }

      // Integridade: só aceita como "já sincronizado" se o registro existente
      // realmente pertence a esta empresa, é do tipo certo e tem o valor
      // certo. Nunca trata silenciosamente um asaasId de outra empresa/tipo/
      // valor como already_exists — e nunca altera o registro conflitante.
      const belongsHere =
        existing.companyId === companyId &&
        existing.type === 'mensalidade' &&
        existing.amount === amountCents
      if (!belongsHere) {
        console.error(`[SUBSCRIPTION_SYNC] Conflito de integridade — companyId=${companyId} paymentId=${existing.id}`)
        return { outcome: 'conflict', paymentId: existing.id }
      }
      return { outcome: 'already_exists', paymentId: existing.id }
    }
  } catch (err) {
    return { outcome: 'error', reason: err instanceof Error ? err.message : 'unknown' }
  }
}
