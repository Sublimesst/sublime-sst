import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPaymentReminder } from '@/lib/mailer'

// Called daily to remind companies with pending implantacao payment
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')
  if (token !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const since48h = new Date(Date.now() - 48 * 60 * 60 * 1000)

  const pendingPayments = await prisma.payment.findMany({
    where: {
      type: 'implantacao',
      status: 'pending',
      createdAt: { lt: since48h },
    },
    include: { company: true },
  })

  let sent = 0
  for (const payment of pendingPayments) {
    if (!payment.checkoutUrl) continue
    await sendPaymentReminder({
      to: payment.company.email,
      responsavel: payment.company.responsavel,
      companyName: payment.company.razaoSocial,
      checkoutUrl: payment.checkoutUrl,
      amount: payment.amount,
    }).catch(console.error)
    sent++
  }

  return NextResponse.json({ ok: true, sent })
}
