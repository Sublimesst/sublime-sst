import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit'
import { sendMagicLink } from '@/lib/mailer'
import crypto from 'crypto'

const schema = z.object({ email: z.string().email() })

export async function POST(req: NextRequest) {
  if (!rateLimit(req, 3, 60_000)) return rateLimitResponse()

  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 })
  }

  const { email } = parsed.data

  const company = await prisma.company.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    orderBy: { createdAt: 'desc' },
  })

  // Always return 200 to avoid email enumeration
  if (!company) {
    return NextResponse.json({ success: true })
  }

  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 min

  await prisma.clientSession.create({
    data: { companyId: company.id, token, email, expiresAt },
  })

  const link = `${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://sublimesst.com'}/cliente/auth/verify?token=${token}`
  await sendMagicLink({ to: email, companyName: company.razaoSocial, link }).catch(console.error)

  return NextResponse.json({ success: true })
}
