import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/cancellationProcessor', () => ({
  processDueCancellations: vi.fn(),
}))

let GET: typeof import('./route').GET
let processDueCancellations: typeof import('@/lib/cancellationProcessor').processDueCancellations

beforeAll(async () => {
  ;({ GET } = await import('./route'))
  ;({ processDueCancellations } = await import('@/lib/cancellationProcessor'))
})

function req(authorization?: string) {
  return new NextRequest('https://www.sublimesst.com/api/cron/process-cancellations', {
    headers: authorization !== undefined ? { authorization } : {},
  })
}

const ORIGINAL_CRON_SECRET = process.env.CRON_SECRET

beforeEach(() => {
  vi.clearAllMocks()
  process.env.CRON_SECRET = 'test-secret'
  vi.mocked(processDueCancellations).mockResolvedValue({ processed: 0, failed: 0, skipped: 0 })
})

afterEach(() => {
  if (ORIGINAL_CRON_SECRET === undefined) delete process.env.CRON_SECRET
  else process.env.CRON_SECRET = ORIGINAL_CRON_SECRET
})

describe('GET /api/cron/process-cancellations — autenticação fail-closed (revisão pré-merge da PR #40)', () => {
  // (A) CRON_SECRET ausente + sem header → 401
  it('(A) CRON_SECRET indefinido e sem header de autorização → 401, processor nunca chamado', async () => {
    delete process.env.CRON_SECRET

    const res = await GET(req())

    expect(res.status).toBe(401)
    expect(processDueCancellations).not.toHaveBeenCalled()
  })

  // (B) CRON_SECRET ausente + header literal "Bearer undefined" → 401
  it('(B) CRON_SECRET indefinido + header "Authorization: Bearer undefined" → 401, processor nunca chamado', async () => {
    delete process.env.CRON_SECRET

    const res = await GET(req('Bearer undefined'))

    expect(res.status).toBe(401)
    expect(processDueCancellations).not.toHaveBeenCalled()
  })

  // (C) CRON_SECRET vazio → 401
  it('(C) CRON_SECRET vazio ("") → 401 mesmo com qualquer header, processor nunca chamado', async () => {
    process.env.CRON_SECRET = ''

    const res = await GET(req('Bearer '))

    expect(res.status).toBe(401)
    expect(processDueCancellations).not.toHaveBeenCalled()
  })

  // (D) secret válido + header ausente → 401
  it('(D) CRON_SECRET configurado + nenhum header de autorização → 401, processor nunca chamado', async () => {
    const res = await GET(req())

    expect(res.status).toBe(401)
    expect(processDueCancellations).not.toHaveBeenCalled()
  })

  // (E) secret válido + valor incorreto → 401
  it('(E) CRON_SECRET configurado + valor incorreto → 401, processor nunca chamado', async () => {
    const res = await GET(req('Bearer valor-errado'))

    expect(res.status).toBe(401)
    expect(processDueCancellations).not.toHaveBeenCalled()
  })

  // (F) secret válido + header correto → 200, processor chamado exatamente 1 vez
  it('(F) CRON_SECRET configurado + header correto → 200, processor chamado exatamente uma vez', async () => {
    vi.mocked(processDueCancellations).mockResolvedValue({ processed: 2, failed: 1, skipped: 0 })

    const res = await GET(req('Bearer test-secret'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(processDueCancellations).toHaveBeenCalledTimes(1)
    expect(body).toEqual({ ok: true, processed: 2, failed: 1, skipped: 0 })
  })

  // (G) comparação com valores de tamanhos diferentes → 401, sem exceção
  it('(G) header muito mais curto ou muito mais longo que o esperado → 401, sem lançar exceção', async () => {
    const shorter = await GET(req('Bearer x'))
    expect(shorter.status).toBe(401)

    const longer = await GET(req(`Bearer test-secret-com-sufixo-bem-mais-longo-${'x'.repeat(200)}`))
    expect(longer.status).toBe(401)

    expect(processDueCancellations).not.toHaveBeenCalled()
  })

  it('valor correto do secret embutido em outro header/posição não engana a comparação (case-sensitive, string exata)', async () => {
    const res = await GET(req('bearer test-secret')) // "bearer" minúsculo — não é o mesmo header
    expect(res.status).toBe(401)
    expect(processDueCancellations).not.toHaveBeenCalled()
  })
})
