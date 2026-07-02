import { NextRequest, NextResponse } from 'next/server'
import { rateLimitByKey, rateLimitResponse } from '@/lib/rateLimit'

// In-memory OTP store — resets on server restart (acceptable for low-traffic admin)
// { email: { otp, expiresAt, attempts } }
const otpStore = new Map<string, { otp: string; expiresAt: number; attempts: number }>()

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? process.env.EMAIL_NOTIFY ?? 'contato@sublimesst.com'
const OTP_TTL_MS = 5 * 60 * 1000 // 5 minutes
const MAX_ATTEMPTS = 5

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString()
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

// POST /api/admin/otp — request OTP (requires correct ADMIN_SECRET in body)
export async function POST(req: NextRequest) {
  if (!rateLimitByKey(`admin-otp:${req.headers.get('x-forwarded-for') ?? 'x'}`, 5, 60_000)) {
    return rateLimitResponse()
  }

  const body = await req.json().catch(() => ({}))
  const { secret } = body as { secret?: string }

  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ success: false, error: 'Credencial inválida.' }, { status: 401 })
  }

  const otp = generateOtp()
  otpStore.set('admin', { otp, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 })

  await sendOtpEmail(otp).catch(err => console.error('[ADMIN OTP] send error:', err))

  return NextResponse.json({ success: true, sentTo: ADMIN_EMAIL.replace(/(?<=.{3}).(?=.*@)/g, '*') })
}

// PUT /api/admin/otp — verify OTP
export async function PUT(req: NextRequest) {
  if (!rateLimitByKey(`admin-otp-verify:${req.headers.get('x-forwarded-for') ?? 'x'}`, 10, 60_000)) {
    return rateLimitResponse()
  }

  const body = await req.json().catch(() => ({}))
  const { otp } = body as { otp?: string }

  const entry = otpStore.get('admin')
  if (!entry) return NextResponse.json({ success: false, error: 'Nenhum código ativo. Solicite novamente.' }, { status: 400 })
  if (Date.now() > entry.expiresAt) {
    otpStore.delete('admin')
    return NextResponse.json({ success: false, error: 'Código expirado. Solicite um novo.' }, { status: 400 })
  }

  entry.attempts++
  if (entry.attempts > MAX_ATTEMPTS) {
    otpStore.delete('admin')
    return NextResponse.json({ success: false, error: 'Muitas tentativas. Solicite um novo código.' }, { status: 429 })
  }

  if (otp !== entry.otp) {
    return NextResponse.json({ success: false, error: 'Código incorreto.' }, { status: 400 })
  }

  otpStore.delete('admin')
  return NextResponse.json({ success: true })
}
