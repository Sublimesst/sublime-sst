import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWelcomeEmail } from '@/lib/mailer'

export async function POST(req: NextRequest) {
  // Validate webhook token
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
      include: { company: true },
    })

    if (!dbPayment) {
      return NextResponse.json({ ok: true, note: 'payment not found in db' })
    }

    await prisma.payment.update({
      where: { id: dbPayment.id },
      data: {
        status: 'confirmed',
        paidAt: new Date(),
        billingType: payment.billingType ?? null,
      },
    })

    if (dbPayment.type === 'implantacao' && dbPayment.company.status === 'pending') {
      await prisma.company.update({
        where: { id: dbPayment.companyId },
        data: { status: 'active' },
      })

      await sendWelcomeEmail({
        to: dbPayment.company.email,
        companyName: dbPayment.company.razaoSocial,
        responsavel: dbPayment.company.responsavel,
        loginUrl: `${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://sublimesst.com'}/cliente/login`,
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
