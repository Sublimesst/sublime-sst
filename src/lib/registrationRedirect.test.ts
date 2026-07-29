import { describe, it, expect } from 'vitest'
import { decideRegistrationRedirect } from './registrationRedirect'

describe('decideRegistrationRedirect', () => {
  it('continuationReady=true → continuation, mesmo com checkoutUrl presente', () => {
    const r = decideRegistrationRedirect({ continuationReady: true, checkoutUrl: 'https://www.asaas.com/i/abc', isMock: false })
    expect(r).toEqual({ kind: 'continuation', url: '/cadastro/continuar' })
  })

  it('continuationReady=false com checkoutUrl válida → checkout (fallback)', () => {
    const r = decideRegistrationRedirect({ continuationReady: false, checkoutUrl: 'https://www.asaas.com/i/abc', isMock: false })
    expect(r).toEqual({ kind: 'checkout', url: 'https://www.asaas.com/i/abc' })
  })

  it('continuationReady ausente (resposta antiga) → usa checkoutUrl como fluxo legado', () => {
    const r = decideRegistrationRedirect({ checkoutUrl: 'https://www.asaas.com/i/abc', isMock: false })
    expect(r).toEqual({ kind: 'checkout', url: 'https://www.asaas.com/i/abc' })
  })

  it('checkoutUrl ausente (e continuationReady=false) → unavailable', () => {
    const r = decideRegistrationRedirect({ continuationReady: false, checkoutUrl: null, isMock: false })
    expect(r).toEqual({ kind: 'unavailable' })
  })

  it('modo mock nunca redireciona para checkoutUrl, mesmo se presente', () => {
    const r = decideRegistrationRedirect({ continuationReady: false, checkoutUrl: 'https://sandbox.asaas.com/i/mock', isMock: true })
    expect(r).toEqual({ kind: 'unavailable' })
  })

  it('continuationReady=true tem prioridade mesmo em modo mock', () => {
    const r = decideRegistrationRedirect({ continuationReady: true, checkoutUrl: null, isMock: true })
    expect(r).toEqual({ kind: 'continuation', url: '/cadastro/continuar' })
  })

  it('nenhum campo presente → unavailable, nunca lança', () => {
    expect(decideRegistrationRedirect({})).toEqual({ kind: 'unavailable' })
  })
})
