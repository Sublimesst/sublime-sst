import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'

// Fake em memória do Commission reproduzindo a semântica real de um
// updateMany do Prisma/Postgres para a cláusula usada por
// releaseDueCommissions: `status = X AND liberadaEm <= Y`. Em SQL,
// `NULL <= qualquer_data` nunca é verdadeiro — por isso liberadaEm=null
// nunca "bate" no filtro `lte`, sem precisar de nenhum tratamento especial
// no código de produção nem no fake.
interface FakeCommission {
  id: string
  status: string
  liberadaEm: Date | null
  mensalidadeLiq: number
  percentual: number
  valorComissao: number
  referencia: string | null
}

let store: FakeCommission[] = []

function matchesWhere(row: FakeCommission, where: { status?: string; liberadaEm?: { lte?: Date } }): boolean {
  if (where.status !== undefined && row.status !== where.status) return false
  const cond = where.liberadaEm
  if (cond?.lte !== undefined) {
    if (row.liberadaEm === null) return false
    if (row.liberadaEm.getTime() > cond.lte.getTime()) return false
  }
  return true
}

vi.mock('./prisma', () => ({
  prisma: {
    commission: {
      updateMany: vi.fn(async ({ where, data }: { where: any; data: any }) => {
        let count = 0
        store = store.map(row => {
          if (matchesWhere(row, where)) {
            count++
            return { ...row, ...data }
          }
          return row
        })
        return { count }
      }),
    },
  },
}))

let releaseDueCommissions: typeof import('./commissionRelease').releaseDueCommissions
let prisma: typeof import('./prisma').prisma

beforeAll(async () => {
  ;({ releaseDueCommissions } = await import('./commissionRelease'))
  ;({ prisma } = await import('./prisma'))
})

const NOW = new Date('2027-01-15T09:00:00.000Z')
const PAST = new Date('2027-01-10T00:00:00.000Z')
const FUTURE = new Date('2027-02-01T00:00:00.000Z')

function commission(overrides: Partial<FakeCommission> & { id: string }): FakeCommission {
  return {
    status: 'em_carencia',
    liberadaEm: PAST,
    mensalidadeLiq: 100000,
    percentual: 10,
    valorComissao: 10000,
    referencia: '2027-01',
    ...overrides,
  }
}

function findStored(id: string): FakeCommission {
  const row = store.find(r => r.id === id)
  if (!row) throw new Error(`fixture ${id} não encontrada no store`)
  return row
}

beforeEach(() => {
  store = []
  vi.clearAllMocks()
})

describe('releaseDueCommissions — transições elegíveis', () => {
  it('(1) em_carencia com liberadaEm no passado é liberada', async () => {
    store = [commission({ id: 'c1', status: 'em_carencia', liberadaEm: PAST })]

    const result = await releaseDueCommissions(NOW)

    expect(result).toEqual({ released: 1 })
    expect(findStored('c1').status).toBe('liberada')
  })

  it('(2) em_carencia com liberadaEm exatamente igual a now é liberada (semântica <=)', async () => {
    store = [commission({ id: 'c2', status: 'em_carencia', liberadaEm: NOW })]

    const result = await releaseDueCommissions(NOW)

    expect(result).toEqual({ released: 1 })
    expect(findStored('c2').status).toBe('liberada')
  })
})

describe('releaseDueCommissions — não elegíveis, permanecem intocadas', () => {
  it('(3) em_carencia com liberadaEm no futuro não é alterada', async () => {
    store = [commission({ id: 'c3', status: 'em_carencia', liberadaEm: FUTURE })]

    const result = await releaseDueCommissions(NOW)

    expect(result).toEqual({ released: 0 })
    expect(findStored('c3').status).toBe('em_carencia')
  })

  it('(4) em_carencia com liberadaEm=null não é alterada', async () => {
    store = [commission({ id: 'c4', status: 'em_carencia', liberadaEm: null })]

    const result = await releaseDueCommissions(NOW)

    expect(result).toEqual({ released: 0 })
    expect(findStored('c4').status).toBe('em_carencia')
    expect(findStored('c4').liberadaEm).toBeNull()
  })

  it('(5) bloqueada com data vencida não é alterada', async () => {
    store = [commission({ id: 'c5', status: 'bloqueada', liberadaEm: PAST })]

    const result = await releaseDueCommissions(NOW)

    expect(result).toEqual({ released: 0 })
    expect(findStored('c5').status).toBe('bloqueada')
  })

  it('(6) estornada com data vencida não é alterada', async () => {
    store = [commission({ id: 'c6', status: 'estornada', liberadaEm: PAST })]

    const result = await releaseDueCommissions(NOW)

    expect(result).toEqual({ released: 0 })
    expect(findStored('c6').status).toBe('estornada')
  })

  it('(7) já liberada não é alterada', async () => {
    store = [commission({ id: 'c7', status: 'liberada', liberadaEm: PAST })]

    const result = await releaseDueCommissions(NOW)

    expect(result).toEqual({ released: 0 })
    expect(findStored('c7').status).toBe('liberada')
  })

  it('(8) paga não é alterada', async () => {
    store = [commission({ id: 'c8', status: 'paga', liberadaEm: PAST })]

    const result = await releaseDueCommissions(NOW)

    expect(result).toEqual({ released: 0 })
    expect(findStored('c8').status).toBe('paga')
  })
})

describe('releaseDueCommissions — idempotência e concorrência', () => {
  it('(9) execução repetida é idempotente: 2ª chamada não encontra mais nada para liberar', async () => {
    store = [commission({ id: 'c9', status: 'em_carencia', liberadaEm: PAST })]

    const first = await releaseDueCommissions(NOW)
    expect(first).toEqual({ released: 1 })
    expect(findStored('c9').status).toBe('liberada')

    const second = await releaseDueCommissions(NOW)
    expect(second).toEqual({ released: 0 })
    expect(findStored('c9').status).toBe('liberada')
  })

  it('(10) duas execuções concorrentes (mesmo guard atômico status+data no WHERE) não duplicam nem geram efeito adicional', async () => {
    store = [
      commission({ id: 'c10a', status: 'em_carencia', liberadaEm: PAST }),
      commission({ id: 'c10b', status: 'em_carencia', liberadaEm: FUTURE }),
    ]

    const [r1, r2] = await Promise.all([releaseDueCommissions(NOW), releaseDueCommissions(NOW)])

    // A soma dos dois resultados nunca ultrapassa o total de linhas
    // efetivamente elegíveis (1) — nenhuma das duas execuções conta a
    // mesma linha duas vezes, porque o where inclui status='em_carencia'
    // na própria operação de update.
    expect(r1.released + r2.released).toBe(1)
    expect(findStored('c10a').status).toBe('liberada')
    expect(findStored('c10b').status).toBe('em_carencia')
  })
})

describe('releaseDueCommissions — campos financeiros e escopo do update', () => {
  it('(13) não altera mensalidadeLiq, percentual, valorComissao ou referencia', async () => {
    store = [
      commission({
        id: 'c13',
        status: 'em_carencia',
        liberadaEm: PAST,
        mensalidadeLiq: 55555,
        percentual: 10,
        valorComissao: 5555,
        referencia: '2027-01',
      }),
    ]

    await releaseDueCommissions(NOW)

    const updated = findStored('c13')
    expect(updated.status).toBe('liberada')
    expect(updated.mensalidadeLiq).toBe(55555)
    expect(updated.percentual).toBe(10)
    expect(updated.valorComissao).toBe(5555)
    expect(updated.referencia).toBe('2027-01')
  })

  it('o `data` do updateMany contém exclusivamente `status` — nunca campo financeiro', async () => {
    store = [commission({ id: 'c13b', status: 'em_carencia', liberadaEm: PAST })]

    await releaseDueCommissions(NOW)

    expect(prisma.commission.updateMany).toHaveBeenCalledWith({
      where: { status: 'em_carencia', liberadaEm: { lte: NOW } },
      data: { status: 'liberada' },
    })
  })
})

describe('releaseDueCommissions — retorno de uma reversão legítima de disputa (bloqueada -> em_carencia)', () => {
  it('(14) Commission que voltou a em_carencia pela reversão do webhook volta a ser elegível se liberadaEm <= now, sem tocar na lógica do webhook', async () => {
    // Simula o estado JÁ resultante da reversão (bloqueada -> em_carencia)
    // que o webhook já executa hoje (src/app/api/webhooks/asaas/route.ts) —
    // esta rotina não reimplementa nem chama essa lógica, só reage ao
    // estado que ela produz.
    store = [commission({ id: 'c14', status: 'em_carencia', liberadaEm: PAST })]

    const result = await releaseDueCommissions(NOW)

    expect(result).toEqual({ released: 1 })
    expect(findStored('c14').status).toBe('liberada')
  })
})

describe('releaseDueCommissions — múltiplas linhas no mesmo ciclo', () => {
  it('libera todas as elegíveis e ignora as demais em uma única chamada', async () => {
    store = [
      commission({ id: 'm1', status: 'em_carencia', liberadaEm: PAST }),
      commission({ id: 'm2', status: 'em_carencia', liberadaEm: NOW }),
      commission({ id: 'm3', status: 'em_carencia', liberadaEm: FUTURE }),
      commission({ id: 'm4', status: 'em_carencia', liberadaEm: null }),
      commission({ id: 'm5', status: 'liberada', liberadaEm: PAST }),
      commission({ id: 'm6', status: 'paga', liberadaEm: PAST }),
      commission({ id: 'm7', status: 'bloqueada', liberadaEm: PAST }),
      commission({ id: 'm8', status: 'estornada', liberadaEm: PAST }),
    ]

    const result = await releaseDueCommissions(NOW)

    expect(result).toEqual({ released: 2 })
    expect(findStored('m1').status).toBe('liberada')
    expect(findStored('m2').status).toBe('liberada')
    expect(findStored('m3').status).toBe('em_carencia')
    expect(findStored('m4').status).toBe('em_carencia')
    expect(findStored('m5').status).toBe('liberada')
    expect(findStored('m6').status).toBe('paga')
    expect(findStored('m7').status).toBe('bloqueada')
    expect(findStored('m8').status).toBe('estornada')
  })
})
