import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/clientAuth', () => ({
  getClientSession: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    document: { findUnique: vi.fn() },
    documentAccessLog: { create: vi.fn() },
  },
}))

vi.mock('@/lib/storage', () => ({
  storage: { download: vi.fn() },
}))

let GET: typeof import('./route').GET
let getClientSession: typeof import('@/lib/clientAuth').getClientSession
let prisma: typeof import('@/lib/prisma').prisma
let storage: typeof import('@/lib/storage').storage

beforeAll(async () => {
  ;({ GET } = await import('./route'))
  ;({ getClientSession } = await import('@/lib/clientAuth'))
  ;({ prisma } = await import('@/lib/prisma'))
  ;({ storage } = await import('@/lib/storage'))
})

const COMPANY = { id: 'company_1', status: 'active', razaoSocial: 'Empresa Teste', cnpj: '12345678000199' }
const PARAMS = { params: { id: 'doc_1' } }

const DOCUMENT_FIXTURE = {
  id: 'doc_1',
  companyId: 'company_1',
  tipoDocumento: 'pgr',
  nomeArquivo: 'PGR.pdf',
  storageKey: 'company_1/pgr/uuid-nao-previsivel',
}

function downloadRequest() {
  return new NextRequest('https://www.sublimesst.com/api/cliente/documents/doc_1/download')
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(storage.download).mockResolvedValue({ buffer: Buffer.from('%PDF-1.4\nconteudo'), contentType: 'application/pdf' })
  vi.mocked(prisma.documentAccessLog.create).mockResolvedValue({} as any)
})

describe('GET /api/cliente/documents/[id]/download', () => {
  it('sessão ausente ou expirada → 401, sem consultar documento', async () => {
    vi.mocked(getClientSession).mockResolvedValue(null)
    const res = await GET(downloadRequest(), PARAMS)
    expect(res.status).toBe(401)
    expect(prisma.document.findUnique).not.toHaveBeenCalled()
  })

  it('documento inexistente → 404', async () => {
    vi.mocked(getClientSession).mockResolvedValue(COMPANY as any)
    vi.mocked(prisma.document.findUnique).mockResolvedValue(null)
    const res = await GET(downloadRequest(), PARAMS)
    expect(res.status).toBe(404)
  })

  it('documento de outra empresa → 404 (isolamento por companyId), sem tocar storage', async () => {
    vi.mocked(getClientSession).mockResolvedValue(COMPANY as any)
    vi.mocked(prisma.document.findUnique).mockResolvedValue({ ...DOCUMENT_FIXTURE, companyId: 'company_outra' } as any)
    const res = await GET(downloadRequest(), PARAMS)
    expect(res.status).toBe(404)
    expect(storage.download).not.toHaveBeenCalled()
  })

  it('objeto ausente no storage → 404, sem criar log de acesso', async () => {
    vi.mocked(getClientSession).mockResolvedValue(COMPANY as any)
    vi.mocked(prisma.document.findUnique).mockResolvedValue(DOCUMENT_FIXTURE as any)
    vi.mocked(storage.download).mockResolvedValue(null)
    const res = await GET(downloadRequest(), PARAMS)
    expect(res.status).toBe(404)
    expect(prisma.documentAccessLog.create).not.toHaveBeenCalled()
  })

  it('download válido → 200 com cabeçalhos seguros', async () => {
    vi.mocked(getClientSession).mockResolvedValue(COMPANY as any)
    vi.mocked(prisma.document.findUnique).mockResolvedValue(DOCUMENT_FIXTURE as any)
    const res = await GET(downloadRequest(), PARAMS)
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Disposition')).toContain('PGR.pdf')
  })

  it('cria DocumentAccessLog com companyId, tipoDocumento e acao=download', async () => {
    vi.mocked(getClientSession).mockResolvedValue(COMPANY as any)
    vi.mocked(prisma.document.findUnique).mockResolvedValue(DOCUMENT_FIXTURE as any)
    await GET(downloadRequest(), PARAMS)
    expect(prisma.documentAccessLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        companyId: 'company_1',
        tipoDocumento: 'pgr',
        acao: 'download',
      }),
    })
  })

  it('nunca expõe dados de outra empresa (companyId da sessão nunca é substituído pelo do documento)', async () => {
    vi.mocked(getClientSession).mockResolvedValue(COMPANY as any)
    vi.mocked(prisma.document.findUnique).mockResolvedValue(DOCUMENT_FIXTURE as any)
    await GET(downloadRequest(), PARAMS)
    expect(prisma.document.findUnique).toHaveBeenCalledWith({ where: { id: 'doc_1' } })
  })
})
