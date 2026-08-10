import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'

function serializationConflict() {
  return new Prisma.PrismaClientKnownRequestError('could not serialize access due to concurrent update', {
    code: 'P2034',
    clientVersion: '5.22.0',
  })
}

vi.mock('@/lib/clientAuth', () => ({
  getClientSession: vi.fn(),
}))

vi.mock('@/lib/prisma', () => {
  const prisma: any = {
    payment: { findMany: vi.fn() },
    onboardingData: { findUnique: vi.fn() },
    worker: { findFirst: vi.fn(), update: vi.fn(), delete: vi.fn() },
  }
  prisma.$transaction = vi.fn(async (cb: any) => cb(prisma))
  return { prisma }
})

let PATCH: typeof import('./route').PATCH
let DELETE: typeof import('./route').DELETE
let getClientSession: typeof import('@/lib/clientAuth').getClientSession
let prisma: typeof import('@/lib/prisma').prisma

beforeAll(async () => {
  ;({ PATCH, DELETE } = await import('./route'))
  ;({ getClientSession } = await import('@/lib/clientAuth'))
  ;({ prisma } = await import('@/lib/prisma'))
})

function req(method: string, body?: unknown) {
  return new NextRequest('https://www.sublimesst.com/api/cliente/onboarding/workers/w1', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

const PARAMS = { params: { id: 'w1' } }

function paymentFixture(overrides: Partial<{ id: string; type: string; status: string; amount: number; dueDate: Date | null; createdAt: Date; checkoutUrl: string | null }> = {}) {
  return {
    id: 'pay_1', type: 'implantacao', status: 'confirmed', amount: 14900,
    dueDate: new Date('2026-07-01'), createdAt: new Date('2026-06-01'), checkoutUrl: null,
    ...overrides,
  }
}

const COMPANY = { id: 'company_1', status: 'onboarding_pending', razaoSocial: 'Empresa Teste', cnpj: '12345678000199' }
const CONFIRMED_PAYMENTS = [
  paymentFixture({ id: 'p1', type: 'implantacao', status: 'confirmed' }),
  paymentFixture({ id: 'p2', type: 'mensalidade', status: 'confirmed', dueDate: new Date('2026-07-27') }),
]

function workerRow(overrides: Partial<{ id: string; nome: string | null; dataNascimento: Date | null; sexo: string | null; dataAdmissao: Date | null; cargo: string | null; setor: string | null }> = {}) {
  return { id: 'w1', nome: null, dataNascimento: null, sexo: null, dataAdmissao: null, cargo: null, setor: null, ...overrides }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getClientSession).mockResolvedValue(COMPANY as any)
  vi.mocked(prisma.payment.findMany).mockResolvedValue(CONFIRMED_PAYMENTS as any)
  vi.mocked(prisma.onboardingData.findUnique).mockResolvedValue(null)
  // clearAllMocks() não remove mockImplementation — reestabelece a baseline
  // a cada teste para que overrides de $transaction (testes de corrida) não
  // vazem para os testes seguintes.
  vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb(prisma))
})

describe('PATCH /api/cliente/onboarding/workers/[id]', () => {
  it('sem sessão → 401', async () => {
    vi.mocked(getClientSession).mockResolvedValue(null)
    const res = await PATCH(req('PATCH', { nome: 'Ana' }), PARAMS)
    expect(res.status).toBe(401)
  })

  it('worker de outra Company (ou inexistente) → 404, nunca vaza dado de outra empresa', async () => {
    vi.mocked(prisma.worker.findFirst).mockResolvedValue(null)
    const res = await PATCH(req('PATCH', { nome: 'Ana' }), PARAMS)
    expect(res.status).toBe(404)
    expect(prisma.worker.findFirst).toHaveBeenCalledWith({ where: { id: 'w1', companyId: 'company_1' } })
    expect(prisma.worker.update).not.toHaveBeenCalled()
  })

  it('payload não pode injetar companyId — busca sempre usa o da sessão', async () => {
    vi.mocked(prisma.worker.findFirst).mockResolvedValue(workerRow() as any)
    vi.mocked(prisma.worker.update).mockResolvedValue(workerRow({ nome: 'Ana' }) as any)
    await PATCH(req('PATCH', { nome: 'Ana', companyId: 'company_do_atacante' }), PARAMS)
    expect(prisma.worker.findFirst).toHaveBeenCalledWith({ where: { id: 'w1', companyId: 'company_1' } })
  })

  it('atualização parcial válida retorna worker serializado', async () => {
    vi.mocked(prisma.worker.findFirst).mockResolvedValue(workerRow() as any)
    vi.mocked(prisma.worker.update).mockResolvedValue(workerRow({ nome: 'Ana Silva', dataNascimento: new Date('1990-05-10') }) as any)
    const res = await PATCH(req('PATCH', { nome: 'Ana Silva', dataNascimento: '1990-05-10' }), PARAMS)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.nome).toBe('Ana Silva')
    expect(body.data.dataNascimento).toBe('1990-05-10')
  })

  it('data civil preservada — mesmo dia entra e sai (sem deslocamento de timezone)', async () => {
    vi.mocked(prisma.worker.findFirst).mockResolvedValue(workerRow() as any)
    vi.mocked(prisma.worker.update).mockImplementation((async (args: any) => ({ ...workerRow(), ...args.data })) as any)
    const res = await PATCH(req('PATCH', { dataAdmissao: '2026-01-01' }), PARAMS)
    const body = await res.json()
    expect(body.data.dataAdmissao).toBe('2026-01-01')
  })

  it('sexo inválido → 400, sem escrita', async () => {
    vi.mocked(prisma.worker.findFirst).mockResolvedValue(workerRow() as any)
    const res = await PATCH(req('PATCH', { sexo: 'outro' }), PARAMS)
    expect(res.status).toBe(400)
    expect(prisma.worker.update).not.toHaveBeenCalled()
  })

  it('onboarding já enviado → 409, worker nunca é buscado/alterado', async () => {
    vi.mocked(prisma.onboardingData.findUnique).mockResolvedValue({ status: 'enviado' } as any)
    const res = await PATCH(req('PATCH', { nome: 'Ana' }), PARAMS)
    expect(res.status).toBe(409)
    expect(prisma.worker.findFirst).not.toHaveBeenCalled()
  })

  it('conflito de serialização (P2034) reexecuta a transação inteira — não aplica a mutação parcialmente', async () => {
    vi.mocked(prisma.worker.findFirst).mockResolvedValue(workerRow() as any)
    vi.mocked(prisma.worker.update).mockResolvedValue(workerRow({ nome: 'Ana' }) as any)
    let attempt = 0
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
      attempt++
      if (attempt === 1) throw serializationConflict()
      return cb(prisma)
    })
    const res = await PATCH(req('PATCH', { nome: 'Ana' }), PARAMS)
    expect(res.status).toBe(200)
    expect(prisma.$transaction).toHaveBeenCalledTimes(2)
  })

  it('corrida real: envio concorrente congela a declaração entre a 1ª tentativa (conflito) e o retry — a mutação nunca é aplicada', async () => {
    vi.mocked(prisma.worker.findFirst).mockResolvedValue(workerRow() as any)
    let attempt = 0
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
      attempt++
      if (attempt === 1) {
        // 1ª tentativa: ainda em_preenchimento, mas colide com o commit do
        // envio concorrente e é abortada pelo Postgres.
        throw serializationConflict()
      }
      // Retry: leitura fresca já mostra "enviado" — o envio concorrente
      // venceu a corrida e comitou primeiro.
      vi.mocked(prisma.onboardingData.findUnique).mockResolvedValue({ status: 'enviado' } as any)
      return cb(prisma)
    })
    const res = await PATCH(req('PATCH', { nome: 'Ana' }), PARAMS)
    expect(res.status).toBe(409)
    expect(prisma.worker.update).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/cliente/onboarding/workers/[id]', () => {
  it('sem sessão → 401', async () => {
    vi.mocked(getClientSession).mockResolvedValue(null)
    const res = await DELETE(req('DELETE'), PARAMS)
    expect(res.status).toBe(401)
  })

  it('busca sempre por id+companyId combinados antes de excluir — nunca por id isolado', async () => {
    vi.mocked(prisma.worker.findFirst).mockResolvedValue(workerRow() as any)
    vi.mocked(prisma.worker.delete).mockResolvedValue(workerRow() as any)
    const res = await DELETE(req('DELETE'), PARAMS)
    expect(res.status).toBe(200)
    expect(prisma.worker.findFirst).toHaveBeenCalledWith({ where: { id: 'w1', companyId: 'company_1' } })
    expect(prisma.worker.delete).toHaveBeenCalledWith({ where: { id: 'w1' } })
  })

  it('worker de outra empresa (ou inexistente) → 404, nunca chega a excluir', async () => {
    vi.mocked(prisma.worker.findFirst).mockResolvedValue(null)
    const res = await DELETE(req('DELETE'), PARAMS)
    expect(res.status).toBe(404)
    expect(prisma.worker.delete).not.toHaveBeenCalled()
  })

  it('onboarding já enviado → 409, exclusão rejeitada', async () => {
    vi.mocked(prisma.onboardingData.findUnique).mockResolvedValue({ status: 'enviado' } as any)
    const res = await DELETE(req('DELETE'), PARAMS)
    expect(res.status).toBe(409)
    expect(prisma.worker.findFirst).not.toHaveBeenCalled()
    expect(prisma.worker.delete).not.toHaveBeenCalled()
  })
})
