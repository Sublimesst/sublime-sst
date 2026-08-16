import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { generateContractPdf } from '@/lib/contractPdf'
import { persistContractPdf } from '@/lib/contractPersistence'
import type { PersistContractResult } from '@/lib/contractPersistence'

const WEBHOOK_SECRET = 'test-webhook-secret-nao-real-0123456789'
process.env.ASAAS_WEBHOOK_TOKEN = WEBHOOK_SECRET

vi.mock('@/lib/prisma', () => ({
  prisma: {
    payment: {
      findFirst: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      count: vi.fn(),
    },
    company: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    commission: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/mailer', () => ({
  sendWelcomeEmail: vi.fn(async () => {}),
  notifyPaymentConfirmed: vi.fn(async () => {}),
  notifyPaymentOverdue: vi.fn(async () => {}),
  notifyContractPdfFailed: vi.fn(async () => {}),
}))

vi.mock('@/lib/contractPdf', () => ({
  generateContractPdf: vi.fn(async () => undefined),
}))

// Mock parcial: persistContractPdf é substituído (controlado por teste),
// mas isContractPersisted continua sendo a implementação REAL — os testes
// de controle do anexo validam a classificação de verdade usada em
// produção, não uma reimplementação paralela dela neste arquivo.
vi.mock('@/lib/contractPersistence', async () => {
  const actual = await vi.importActual<typeof import('@/lib/contractPersistence')>('@/lib/contractPersistence')
  return {
    ...actual,
    persistContractPdf: vi.fn(),
  }
})

const { POST } = await import('./route')
const { prisma } = await import('@/lib/prisma')
const { sendWelcomeEmail, notifyPaymentConfirmed, notifyPaymentOverdue, notifyContractPdfFailed } = await import('@/lib/mailer')
// generateContractPdf e persistContractPdf usam import estático (topo do
// arquivo) em vez de `await import(...)` — mesmo padrão já usado em
// subscriptionSync.test.ts: o vi.mock() abaixo é hoisted pelo Vitest para
// antes de qualquer import (estático ou dinâmico), então a referência
// estática já resolve para a versão mockada, sem precisar de top-level
// await (que o tsconfig atual não suporta — ver TS1378 nas 3 linhas acima,
// pré-existentes e fora do escopo desta correção).

function webhookRequest(body: Record<string, unknown>) {
  return new NextRequest('https://www.sublimesst.com/api/webhooks/asaas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'asaas-access-token': WEBHOOK_SECRET },
    body: JSON.stringify(body),
  })
}

function p2002() {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed on the fields: (`asaasId`)', {
    code: 'P2002', clientVersion: '5.22.0',
  })
}

// Promise controlada: permite provar que as duas updateMany do backfill
// atômico foram DISPARADAS (Promise.all) antes de qualquer uma delas se
// resolver — uma implementação sequencial (await um, depois o outro) nunca
// chamaria a segunda antes da primeira terminar, então este teste distingue
// as duas formas.
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function loggedText(spy: ReturnType<typeof vi.spyOn>): string {
  return spy.mock.calls
    .flat()
    .map(arg => (typeof arg === 'string' ? arg : arg instanceof Error ? arg.message : ''))
    .join(' | ')
}

const COMPANY = { id: 'company_1', razaoSocial: 'Empresa Teste', cnpj: '12345678000199', planType: 'essencial', partnerId: null, status: 'active' }

function dbPaymentFixture(overrides: Partial<{ id: string; type: string; status: string; amount: number; companyId: string; checkoutUrl: string | null }> = {}) {
  return {
    id: 'payment_1', type: 'mensalidade', status: 'pending', amount: 19900, companyId: 'company_1', checkoutUrl: null,
    company: COMPANY,
    ...overrides,
  }
}

// Empresa/Payment sintéticos para alcançar o ramo implantacao+pending (único
// que gera/persiste o PDF do contrato) — nenhum teste pré-existente neste
// arquivo passava por este ramo. Todos os campos são dados fictícios.
const IMPLANTACAO_PENDING_COMPANY = {
  id: 'company_pdf', razaoSocial: 'Empresa PDF Teste', cnpj: '98765432000188',
  responsavel: 'Responsável Teste', email: 'contrato-teste@example.com',
  endereco: 'Rua Sintética, 100', cidade: 'Rio de Janeiro', estado: 'RJ', cep: '20000-000',
  numFuncionarios: 4, planType: 'essencial', mensalidadeValor: 19900,
  implantacaoValor: 19900, implantacaoValorPadrao: 19900, implantacaoPromo: false, ltcatAddon: false,
  contractAcceptedAt: new Date('2026-07-20T14:33:02.123Z'),
  contractAcceptanceIp: '203.0.113.10', contractAcceptanceUa: 'vitest-agent',
  contractVersion: '2026-07-04',
  partnerId: null, status: 'pending',
}

function implantacaoPendingPaymentFixture() {
  return {
    id: 'payment_pdf', type: 'implantacao', status: 'pending', amount: 19900,
    companyId: IMPLANTACAO_PENDING_COMPANY.id, checkoutUrl: null,
    company: IMPLANTACAO_PENDING_COMPANY,
  }
}

// Todo updateMany deste arquivo devolve {count:1} por padrão — cada teste que
// precisa de um count diferente (ex.: já processado) sobrescreve localmente.
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.commission.findFirst).mockResolvedValue(null)
  vi.mocked(prisma.company.update).mockResolvedValue({} as any)
  vi.mocked(prisma.company.updateMany).mockResolvedValue({ count: 0 } as any)
  vi.mocked(prisma.payment.updateMany).mockResolvedValue({ count: 1 } as any)
})

describe('POST /api/webhooks/asaas — checkoutUrl da mensalidade (P0)', () => {
  it('PAYMENT_OVERDUE criando mensalidade persiste checkoutUrl válida', async () => {
    vi.mocked(prisma.payment.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.company.findUnique).mockResolvedValue(COMPANY as any)
    vi.mocked(prisma.payment.create).mockResolvedValue({ id: 'payment_new' } as any)
    vi.mocked(prisma.payment.findUniqueOrThrow).mockResolvedValue(dbPaymentFixture({ id: 'payment_new', status: 'overdue' }) as any)

    const res = await POST(webhookRequest({
      event: 'PAYMENT_OVERDUE',
      payment: { id: 'pay_x', value: 199, dueDate: '2026-07-01', subscription: 'sub_x', externalReference: 'company_1', invoiceUrl: 'https://www.asaas.com/i/abc', billingType: 'BOLETO' },
    }))

    expect(res.status).toBe(200)
    const createArgs = vi.mocked(prisma.payment.create).mock.calls[0][0] as any
    expect(createArgs.data.checkoutUrl).toBe('https://www.asaas.com/i/abc')
    expect(createArgs.data.invoiceUrl).toBe('https://www.asaas.com/i/abc')
  })

  it('PAYMENT_CONFIRMED criando mensalidade persiste checkoutUrl válida', async () => {
    vi.mocked(prisma.payment.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.company.findUnique).mockResolvedValue(COMPANY as any)
    vi.mocked(prisma.payment.create).mockResolvedValue({ id: 'payment_new' } as any)
    vi.mocked(prisma.payment.findUniqueOrThrow).mockResolvedValue(dbPaymentFixture({ id: 'payment_new', status: 'confirmed' }) as any)

    const res = await POST(webhookRequest({
      event: 'PAYMENT_CONFIRMED',
      payment: { id: 'pay_y', value: 199, externalReference: 'company_1', invoiceUrl: 'https://sandbox.asaas.com/i/abc', billingType: 'PIX' },
    }))

    expect(res.status).toBe(200)
    const createArgs = vi.mocked(prisma.payment.create).mock.calls[0][0] as any
    expect(createArgs.data.checkoutUrl).toBe('https://sandbox.asaas.com/i/abc')
  })

  it('invoiceUrl ausente não falha o webhook', async () => {
    vi.mocked(prisma.payment.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.company.findUnique).mockResolvedValue(COMPANY as any)
    vi.mocked(prisma.payment.create).mockResolvedValue({ id: 'payment_new' } as any)
    vi.mocked(prisma.payment.findUniqueOrThrow).mockResolvedValue(dbPaymentFixture({ id: 'payment_new', status: 'overdue' }) as any)

    const res = await POST(webhookRequest({
      event: 'PAYMENT_OVERDUE',
      payment: { id: 'pay_z', value: 199, subscription: 'sub_x', externalReference: 'company_1' },
    }))

    expect(res.status).toBe(200)
    const createArgs = vi.mocked(prisma.payment.create).mock.calls[0][0] as any
    expect(createArgs.data.checkoutUrl).toBeNull()
  })

  it('invoiceUrl maliciosa não é persistida', async () => {
    vi.mocked(prisma.payment.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.company.findUnique).mockResolvedValue(COMPANY as any)
    vi.mocked(prisma.payment.create).mockResolvedValue({ id: 'payment_new' } as any)
    vi.mocked(prisma.payment.findUniqueOrThrow).mockResolvedValue(dbPaymentFixture({ id: 'payment_new', status: 'overdue' }) as any)

    const res = await POST(webhookRequest({
      event: 'PAYMENT_OVERDUE',
      payment: { id: 'pay_evil', value: 199, subscription: 'sub_x', externalReference: 'company_1', invoiceUrl: 'https://evil.example.com/i/abc' },
    }))

    expect(res.status).toBe(200)
    const createArgs = vi.mocked(prisma.payment.create).mock.calls[0][0] as any
    expect(createArgs.data.checkoutUrl).toBeNull()
  })

  describe('branch normal — Payment já existente usa o helper atômico', () => {
    it('CONFIRMED: URL válida → dispara as duas atualizações atômicas independentes (checkoutUrl e invoiceUrl)', async () => {
      vi.mocked(prisma.payment.findFirst).mockResolvedValue(dbPaymentFixture({ status: 'pending', checkoutUrl: null }) as any)

      await POST(webhookRequest({
        event: 'PAYMENT_CONFIRMED',
        payment: { id: 'pay_1', value: 199, invoiceUrl: 'https://www.asaas.com/i/backfill' },
      }))

      // 1ª chamada: transição de status (não mexe em URL). 2ª e 3ª: backfill atômico.
      const calls = vi.mocked(prisma.payment.updateMany).mock.calls.map(c => c[0] as any)
      expect(calls).toHaveLength(3)
      const checkoutCall = calls.find(c => 'checkoutUrl' in c.where)
      const invoiceCall = calls.find(c => 'invoiceUrl' in c.where)
      expect(checkoutCall.where).toEqual({ id: 'payment_1', checkoutUrl: null })
      expect(checkoutCall.data).toEqual({ checkoutUrl: 'https://www.asaas.com/i/backfill' })
      expect(invoiceCall.where).toEqual({ id: 'payment_1', invoiceUrl: null })
      expect(invoiceCall.data).toEqual({ invoiceUrl: 'https://www.asaas.com/i/backfill' })
    })

    it('CONFIRMED: evento sem URL válida → nenhuma atualização de URL é disparada (só a transição de status)', async () => {
      vi.mocked(prisma.payment.findFirst).mockResolvedValue(dbPaymentFixture({ status: 'pending', checkoutUrl: 'https://www.asaas.com/i/existente' }) as any)

      await POST(webhookRequest({
        event: 'PAYMENT_CONFIRMED',
        payment: { id: 'pay_1', value: 199 },
      }))

      const calls = vi.mocked(prisma.payment.updateMany).mock.calls.map(c => c[0] as any)
      expect(calls).toHaveLength(1)
      expect(calls[0].where).not.toHaveProperty('checkoutUrl')
      expect(calls[0].where).not.toHaveProperty('invoiceUrl')
    })

    it('OVERDUE: URL válida em Payment existente → dispara as duas atualizações atômicas independentes', async () => {
      vi.mocked(prisma.payment.findFirst).mockResolvedValue(dbPaymentFixture({ status: 'pending', checkoutUrl: null }) as any)

      await POST(webhookRequest({
        event: 'PAYMENT_OVERDUE',
        payment: { id: 'pay_1', value: 199, subscription: 'sub_x', invoiceUrl: 'https://www.asaas.com/i/ov-backfill' },
      }))

      const calls = vi.mocked(prisma.payment.updateMany).mock.calls.map(c => c[0] as any)
      const checkoutCall = calls.find(c => 'checkoutUrl' in c.where)
      const invoiceCall = calls.find(c => 'invoiceUrl' in c.where)
      expect(checkoutCall.where).toEqual({ id: 'payment_1', checkoutUrl: null })
      expect(invoiceCall.where).toEqual({ id: 'payment_1', invoiceUrl: null })
    })
  })

  it('evento repetido (já confirmed) permanece idempotente — sem novo create, sem novo e-mail', async () => {
    vi.mocked(prisma.payment.findFirst).mockResolvedValue(dbPaymentFixture({ status: 'confirmed' }) as any)
    vi.mocked(prisma.payment.updateMany).mockResolvedValueOnce({ count: 0 } as any)

    const res = await POST(webhookRequest({
      event: 'PAYMENT_CONFIRMED',
      payment: { id: 'pay_1', value: 199, invoiceUrl: 'https://www.asaas.com/i/abc' },
    }))

    const body = await res.json()
    expect(body.note).toBe('already processed')
    expect(prisma.payment.create).not.toHaveBeenCalled()
    expect(notifyPaymentConfirmed).not.toHaveBeenCalled()
  })

  describe('P2002 — só conflito real de unicidade é tratado como corrida', () => {
    it('conflito de criação concorrente (P2002) não duplica Payment', async () => {
      vi.mocked(prisma.payment.findFirst)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null) // winner não encontrado — ainda assim idempotente
      vi.mocked(prisma.company.findUnique).mockResolvedValue(COMPANY as any)
      vi.mocked(prisma.payment.create).mockRejectedValue(p2002())

      const res = await POST(webhookRequest({
        event: 'PAYMENT_OVERDUE',
        payment: { id: 'pay_race', value: 199, subscription: 'sub_x', externalReference: 'company_1', invoiceUrl: 'https://www.asaas.com/i/abc' },
      }))

      const body = await res.json()
      expect(body.note).toBe('already processed (race)')
      expect(prisma.payment.create).toHaveBeenCalledTimes(1)
      expect(notifyPaymentOverdue).not.toHaveBeenCalled()
    })

    it('erro de create que NÃO é P2002 é relançado — não retorna sucesso falso, permite retry do Asaas', async () => {
      vi.mocked(prisma.payment.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.company.findUnique).mockResolvedValue(COMPANY as any)
      vi.mocked(prisma.payment.create).mockRejectedValue(new Error('Falha de conexão com o banco'))

      await expect(POST(webhookRequest({
        event: 'PAYMENT_CONFIRMED',
        payment: { id: 'pay_db_fail', value: 199, externalReference: 'company_1', invoiceUrl: 'https://www.asaas.com/i/x' },
      }))).rejects.toThrow('Falha de conexão com o banco')

      // Não deve ter tentado localizar/atualizar um "vencedor" — não é corrida.
      expect(prisma.payment.findFirst).toHaveBeenCalledTimes(1)
      expect(prisma.payment.updateMany).not.toHaveBeenCalled()
    })

    it('CONFIRMED: vencedor sem nenhuma URL + evento com URL válida → dispara as duas atualizações atômicas', async () => {
      vi.mocked(prisma.payment.findFirst)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'payment_winner', companyId: 'company_1', type: 'mensalidade' } as any)
      vi.mocked(prisma.company.findUnique).mockResolvedValue(COMPANY as any)
      vi.mocked(prisma.payment.create).mockRejectedValue(p2002())

      const res = await POST(webhookRequest({
        event: 'PAYMENT_CONFIRMED',
        payment: { id: 'pay_conc', value: 199, externalReference: 'company_1', invoiceUrl: 'https://www.asaas.com/i/vencedor' },
      }))

      const body = await res.json()
      expect(body.note).toBe('already processed (race)')
      expect(prisma.payment.create).toHaveBeenCalledTimes(1)

      // Select mínimo na busca do vencedor: id/companyId/type, nunca notes/dado pessoal.
      const winnerLookupArgs = vi.mocked(prisma.payment.findFirst).mock.calls[1][0] as any
      expect(winnerLookupArgs.select).toEqual({ id: true, companyId: true, type: true })

      const calls = vi.mocked(prisma.payment.updateMany).mock.calls.map(c => c[0] as any)
      expect(calls).toHaveLength(2)
      const checkoutCall = calls.find(c => 'checkoutUrl' in c.where)
      const invoiceCall = calls.find(c => 'invoiceUrl' in c.where)
      expect(checkoutCall.where).toEqual({ id: 'payment_winner', checkoutUrl: null })
      expect(checkoutCall.data).toEqual({ checkoutUrl: 'https://www.asaas.com/i/vencedor' })
      expect(invoiceCall.where).toEqual({ id: 'payment_winner', invoiceUrl: null })
      expect(invoiceCall.data).toEqual({ invoiceUrl: 'https://www.asaas.com/i/vencedor' })
    })

    it('CONFIRMED: evento sem URL válida → nenhuma atualização é disparada no vencedor', async () => {
      vi.mocked(prisma.payment.findFirst)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'payment_winner', companyId: 'company_1', type: 'mensalidade' } as any)
      vi.mocked(prisma.company.findUnique).mockResolvedValue(COMPANY as any)
      vi.mocked(prisma.payment.create).mockRejectedValue(p2002())

      await POST(webhookRequest({
        event: 'PAYMENT_CONFIRMED',
        payment: { id: 'pay_conc3', value: 199, externalReference: 'company_1' },
      }))

      expect(prisma.payment.updateMany).not.toHaveBeenCalled()
    })

    it('CONFIRMED: divergência de companyId no vencedor → não atualiza', async () => {
      vi.mocked(prisma.payment.findFirst)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'payment_winner', companyId: 'company_OUTRA', type: 'mensalidade' } as any)
      vi.mocked(prisma.company.findUnique).mockResolvedValue(COMPANY as any)
      vi.mocked(prisma.payment.create).mockRejectedValue(p2002())

      await POST(webhookRequest({
        event: 'PAYMENT_CONFIRMED',
        payment: { id: 'pay_conc4', value: 199, externalReference: 'company_1', invoiceUrl: 'https://www.asaas.com/i/x' },
      }))

      expect(prisma.payment.updateMany).not.toHaveBeenCalled()
    })

    it('CONFIRMED: divergência de type no vencedor → não atualiza', async () => {
      vi.mocked(prisma.payment.findFirst)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'payment_winner', companyId: 'company_1', type: 'implantacao' } as any)
      vi.mocked(prisma.company.findUnique).mockResolvedValue(COMPANY as any)
      vi.mocked(prisma.payment.create).mockRejectedValue(p2002())

      await POST(webhookRequest({
        event: 'PAYMENT_CONFIRMED',
        payment: { id: 'pay_conc5', value: 199, externalReference: 'company_1', invoiceUrl: 'https://www.asaas.com/i/x' },
      }))

      expect(prisma.payment.updateMany).not.toHaveBeenCalled()
    })

    it('OVERDUE: vencedor sem nenhuma URL + evento com URL válida → dispara as duas atualizações atômicas, sem duplicar', async () => {
      vi.mocked(prisma.payment.findFirst)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'payment_winner_ov', companyId: 'company_1', type: 'mensalidade' } as any)
      vi.mocked(prisma.company.findUnique).mockResolvedValue(COMPANY as any)
      vi.mocked(prisma.payment.create).mockRejectedValue(p2002())

      const res = await POST(webhookRequest({
        event: 'PAYMENT_OVERDUE',
        payment: { id: 'pay_ov_conc', value: 199, subscription: 'sub_x', externalReference: 'company_1', invoiceUrl: 'https://www.asaas.com/i/vencedor-ov' },
      }))

      const body = await res.json()
      expect(body.note).toBe('already processed (race)')
      expect(prisma.payment.create).toHaveBeenCalledTimes(1)
      const calls = vi.mocked(prisma.payment.updateMany).mock.calls.map(c => c[0] as any)
      expect(calls).toHaveLength(2)
      expect(calls.find(c => 'checkoutUrl' in c.where).where).toEqual({ id: 'payment_winner_ov', checkoutUrl: null })
      expect(calls.find(c => 'invoiceUrl' in c.where).where).toEqual({ id: 'payment_winner_ov', invoiceUrl: null })
    })

    it('OVERDUE: divergência de companyId no vencedor → não atualiza', async () => {
      vi.mocked(prisma.payment.findFirst)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'payment_winner_ov2', companyId: 'company_OUTRA', type: 'mensalidade' } as any)
      vi.mocked(prisma.company.findUnique).mockResolvedValue(COMPANY as any)
      vi.mocked(prisma.payment.create).mockRejectedValue(p2002())

      await POST(webhookRequest({
        event: 'PAYMENT_OVERDUE',
        payment: { id: 'pay_ov_conc2', value: 199, subscription: 'sub_x', externalReference: 'company_1', invoiceUrl: 'https://www.asaas.com/i/x' },
      }))

      expect(prisma.payment.updateMany).not.toHaveBeenCalled()
    })

    it('OVERDUE: evento repetido permanece idempotente (sem envolver o caminho de conflito)', async () => {
      vi.mocked(prisma.payment.findFirst).mockResolvedValue(dbPaymentFixture({ status: 'overdue' }) as any)

      const res = await POST(webhookRequest({
        event: 'PAYMENT_OVERDUE',
        payment: { id: 'pay_1', value: 199, subscription: 'sub_x', invoiceUrl: 'https://www.asaas.com/i/abc' },
      }))

      expect(res.status).toBe(200)
      expect(prisma.payment.create).not.toHaveBeenCalled()
    })
  })

  describe('Falha parcial em backfillPaymentUrls (Promise.all) — uma updateMany falha, a outra conclui', () => {
    it('branch normal (CONFIRMED): falha ao gravar checkoutUrl não impede invoiceUrl nem a notificação de confirmação', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const checkoutDeferred = deferred<{ count: number }>()
      const invoiceDeferred = deferred<{ count: number }>()

      vi.mocked(prisma.payment.findFirst).mockResolvedValue(dbPaymentFixture({ status: 'pending', checkoutUrl: null }) as any)
      vi.mocked(prisma.payment.updateMany).mockImplementation((args: any) => {
        if ('checkoutUrl' in args.where) return checkoutDeferred.promise
        if ('invoiceUrl' in args.where) return invoiceDeferred.promise
        return Promise.resolve({ count: 1 }) // transição de status, fora do escopo deste teste
      })

      const resPromise = POST(webhookRequest({
        event: 'PAYMENT_CONFIRMED',
        payment: { id: 'pay_1', value: 199, invoiceUrl: 'https://www.asaas.com/i/parcial' },
      }))

      // Espera as DUAS updateMany de URL serem disparadas (prova Promise.all —
      // uma implementação sequencial nunca chamaria a segunda antes da
      // primeira, ainda pendente, terminar) antes de resolver qualquer uma.
      await vi.waitFor(() => {
        const calls = vi.mocked(prisma.payment.updateMany).mock.calls
        expect(calls.filter(c => 'checkoutUrl' in (c[0] as any).where || 'invoiceUrl' in (c[0] as any).where)).toHaveLength(2)
      })

      checkoutDeferred.reject(new Error('Erro transitório de conexão com o banco'))
      invoiceDeferred.resolve({ count: 1 })

      const res = await resPromise
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body).toEqual({ ok: true })
      expect(prisma.payment.create).not.toHaveBeenCalled()
      expect(notifyPaymentConfirmed).toHaveBeenCalledTimes(1)

      const calls = vi.mocked(prisma.payment.updateMany).mock.calls.map(c => c[0] as any)
      expect(calls.find(c => 'checkoutUrl' in c.where).where).toEqual({ id: 'payment_1', checkoutUrl: null })
      expect(calls.find(c => 'invoiceUrl' in c.where).where).toEqual({ id: 'payment_1', invoiceUrl: null })

      expect(errorSpy).toHaveBeenCalled()
      const text = loggedText(errorSpy)
      expect(text).toContain('[WEBHOOK]')
      expect(text).not.toContain('payment_1')
      expect(text).not.toContain('https://www.asaas.com/i/parcial')
      expect(text).not.toContain('company_1')

      errorSpy.mockRestore()
    })

    it('branch pós-P2002 (CONFIRMED): falha ao gravar invoiceUrl no vencedor não impede checkoutUrl nem a resposta idempotente', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const checkoutDeferred = deferred<{ count: number }>()
      const invoiceDeferred = deferred<{ count: number }>()

      vi.mocked(prisma.payment.findFirst)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'payment_winner', companyId: 'company_1', type: 'mensalidade' } as any)
      vi.mocked(prisma.company.findUnique).mockResolvedValue(COMPANY as any)
      vi.mocked(prisma.payment.create).mockRejectedValue(p2002())
      vi.mocked(prisma.payment.updateMany).mockImplementation((args: any) => {
        if ('checkoutUrl' in args.where) return checkoutDeferred.promise
        if ('invoiceUrl' in args.where) return invoiceDeferred.promise
        return Promise.resolve({ count: 1 })
      })

      const resPromise = POST(webhookRequest({
        event: 'PAYMENT_CONFIRMED',
        payment: { id: 'pay_conc_partial', value: 199, externalReference: 'company_1', invoiceUrl: 'https://www.asaas.com/i/vencedor-parcial' },
      }))

      await vi.waitFor(() => {
        const calls = vi.mocked(prisma.payment.updateMany).mock.calls
        expect(calls.filter(c => 'checkoutUrl' in (c[0] as any).where || 'invoiceUrl' in (c[0] as any).where)).toHaveLength(2)
      })

      checkoutDeferred.resolve({ count: 1 })
      invoiceDeferred.reject(new Error('Erro transitório de conexão com o banco'))

      const res = await resPromise
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body).toEqual({ ok: true, note: 'already processed (race)' })
      expect(prisma.payment.create).toHaveBeenCalledTimes(1)

      // Select mínimo na busca do vencedor — id/companyId/type, nunca notes/dado pessoal.
      const winnerLookupArgs = vi.mocked(prisma.payment.findFirst).mock.calls[1][0] as any
      expect(winnerLookupArgs.select).toEqual({ id: true, companyId: true, type: true })

      const calls = vi.mocked(prisma.payment.updateMany).mock.calls.map(c => c[0] as any)
      expect(calls.find(c => 'checkoutUrl' in c.where).where).toEqual({ id: 'payment_winner', checkoutUrl: null })
      expect(calls.find(c => 'invoiceUrl' in c.where).where).toEqual({ id: 'payment_winner', invoiceUrl: null })

      expect(errorSpy).toHaveBeenCalled()
      const text = loggedText(errorSpy)
      expect(text).toContain('[WEBHOOK]')
      expect(text).not.toContain('payment_winner')
      expect(text).not.toContain('pay_conc_partial')
      expect(text).not.toContain('https://www.asaas.com/i/vencedor-parcial')
      expect(text).not.toContain('company_1')

      errorSpy.mockRestore()
    })
  })
})

describe('POST /api/webhooks/asaas — persistência do contrato e controle do anexo de e-mail (P1)', () => {
  const FAKE_PDF = Buffer.from('PDF-SINTETICO-PARA-TESTE')

  const successOutcomes: PersistContractResult[] = [
    { outcome: 'created', documentId: 'doc-1', storageKey: 'contrato/company_pdf/2026-07-04/k', hash: 'hash-fake' },
    { outcome: 'already_persisted', documentId: 'doc-1', storageKey: 'contrato/company_pdf/2026-07-04/k', hash: 'hash-fake' },
    { outcome: 'document_recovered', documentId: 'doc-1', storageKey: 'contrato/company_pdf/2026-07-04/k', hash: 'hash-fake' },
  ]

  const failureOutcomes: PersistContractResult[] = [
    { outcome: 'company_hash_mismatch', storageKey: 'contrato/company_pdf/2026-07-04/k', hash: 'hash-fake' },
    { outcome: 'storage_bytes_mismatch', storageKey: 'contrato/company_pdf/2026-07-04/k', hash: 'hash-fake' },
    { outcome: 'orphan_document', documentId: 'doc-orfao', storageKey: 'contrato/company_pdf/2026-07-04/k' },
    { outcome: 'error', reason: 'PrismaClientKnownRequestError' },
  ]

  function mockImplantacaoBranch(persistResult: PersistContractResult) {
    vi.mocked(prisma.payment.findFirst).mockResolvedValue(implantacaoPendingPaymentFixture() as any)
    vi.mocked(generateContractPdf).mockResolvedValue(FAKE_PDF)
    vi.mocked(persistContractPdf).mockResolvedValue(persistResult)
  }

  function postImplantacaoConfirmed() {
    return POST(webhookRequest({
      event: 'PAYMENT_CONFIRMED',
      payment: { id: 'pay_implantacao', value: 199, externalReference: IMPLANTACAO_PENDING_COMPANY.id },
    }))
  }

  it.each(successOutcomes)('outcome $outcome — welcome e-mail enviado COM o mesmo Buffer persistido, sem notificação de falha', async persistResult => {
    mockImplantacaoBranch(persistResult)

    const res = await postImplantacaoConfirmed()

    expect(res.status).toBe(200)
    expect(sendWelcomeEmail).toHaveBeenCalledTimes(1)
    const emailArgs = vi.mocked(sendWelcomeEmail).mock.calls[0][0] as any
    expect(emailArgs.contractPdf).toBe(FAKE_PDF) // mesmo Buffer, nunca regenerado
    expect(notifyContractPdfFailed).not.toHaveBeenCalled()
  })

  it.each(failureOutcomes)('outcome $outcome — welcome e-mail enviado SEM anexo, notificação de falha acionada', async persistResult => {
    mockImplantacaoBranch(persistResult)

    const res = await postImplantacaoConfirmed()

    expect(res.status).toBe(200)
    expect(sendWelcomeEmail).toHaveBeenCalledTimes(1)
    const emailArgs = vi.mocked(sendWelcomeEmail).mock.calls[0][0] as any
    expect(emailArgs.contractPdf).toBeUndefined() // nunca anexa PDF não persistido/divergente
    expect(notifyContractPdfFailed).toHaveBeenCalledTimes(1)
  })

  it('falha de persistência do contrato nunca retorna erro ao Asaas nem desfaz a transição de Payment.status', async () => {
    mockImplantacaoBranch({ outcome: 'error', reason: 'PrismaClientInitializationError' })

    const res = await postImplantacaoConfirmed()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ ok: true })
    // A transição pending→confirmed do Payment (updateMany) já ocorreu antes
    // deste bloco no fluxo normal do handler — não é revertida nem repetida
    // por causa da falha de persistência do contrato.
    expect(prisma.payment.updateMany).toHaveBeenCalledTimes(1)
  })

  it('geração do PDF ocorre uma única vez por execução, independentemente do outcome da persistência', async () => {
    mockImplantacaoBranch({ outcome: 'storage_bytes_mismatch', storageKey: 'k', hash: 'h' })

    await postImplantacaoConfirmed()

    expect(generateContractPdf).toHaveBeenCalledTimes(1)
    expect(persistContractPdf).toHaveBeenCalledTimes(1)
    const persistArgs = vi.mocked(persistContractPdf).mock.calls[0][0]
    expect(persistArgs.pdfBuffer).toBe(FAKE_PDF) // mesmo Buffer da geração, nunca regenerado
  })

  it('generateContractPdf recebe mensalidadeValor/implantacaoValorPadrao/ltcatAddon exatamente como gravados na Company — nunca omitidos (Eixo B)', async () => {
    mockImplantacaoBranch({ outcome: 'created', documentId: 'doc-1', storageKey: 'k', hash: 'h' })

    await postImplantacaoConfirmed()

    const pdfArgs = vi.mocked(generateContractPdf).mock.calls[0][0] as any
    expect(pdfArgs.mensalidadeValor).toBe(IMPLANTACAO_PENDING_COMPANY.mensalidadeValor)
    expect(pdfArgs.implantacaoValorPadrao).toBe(IMPLANTACAO_PENDING_COMPANY.implantacaoValorPadrao)
    expect(pdfArgs.ltcatAddon).toBe(IMPLANTACAO_PENDING_COMPANY.ltcatAddon)
  })
})
