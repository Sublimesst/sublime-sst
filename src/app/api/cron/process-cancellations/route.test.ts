import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
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

beforeEach(() => {
  vi.clearAllMocks()
  process.env.CRON_SECRET = 'test-secret'
  vi.mocked(processDueCancellations).mockResolvedValue({ processed: 0, failed: 0, skipped: 0 })
})

describe('GET /api/cron/process-cancellations', () => {
  it('sem CRON_SECRET correto → 401, processor nunca chamado', async () => {
    const res = await GET(req('Bearer errado'))

    expect(res.status).toBe(401)
    expect(processDueCancellations).not.toHaveBeenCalled()
  })

  it('sem header de autorização → 401', async () => {
    const res = await GET(req())

    expect(res.status).toBe(401)
    expect(processDueCancellations).not.toHaveBeenCalled()
  })

  it('secret correto → chama o processor e devolve os contadores', async () => {
    vi.mocked(processDueCancellations).mockResolvedValue({ processed: 2, failed: 1, skipped: 0 })

    const res = await GET(req('Bearer test-secret'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(processDueCancellations).toHaveBeenCalledTimes(1)
    expect(body).toEqual({ ok: true, processed: 2, failed: 1, skipped: 0 })
  })
})
