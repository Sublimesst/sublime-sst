import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const schema = z.object({
  tipoDocumento: z.enum(['pgr', 'pcmso', 'declaracao', 'os_epi', 'ltcat', 'contrato']),
  nomeDocumento: z.string().optional(),
  acao:          z.enum(['view', 'download']).default('download'),
})

function getClientSession(req: NextRequest) {
  const raw = req.cookies.get('sublime_client')?.value
  if (!raw) return null
  try {
    return JSON.parse(Buffer.from(raw, 'base64').toString('utf-8')) as { companyId?: string }
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const session = getClientSession(req)
  if (!session?.companyId) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? null
  const userAgent = req.headers.get('user-agent') ?? null

  await prisma.documentAccessLog.create({
    data: {
      companyId:     session.companyId,
      tipoDocumento: parsed.data.tipoDocumento,
      nomeDocumento: parsed.data.nomeDocumento,
      acao:          parsed.data.acao,
      ip,
      userAgent,
    },
  })

  return NextResponse.json({ success: true })
}
