import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    lead:    { findUnique: vi.fn(), update: vi.fn() },
    company: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    plan:    { findFirst: vi.fn() },
    partner: { findFirst: vi.fn() },
    payment: { create: vi.fn() },
  },
}))

vi.mock('@/lib/asaas', () => ({
  createOrFindCustomer:    vi.fn(async () => ({ id: 'cus_mock_123' })),
  createImplantacaoCharge: vi.fn(async () => ({ id: 'pay_mock_123', invoiceUrl: 'https://www.asaas.com/i/mock-abc' })),
  createSubscription:      vi.fn(async () => ({ id: 'sub_mock_123', status: 'ACTIVE' })),
  isAsaasMock: true,
}))

vi.mock('@/lib/subscriptionSync', () => ({
  syncFirstSubscriptionPayment: vi.fn(async () => ({ outcome: 'synced' })),
}))

vi.mock('@/lib/mailer', () => ({
  notifySubscriptionFailed: vi.fn(async () => {}),
}))

vi.mock('@/lib/checkoutSession', () => ({
  CHECKOUT_SESSION_COOKIE: 'sublime_checkout_continuation',
  CHECKOUT_SESSION_MAX_AGE_SECONDS: 7 * 24 * 60 * 60,
  issueCheckoutSessionToken: vi.fn(() => {
    throw new Error('SESSION_SECRET/ADMIN_SECRET não configurado no servidor.')
  }),
}))

const { POST } = await import('./route')
const { prisma } = await import('@/lib/prisma')
const { createSubscription, createImplantacaoCharge } = await import('@/lib/asaas')

function registerRequest() {
  const body = {
    cnpj: '12345678000199',
    razaoSocial: 'Empresa Teste LTDA',
    responsavel: 'Fulano de Tal',
    email: 'teste@example.com',
    whatsapp: '11999998888',
    cep: '01310100',
    cidade: 'São Paulo',
    estado: 'SP',
    endereco: 'Av. Teste, 100',
    numFuncionarios: 3,
    planType: 'essencial',
    consentDataUsage: true,
    consentDeclaration: true,
    consentTerms: true,
    contractAccepted: true,
  }
  return new NextRequest('https://www.sublimesst.com/api/leads/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.lead.findUnique).mockResolvedValue({
    id: 'lead_1',
    cnpj: '12345678000199',
    eligibilityAssessments: [{ employees: '1-5', resultShownAt: null }],
  } as any)
  vi.mocked(prisma.company.findUnique).mockResolvedValue(null)
  vi.mocked(prisma.plan.findFirst).mockResolvedValue({ id: 'plan_1' } as any)
  vi.mocked(prisma.partner.findFirst).mockResolvedValue(null)
  vi.mocked(prisma.company.create).mockResolvedValue({
    id: 'company_mock_1', razaoSocial: 'Empresa Teste LTDA', cnpj: '12345678000199', mensalidadeValor: 19900,
  } as any)
  vi.mocked(prisma.payment.create).mockResolvedValue({} as any)
  vi.mocked(prisma.company.update).mockResolvedValue({} as any)
  vi.mocked(prisma.lead.update).mockResolvedValue({} as any)
})

describe('POST /api/leads/register — sessão de continuação não pode quebrar o cadastro', () => {
  it('falha ao emitir o cookie NÃO retorna 500 e preserva o JSON/checkoutUrl originais', async () => {
    const res = await POST(registerRequest())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.checkoutUrl).toBe('https://www.asaas.com/i/mock-abc')
    expect(body.data.companyId).toBe('company_mock_1')
  })

  it('falha ao emitir o cookie não recria cobrança nem assinatura (cada uma chamada exatamente 1x)', async () => {
    await POST(registerRequest())
    expect(createImplantacaoCharge).toHaveBeenCalledTimes(1)
    expect(createSubscription).toHaveBeenCalledTimes(1)
  })

  it('não define o cookie de sessão quando a emissão falha', async () => {
    const res = await POST(registerRequest())
    expect(res.cookies.get('sublime_checkout_continuation')).toBeUndefined()
  })
})
