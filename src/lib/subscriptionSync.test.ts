import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Prisma } from '@prisma/client'

// Mocks sem rede e sem banco real — vi.mock intercepta os módulos antes do
// import do arquivo sob teste.
vi.mock('./asaas', () => ({
  listSubscriptionPayments: vi.fn(),
}))

vi.mock('./prisma', () => ({
  prisma: {
    payment: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

import { syncFirstSubscriptionPayment } from './subscriptionSync'
import { listSubscriptionPayments } from './asaas'
import { prisma } from './prisma'

const listMock = vi.mocked(listSubscriptionPayments)
const createMock = vi.mocked(prisma.payment.create)
const findUniqueMock = vi.mocked(prisma.payment.findUnique)

const EXPECTED_CENTS = 19900 // R$199,00

function uniqueConflict() {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed on the fields: (`asaasId`)', {
    code: 'P2002', clientVersion: '5.22.0',
  })
}

function charge(overrides: Partial<{ id: string; value: number; dueDate: string; status: string; invoiceUrl: string }> = {}) {
  return {
    id: 'pay_abc123',
    value: 199,
    dueDate: '2026-08-27',
    status: 'PENDING',
    invoiceUrl: 'https://www.asaas.com/i/abc123',
    bankSlipUrl: undefined,
    pixQrCodeId: undefined,
    invoiceNumber: '000001',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('syncFirstSubscriptionPayment', () => {
  it('1) primeira cobrança criada normalmente', async () => {
    listMock.mockResolvedValue([charge()])
    createMock.mockResolvedValue({ id: 'payment-1' } as any)

    const result = await syncFirstSubscriptionPayment({
      companyId: 'company-1', subscriptionId: 'sub-1', expectedAmountCents: EXPECTED_CENTS,
    })

    expect(result).toEqual({ outcome: 'synced', paymentId: 'payment-1', asaasId: 'pay_abc123' })
    expect(createMock).toHaveBeenCalledTimes(1)
    expect(createMock.mock.calls[0][0].data).toMatchObject({
      companyId: 'company-1', type: 'mensalidade', amount: 19900, status: 'pending', asaasId: 'pay_abc123',
    })
    expect(findUniqueMock).not.toHaveBeenCalled()
  })

  it('2) segunda execução retorna o mesmo Payment sem duplicar', async () => {
    listMock.mockResolvedValue([charge()])
    createMock.mockRejectedValue(uniqueConflict())
    findUniqueMock.mockResolvedValue({ id: 'payment-1', companyId: 'company-1', type: 'mensalidade', amount: 19900 } as any)

    const result = await syncFirstSubscriptionPayment({
      companyId: 'company-1', subscriptionId: 'sub-1', expectedAmountCents: EXPECTED_CENTS,
    })

    expect(result).toEqual({ outcome: 'already_exists', paymentId: 'payment-1', asaasId: 'pay_abc123' })
    expect(findUniqueMock).toHaveBeenCalledWith({ where: { asaasId: 'pay_abc123' } })
  })

  it('3) Payment confirmed nunca é alterado/regredido (nenhuma escrita sobre o existente)', async () => {
    listMock.mockResolvedValue([charge({ status: 'PENDING' })]) // Asaas ainda mostra pending
    createMock.mockRejectedValue(uniqueConflict())
    findUniqueMock.mockResolvedValue({ id: 'payment-1', companyId: 'company-1', type: 'mensalidade', amount: 19900, status: 'confirmed' } as any)

    const result = await syncFirstSubscriptionPayment({
      companyId: 'company-1', subscriptionId: 'sub-1', expectedAmountCents: EXPECTED_CENTS,
    })

    expect(result).toEqual({ outcome: 'already_exists', paymentId: 'payment-1', asaasId: 'pay_abc123' })
    expect((prisma.payment as any).update).toBeUndefined() // função não tem/usa update em lugar nenhum
  })

  it('4) duas execuções concorrentes simuladas não duplicam (2ª colide via P2002)', async () => {
    listMock.mockResolvedValue([charge()])
    createMock
      .mockResolvedValueOnce({ id: 'payment-1' } as any)
      .mockRejectedValueOnce(uniqueConflict())
    findUniqueMock.mockResolvedValue({ id: 'payment-1', companyId: 'company-1', type: 'mensalidade', amount: 19900 } as any)

    const [r1, r2] = await Promise.all([
      syncFirstSubscriptionPayment({ companyId: 'company-1', subscriptionId: 'sub-1', expectedAmountCents: EXPECTED_CENTS }),
      syncFirstSubscriptionPayment({ companyId: 'company-1', subscriptionId: 'sub-1', expectedAmountCents: EXPECTED_CENTS }),
    ])

    expect([r1.outcome, r2.outcome].sort()).toEqual(['already_exists', 'synced'])
    expect(createMock).toHaveBeenCalledTimes(2)
  })

  it('5) asaasId pertencente a outra empresa retorna conflict', async () => {
    listMock.mockResolvedValue([charge()])
    createMock.mockRejectedValue(uniqueConflict())
    findUniqueMock.mockResolvedValue({ id: 'payment-de-outra-empresa', companyId: 'OUTRA-EMPRESA', type: 'mensalidade', amount: 19900 } as any)

    const result = await syncFirstSubscriptionPayment({
      companyId: 'company-1', subscriptionId: 'sub-1', expectedAmountCents: EXPECTED_CENTS,
    })

    expect(result).toEqual({ outcome: 'conflict', paymentId: 'payment-de-outra-empresa', asaasId: 'pay_abc123' })
  })

  it('6) asaasId com type diferente retorna conflict', async () => {
    listMock.mockResolvedValue([charge()])
    createMock.mockRejectedValue(uniqueConflict())
    findUniqueMock.mockResolvedValue({ id: 'payment-implantacao', companyId: 'company-1', type: 'implantacao', amount: 19900 } as any)

    const result = await syncFirstSubscriptionPayment({
      companyId: 'company-1', subscriptionId: 'sub-1', expectedAmountCents: EXPECTED_CENTS,
    })

    expect(result).toEqual({ outcome: 'conflict', paymentId: 'payment-implantacao', asaasId: 'pay_abc123' })
  })

  it('7) asaasId com amount diferente retorna conflict', async () => {
    listMock.mockResolvedValue([charge()])
    createMock.mockRejectedValue(uniqueConflict())
    findUniqueMock.mockResolvedValue({ id: 'payment-valor-errado', companyId: 'company-1', type: 'mensalidade', amount: 32000 } as any)

    const result = await syncFirstSubscriptionPayment({
      companyId: 'company-1', subscriptionId: 'sub-1', expectedAmountCents: EXPECTED_CENTS,
    })

    expect(result).toEqual({ outcome: 'conflict', paymentId: 'payment-valor-errado', asaasId: 'pay_abc123' })
  })

  it('8) dueDate inválida não cria Payment', async () => {
    listMock.mockResolvedValue([charge({ dueDate: 'data-invalida' })])

    const result = await syncFirstSubscriptionPayment({
      companyId: 'company-1', subscriptionId: 'sub-1', expectedAmountCents: EXPECTED_CENTS,
    })

    expect(result).toEqual({ outcome: 'not_found' })
    expect(createMock).not.toHaveBeenCalled()
  })

  it('9) conversão decimal 1.1 → 110 centavos', async () => {
    listMock.mockResolvedValue([charge({ value: 1.1 })])
    createMock.mockResolvedValue({ id: 'payment-1' } as any)

    const result = await syncFirstSubscriptionPayment({
      companyId: 'company-1', subscriptionId: 'sub-1', expectedAmountCents: 110,
    })

    expect(result).toEqual({ outcome: 'synced', paymentId: 'payment-1', asaasId: 'pay_abc123' })
    expect(createMock.mock.calls[0][0].data.amount).toBe(110)
  })

  it('10) cobrança ausente após retries não quebra o cadastro', async () => {
    listMock.mockResolvedValue([])

    const result = await syncFirstSubscriptionPayment({
      companyId: 'company-1', subscriptionId: 'sub-1', expectedAmountCents: EXPECTED_CENTS,
    })

    expect(result).toEqual({ outcome: 'not_found' })
    expect(listMock).toHaveBeenCalledTimes(3)
    expect(createMock).not.toHaveBeenCalled()
  }, 10000)

  it('11) valor divergente não cria Payment', async () => {
    listMock.mockResolvedValue([charge({ value: 149 })]) // implantação, não mensalidade

    const result = await syncFirstSubscriptionPayment({
      companyId: 'company-1', subscriptionId: 'sub-1', expectedAmountCents: EXPECTED_CENTS,
    })

    expect(result).toEqual({ outcome: 'not_found' })
    expect(createMock).not.toHaveBeenCalled()
  })

  it('12) falha do Asaas não provoca nova assinatura/cobrança — retorna error', async () => {
    listMock.mockRejectedValue(new Error('Asaas API error 500'))

    const result = await syncFirstSubscriptionPayment({
      companyId: 'company-1', subscriptionId: 'sub-1', expectedAmountCents: EXPECTED_CENTS,
    })

    expect(result).toEqual({ outcome: 'error', reason: 'Asaas API error 500' })
    expect(createMock).not.toHaveBeenCalled()
  })

  it('13) duas cobranças ambíguas (mesmo valor, mesmo dueDate) não criam registro', async () => {
    listMock.mockResolvedValue([
      charge({ id: 'pay_a', dueDate: '2026-08-27' }),
      charge({ id: 'pay_b', dueDate: '2026-08-27' }),
    ])

    const result = await syncFirstSubscriptionPayment({
      companyId: 'company-1', subscriptionId: 'sub-1', expectedAmountCents: EXPECTED_CENTS,
    })

    expect(result).toEqual({ outcome: 'ambiguous', candidatesCount: 2 })
    expect(createMock).not.toHaveBeenCalled()
  })

  it('14) expectedAmountCents inválido retorna error sem chamar Asaas', async () => {
    const result = await syncFirstSubscriptionPayment({
      companyId: 'company-1', subscriptionId: 'sub-1', expectedAmountCents: -1,
    })

    expect(result.outcome).toBe('error')
    expect(listMock).not.toHaveBeenCalled()
  })
})
