import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { Prisma } from '@prisma/client'

vi.mock('@/lib/prisma', () => ({
  prisma: { $transaction: vi.fn() },
}))

let runSerializable: typeof import('./prismaSerializable').runSerializable
let prisma: typeof import('@/lib/prisma').prisma

beforeAll(async () => {
  ;({ runSerializable } = await import('./prismaSerializable'))
  ;({ prisma } = await import('@/lib/prisma'))
})

beforeEach(() => {
  vi.clearAllMocks()
})

function serializationConflict() {
  return new Prisma.PrismaClientKnownRequestError('could not serialize access due to concurrent update', {
    code: 'P2034',
    clientVersion: '5.22.0',
  })
}

describe('runSerializable', () => {
  it('sucesso na 1ª tentativa: chama fn uma única vez, sem retry', async () => {
    const fn = vi.fn(async () => 'ok')
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb({} as any))

    const result = await runSerializable(fn)
    expect(result).toBe('ok')
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
  })

  it('passa isolationLevel Serializable para $transaction', async () => {
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb({} as any))
    await runSerializable(async () => 'ok')
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' })
  })

  it('conflito de serialização (P2034) na 1ª tentativa → reexecuta e retorna sucesso na 2ª', async () => {
    let attempt = 0
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
      attempt++
      if (attempt === 1) throw serializationConflict()
      return cb({} as any)
    })

    const result = await runSerializable(async () => 'ok-na-2a')
    expect(result).toBe('ok-na-2a')
    expect(prisma.$transaction).toHaveBeenCalledTimes(2)
  })

  it('conflito de serialização em todas as tentativas → propaga o erro após esgotar o limite', async () => {
    vi.mocked(prisma.$transaction).mockRejectedValue(serializationConflict())
    await expect(runSerializable(async () => 'nunca')).rejects.toThrow()
    // Curto e limitado — não tenta indefinidamente.
    expect(vi.mocked(prisma.$transaction).mock.calls.length).toBeLessThanOrEqual(3)
    expect(vi.mocked(prisma.$transaction).mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('erro de negócio (não-P2034) propaga imediatamente, sem retry', async () => {
    class BusinessError extends Error {}
    // $transaction real propaga o que o callback lança — reproduzido aqui
    // simplesmente chamando cb e deixando o throw seguir normalmente.
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb({} as any))
    const fn = vi.fn(async () => { throw new BusinessError('regra de negócio') })

    await expect(runSerializable(fn)).rejects.toBeInstanceOf(BusinessError)
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
  })
})
