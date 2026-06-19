import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendOnboardingReminder } from '@/lib/mailer'

// Called by Vercel Cron or external scheduler
// vercel.json: { "crons": [{ "path": "/api/cron/remind-onboarding", "schedule": "0 10 * * *" }] }
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')
  if (token !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Find companies with confirmed payment but no onboarding, notified < 2 times
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const since72h = new Date(Date.now() - 72 * 60 * 60 * 1000)

  const companies = await prisma.company.findMany({
    where: {
      status: 'active',
      onboardingData: null,
      payments: {
        some: { type: 'implantacao', status: 'confirmed', paidAt: { lt: since24h } },
      },
    },
    include: { payments: { where: { type: 'implantacao', status: 'confirmed' } } },
  })

  let sent = 0
  const loginUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://sublimesst.com'}/cliente/login`

  for (const company of companies) {
    const paidAt = company.payments[0]?.paidAt
    if (!paidAt) continue

    // Only remind once at 24h and once at 72h
    const hoursSincePaid = (Date.now() - paidAt.getTime()) / (1000 * 60 * 60)
    if (hoursSincePaid < 24 || hoursSincePaid > 96) continue

    await sendOnboardingReminder({
      to: company.email,
      responsavel: company.responsavel,
      companyName: company.razaoSocial,
      loginUrl,
    }).catch(console.error)
    sent++
  }

  return NextResponse.json({ ok: true, sent })
}
