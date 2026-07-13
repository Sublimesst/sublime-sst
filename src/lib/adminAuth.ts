import { timingSafeEqual } from 'crypto'

// Comparação de tempo constante do ADMIN_SECRET — mesmo idioma já usado no
// projeto para o token do webhook Asaas e para a assinatura HMAC do OTP/sessão
// (timingSafeEqual exige buffers do mesmo tamanho, por isso o length check
// vem antes; nunca lança exceção por segredo ausente ou tamanho diferente).
export function verifyAdminSecret(candidate: string | null | undefined): boolean {
  const expected = process.env.ADMIN_SECRET ?? ''
  if (!expected || !candidate) return false
  const a = Buffer.from(candidate)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}
