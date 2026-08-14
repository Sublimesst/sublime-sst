import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/partnerAuth', () => ({
  getPartnerSession: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    lead:       { findMany: vi.fn() },
    commission: { findMany: vi.fn() },
  },
}))

let GET: typeof import('./route').GET
let getPartnerSession: typeof import('@/lib/partnerAuth').getPartnerSession
let prisma: typeof import('@/lib/prisma').prisma

beforeAll(async () => {
  ;({ GET } = await import('./route'))
  ;({ getPartnerSession } = await import('@/lib/partnerAuth'))
  ;({ prisma } = await import('@/lib/prisma'))
})

const PARTNER_A = { id: 'partner_a', name: 'Parceiro A', code: 'code_a', email: 'a@a.com', tier: 'comum', status: 'active' }

function req() {
  return new NextRequest('https://www.sublimesst.com/api/partner/dashboard')
}

function payment(overrides: Partial<{ id: string; type: string; status: string }> = {}) {
  return {
    id: 'pay_1', type: 'implantacao', status: 'confirmed', amount: 1000,
    dueDate: null, createdAt: new Date('2026-01-01'), checkoutUrl: null,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getPartnerSession).mockResolvedValue(PARTNER_A as any)
  vi.mocked(prisma.commission.findMany).mockResolvedValue([])
})

describe('GET /api/partner/dashboard — autenticação', () => {
  it('sem sessão válida → 401, nenhuma query ao banco', async () => {
    vi.mocked(getPartnerSession).mockResolvedValue(null)
    const res = await GET(req())
    expect(res.status).toBe(401)
    expect(prisma.lead.findMany).not.toHaveBeenCalled()
  })
})

describe('GET /api/partner/dashboard — classificação comercial', () => {
  it('lead recém capturado, sem avaliação nem Company → "indicacao_recebida"', async () => {
    vi.mocked(prisma.lead.findMany).mockResolvedValue([
      { id: 'lead_1', status: 'captured', companyName: 'Empresa X', cnpj: '111', createdAt: new Date(), company: null },
    ] as any)
    const res = await GET(req())
    const body = await res.json()
    expect(body.data.leads[0].classification).toBe('indicacao_recebida')
    expect(body.data.summary).toMatchObject({ indicacoesRecebidas: 1, emAndamento: 1, convertidas: 0 })
  })

  it('lead com elegibilidade avaliada, sem Company → "elegibilidade_avaliada"', async () => {
    vi.mocked(prisma.lead.findMany).mockResolvedValue([
      { id: 'lead_e', status: 'eligible', companyName: 'Empresa E', cnpj: '444', createdAt: new Date(), company: null },
    ] as any)
    const res = await GET(req())
    const body = await res.json()
    expect(body.data.leads[0].classification).toBe('elegibilidade_avaliada')
  })

  it('lead encaminhado para consultoria (backoffice), sem Company → "encaminhada_consultoria"', async () => {
    vi.mocked(prisma.lead.findMany).mockResolvedValue([
      { id: 'lead_b', status: 'backoffice', companyName: 'Empresa B', cnpj: '555', createdAt: new Date(), company: null },
    ] as any)
    const res = await GET(req())
    const body = await res.json()
    expect(body.data.leads[0].classification).toBe('encaminhada_consultoria')
  })

  it('Company existe mas implantação/mensalidade não confirmadas → "cadastro_em_andamento", nunca "concluída" (item 13/16)', async () => {
    vi.mocked(prisma.lead.findMany).mockResolvedValue([
      {
        id: 'lead_2', status: 'registered', companyName: 'Empresa Y', cnpj: '222', createdAt: new Date(),
        company: { status: 'pending', planType: 'essencial', createdAt: new Date(), payments: [payment({ status: 'pending' })] },
      },
    ] as any)
    const res = await GET(req())
    const body = await res.json()
    expect(body.data.leads[0].classification).toBe('cadastro_em_andamento')
    expect(body.data.summary).toMatchObject({ indicacoesRecebidas: 1, emAndamento: 1, convertidas: 0 })
  })

  it('Company com implantação E mensalidade confirmadas → "contratacao_concluida" (via deriveFinancialActivationState)', async () => {
    vi.mocked(prisma.lead.findMany).mockResolvedValue([
      {
        id: 'lead_3', status: 'registered', companyName: 'Empresa Z', cnpj: '333', createdAt: new Date(),
        company: {
          status: 'active', planType: 'premium', createdAt: new Date(),
          payments: [
            payment({ type: 'implantacao', status: 'confirmed' }),
            payment({ id: 'pay_2', type: 'mensalidade', status: 'confirmed' }),
          ],
        },
      },
    ] as any)
    const res = await GET(req())
    const body = await res.json()
    expect(body.data.leads[0].classification).toBe('contratacao_concluida')
    expect(body.data.summary).toMatchObject({ indicacoesRecebidas: 1, emAndamento: 0, convertidas: 1 })
  })

  it('nenhum campo de status técnico ou CNPJ do lead vaza no payload (item 12/18 — minimização de dados)', async () => {
    vi.mocked(prisma.lead.findMany).mockResolvedValue([
      { id: 'lead_1', status: 'captured', companyName: 'Empresa X', cnpj: '11.222.333/0001-81', createdAt: new Date(), company: null },
    ] as any)
    const res = await GET(req())
    const body = await res.json()
    expect(Object.keys(body.data.leads[0])).toEqual(['id', 'companyName', 'classification', 'planType', 'createdAt'])
    expect(JSON.stringify(body.data.leads[0])).not.toContain('11.222.333')
  })
})

describe('GET /api/partner/dashboard — isolamento entre parceiros', () => {
  it('consulta Lead e Commission sempre filtradas pelo id do parceiro autenticado', async () => {
    vi.mocked(prisma.lead.findMany).mockResolvedValue([])
    await GET(req())
    expect(prisma.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { partnerId: 'partner_a' } })
    )
    expect(prisma.commission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { partnerId: 'partner_a' } })
    )
  })
})
