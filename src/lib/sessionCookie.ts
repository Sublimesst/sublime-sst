import { createHmac, timingSafeEqual } from 'crypto'

// Cookies de sessão (cliente/parceiro) assinados com HMAC-SHA256, no mesmo
// padrão stateless do OTP do admin: token = "<payload-base64url>.<hmac-hex>".
// Cookies antigos (base64 puro, sem o separador ".") falham na verificação e
// forçam novo login — não há migração suave (sessões de teste, sem usuários reais).
const SECRET = process.env.SESSION_SECRET ?? process.env.ADMIN_SECRET

function sign(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('hex')
}

export function signSessionCookie(payload: Record<string, unknown>, maxAgeSeconds: number): string {
  if (!SECRET) throw new Error('SESSION_SECRET/ADMIN_SECRET não configurado no servidor.')
  const expiresAt = Date.now() + maxAgeSeconds * 1000
  const encoded = Buffer.from(JSON.stringify({ ...payload, expiresAt }), 'utf-8').toString('base64url')
  return `${encoded}.${sign(encoded, SECRET)}`
}

export function verifySessionCookie<T extends object>(token: string | undefined | null): T | null {
  if (!token || !SECRET) return null
  const dot = token.indexOf('.')
  if (dot < 0) return null

  const encoded = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const expected = sign(encoded, SECRET)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8')) as T & { expiresAt?: number }
    if (typeof payload.expiresAt === 'number' && Date.now() > payload.expiresAt) return null
    return payload
  } catch {
    return null
  }
}
