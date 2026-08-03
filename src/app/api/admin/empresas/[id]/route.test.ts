import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/adminAuth', () => ({
  verifyAdminSecret: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    company: { findUnique: vi.fn() },
  },
}))

// Import dinâmico dentro de beforeAll (em vez de top-level await) para não
// introduzir o erro TS1378 no tsc — mantém a mesma ordem de hoist do vi.mock.
let GET: typeof import('./route').GET
let verifyAdminSecret: typeof import('@/lib/adminAuth').verifyAdminSecret
let prisma: typeof import('@/lib/prisma').prisma

beforeAll(async () => {
  ;({ GET } = await import('./route'))
  ;({ verifyAdminSecret } = await import('@/lib/adminAuth'))
  ;({ prisma } = await import('@/lib/prisma'))
})

function detailRequest(secret = 'correct-secret') {
  return new NextRequest('https://www.sublimesst.com/api/admin/empresas/company_1', {
    headers: secret ? { 'x-admin-secret': secret } : {},
  })
}

const PARAMS = { params: { id: 'company_1' } }

const ONBOARDING_FIXTURE = {
  numFuncionarios: 5,
  cargos: 'Analista, Motorista',
  turnoTrabalho: 'Diurno',
  dataUltimoPcmso: '2024',
  possuiPgr: true,
  observacoes: 'Sem observações relevantes.',
  submittedAt: new Date('2026-08-03T12:00:00Z'),
}

const COMPANY_FIXTURE = {
  id: 'company_1',
  razaoSocial: 'Empresa Teste',
  numFuncionarios: 5,
  onboardingData: ONBOARDING_FIXTURE,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/admin/empresas/[id] — onboardingData', () => {
  it('sem admin secret válido → 401, sem consultar Prisma', async () => {
    vi.mocked(verifyAdminSecret).mockReturnValue(false)
    const res = await GET(detailRequest('wrong'), PARAMS)
    expect(res.status).toBe(401)
    expect(prisma.company.findUnique).not.toHaveBeenCalled()
  })

  it('admin autenticado recebe onboardingData completo', async () => {
    vi.mocked(verifyAdminSecret).mockReturnValue(true)
    vi.mocked(prisma.company.findUnique).mockResolvedValue(COMPANY_FIXTURE as any)
    const res = await GET(detailRequest(), PARAMS)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.onboardingData).toEqual({
      ...ONBOARDING_FIXTURE,
      submittedAt: ONBOARDING_FIXTURE.submittedAt.toISOString(),
    })
  })

  it('Company sem onboarding retorna onboardingData = null, sem erro 500', async () => {
    vi.mocked(verifyAdminSecret).mockReturnValue(true)
    vi.mocked(prisma.company.findUnique).mockResolvedValue({ ...COMPANY_FIXTURE, onboardingData: null } as any)
    const res = await GET(detailRequest(), PARAMS)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.onboardingData).toBeNull()
  })

  it('Company inexistente mantém comportamento atual (404)', async () => {
    vi.mocked(verifyAdminSecret).mockReturnValue(true)
    vi.mocked(prisma.company.findUnique).mockResolvedValue(null)
    const res = await GET(detailRequest(), PARAMS)
    expect(res.status).toBe(404)
  })

  it('consulta apenas os campos selecionados de onboardingData (select explícito, sem include irrestrito)', async () => {
    vi.mocked(verifyAdminSecret).mockReturnValue(true)
    vi.mocked(prisma.company.findUnique).mockResolvedValue(COMPANY_FIXTURE as any)
    await GET(detailRequest(), PARAMS)
    expect(prisma.company.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'company_1' },
      include: expect.objectContaining({
        onboardingData: {
          select: {
            numFuncionarios: true,
            cargos: true,
            turnoTrabalho: true,
            dataUltimoPcmso: true,
            possuiPgr: true,
            observacoes: true,
            submittedAt: true,
          },
        },
      }),
    }))
  })

  it('isolamento: consulta somente a Company do id informado', async () => {
    vi.mocked(verifyAdminSecret).mockReturnValue(true)
    vi.mocked(prisma.company.findUnique).mockResolvedValue(COMPANY_FIXTURE as any)
    await GET(detailRequest(), { params: { id: 'company_1' } })
    expect(prisma.company.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'company_1' },
    }))
  })
})
