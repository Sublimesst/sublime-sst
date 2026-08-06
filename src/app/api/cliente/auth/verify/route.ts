import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signSessionCookie } from '@/lib/sessionCookie'

const MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 dias

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://sublimesst.com'

  if (!token) {
    return NextResponse.redirect(`${base}/cliente/login?error=token_missing`)
  }

  const session = await prisma.clientSession.findUnique({ where: { token } })

  if (!session || session.usedAt || session.expiresAt < new Date()) {
    return NextResponse.redirect(`${base}/cliente/login?error=token_invalid`)
  }

  await prisma.clientSession.update({ where: { token }, data: { usedAt: new Date() } })

  // Cookie de sessão assinado com HMAC (ver src/lib/sessionCookie.ts). O
  // sessionId embutido é o id (cuid) da própria ClientSession, não o token
  // bruto — permite ao DocumentAccessLog distinguir este acesso de um acesso
  // administrativo (ver src/lib/clientAuth.ts).
  const cookieValue = signSessionCookie(
    { companyId: session.companyId, email: session.email, issuedAt: Date.now(), sessionId: session.id },
    MAX_AGE_SECONDS
  )

  const response = NextResponse.redirect(`${base}/cliente/dashboard`)
  response.cookies.set('sublime_client', cookieValue, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: MAX_AGE_SECONDS,
    path: '/',
  })
  return response
}
