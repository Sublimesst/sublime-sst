import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://sublimesst.com'

  if (!token) {
    return NextResponse.redirect(`${base}/parceiro/login?error=token_missing`)
  }

  const session = await prisma.partnerSession.findUnique({ where: { token } })

  if (!session || session.usedAt || session.expiresAt < new Date()) {
    return NextResponse.redirect(`${base}/parceiro/login?error=token_invalid`)
  }

  await prisma.partnerSession.update({ where: { token }, data: { usedAt: new Date() } })

  const cookieValue = Buffer.from(
    JSON.stringify({ partnerId: session.partnerId, email: session.email, issuedAt: Date.now() })
  ).toString('base64')

  const response = NextResponse.redirect(`${base}/parceiro/dashboard`)
  response.cookies.set('sublime_partner', cookieValue, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
  return response
}
