import { describe, it, expect, vi, beforeEach } from 'vitest'

// Testamos só getFinancialState (dados, sem JSX) — o projeto não tem
// infraestrutura de teste de componente/JSX (esbuild do Vitest exige React
// global para o transform clássico, e o projeto não importa React
// explicitamente em nenhuma página; não instalamos plugin novo só para isso).
// "Bloqueado renderiza BlockedCard / completo renderiza OnboardingForm" fica
// como validação manual no Preview, mesmo tratamento dado a páginas
// anteriores sem infra de teste de componente.

vi.mock('next/headers', () => ({ cookies: vi.fn() }))
vi.mock('@/lib/prisma', () => ({
  prisma: { company: { findUnique: vi.fn() } },
}))
vi.mock('@/lib/sessionCookie', () => ({ verifySessionCookie: vi.fn() }))

const { cookies } = await import('next/headers')
const { prisma } = await import('@/lib/prisma')
const { verifySessionCookie } = await import('@/lib/sessionCookie')
const { getFinancialState } = await import('./financialGate')

function mockCookie(value: string | undefined) {
  vi.mocked(cookies).mockResolvedValue({ get: () => (value ? { value } : undefined) } as any)
}

function payment(overrides: Partial<{ id: string; type: string; status: string; amount: number; dueDate: Date | null; createdAt: Date; checkoutUrl: string | null }> = {}) {
  return {
    id: 'pay_1', type: 'implantacao', status: 'confirmed', amount: 14900,
    dueDate: new Date('2026-07-01'), createdAt: new Date('2026-06-01'), checkoutUrl: null,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getFinancialState (gate da página de onboarding — Etapa 2C.1B)', () => {
  it('sem cookie/sessão → null (página redireciona para login)', async () => {
    mockCookie(undefined)
    vi.mocked(verifySessionCookie).mockReturnValue(null)
    expect(await getFinancialState()).toBeNull()
    expect(prisma.company.findUnique).not.toHaveBeenCalled()
  })

  it('Company incompleta financeiramente → financiallyComplete false', async () => {
    mockCookie('token')
    vi.mocked(verifySessionCookie).mockReturnValue({ companyId: 'company_1' } as any)
    vi.mocked(prisma.company.findUnique).mockResolvedValue({
      status: 'onboarding_pending',
      payments: [payment({ status: 'pending' })],
    } as any)

    const state = await getFinancialState()
    expect(state?.financiallyComplete).toBe(false)
  })

  it('Company financeiramente completa → financiallyComplete true', async () => {
    mockCookie('token')
    vi.mocked(verifySessionCookie).mockReturnValue({ companyId: 'company_1' } as any)
    vi.mocked(prisma.company.findUnique).mockResolvedValue({
      status: 'onboarding_pending',
      payments: [
        payment({ id: 'p1', type: 'implantacao', status: 'confirmed' }),
        payment({ id: 'p2', type: 'mensalidade', status: 'confirmed', dueDate: new Date('2026-07-27') }),
      ],
    } as any)

    const state = await getFinancialState()
    expect(state?.financiallyComplete).toBe(true)
  })

  it('Company cancelled → null (página redireciona para login, mesmo com sessão válida)', async () => {
    mockCookie('token')
    vi.mocked(verifySessionCookie).mockReturnValue({ companyId: 'company_1' } as any)
    vi.mocked(prisma.company.findUnique).mockResolvedValue({ status: 'cancelled', payments: [] } as any)
    expect(await getFinancialState()).toBeNull()
  })

  it('isolamento: consulta só a Company do companyId do cookie, nunca de outro lugar', async () => {
    mockCookie('token')
    vi.mocked(verifySessionCookie).mockReturnValue({ companyId: 'company_isolada' } as any)
    vi.mocked(prisma.company.findUnique).mockResolvedValue(null)
    await getFinancialState()
    expect(prisma.company.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'company_isolada' } }))
  })

  it('Company não encontrada → null', async () => {
    mockCookie('token')
    vi.mocked(verifySessionCookie).mockReturnValue({ companyId: 'company_1' } as any)
    vi.mocked(prisma.company.findUnique).mockResolvedValue(null)
    expect(await getFinancialState()).toBeNull()
  })
})
