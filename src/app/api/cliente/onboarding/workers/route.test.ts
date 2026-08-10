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
    worker: { findMany: vi.fn(), count: vi.fn(), create: vi.fn() },
  }
  prisma.$transaction = vi.fn(async (cb: any) => cb(prisma))
  return { prisma }
})

let GET: typeof import('./route').GET
let POST: typeof import('./route').POST
let getClientSession: typeof import('@/lib/clientAuth').getClientSession
let prisma: typeof import('@/lib/prisma').prisma

beforeAll(async () => {
  ;({ GET, POST } = await import('./route'))
  ;({ getClientSession } = await import('@/lib/clientAuth'))
  ;({ prisma } = await import('@/lib/prisma'))
})

function req(method: string, body?: unknown) {
  return new NextRequest('https://www.sublimesst.com/api/cliente/onboarding/workers', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

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
  vi.mocked(prisma.onboardingData.findUnique).mockResolvedValue(null) // em_preenchimento implícito
  // clearAllMocks() não remove mockImplementation — reestabelece a baseline
  // a cada teste para que overrides de $transaction (testes de corrida) não
  // vazem para os testes seguintes.
  vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb(prisma))
})

describe('GET /api/cliente/onboarding/workers', () => {
  it('sem sessão → 401', async () => {
    vi.mocked(getClientSession).mockResolvedValue(null)
    const res = await GET(req('GET'))
    expect(res.status).toBe(401)
  })

  it('lista workers serializados (datas em YYYY-MM-DD), ordenados por criação', async () => {
    vi.mocked(prisma.worker.findMany).mockResolvedValue([workerRow({ id: 'w1', dataNascimento: new Date('1990-01-01') })] as any)
    const res = await GET(req('GET'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data[0].dataNascimento).toBe('1990-01-01')
    expect(prisma.worker.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { companyId: 'company_1' },
      orderBy: { createdAt: 'asc' },
    }))
  })

  it('GET é permitido mesmo com onboarding já enviado', async () => {
    vi.mocked(prisma.onboardingData.findUnique).mockResolvedValue({ status: 'enviado' } as any)
    vi.mocked(prisma.worker.findMany).mockResolvedValue([])
    const res = await GET(req('GET'))
    expect(res.status).toBe(200)
  })
})

describe('POST /api/cliente/onboarding/workers — criar rascunho de trabalhador', () => {
  it('cria worker vazio (todo campo ausente é válido)', async () => {
    vi.mocked(prisma.worker.count).mockResolvedValue(0)
    vi.mocked(prisma.worker.create).mockResolvedValue(workerRow({ id: 'novo' }) as any)
    const res = await POST(req('POST', {}))
    const body = await res.json()
    expect(res.status).toBe(201)
    expect(body.data.id).toBe('novo')
    expect(prisma.worker.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ companyId: 'company_1' }),
    }))
  })

  it('payload não controla companyId — sempre usa o da sessão', async () => {
    vi.mocked(prisma.worker.count).mockResolvedValue(0)
    vi.mocked(prisma.worker.create).mockResolvedValue(workerRow() as any)
    await POST(req('POST', { companyId: 'company_do_atacante', nome: 'Teste' }))
    const call = vi.mocked(prisma.worker.create).mock.calls[0][0] as any
    expect(call.data.companyId).toBe('company_1')
  })

  it('20 workers já existentes → 21º rejeitado com 409', async () => {
    vi.mocked(prisma.worker.count).mockResolvedValue(20)
    const res = await POST(req('POST', {}))
    const body = await res.json()
    expect(res.status).toBe(409)
    expect(body.code).toBe('workers_limit_reached')
    expect(prisma.worker.create).not.toHaveBeenCalled()
  })

  it('19 existentes → 20º ainda é permitido', async () => {
    vi.mocked(prisma.worker.count).mockResolvedValue(19)
    vi.mocked(prisma.worker.create).mockResolvedValue(workerRow() as any)
    const res = await POST(req('POST', {}))
    expect(res.status).toBe(201)
  })

  it('sexo inválido no payload → 400', async () => {
    const res = await POST(req('POST', { sexo: 'outro' }))
    expect(res.status).toBe(400)
    expect(prisma.worker.create).not.toHaveBeenCalled()
  })

  it('data inválida no payload → 400', async () => {
    const res = await POST(req('POST', { dataNascimento: '31/12/2000' }))
    expect(res.status).toBe(400)
  })

  it('onboarding já enviado → 409, criação rejeitada', async () => {
    vi.mocked(prisma.onboardingData.findUnique).mockResolvedValue({ status: 'enviado' } as any)
    const res = await POST(req('POST', {}))
    expect(res.status).toBe(409)
    expect(prisma.worker.create).not.toHaveBeenCalled()
  })

  it('gate financeiro incompleto → 409, sem contar/criar Workers', async () => {
    vi.mocked(prisma.payment.findMany).mockResolvedValue([paymentFixture({ status: 'pending' })] as any)
    const res = await POST(req('POST', {}))
    expect(res.status).toBe(409)
    expect(prisma.worker.count).not.toHaveBeenCalled()
  })

  it('conflito de serialização (P2034) reexecuta do zero — não cria duas vezes', async () => {
    vi.mocked(prisma.worker.count).mockResolvedValue(0)
    vi.mocked(prisma.worker.create).mockResolvedValue(workerRow({ id: 'novo' }) as any)
    let attempt = 0
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
      attempt++
      if (attempt === 1) throw serializationConflict()
      return cb(prisma)
    })
    const res = await POST(req('POST', {}))
    expect(res.status).toBe(201)
    expect(prisma.$transaction).toHaveBeenCalledTimes(2)
    expect(prisma.worker.create).toHaveBeenCalledTimes(1)
  })

  it('corrida real no 20º Worker: reexecução após conflito vê a contagem já cheia e rejeita — nunca excede 20', async () => {
    let attempt = 0
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
      attempt++
      if (attempt === 1) {
        // 1ª tentativa colide com a criação concorrente que também via 19 e
        // comita primeiro — abortada pelo Postgres antes mesmo de o
        // callback (cb) rodar, então nada aqui chega a contar.
        throw serializationConflict()
      }
      // Retry: leitura fresca já mostra 20 — a criação concorrente venceu.
      vi.mocked(prisma.worker.count).mockResolvedValue(20)
      return cb(prisma)
    })
    const res = await POST(req('POST', {}))
    const body = await res.json()
    expect(res.status).toBe(409)
    expect(body.code).toBe('workers_limit_reached')
    expect(prisma.worker.create).not.toHaveBeenCalled()
  })
})
