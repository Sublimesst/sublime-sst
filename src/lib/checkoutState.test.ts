import { describe, it, expect } from 'vitest'
import { deriveContratacaoState } from './checkoutState'

function state(overrides: Partial<Parameters<typeof deriveContratacaoState>[0]> = {}) {
  return deriveContratacaoState({
    companyStatus: 'onboarding_pending',
    implantacaoStatus: 'pending',
    mensalidadeStatus: 'not_ready',
    ...overrides,
  })
}

describe('deriveContratacaoState', () => {
  it('Company cancelled → cancelled, sem botão', () => {
    const r = state({ companyStatus: 'cancelled' })
    expect(r).toEqual({ step: 'cancelled', financiallyComplete: false, showsCommonPaymentButton: false })
  })

  it('implantação pending, mensalidade not_ready → step1', () => {
    const r = state({ implantacaoStatus: 'pending', mensalidadeStatus: 'not_ready' })
    expect(r.step).toBe('step1')
    expect(r.showsCommonPaymentButton).toBe(true)
  })

  it('implantação pending, mensalidade pending (boleto) → step1, ambas visíveis', () => {
    const r = state({ implantacaoStatus: 'pending', mensalidadeStatus: 'pending' })
    expect(r.step).toBe('step1')
    expect(r.showsCommonPaymentButton).toBe(true)
  })

  it('implantação confirmed, mensalidade not_ready → preparing, sem botão', () => {
    const r = state({ implantacaoStatus: 'confirmed', mensalidadeStatus: 'not_ready' })
    expect(r).toEqual({ step: 'preparing', financiallyComplete: false, showsCommonPaymentButton: false })
  })

  it('implantação confirmed, mensalidade pending → step2', () => {
    const r = state({ implantacaoStatus: 'confirmed', mensalidadeStatus: 'pending' })
    expect(r).toEqual({ step: 'step2', financiallyComplete: false, showsCommonPaymentButton: true })
  })

  it('ambas confirmed → completed', () => {
    const r = state({ implantacaoStatus: 'confirmed', mensalidadeStatus: 'confirmed' })
    expect(r).toEqual({ step: 'completed', financiallyComplete: true, showsCommonPaymentButton: false })
  })

  it('implantação overdue → implantacao_issue, sem botão comum', () => {
    const r = state({ implantacaoStatus: 'overdue' })
    expect(r.step).toBe('implantacao_issue')
    expect(r.showsCommonPaymentButton).toBe(false)
  })

  it('implantação refunded → implantacao_issue', () => {
    expect(state({ implantacaoStatus: 'refunded' }).step).toBe('implantacao_issue')
  })

  it('implantação disputed → implantacao_issue', () => {
    expect(state({ implantacaoStatus: 'disputed' }).step).toBe('implantacao_issue')
  })

  it('mensalidade overdue (implantação confirmed) → mensalidade_issue', () => {
    const r = state({ implantacaoStatus: 'confirmed', mensalidadeStatus: 'overdue' })
    expect(r.step).toBe('mensalidade_issue')
    expect(r.showsCommonPaymentButton).toBe(false)
  })

  it('mensalidade refunded (implantação confirmed) → mensalidade_issue', () => {
    expect(state({ implantacaoStatus: 'confirmed', mensalidadeStatus: 'refunded' }).step).toBe('mensalidade_issue')
  })

  it('mensalidade disputed (implantação confirmed) → mensalidade_issue', () => {
    expect(state({ implantacaoStatus: 'confirmed', mensalidadeStatus: 'disputed' }).step).toBe('mensalidade_issue')
  })

  it('implantacaoStatus null (defensivo) → step1', () => {
    expect(state({ implantacaoStatus: null }).step).toBe('step1')
  })
})
