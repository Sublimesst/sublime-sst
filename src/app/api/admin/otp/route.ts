import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { rateLimitByKey, rateLimitResponse } from '@/lib/rateLimit'

// OTP stateless: o código é assinado (HMAC-SHA256 com ADMIN_SECRET) e o token
// assinado viaja num cookie HttpOnly. Isso funciona entre instâncias serverless
// da Vercel — ao contrário de um Map em memória, que some a cada invocação.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? process.env.EMAIL_NOTIFY ?? 'contato@sublimesst.com'
const OTP_TTL_MS = 5 * 60 * 1000 // 5 minutos
const COOKIE = 'admin_otp'

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// token = "<expiresAt>.<hmac(otp + expiresAt)>"
function signToken(otp: string, expiresAt: number, secret: string) {
  const sig = createHmac('sha256', secret).update(`${otp}.${expiresAt}`).digest('hex')
  return `${expiresAt}.${sig}`
}

function verifyToken(token: string, otp: string, secret: string): boolean {
  const dot = token.indexOf('.')
  if (dot < 0) return false
  const expiresAt = Number(token.slice(0, dot))
  const sig = token.slice(dot + 1)
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false
  const expected = createHmac('sha256', secret).update(`${otp}.${expiresAt}`).digest('hex')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

async function sendOtpEmail(otp: string) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[ADMIN OTP] Nenhum provedor configurado — OTP: ${otp}`)
    return
  }
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? 'Sublime SST <onboarding@resend.dev>',
      to: ADMIN_EMAIL,
      subject: `[Admin] Código de acesso: ${otp}`,
      html: `<p>Seu código de acesso temporário ao admin Sublime SST é:</p>
             <h2 style="letter-spacing:6px;font-family:monospace">${otp}</h2>
             <p>Expira em 5 minutos. Não compartilhe este código.</p>`,
    }),
  })
}

// POST /api/admin/otp — solicita OTP (exige ADMIN_SECRET correto)
export async function POST(req: NextRequest) {
  if (!rateLimitByKey(`admin-otp:${req.headers.get('x-forwarded-for') ?? 'x'}`, 5, 60_000)) {
    return rateLimitResponse()
  }

  const secretEnv = process.env.ADMIN_SECRET
  if (!secretEnv) {
    return NextResponse.json({ success: false, error: 'ADMIN_SECRET não configurado no servidor.' }, { status: 500 })
  }

  const body = await req.json().catch(() => ({}))
  const { secret } = body as { secret?: string }

  if (!secret || secret !== secretEnv) {
    return NextResponse.json({ success: false, error: 'Credencial inválida.' }, { status: 401 })
  }

  const otp = generateOtp()
  const expiresAt = Date.now() + OTP_TTL_MS
  const token = signToken(otp, expiresAt, secretEnv)

  await sendOtpEmail(otp).catch(err => console.error('[ADMIN OTP] send error:', err))

  const res = NextResponse.json({
    success: true,
    sentTo: ADMIN_EMAIL.replace(/(?<=.{3}).(?=.*@)/g, '*'),
  })
  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: OTP_TTL_MS / 1000,
  })
  return res
}

// PUT /api/admin/otp — verifica OTP
export async function PUT(req: NextRequest) {
  if (!rateLimitByKey(`admin-otp-verify:${req.headers.get('x-forwarded-for') ?? 'x'}`, 10, 60_000)) {
    return rateLimitResponse()
  }

  const secretEnv = process.env.ADMIN_SECRET
  if (!secretEnv) {
    return NextResponse.json({ success: false, error: 'ADMIN_SECRET não configurado no servidor.' }, { status: 500 })
  }

  const body = await req.json().catch(() => ({}))
  const { otp } = body as { otp?: string }

  const token = req.cookies.get(COOKIE)?.value
  if (!token) {
    return NextResponse.json({ success: false, error: 'Nenhum código ativo. Solicite novamente.' }, { status: 400 })
  }
  if (!otp || !verifyToken(token, otp, secretEnv)) {
    return NextResponse.json({ success: false, error: 'Código incorreto ou expirado.' }, { status: 400 })
  }

  // OTP de uso único: limpa o cookie ao validar
  const res = NextResponse.json({ success: true })
  res.cookies.set(COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
  return res
}
