// ═══════════════════════════════════════════════════════════
// SUBLIME SST — Sessão de continuação da contratação (Etapa 2A)
// Cookie próprio, distinto do sublime_client (Portal Cliente) — usado só
// para consultar o estado dos dois pagamentos logo após o cadastro, antes de
// existir uma sessão de login completa. Reaproveita a assinatura HMAC de
// sessionCookie.ts (mesmo SESSION_SECRET, sem variável de ambiente nova) —
// a separação de finalidade é feita dentro do próprio payload assinado
// (campo `purpose`), então um token de outro propósito nunca passa aqui: a
// assinatura cobre o payload inteiro, incluindo `purpose` e `v`.
// ═══════════════════════════════════════════════════════════

import { signSessionCookie, verifySessionCookie } from './sessionCookie'

export const CHECKOUT_SESSION_COOKIE = 'sublime_checkout_continuation'
export const CHECKOUT_SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60 // 7 dias — única fonte da validade (token e cookie)
const PURPOSE = 'checkout-continuation'
const VERSION = 1
const CLOCK_SKEW_TOLERANCE_MS = 5_000

interface CheckoutSessionPayload {
  v: number
  purpose: string
  companyId: string
  issuedAt: number
  expiresAt?: number
}

// Emite o valor do cookie (a chamada define nome/flags no NextResponse) —
// nunca contém nome, CNPJ, e-mail ou qualquer dado pessoal, só o companyId
// interno (não é PII) e metadados de finalidade/versão/emissão.
export function issueCheckoutSessionToken(companyId: string): string {
  return signSessionCookie(
    { v: VERSION, purpose: PURPOSE, companyId, issuedAt: Date.now() },
    CHECKOUT_SESSION_MAX_AGE_SECONDS
  )
}

// Verifica assinatura (timing-safe, herdado de sessionCookie.ts), expiração,
// versão, finalidade e consistência temporal do payload. Qualquer divergência
// retorna null — nunca lança.
export function verifyCheckoutSessionToken(raw: string | undefined | null): { companyId: string } | null {
  const payload = verifySessionCookie<CheckoutSessionPayload>(raw)
  if (!payload) return null
  if (payload.v !== VERSION) return null
  if (payload.purpose !== PURPOSE) return null
  if (typeof payload.companyId !== 'string' || payload.companyId.length === 0) return null

  if (!Number.isInteger(payload.issuedAt)) return null
  if (!Number.isInteger(payload.expiresAt)) return null
  const { issuedAt, expiresAt } = payload as { issuedAt: number; expiresAt: number }
  if (issuedAt > Date.now() + CLOCK_SKEW_TOLERANCE_MS) return null
  if (expiresAt <= issuedAt) return null
  if (expiresAt - issuedAt > CHECKOUT_SESSION_MAX_AGE_SECONDS * 1000) return null

  return { companyId: payload.companyId }
}
