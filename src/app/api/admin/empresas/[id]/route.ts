import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

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
  return req.headers.get('x-admin-secret') === process.env.ADMIN_SECRET
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!auth(req)) return NextResponse.json({ success: false, error: 'Não autorizado.' }, { status: 401 })

  const company = await prisma.company.findUnique({
    where: { id: params.id },
    include: { plan: true, payments: { where: { type: 'implantacao' }, take: 1 } },
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

  const company = await prisma.company.findUnique({ where: { id: params.id } })
  if (!company) return NextResponse.json({ success: false, error: 'Empresa não encontrada.' }, { status: 404 })

  const updated = await prisma.company.update({
    where: { id: params.id },
    data: {
      ...(status ? { status } : {}),
      ...(reviewedBy !== undefined ? { reviewedBy, reviewedAt: reviewedBy ? new Date() : null } : {}),
    },
  })

  return NextResponse.json({ success: true, data: { id: updated.id, status: updated.status, reviewedBy: updated.reviewedBy } })
}
