import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getClientSession } from '@/lib/clientAuth'

const schema = z.object({
  numFuncionarios: z.coerce.number().min(1).max(20),
  cargos: z.string().optional(),
  turnoTrabalho: z.string().optional(),
  dataUltimoPcmso: z.string().optional(),
  possuiPgr: z.boolean().optional(),
  observacoes: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const session = getClientSession(req)
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos.', details: parsed.error.errors }, { status: 400 })
  }

  const data = parsed.data

  await prisma.onboardingData.upsert({
    where: { companyId: session.companyId },
    update: { ...data },
    create: { companyId: session.companyId, ...data },
  })

  // Mark company as onboarding complete
  await prisma.company.update({
    where: { id: session.companyId },
    data: { status: 'active' },
  })

  return NextResponse.json({ success: true })
}
