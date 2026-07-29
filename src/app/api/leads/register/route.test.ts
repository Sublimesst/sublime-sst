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

// Sucesso por padrão — os testes de falha usam mockImplementationOnce/
// mockReturnValueOnce, que revertem sozinhos ao valor padrão no teste seguinte.
vi.mock('@/lib/checkoutSession', () => ({
  CHECKOUT_SESSION_COOKIE: 'sublime_checkout_continuation',
  CHECKOUT_SESSION_MAX_AGE_SECONDS: 7 * 24 * 60 * 60,
  issueCheckoutSessionToken: vi.fn(() => 'mock-session-token.mock-signature'),
}))

const { POST } = await import('./route')
const { prisma } = await import('@/lib/prisma')
const { createSubscription, createImplantacaoCharge, configurePaymentCallback } = await import('@/lib/asaas')
const { syncFirstSubscriptionPayment } = await import('@/lib/subscriptionSync')
const { issueCheckoutSessionToken } = await import('@/lib/checkoutSession')

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
  vi.mocked(issueCheckoutSessionToken).mockReturnValue('mock-session-token.mock-signature')
})

describe('POST /api/leads/register — continuationReady', () => {
  it('1) cookie emitido com sucesso → continuationReady=true', async () => {
    const res = await POST(registerRequest())
    const body = await res.json()
    expect(body.data.continuationReady).toBe(true)
    expect(res.cookies.get('sublime_checkout_continuation')).toBeDefined()
  })

  it('2) falha em issueCheckoutSessionToken → continuationReady=false, sem 500, sem callback', async () => {
    vi.mocked(issueCheckoutSessionToken).mockImplementationOnce(() => {
      throw new Error('SESSION_SECRET/ADMIN_SECRET não configurado no servidor.')
    })
    const res = await POST(registerRequest())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.continuationReady).toBe(false)
    expect(res.cookies.get('sublime_checkout_continuation')).toBeUndefined()
    expect(configurePaymentCallback).not.toHaveBeenCalled()
  })

  it('3) falha na aplicação real de cookies.set → continuationReady=false, sem 500, sem callback (guarda defensiva: a implementação real de ResponseCookies do Next.js hoje percent-encoda em vez de lançar para qualquer valor — testado diretamente forçando o throw na ÚNICA chamada real para provar que o catch degrada corretamente, sem resposta parcial)', async () => {
    const { NextResponse } = await import('next/server')
    const cookiesSpy = vi.spyOn(NextResponse.prototype, 'cookies', 'get').mockReturnValue({
      set: () => { throw new Error('cookies.set falhou (simulado)') },
    } as any)
    try {
      const res = await POST(registerRequest())
      const body = await res.json()
      expect(res.status).toBe(200)
      expect(body.data.continuationReady).toBe(false)
      expect(body.data.checkoutUrl).toBe('https://www.asaas.com/i/mock-abc')
      expect(configurePaymentCallback).not.toHaveBeenCalled()
    } finally {
      cookiesSpy.mockRestore()
    }
  })

  it('4) continuationReady=false preserva checkoutUrl e demais campos públicos', async () => {
    vi.mocked(issueCheckoutSessionToken).mockImplementationOnce(() => { throw new Error('sem secret') })
    const res = await POST(registerRequest())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.checkoutUrl).toBe('https://www.asaas.com/i/mock-abc')
    expect(body.data.companyId).toBe('company_mock_1')
  })

  it('5) continuationReady=false não chama nenhum callback', async () => {
    vi.mocked(issueCheckoutSessionToken).mockImplementationOnce(() => { throw new Error('sem secret') })
    await POST(registerRequest())
    expect(configurePaymentCallback).not.toHaveBeenCalled()
  })

  it('9) nenhum token, cookie, ou asaasId aparece no corpo do JSON', async () => {
    const res = await POST(registerRequest())
    const raw = JSON.stringify(await res.json())
    expect(raw).not.toContain('mock-session-token')
    expect(raw).not.toContain('pay_mock_123')
    expect(raw).not.toContain('pay_mensalidade_mock_1')
    expect(raw.toLowerCase()).not.toContain('sublime_checkout_continuation')
  })

  it('cobrança e assinatura não são recriadas por causa do cookie (falha ou sucesso)', async () => {
    vi.mocked(issueCheckoutSessionToken).mockImplementationOnce(() => { throw new Error('sem secret') })
    await POST(registerRequest())
    expect(createImplantacaoCharge).toHaveBeenCalledTimes(1)
    expect(createSubscription).toHaveBeenCalledTimes(1)
  })
})

describe('POST /api/leads/register — callback de continuação (Etapa 2B.1/2B.2)', () => {
  it('6+7) continuationReady=true tenta callback da implantação e, com mensalidade sincronizada, da mensalidade', async () => {
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

  it('8) falha de qualquer callback nunca altera a resposta 200 nem checkoutUrl', async () => {
    vi.mocked(configurePaymentCallback).mockRejectedValue(new Error('Asaas indisponível'))
    const res = await POST(registerRequest())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.checkoutUrl).toBe('https://www.asaas.com/i/mock-abc')
    expect(body.data.continuationReady).toBe(true)
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
