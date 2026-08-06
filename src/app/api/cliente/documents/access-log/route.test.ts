import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/clientAuth', () => ({
  getClientSession: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    documentAccessLog: { create: vi.fn() },
  },
}))

let POST: typeof import('./route').POST
let getClientSession: typeof import('@/lib/clientAuth').getClientSession
let prisma: typeof import('@/lib/prisma').prisma

beforeAll(async () => {
  ;({ POST } = await import('./route'))
  ;({ getClientSession } = await import('@/lib/clientAuth'))
  ;({ prisma } = await import('@/lib/prisma'))
})

const COMPANY = { id: 'company_1', status: 'active', razaoSocial: 'Empresa Teste', cnpj: '12345678000199', clientSessionId: 'session_sintetico_1' }
const COMPANY_LEGACY_COOKIE = { ...COMPANY, clientSessionId: null }

function accessLogRequest(body: Record<string, unknown>) {
  return new NextRequest('https://www.sublimesst.com/api/cliente/documents/access-log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.documentAccessLog.create).mockResolvedValue({} as any)
})

describe('POST /api/cliente/documents/access-log', () => {
  it('sessão ausente → 401, sem criar log', async () => {
    vi.mocked(getClientSession).mockResolvedValue(null)
    const res = await POST(accessLogRequest({ tipoDocumento: 'pgr' }))
    expect(res.status).toBe(401)
    expect(prisma.documentAccessLog.create).not.toHaveBeenCalled()
  })

  it('tipoDocumento inválido → 400, sem criar log', async () => {
    vi.mocked(getClientSession).mockResolvedValue(COMPANY as any)
    const res = await POST(accessLogRequest({ tipoDocumento: 'raio_x' }))
    expect(res.status).toBe(400)
    expect(prisma.documentAccessLog.create).not.toHaveBeenCalled()
  })

  it('acao=view registrada corretamente, isolada pela empresa da sessão', async () => {
    vi.mocked(getClientSession).mockResolvedValue(COMPANY as any)
    const res = await POST(accessLogRequest({ tipoDocumento: 'pcmso', acao: 'view' }))
    expect(res.status).toBe(200)
    expect(prisma.documentAccessLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ companyId: 'company_1', tipoDocumento: 'pcmso', acao: 'view' }),
    })
  })

  it('acao padrão é download quando omitida', async () => {
    vi.mocked(getClientSession).mockResolvedValue(COMPANY as any)
    await POST(accessLogRequest({ tipoDocumento: 'ltcat' }))
    expect(prisma.documentAccessLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ acao: 'download' }),
    })
  })

  it('nunca usa companyId vindo do corpo — sempre o da sessão autenticada', async () => {
    vi.mocked(getClientSession).mockResolvedValue(COMPANY as any)
    await POST(accessLogRequest({ tipoDocumento: 'pgr', companyId: 'company_outra' }))
    expect(prisma.documentAccessLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ companyId: 'company_1' }),
    })
  })

  it('cookie novo (com clientSessionId) grava sessionId igual ao id sintético da sessão', async () => {
    vi.mocked(getClientSession).mockResolvedValue(COMPANY as any)
    await POST(accessLogRequest({ tipoDocumento: 'pgr' }))
    expect(prisma.documentAccessLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ sessionId: 'session_sintetico_1' }),
    })
  })

  it('cookie antigo (sem clientSessionId) grava sessionId null, sem bloquear o registro', async () => {
    vi.mocked(getClientSession).mockResolvedValue(COMPANY_LEGACY_COOKIE as any)
    const res = await POST(accessLogRequest({ tipoDocumento: 'pgr' }))
    expect(res.status).toBe(200)
    expect(prisma.documentAccessLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ sessionId: null }),
    })
  })

  it('não aceita sessionId vindo do corpo da requisição — sempre o da sessão autenticada', async () => {
    vi.mocked(getClientSession).mockResolvedValue(COMPANY as any)
    await POST(accessLogRequest({ tipoDocumento: 'pgr', sessionId: 'session_forjado' }))
    expect(prisma.documentAccessLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ sessionId: 'session_sintetico_1' }),
    })
  })

  it('resposta HTTP nunca expõe o sessionId', async () => {
    vi.mocked(getClientSession).mockResolvedValue(COMPANY as any)
    const res = await POST(accessLogRequest({ tipoDocumento: 'pgr' }))
    const body = await res.json()
    expect(JSON.stringify(body)).not.toContain('session_sintetico_1')
  })
})
