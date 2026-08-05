import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    dbStorageObject: { upsert: vi.fn(), findUnique: vi.fn(), deleteMany: vi.fn() },
  },
}))

let DbStorageProvider: typeof import('./dbProvider').DbStorageProvider
let prisma: typeof import('@/lib/prisma').prisma

beforeAll(async () => {
  ;({ DbStorageProvider } = await import('./dbProvider'))
  ;({ prisma } = await import('@/lib/prisma'))
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('DbStorageProvider', () => {
  it('upload grava a chave, os bytes e o content type via upsert (create+update)', async () => {
    const provider = new DbStorageProvider()
    const buffer = Buffer.from('conteudo sintetico')
    await provider.upload('empresa_1/pgr/chave-nao-previsivel', buffer, 'application/pdf')

    expect(prisma.dbStorageObject.upsert).toHaveBeenCalledWith({
      where: { key: 'empresa_1/pgr/chave-nao-previsivel' },
      create: { key: 'empresa_1/pgr/chave-nao-previsivel', data: buffer, contentType: 'application/pdf' },
      update: { data: buffer, contentType: 'application/pdf' },
    })
  })

  it('download retorna buffer e content type quando a chave existe', async () => {
    const provider = new DbStorageProvider()
    vi.mocked(prisma.dbStorageObject.findUnique).mockResolvedValue({
      key: 'k1', data: Buffer.from('bytes originais'), contentType: 'application/pdf', createdAt: new Date(),
    } as any)

    const result = await provider.download('k1')
    expect(result?.contentType).toBe('application/pdf')
    expect(result?.buffer.toString()).toBe('bytes originais')
  })

  it('download retorna null quando a chave não existe', async () => {
    const provider = new DbStorageProvider()
    vi.mocked(prisma.dbStorageObject.findUnique).mockResolvedValue(null)

    const result = await provider.download('chave_inexistente')
    expect(result).toBeNull()
  })

  it('delete remove pela chave', async () => {
    const provider = new DbStorageProvider()
    await provider.delete('k1')
    expect(prisma.dbStorageObject.deleteMany).toHaveBeenCalledWith({ where: { key: 'k1' } })
  })

  it('preserva os bytes exatos entre upload e download (round-trip)', async () => {
    const provider = new DbStorageProvider()
    const original = Buffer.from([0, 1, 2, 255, 254, 253, 37, 80, 68, 70]) // inclui bytes binários arbitrários
    let stored: Buffer | null = null
    vi.mocked(prisma.dbStorageObject.upsert).mockImplementation((async (args: any) => {
      stored = args.create.data
      return {} as any
    }) as any)
    vi.mocked(prisma.dbStorageObject.findUnique).mockImplementation((async () => {
      return stored ? { key: 'k1', data: stored, contentType: 'application/pdf', createdAt: new Date() } as any : null
    }) as any)

    await provider.upload('k1', original, 'application/pdf')
    const result = await provider.download('k1')
    expect(result?.buffer.equals(original)).toBe(true)
  })

  it('propaga erro do Prisma em vez de mascarar (upload)', async () => {
    const provider = new DbStorageProvider()
    vi.mocked(prisma.dbStorageObject.upsert).mockRejectedValue(new Error('conexão com o banco falhou'))
    await expect(provider.upload('k1', Buffer.from('x'), 'application/pdf')).rejects.toThrow('conexão com o banco falhou')
  })

  it('propaga erro do Prisma em vez de mascarar (download)', async () => {
    const provider = new DbStorageProvider()
    vi.mocked(prisma.dbStorageObject.findUnique).mockRejectedValue(new Error('conexão com o banco falhou'))
    await expect(provider.download('k1')).rejects.toThrow('conexão com o banco falhou')
  })

  it('propaga erro do Prisma em vez de mascarar (delete)', async () => {
    const provider = new DbStorageProvider()
    vi.mocked(prisma.dbStorageObject.deleteMany).mockRejectedValue(new Error('conexão com o banco falhou'))
    await expect(provider.delete('k1')).rejects.toThrow('conexão com o banco falhou')
  })
})
