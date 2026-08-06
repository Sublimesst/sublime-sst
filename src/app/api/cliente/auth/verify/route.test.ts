import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    clientSession: { findUnique: vi.fn(), update: vi.fn() },
  },
}))

vi.mock('@/lib/sessionCookie', () => ({
  signSessionCookie: vi.fn(() => 'cookie-assinado-sintetico'),
}))

let GET: typeof import('./route').GET
let prisma: typeof import('@/lib/prisma').prisma
let signSessionCookie: typeof import('@/lib/sessionCookie').signSessionCookie

beforeAll(async () => {
  ;({ GET } = await import('./route'))
  ;({ prisma } = await import('@/lib/prisma'))
  ;({ signSessionCookie } = await import('@/lib/sessionCookie'))
})

const SESSION_FIXTURE = {
  id: 'session_sintetico_1',
  companyId: 'company_1',
  token: 'token_bruto_sintetico',
  email: 'cliente@teste.com',
  expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  usedAt: null as Date | null,
}

function verifyRequest(token?: string) {
  const url = token
    ? `https://www.sublimesst.com/api/cliente/auth/verify?token=${token}`
    : 'https://www.sublimesst.com/api/cliente/auth/verify'
  return new NextRequest(url)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(signSessionCookie).mockReturnValue('cookie-assinado-sintetico')
  vi.mocked(prisma.clientSession.findUnique).mockResolvedValue(SESSION_FIXTURE as any)
  vi.mocked(prisma.clientSession.update).mockResolvedValue({ ...SESSION_FIXTURE, usedAt: new Date() } as any)
})

describe('GET /api/cliente/auth/verify', () => {
  it('token ausente → redirect para login com error=token_missing, sem consultar o banco', async () => {
    const res = await GET(verifyRequest())
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/cliente/login?error=token_missing')
    expect(prisma.clientSession.findUnique).not.toHaveBeenCalled()
  })

  it('token inexistente → redirect com error=token_invalid, sem assinar cookie', async () => {
    vi.mocked(prisma.clientSession.findUnique).mockResolvedValue(null)
    const res = await GET(verifyRequest('token_qualquer'))
    expect(res.headers.get('location')).toContain('/cliente/login?error=token_invalid')
    expect(signSessionCookie).not.toHaveBeenCalled()
  })

  it('token já usado → redirect com error=token_invalid, sem assinar cookie', async () => {
    vi.mocked(prisma.clientSession.findUnique).mockResolvedValue({ ...SESSION_FIXTURE, usedAt: new Date() } as any)
    const res = await GET(verifyRequest('token_usado'))
    expect(res.headers.get('location')).toContain('error=token_invalid')
    expect(signSessionCookie).not.toHaveBeenCalled()
  })

  it('token expirado → redirect com error=token_invalid, sem assinar cookie', async () => {
    vi.mocked(prisma.clientSession.findUnique).mockResolvedValue({
      ...SESSION_FIXTURE, expiresAt: new Date(Date.now() - 1000),
    } as any)
    const res = await GET(verifyRequest('token_expirado'))
    expect(res.headers.get('location')).toContain('error=token_invalid')
    expect(signSessionCookie).not.toHaveBeenCalled()
  })

  it('token válido → marca usedAt e redireciona para o dashboard', async () => {
    const res = await GET(verifyRequest('token_valido'))
    expect(prisma.clientSession.update).toHaveBeenCalledWith({
      where: { token: 'token_valido' },
      data: { usedAt: expect.any(Date) },
    })
    expect(res.headers.get('location')).toContain('/cliente/dashboard')
  })

  it('token válido → cookie assinado inclui sessionId igual ao id da ClientSession', async () => {
    await GET(verifyRequest('token_valido'))
    expect(signSessionCookie).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company_1',
        email: 'cliente@teste.com',
        sessionId: 'session_sintetico_1',
      }),
      expect.any(Number)
    )
  })

  it('sessionId nunca aparece na URL de redirect', async () => {
    const res = await GET(verifyRequest('token_valido'))
    expect(res.headers.get('location') ?? '').not.toContain('session_sintetico_1')
  })

  it('flags do cookie permanecem inalteradas (httpOnly, sameSite=strict, path=/, maxAge de 30 dias)', async () => {
    const res = await GET(verifyRequest('token_valido'))
    const setCookie = res.cookies.get('sublime_client')
    expect(setCookie?.httpOnly).toBe(true)
    expect(setCookie?.sameSite).toBe('strict')
    expect(setCookie?.path).toBe('/')
    expect(setCookie?.maxAge).toBe(60 * 60 * 24 * 30)
  })

  it('nunca reconsulta a ClientSession pelo token bruto mais de uma vez (findUnique chamado só 1x)', async () => {
    await GET(verifyRequest('token_valido'))
    expect(prisma.clientSession.findUnique).toHaveBeenCalledTimes(1)
  })
})
