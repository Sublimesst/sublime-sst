import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWelcomeEmail } from '@/lib/mailer'
import { generateContractPdf } from '@/lib/contractPdf'
import { CONTRACT_VERSION } from '@/lib/pricing'

export async function POST(req: NextRequest) {
  const token = req.headers.get('asaas-access-token')
  if (token !== process.env.ASAAS_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body?.event || !body?.payment) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const { event, payment } = body

  if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
    const dbPayment = await prisma.payment.findFirst({
      where: { asaasId: payment.id },
      include: { company: { include: { lead: true } } },
    })

    if (!dbPayment) {
      return NextResponse.json({ ok: true, note: 'payment not found in db' })
    }

    // Idempotência: evento já processado — não reprocessa nem reenvia e-mail
    if (dbPayment.status === 'confirmed') {
      return NextResponse.json({ ok: true, note: 'already processed' })
    }

    await prisma.payment.update({
      where: { id: dbPayment.id },
      data: {
        status:      'confirmed',
        paidAt:      new Date(),
        billingType: payment.billingType ?? null,
      },
    })

    if (dbPayment.type === 'implantacao' && dbPayment.company.status === 'pending') {
      await prisma.company.update({
        where: { id: dbPayment.companyId },
        data: { status: 'active' },
      })

      const co = dbPayment.company
      const loginUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://sublimesst.com'}/cliente/login`

      let contractPdf: Buffer | undefined
      try {
        contractPdf = await generateContractPdf({
          razaoSocial:          co.razaoSocial,
          cnpj:                 co.cnpj,
          responsavel:          co.responsavel,
          endereco:             co.endereco,
          cidade:               co.cidade,
          estado:               co.estado,
          cep:                  co.cep,
          numFuncionarios:      co.numFuncionarios,
          email:                co.email,
          planType:             co.planType ?? 'essencial',
          implantacaoValor:     co.implantacaoValor,
          implantacaoPromo:     co.implantacaoPromo,
          contractAcceptedAt:   co.contractAcceptedAt ?? new Date(),
          contractAcceptanceIp: co.contractAcceptanceIp ?? 'não registrado',
          contractAcceptanceUa: co.contractAcceptanceUa,
          contractVersion:      co.contractVersion ?? CONTRACT_VERSION,
        })
      } catch (err) {
        console.error('[WEBHOOK] Falha ao gerar PDF do contrato:', err)
      }

      await sendWelcomeEmail({
        to:          co.email,
        companyName: co.razaoSocial,
        responsavel: co.responsavel,
        loginUrl,
        planType:    co.planType ?? undefined,
        contractPdf,
      }).catch(console.error)
    }
  }

  if (event === 'PAYMENT_OVERDUE' || event === 'PAYMENT_REFUNDED') {
    await prisma.payment.updateMany({
      where: { asaasId: payment.id },
      data: { status: event === 'PAYMENT_OVERDUE' ? 'failed' : 'refunded' },
    })
  }

  return NextResponse.json({ ok: true })
}
