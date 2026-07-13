import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { sendCancellationConfirmedClient, notifyPartnerCompanyCancelled } from '@/lib/mailer'
import { verifyAdminSecret } from '@/lib/adminAuth'

// NOTA OPERACIONAL (P0): esta rota não cancela nada na Asaas — não existe
// assinatura recorrente via API ainda (E4). Depois de registrar aqui, o
// admin precisa cancelar a cobrança manualmente no painel da Asaas.
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
  if (company.status === 'cancelled') {
    return NextResponse.json({ success: false, error: 'Empresa já está cancelada.' }, { status: 409 })
  }

  const d = parsed.data

  // Idempotência: só a primeira chamada consegue transitar de "não cancelado" para "cancelled".
  const transition = await prisma.company.updateMany({
    where: { id: params.id, status: { not: 'cancelled' } },
    data: { status: 'cancelled' },
  })
  if (transition.count === 0) {
    return NextResponse.json({ success: false, error: 'Empresa já está cancelada.' }, { status: 409 })
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
