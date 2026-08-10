import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { verifyAdminSecret } from '@/lib/adminAuth'

const VALID_STATUSES = [
  'pending',
  'onboarding_pending',
  'in_production',
  'in_review',
  'documents_delivered',
  'active',
  'overdue',
  'suspended',
  'migrating',
  'cancelled',
] as const

const patchSchema = z.object({
  status: z.enum(VALID_STATUSES).optional(),
  reviewedBy: z.string().optional(),
})

function auth(req: NextRequest) {
  return verifyAdminSecret(req.headers.get('x-admin-secret'))
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!auth(req)) return NextResponse.json({ success: false, error: 'Não autorizado.' }, { status: 401 })

  const company = await prisma.company.findUnique({
    where: { id: params.id },
    include: {
      plan: true,
      payments: { where: { type: 'implantacao' }, take: 1 },
      cancellationRequests: { orderBy: { createdAt: 'desc' } },
      partner: { select: { id: true, name: true, office: true, code: true } },
      onboardingData: {
        select: {
          status: true,
          numFuncionarios: true,
          cargos: true,
          turnoTrabalho: true,
          dataUltimoPcmso: true,
          possuiPgr: true,
          observacoes: true,
          submittedAt: true,
        },
      },
    },
  })
  if (!company) return NextResponse.json({ success: false, error: 'Empresa não encontrada.' }, { status: 404 })

  return NextResponse.json({ success: true, data: company })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!auth(req)) return NextResponse.json({ success: false, error: 'Não autorizado.' }, { status: 401 })

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Dados inválidos.', details: parsed.error.errors }, { status: 400 })

  const { status, reviewedBy } = parsed.data

  if (status === 'cancelled') {
    return NextResponse.json(
      { success: false, error: 'Use o fluxo dedicado de cancelamento (bloco "Cancelamento do contrato" na página da empresa) para cancelar. Esta rota genérica não registra motivo, não estorna comissão nem envia e-mails.' },
      { status: 400 }
    )
  }

  const company = await prisma.company.findUnique({ where: { id: params.id } })
  if (!company) return NextResponse.json({ success: false, error: 'Empresa não encontrada.' }, { status: 404 })

  if (status === 'documents_delivered' && !company.reviewedBy && !reviewedBy) {
    return NextResponse.json(
      { success: false, error: 'É obrigatório informar o técnico responsável (reviewedBy) antes de marcar documentos como entregues.' },
      { status: 422 }
    )
  }

  const enteringDocumentsDelivered =
    status === 'documents_delivered' && company.status !== 'documents_delivered' && !company.documentsDeliveredAt

  const updated = await prisma.company.update({
    where: { id: params.id },
    data: {
      ...(status ? { status } : {}),
      ...(reviewedBy !== undefined ? { reviewedBy, reviewedAt: reviewedBy ? new Date() : null } : {}),
      ...(enteringDocumentsDelivered ? { documentsDeliveredAt: new Date() } : {}),
    },
  })

  return NextResponse.json({ success: true, data: { id: updated.id, status: updated.status, reviewedBy: updated.reviewedBy } })
}
