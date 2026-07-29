import { describe, it, expect } from 'vitest'

// SECRET em sessionCookie.ts é uma const de módulo avaliada no import — por
// isso a env var precisa existir ANTES do import (beforeAll roda tarde demais).
process.env.SESSION_SECRET = 'test-secret-nao-real-0123456789'

const { issueCheckoutSessionToken, verifyCheckoutSessionToken } = await import('./checkoutSession')
const { signSessionCookie } = await import('./sessionCookie')

describe('checkoutSession', () => {
  it('sessão válida é aceita e devolve o companyId', () => {
    const token = issueCheckoutSessionToken('company-abc')
    const result = verifyCheckoutSessionToken(token)
    expect(result).toEqual({ companyId: 'company-abc' })
  })

  it('assinatura adulterada é rejeitada', () => {
    const token = issueCheckoutSessionToken('company-abc')
    const tampered = token.slice(0, -2) + 'zz'
    expect(verifyCheckoutSessionToken(tampered)).toBeNull()
  })

  it('sessão expirada é rejeitada', () => {
    const token = signSessionCookie(
      { v: 1, purpose: 'checkout-continuation', companyId: 'company-abc', issuedAt: Date.now() - 1000 },
      -1 // maxAge negativo → expiresAt no passado
    )
    expect(verifyCheckoutSessionToken(token)).toBeNull()
  })

  it('purpose incorreto é rejeitado', () => {
    const token = signSessionCookie(
      { v: 1, purpose: 'outro-proposito', companyId: 'company-abc', issuedAt: Date.now() },
      3600
    )
    expect(verifyCheckoutSessionToken(token)).toBeNull()
  })

  it('versão incorreta é rejeitada', () => {
    const token = signSessionCookie(
      { v: 2, purpose: 'checkout-continuation', companyId: 'company-abc', issuedAt: Date.now() },
      3600
    )
    expect(verifyCheckoutSessionToken(token)).toBeNull()
  })

  it('isolamento entre empresas — cada token só resolve o próprio companyId', () => {
    const tokenA = issueCheckoutSessionToken('company-A')
    const tokenB = issueCheckoutSessionToken('company-B')
    expect(verifyCheckoutSessionToken(tokenA)).toEqual({ companyId: 'company-A' })
    expect(verifyCheckoutSessionToken(tokenB)).toEqual({ companyId: 'company-B' })
    expect(verifyCheckoutSessionToken(tokenA)?.companyId).not.toBe('company-B')
  })

  it('cookie ausente/vazio é rejeitado', () => {
    expect(verifyCheckoutSessionToken(undefined)).toBeNull()
    expect(verifyCheckoutSessionToken(null)).toBeNull()
    expect(verifyCheckoutSessionToken('')).toBeNull()
  })

  it('issuedAt além da tolerância de relógio (futuro) é rejeitado', () => {
    const token = signSessionCookie(
      { v: 1, purpose: 'checkout-continuation', companyId: 'company-abc', issuedAt: Date.now() + 60_000 },
      3600
    )
    expect(verifyCheckoutSessionToken(token)).toBeNull()
  })

  it('expiresAt <= issuedAt é rejeitado', () => {
    const token = signSessionCookie(
      { v: 1, purpose: 'checkout-continuation', companyId: 'company-abc', issuedAt: Date.now() + 4000 },
      2 // expiresAt ≈ now+2s, issuedAt = now+4s → expiresAt <= issuedAt
    )
    expect(verifyCheckoutSessionToken(token)).toBeNull()
  })

  it('duração acima da validade oficial (7 dias) é rejeitada', () => {
    const token = signSessionCookie(
      { v: 1, purpose: 'checkout-continuation', companyId: 'company-abc', issuedAt: Date.now() },
      8 * 24 * 60 * 60 // 8 dias > CHECKOUT_SESSION_MAX_AGE_SECONDS
    )
    expect(verifyCheckoutSessionToken(token)).toBeNull()
  })
})
