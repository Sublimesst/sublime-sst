import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('./sessionCookie', () => ({
  verifySessionCookie: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    partner: { findFirst: vi.fn() },
  },
}))

let getPartnerSession: typeof import('./partnerAuth').getPartnerSession
let verifySessionCookie: typeof import('./sessionCookie').verifySessionCookie
let prisma: typeof import('@/lib/prisma').prisma

beforeAll(async () => {
  ;({ getPartnerSession } = await import('./partnerAuth'))
  ;({ verifySessionCookie } = await import('./sessionCookie'))
  ;({ prisma } = await import('@/lib/prisma'))
})

const ACTIVE_PARTNER_ROW = { id: 'partner_1', name: 'Fulano', code: 'code_abc', email: 'a@b.com', tier: 'comum', status: 'active' }

function requestWithCookie(value?: string) {
  const req = new NextRequest('https://www.sublimesst.com/parceiro/dashboard')
  if (value) req.cookies.set('sublime_partner', value)
  return req
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.partner.findFirst).mockResolvedValue(ACTIVE_PARTNER_ROW as any)
})

describe('getPartnerSession', () => {
  it('cookie ausente → null, sem consultar Partner', async () => {
    vi.mocked(verifySessionCookie).mockReturnValue(null)
    const result = await getPartnerSession(requestWithCookie())
    expect(result).toBeNull()
    expect(prisma.partner.findFirst).not.toHaveBeenCalled()
  })

  it('cookie inválido (assinatura não confere) → null', async () => {
    vi.mocked(verifySessionCookie).mockReturnValue(null)
    const result = await getPartnerSession(requestWithCookie('cookie-invalido'))
    expect(result).toBeNull()
  })

  it('cookie válido, Partner ativo → sessão autorizada', async () => {
    vi.mocked(verifySessionCookie).mockReturnValue({ partnerId: 'partner_1', email: 'a@b.com', issuedAt: Date.now() })
    const result = await getPartnerSession(requestWithCookie('cookie-valido'))
    expect(result?.id).toBe('partner_1')
    expect(result?.status).toBe('active')
  })

  // Hardening de revogação: um parceiro inativado pelo Admin perde acesso ao
  // portal imediatamente, mesmo com um cookie de sessão (assinado, válido,
  // não expirado) ainda em mãos — a query revalida status:'active' no banco
  // a cada request, nunca confia só no payload do cookie.
  it('Partner existe mas está inactive → null (revogação de acesso)', async () => {
    vi.mocked(verifySessionCookie).mockReturnValue({ partnerId: 'partner_1', email: 'a@b.com', issuedAt: Date.now() })
    vi.mocked(prisma.partner.findFirst).mockResolvedValue(null) // findFirst filtra status:'active' na query real
    const result = await getPartnerSession(requestWithCookie('cookie-de-inativado'))
    expect(result).toBeNull()
  })

  it('Partner existe mas está pending (ainda não ativado) → null', async () => {
    vi.mocked(verifySessionCookie).mockReturnValue({ partnerId: 'partner_2', email: 'b@c.com', issuedAt: Date.now() })
    vi.mocked(prisma.partner.findFirst).mockResolvedValue(null)
    const result = await getPartnerSession(requestWithCookie('cookie-de-pendente'))
    expect(result).toBeNull()
  })

  it('consulta sempre filtra por status active no banco, nunca confia só no payload assinado', async () => {
    vi.mocked(verifySessionCookie).mockReturnValue({ partnerId: 'partner_1', email: 'a@b.com', issuedAt: Date.now() })
    await getPartnerSession(requestWithCookie('cookie-valido'))
    expect(prisma.partner.findFirst).toHaveBeenCalledWith({
      where: { id: 'partner_1', status: 'active' },
      select: { id: true, name: true, code: true, email: true, tier: true, status: true },
    })
  })

  it('payload sem partnerId → null, sem consultar Partner', async () => {
    vi.mocked(verifySessionCookie).mockReturnValue({ email: 'a@b.com', issuedAt: Date.now() } as any)
    const result = await getPartnerSession(requestWithCookie('cookie-sem-partnerid'))
    expect(result).toBeNull()
    expect(prisma.partner.findFirst).not.toHaveBeenCalled()
  })
})
