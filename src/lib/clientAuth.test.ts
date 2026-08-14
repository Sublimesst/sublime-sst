import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('./sessionCookie', () => ({
  verifySessionCookie: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    company: { findFirst: vi.fn() },
  },
}))

let getClientSession: typeof import('./clientAuth').getClientSession
let verifySessionCookie: typeof import('./sessionCookie').verifySessionCookie
let prisma: typeof import('@/lib/prisma').prisma

beforeAll(async () => {
  ;({ getClientSession } = await import('./clientAuth'))
  ;({ verifySessionCookie } = await import('./sessionCookie'))
  ;({ prisma } = await import('@/lib/prisma'))
})

const COMPANY_ROW = { id: 'company_1', status: 'active', razaoSocial: 'Empresa Teste', cnpj: '12345678000199' }

function requestWithCookie(value?: string) {
  const req = new NextRequest('https://www.sublimesst.com/cliente/dashboard')
  if (value) req.cookies.set('sublime_client', value)
  return req
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.company.findFirst).mockResolvedValue(COMPANY_ROW as any)
})

describe('getClientSession', () => {
  it('cookie ausente → null, sem consultar Company', async () => {
    vi.mocked(verifySessionCookie).mockReturnValue(null)
    const result = await getClientSession(requestWithCookie())
    expect(result).toBeNull()
    expect(prisma.company.findFirst).not.toHaveBeenCalled()
  })

  it('cookie inválido (assinatura não confere) → null', async () => {
    vi.mocked(verifySessionCookie).mockReturnValue(null)
    const result = await getClientSession(requestWithCookie('cookie-invalido'))
    expect(result).toBeNull()
  })

  it('cookie expirado → null (verifySessionCookie já filtra expiração)', async () => {
    vi.mocked(verifySessionCookie).mockReturnValue(null)
    const result = await getClientSession(requestWithCookie('cookie-expirado'))
    expect(result).toBeNull()
  })

  it('empresa inexistente ou cancelada → null, mesmo com cookie válido', async () => {
    vi.mocked(verifySessionCookie).mockReturnValue({ companyId: 'company_1', email: 'a@b.com', issuedAt: Date.now(), sessionId: 'session_sintetico_1' })
    vi.mocked(prisma.company.findFirst).mockResolvedValue(null)
    const result = await getClientSession(requestWithCookie('cookie-valido'))
    expect(result).toBeNull()
  })

  it('cookie novo com sessionId válido retorna clientSessionId igual ao valor do payload', async () => {
    vi.mocked(verifySessionCookie).mockReturnValue({ companyId: 'company_1', email: 'a@b.com', issuedAt: Date.now(), sessionId: 'session_sintetico_1' })
    const result = await getClientSession(requestWithCookie('cookie-novo'))
    expect(result?.clientSessionId).toBe('session_sintetico_1')
    expect(result?.id).toBe('company_1')
  })

  it('cookie antigo sem sessionId no payload retorna clientSessionId null, mas segue autorizando o acesso', async () => {
    vi.mocked(verifySessionCookie).mockReturnValue({ companyId: 'company_1', email: 'a@b.com', issuedAt: Date.now() })
    const result = await getClientSession(requestWithCookie('cookie-antigo'))
    expect(result).not.toBeNull()
    expect(result?.clientSessionId).toBeNull()
  })

  it('payload com sessionId de tipo inválido (não string) retorna clientSessionId null', async () => {
    vi.mocked(verifySessionCookie).mockReturnValue({ companyId: 'company_1', email: 'a@b.com', issuedAt: Date.now(), sessionId: 12345 as any })
    const result = await getClientSession(requestWithCookie('cookie-tipo-invalido'))
    expect(result?.clientSessionId).toBeNull()
  })

  it('payload com sessionId string vazia retorna clientSessionId null', async () => {
    vi.mocked(verifySessionCookie).mockReturnValue({ companyId: 'company_1', email: 'a@b.com', issuedAt: Date.now(), sessionId: '' })
    const result = await getClientSession(requestWithCookie('cookie-sessionid-vazio'))
    expect(result?.clientSessionId).toBeNull()
  })

  it('não faz nenhuma query em ClientSession — sessionId vem só do payload já autenticado pelo HMAC', async () => {
    vi.mocked(verifySessionCookie).mockReturnValue({ companyId: 'company_1', email: 'a@b.com', issuedAt: Date.now(), sessionId: 'session_sintetico_1' })
    await getClientSession(requestWithCookie('cookie-novo'))
    expect(prisma.company.findFirst).toHaveBeenCalledTimes(1)
    expect(Object.keys(prisma)).toEqual(['company'])
  })

  it('empresa cancelada nunca retornada mesmo com sessionId válido (filtro NOT status=cancelled na query)', async () => {
    vi.mocked(verifySessionCookie).mockReturnValue({ companyId: 'company_1', email: 'a@b.com', issuedAt: Date.now(), sessionId: 'session_sintetico_1' })
    await getClientSession(requestWithCookie('cookie-novo'))
    expect(prisma.company.findFirst).toHaveBeenCalledWith({
      where: { id: 'company_1', NOT: { status: 'cancelled' } },
      select: { id: true, status: true, razaoSocial: true, cnpj: true, documentsDeliveredAt: true },
    })
  })
})
