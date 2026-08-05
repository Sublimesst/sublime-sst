import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/adminAuth', () => ({
  verifyAdminSecret: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    company: { findUnique: vi.fn() },
    document: { findMany: vi.fn(), create: vi.fn() },
  },
}))

vi.mock('@/lib/storage', () => ({
  storage: { upload: vi.fn(), download: vi.fn(), delete: vi.fn() },
}))

let GET: typeof import('./route').GET
let POST: typeof import('./route').POST
let verifyAdminSecret: typeof import('@/lib/adminAuth').verifyAdminSecret
let prisma: typeof import('@/lib/prisma').prisma
let storage: typeof import('@/lib/storage').storage

beforeAll(async () => {
  ;({ GET, POST } = await import('./route'))
  ;({ verifyAdminSecret } = await import('@/lib/adminAuth'))
  ;({ prisma } = await import('@/lib/prisma'))
  ;({ storage } = await import('@/lib/storage'))
})

const PARAMS = { params: { id: 'company_1' } }
const COMPANY_FIXTURE = { id: 'company_1', razaoSocial: 'Empresa Teste' }

function syntheticPdf(name = 'documento.pdf', type = 'application/pdf') {
  return new File(['%PDF-1.4\n' + '0'.repeat(50)], name, { type })
}

function uploadRequest(form: FormData, secret = 'correct-secret') {
  return new NextRequest('https://www.sublimesst.com/api/admin/empresas/company_1/documents', {
    method: 'POST',
    headers: secret ? { 'x-admin-secret': secret } : {},
    body: form,
  })
}

function listRequest(secret = 'correct-secret') {
  return new NextRequest('https://www.sublimesst.com/api/admin/empresas/company_1/documents', {
    headers: secret ? { 'x-admin-secret': secret } : {},
  })
}

const noopConsoleError = () => vi.spyOn(console, 'error').mockImplementation(() => {})

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(verifyAdminSecret).mockReturnValue(true)
  vi.mocked(prisma.company.findUnique).mockResolvedValue(COMPANY_FIXTURE as any)
  vi.mocked(storage.upload).mockResolvedValue(undefined)
  vi.mocked(storage.delete).mockResolvedValue(undefined)
})

describe('GET /api/admin/empresas/[id]/documents', () => {
  it('sem admin secret válido → 401, sem consultar Prisma', async () => {
    vi.mocked(verifyAdminSecret).mockReturnValue(false)
    const res = await GET(listRequest('wrong'), PARAMS)
    expect(res.status).toBe(401)
    expect(prisma.document.findMany).not.toHaveBeenCalled()
  })

  it('lista restrita à empresa do parâmetro da rota', async () => {
    vi.mocked(prisma.document.findMany).mockResolvedValue([])
    await GET(listRequest(), PARAMS)
    expect(prisma.document.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { companyId: 'company_1' },
    }))
  })

  it('empresa sem documentos retorna lista vazia', async () => {
    vi.mocked(prisma.document.findMany).mockResolvedValue([])
    const res = await GET(listRequest(), PARAMS)
    const body = await res.json()
    expect(body.data).toEqual([])
  })

  it('não expõe storageKey nem storageProvider na seleção', async () => {
    vi.mocked(prisma.document.findMany).mockResolvedValue([])
    await GET(listRequest(), PARAMS)
    const call = vi.mocked(prisma.document.findMany).mock.calls[0][0] as any
    expect(call.select.storageKey).toBeUndefined()
    expect(call.select.storageProvider).toBeUndefined()
  })

  it('preserva ordenação por uploadedAt desc', async () => {
    vi.mocked(prisma.document.findMany).mockResolvedValue([])
    await GET(listRequest(), PARAMS)
    expect(prisma.document.findMany).toHaveBeenCalledWith(expect.objectContaining({
      orderBy: { uploadedAt: 'desc' },
    }))
  })
})

describe('POST /api/admin/empresas/[id]/documents — upload', () => {
  it('sem admin secret válido → 401, sem tocar company/storage', async () => {
    vi.mocked(verifyAdminSecret).mockReturnValue(false)
    const form = new FormData()
    form.set('file', syntheticPdf())
    form.set('tipoDocumento', 'pgr')
    const res = await POST(uploadRequest(form, 'wrong'), PARAMS)
    expect(res.status).toBe(401)
    expect(prisma.company.findUnique).not.toHaveBeenCalled()
    expect(storage.upload).not.toHaveBeenCalled()
  })

  it('empresa inexistente → 404, sem tocar storage', async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue(null)
    const form = new FormData()
    form.set('file', syntheticPdf())
    form.set('tipoDocumento', 'pgr')
    const res = await POST(uploadRequest(form), PARAMS)
    expect(res.status).toBe(404)
    expect(storage.upload).not.toHaveBeenCalled()
  })

  it('tipo documental desconhecido → 400, sem tocar storage', async () => {
    const form = new FormData()
    form.set('file', syntheticPdf())
    form.set('tipoDocumento', 'raio_x')
    const res = await POST(uploadRequest(form), PARAMS)
    expect(res.status).toBe(400)
    expect(storage.upload).not.toHaveBeenCalled()
  })

  it('tentativa de upload manual de contrato → 400, rejeitado como tipo inválido', async () => {
    const form = new FormData()
    form.set('file', syntheticPdf())
    form.set('tipoDocumento', 'contrato')
    const res = await POST(uploadRequest(form), PARAMS)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.code).toBe('invalid_tipo')
    expect(storage.upload).not.toHaveBeenCalled()
    expect(prisma.document.create).not.toHaveBeenCalled()
  })

  it('ausência de arquivo → 400', async () => {
    const form = new FormData()
    form.set('tipoDocumento', 'pgr')
    const res = await POST(uploadRequest(form), PARAMS)
    expect(res.status).toBe(400)
    expect(storage.upload).not.toHaveBeenCalled()
  })

  it('arquivo vazio → 400', async () => {
    const form = new FormData()
    form.set('file', new File([], 'documento.pdf', { type: 'application/pdf' }))
    form.set('tipoDocumento', 'pgr')
    const res = await POST(uploadRequest(form), PARAMS)
    expect(res.status).toBe(400)
    expect(storage.upload).not.toHaveBeenCalled()
  })

  it('arquivo acima de 10 MiB → 400', async () => {
    const big = new Uint8Array(10 * 1024 * 1024 + 1)
    const form = new FormData()
    form.set('file', new File([big], 'documento.pdf', { type: 'application/pdf' }))
    form.set('tipoDocumento', 'pgr')
    const res = await POST(uploadRequest(form), PARAMS)
    expect(res.status).toBe(400)
    expect(storage.upload).not.toHaveBeenCalled()
  })

  it('MIME incorreto → 400', async () => {
    const form = new FormData()
    form.set('file', syntheticPdf('documento.pdf', 'image/png'))
    form.set('tipoDocumento', 'pgr')
    const res = await POST(uploadRequest(form), PARAMS)
    expect(res.status).toBe(400)
  })

  it('extensão incorreta → 400', async () => {
    const form = new FormData()
    form.set('file', syntheticPdf('documento.exe'))
    form.set('tipoDocumento', 'pgr')
    const res = await POST(uploadRequest(form), PARAMS)
    expect(res.status).toBe(400)
  })

  it('nome com tentativa de quebra de header ou caminho → 400', async () => {
    const form = new FormData()
    form.set('file', syntheticPdf('../a.pdf\r\nX-Injected: 1'))
    form.set('tipoDocumento', 'pgr')
    const res = await POST(uploadRequest(form), PARAMS)
    expect(res.status).toBe(400)
  })

  it('arquivo sem assinatura %PDF- (disfarçado) → 400', async () => {
    const form = new FormData()
    form.set('file', new File(['isto não é um pdf'], 'documento.pdf', { type: 'application/pdf' }))
    form.set('tipoDocumento', 'pgr')
    const res = await POST(uploadRequest(form), PARAMS)
    expect(res.status).toBe(400)
    expect(storage.upload).not.toHaveBeenCalled()
  })

  it('PDF sintético válido → 201, grava no storage com chave isolada por empresa e cria Document', async () => {
    vi.mocked(prisma.document.create).mockResolvedValue({
      id: 'doc_1', tipoDocumento: 'pgr', nomeArquivo: 'documento.pdf', mimeType: 'application/pdf',
      tamanhoBytes: 59, uploadedBy: null, uploadedAt: new Date('2026-08-05T12:00:00Z'),
    } as any)
    const form = new FormData()
    form.set('file', syntheticPdf())
    form.set('tipoDocumento', 'pgr')
    const res = await POST(uploadRequest(form), PARAMS)
    const body = await res.json()
    expect(res.status).toBe(201)
    expect(body.success).toBe(true)
    expect(body.data.id).toBe('doc_1')
    expect(body.data.storageKey).toBeUndefined()

    const uploadCall = vi.mocked(storage.upload).mock.calls[0]
    const key = uploadCall[0] as string
    expect(key.startsWith('company_1/pgr/')).toBe(true)
    expect(key).not.toBe('company_1/pgr/') // tem um sufixo não previsível
  })

  it('companyId do corpo da requisição nunca prevalece sobre o parâmetro da rota', async () => {
    vi.mocked(prisma.document.create).mockResolvedValue({
      id: 'doc_1', tipoDocumento: 'pgr', nomeArquivo: 'documento.pdf', mimeType: 'application/pdf',
      tamanhoBytes: 59, uploadedBy: null, uploadedAt: new Date(),
    } as any)
    const form = new FormData()
    form.set('file', syntheticPdf())
    form.set('tipoDocumento', 'pgr')
    form.set('companyId', 'company_outra') // tentativa de override — deve ser ignorada
    await POST(uploadRequest(form), PARAMS)
    expect(prisma.company.findUnique).toHaveBeenCalledWith({ where: { id: 'company_1' } })
    const createCall = vi.mocked(prisma.document.create).mock.calls[0][0] as any
    expect(createCall.data.companyId).toBe('company_1')
  })

  it('falha de storage.upload → 500 sanitizado, sem document.create, sem storage.delete, log só o código fixo', async () => {
    const errSpy = noopConsoleError()
    vi.mocked(storage.upload).mockRejectedValue(new Error('storage indisponível (detalhe interno do provider)'))
    const form = new FormData()
    form.set('file', syntheticPdf())
    form.set('tipoDocumento', 'pgr')
    const res = await POST(uploadRequest(form), PARAMS)
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.success).toBe(false)
    expect(body.error).toBe('Falha ao processar o upload. Tente novamente.')
    expect(prisma.document.create).not.toHaveBeenCalled()
    expect(storage.delete).not.toHaveBeenCalled()

    expect(errSpy).toHaveBeenCalledTimes(1)
    expect(errSpy).toHaveBeenCalledWith('document_upload_storage_failed')
    const loggedText = errSpy.mock.calls.flat().map(String).join(' ')
    expect(loggedText).not.toMatch(/company_1/)
    expect(loggedText).not.toMatch(/storage indisponível/)
    expect(loggedText).not.toContain('pgr')
    errSpy.mockRestore()
  })

  it('falha ao criar Document → compensação executada (storage.delete chamado com a mesma chave), 500 sanitizado, log só o código fixo de persistência', async () => {
    const errSpy = noopConsoleError()
    vi.mocked(prisma.document.create).mockRejectedValue(new Error('constraint violation on column companyId'))
    const form = new FormData()
    form.set('file', syntheticPdf())
    form.set('tipoDocumento', 'pgr')
    const res = await POST(uploadRequest(form), PARAMS)
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.success).toBe(false)
    expect(body.error).toBe('Falha ao processar o upload. Tente novamente.')

    const uploadKey = vi.mocked(storage.upload).mock.calls[0][0]
    const deleteKey = vi.mocked(storage.delete).mock.calls[0][0]
    expect(deleteKey).toBe(uploadKey)

    expect(errSpy).toHaveBeenCalledTimes(1)
    expect(errSpy).toHaveBeenCalledWith('document_upload_persistence_failed')
    const loggedText = errSpy.mock.calls.flat().map(String).join(' ')
    expect(loggedText).not.toMatch(/company_1/)
    expect(loggedText).not.toMatch(/constraint violation/)
    expect(loggedText).not.toContain(String(uploadKey))
    errSpy.mockRestore()
  })

  it('falha ao criar Document + falha na compensação → ainda 500, log traz os dois códigos fixos sem identificadores nem mensagem bruta do delete', async () => {
    const errSpy = noopConsoleError()
    vi.mocked(prisma.document.create).mockRejectedValue(new Error('db down (host interno)'))
    vi.mocked(storage.delete).mockRejectedValue(new Error('storage também down (detalhe interno)'))
    const form = new FormData()
    form.set('file', syntheticPdf())
    form.set('tipoDocumento', 'pgr')
    const res = await POST(uploadRequest(form), PARAMS)
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.success).toBe(false)
    expect(JSON.stringify(body)).not.toMatch(/db down|storage também down/)

    expect(errSpy).toHaveBeenCalledTimes(2)
    expect(errSpy).toHaveBeenNthCalledWith(1, 'document_upload_persistence_failed')
    expect(errSpy).toHaveBeenNthCalledWith(2, 'document_upload_compensation_failed')
    const loggedText = errSpy.mock.calls.flat().map(String).join(' ')
    expect(loggedText).not.toMatch(/company_1/)
    expect(loggedText).not.toMatch(/db down|storage também down/)
    errSpy.mockRestore()
  })

  it('sucesso permanece inalterado após a correção de logs/storage', async () => {
    vi.mocked(prisma.document.create).mockResolvedValue({
      id: 'doc_1', tipoDocumento: 'pgr', nomeArquivo: 'documento.pdf', mimeType: 'application/pdf',
      tamanhoBytes: 59, uploadedBy: null, uploadedAt: new Date('2026-08-05T12:00:00Z'),
    } as any)
    const form = new FormData()
    form.set('file', syntheticPdf())
    form.set('tipoDocumento', 'pgr')
    const res = await POST(uploadRequest(form), PARAMS)
    const body = await res.json()
    expect(res.status).toBe(201)
    expect(body.success).toBe(true)
    expect(storage.delete).not.toHaveBeenCalled()
  })
})
