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
    onboardingData: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      updateMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    worker: { findMany: vi.fn() },
    company: { findUnique: vi.fn(), updateMany: vi.fn() },
  }
  prisma.$transaction = vi.fn(async (cb: any) => cb(prisma))
  return { prisma }
})

vi.mock('@/lib/mailer', () => ({
  notifyOnboardingSubmitted: vi.fn(async () => {}),
}))

// Import dinâmico em beforeAll (não top-level await) — evita TS1378 e mantém
// a ordem de hoist do vi.mock.
let GET: typeof import('./route').GET
let PATCH: typeof import('./route').PATCH
let POST: typeof import('./route').POST
let getClientSession: typeof import('@/lib/clientAuth').getClientSession
let prisma: typeof import('@/lib/prisma').prisma
let notifyOnboardingSubmitted: typeof import('@/lib/mailer').notifyOnboardingSubmitted

beforeAll(async () => {
  ;({ GET, PATCH, POST } = await import('./route'))
  ;({ getClientSession } = await import('@/lib/clientAuth'))
  ;({ prisma } = await import('@/lib/prisma'))
  ;({ notifyOnboardingSubmitted } = await import('@/lib/mailer'))
})

function req(method: string, body?: unknown) {
  return new NextRequest('https://www.sublimesst.com/api/cliente/onboarding', {
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

function worker(overrides: Partial<{ id: string; nome: string | null; dataNascimento: Date | null; sexo: string | null; dataAdmissao: Date | null; cargo: string | null; setor: string | null }> = {}) {
  return {
    id: 'w1', nome: 'Ana Teste', dataNascimento: new Date('1990-01-01'), sexo: 'F',
    dataAdmissao: new Date('2026-01-01'), cargo: 'Analista', setor: 'Financeiro',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getClientSession).mockResolvedValue(COMPANY as any)
  vi.mocked(prisma.payment.findMany).mockResolvedValue(CONFIRMED_PAYMENTS as any)
  // clearAllMocks() não remove mockImplementation — reestabelece a baseline
  // a cada teste para que overrides de $transaction (testes de corrida) e de
  // notifyOnboardingSubmitted (teste de falha na notificação) não vazem
  // para os testes seguintes.
  vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb(prisma))
  vi.mocked(notifyOnboardingSubmitted).mockImplementation(async () => {})
})

describe('gate financeiro compartilhado (GET/PATCH/POST)', () => {
  it('GET sem sessão → 401', async () => {
    vi.mocked(getClientSession).mockResolvedValue(null)
    const res = await GET(req('GET'))
    expect(res.status).toBe(401)
  })

  it('PATCH com implantação pending → 409 financial_activation_required, sem escrita', async () => {
    vi.mocked(prisma.payment.findMany).mockResolvedValue([paymentFixture({ status: 'pending' })] as any)
    const res = await PATCH(req('PATCH', { cargos: 'Analista' }))
    const body = await res.json()
    expect(res.status).toBe(409)
    expect(body.code).toBe('financial_activation_required')
    expect(prisma.onboardingData.upsert).not.toHaveBeenCalled()
  })

  it('POST com mensalidade ausente → 409, sem consultar Workers', async () => {
    vi.mocked(prisma.payment.findMany).mockResolvedValue([paymentFixture({ type: 'implantacao', status: 'confirmed' })] as any)
    const res = await POST(req('POST', {}))
    expect(res.status).toBe(409)
    expect(prisma.worker.findMany).not.toHaveBeenCalled()
  })
})

describe('GET — carregamento/retomada', () => {
  it('sem rascunho ainda → status em_preenchimento, campos gerais null, lista de workers vazia', async () => {
    vi.mocked(prisma.onboardingData.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.worker.findMany).mockResolvedValue([])
    vi.mocked(prisma.company.findUnique).mockResolvedValue({ numFuncionarios: 5 } as any)

    const res = await GET(req('GET'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.status).toBe('em_preenchimento')
    expect(body.data.general.possuiPgr).toBeNull()
    expect(body.data.numFuncionariosContratado).toBe(5)
    expect(body.data.numFuncionariosDeclarado).toBeNull()
    expect(body.data.workers).toEqual([])
  })

  it('retomada: reflete rascunho e workers já salvos', async () => {
    vi.mocked(prisma.onboardingData.findUnique).mockResolvedValue({
      status: 'em_preenchimento', cargos: 'Analista', turnoTrabalho: null, dataUltimoPcmso: null,
      possuiPgr: null, observacoes: null, numFuncionarios: null, submittedAt: null,
    } as any)
    vi.mocked(prisma.worker.findMany).mockResolvedValue([worker()] as any)
    vi.mocked(prisma.company.findUnique).mockResolvedValue({ numFuncionarios: 5 } as any)

    const res = await GET(req('GET'))
    const body = await res.json()
    expect(body.data.general.cargos).toBe('Analista')
    expect(body.data.workers).toHaveLength(1)
    expect(body.data.workers[0].dataNascimento).toBe('1990-01-01')
  })

  it('registro histórico enviado sem nenhum Worker não quebra — lista vazia é válida', async () => {
    vi.mocked(prisma.onboardingData.findUnique).mockResolvedValue({
      status: 'enviado', cargos: null, turnoTrabalho: null, dataUltimoPcmso: null,
      possuiPgr: true, observacoes: null, numFuncionarios: 4, submittedAt: new Date('2026-07-01'),
    } as any)
    vi.mocked(prisma.worker.findMany).mockResolvedValue([])
    vi.mocked(prisma.company.findUnique).mockResolvedValue({ numFuncionarios: 4 } as any)

    const res = await GET(req('GET'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.status).toBe('enviado')
    expect(body.data.workers).toEqual([])
  })
})

describe('PATCH — rascunho dos dados gerais', () => {
  beforeEach(() => {
    vi.mocked(prisma.onboardingData.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.onboardingData.upsert).mockResolvedValue({
      status: 'em_preenchimento', cargos: 'Analista', turnoTrabalho: null, dataUltimoPcmso: null,
      possuiPgr: null, observacoes: null,
    } as any)
  })

  it('cria rascunho com status em_preenchimento explícito', async () => {
    await PATCH(req('PATCH', { cargos: 'Analista' }))
    expect(prisma.onboardingData.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ companyId: 'company_1', status: 'em_preenchimento', cargos: 'Analista' }),
    }))
  })

  it('PATCH parcial: só toca os campos enviados', async () => {
    await PATCH(req('PATCH', { observacoes: 'nota' }))
    const call = vi.mocked(prisma.onboardingData.upsert).mock.calls[0][0] as any
    expect(call.update).toEqual({ observacoes: 'nota' })
    expect('cargos' in call.update).toBe(false)
  })

  it('nunca marca submittedAt nem status=enviado', async () => {
    await PATCH(req('PATCH', { cargos: 'x' }))
    const call = vi.mocked(prisma.onboardingData.upsert).mock.calls[0][0] as any
    expect(call.update.submittedAt).toBeUndefined()
    expect(call.update.status).toBeUndefined()
  })

  it('não altera Company.status', async () => {
    await PATCH(req('PATCH', { cargos: 'x' }))
    expect(prisma.company.updateMany).not.toHaveBeenCalled()
  })

  it('não notifica a equipe', async () => {
    await PATCH(req('PATCH', { cargos: 'x' }))
    expect(notifyOnboardingSubmitted).not.toHaveBeenCalled()
  })

  it('possuiPgr pode ficar null durante o rascunho — sem erro', async () => {
    const res = await PATCH(req('PATCH', { possuiPgr: null }))
    expect(res.status).toBe(200)
  })

  it('string vazia normaliza para null', async () => {
    await PATCH(req('PATCH', { observacoes: '   ' }))
    const call = vi.mocked(prisma.onboardingData.upsert).mock.calls[0][0] as any
    expect(call.update.observacoes).toBeNull()
  })

  it('já enviado → 409, nunca reabre', async () => {
    vi.mocked(prisma.onboardingData.findUnique).mockResolvedValue({ status: 'enviado' } as any)
    const res = await PATCH(req('PATCH', { cargos: 'x' }))
    expect(res.status).toBe(409)
    expect(prisma.onboardingData.upsert).not.toHaveBeenCalled()
  })

  it('payload inválido → 400', async () => {
    const res = await PATCH(req('PATCH', { possuiPgr: 'talvez' }))
    expect(res.status).toBe(400)
  })
})

describe('POST — envio final', () => {
  function setupHappyPath(overrides: { onboarding?: any; workers?: any[]; companyNumFuncionarios?: number } = {}) {
    vi.mocked(prisma.onboardingData.findUnique).mockResolvedValue(
      overrides.onboarding ?? { status: 'em_preenchimento', possuiPgr: true, cargos: 'Analista' }
    )
    vi.mocked(prisma.worker.findMany).mockResolvedValue((overrides.workers ?? [worker()]) as any)
    vi.mocked(prisma.company.findUnique).mockResolvedValue({ numFuncionarios: overrides.companyNumFuncionarios ?? 1 } as any)
    vi.mocked(prisma.onboardingData.updateMany).mockResolvedValue({ count: 1 } as any)
    vi.mocked(prisma.company.updateMany).mockResolvedValue({ count: 1 } as any)
    vi.mocked(prisma.onboardingData.findUniqueOrThrow).mockResolvedValue({
      status: 'enviado', numFuncionarios: (overrides.workers ?? [worker()]).length, cargos: 'Analista', submittedAt: new Date(),
    } as any)
  }

  it('possuiPgr null → 400 possui_pgr_required, nenhuma escrita', async () => {
    vi.mocked(prisma.onboardingData.findUnique).mockResolvedValue({ status: 'em_preenchimento', possuiPgr: null } as any)
    const res = await POST(req('POST', {}))
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.code).toBe('possui_pgr_required')
    expect(prisma.worker.findMany).not.toHaveBeenCalled()
  })

  it('sem OnboardingData nenhum (nunca preencheu) → possui_pgr_required (nunca chega a checar Workers)', async () => {
    vi.mocked(prisma.onboardingData.findUnique).mockResolvedValue(null)
    const res = await POST(req('POST', {}))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.code).toBe('possui_pgr_required')
  })

  it('zero Workers → 400 workers_required', async () => {
    vi.mocked(prisma.onboardingData.findUnique).mockResolvedValue({ status: 'em_preenchimento', possuiPgr: true } as any)
    vi.mocked(prisma.worker.findMany).mockResolvedValue([])
    const res = await POST(req('POST', {}))
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.code).toBe('workers_required')
  })

  it('Worker incompleto → 400 workers_incomplete com os ids', async () => {
    vi.mocked(prisma.onboardingData.findUnique).mockResolvedValue({ status: 'em_preenchimento', possuiPgr: true } as any)
    vi.mocked(prisma.worker.findMany).mockResolvedValue([worker({ id: 'w1' }), worker({ id: 'w2', cargo: null })] as any)
    const res = await POST(req('POST', {}))
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.code).toBe('workers_incomplete')
    expect(body.data.incompleteIds).toEqual(['w2'])
  })

  it('Worker sem setor → 400 workers_incomplete (setor obrigatório desde a tranche de exportação SOC)', async () => {
    vi.mocked(prisma.onboardingData.findUnique).mockResolvedValue({ status: 'em_preenchimento', possuiPgr: true } as any)
    vi.mocked(prisma.worker.findMany).mockResolvedValue([worker({ id: 'w1', setor: null })] as any)
    const res = await POST(req('POST', {}))
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.code).toBe('workers_incomplete')
    expect(body.data.incompleteIds).toEqual(['w1'])
  })

  it('quantidade igual → não exige confirmação, envia com sucesso', async () => {
    setupHappyPath({ companyNumFuncionarios: 1 })
    const res = await POST(req('POST', {}))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
  })

  it('mismatch sem confirmação → 409 quantity_mismatch, nenhuma escrita', async () => {
    setupHappyPath({ companyNumFuncionarios: 5 })
    const res = await POST(req('POST', { confirmMismatch: false }))
    const body = await res.json()
    expect(res.status).toBe(409)
    expect(body.code).toBe('quantity_mismatch')
    expect(body.data).toEqual({ contratado: 5, declarado: 1 })
    expect(prisma.onboardingData.updateMany).not.toHaveBeenCalled()
  })

  it('mismatch com confirmação explícita → aceito', async () => {
    setupHappyPath({ companyNumFuncionarios: 5 })
    const res = await POST(req('POST', { confirmMismatch: true }))
    expect(res.status).toBe(200)
    expect(prisma.onboardingData.updateMany).toHaveBeenCalled()
  })

  it('nunca altera Company.numFuncionarios', async () => {
    setupHappyPath({ companyNumFuncionarios: 5 })
    await POST(req('POST', { confirmMismatch: true }))
    const call = vi.mocked(prisma.company.updateMany).mock.calls[0][0] as any
    expect('numFuncionarios' in call.data).toBe(false)
  })

  it('snapshot OnboardingData.numFuncionarios = count(Worker)', async () => {
    const workers = [worker({ id: 'a' }), worker({ id: 'b' })]
    setupHappyPath({ workers, companyNumFuncionarios: 2 })
    await POST(req('POST', {}))
    const call = vi.mocked(prisma.onboardingData.updateMany).mock.calls[0][0] as any
    expect(call.data.numFuncionarios).toBe(2)
  })

  it('status vira enviado e submittedAt é preenchido', async () => {
    setupHappyPath()
    await POST(req('POST', {}))
    const call = vi.mocked(prisma.onboardingData.updateMany).mock.calls[0][0] as any
    expect(call.data.status).toBe('enviado')
    expect(call.data.submittedAt).toBeInstanceOf(Date)
  })

  it('a escrita do OnboardingData é condicional (nunca reabre status=enviado)', async () => {
    setupHappyPath()
    await POST(req('POST', {}))
    const call = vi.mocked(prisma.onboardingData.updateMany).mock.calls[0][0] as any
    expect(call.where).toEqual({ companyId: 'company_1', status: { not: 'enviado' } })
  })

  it('preserva a transição condicional existente de Company.status', async () => {
    setupHappyPath()
    await POST(req('POST', {}))
    expect(prisma.company.updateMany).toHaveBeenCalledWith({
      where: { id: 'company_1', status: { in: ['pending', 'onboarding_pending'] } },
      data: { status: 'in_production' },
    })
  })

  it('notifica só depois da transação, nunca antes', async () => {
    let transactionDone = false
    vi.mocked(prisma.onboardingData.findUnique).mockResolvedValue({ status: 'em_preenchimento', possuiPgr: true } as any)
    vi.mocked(prisma.worker.findMany).mockResolvedValue([worker()] as any)
    vi.mocked(prisma.company.findUnique).mockResolvedValue({ numFuncionarios: 1 } as any)
    vi.mocked(prisma.onboardingData.updateMany).mockImplementation((async (_args: any) => { transactionDone = true; return { count: 1 } }) as any)
    vi.mocked(prisma.company.updateMany).mockResolvedValue({ count: 1 } as any)
    vi.mocked(prisma.onboardingData.findUniqueOrThrow).mockResolvedValue({ status: 'enviado', numFuncionarios: 1, cargos: null, submittedAt: new Date() } as any)
    vi.mocked(notifyOnboardingSubmitted).mockImplementation(async () => {
      expect(transactionDone).toBe(true)
    })

    await POST(req('POST', {}))
    expect(notifyOnboardingSubmitted).toHaveBeenCalledTimes(1)
  })

  it('falha (mesmo síncrona) em notifyOnboardingSubmitted nunca reverte a resposta de sucesso — a declaração já está gravada e travada', async () => {
    setupHappyPath()
    vi.mocked(notifyOnboardingSubmitted).mockImplementation(() => {
      throw new Error('falha inesperada na construção do e-mail')
    })
    const res = await POST(req('POST', {}))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
  })

  it('já enviado (checagem inicial) → 409, sem tocar Workers', async () => {
    vi.mocked(prisma.onboardingData.findUnique).mockResolvedValue({ status: 'enviado', possuiPgr: true } as any)
    const res = await POST(req('POST', {}))
    expect(res.status).toBe(409)
    expect(prisma.worker.findMany).not.toHaveBeenCalled()
  })

  it('segundo envio simultâneo (corrida) → updateMany retorna count 0 → 409, sem notificar', async () => {
    setupHappyPath()
    vi.mocked(prisma.onboardingData.updateMany).mockResolvedValue({ count: 0 } as any)
    const res = await POST(req('POST', {}))
    expect(res.status).toBe(409)
    expect(notifyOnboardingSubmitted).not.toHaveBeenCalled()
  })

  it('conflito de serialização (P2034) reexecuta a validação inteira do zero e completa com sucesso', async () => {
    setupHappyPath()
    let attempt = 0
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
      attempt++
      if (attempt === 1) throw serializationConflict()
      return cb(prisma)
    })
    const res = await POST(req('POST', {}))
    expect(res.status).toBe(200)
    expect(prisma.$transaction).toHaveBeenCalledTimes(2)
  })

  it('corrida real: Worker excluído entre a leitura e o congelamento — retry lê a lista fresca e o snapshot final bate com o que realmente existe', async () => {
    vi.mocked(prisma.onboardingData.findUnique).mockResolvedValue({ status: 'em_preenchimento', possuiPgr: true } as any)
    vi.mocked(prisma.company.findUnique).mockResolvedValue({ numFuncionarios: 2 } as any)
    vi.mocked(prisma.onboardingData.updateMany).mockResolvedValue({ count: 1 } as any)
    vi.mocked(prisma.company.updateMany).mockResolvedValue({ count: 1 } as any)

    let attempt = 0
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
      attempt++
      if (attempt === 1) {
        // 1ª tentativa: colide com uma exclusão concorrente que também
        // mexeu na tabela de Workers — abortada pelo Postgres antes mesmo
        // de o callback (cb) rodar, então nada aqui chega a ler a tabela.
        throw serializationConflict()
      }
      // Retry: leitura fresca já reflete a exclusão — só 1 Worker restante.
      vi.mocked(prisma.worker.findMany).mockResolvedValue([worker({ id: 'a' })] as any)
      vi.mocked(prisma.onboardingData.findUniqueOrThrow).mockResolvedValue({
        status: 'enviado', numFuncionarios: 1, cargos: null, submittedAt: new Date(),
      } as any)
      return cb(prisma)
    })

    await POST(req('POST', { confirmMismatch: true }))
    const call = vi.mocked(prisma.onboardingData.updateMany).mock.calls[0][0] as any
    // Snapshot reflete a contagem FRESCA (1), nunca a lida na tentativa
    // abortada (2) — nenhuma inconsistência entre o congelado e o real.
    expect(call.data.numFuncionarios).toBe(1)
  })
})

describe('Imutabilidade pós-envio', () => {
  it('GET continua permitido', async () => {
    vi.mocked(prisma.onboardingData.findUnique).mockResolvedValue({
      status: 'enviado', cargos: null, turnoTrabalho: null, dataUltimoPcmso: null,
      possuiPgr: true, observacoes: null, numFuncionarios: 1, submittedAt: new Date(),
    } as any)
    vi.mocked(prisma.worker.findMany).mockResolvedValue([worker()] as any)
    vi.mocked(prisma.company.findUnique).mockResolvedValue({ numFuncionarios: 1 } as any)
    const res = await GET(req('GET'))
    expect(res.status).toBe(200)
  })

  it('PATCH geral rejeitado com 409', async () => {
    vi.mocked(prisma.onboardingData.findUnique).mockResolvedValue({ status: 'enviado' } as any)
    const res = await PATCH(req('PATCH', { cargos: 'novo' }))
    expect(res.status).toBe(409)
  })
})
