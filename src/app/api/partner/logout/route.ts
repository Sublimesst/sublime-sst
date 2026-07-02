import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://sublimesst.com'}/parceiro/login`
  )
  response.cookies.delete('sublime_partner')
  return response
}
