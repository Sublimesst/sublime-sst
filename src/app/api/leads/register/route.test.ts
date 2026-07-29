import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// O rate limiter em memória (src/lib/rateLimit.ts) é compartilhado por todo o
// processo de teste (mesma chave IP+pathname) — sem isso, os vários POSTs
// deste arquivo esbarrariam no limite padrão (5) e voltariam 429.
process.env.RATE_LIMIT_REGISTER = '1000'

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
  getCheckoutContinuationCallbackUrl: vi.fn(() => ({ outcome: 'available', url: 'https://www.sublimesst.com/cadastro/continuar' })),
  configurePaymentCallback: vi.fn(async () => ({ outcome: 'configured' })),
}))

vi.mock('@/lib/subscriptionSync', () => ({
  syncFirstSubscriptionPayment: vi.fn(async () => ({ outcome: 'synced', paymentId: 'payment_mock_1', asaasId: 'pay_mensalidade_mock_1' })),
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
const { createSubscription, createImplantacaoCharge, configurePaymentCallback } = await import('@/lib/asaas')
const { syncFirstSubscriptionPayment } = await import('@/lib/subscriptionSync')

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
  // vi.clearAllMocks() só limpa histórico de chamadas, não reimplementações
  // via mockRejectedValue/mockResolvedValue — reafirmar o comportamento
  // padrão aqui evita que um teste de falha "vaze" para o próximo.
  vi.mocked(configurePaymentCallback).mockResolvedValue({ outcome: 'configured' } as any)
  vi.mocked(syncFirstSubscriptionPayment).mockResolvedValue({ outcome: 'synced', paymentId: 'payment_mock_1', asaasId: 'pay_mensalidade_mock_1' } as any)
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

describe('POST /api/leads/register — callback de continuação (Etapa 2B.1)', () => {
  it('sucesso: configura callback na implantação e na primeira mensalidade', async () => {
    await POST(registerRequest())
    expect(configurePaymentCallback).toHaveBeenCalledTimes(2)
    expect(configurePaymentCallback).toHaveBeenNthCalledWith(1, 'pay_mock_123', 'https://www.sublimesst.com/cadastro/continuar')
    expect(configurePaymentCallback).toHaveBeenNthCalledWith(2, 'pay_mensalidade_mock_1', 'https://www.sublimesst.com/cadastro/continuar')
  })

  it('falha ao configurar callback da implantação não impede a tentativa na mensalidade', async () => {
    vi.mocked(configurePaymentCallback).mockRejectedValueOnce(new Error('Asaas indisponível'))
    const res = await POST(registerRequest())
    expect(res.status).toBe(200)
    expect(configurePaymentCallback).toHaveBeenCalledTimes(2)
    expect(configurePaymentCallback).toHaveBeenNthCalledWith(2, 'pay_mensalidade_mock_1', 'https://www.sublimesst.com/cadastro/continuar')
  })

  it('falha ao configurar qualquer callback nunca derruba o cadastro (200 + checkoutUrl preservado)', async () => {
    vi.mocked(configurePaymentCallback).mockRejectedValue(new Error('Asaas indisponível'))
    const res = await POST(registerRequest())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.checkoutUrl).toBe('https://www.asaas.com/i/mock-abc')
  })

  it('mensalidade ainda não sincronizada (not_found) → configura somente a implantação', async () => {
    vi.mocked(syncFirstSubscriptionPayment).mockResolvedValue({ outcome: 'not_found' } as any)
    await POST(registerRequest())
    expect(configurePaymentCallback).toHaveBeenCalledTimes(1)
    expect(configurePaymentCallback).toHaveBeenCalledWith('pay_mock_123', 'https://www.sublimesst.com/cadastro/continuar')
  })

  it('nenhum callback é aplicado à assinatura — createSubscription nunca recebe callback', async () => {
    await POST(registerRequest())
    const subscriptionArgs = vi.mocked(createSubscription).mock.calls[0][0] as any
    expect(subscriptionArgs.callback).toBeUndefined()
    expect(configurePaymentCallback).not.toHaveBeenCalledWith('sub_mock_123', expect.anything())
  })

  it('nenhuma cobrança nova é criada por causa do callback (implantação e assinatura seguem 1x cada)', async () => {
    vi.mocked(configurePaymentCallback).mockRejectedValue(new Error('Asaas indisponível'))
    await POST(registerRequest())
    expect(createImplantacaoCharge).toHaveBeenCalledTimes(1)
    expect(createSubscription).toHaveBeenCalledTimes(1)
  })
})
