import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import {
  sendCancellationConfirmedClient,
  sendCancellationNoticeRegisteredClient,
  notifyPartnerCompanyCancelled,
} from '@/lib/mailer'
import { verifyAdminSecret } from '@/lib/adminAuth'
import { cancelSubscription } from '@/lib/asaas'
import { runSerializable } from '@/lib/prismaSerializable'
import { deriveFinancialActivationState, PAYMENT_SELECT, getPaymentOrderBy } from '@/lib/paymentPresentation'
import { computeCancellationEffectiveDate } from '@/lib/cancellationSchedule'

function auth(req: NextRequest) {
  return verifyAdminSecret(req.headers.get('x-admin-secret'))
}

const schema = z.object({
  reason:       z.string().min(1, 'Motivo é obrigatório.'),
  requestedBy:  z.string().min(1, 'Responsável pelo pedido é obrigatório.'),
  requestedAt:  z.coerce.date().optional(),
  handledBy:    z.string().nullish(),
  feeCents:     z.number().int().nullish(),
  pendingCents: z.number().int().nullish(),
  notes:        z.string().nullish(),
})

// Sinais internos (nunca saem da rota) para comunicar, de dentro da
// transação Serializable, um desfecho legítimo que não é a criação de um
// pedido novo — sempre convertidos para a resposta correspondente no catch.
class AlreadyCancelledSignal extends Error {}
class AlreadyRequestedSignal extends Error {
  constructor(public existing: { id: string; effectiveAt: Date | null; requestedAt: Date; status: string }) {
    super('already_requested')
  }
}

// POST /api/admin/empresas/[id]/cancel — regra de vigência de 12 meses
// (docs/DECISIONS.md, docs/CONTRACT_MVP_V1.md §2-3).
//
// Três desfechos possíveis, decididos pela ativação (Company.activatedAt),
// nunca pelo status operacional atual:
//
//  1. Company.activatedAt == null e financeiramente incompleta → desistência
//     pré-ativação (Contrato §2): processada IMEDIATAMENTE, com a mesma
//     sequência fail-closed da PR #23 (Asaas cancelada antes da transição
//     local). Não há vigência iniciada, logo não há o que agendar.
//
//  2. Company.activatedAt == null mas financeiramente completa → Company
//     legada, sem marco de ativação confiável (cadastro anterior a esta
//     migração). Fail-closed: nenhuma operação externa, nenhuma mutação
//     local, nenhuma data inventada — bloqueia com erro estruturado exigindo
//     revisão humana antes de prosseguir.
//
//  3. Company.activatedAt != null → aviso de não renovação (Contrato §3):
//     só REGISTRA o pedido com a data de efeito já calculada
//     (src/lib/cancellationSchedule.ts). Nenhuma chamada à Asaas, nenhuma
//     mutação de Company/Commission acontece aqui — a sequência fail-closed
//     Asaas → estado local só roda no encerramento efetivo, na data de
//     efeito (ver src/lib/cancellationProcessor.ts e o cron correspondente).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!auth(req)) return NextResponse.json({ success: false, error: 'Não autorizado.' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Dados inválidos.', details: parsed.error.errors }, { status: 400 })
  }
  const d = parsed.data
  const requestedAt = d.requestedAt ?? new Date()

  const company = await prisma.company.findUnique({
    where: { id: params.id },
    include: {
      partner: true,
      payments: {
        where: { type: { in: ['implantacao', 'mensalidade'] } },
        select: PAYMENT_SELECT,
        orderBy: getPaymentOrderBy(),
      },
    },
  })
  if (!company) return NextResponse.json({ success: false, error: 'Empresa não encontrada.' }, { status: 404 })

  // Idempotente: repetir um cancelamento já concluído é sucesso, não erro —
  // não chama a Asaas de novo nem toca CancellationRequest/Commission.
  if (company.status === 'cancelled') {
    return NextResponse.json({ success: true, data: { alreadyCancelled: true } }, { status: 200 })
  }

  // ── Company sem ativação registrada ───────────────────────────────────
  if (company.activatedAt === null) {
    const { financiallyComplete } = deriveFinancialActivationState(company.status, company.payments)

    if (financiallyComplete) {
      // Legado: financeiramente completa, mas sem marco de ativação
      // confiável (cadastro anterior à regra de vigência de 12 meses — ver
      // docs/DECISIONS.md). Fail-closed: nenhuma operação externa, nenhuma
      // mutação local, nenhuma data inventada.
      return NextResponse.json(
        {
          success: false,
          error: 'Esta empresa não tem um marco de ativação confiável registrado (cadastro anterior à regra de vigência de 12 meses). O cálculo automático do encerramento foi bloqueado — é necessário revisão humana antes de prosseguir.',
          code: 'activation_unknown_requires_manual_review',
        },
        { status: 409 }
      )
    }

    // Desistência pré-ativação (Contrato §2) — processamento imediato,
    // mesma sequência fail-closed da PR #23: Asaas cancelada ANTES de
    // qualquer mutação local. A vigência de 12 meses ainda não começou, então
    // não há "aviso de não renovação" a agendar — a contratação simplesmente
    // não chegou a se efetivar.
    if (company.asaasSubscriptionId) {
      try {
        await cancelSubscription(company.asaasSubscriptionId)
      } catch (err) {
        console.error(`[CANCEL] Falha ao cancelar assinatura na Asaas (companyId=${params.id}, subscriptionId=${company.asaasSubscriptionId}):`, err)
        return NextResponse.json(
          {
            success: false,
            error: 'Não foi possível cancelar a assinatura na Asaas. O cancelamento NÃO foi concluído — tente novamente em alguns instantes ou fale com o time técnico.',
          },
          { status: 502 }
        )
      }
    }

    const transition = await prisma.company.updateMany({
      where: { id: params.id, status: { not: 'cancelled' } },
      data: {
        status: 'cancelled',
        ...(company.asaasSubscriptionId ? { subscriptionStatus: 'inactive' } : {}),
      },
    })
    if (transition.count === 0) {
      // Corrida: outra chamada concorrente já cancelou entre o check acima e
      // aqui — mesmo tratamento idempotente.
      return NextResponse.json({ success: true, data: { alreadyCancelled: true } }, { status: 200 })
    }

    const cancellationRequest = await prisma.cancellationRequest.create({
      data: {
        companyId:    params.id,
        requestedAt,
        reason:       d.reason,
        requestedBy:  d.requestedBy,
        handledBy:    d.handledBy ?? null,
        feeCents:     d.feeCents ?? null,
        pendingCents: d.pendingCents ?? null,
        notes:        d.notes ?? null,
        kind:         'pre_activation_withdrawal',
        effectiveAt:  requestedAt,
        status:       'processed',
        processedAt:  new Date(),
      },
    })

    // Comissões liberada/paga permanecem intocadas (sem clawback do já
    // pago) — só a em_carencia é estornada. Preservado por paridade com o
    // comportamento imediato já testado (PR #23); antes da ativação
    // nenhuma mensalidade legítima teria gerado comissão ainda em_carencia,
    // mas o estorno é mantido por segurança.
    await prisma.commission.updateMany({
      where: { companyId: params.id, status: 'em_carencia' },
      data: { status: 'estornada' },
    })

    const emailSent = { cliente: false, parceiro: false as boolean | null }
    try {
      await sendCancellationConfirmedClient({
        to: company.email, responsavel: company.responsavel, companyName: company.razaoSocial,
        requestedAt, reason: d.reason,
      })
      emailSent.cliente = true
    } catch (err) {
      console.error('[CANCEL] Falha ao enviar e-mail ao cliente:', err)
    }
    if (company.partner) {
      try {
        await notifyPartnerCompanyCancelled({
          to: company.partner.email, partnerName: company.partner.name, companyName: company.razaoSocial,
        })
        emailSent.parceiro = true
      } catch (err) {
        console.error('[CANCEL] Falha ao enviar e-mail ao parceiro:', err)
      }
    } else {
      emailSent.parceiro = null // não aplicável — empresa sem parceiro
    }

    return NextResponse.json({ success: true, data: { cancellationRequest, emailSent } }, { status: 201 })
  }

  // ── Company já ativada: aviso de não renovação (Contrato §3) ──────────
  // Só registra o pedido com a data de efeito já calculada — nenhuma chamada
  // à Asaas, nenhuma mutação de Company/Commission nesta requisição.
  let created: { cancellationRequest: Awaited<ReturnType<typeof prisma.cancellationRequest.create>> }
  try {
    created = await runSerializable(async tx => {
      const fresh = await tx.company.findUnique({
        where: { id: params.id },
        select: { status: true, activatedAt: true },
      })
      if (!fresh || fresh.status === 'cancelled' || !fresh.activatedAt) throw new AlreadyCancelledSignal()

      const pending = await tx.cancellationRequest.findFirst({
        where: { companyId: params.id, status: 'pending' },
      })
      if (pending) {
        throw new AlreadyRequestedSignal({
          id: pending.id, effectiveAt: pending.effectiveAt, requestedAt: pending.requestedAt, status: pending.status,
        })
      }

      const { effectiveAt } = computeCancellationEffectiveDate(fresh.activatedAt, requestedAt)

      const cancellationRequest = await tx.cancellationRequest.create({
        data: {
          companyId:    params.id,
          requestedAt,
          reason:       d.reason,
          requestedBy:  d.requestedBy,
          handledBy:    d.handledBy ?? null,
          feeCents:     d.feeCents ?? null,
          pendingCents: d.pendingCents ?? null,
          notes:        d.notes ?? null,
          kind:         'non_renewal_notice',
          activatedAtSnapshot: fresh.activatedAt,
          effectiveAt,
          status:       'pending',
        },
      })

      return { cancellationRequest }
    })
  } catch (err) {
    if (err instanceof AlreadyCancelledSignal) {
      return NextResponse.json({ success: true, data: { alreadyCancelled: true } }, { status: 200 })
    }
    if (err instanceof AlreadyRequestedSignal) {
      return NextResponse.json({ success: true, data: { alreadyRequested: true, cancellationRequest: err.existing } }, { status: 200 })
    }
    throw err
  }

  // parceiro sempre null aqui (não aplicável) — o parceiro só é notificado
  // no encerramento efetivo de fato (ver src/lib/cancellationProcessor.ts),
  // nunca no momento de um simples aviso com efeito futuro.
  const emailSent = { cliente: false, parceiro: null as boolean | null }
  try {
    await sendCancellationNoticeRegisteredClient({
      to: company.email, responsavel: company.responsavel, companyName: company.razaoSocial,
      requestedAt, reason: d.reason, effectiveAt: created.cancellationRequest.effectiveAt!,
    })
    emailSent.cliente = true
  } catch (err) {
    console.error('[CANCEL] Falha ao enviar e-mail de aviso registrado ao cliente:', err)
  }

  return NextResponse.json(
    { success: true, data: { cancellationRequest: created.cancellationRequest, emailSent } },
    { status: 201 }
  )
}
