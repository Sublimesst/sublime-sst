import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/commissionRelease', () => ({
  releaseDueCommissions: vi.fn(),
}))

let GET: typeof import('./route').GET
let releaseDueCommissions: typeof import('@/lib/commissionRelease').releaseDueCommissions

beforeAll(async () => {
  ;({ GET } = await import('./route'))
  ;({ releaseDueCommissions } = await import('@/lib/commissionRelease'))
})

function req(authorization?: string) {
  return new NextRequest('https://www.sublimesst.com/api/cron/release-commissions', {
    headers: authorization !== undefined ? { authorization } : {},
  })
}

const ORIGINAL_CRON_SECRET = process.env.CRON_SECRET

beforeEach(() => {
  vi.clearAllMocks()
  process.env.CRON_SECRET = 'test-secret'
  vi.mocked(releaseDueCommissions).mockResolvedValue({ released: 0 })
})

afterEach(() => {
  if (ORIGINAL_CRON_SECRET === undefined) delete process.env.CRON_SECRET
  else process.env.CRON_SECRET = ORIGINAL_CRON_SECRET
})

describe('GET /api/cron/release-commissions — autenticação fail-closed (mesmo padrão de process-cancellations)', () => {
  it('CRON_SECRET indefinido e sem header de autorização → 401, releaseDueCommissions nunca chamado', async () => {
    delete process.env.CRON_SECRET

    const res = await GET(req())

    expect(res.status).toBe(401)
    expect(releaseDueCommissions).not.toHaveBeenCalled()
  })

  it('CRON_SECRET indefinido + header literal "Bearer undefined" → 401', async () => {
    delete process.env.CRON_SECRET

    const res = await GET(req('Bearer undefined'))

    expect(res.status).toBe(401)
    expect(releaseDueCommissions).not.toHaveBeenCalled()
  })

  it('CRON_SECRET vazio ("") → 401 mesmo com qualquer header', async () => {
    process.env.CRON_SECRET = ''

    const res = await GET(req('Bearer '))

    expect(res.status).toBe(401)
    expect(releaseDueCommissions).not.toHaveBeenCalled()
  })

  it('secret configurado + nenhum header de autorização → 401', async () => {
    const res = await GET(req())

    expect(res.status).toBe(401)
    expect(releaseDueCommissions).not.toHaveBeenCalled()
  })

  it('secret configurado + valor incorreto → 401', async () => {
    const res = await GET(req('Bearer valor-errado'))

    expect(res.status).toBe(401)
    expect(releaseDueCommissions).not.toHaveBeenCalled()
  })

  it('secret configurado + header correto → 200, releaseDueCommissions chamado exatamente uma vez', async () => {
    vi.mocked(releaseDueCommissions).mockResolvedValue({ released: 3 })

    const res = await GET(req('Bearer test-secret'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(releaseDueCommissions).toHaveBeenCalledTimes(1)
    expect(body).toEqual({ ok: true, released: 3 })
  })

  it('header muito mais curto ou muito mais longo que o esperado → 401, sem lançar exceção', async () => {
    const shorter = await GET(req('Bearer x'))
    expect(shorter.status).toBe(401)

    const longer = await GET(req(`Bearer test-secret-com-sufixo-bem-mais-longo-${'x'.repeat(200)}`))
    expect(longer.status).toBe(401)

    expect(releaseDueCommissions).not.toHaveBeenCalled()
  })

  it('valor correto do secret com header case diferente não engana a comparação (case-sensitive, string exata)', async () => {
    const res = await GET(req('bearer test-secret'))
    expect(res.status).toBe(401)
    expect(releaseDueCommissions).not.toHaveBeenCalled()
  })
})
