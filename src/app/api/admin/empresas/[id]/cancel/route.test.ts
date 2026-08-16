import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'

process.env.ADMIN_SECRET = 'test-admin-secret'

// tx === prisma no mock (mesmo padrão de src/app/api/partners/route.test.ts)
// — os mocks de company/cancellationRequest abaixo servem tanto para o
// caminho normal quanto para dentro de runSerializable. `prisma` é definido
// inteiramente dentro da factory (nunca importado de volta no topo do
// arquivo) para não precisar de top-level await, que o tsconfig atual não
// suporta (ver TS1378, pré-existente em outros arquivos de teste do repo).
vi.mock('@/lib/prisma', () => {
  const prisma: any = {
    company: { findUnique: vi.fn(), updateMany: vi.fn() },
    cancellationRequest: { create: vi.fn(), findFirst: vi.fn() },
    commission: { updateMany: vi.fn() },
  }
  prisma.$transaction = vi.fn(async (cb: any) => cb(prisma))
  return { prisma }
})

vi.mock('@/lib/asaas', () => ({
  cancelSubscription: vi.fn(),
}))

vi.mock('@/lib/mailer', () => ({
  sendCancellationConfirmedClient:        vi.fn(async () => {}),
  sendCancellationNoticeRegisteredClient: vi.fn(async () => {}),
  notifyPartnerCompanyCancelled:          vi.fn(async () => {}),
}))

// Import dinâmico dentro de beforeAll para respeitar o hoisting do vi.mock
// (mesmo padrão já usado neste arquivo antes desta migração).
let POST: typeof import('./route').POST
let prisma: typeof import('@/lib/prisma').prisma
let cancelSubscription: typeof import('@/lib/asaas').cancelSubscription
let sendCancellationConfirmedClient: typeof import('@/lib/mailer').sendCancellationConfirmedClient
let sendCancellationNoticeRegisteredClient: typeof import('@/lib/mailer').sendCancellationNoticeRegisteredClient
let notifyPartnerCompanyCancelled: typeof import('@/lib/mailer').notifyPartnerCompanyCancelled

beforeAll(async () => {
  ;({ POST } = await import('./route'))
  ;({ prisma } = await import('@/lib/prisma'))
  ;({ cancelSubscription } = await import('@/lib/asaas'))
  ;({ sendCancellationConfirmedClient, sendCancellationNoticeRegisteredClient, notifyPartnerCompanyCancelled } = await import('@/lib/mailer'))
})

function serializationConflict() {
  return new Prisma.PrismaClientKnownRequestError('could not serialize access due to concurrent update', {
    code: 'P2034', clientVersion: '5.22.0',
  })
}

function paymentRow(overrides: Partial<{ id: string; type: string; status: string; dueDate: Date | null; createdAt: Date; amount: number; checkoutUrl: string | null }> = {}) {
  return {
    id: 'pay_row', type: 'mensalidade', status: 'pending', amount: 19900,
    dueDate: new Date('2026-05-01'), createdAt: new Date('2026-04-01'), checkoutUrl: null,
    ...overrides,
  }
}

// financiallyComplete = true: implantação + primeira mensalidade confirmed.
const FINANCIALLY_COMPLETE_PAYMENTS = [
  paymentRow({ id: 'impl_1', type: 'implantacao', status: 'confirmed', dueDate: null, createdAt: new Date('2026-01-01') }),
  paymentRow({ id: 'mens_1', type: 'mensalidade', status: 'confirmed', dueDate: new Date('2026-01-15'), createdAt: new Date('2026-01-01') }),
]
// financiallyComplete = false: só implantação, ainda pendente de mensalidade.
const FINANCIALLY_INCOMPLETE_PAYMENTS = [
  paymentRow({ id: 'impl_1', type: 'implantacao', status: 'confirmed', dueDate: null, createdAt: new Date('2026-01-01') }),
]

function baseCompany(overrides: Record<string, unknown> = {}) {
  return {
    id: 'company_mock_1',
    status: 'active',
    razaoSocial: 'Empresa Teste LTDA',
    email: 'teste@example.com',
    responsavel: 'Fulano de Tal',
    asaasSubscriptionId: 'sub_mock_1',
    activatedAt: new Date('2026-01-15T09:00:00.000Z'),
    partner: null,
    payments: FINANCIALLY_COMPLETE_PAYMENTS,
    ...overrides,
  }
}

function cancelRequest(body: Record<string, unknown> = {}) {
  return new NextRequest('https://www.sublimesst.com/api/admin/empresas/company_mock_1/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-secret': 'test-admin-secret' },
    body: JSON.stringify({ reason: 'Motivo de teste', requestedBy: 'admin_teste', ...body }),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb(prisma))
  vi.mocked(prisma.company.updateMany).mockResolvedValue({ count: 1 } as any)
  vi.mocked(prisma.cancellationRequest.create).mockResolvedValue({ id: 'cr_mock_1', effectiveAt: new Date('2027-01-15T09:00:00.000Z') } as any)
  vi.mocked(prisma.cancellationRequest.findFirst).mockResolvedValue(null)
  vi.mocked(prisma.commission.updateMany).mockResolvedValue({ count: 0 } as any)
})

describe('POST /api/admin/empresas/[id]/cancel — já cancelada (idempotência universal)', () => {
  it('Company já cancelled → idempotente, sem chamar a Asaas nem tocar nada mais', async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue(baseCompany({ status: 'cancelled' }) as any)

    const res = await POST(cancelRequest(), { params: { id: 'company_mock_1' } })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.alreadyCancelled).toBe(true)
    expect(cancelSubscription).not.toHaveBeenCalled()
    expect(prisma.company.updateMany).not.toHaveBeenCalled()
    expect(prisma.cancellationRequest.create).not.toHaveBeenCalled()
  })
})

describe('POST /api/admin/empresas/[id]/cancel — Company legada sem ativação confiável (fail-closed)', () => {
  it('activatedAt null + financeiramente completa → 409 bloqueado, nenhuma mutação, nenhuma chamada Asaas', async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue(
      baseCompany({ activatedAt: null, payments: FINANCIALLY_COMPLETE_PAYMENTS }) as any
    )

    const res = await POST(cancelRequest(), { params: { id: 'company_mock_1' } })
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body.success).toBe(false)
    expect(body.code).toBe('activation_unknown_requires_manual_review')
    expect(cancelSubscription).not.toHaveBeenCalled()
    expect(prisma.company.updateMany).not.toHaveBeenCalled()
    expect(prisma.cancellationRequest.create).not.toHaveBeenCalled()
    expect(prisma.commission.updateMany).not.toHaveBeenCalled()
  })
})

describe('POST /api/admin/empresas/[id]/cancel — desistência pré-ativação (imediata)', () => {
  it('activatedAt null + financeiramente incompleta + Asaas ok → cancelamento imediato, mesma semântica da PR #23', async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue(
      baseCompany({ activatedAt: null, payments: FINANCIALLY_INCOMPLETE_PAYMENTS }) as any
    )
    vi.mocked(cancelSubscription).mockResolvedValue({ alreadyCancelled: false })

    const res = await POST(cancelRequest(), { params: { id: 'company_mock_1' } })
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(cancelSubscription).toHaveBeenCalledWith('sub_mock_1')
    expect(prisma.company.updateMany).toHaveBeenCalledWith({
      where: { id: 'company_mock_1', status: { not: 'cancelled' } },
      data:  { status: 'cancelled', subscriptionStatus: 'inactive' },
    })
    const createArgs = vi.mocked(prisma.cancellationRequest.create).mock.calls[0][0] as any
    expect(createArgs.data.kind).toBe('pre_activation_withdrawal')
    expect(createArgs.data.status).toBe('processed')
    expect(createArgs.data.processedAt).toBeInstanceOf(Date)
    expect(prisma.commission.updateMany).toHaveBeenCalledWith({
      where: { companyId: 'company_mock_1', status: 'em_carencia' },
      data:  { status: 'estornada' },
    })
    expect(sendCancellationConfirmedClient).toHaveBeenCalledTimes(1)
    expect(sendCancellationNoticeRegisteredClient).not.toHaveBeenCalled()
    expect(body.data.emailSent.cliente).toBe(true)
  })

  it('Asaas devolve alreadyCancelled → mesmo resultado local imediato', async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue(
      baseCompany({ activatedAt: null, payments: FINANCIALLY_INCOMPLETE_PAYMENTS }) as any
    )
    vi.mocked(cancelSubscription).mockResolvedValue({ alreadyCancelled: true })

    const res = await POST(cancelRequest(), { params: { id: 'company_mock_1' } })

    expect(res.status).toBe(201)
    expect(prisma.company.updateMany).toHaveBeenCalledWith({
      where: { id: 'company_mock_1', status: { not: 'cancelled' } },
      data:  { status: 'cancelled', subscriptionStatus: 'inactive' },
    })
  })

  it('falha real na Asaas → 502, nenhuma transição local', async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue(
      baseCompany({ activatedAt: null, payments: FINANCIALLY_INCOMPLETE_PAYMENTS }) as any
    )
    vi.mocked(cancelSubscription).mockRejectedValue(new Error('Asaas API error 500: {}'))

    const res = await POST(cancelRequest(), { params: { id: 'company_mock_1' } })
    const body = await res.json()

    expect(res.status).toBe(502)
    expect(body.success).toBe(false)
    expect(prisma.company.updateMany).not.toHaveBeenCalled()
    expect(prisma.cancellationRequest.create).not.toHaveBeenCalled()
    expect(prisma.commission.updateMany).not.toHaveBeenCalled()
  })

  it('Company sem asaasSubscriptionId → não chama a Asaas, não inventa subscriptionStatus', async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue(
      baseCompany({ activatedAt: null, payments: FINANCIALLY_INCOMPLETE_PAYMENTS, asaasSubscriptionId: null }) as any
    )

    const res = await POST(cancelRequest(), { params: { id: 'company_mock_1' } })

    expect(res.status).toBe(201)
    expect(cancelSubscription).not.toHaveBeenCalled()
    expect(prisma.company.updateMany).toHaveBeenCalledWith({
      where: { id: 'company_mock_1', status: { not: 'cancelled' } },
      data:  { status: 'cancelled' },
    })
  })

  it('corrida: Company cancelada por outra chamada entre o check e a transição → idempotente', async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue(
      baseCompany({ activatedAt: null, payments: FINANCIALLY_INCOMPLETE_PAYMENTS }) as any
    )
    vi.mocked(cancelSubscription).mockResolvedValue({ alreadyCancelled: false })
    vi.mocked(prisma.company.updateMany).mockResolvedValue({ count: 0 } as any)

    const res = await POST(cancelRequest(), { params: { id: 'company_mock_1' } })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.alreadyCancelled).toBe(true)
    expect(prisma.cancellationRequest.create).not.toHaveBeenCalled()
  })

  it('e-mail ao parceiro só é enviado quando há parceiro vinculado', async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue(
      baseCompany({
        activatedAt: null, payments: FINANCIALLY_INCOMPLETE_PAYMENTS,
        partner: { id: 'partner_1', name: 'Parceiro Teste', email: 'parceiro@example.com' },
      }) as any
    )
    vi.mocked(cancelSubscription).mockResolvedValue({ alreadyCancelled: false })

    const res = await POST(cancelRequest(), { params: { id: 'company_mock_1' } })
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(notifyPartnerCompanyCancelled).toHaveBeenCalledTimes(1)
    expect(body.data.emailSent.parceiro).toBe(true)
  })
})

describe('POST /api/admin/empresas/[id]/cancel — aviso de não renovação (Company já ativada)', () => {
  it('registra o pedido com effectiveAt calculado, SEM chamar a Asaas e SEM mutar Company/Commission', async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue(baseCompany() as any)

    const res = await POST(cancelRequest(), { params: { id: 'company_mock_1' } })
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(cancelSubscription).not.toHaveBeenCalled()
    expect(prisma.company.updateMany).not.toHaveBeenCalled()
    expect(prisma.commission.updateMany).not.toHaveBeenCalled()

    const createArgs = vi.mocked(prisma.cancellationRequest.create).mock.calls[0][0] as any
    expect(createArgs.data.kind).toBe('non_renewal_notice')
    expect(createArgs.data.status).toBe('pending')
    expect(createArgs.data.activatedAtSnapshot).toEqual(new Date('2026-01-15T09:00:00.000Z'))
    expect(createArgs.data.effectiveAt).toEqual(new Date('2027-01-15T09:00:00.000Z'))
    expect(createArgs.data.processedAt).toBeUndefined()

    expect(sendCancellationNoticeRegisteredClient).toHaveBeenCalledTimes(1)
    expect(sendCancellationConfirmedClient).not.toHaveBeenCalled()
    expect(body.data.emailSent.cliente).toBe(true)
  })

  it('já existe pedido pendente → 200 alreadyRequested, não cria um segundo', async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue(baseCompany() as any)
    vi.mocked(prisma.cancellationRequest.findFirst).mockResolvedValue({
      id: 'cr_existing', effectiveAt: new Date('2027-01-15T09:00:00.000Z'),
      requestedAt: new Date('2026-06-01'), status: 'pending',
    } as any)

    const res = await POST(cancelRequest(), { params: { id: 'company_mock_1' } })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.alreadyRequested).toBe(true)
    expect(body.data.cancellationRequest.id).toBe('cr_existing')
    expect(prisma.cancellationRequest.create).not.toHaveBeenCalled()
    expect(sendCancellationNoticeRegisteredClient).not.toHaveBeenCalled()
  })

  it('corrida: Company já cancelada dentro da transação (ex.: processor concluiu o encerramento efetivo nesse instante) → idempotente', async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue(baseCompany() as any)
    // A checagem FRESCA dentro da transação (tx.company.findUnique) enxerga
    // um estado diferente do lido fora dela — simula a corrida.
    let call = 0
    vi.mocked(prisma.company.findUnique).mockImplementation((() => {
      call++
      return call === 1 ? Promise.resolve(baseCompany() as any) : Promise.resolve({ status: 'cancelled', activatedAt: baseCompany().activatedAt } as any)
    }) as any)

    const res = await POST(cancelRequest(), { params: { id: 'company_mock_1' } })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.alreadyCancelled).toBe(true)
    expect(prisma.cancellationRequest.create).not.toHaveBeenCalled()
  })

  it('conflito de serialização (P2034) na 1ª tentativa → runSerializable reexecuta e completa com sucesso', async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue(baseCompany() as any)
    let attempt = 0
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
      attempt++
      if (attempt === 1) throw serializationConflict()
      return cb(prisma)
    })

    const res = await POST(cancelRequest(), { params: { id: 'company_mock_1' } })

    expect(res.status).toBe(201)
    expect(prisma.$transaction).toHaveBeenCalledTimes(2)
    expect(prisma.cancellationRequest.create).toHaveBeenCalledTimes(1)
  })

  it('pedido dentro dos últimos 90 dias da vigência inicial ainda encerra ao final dos 12 meses (não soma +90 dias)', async () => {
    const activatedAt = new Date('2026-01-15T09:00:00.000Z')
    const initialEnd = new Date('2027-01-15T09:00:00.000Z')
    const requestedAt = new Date(initialEnd.getTime() - 10 * 24 * 60 * 60 * 1000) // 10 dias antes do fim
    vi.mocked(prisma.company.findUnique).mockResolvedValue(baseCompany({ activatedAt }) as any)

    await POST(cancelRequest({ requestedAt: requestedAt.toISOString() }), { params: { id: 'company_mock_1' } })

    const createArgs = vi.mocked(prisma.cancellationRequest.create).mock.calls[0][0] as any
    expect(createArgs.data.effectiveAt).toEqual(initialEnd)
  })

  it('pedido após a renovação (fora da vigência inicial) usa aviso de 90 dias a partir do próprio pedido', async () => {
    const activatedAt = new Date('2026-01-15T09:00:00.000Z')
    const requestedAt = new Date('2027-06-01T00:00:00.000Z') // bem depois do fim dos 12 meses
    vi.mocked(prisma.company.findUnique).mockResolvedValue(baseCompany({ activatedAt }) as any)

    await POST(cancelRequest({ requestedAt: requestedAt.toISOString() }), { params: { id: 'company_mock_1' } })

    const createArgs = vi.mocked(prisma.cancellationRequest.create).mock.calls[0][0] as any
    expect(createArgs.data.effectiveAt).toEqual(new Date(requestedAt.getTime() + 90 * 24 * 60 * 60 * 1000))
  })
})
