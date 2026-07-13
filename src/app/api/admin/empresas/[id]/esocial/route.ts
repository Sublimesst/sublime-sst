import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { verifyAdminSecret } from '@/lib/adminAuth'

function auth(req: NextRequest) {
  return verifyAdminSecret(req.headers.get('x-admin-secret'))
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!auth(req)) return NextResponse.json({ success: false, error: 'Não autorizado.' }, { status: 401 })

  const logs = await prisma.esocialLog.findMany({
    where: { companyId: params.id },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ success: true, data: logs })
}

const createSchema = z.object({
  tipoEvento:  z.enum(['S-2210', 'S-2220', 'S-2240']),
  protocolo:   z.string().optional(),
  status:      z.enum(['pending', 'enviado', 'confirmado', 'erro']).default('pending'),
  descricao:   z.string().optional(),
  observacoes: z.string().optional(),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!auth(req)) return NextResponse.json({ success: false, error: 'Não autorizado.' }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Dados inválidos.' }, { status: 400 })

  const company = await prisma.company.findUnique({ where: { id: params.id } })
  if (!company) return NextResponse.json({ success: false, error: 'Empresa não encontrada.' }, { status: 404 })

  const d = parsed.data
  const log = await prisma.esocialLog.create({
    data: {
      companyId:  params.id,
      tipoEvento: d.tipoEvento,
      protocolo:  d.protocolo,
      status:     d.status,
      descricao:  d.descricao,
      observacoes: d.observacoes,
      enviadoEm:  d.status === 'enviado' || d.status === 'confirmado' ? new Date() : null,
      confirmadoEm: d.status === 'confirmado' ? new Date() : null,
    },
  })

  return NextResponse.json({ success: true, data: log }, { status: 201 })
}
