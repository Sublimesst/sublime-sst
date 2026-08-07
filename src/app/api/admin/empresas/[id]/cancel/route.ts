import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { sendCancellationConfirmedClient, notifyPartnerCompanyCancelled } from '@/lib/mailer'
import { verifyAdminSecret } from '@/lib/adminAuth'
import { cancelSubscription } from '@/lib/asaas'

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

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!auth(req)) return NextResponse.json({ success: false, error: 'Não autorizado.' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Dados inválidos.', details: parsed.error.errors }, { status: 400 })
  }

  const company = await prisma.company.findUnique({
    where: { id: params.id },
    include: { partner: true },
  })
  if (!company) return NextResponse.json({ success: false, error: 'Empresa não encontrada.' }, { status: 404 })
  // Idempotente: repetir um cancelamento já concluído é sucesso, não erro —
  // não chama a Asaas de novo (já foi cancelada da vez certa) nem toca
  // CancellationRequest/Payment/Commission.
  if (company.status === 'cancelled') {
    return NextResponse.json({ success: true, data: { alreadyCancelled: true } }, { status: 200 })
  }

  // Cancela a assinatura recorrente na Asaas ANTES de qualquer alteração local.
  // Se isso falhar, a Company NÃO pode virar 'cancelled' — sem esse cancelamento,
  // a assinatura continuaria gerando cobrança real sem controle local nenhum.
  // Empresa sem assinatura (nunca criada) segue direto pro fluxo local, como já
  // era; em modo mock, cancelSubscription() já é um no-op seguro internamente.
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

  const d = parsed.data

  // Idempotência: só a primeira chamada consegue transitar de "não cancelado" para "cancelled".
  // subscriptionStatus só é tocado quando havia assinatura (asaasSubscriptionId) — o
  // cancelSubscription() acima já teve sucesso (real ou alreadyCancelled) neste ponto,
  // então a assinatura está garantidamente encerrada na Asaas. Empresa sem assinatura
  // nunca criada preserva subscriptionStatus como está (normalmente null) — não inventa
  // um histórico de assinatura que nunca existiu.
  const transition = await prisma.company.updateMany({
    where: { id: params.id, status: { not: 'cancelled' } },
    data: {
      status: 'cancelled',
      ...(company.asaasSubscriptionId ? { subscriptionStatus: 'inactive' } : {}),
    },
  })
  if (transition.count === 0) {
    // Corrida: outra chamada concorrente já cancelou entre o check acima e
    // aqui — mesmo tratamento idempotente (a Asaas já foi cancelada por essa
    // outra chamada, ou nunca existiu).
    return NextResponse.json({ success: true, data: { alreadyCancelled: true } }, { status: 200 })
  }

  const requestedAt = d.requestedAt ?? new Date()

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
    },
  })

  // Comissões liberada/paga permanecem intocadas (sem clawback do já pago) —
  // só a em_carencia (ainda não liberada) é estornada.
  await prisma.commission.updateMany({
    where: { companyId: params.id, status: 'em_carencia' },
    data: { status: 'estornada' },
  })

  const emailSent = { cliente: false, parceiro: false as boolean | null }

  try {
    await sendCancellationConfirmedClient({
      to:          company.email,
      responsavel: company.responsavel,
      companyName: company.razaoSocial,
      requestedAt,
      reason:      d.reason,
    })
    emailSent.cliente = true
  } catch (err) {
    console.error('[CANCEL] Falha ao enviar e-mail ao cliente:', err)
  }

  if (company.partner) {
    try {
      await notifyPartnerCompanyCancelled({
        to:          company.partner.email,
        partnerName: company.partner.name,
        companyName: company.razaoSocial,
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
