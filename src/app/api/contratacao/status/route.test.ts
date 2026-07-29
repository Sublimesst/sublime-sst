import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// SECRET em sessionCookie.ts é uma const de módulo avaliada no import — por
// isso a env var precisa existir ANTES do import (beforeAll roda tarde demais).
process.env.SESSION_SECRET = 'test-secret-nao-real-0123456789'

vi.mock('@/lib/prisma', () => ({
  prisma: { company: { findUnique: vi.fn() } },
}))

const { GET } = await import('./route')
const { prisma } = await import('@/lib/prisma')
const { issueCheckoutSessionToken, CHECKOUT_SESSION_COOKIE } = await import('@/lib/checkoutSession')

const findUniqueMock = vi.mocked(prisma.company.findUnique)

function requestWithCookie(cookieValue?: string) {
  const headers = new Headers()
  if (cookieValue) headers.set('cookie', `${CHECKOUT_SESSION_COOKIE}=${cookieValue}`)
  return new NextRequest('https://www.sublimesst.com/api/contratacao/status', { headers })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/contratacao/status', () => {
  it('sem cookie → 401, sem consultar o banco', async () => {
    const res = await GET(requestWithCookie())
    expect(res.status).toBe(401)
    expect(findUniqueMock).not.toHaveBeenCalled()
  })

  it('cookie inválido/adulterado → 401', async () => {
    const res = await GET(requestWithCookie('token-invalido.assinatura-errada'))
    expect(res.status).toBe(401)
  })

  it('Company não encontrada → 404', async () => {
    findUniqueMock.mockResolvedValue(null)
    const token = issueCheckoutSessionToken('company-1')
    const res = await GET(requestWithCookie(token))
    expect(res.status).toBe(404)
  })

  it('Company cancelled → 403 com code company_cancelled, nenhum dado retornado', async () => {
    findUniqueMock.mockResolvedValue({ status: 'cancelled', planType: 'essencial', mensalidadeValor: 19900, payments: [] } as any)
    const token = issueCheckoutSessionToken('company-1')
    const res = await GET(requestWithCookie(token))
    const body = await res.json()
    expect(res.status).toBe(403)
    expect(body.code).toBe('company_cancelled')
    expect(body.data).toBeUndefined()
  })

  it('resposta sempre inclui Cache-Control: no-store e Vary: Cookie', async () => {
    findUniqueMock.mockResolvedValue({ status: 'onboarding_pending', planType: 'essencial', mensalidadeValor: 19900, payments: [] } as any)
    const token = issueCheckoutSessionToken('company-1')
    const res = await GET(requestWithCookie(token))
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect(res.headers.get('Vary')).toBe('Cookie')
  })

  it('401 (sem cookie) também inclui Cache-Control: no-store', async () => {
    const res = await GET(requestWithCookie())
    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })

  it('isolamento: token da empresa A só consulta a empresa A', async () => {
    findUniqueMock.mockResolvedValue({ status: 'pending', planType: 'essencial', mensalidadeValor: 19900, payments: [] } as any)
    const token = issueCheckoutSessionToken('company-A')
    await GET(requestWithCookie(token))
    expect(findUniqueMock).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'company-A' } }))
  })

  it('endpoint nunca chama Asaas nem grava — só payment.findUnique é usado', async () => {
    findUniqueMock.mockResolvedValue({
      status: 'onboarding_pending', planType: 'essencial', mensalidadeValor: 19900,
      payments: [{ type: 'implantacao', status: 'confirmed', amount: 14900, dueDate: new Date('2026-07-30'), checkoutUrl: 'https://www.asaas.com/i/abc' }],
    } as any)
    const token = issueCheckoutSessionToken('company-1')
    const res = await GET(requestWithCookie(token))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.step).toBe('preparing') // implantação confirmed, sem Payment de mensalidade ainda
    expect(Object.keys(prisma.company)).toEqual(['findUnique'])
  })

  it('URL de checkout válida (host oficial https) é aceita', async () => {
    findUniqueMock.mockResolvedValue({
      status: 'onboarding_pending', planType: 'essencial', mensalidadeValor: 19900,
      payments: [{ type: 'implantacao', status: 'pending', amount: 14900, dueDate: new Date('2026-07-30'), checkoutUrl: 'https://www.asaas.com/i/abc123' }],
    } as any)
    const token = issueCheckoutSessionToken('company-1')
    const body = await (await GET(requestWithCookie(token))).json()
    expect(body.data.implantacao.checkoutUrl).toBe('https://www.asaas.com/i/abc123')
  })

  it('URL maliciosa (host não-Asaas) é rejeitada — vira undefined', async () => {
    findUniqueMock.mockResolvedValue({
      status: 'onboarding_pending', planType: 'essencial', mensalidadeValor: 19900,
      payments: [{ type: 'implantacao', status: 'pending', amount: 14900, dueDate: new Date('2026-07-30'), checkoutUrl: 'https://evil.example.com/i/abc' }],
    } as any)
    const token = issueCheckoutSessionToken('company-1')
    const body = await (await GET(requestWithCookie(token))).json()
    expect(body.data.implantacao.checkoutUrl).toBeUndefined()
  })

  it('URL http:// (não https) é rejeitada', async () => {
    findUniqueMock.mockResolvedValue({
      status: 'onboarding_pending', planType: 'essencial', mensalidadeValor: 19900,
      payments: [{ type: 'implantacao', status: 'pending', amount: 14900, dueDate: new Date('2026-07-30'), checkoutUrl: 'http://www.asaas.com/i/abc' }],
    } as any)
    const token = issueCheckoutSessionToken('company-1')
    const body = await (await GET(requestWithCookie(token))).json()
    expect(body.data.implantacao.checkoutUrl).toBeUndefined()
  })

  it('domínio parecido (asaas.com.exemplo.com) é rejeitado', async () => {
    findUniqueMock.mockResolvedValue({
      status: 'onboarding_pending', planType: 'essencial', mensalidadeValor: 19900,
      payments: [{ type: 'implantacao', status: 'pending', amount: 14900, dueDate: new Date('2026-07-30'), checkoutUrl: 'https://asaas.com.exemplo.com/i/abc' }],
    } as any)
    const token = issueCheckoutSessionToken('company-1')
    const body = await (await GET(requestWithCookie(token))).json()
    expect(body.data.implantacao.checkoutUrl).toBeUndefined()
  })

  it('URL com usuário/senha embutidos é rejeitada', async () => {
    findUniqueMock.mockResolvedValue({
      status: 'onboarding_pending', planType: 'essencial', mensalidadeValor: 19900,
      payments: [{ type: 'implantacao', status: 'pending', amount: 14900, dueDate: new Date('2026-07-30'), checkoutUrl: 'https://user:pass@www.asaas.com/i/abc' }],
    } as any)
    const token = issueCheckoutSessionToken('company-1')
    const body = await (await GET(requestWithCookie(token))).json()
    expect(body.data.implantacao.checkoutUrl).toBeUndefined()
  })

  it('URL com porta inesperada é rejeitada', async () => {
    findUniqueMock.mockResolvedValue({
      status: 'onboarding_pending', planType: 'essencial', mensalidadeValor: 19900,
      payments: [{ type: 'implantacao', status: 'pending', amount: 14900, dueDate: new Date('2026-07-30'), checkoutUrl: 'https://www.asaas.com:9999/i/abc' }],
    } as any)
    const token = issueCheckoutSessionToken('company-1')
    const body = await (await GET(requestWithCookie(token))).json()
    expect(body.data.implantacao.checkoutUrl).toBeUndefined()
  })

  it('orderBy da query prioriza menor dueDate com desempate por createdAt/id', async () => {
    findUniqueMock.mockResolvedValue({ status: 'onboarding_pending', planType: 'essencial', mensalidadeValor: 19900, payments: [] } as any)
    const token = issueCheckoutSessionToken('company-1')
    await GET(requestWithCookie(token))
    expect(findUniqueMock).toHaveBeenCalledWith(expect.objectContaining({
      select: expect.objectContaining({
        payments: expect.objectContaining({
          orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }, { id: 'asc' }],
        }),
      }),
    }))
  })

  it('entre múltiplas mensalidades, seleciona a de menor dueDate — nunca confunde com mensalidade futura', async () => {
    findUniqueMock.mockResolvedValue({
      status: 'onboarding_pending', planType: 'essencial', mensalidadeValor: 19900,
      payments: [
        // já na ordem que o Prisma devolveria (dueDate asc)
        { type: 'implantacao', status: 'confirmed', amount: 14900, dueDate: new Date('2026-07-01'), checkoutUrl: null },
        { type: 'mensalidade', status: 'confirmed', amount: 19900, dueDate: new Date('2026-07-27'), checkoutUrl: null },
        { type: 'mensalidade', status: 'pending', amount: 19900, dueDate: new Date('2026-08-27'), checkoutUrl: null },
      ],
    } as any)
    const token = issueCheckoutSessionToken('company-1')
    const body = await (await GET(requestWithCookie(token))).json()
    expect(body.data.mensalidade.status).toBe('confirmed')
    expect(body.data.mensalidade.dueDate).toBe(new Date('2026-07-27').toISOString())
  })

  it('ambas confirmadas → completed, financiallyComplete true', async () => {
    findUniqueMock.mockResolvedValue({
      status: 'onboarding_pending', planType: 'essencial', mensalidadeValor: 19900,
      payments: [
        { type: 'implantacao', status: 'confirmed', amount: 14900, dueDate: new Date('2026-07-30'), checkoutUrl: null },
        { type: 'mensalidade', status: 'confirmed', amount: 19900, dueDate: new Date('2026-07-27'), checkoutUrl: null },
      ],
    } as any)
    const token = issueCheckoutSessionToken('company-1')
    const body = await (await GET(requestWithCookie(token))).json()
    expect(body.data.step).toBe('completed')
    expect(body.data.financiallyComplete).toBe(true)
  })

  it('nenhum identificador interno (companyId/asaasId) vaza na resposta', async () => {
    findUniqueMock.mockResolvedValue({
      status: 'onboarding_pending', planType: 'essencial', mensalidadeValor: 19900,
      payments: [{ type: 'implantacao', status: 'pending', amount: 14900, dueDate: new Date('2026-07-30'), checkoutUrl: null }],
    } as any)
    const token = issueCheckoutSessionToken('company-1')
    const raw = JSON.stringify(await (await GET(requestWithCookie(token))).json())
    expect(raw).not.toContain('company-1')
    expect(raw.toLowerCase()).not.toContain('asaasid')
  })
})
