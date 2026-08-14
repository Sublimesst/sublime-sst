import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'

function serializationConflict() {
  return new Prisma.PrismaClientKnownRequestError('could not serialize access due to concurrent update', {
    code: 'P2034',
    clientVersion: '5.22.0',
  })
}

vi.mock('@/lib/prisma', () => {
  const prisma: any = {
    partner:         { findFirst: vi.fn(), create: vi.fn() },
    partnerReferral: { create: vi.fn() },
    lead:            { upsert: vi.fn() },
  }
  // A rota roda a checagem de duplicidade + o create dentro de runSerializable
  // (prisma.$transaction) — no mock, tx === prisma, então os mesmos mocks de
  // partner.findFirst/create acima servem tanto para o caminho normal quanto
  // para os testes de corrida abaixo (que sobrescrevem $transaction).
  prisma.$transaction = vi.fn(async (cb: any) => cb(prisma))
  return { prisma }
})

vi.mock('@/lib/mailer', () => ({
  notifyNewPartner:    vi.fn(async () => {}),
  notifyNewLead:       vi.fn(async () => {}),
  sendPartnerActivated: vi.fn(async () => {}),
}))

vi.mock('@/lib/adminAuth', () => ({
  verifyAdminSecret: vi.fn(() => false),
}))

let POST: typeof import('./route').POST
let prisma: typeof import('@/lib/prisma').prisma
let sendPartnerActivated: typeof import('@/lib/mailer').sendPartnerActivated
let notifyNewPartner: typeof import('@/lib/mailer').notifyNewPartner

beforeAll(async () => {
  ;({ POST } = await import('./route'))
  ;({ prisma } = await import('@/lib/prisma'))
  ;({ sendPartnerActivated, notifyNewPartner } = await import('@/lib/mailer'))
})

// CNPJs sintéticos com checksum módulo 11 real e válido (gerados pelo mesmo
// algoritmo de src/lib/utils.ts) — nunca CNPJ de empresa real.
const VALID_CNPJ = '12.345.678/0001-95'
const VALID_CNPJ_DIGITS = '12345678000195'

let ipCounter = 0
function partnerRequest(body: Record<string, unknown>) {
  ipCounter++
  const defaults = {
    name: 'Fulano de Tal',
    office: 'Escritório Teste',
    cnpj: VALID_CNPJ,
    email: 'parceiro@example.com',
    whatsapp: '11999998888',
    city: 'São Paulo',
    state: 'SP',
    consentContact: true,
    consentTerms: true,
  }
  return new NextRequest('https://www.sublimesst.com/api/partners', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': `10.0.0.${ipCounter}` },
    body: JSON.stringify({ ...defaults, ...body }),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.partner.findFirst).mockResolvedValue(null)
  // Cast p/ any: o retorno real do Prisma Client inclui métodos de relação
  // (leads/referrals/...) que o mock não precisa simular.
  ;(prisma.partner.create as any).mockImplementation(async ({ data }: any) => ({
    id: 'partner_1', code: 'code_abc123', ...data,
  }))
  // clearAllMocks() não remove mockImplementation — reestabelece a baseline
  // a cada teste para que overrides de $transaction (testes de corrida) não
  // vazem para os testes seguintes.
  vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb(prisma))
})

describe('POST /api/partners — CNPJ obrigatório e validado', () => {
  it('CNPJ ausente → 400, Partner não criado', async () => {
    const res = await POST(partnerRequest({ cnpj: '' }))
    expect(res.status).toBe(400)
    expect(prisma.partner.create).not.toHaveBeenCalled()
  })

  it('CNPJ com checksum inválido → 400, Partner não criado', async () => {
    const res = await POST(partnerRequest({ cnpj: '11.111.111/1111-11' }))
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toMatch(/CNPJ inválido/)
    expect(prisma.partner.create).not.toHaveBeenCalled()
  })
})

describe('POST /api/partners — duplicidade', () => {
  it('e-mail já cadastrado → 409, Partner não criado', async () => {
    ;(prisma.partner.findFirst as any).mockImplementation(async ({ where }: any) =>
      where.email ? { id: 'existing_1' } : null
    )
    const res = await POST(partnerRequest({}))
    expect(res.status).toBe(409)
    expect(prisma.partner.create).not.toHaveBeenCalled()
  })

  it('CNPJ já cadastrado (mesmo dígitos, máscara diferente da gravada) → 409, Partner não criado', async () => {
    ;(prisma.partner.findFirst as any).mockImplementation(async ({ where }: any) =>
      where.cnpj === VALID_CNPJ_DIGITS ? { id: 'existing_2' } : null
    )
    const res = await POST(partnerRequest({}))
    const body = await res.json()
    expect(res.status).toBe(409)
    expect(body.error).toMatch(/CNPJ já possui cadastro/)
    expect(prisma.partner.create).not.toHaveBeenCalled()
  })
})

describe('POST /api/partners — autoativação', () => {
  it('cadastro válido → Partner criado com status active (sem depender do Admin)', async () => {
    const res = await POST(partnerRequest({}))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(prisma.partner.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'active' }) })
    )
  })

  it('CNPJ é normalizado (só dígitos) antes de gravar, independente da máscara enviada', async () => {
    await POST(partnerRequest({ cnpj: VALID_CNPJ }))
    expect(prisma.partner.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ cnpj: VALID_CNPJ_DIGITS }) })
    )
  })

  it('aceite do Termo é gravado com data, IP e versão', async () => {
    await POST(partnerRequest({}))
    const call = vi.mocked(prisma.partner.create).mock.calls[0][0] as any
    expect(call.data.termsAcceptedAt).toBeInstanceOf(Date)
    expect(typeof call.data.termsVersion).toBe('string')
    expect(call.data.termsAcceptanceIp).toMatch(/^10\.0\.0\.\d+$/)
  })

  it('envia e-mail de ativação (link de indicação) na autoativação', async () => {
    await POST(partnerRequest({}))
    expect(sendPartnerActivated).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'parceiro@example.com', code: 'code_abc123' })
    )
  })

  it('falha no e-mail de ativação NÃO reverte nem impede a criação do Partner (item 6)', async () => {
    vi.mocked(sendPartnerActivated).mockRejectedValueOnce(new Error('RESEND indisponível'))
    const res = await POST(partnerRequest({}))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(prisma.partner.create).toHaveBeenCalledTimes(1)
  })

  it('falha ao notificar a equipe (notifyNewPartner) também não reverte o Partner', async () => {
    vi.mocked(notifyNewPartner).mockRejectedValueOnce(new Error('SMTP fora do ar'))
    const res = await POST(partnerRequest({}))
    expect(res.status).toBe(200)
  })
})

describe('POST /api/partners — proteção contra corrida (Serializable + retry)', () => {
  it('conflito de serialização (P2034) na 1ª tentativa → runSerializable reexecuta e completa com sucesso', async () => {
    let attempt = 0
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
      attempt++
      if (attempt === 1) throw serializationConflict()
      return cb(prisma)
    })
    const res = await POST(partnerRequest({}))
    expect(res.status).toBe(200)
    expect(prisma.$transaction).toHaveBeenCalledTimes(2)
    expect(prisma.partner.create).toHaveBeenCalledTimes(1)
  })

  it('corrida real: duas requisições com o mesmo CNPJ — a que reexecuta após o conflito já vê o Partner criado pela concorrente e é rejeitada por duplicidade, nunca cria uma segunda', async () => {
    let attempt = 0
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
      attempt++
      if (attempt === 1) {
        // 1ª tentativa colide com a criação concorrente que também viu "sem
        // duplicata" e comitou primeiro — abortada pelo Postgres antes mesmo
        // de o callback (cb) rodar.
        throw serializationConflict()
      }
      // Retry: leitura fresca já mostra o Partner criado pela concorrente.
      ;(prisma.partner.findFirst as any).mockImplementation(async ({ where }: any) =>
        where.cnpj === VALID_CNPJ_DIGITS ? { id: 'existing_concorrente' } : null
      )
      return cb(prisma)
    })
    const res = await POST(partnerRequest({}))
    const body = await res.json()
    expect(res.status).toBe(409)
    expect(body.error).toMatch(/CNPJ já possui cadastro/)
    expect(prisma.partner.create).not.toHaveBeenCalled()
  })
})

describe('POST /api/partners — consentimentos obrigatórios (regressão)', () => {
  it('sem consentTerms → 400, Partner não criado', async () => {
    const res = await POST(partnerRequest({ consentTerms: false }))
    expect(res.status).toBe(400)
    expect(prisma.partner.create).not.toHaveBeenCalled()
  })

  it('sem consentContact → 400, Partner não criado', async () => {
    const res = await POST(partnerRequest({ consentContact: false }))
    expect(res.status).toBe(400)
    expect(prisma.partner.create).not.toHaveBeenCalled()
  })
})
