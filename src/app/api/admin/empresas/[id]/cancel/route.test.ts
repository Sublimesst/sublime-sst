import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { NextRequest } from 'next/server'

process.env.ADMIN_SECRET = 'test-admin-secret'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    company: { findUnique: vi.fn(), updateMany: vi.fn() },
    cancellationRequest: { create: vi.fn() },
    commission: { updateMany: vi.fn() },
  },
}))

vi.mock('@/lib/asaas', () => ({
  cancelSubscription: vi.fn(),
}))

vi.mock('@/lib/mailer', () => ({
  sendCancellationConfirmedClient: vi.fn(async () => {}),
  notifyPartnerCompanyCancelled:   vi.fn(async () => {}),
}))

// Import dinâmico dentro de beforeAll (em vez de top-level await) para não
// introduzir o erro TS1378 no tsc — mantém a mesma ordem de hoist do vi.mock.
let POST: typeof import('./route').POST
let prisma: typeof import('@/lib/prisma').prisma
let cancelSubscription: typeof import('@/lib/asaas').cancelSubscription

beforeAll(async () => {
  ;({ POST } = await import('./route'))
  ;({ prisma } = await import('@/lib/prisma'))
  ;({ cancelSubscription } = await import('@/lib/asaas'))
})

function baseCompany(overrides: Record<string, unknown> = {}) {
  return {
    id: 'company_mock_1',
    status: 'active',
    razaoSocial: 'Empresa Teste LTDA',
    email: 'teste@example.com',
    responsavel: 'Fulano de Tal',
    asaasSubscriptionId: 'sub_mock_1',
    partner: null,
    ...overrides,
  }
}

function cancelRequest(body: Record<string, unknown> = {}) {
  return new NextRequest('https://www.sublimesst.com/api/admin/empresas/company_mock_1/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-secret': 'test-admin-secret' },
    body: JSON.stringify({ reason: 'Motivo de teste', requestedBy: 'admin_teste', ...body }),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.company.updateMany).mockResolvedValue({ count: 1 } as any)
  vi.mocked(prisma.cancellationRequest.create).mockResolvedValue({ id: 'cr_mock_1' } as any)
  vi.mocked(prisma.commission.updateMany).mockResolvedValue({ count: 0 } as any)
})

describe('POST /api/admin/empresas/[id]/cancel — subscriptionStatus', () => {
  it('1) Company com assinatura + sucesso na Asaas → status=cancelled e subscriptionStatus=inactive na mesma chamada', async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue(baseCompany() as any)
    vi.mocked(cancelSubscription).mockResolvedValue({ alreadyCancelled: false })

    const res = await POST(cancelRequest(), { params: { id: 'company_mock_1' } })

    expect(res.status).toBe(201)
    expect(cancelSubscription).toHaveBeenCalledWith('sub_mock_1')
    expect(prisma.company.updateMany).toHaveBeenCalledTimes(1)
    expect(prisma.company.updateMany).toHaveBeenCalledWith({
      where: { id: 'company_mock_1', status: { not: 'cancelled' } },
      data:  { status: 'cancelled', subscriptionStatus: 'inactive' },
    })
  })

  it('2) Asaas devolve alreadyCancelled (assinatura já removida) → resultado local também coerente', async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue(baseCompany() as any)
    vi.mocked(cancelSubscription).mockResolvedValue({ alreadyCancelled: true })

    const res = await POST(cancelRequest(), { params: { id: 'company_mock_1' } })

    expect(res.status).toBe(201)
    expect(prisma.company.updateMany).toHaveBeenCalledWith({
      where: { id: 'company_mock_1', status: { not: 'cancelled' } },
      data:  { status: 'cancelled', subscriptionStatus: 'inactive' },
    })
  })

  it('3) Falha real no cancelamento na Asaas → nenhuma transição local (nem status, nem subscriptionStatus)', async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue(baseCompany() as any)
    vi.mocked(cancelSubscription).mockRejectedValue(new Error('Asaas API error 500: {}'))

    const res = await POST(cancelRequest(), { params: { id: 'company_mock_1' } })
    const body = await res.json()

    expect(res.status).toBe(502)
    expect(body.success).toBe(false)
    expect(prisma.company.updateMany).not.toHaveBeenCalled()
    expect(prisma.cancellationRequest.create).not.toHaveBeenCalled()
    expect(prisma.commission.updateMany).not.toHaveBeenCalled()
  })

  it('4) Company sem asaasSubscriptionId → não inventa subscriptionStatus=inactive nem chama a Asaas', async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue(baseCompany({ asaasSubscriptionId: null }) as any)

    const res = await POST(cancelRequest(), { params: { id: 'company_mock_1' } })

    expect(res.status).toBe(201)
    expect(cancelSubscription).not.toHaveBeenCalled()
    expect(prisma.company.updateMany).toHaveBeenCalledWith({
      where: { id: 'company_mock_1', status: { not: 'cancelled' } },
      data:  { status: 'cancelled' },
    })
  })

  it('5) Comissão em_carencia é estornada e CancellationRequest é criada, comportamento preservado', async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue(baseCompany() as any)
    vi.mocked(cancelSubscription).mockResolvedValue({ alreadyCancelled: false })

    await POST(cancelRequest(), { params: { id: 'company_mock_1' } })

    expect(prisma.commission.updateMany).toHaveBeenCalledWith({
      where: { companyId: 'company_mock_1', status: 'em_carencia' },
      data:  { status: 'estornada' },
    })
    expect(prisma.cancellationRequest.create).toHaveBeenCalledTimes(1)
  })

  it('6) Company já cancelled → idempotente, sem chamar a Asaas nem tocar subscriptionStatus', async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue(baseCompany({ status: 'cancelled' }) as any)

    const res = await POST(cancelRequest(), { params: { id: 'company_mock_1' } })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.alreadyCancelled).toBe(true)
    expect(cancelSubscription).not.toHaveBeenCalled()
    expect(prisma.company.updateMany).not.toHaveBeenCalled()
  })
})
