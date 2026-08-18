import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { verifyCronSecret } from './cronAuth'

const ORIGINAL_CRON_SECRET = process.env.CRON_SECRET

beforeEach(() => {
  process.env.CRON_SECRET = 'test-secret'
})

afterEach(() => {
  if (ORIGINAL_CRON_SECRET === undefined) delete process.env.CRON_SECRET
  else process.env.CRON_SECRET = ORIGINAL_CRON_SECRET
})

describe('verifyCronSecret', () => {
  it('CRON_SECRET indefinido → false, mesmo com header correto para o valor "undefined"', () => {
    delete process.env.CRON_SECRET
    expect(verifyCronSecret('Bearer undefined')).toBe(false)
    expect(verifyCronSecret(null)).toBe(false)
    expect(verifyCronSecret(undefined)).toBe(false)
  })

  it('CRON_SECRET vazio → false para qualquer candidato', () => {
    process.env.CRON_SECRET = ''
    expect(verifyCronSecret('Bearer ')).toBe(false)
    expect(verifyCronSecret('')).toBe(false)
    expect(verifyCronSecret(null)).toBe(false)
  })

  it('header ausente (null/undefined) com secret configurado → false', () => {
    expect(verifyCronSecret(null)).toBe(false)
    expect(verifyCronSecret(undefined)).toBe(false)
  })

  it('valor incorreto com secret configurado → false', () => {
    expect(verifyCronSecret('Bearer valor-errado')).toBe(false)
  })

  it('valor correto → true', () => {
    expect(verifyCronSecret('Bearer test-secret')).toBe(true)
  })

  it('candidato de tamanho diferente do esperado → false, sem lançar exceção', () => {
    expect(() => verifyCronSecret('Bearer x')).not.toThrow()
    expect(verifyCronSecret('Bearer x')).toBe(false)
    expect(() => verifyCronSecret('Bearer test-secret-e-mais-um-monte-de-coisa-extra')).not.toThrow()
    expect(verifyCronSecret('Bearer test-secret-e-mais-um-monte-de-coisa-extra')).toBe(false)
  })

  it('comparação é sensível a maiúsculas/minúsculas e ao prefixo exato "Bearer "', () => {
    expect(verifyCronSecret('bearer test-secret')).toBe(false)
    expect(verifyCronSecret('test-secret')).toBe(false)
  })
})
