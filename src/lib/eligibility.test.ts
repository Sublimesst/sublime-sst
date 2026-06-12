import { describe, it, expect } from 'vitest'
import { runEligibilityEngine } from '../lib/eligibility'
import type { EligibilityData } from '../types'

// ── BASE CASE — empresa elegível ─────────────────────────────
const BASE_ELIGIBLE: EligibilityData = {
  cnae: '69.20-6 — Atividades de contabilidade',
  cnaeCode: '69.20-6',       // GR1 + aprovado na lista branca
  employees: '1-5',
  usesMachines: false,
  usesChemicals: false,
  worksAtHeight: false,
  hasExternalWork: false,
  declaration: true,
}

// ── HELPER ───────────────────────────────────────────────────
function elig(overrides: Partial<EligibilityData>) {
  return runEligibilityEngine({ ...BASE_ELIGIBLE, ...overrides })
}

// ═══════════════════════════════════════════════════════════
// TESTE 1 — Empresa GR1, CNAE liberado, ≤20 func., sem riscos
// ═══════════════════════════════════════════════════════════
describe('Teste 1 — Empresa elegível ao modelo online', () => {
  it('deve retornar eligible=true com plano correto', () => {
    const result = elig({})
    expect(result.eligible).toBe(true)
    expect(result.reasons).toHaveLength(0)
    expect(result.plan).toBeDefined()
    expect(result.plan?.range).toBe('1-5')
    expect(result.plan?.monthly).toBe(14200)
  })

  it('deve retornar plano 6-10 para faixa correta', () => {
    const result = elig({ employees: '6-10' })
    expect(result.eligible).toBe(true)
    expect(result.plan?.range).toBe('6-10')
    expect(result.plan?.monthly).toBe(25000)
  })

  it('deve retornar plano 11-20 para faixa correta', () => {
    const result = elig({ employees: '11-20' })
    expect(result.eligible).toBe(true)
    expect(result.plan?.range).toBe('11-20')
    expect(result.plan?.monthly).toBe(43000)
  })
})

// ═══════════════════════════════════════════════════════════
// TESTE 2 — Mais de 20 funcionários
// ═══════════════════════════════════════════════════════════
describe('Teste 2 — Mais de 20 funcionários', () => {
  it('deve encaminhar ao backoffice', () => {
    const result = elig({ employees: '21+' })
    expect(result.eligible).toBe(false)
    expect(result.reasons).toContain('MAIS_DE_20_FUNCIONARIOS')
    expect(result.plan).toBeUndefined()
  })
})

// ═══════════════════════════════════════════════════════════
// TESTE 3 — Respostas críticas = Sim
// ═══════════════════════════════════════════════════════════
describe('Teste 3 — Respostas críticas marcadas como Sim', () => {
  it('máquinas industriais → backoffice', () => {
    const result = elig({ usesMachines: true })
    expect(result.eligible).toBe(false)
    expect(result.reasons).toContain('USA_MAQUINAS_INDUSTRIAIS')
  })

  it('produtos químicos → backoffice', () => {
    const result = elig({ usesChemicals: true })
    expect(result.eligible).toBe(false)
    expect(result.reasons).toContain('MANIPULA_QUIMICOS')
  })

  it('trabalho em altura → backoffice', () => {
    const result = elig({ worksAtHeight: true })
    expect(result.eligible).toBe(false)
    expect(result.reasons).toContain('TRABALHO_EM_ALTURA')
  })

  it('atividades externas frequentes → backoffice', () => {
    const result = elig({ hasExternalWork: true })
    expect(result.eligible).toBe(false)
    expect(result.reasons).toContain('ATIVIDADES_EXTERNAS_FREQUENTES')
  })

  it('múltiplos riscos → acumula todos os motivos', () => {
    const result = elig({ usesMachines: true, usesChemicals: true, worksAtHeight: true })
    expect(result.eligible).toBe(false)
    expect(result.reasons).toContain('USA_MAQUINAS_INDUSTRIAIS')
    expect(result.reasons).toContain('MANIPULA_QUIMICOS')
    expect(result.reasons).toContain('TRABALHO_EM_ALTURA')
    expect(result.reasons).toHaveLength(3)
  })
})

// ═══════════════════════════════════════════════════════════
// TESTE 4 — CNAE não GR1
// ═══════════════════════════════════════════════════════════
describe('Teste 4 — CNAE não presente no catálogo GR1', () => {
  it('CNAE inexistente → backoffice com CNAE_NAO_GR1', () => {
    const result = elig({ cnaeCode: '99.99-9', cnae: '99.99-9 — Atividade fictícia' })
    expect(result.eligible).toBe(false)
    expect(result.reasons).toContain('CNAE_NAO_GR1')
  })

  it('CNAE vazio → backoffice com CNAE_NAO_GR1', () => {
    const result = elig({ cnaeCode: '', cnae: '' })
    expect(result.eligible).toBe(false)
    expect(result.reasons).toContain('CNAE_NAO_GR1')
  })
})

// ═══════════════════════════════════════════════════════════
// TESTE 5 — CNAE GR1 ainda não aprovado na lista branca
// ═══════════════════════════════════════════════════════════
describe('Teste 5 — CNAE GR1 pendente de validação interna', () => {
  it('deve encaminhar ao backoffice com CNAE_PENDENTE_VALIDACAO_RT', () => {
    // 41.10-7 está no catálogo GR1 mas com status 'pending'
    const result = elig({ cnaeCode: '41.10-7', cnae: '41.10-7 — Incorporação imobiliária' })
    expect(result.eligible).toBe(false)
    expect(result.reasons).toContain('CNAE_PENDENTE_VALIDACAO_RT')
  })
})

// ═══════════════════════════════════════════════════════════
// TESTE 6 — Lead sem resultado final (dados parciais)
// ═══════════════════════════════════════════════════════════
describe('Teste 6 — Dados incompletos não devem crashar', () => {
  it('empresa sem CNAE definido → backoffice, não lança exceção', () => {
    expect(() => {
      elig({ cnaeCode: '', cnae: '' })
    }).not.toThrow()
  })

  it('resultado ainda inclui reasons válidas para logging', () => {
    const result = elig({ cnaeCode: '', employees: '21+', usesMachines: true })
    expect(result.eligible).toBe(false)
    expect(result.reasons.length).toBeGreaterThan(0)
  })
})

// ═══════════════════════════════════════════════════════════
// TESTE 7 — Combinações de múltiplos bloqueios
// ═══════════════════════════════════════════════════════════
describe('Teste 7 — Múltiplos motivos acumulados', () => {
  it('acumula todos os motivos quando há vários bloqueios', () => {
    const result = elig({
      cnaeCode: '99.99-9',
      employees: '21+',
      usesMachines: true,
      usesChemicals: true,
    })
    expect(result.eligible).toBe(false)
    expect(result.reasons).toContain('CNAE_NAO_GR1')
    expect(result.reasons).toContain('MAIS_DE_20_FUNCIONARIOS')
    expect(result.reasons).toContain('USA_MAQUINAS_INDUSTRIAIS')
    expect(result.reasons).toContain('MANIPULA_QUIMICOS')
    expect(result.reasons).toHaveLength(4)
  })
})

// ═══════════════════════════════════════════════════════════
// TESTE 8 — Planos corretos por faixa
// ═══════════════════════════════════════════════════════════
describe('Teste 8 — Planos retornados corretamente', () => {
  it('não retorna plano para empresa inelegível', () => {
    const result = elig({ employees: '21+' })
    expect(result.plan).toBeUndefined()
  })

  it('retorna implantacaoPromo correto para todos os planos', () => {
    for (const range of ['1-5', '6-10', '11-20'] as const) {
      const result = elig({ employees: range })
      expect(result.plan?.implantacaoPromo).toBe(10000)
      expect(result.plan?.implantacao).toBe(19000)
    }
  })
})
