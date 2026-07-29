import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/clientAuth', () => ({
  getClientSession: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    payment: { findMany: vi.fn() },
    onboardingData: { upsert: vi.fn() },
    company: { updateMany: vi.fn() },
  },
}))

vi.mock('@/lib/mailer', () => ({
  notifyOnboardingSubmitted: vi.fn(async () => {}),
}))

const { POST } = await import('./route')
const { getClientSession } = await import('@/lib/clientAuth')
const { prisma } = await import('@/lib/prisma')
const { notifyOnboardingSubmitted } = await import('@/lib/mailer')

function onboardingRequest(body: Record<string, unknown> = { numFuncionarios: 5 }) {
  return new NextRequest('https://www.sublimesst.com/api/cliente/onboarding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function paymentFixture(overrides: Partial<{ id: string; type: string; status: string; amount: number; dueDate: Date | null; createdAt: Date; checkoutUrl: string | null }> = {}) {
  return {
    id: 'pay_1', type: 'implantacao', status: 'confirmed', amount: 14900,
    dueDate: new Date('2026-07-01'), createdAt: new Date('2026-06-01'), checkoutUrl: null,
    ...overrides,
  }
}

const COMPANY = { id: 'company_1', status: 'onboarding_pending', razaoSocial: 'Empresa Teste', cnpj: '12345678000199' }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.onboardingData.upsert).mockResolvedValue({} as any)
  vi.mocked(prisma.company.updateMany).mockResolvedValue({ count: 1 } as any)
})

describe('POST /api/cliente/onboarding — gate financeiro (Etapa 2C.1B)', () => {
  it('sem sessão → 401, comportamento atual preservado, sem consultar Payments', async () => {
    vi.mocked(getClientSession).mockResolvedValue(null)
    const res = await POST(onboardingRequest())
    expect(res.status).toBe(401)
    expect(prisma.payment.findMany).not.toHaveBeenCalled()
  })

  it('implantação pending → 409 financial_activation_required', async () => {
    vi.mocked(getClientSession).mockResolvedValue(COMPANY as any)
    vi.mocked(prisma.payment.findMany).mockResolvedValue([paymentFixture({ status: 'pending' })])
    const res = await POST(onboardingRequest())
    const body = await res.json()
    expect(res.status).toBe(409)
    expect(body.code).toBe('financial_activation_required')
  })

  it('mensalidade pending (implantação confirmed) → 409', async () => {
    vi.mocked(getClientSession).mockResolvedValue(COMPANY as any)
    vi.mocked(prisma.payment.findMany).mockResolvedValue([
      paymentFixture({ id: 'p1', type: 'implantacao', status: 'confirmed' }),
      paymentFixture({ id: 'p2', type: 'mensalidade', status: 'pending', dueDate: new Date('2026-07-27') }),
    ])
    const res = await POST(onboardingRequest())
    expect(res.status).toBe(409)
  })

  it('mensalidade ausente → 409', async () => {
    vi.mocked(getClientSession).mockResolvedValue(COMPANY as any)
    vi.mocked(prisma.payment.findMany).mockResolvedValue([paymentFixture({ type: 'implantacao', status: 'confirmed' })])
    const res = await POST(onboardingRequest())
    expect(res.status).toBe(409)
  })

  it('implantação refunded → 409', async () => {
    vi.mocked(getClientSession).mockResolvedValue(COMPANY as any)
    vi.mocked(prisma.payment.findMany).mockResolvedValue([paymentFixture({ status: 'refunded' })])
    const res = await POST(onboardingRequest())
    expect(res.status).toBe(409)
  })

  it('ambos confirmed → fluxo atual permitido (200, grava onboardingData, atualiza status, notifica equipe)', async () => {
    vi.mocked(getClientSession).mockResolvedValue(COMPANY as any)
    vi.mocked(prisma.payment.findMany).mockResolvedValue([
      paymentFixture({ id: 'p1', type: 'implantacao', status: 'confirmed' }),
      paymentFixture({ id: 'p2', type: 'mensalidade', status: 'confirmed', dueDate: new Date('2026-07-27') }),
    ])
    const res = await POST(onboardingRequest({ numFuncionarios: 5, cargos: 'Analista' }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(prisma.onboardingData.upsert).toHaveBeenCalledTimes(1)
    expect(prisma.company.updateMany).toHaveBeenCalledTimes(1)
    expect(notifyOnboardingSubmitted).toHaveBeenCalledTimes(1)
  })

  it('Company cancelled → getClientSession já bloqueia (401), sem alterar Company.status', async () => {
    // clientAuth.ts já exclui cancelled via NOT:{status:'cancelled'} — aqui só
    // confirmamos que o comportamento (401) é preservado nesta rota.
    vi.mocked(getClientSession).mockResolvedValue(null)
    const res = await POST(onboardingRequest())
    expect(res.status).toBe(401)
    expect(prisma.company.updateMany).not.toHaveBeenCalled()
  })

  it('isolamento: consulta Payments só da Company autenticada (nunca de outra empresa)', async () => {
    vi.mocked(getClientSession).mockResolvedValue(COMPANY as any)
    vi.mocked(prisma.payment.findMany).mockResolvedValue([])
    await POST(onboardingRequest())
    expect(prisma.payment.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ companyId: 'company_1' }),
    }))
  })

  it('nenhuma escrita Prisma ocorre quando bloqueado (409)', async () => {
    vi.mocked(getClientSession).mockResolvedValue(COMPANY as any)
    vi.mocked(prisma.payment.findMany).mockResolvedValue([paymentFixture({ status: 'pending' })])
    await POST(onboardingRequest())
    expect(prisma.onboardingData.upsert).not.toHaveBeenCalled()
    expect(prisma.company.updateMany).not.toHaveBeenCalled()
    expect(notifyOnboardingSubmitted).not.toHaveBeenCalled()
  })
})
