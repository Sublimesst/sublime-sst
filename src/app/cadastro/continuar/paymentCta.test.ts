import { describe, it, expect } from 'vitest'
import { canPayNow, shouldShowPaymentButton } from './paymentCta'

describe('canPayNow', () => {
  it('pending → true', () => expect(canPayNow('pending')).toBe(true))
  it('overdue → true', () => expect(canPayNow('overdue')).toBe(true))
  it('confirmed → false', () => expect(canPayNow('confirmed')).toBe(false))
  it('refunded → false', () => expect(canPayNow('refunded')).toBe(false))
  it('disputed → false', () => expect(canPayNow('disputed')).toBe(false))
  it('ausente/null → false', () => {
    expect(canPayNow(null)).toBe(false)
    expect(canPayNow(undefined)).toBe(false)
  })
})

describe('shouldShowPaymentButton — independência entre implantação e mensalidade', () => {
  it('implantação pending + mensalidade pending, ambas com URL → os dois CTAs aparecem', () => {
    const implantacao = { status: 'pending', checkoutUrl: 'https://www.asaas.com/i/impl' }
    const mensalidade = { status: 'pending', checkoutUrl: 'https://www.asaas.com/i/mens' }
    expect(shouldShowPaymentButton(implantacao)).toBe(true)
    expect(shouldShowPaymentButton(mensalidade)).toBe(true)
  })

  it('implantação pending + mensalidade overdue com URL → CTA da mensalidade aparece independente da implantação', () => {
    const implantacao = { status: 'pending', checkoutUrl: 'https://www.asaas.com/i/impl' }
    const mensalidade = { status: 'overdue', checkoutUrl: 'https://www.asaas.com/i/mens' }
    expect(shouldShowPaymentButton(mensalidade)).toBe(true)
    expect(shouldShowPaymentButton(implantacao)).toBe(true) // nenhuma esconde a outra
  })

  it('implantação confirmed + mensalidade pending → CTA só da mensalidade (implantação não precisa mais)', () => {
    const implantacao = { status: 'confirmed', checkoutUrl: 'https://www.asaas.com/i/impl' }
    const mensalidade = { status: 'pending', checkoutUrl: 'https://www.asaas.com/i/mens' }
    expect(shouldShowPaymentButton(implantacao)).toBe(false)
    expect(shouldShowPaymentButton(mensalidade)).toBe(true)
  })

  it('mensalidade confirmed + implantação pending → CTA só da implantação (ordem inversa, mesma independência)', () => {
    const implantacao = { status: 'pending', checkoutUrl: 'https://www.asaas.com/i/impl' }
    const mensalidade = { status: 'confirmed', checkoutUrl: 'https://www.asaas.com/i/mens' }
    expect(shouldShowPaymentButton(implantacao)).toBe(true)
    expect(shouldShowPaymentButton(mensalidade)).toBe(false)
  })

  it('URL ausente não gera botão mesmo com status pagável', () => {
    expect(shouldShowPaymentButton({ status: 'pending', checkoutUrl: null })).toBe(false)
    expect(shouldShowPaymentButton({ status: 'overdue', checkoutUrl: undefined })).toBe(false)
  })

  it('confirmed nunca gera botão, mesmo com URL válida', () => {
    expect(shouldShowPaymentButton({ status: 'confirmed', checkoutUrl: 'https://www.asaas.com/i/x' })).toBe(false)
  })

  it('refunded/disputed nunca geram botão (nunca criam cobrança nova)', () => {
    expect(shouldShowPaymentButton({ status: 'refunded', checkoutUrl: 'https://www.asaas.com/i/x' })).toBe(false)
    expect(shouldShowPaymentButton({ status: 'disputed', checkoutUrl: 'https://www.asaas.com/i/x' })).toBe(false)
  })

  it('pagamento ausente (null) → false, nunca lança', () => {
    expect(shouldShowPaymentButton(null)).toBe(false)
    expect(shouldShowPaymentButton(undefined)).toBe(false)
  })
})
