import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { generateContractPdf } from '@/lib/contractPdf'
import { persistContractPdf } from '@/lib/contractPersistence'
import type { PersistContractResult } from '@/lib/contractPersistence'

const WEBHOOK_SECRET = 'test-webhook-secret-nao-real-0123456789'
process.env.ASAAS_WEBHOOK_TOKEN = WEBHOOK_SECRET

// A confirmação do Payment e a gravação de activatedAt (quando aplicável)
// rodam dentro de prisma.$transaction — no mock, tx === prisma (mesmo padrão
// já usado em src/app/api/partners/route.test.ts e no cancel/route.test.ts
// desta mesma tranche), então os mocks de payment/company abaixo servem
// tanto para o caminho normal quanto para dentro da transação.
vi.mock('@/lib/prisma', () => {
  const prisma: any = {
    payment: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
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
  }
  prisma.$transaction = vi.fn(async (cb: any) => cb(prisma))
  return { prisma }
})

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

// ── Ativação (regra de vigência de 12 meses) ──────────────────────────────
describe('POST /api/webhooks/asaas — gravação de Company.activatedAt', () => {
  function companyWithActivation(overrides: Partial<{ id: string; activatedAt: Date | null; status: string; partnerId: string | null }> = {}) {
    return { ...COMPANY, activatedAt: null, ...overrides }
  }

  function paymentRow(overrides: Partial<{ id: string; type: string; status: string; dueDate: Date | null; createdAt: Date; amount: number; checkoutUrl: string | null }> = {}) {
    return {
      id: 'pay_row', type: 'mensalidade', status: 'pending', amount: 19900,
      dueDate: new Date('2026-05-01'), createdAt: new Date('2026-04-01'), checkoutUrl: null,
      ...overrides,
    }
  }

  it('mensalidade confirmada é a primeira e implantação já confirmada → grava activatedAt uma única vez, com o instante ATUAL (nunca createdAt/dueDate do pagamento)', async () => {
    const company = companyWithActivation({ id: 'company_1', activatedAt: null })
    vi.mocked(prisma.payment.findFirst).mockResolvedValue(
      dbPaymentFixture({ id: 'payment_1', status: 'pending', company } as any) as any
    )
    // markCompanyActivatedIfComplete (src/lib/companyActivation.ts) faz sua
    // própria leitura fresca de Company — mesma fonte compartilhada usada
    // pelo cadastro (src/app/api/leads/register/route.ts).
    vi.mocked(prisma.company.findUnique).mockResolvedValue({ status: company.status, activatedAt: null } as any)
    vi.mocked(prisma.payment.findMany).mockResolvedValue([
      paymentRow({ id: 'implantacao_1', type: 'implantacao', status: 'confirmed', dueDate: null, createdAt: new Date('2026-03-01') }),
      paymentRow({ id: 'payment_1', type: 'mensalidade', status: 'confirmed', dueDate: new Date('2026-05-01'), createdAt: new Date('2026-04-01') }),
    ] as any)

    vi.useFakeTimers()
    const frozenNow = new Date('2026-06-15T12:00:00.000Z')
    vi.setSystemTime(frozenNow)
    try {
      await POST(webhookRequest({ event: 'PAYMENT_CONFIRMED', payment: { id: 'pay_1', value: 199 } }))
    } finally {
      vi.useRealTimers()
    }

    // Valor gravado é o instante do processamento (now) — nunca createdAt/
    // dueDate do payment (que seriam datas passadas, bem anteriores à
    // ativação real de fato).
    expect(prisma.company.updateMany).toHaveBeenCalledWith({
      where: { id: 'company_1', activatedAt: null },
      data:  { activatedAt: frozenNow },
    })
  })

  it('mensalidade confirmada mas implantação ainda não confirmada → NÃO grava activatedAt', async () => {
    const company = companyWithActivation({ id: 'company_1', activatedAt: null })
    vi.mocked(prisma.payment.findFirst).mockResolvedValue(
      dbPaymentFixture({ id: 'payment_1', status: 'pending', company } as any) as any
    )
    vi.mocked(prisma.company.findUnique).mockResolvedValue({ status: company.status, activatedAt: null } as any)
    vi.mocked(prisma.payment.findMany).mockResolvedValue([
      paymentRow({ id: 'implantacao_1', type: 'implantacao', status: 'pending', dueDate: null, createdAt: new Date('2026-03-01') }),
      paymentRow({ id: 'payment_1', type: 'mensalidade', status: 'confirmed', dueDate: new Date('2026-05-01'), createdAt: new Date('2026-04-01') }),
    ] as any)

    await POST(webhookRequest({ event: 'PAYMENT_CONFIRMED', payment: { id: 'pay_1', value: 199 } }))

    const activationCalls = vi.mocked(prisma.company.updateMany).mock.calls.filter(c => 'activatedAt' in (c[0] as any).data)
    expect(activationCalls).toHaveLength(0)
  })

  it('Company legada: activatedAt já null, implantação e primeira mensalidade já confirmadas ANTES desta migração — confirmação de uma 3ª mensalidade NÃO inventa activatedAt tardio', async () => {
    const company = companyWithActivation({ id: 'company_legado', activatedAt: null })
    // O pagamento que está confirmando agora é a 3ª mensalidade (dueDate
    // mais recente) — não é a "primeira mensalidade" (dueDate mais antiga,
    // já confirmada há muito tempo).
    vi.mocked(prisma.payment.findFirst).mockResolvedValue(
      dbPaymentFixture({ id: 'payment_3', status: 'pending', company } as any) as any
    )
    vi.mocked(prisma.payment.findMany).mockResolvedValue([
      paymentRow({ id: 'implantacao_1', type: 'implantacao', status: 'confirmed', dueDate: null, createdAt: new Date('2026-01-01') }),
      paymentRow({ id: 'payment_1', type: 'mensalidade', status: 'confirmed', dueDate: new Date('2026-02-01'), createdAt: new Date('2026-01-05') }),
      paymentRow({ id: 'payment_2', type: 'mensalidade', status: 'confirmed', dueDate: new Date('2026-03-01'), createdAt: new Date('2026-02-05') }),
      paymentRow({ id: 'payment_3', type: 'mensalidade', status: 'confirmed', dueDate: new Date('2026-04-01'), createdAt: new Date('2026-03-05') }),
    ] as any)

    await POST(webhookRequest({ event: 'PAYMENT_CONFIRMED', payment: { id: 'pay_3', value: 199 } }))

    const activationCalls = vi.mocked(prisma.company.updateMany).mock.calls.filter(c => 'activatedAt' in (c[0] as any).data)
    expect(activationCalls).toHaveLength(0)
  })

  it('Company já com activatedAt preenchido → nunca chama updateMany para activatedAt de novo (guard evita nova consulta/sobrescrita)', async () => {
    const company = companyWithActivation({ id: 'company_ja_ativa', activatedAt: new Date('2026-01-10') })
    vi.mocked(prisma.payment.findFirst).mockResolvedValue(
      dbPaymentFixture({ id: 'payment_5', status: 'pending', company } as any) as any
    )

    await POST(webhookRequest({ event: 'PAYMENT_CONFIRMED', payment: { id: 'pay_5', value: 199 } }))

    expect(prisma.payment.findMany).not.toHaveBeenCalled()
    const activationCalls = vi.mocked(prisma.company.updateMany).mock.calls.filter(c => 'activatedAt' in (c[0] as any).data)
    expect(activationCalls).toHaveLength(0)
  })

  it('implantação confirmada com mensalidade já confirmada → grava activatedAt (ordem inversa: implantação chega por último)', async () => {
    const company = { ...IMPLANTACAO_PENDING_COMPANY, id: 'company_pdf', activatedAt: null }
    vi.mocked(prisma.payment.findFirst).mockResolvedValue(
      { ...implantacaoPendingPaymentFixture(), company } as any
    )
    vi.mocked(prisma.company.findUnique).mockResolvedValue({ status: company.status, activatedAt: null } as any)
    vi.mocked(prisma.payment.findMany).mockResolvedValue([
      paymentRow({ id: 'payment_pdf', type: 'implantacao', status: 'confirmed', dueDate: null, createdAt: new Date('2026-03-01') }),
      paymentRow({ id: 'mensalidade_pdf', type: 'mensalidade', status: 'confirmed', dueDate: new Date('2026-03-05'), createdAt: new Date('2026-03-05') }),
    ] as any)
    vi.mocked(generateContractPdf).mockResolvedValue(Buffer.from('x'))
    vi.mocked(persistContractPdf).mockResolvedValue({ outcome: 'created', documentId: 'doc-1', storageKey: 'k', hash: 'h' })

    await POST(webhookRequest({ event: 'PAYMENT_CONFIRMED', payment: { id: 'pay_implantacao', value: 199 } }))

    expect(prisma.company.updateMany).toHaveBeenCalledWith({
      where: { id: 'company_pdf', activatedAt: null },
      data:  { activatedAt: expect.any(Date) },
    })
  })

  it('redelivery de um pagamento já confirmado (transition.count=0) nunca reavalia activatedAt', async () => {
    const company = companyWithActivation({ id: 'company_1', activatedAt: null })
    vi.mocked(prisma.payment.findFirst).mockResolvedValue(
      dbPaymentFixture({ id: 'payment_1', status: 'confirmed', company } as any) as any
    )
    vi.mocked(prisma.payment.updateMany).mockResolvedValue({ count: 0 } as any)

    const res = await POST(webhookRequest({ event: 'PAYMENT_CONFIRMED', payment: { id: 'pay_1', value: 199 } }))
    const body = await res.json()

    expect(body.note).toBe('already processed')
    expect(prisma.payment.findMany).not.toHaveBeenCalled()
  })
})

// ── Confiabilidade de activatedAt: falha transitória + recovery por retry
// (revisão pós-jornada — Correção final pré-commit) ─────────────────────────
describe('POST /api/webhooks/asaas — activatedAt é atômico com a confirmação do Payment (falha transitória + retry)', () => {
  function companyWithActivation(overrides: Partial<{ id: string; activatedAt: Date | null; status: string; partnerId: string | null }> = {}) {
    return { ...COMPANY, activatedAt: null, ...overrides }
  }

  function paymentRow(overrides: Partial<{ id: string; type: string; status: string; dueDate: Date | null; createdAt: Date; amount: number; checkoutUrl: string | null }> = {}) {
    return {
      id: 'pay_row', type: 'mensalidade', status: 'pending', amount: 19900,
      dueDate: new Date('2026-05-01'), createdAt: new Date('2026-04-01'), checkoutUrl: null,
      ...overrides,
    }
  }

  const COMPLETING_PAYMENTS = [
    paymentRow({ id: 'implantacao_1', type: 'implantacao', status: 'confirmed', dueDate: null, createdAt: new Date('2026-03-01') }),
    paymentRow({ id: 'payment_1', type: 'mensalidade', status: 'confirmed', dueDate: new Date('2026-05-01'), createdAt: new Date('2026-04-01') }),
  ]

  // (A) Falha transitória na gravação de activation não pode virar sucesso
  // silencioso: a transação inteira (Payment + activation) precisa falhar
  // junto, propagando o erro (nunca .catch(console.error) engolindo).
  it('(A) falha na transação de confirmação+ativação propaga (nunca sucesso silencioso) e nenhum side effect posterior roda', async () => {
    const company = companyWithActivation({ id: 'company_1', activatedAt: null })
    vi.mocked(prisma.payment.findFirst).mockResolvedValue(
      dbPaymentFixture({ id: 'payment_1', status: 'pending', company } as any) as any
    )
    vi.mocked(prisma.$transaction).mockRejectedValueOnce(new Error('falha transitória simulada'))

    await expect(
      POST(webhookRequest({ event: 'PAYMENT_CONFIRMED', payment: { id: 'pay_1', value: 199 } }))
    ).rejects.toThrow('falha transitória simulada')

    expect(notifyPaymentConfirmed).not.toHaveBeenCalled()
    expect(prisma.commission.create).not.toHaveBeenCalled()
  })

  // (B)+(C)+(D) Retry do MESMO evento: como nada foi commitado na tentativa
  // que falhou (Payment ainda pending — nesta simulação, o mock de
  // payment.findFirst permanece devolvendo status:'pending' entre as duas
  // chamadas, representando o rollback real), a 2ª chamada refaz a dupla
  // (confirmação + ativação) do zero, sem duplicar Commission nem
  // notificação (que só rodam depois da transação, isto é, só na tentativa
  // que efetivamente teve sucesso).
  it('(B)(C)(D) retry após falha recupera activatedAt e não duplica Commission nem notificação', async () => {
    const company = companyWithActivation({ id: 'company_1', activatedAt: null, partnerId: 'partner_1' })
    vi.mocked(prisma.payment.findFirst).mockResolvedValue(
      dbPaymentFixture({ id: 'payment_1', status: 'pending', company } as any) as any
    )
    vi.mocked(prisma.commission.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.commission.create).mockResolvedValue({} as any)
    vi.mocked(prisma.payment.count).mockResolvedValue(1)

    // 1ª tentativa: a transação falha por inteiro.
    vi.mocked(prisma.$transaction).mockRejectedValueOnce(new Error('falha transitória simulada'))
    await expect(
      POST(webhookRequest({ event: 'PAYMENT_CONFIRMED', payment: { id: 'pay_1', value: 199 } }))
    ).rejects.toThrow()

    // 2ª tentativa (retry do MESMO evento Asaas): $transaction volta ao
    // comportamento padrão do mock (cb(prisma)) — sucesso completo.
    vi.mocked(prisma.company.findUnique).mockResolvedValue({ status: company.status, activatedAt: null } as any)
    vi.mocked(prisma.payment.findMany).mockResolvedValue(COMPLETING_PAYMENTS as any)

    const res = await POST(webhookRequest({ event: 'PAYMENT_CONFIRMED', payment: { id: 'pay_1', value: 199 } }))
    expect(res.status).toBe(200)

    expect(prisma.company.updateMany).toHaveBeenCalledWith({
      where: { id: 'company_1', activatedAt: null },
      data:  { activatedAt: expect.any(Date) },
    })
    // Só a tentativa bem-sucedida chega a notificar/criar Commission — a
    // tentativa que falhou nunca chegou lá.
    expect(notifyPaymentConfirmed).toHaveBeenCalledTimes(1)
    expect(prisma.commission.create).toHaveBeenCalledTimes(1)
  })

  // (E) Conflito de criação concorrente (P2002) no ramo de mensalidade nova:
  // já coberto pelos testes P2002 existentes (a criação + ativação roda
  // dentro da mesma transação; o catch de P2002 é externo à transação e
  // continua funcionando sem alteração). Este teste reforça especificamente
  // que o perdedor da corrida NUNCA tenta gravar activatedAt.
  it('(E) P2002 no ramo de criação — perdedor da corrida nunca tenta gravar activatedAt', async () => {
    vi.mocked(prisma.payment.findFirst)
      .mockResolvedValueOnce(null) // 1ª busca por asaasId: ainda não existe
      .mockResolvedValueOnce({ id: 'payment_vencedor', companyId: 'company_1', type: 'mensalidade' } as any) // backfillAfterCreateConflict
    vi.mocked(prisma.company.findUnique).mockResolvedValue({ id: 'company_1' } as any)
    vi.mocked(prisma.payment.create).mockRejectedValue(p2002())

    const res = await POST(webhookRequest({
      event: 'PAYMENT_CONFIRMED',
      payment: { id: 'pay_race', value: 199, externalReference: 'company_1' },
    }))
    const body = await res.json()

    expect(body.note).toBe('already processed (race)')
    // markCompanyActivatedIfComplete só é alcançável de dentro da transação
    // (que lançou P2002 antes de chegar lá) — nenhuma tentativa de leitura
    // de Company para fins de ativação parte do caminho de conflito.
    const activationCalls = vi.mocked(prisma.company.updateMany).mock.calls.filter(c => 'activatedAt' in (c[0] as any).data)
    expect(activationCalls).toHaveLength(0)
  })

  // (F) Duas "entregas" concorrentes (simuladas sequencialmente, já que o
  // teste roda num único processo): a 2ª só vê activatedAt ainda null se a
  // 1ª genuinamente não tiver commitado — com o guard atômico
  // (activatedAt: null no WHERE), no máximo uma das duas välidamente grava.
  it('(F) duas confirmações concorrentes (simuladas em sequência) — no máximo um activatedAt gravado', async () => {
    const company1 = companyWithActivation({ id: 'company_1', activatedAt: null })
    vi.mocked(prisma.payment.findFirst).mockResolvedValue(
      dbPaymentFixture({ id: 'payment_1', status: 'pending', company: company1 } as any) as any
    )
    vi.mocked(prisma.company.findUnique).mockResolvedValue({ status: company1.status, activatedAt: null } as any)
    vi.mocked(prisma.payment.findMany).mockResolvedValue(COMPLETING_PAYMENTS as any)

    await POST(webhookRequest({ event: 'PAYMENT_CONFIRMED', payment: { id: 'pay_1', value: 199 } }))
    expect(vi.mocked(prisma.company.updateMany).mock.calls.filter(c => 'activatedAt' in (c[0] as any).data)).toHaveLength(1)

    // "2ª entrega": a Company já reflete a ativação da 1ª (activatedAt não
    // é mais null) — o guard de leitura em markCompanyActivatedIfComplete
    // já impede qualquer nova tentativa de escrita.
    vi.mocked(prisma.company.findUnique).mockResolvedValue({ status: company1.status, activatedAt: new Date() } as any)
    vi.mocked(prisma.payment.findFirst).mockResolvedValue(
      dbPaymentFixture({ id: 'payment_1', status: 'pending', company: { ...company1, activatedAt: new Date() } } as any) as any
    )
    await POST(webhookRequest({ event: 'PAYMENT_CONFIRMED', payment: { id: 'pay_1', value: 199 } }))

    // Ainda só 1 escrita de activatedAt no total, entre as duas "entregas".
    expect(vi.mocked(prisma.company.updateMany).mock.calls.filter(c => 'activatedAt' in (c[0] as any).data)).toHaveLength(1)
  })

  // (G) Reentrega HISTÓRICA (Payment já confirmed antes) de Company legada
  // — mesmo sendo implantação (sempre "relevante" estruturalmente), o guard
  // t.count > 0 nunca deixa a reentrega alcançar a checagem de ativação.
  it('(G) reentrega de implantação já confirmed de Company legada NÃO aciona nenhuma checagem de ativação', async () => {
    const company = companyWithActivation({ id: 'company_legado', activatedAt: null })
    vi.mocked(prisma.payment.findFirst).mockResolvedValue(
      { ...implantacaoPendingPaymentFixture(), status: 'confirmed', company } as any
    )
    vi.mocked(prisma.payment.updateMany).mockResolvedValue({ count: 0 } as any)

    const res = await POST(webhookRequest({ event: 'PAYMENT_CONFIRMED', payment: { id: 'pay_implantacao', value: 199 } }))
    const body = await res.json()

    expect(body.note).toBe('already processed')
    expect(prisma.payment.findMany).not.toHaveBeenCalled()
    expect(prisma.company.findUnique).not.toHaveBeenCalled()
    const activationCalls = vi.mocked(prisma.company.updateMany).mock.calls.filter(c => 'activatedAt' in (c[0] as any).data)
    expect(activationCalls).toHaveLength(0)
  })

  // (I) Timestamp: paidAt do Payment e activatedAt da Company usam
  // EXATAMENTE o mesmo instante — nunca dois `new Date()` divergentes, e
  // nunca o horário de um retry tardio (aqui simulado indiretamente: um
  // único `now` é capturado uma vez e reaproveitado nos dois campos).
  it('(I) paidAt do Payment e activatedAt da Company são gravados com o MESMO instante, mesmo que o tempo avance entre as duas escritas (detecta um `now` recalculado em vez de reaproveitado)', async () => {
    const company = companyWithActivation({ id: 'company_1', activatedAt: null })
    vi.mocked(prisma.payment.findFirst).mockResolvedValue(
      dbPaymentFixture({ id: 'payment_1', status: 'pending', company } as any) as any
    )
    vi.mocked(prisma.company.findUnique).mockResolvedValue({ status: company.status, activatedAt: null } as any)
    vi.mocked(prisma.payment.findMany).mockResolvedValue(COMPLETING_PAYMENTS as any)

    vi.useFakeTimers()
    const frozenNow = new Date('2026-07-01T08:00:00.000Z')
    vi.setSystemTime(frozenNow)
    // Simula um gap real de tempo ENTRE a escrita de paidAt (já concluída
    // antes desta chamada) e a leitura/escrita de ativação logo depois, na
    // MESMA transação — se o código capturasse `now` uma única vez ANTES
    // do início da transação (como deve) e reaproveitasse, activatedAt sai
    // igual a `frozenNow`; se em vez disso recalculasse um `new Date()`
    // próprio depois deste ponto (mutação a detectar), sairia 5s adiante.
    vi.mocked(prisma.payment.findMany).mockImplementationOnce((async () => {
      vi.advanceTimersByTime(5000)
      return COMPLETING_PAYMENTS
    }) as any)
    try {
      await POST(webhookRequest({ event: 'PAYMENT_CONFIRMED', payment: { id: 'pay_1', value: 199 } }))
    } finally {
      vi.useRealTimers()
    }

    const paidAtCall = vi.mocked(prisma.payment.updateMany).mock.calls.find(c => 'paidAt' in (c[0] as any).data)
    const activationCall = vi.mocked(prisma.company.updateMany).mock.calls.find(c => 'activatedAt' in (c[0] as any).data)
    expect((paidAtCall![0] as any).data.paidAt).toEqual(frozenNow)
    expect((activationCall![0] as any).data.activatedAt).toEqual(frozenNow)
    expect((activationCall![0] as any).data.activatedAt).not.toEqual(new Date(frozenNow.getTime() + 5000))
  })
})

// ── Commission: comportamento de refund/chargeback preservado (não alterado
// por esta tranche) — trava de regressão explícita, já que nenhum teste
// cobria isso antes desta migração (ver relatório da revisão pós-jornada).
describe('POST /api/webhooks/asaas — PAYMENT_REFUNDED continua estornando a Commission vinculada (comportamento histórico, não tocado por esta tranche)', () => {
  it('marca o Payment como refunded e estorna a Commission em_carencia/liberada/bloqueada vinculada a ele', async () => {
    vi.mocked(prisma.payment.updateMany).mockResolvedValue({ count: 1 } as any)
    vi.mocked(prisma.payment.findFirst).mockResolvedValue({ id: 'payment_refunded_1' } as any)
    vi.mocked(prisma.commission.updateMany).mockResolvedValue({ count: 1 } as any)

    await POST(webhookRequest({ event: 'PAYMENT_REFUNDED', payment: { id: 'pay_refund_1', value: 199 } }))

    expect(prisma.payment.updateMany).toHaveBeenCalledWith({
      where: { asaasId: 'pay_refund_1' },
      data:  { status: 'refunded' },
    })
    expect(prisma.commission.updateMany).toHaveBeenCalledWith({
      where: { paymentId: 'payment_refunded_1', status: { in: ['em_carencia', 'liberada', 'bloqueada'] } },
      data:  { status: 'estornada' },
    })
  })

  it('nenhum Payment local correspondente → não tenta estornar Commission nenhuma (no-op seguro)', async () => {
    vi.mocked(prisma.payment.updateMany).mockResolvedValue({ count: 0 } as any)
    vi.mocked(prisma.payment.findFirst).mockResolvedValue(null)

    await POST(webhookRequest({ event: 'PAYMENT_REFUNDED', payment: { id: 'pay_refund_desconhecido', value: 199 } }))

    expect(prisma.commission.updateMany).not.toHaveBeenCalled()
  })
})
