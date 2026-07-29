import { describe, it, expect } from 'vitest'
import { paymentDisplayInfo } from './paymentPresentationView'

describe('paymentDisplayInfo (Portal Cliente — Etapa 2C.1B)', () => {
  it('confirmed → "Pagamento confirmado"', () => {
    const info = paymentDisplayInfo({ amount: 14900, dueDate: null, checkoutUrl: null }, 'confirmed')
    expect(info.statusLabel).toBe('Pagamento confirmado')
  })

  it('pending → "Aguardando pagamento"', () => {
    const info = paymentDisplayInfo({ amount: 14900, dueDate: null, checkoutUrl: null }, 'pending')
    expect(info.statusLabel).toBe('Aguardando pagamento')
  })

  it('overdue → "Pagamento vencido"', () => {
    const info = paymentDisplayInfo({ amount: 14900, dueDate: null, checkoutUrl: null }, 'overdue')
    expect(info.statusLabel).toBe('Pagamento vencido')
  })

  it('refunded → "Pagamento estornado"', () => {
    const info = paymentDisplayInfo({ amount: 14900, dueDate: null, checkoutUrl: null }, 'refunded')
    expect(info.statusLabel).toBe('Pagamento estornado')
  })

  it('disputed → "Pagamento em análise"', () => {
    const info = paymentDisplayInfo({ amount: 14900, dueDate: null, checkoutUrl: null }, 'disputed')
    expect(info.statusLabel).toBe('Pagamento em análise')
  })

  it('pagamento ausente (null) → estado recuperável, sem valor/vencimento/botão', () => {
    const info = paymentDisplayInfo(null, null)
    expect(info.statusLabel).toBe('Cobrança ainda não disponível')
    expect(info.amountLabel).toBeNull()
    expect(info.dueDateLabel).toBeNull()
    expect(info.validUrl).toBeUndefined()
  })

  it('mensalidade ainda não sincronizada (not_ready) → mesmo estado recuperável', () => {
    const info = paymentDisplayInfo(null, 'not_ready')
    expect(info.statusLabel).toBe('Cobrança ainda não disponível')
  })

  it('URL Asaas válida (https + host oficial) gera validUrl', () => {
    const info = paymentDisplayInfo({ amount: 14900, dueDate: null, checkoutUrl: 'https://www.asaas.com/i/abc' }, 'pending')
    expect(info.validUrl).toBe('https://www.asaas.com/i/abc')
  })

  it('URL inválida/maliciosa nunca gera validUrl', () => {
    const info = paymentDisplayInfo({ amount: 14900, dueDate: null, checkoutUrl: 'https://evil.example.com/i/abc' }, 'pending')
    expect(info.validUrl).toBeUndefined()
  })

  it('checkoutUrl ausente (null) → validUrl undefined, sem lançar', () => {
    const info = paymentDisplayInfo({ amount: 14900, dueDate: null, checkoutUrl: null }, 'pending')
    expect(info.validUrl).toBeUndefined()
  })

  it('amount e dueDate formatados quando presentes', () => {
    const info = paymentDisplayInfo({ amount: 14900, dueDate: new Date('2026-07-27'), checkoutUrl: null }, 'pending')
    expect(info.amountLabel).toContain('149,00')
    expect(info.dueDateLabel).toBeTruthy()
  })
})
