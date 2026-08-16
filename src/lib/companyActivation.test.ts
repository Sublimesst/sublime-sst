import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'

vi.mock('./prisma', () => ({
  prisma: {
    company: { findUnique: vi.fn(), updateMany: vi.fn() },
    payment: { findMany: vi.fn() },
  },
}))

let markCompanyActivatedIfComplete: typeof import('./companyActivation').markCompanyActivatedIfComplete
let prisma: typeof import('./prisma').prisma

beforeAll(async () => {
  ;({ markCompanyActivatedIfComplete } = await import('./companyActivation'))
  ;({ prisma } = await import('./prisma'))
})

function paymentRow(overrides: Partial<{ id: string; type: string; status: string; dueDate: Date | null; createdAt: Date; amount: number; checkoutUrl: string | null }> = {}) {
  return {
    id: 'pay_row', type: 'mensalidade', status: 'pending', amount: 19900,
    dueDate: new Date('2026-05-01'), createdAt: new Date('2026-04-01'), checkoutUrl: null,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.company.updateMany).mockResolvedValue({ count: 1 } as any)
})

describe('markCompanyActivatedIfComplete', () => {
  it('Company não encontrada → no-op, nenhuma consulta de payments', async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue(null)

    await markCompanyActivatedIfComplete('company_inexistente')

    expect(prisma.payment.findMany).not.toHaveBeenCalled()
    expect(prisma.company.updateMany).not.toHaveBeenCalled()
  })

  it('Company já com activatedAt preenchido → no-op, nenhuma consulta de payments (nunca sobrescreve)', async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue({ status: 'active', activatedAt: new Date('2026-01-01') } as any)

    await markCompanyActivatedIfComplete('company_1')

    expect(prisma.payment.findMany).not.toHaveBeenCalled()
    expect(prisma.company.updateMany).not.toHaveBeenCalled()
  })

  it('financeiramente incompleta (só implantação confirmada) → não grava activatedAt', async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue({ status: 'pending', activatedAt: null } as any)
    vi.mocked(prisma.payment.findMany).mockResolvedValue([
      paymentRow({ id: 'impl_1', type: 'implantacao', status: 'confirmed', dueDate: null }),
    ] as any)

    await markCompanyActivatedIfComplete('company_1')

    expect(prisma.company.updateMany).not.toHaveBeenCalled()
  })

  it('financeiramente completa (implantação + primeira mensalidade confirmadas) e activatedAt null → grava activatedAt agora, guardado por activatedAt:null no where', async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue({ status: 'onboarding_pending', activatedAt: null } as any)
    vi.mocked(prisma.payment.findMany).mockResolvedValue([
      paymentRow({ id: 'impl_1', type: 'implantacao', status: 'confirmed', dueDate: null }),
      paymentRow({ id: 'mens_1', type: 'mensalidade', status: 'confirmed', dueDate: new Date('2026-05-01') }),
    ] as any)

    vi.useFakeTimers()
    const frozenNow = new Date('2026-06-01T10:00:00.000Z')
    vi.setSystemTime(frozenNow)
    try {
      await markCompanyActivatedIfComplete('company_1')
    } finally {
      vi.useRealTimers()
    }

    expect(prisma.company.updateMany).toHaveBeenCalledWith({
      where: { id: 'company_1', activatedAt: null },
      data:  { activatedAt: frozenNow },
    })
  })

  it('mensalidade confirmada mas implantação ainda pending → não grava (cenário: mensalidade chegou via sync antes da implantação ser paga)', async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue({ status: 'pending', activatedAt: null } as any)
    vi.mocked(prisma.payment.findMany).mockResolvedValue([
      paymentRow({ id: 'impl_1', type: 'implantacao', status: 'pending', dueDate: null }),
      paymentRow({ id: 'mens_1', type: 'mensalidade', status: 'confirmed', dueDate: new Date('2026-05-01') }),
    ] as any)

    await markCompanyActivatedIfComplete('company_1')

    expect(prisma.company.updateMany).not.toHaveBeenCalled()
  })

  it('chamadas repetidas (idempotência/concorrência): 2ª chamada não reconsulta payments se a 1ª já tiver gravado activatedAt no banco real — aqui simulado via mock atualizado entre chamadas', async () => {
    // 1ª chamada: ainda não ativada, completa → grava.
    vi.mocked(prisma.company.findUnique).mockResolvedValueOnce({ status: 'onboarding_pending', activatedAt: null } as any)
    vi.mocked(prisma.payment.findMany).mockResolvedValue([
      paymentRow({ id: 'impl_1', type: 'implantacao', status: 'confirmed', dueDate: null }),
      paymentRow({ id: 'mens_1', type: 'mensalidade', status: 'confirmed', dueDate: new Date('2026-05-01') }),
    ] as any)
    await markCompanyActivatedIfComplete('company_1')
    expect(prisma.company.updateMany).toHaveBeenCalledTimes(1)

    // 2ª chamada: agora já ativada (reflete o resultado real da 1ª escrita) → no-op.
    vi.mocked(prisma.company.findUnique).mockResolvedValueOnce({ status: 'onboarding_pending', activatedAt: new Date() } as any)
    await markCompanyActivatedIfComplete('company_1')
    expect(prisma.company.updateMany).toHaveBeenCalledTimes(1) // não subiu para 2
  })

  it('client explícito (ex.: tx de uma transação) é usado em vez do prisma global — nenhuma chamada ao prisma global acontece', async () => {
    const tx: any = {
      company: { findUnique: vi.fn(), updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      payment: { findMany: vi.fn() },
    }
    tx.company.findUnique.mockResolvedValue({ status: 'onboarding_pending', activatedAt: null })
    tx.payment.findMany.mockResolvedValue([
      paymentRow({ id: 'impl_1', type: 'implantacao', status: 'confirmed', dueDate: null }),
      paymentRow({ id: 'mens_1', type: 'mensalidade', status: 'confirmed', dueDate: new Date('2026-05-01') }),
    ])

    await markCompanyActivatedIfComplete('company_1', { client: tx })

    expect(tx.company.findUnique).toHaveBeenCalledTimes(1)
    expect(tx.payment.findMany).toHaveBeenCalledTimes(1)
    expect(tx.company.updateMany).toHaveBeenCalledWith({
      where: { id: 'company_1', activatedAt: null },
      data:  { activatedAt: expect.any(Date) },
    })
    // Nenhuma chamada vazou para o client global — é isso que garante que,
    // dentro de uma transação real (webhook Asaas), a leitura/escrita de
    // ativação participa da MESMA transação que confirma o Payment.
    expect(prisma.company.findUnique).not.toHaveBeenCalled()
    expect(prisma.payment.findMany).not.toHaveBeenCalled()
    expect(prisma.company.updateMany).not.toHaveBeenCalled()
  })

  it('now explícito é reaproveitado tal qual (nunca recalcula um new Date() próprio quando recebido)', async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue({ status: 'onboarding_pending', activatedAt: null } as any)
    vi.mocked(prisma.payment.findMany).mockResolvedValue([
      paymentRow({ id: 'impl_1', type: 'implantacao', status: 'confirmed', dueDate: null }),
      paymentRow({ id: 'mens_1', type: 'mensalidade', status: 'confirmed', dueDate: new Date('2026-05-01') }),
    ] as any)
    const explicitNow = new Date('2026-03-03T03:03:03.000Z')

    await markCompanyActivatedIfComplete('company_1', { now: explicitNow })

    expect(prisma.company.updateMany).toHaveBeenCalledWith({
      where: { id: 'company_1', activatedAt: null },
      data:  { activatedAt: explicitNow },
    })
  })
})
