import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getClientSession } from '@/lib/clientAuth'
import { notifyOnboardingSubmitted } from '@/lib/mailer'
import { deriveFinancialActivationState, PAYMENT_SELECT, getPaymentOrderBy } from '@/lib/paymentPresentation'

const schema = z.object({
  numFuncionarios: z.coerce.number().min(1).max(20),
  cargos: z.string().optional(),
  turnoTrabalho: z.string().optional(),
  dataUltimoPcmso: z.string().optional(),
  possuiPgr: z.boolean().optional(),
  observacoes: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const company = await getClientSession(req)
  if (!company) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  // Gate financeiro (Etapa 2C.1B) — nenhuma escrita acontece antes disto.
  // Consulta só os Payments desta Company (isolamento por company.id, nunca
  // por dado vindo do cliente); nunca chama a Asaas.
  const payments = await prisma.payment.findMany({
    where: { companyId: company.id, type: { in: ['implantacao', 'mensalidade'] } },
    select: PAYMENT_SELECT,
    orderBy: getPaymentOrderBy(),
  })
  const financialState = deriveFinancialActivationState(company.status, payments)
  if (!financialState.financiallyComplete) {
    return NextResponse.json(
      {
        success: false,
        code: 'financial_activation_required',
        error: 'O preenchimento dos dados será liberado após a confirmação da implantação e da primeira mensalidade.',
      },
      { status: 409 }
    )
  }

  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos.', details: parsed.error.errors }, { status: 400 })
  }

  const data = parsed.data

  await prisma.onboardingData.upsert({
    where: { companyId: company.id },
    update: { ...data },
    create: { companyId: company.id, ...data },
  })

  // D2: onboarding preenchido inicia a PRODUÇÃO dos documentos.
  // Transição condicional: só onboarding_pending avança (resubmissão de uma
  // empresa já em produção/ativa não regride o pipeline).
  await prisma.company.updateMany({
    where: { id: company.id, status: { in: ['pending', 'onboarding_pending'] } },
    data: { status: 'in_production' },
  })

  // Equipe precisa saber que a produção pode começar (await: serverless)
  await notifyOnboardingSubmitted({
    companyName:     company.razaoSocial,
    cnpj:            company.cnpj,
    numFuncionarios: data.numFuncionarios,
    cargos:          data.cargos,
  })

  return NextResponse.json({ success: true })
}
