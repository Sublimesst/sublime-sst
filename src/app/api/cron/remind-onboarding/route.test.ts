import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/prisma', () => ({
  prisma: { company: { findMany: vi.fn() } },
}))

vi.mock('@/lib/mailer', () => ({
  sendOnboardingReminder: vi.fn(async () => {}),
}))

let GET: typeof import('./route').GET
let prisma: typeof import('@/lib/prisma').prisma

beforeAll(async () => {
  ;({ GET } = await import('./route'))
  ;({ prisma } = await import('@/lib/prisma'))
})

function req() {
  return new NextRequest('https://www.sublimesst.com/api/cron/remind-onboarding', {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.CRON_SECRET = 'test-secret'
  vi.mocked(prisma.company.findMany).mockResolvedValue([])
})

describe('GET /api/cron/remind-onboarding — critério de elegibilidade pós-rascunho', () => {
  it('inclui Companies sem OnboardingData OU com rascunho ainda em_preenchimento — nunca "enviado"', async () => {
    await GET(req())
    const call = vi.mocked(prisma.company.findMany).mock.calls[0][0] as any
    expect(call.where.OR).toEqual([
      { onboardingData: null },
      { onboardingData: { is: { status: 'em_preenchimento' } } },
    ])
    // Não deve mais existir a condição antiga "onboardingData: null" isolada,
    // que pararia de lembrar quem só iniciou um rascunho e nunca enviou.
    expect(call.where.onboardingData).toBeUndefined()
  })

  it('sem CRON_SECRET correto → 401, sem consultar o banco', async () => {
    const res = await GET(new NextRequest('https://www.sublimesst.com/api/cron/remind-onboarding', {
      headers: { authorization: 'Bearer errado' },
    }))
    expect(res.status).toBe(401)
    expect(prisma.company.findMany).not.toHaveBeenCalled()
  })
})
