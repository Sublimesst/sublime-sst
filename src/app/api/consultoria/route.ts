import { NextRequest, NextResponse } from 'next/server'
import { notifyConsultancyRequest } from '@/lib/mailer'
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  if (!rateLimit(req, 5, 60_000)) return rateLimitResponse()

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const { name, company, email, whatsapp, description } = body as Record<string, string>

  if (!name?.trim() || !company?.trim() || !email?.trim() || !whatsapp?.trim() || !description?.trim()) {
    return NextResponse.json({ error: 'Todos os campos são obrigatórios' }, { status: 400 })
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'E-mail inválido' }, { status: 400 })
  }

  await notifyConsultancyRequest({ name, company, email, whatsapp, description })

  return NextResponse.json({ ok: true })
}
