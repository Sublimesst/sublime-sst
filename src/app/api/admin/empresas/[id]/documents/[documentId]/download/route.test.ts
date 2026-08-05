import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/adminAuth', () => ({
  verifyAdminSecret: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    document: { findFirst: vi.fn() },
    documentAccessLog: { create: vi.fn() },
  },
}))

vi.mock('@/lib/storage', () => ({
  storage: { download: vi.fn() },
}))

let GET: typeof import('./route').GET
let verifyAdminSecret: typeof import('@/lib/adminAuth').verifyAdminSecret
let prisma: typeof import('@/lib/prisma').prisma
let storage: typeof import('@/lib/storage').storage

beforeAll(async () => {
  ;({ GET } = await import('./route'))
  ;({ verifyAdminSecret } = await import('@/lib/adminAuth'))
  ;({ prisma } = await import('@/lib/prisma'))
  ;({ storage } = await import('@/lib/storage'))
})

const PARAMS = { params: { id: 'company_1', documentId: 'doc_1' } }

const DOCUMENT_FIXTURE = {
  id: 'doc_1',
  companyId: 'company_1',
  tipoDocumento: 'pgr',
  nomeArquivo: 'PGR Empresa Teste.pdf',
  storageKey: 'company_1/pgr/uuid-nao-previsivel',
}

function downloadRequest(secret = 'correct-secret') {
  return new NextRequest('https://www.sublimesst.com/api/admin/empresas/company_1/documents/doc_1/download', {
    headers: secret ? { 'x-admin-secret': secret } : {},
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(verifyAdminSecret).mockReturnValue(true)
  vi.mocked(prisma.document.findFirst).mockResolvedValue(DOCUMENT_FIXTURE as any)
  vi.mocked(storage.download).mockResolvedValue({ buffer: Buffer.from('%PDF-1.4\nconteudo'), contentType: 'application/pdf' })
  vi.mocked(prisma.documentAccessLog.create).mockResolvedValue({} as any)
})

describe('GET /api/admin/empresas/[id]/documents/[documentId]/download', () => {
  it('sem admin secret → 401, sem consultar Prisma nem storage', async () => {
    vi.mocked(verifyAdminSecret).mockReturnValue(false)
    const res = await GET(downloadRequest('wrong'), PARAMS)
    expect(res.status).toBe(401)
    expect(prisma.document.findFirst).not.toHaveBeenCalled()
    expect(storage.download).not.toHaveBeenCalled()
  })

  it('secret ausente → 401', async () => {
    vi.mocked(verifyAdminSecret).mockReturnValue(false)
    const res = await GET(downloadRequest(''), PARAMS)
    expect(res.status).toBe(401)
  })

  it('documento inexistente → 404', async () => {
    vi.mocked(prisma.document.findFirst).mockResolvedValue(null)
    const res = await GET(downloadRequest(), PARAMS)
    expect(res.status).toBe(404)
    expect(storage.download).not.toHaveBeenCalled()
  })

  it('documento de outra empresa → 404 (busca por id e companyId juntos, nunca por id isolado)', async () => {
    vi.mocked(prisma.document.findFirst).mockResolvedValue(null)
    await GET(downloadRequest(), { params: { id: 'company_2', documentId: 'doc_1' } })
    expect(prisma.document.findFirst).toHaveBeenCalledWith({
      where: { id: 'doc_1', companyId: 'company_2' },
    })
  })

  it('objeto ausente no storage → 404, sem criar log de acesso', async () => {
    vi.mocked(storage.download).mockResolvedValue(null)
    const res = await GET(downloadRequest(), PARAMS)
    expect(res.status).toBe(404)
    expect(prisma.documentAccessLog.create).not.toHaveBeenCalled()
  })

  it('download válido → 200 com os bytes corretos', async () => {
    const res = await GET(downloadRequest(), PARAMS)
    expect(res.status).toBe(200)
    const buf = Buffer.from(await res.arrayBuffer())
    expect(buf.toString()).toBe('%PDF-1.4\nconteudo')
  })

  it('cabeçalhos seguros: Content-Type application/pdf, Content-Length e Content-Disposition com nome sanitizado', async () => {
    const res = await GET(downloadRequest(), PARAMS)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
    expect(res.headers.get('Content-Length')).toBe(String(Buffer.from('%PDF-1.4\nconteudo').length))
    expect(res.headers.get('Content-Disposition')).toContain('attachment')
    expect(res.headers.get('Content-Disposition')).toContain('PGR Empresa Teste.pdf')
  })

  it('cabeçalhos anti-cache: Cache-Control e X-Content-Type-Options em um download válido', async () => {
    const res = await GET(downloadRequest(), PARAMS)
    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toBe('private, no-store, max-age=0')
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
    // cabeçalhos anteriores preservados junto com os novos
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
    expect(res.headers.get('Content-Length')).toBe(String(Buffer.from('%PDF-1.4\nconteudo').length))
    expect(res.headers.get('Content-Disposition')).toContain('PGR Empresa Teste.pdf')
    const buf = Buffer.from(await res.arrayBuffer())
    expect(buf.toString()).toBe('%PDF-1.4\nconteudo')
  })

  it('nome de arquivo com CR/LF/aspas é sanitizado no header', async () => {
    vi.mocked(prisma.document.findFirst).mockResolvedValue({
      ...DOCUMENT_FIXTURE, nomeArquivo: 'a.pdf\r\nX-Injected: 1"',
    } as any)
    const res = await GET(downloadRequest(), PARAMS)
    const disposition = res.headers.get('Content-Disposition') ?? ''
    expect(disposition).not.toMatch(/[\r\n]/)
    expect(disposition).not.toContain('"1"') // aspas internas removidas
  })

  it('nunca expõe storageKey na resposta', async () => {
    const res = await GET(downloadRequest(), PARAMS)
    const headersDump = JSON.stringify(Object.fromEntries(res.headers.entries()))
    expect(headersDump).not.toContain(DOCUMENT_FIXTURE.storageKey)
  })

  it('registra DocumentAccessLog com sessionId null (acesso administrativo), companyId, tipoDocumento e acao=download', async () => {
    await GET(downloadRequest(), PARAMS)
    expect(prisma.documentAccessLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        companyId: 'company_1',
        sessionId: null,
        tipoDocumento: 'pgr',
        nomeDocumento: 'PGR Empresa Teste.pdf',
        acao: 'download',
      }),
    })
  })

  it('log de acesso é registrado antes da resposta ser concluída (mesma ordem do fluxo do cliente)', async () => {
    const order: string[] = []
    vi.mocked(prisma.documentAccessLog.create).mockImplementation((async () => {
      order.push('log')
      return {} as any
    }) as any)
    vi.mocked(storage.download).mockImplementation(async () => {
      order.push('download')
      return { buffer: Buffer.from('%PDF-1.4\n'), contentType: 'application/pdf' }
    })
    await GET(downloadRequest(), PARAMS)
    expect(order).toEqual(['download', 'log'])
  })
})
