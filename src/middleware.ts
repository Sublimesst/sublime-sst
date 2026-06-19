import { NextRequest, NextResponse } from 'next/server'

const PROTECTED = ['/cliente/dashboard', '/cliente/onboarding']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isProtected = PROTECTED.some((p) => pathname.startsWith(p))

  if (isProtected) {
    const cookie = req.cookies.get('sublime_client')?.value
    if (!cookie) {
      const loginUrl = req.nextUrl.clone()
      loginUrl.pathname = '/cliente/login'
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/cliente/dashboard/:path*', '/cliente/onboarding/:path*'],
}
