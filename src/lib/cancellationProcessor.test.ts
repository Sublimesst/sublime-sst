import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'

vi.mock('./prisma', () => ({
  prisma: {
    cancellationRequest: { findMany: vi.fn(), updateMany: vi.fn() },
    company: { updateMany: vi.fn() },
  },
}))

vi.mock('./asaas', () => ({
  cancelSubscription: vi.fn(),
}))

vi.mock('./mailer', () => ({
  sendCancellationConfirmedClient: vi.fn(async () => {}),
  notifyPartnerCompanyCancelled:   vi.fn(async () => {}),
}))

let processDueCancellations: typeof import('./cancellationProcessor').processDueCancellations
let prisma: typeof import('./prisma').prisma
let cancelSubscription: typeof import('./asaas').cancelSubscription
let sendCancellationConfirmedClient: typeof import('./mailer').sendCancellationConfirmedClient
let notifyPartnerCompanyCancelled: typeof import('./mailer').notifyPartnerCompanyCancelled

beforeAll(async () => {
  ;({ processDueCancellations } = await import('./cancellationProcessor'))
  ;({ prisma } = await import('./prisma'))
  ;({ cancelSubscription } = await import('./asaas'))
  ;({ sendCancellationConfirmedClient, notifyPartnerCompanyCancelled } = await import('./mailer'))
})

const NOW = new Date('2027-01-15T09:00:00.000Z')

function dueRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cr_1',
    companyId: 'company_1',
    requestedAt: new Date('2026-02-01'),
    reason: 'Motivo de teste',
    requestedBy: 'admin_teste',
    handledBy: null,
    feeCents: null,
    pendingCents: null,
    notes: null,
    kind: 'non_renewal_notice',
    activatedAtSnapshot: new Date('2026-01-15T09:00:00.000Z'),
    effectiveAt: NOW,
    status: 'pending',
    processedAt: null,
    lastProcessingError: null,
    company: {
      id: 'company_1',
      status: 'active',
      razaoSocial: 'Empresa Teste LTDA',
      email: 'teste@example.com',
      responsavel: 'Fulano de Tal',
      asaasSubscriptionId: 'sub_mock_1',
      partner: null,
    },
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.company.updateMany).mockResolvedValue({ count: 1 } as any)
  vi.mocked(prisma.cancellationRequest.updateMany).mockResolvedValue({ count: 1 } as any)
})

describe('processDueCancellations — seleção do que está devido', () => {
  it('consulta só status=pending com effectiveAt <= now', async () => {
    vi.mocked(prisma.cancellationRequest.findMany).mockResolvedValue([])

    await processDueCancellations(NOW)

    expect(prisma.cancellationRequest.findMany).toHaveBeenCalledWith({
      where: { status: 'pending', effectiveAt: { lte: NOW } },
      include: { company: { include: { partner: true } } },
    })
  })

  it('nenhum pedido devido → 0 processados, 0 falhas, nenhuma chamada externa', async () => {
    vi.mocked(prisma.cancellationRequest.findMany).mockResolvedValue([])

    const result = await processDueCancellations(NOW)

    expect(result).toEqual({ processed: 0, failed: 0, skipped: 0 })
    expect(cancelSubscription).not.toHaveBeenCalled()
  })
})

describe('processDueCancellations — caminho feliz', () => {
  it('cancela a Asaas ANTES da transição local, marca Company cancelled, finaliza o pedido e envia e-mail de conclusão', async () => {
    vi.mocked(prisma.cancellationRequest.findMany).mockResolvedValue([dueRequest()] as any)
    vi.mocked(cancelSubscription).mockResolvedValue({ alreadyCancelled: false })

    const result = await processDueCancellations(NOW)

    expect(result).toEqual({ processed: 1, failed: 0, skipped: 0 })
    expect(cancelSubscription).toHaveBeenCalledWith('sub_mock_1')
    expect(prisma.company.updateMany).toHaveBeenCalledWith({
      where: { id: 'company_1', status: { not: 'cancelled' } },
      data:  { status: 'cancelled', subscriptionStatus: 'inactive' },
    })
    expect(prisma.cancellationRequest.updateMany).toHaveBeenCalledWith({
      where: { id: 'cr_1', status: 'pending' },
      data:  { status: 'processed', processedAt: NOW, lastProcessingError: null },
    })
    expect(sendCancellationConfirmedClient).toHaveBeenCalledTimes(1)
    expect(notifyPartnerCompanyCancelled).not.toHaveBeenCalled()
  })

  it('Company com parceiro vinculado → notifica também o parceiro', async () => {
    vi.mocked(prisma.cancellationRequest.findMany).mockResolvedValue([
      dueRequest({ company: { ...dueRequest().company, partner: { id: 'p1', name: 'Parceiro X', email: 'p@example.com' } } }),
    ] as any)
    vi.mocked(cancelSubscription).mockResolvedValue({ alreadyCancelled: false })

    await processDueCancellations(NOW)

    expect(notifyPartnerCompanyCancelled).toHaveBeenCalledWith({ to: 'p@example.com', partnerName: 'Parceiro X', companyName: 'Empresa Teste LTDA' })
  })

  it('Company sem assinatura Asaas → não chama a Asaas, não inventa subscriptionStatus', async () => {
    vi.mocked(prisma.cancellationRequest.findMany).mockResolvedValue([
      dueRequest({ company: { ...dueRequest().company, asaasSubscriptionId: null } }),
    ] as any)

    await processDueCancellations(NOW)

    expect(cancelSubscription).not.toHaveBeenCalled()
    expect(prisma.company.updateMany).toHaveBeenCalledWith({
      where: { id: 'company_1', status: { not: 'cancelled' } },
      data:  { status: 'cancelled' },
    })
  })

  it('processador chamado exatamente na data efetiva (effectiveAt === now) processa normalmente', async () => {
    vi.mocked(prisma.cancellationRequest.findMany).mockResolvedValue([dueRequest({ effectiveAt: NOW })] as any)
    vi.mocked(cancelSubscription).mockResolvedValue({ alreadyCancelled: false })

    const result = await processDueCancellations(NOW)

    expect(result.processed).toBe(1)
  })

  it('processador chamado depois da data efetiva (effectiveAt no passado) processa normalmente', async () => {
    const past = new Date(NOW.getTime() - 10 * 24 * 60 * 60 * 1000)
    vi.mocked(prisma.cancellationRequest.findMany).mockResolvedValue([dueRequest({ effectiveAt: past })] as any)
    vi.mocked(cancelSubscription).mockResolvedValue({ alreadyCancelled: false })

    const result = await processDueCancellations(NOW)

    expect(result.processed).toBe(1)
  })
})

describe('processDueCancellations — falha da Asaas (fail-closed, retryable)', () => {
  it('falha real → pedido permanece pending, nenhuma mutação local, lastProcessingError registrado, resultado failed', async () => {
    vi.mocked(prisma.cancellationRequest.findMany).mockResolvedValue([dueRequest()] as any)
    vi.mocked(cancelSubscription).mockRejectedValue(new Error('Asaas API error 500: {}'))

    const result = await processDueCancellations(NOW)

    expect(result).toEqual({ processed: 0, failed: 1, skipped: 0 })
    expect(prisma.company.updateMany).not.toHaveBeenCalled()
    expect(prisma.cancellationRequest.updateMany).toHaveBeenCalledWith({
      where: { id: 'cr_1', status: 'pending' },
      data:  { lastProcessingError: expect.stringContaining('Asaas API error 500') },
    })
    expect(sendCancellationConfirmedClient).not.toHaveBeenCalled()
  })

  it('não mascara 401/400 como sucesso — qualquer erro lançado por cancelSubscription é tratado como falha', async () => {
    vi.mocked(prisma.cancellationRequest.findMany).mockResolvedValue([dueRequest()] as any)
    vi.mocked(cancelSubscription).mockRejectedValue(new Error('Asaas API error 401: {}'))

    const result = await processDueCancellations(NOW)

    expect(result.failed).toBe(1)
    expect(prisma.company.updateMany).not.toHaveBeenCalled()
  })

  it('retry após falha: 1ª execução falha, 2ª execução (mesmo pedido ainda pending) processa com sucesso', async () => {
    vi.mocked(prisma.cancellationRequest.findMany).mockResolvedValue([dueRequest()] as any)
    vi.mocked(cancelSubscription).mockRejectedValueOnce(new Error('Asaas API error 500: {}'))
    vi.mocked(cancelSubscription).mockResolvedValueOnce({ alreadyCancelled: false })

    const first = await processDueCancellations(NOW)
    expect(first.failed).toBe(1)

    const second = await processDueCancellations(NOW)
    expect(second.processed).toBe(1)
    expect(prisma.company.updateMany).toHaveBeenCalledTimes(1)
  })
})

describe('processDueCancellations — recuperação após queda entre a Asaas e a gravação local', () => {
  it('subscription já cancelada na Asaas (alreadyCancelled) mas Company ainda não local → completa normalmente', async () => {
    vi.mocked(prisma.cancellationRequest.findMany).mockResolvedValue([dueRequest()] as any)
    vi.mocked(cancelSubscription).mockResolvedValue({ alreadyCancelled: true })

    const result = await processDueCancellations(NOW)

    expect(result.processed).toBe(1)
    expect(prisma.company.updateMany).toHaveBeenCalledWith({
      where: { id: 'company_1', status: { not: 'cancelled' } },
      data:  { status: 'cancelled', subscriptionStatus: 'inactive' },
    })
  })

  it('Company já cancelled (etapa Asaas+local já concluída em execução anterior) → pula direto para finalizar, sem rechamar a Asaas', async () => {
    vi.mocked(prisma.cancellationRequest.findMany).mockResolvedValue([
      dueRequest({ company: { ...dueRequest().company, status: 'cancelled' } }),
    ] as any)

    const result = await processDueCancellations(NOW)

    expect(result.processed).toBe(1)
    expect(cancelSubscription).not.toHaveBeenCalled()
    expect(prisma.company.updateMany).not.toHaveBeenCalled()
    expect(prisma.cancellationRequest.updateMany).toHaveBeenCalledWith({
      where: { id: 'cr_1', status: 'pending' },
      data:  { status: 'processed', processedAt: NOW, lastProcessingError: null },
    })
  })
})

describe('processDueCancellations — idempotência e concorrência', () => {
  it('pedido já processado (finalize count=0, ex.: corrida vencida por outra execução) → skipped, nenhum e-mail reenviado', async () => {
    vi.mocked(prisma.cancellationRequest.findMany).mockResolvedValue([dueRequest()] as any)
    vi.mocked(cancelSubscription).mockResolvedValue({ alreadyCancelled: false })
    vi.mocked(prisma.cancellationRequest.updateMany).mockResolvedValue({ count: 0 } as any)

    const result = await processDueCancellations(NOW)

    expect(result).toEqual({ processed: 0, failed: 0, skipped: 1 })
    expect(sendCancellationConfirmedClient).not.toHaveBeenCalled()
    expect(notifyPartnerCompanyCancelled).not.toHaveBeenCalled()
  })

  it('reexecução do mesmo lote não duplica e-mail nem processedAt — só uma finalização bem-sucedida por pedido', async () => {
    vi.mocked(prisma.cancellationRequest.findMany).mockResolvedValue([dueRequest()] as any)
    vi.mocked(cancelSubscription).mockResolvedValue({ alreadyCancelled: false })

    await processDueCancellations(NOW)
    expect(sendCancellationConfirmedClient).toHaveBeenCalledTimes(1)

    // 2ª "execução" simulada do mesmo pedido: já processed no banco real, mas
    // aqui simulamos o retorno do finalize como count:0 (o guard que garante
    // isso na prática, já exercitado no teste anterior).
    vi.mocked(prisma.cancellationRequest.updateMany).mockResolvedValue({ count: 0 } as any)
    await processDueCancellations(NOW)
    expect(sendCancellationConfirmedClient).toHaveBeenCalledTimes(1) // não subiu para 2
  })

  it('dois pedidos due no mesmo lote são processados independentemente', async () => {
    vi.mocked(prisma.cancellationRequest.findMany).mockResolvedValue([
      dueRequest({ id: 'cr_1', companyId: 'company_1', company: { ...dueRequest().company, id: 'company_1' } }),
      dueRequest({ id: 'cr_2', companyId: 'company_2', company: { ...dueRequest().company, id: 'company_2', asaasSubscriptionId: 'sub_mock_2' } }),
    ] as any)
    vi.mocked(cancelSubscription).mockResolvedValue({ alreadyCancelled: false })

    const result = await processDueCancellations(NOW)

    expect(result.processed).toBe(2)
    expect(cancelSubscription).toHaveBeenCalledWith('sub_mock_1')
    expect(cancelSubscription).toHaveBeenCalledWith('sub_mock_2')
  })
})

describe('processDueCancellations — Commission nunca é tocada aqui (gate isolado)', () => {
  it('processamento bem-sucedido não referencia nem muta Commission', async () => {
    vi.mocked(prisma.cancellationRequest.findMany).mockResolvedValue([dueRequest()] as any)
    vi.mocked(cancelSubscription).mockResolvedValue({ alreadyCancelled: false })

    // Nenhum mock de prisma.commission existe neste arquivo — se o processor
    // tentasse chamar prisma.commission.*, o teste falharia com
    // "Cannot read properties of undefined", provando a ausência de qualquer
    // mutação de Commission no processor.
    await expect(processDueCancellations(NOW)).resolves.toEqual({ processed: 1, failed: 0, skipped: 0 })
  })
})
