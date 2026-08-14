import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/clientAuth', () => ({
  getClientSession: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    document: { findMany: vi.fn() },
  },
}))

let GET: typeof import('./route').GET
let getClientSession: typeof import('@/lib/clientAuth').getClientSession
let prisma: typeof import('@/lib/prisma').prisma

beforeAll(async () => {
  ;({ GET } = await import('./route'))
  ;({ getClientSession } = await import('@/lib/clientAuth'))
  ;({ prisma } = await import('@/lib/prisma'))
})

const COMPANY = { id: 'company_1', status: 'active', razaoSocial: 'Empresa Teste', cnpj: '12345678000199', documentsDeliveredAt: new Date('2026-08-01') }
const COMPANY_NOT_DELIVERED = { ...COMPANY, documentsDeliveredAt: null }

function listRequest() {
  return new NextRequest('https://www.sublimesst.com/api/cliente/documents')
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/cliente/documents', () => {
  it('sessão ausente → 401, sem consultar Prisma', async () => {
    vi.mocked(getClientSession).mockResolvedValue(null)
    const res = await GET(listRequest())
    expect(res.status).toBe(401)
    expect(prisma.document.findMany).not.toHaveBeenCalled()
  })

  it('sessão válida → lista restrita à própria empresa', async () => {
    vi.mocked(getClientSession).mockResolvedValue(COMPANY as any)
    vi.mocked(prisma.document.findMany).mockResolvedValue([])
    await GET(listRequest())
    expect(prisma.document.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { companyId: 'company_1' },
    }))
  })

  it('não seleciona storageKey nem storageProvider (nenhum dado de outra empresa exposto)', async () => {
    vi.mocked(getClientSession).mockResolvedValue(COMPANY as any)
    vi.mocked(prisma.document.findMany).mockResolvedValue([])
    await GET(listRequest())
    const call = vi.mocked(prisma.document.findMany).mock.calls[0][0] as any
    expect(call.select.storageKey).toBeUndefined()
    expect(call.select.storageProvider).toBeUndefined()
    expect(call.select.companyId).toBeUndefined()
  })

  it('empresa sem documentos retorna lista vazia', async () => {
    vi.mocked(getClientSession).mockResolvedValue(COMPANY as any)
    vi.mocked(prisma.document.findMany).mockResolvedValue([])
    const res = await GET(listRequest())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data).toEqual([])
  })

  it('antes da entrega formal (documentsDeliveredAt null): documento técnico não listado, contrato continua listado', async () => {
    vi.mocked(getClientSession).mockResolvedValue(COMPANY_NOT_DELIVERED as any)
    vi.mocked(prisma.document.findMany).mockResolvedValue([
      { id: 'doc_pgr', tipoDocumento: 'pgr', nomeArquivo: 'PGR.pdf', tamanhoBytes: 100, uploadedAt: new Date() },
      { id: 'doc_contrato', tipoDocumento: 'contrato', nomeArquivo: 'Contrato.pdf', tamanhoBytes: 100, uploadedAt: new Date() },
    ] as any)
    const res = await GET(listRequest())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.map((d: any) => d.id)).toEqual(['doc_contrato'])
  })

  it('depois da entrega formal (documentsDeliveredAt preenchido): documento técnico listado normalmente', async () => {
    vi.mocked(getClientSession).mockResolvedValue(COMPANY as any)
    vi.mocked(prisma.document.findMany).mockResolvedValue([
      { id: 'doc_pgr', tipoDocumento: 'pgr', nomeArquivo: 'PGR.pdf', tamanhoBytes: 100, uploadedAt: new Date() },
    ] as any)
    const res = await GET(listRequest())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.map((d: any) => d.id)).toEqual(['doc_pgr'])
  })
})
