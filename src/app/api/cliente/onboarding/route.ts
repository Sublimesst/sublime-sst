import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getClientSession } from '@/lib/clientAuth'
import { notifyOnboardingSubmitted } from '@/lib/mailer'

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

  // D2: onboarding preenchido inicia a PRODUÇÃO dos documentos.
  // Transição condicional: só onboarding_pending avança (resubmissão de uma
  // empresa já em produção/ativa não regride o pipeline).
  await prisma.company.updateMany({
    where: { id: session.companyId, status: { in: ['pending', 'onboarding_pending'] } },
    data: { status: 'in_production' },
  })
  const company = await prisma.company.findUniqueOrThrow({ where: { id: session.companyId } })

  // Equipe precisa saber que a produção pode começar (await: serverless)
  await notifyOnboardingSubmitted({
    companyName:     company.razaoSocial,
    cnpj:            company.cnpj,
    numFuncionarios: data.numFuncionarios,
    cargos:          data.cargos,
  })

  return NextResponse.json({ success: true })
}
