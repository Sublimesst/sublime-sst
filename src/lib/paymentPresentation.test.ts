import { describe, it, expect } from 'vitest'
import {
  safeCheckoutUrl,
  pickImplantacao,
  pickPrimeiraMensalidade,
  deriveFinancialActivationState,
  getPaymentOrderBy,
  type PaymentLike,
} from './paymentPresentation'

function payment(overrides: Partial<PaymentLike> = {}): PaymentLike {
  return {
    id: 'pay_default',
    type: 'implantacao',
    status: 'pending',
    amount: 14900,
    dueDate: new Date('2026-07-30'),
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    checkoutUrl: null,
    ...overrides,
  }
}

describe('deriveFinancialActivationState', () => {
  it('1) implantação pending → não confirmada', () => {
    const state = deriveFinancialActivationState('onboarding_pending', [payment({ status: 'pending' })])
    expect(state.implantacaoConfirmed).toBe(false)
    expect(state.financiallyComplete).toBe(false)
    expect(state.missingPayment).toBe('ambos')
  })

  it('2) implantação confirmed (sem mensalidade ainda) → implantacaoConfirmed true, missingPayment mensalidade', () => {
    const state = deriveFinancialActivationState('onboarding_pending', [payment({ status: 'confirmed' })])
    expect(state.implantacaoConfirmed).toBe(true)
    expect(state.financiallyComplete).toBe(false)
    expect(state.missingPayment).toBe('mensalidade')
  })

  it('3) mensalidade pending (implantação confirmed) → mensalidadeConfirmed false', () => {
    const state = deriveFinancialActivationState('onboarding_pending', [
      payment({ id: 'p1', type: 'implantacao', status: 'confirmed' }),
      payment({ id: 'p2', type: 'mensalidade', status: 'pending', dueDate: new Date('2026-07-27') }),
    ])
    expect(state.mensalidadeConfirmed).toBe(false)
    expect(state.financiallyComplete).toBe(false)
    expect(state.missingPayment).toBe('mensalidade')
  })

  it('4) mensalidade confirmed (implantação confirmed) → financiallyComplete true', () => {
    const state = deriveFinancialActivationState('onboarding_pending', [
      payment({ id: 'p1', type: 'implantacao', status: 'confirmed' }),
      payment({ id: 'p2', type: 'mensalidade', status: 'confirmed', dueDate: new Date('2026-07-27') }),
    ])
    expect(state.financiallyComplete).toBe(true)
    expect(state.missingPayment).toBe('nenhum')
  })

  it('5) ambos confirmed → financiallyComplete true, presentationState completed', () => {
    const state = deriveFinancialActivationState('onboarding_pending', [
      payment({ id: 'p1', type: 'implantacao', status: 'confirmed' }),
      payment({ id: 'p2', type: 'mensalidade', status: 'confirmed', dueDate: new Date('2026-07-27') }),
    ])
    expect(state.financiallyComplete).toBe(true)
    expect(state.presentationState.step).toBe('completed')
  })

  it('6) mensalidade ausente → not_ready, missingPayment mensalidade quando implantação confirmed', () => {
    const state = deriveFinancialActivationState('onboarding_pending', [payment({ type: 'implantacao', status: 'confirmed' })])
    expect(state.mensalidadeStatus).toBe('not_ready')
    expect(state.primeiraMensalidade).toBeNull()
    expect(state.missingPayment).toBe('mensalidade')
  })

  it('7) implantação ausente → implantacaoStatus null, missingPayment ambos', () => {
    const state = deriveFinancialActivationState('onboarding_pending', [])
    expect(state.implantacao).toBeNull()
    expect(state.implantacaoStatus).toBeNull()
    expect(state.missingPayment).toBe('ambos')
  })

  it('10) refunded não conta como confirmado', () => {
    const state = deriveFinancialActivationState('onboarding_pending', [payment({ status: 'refunded' })])
    expect(state.implantacaoConfirmed).toBe(false)
  })

  it('11) disputed não conta como confirmado', () => {
    const state = deriveFinancialActivationState('onboarding_pending', [payment({ status: 'disputed' })])
    expect(state.implantacaoConfirmed).toBe(false)
  })

  it('12) overdue não conta como confirmado', () => {
    const state = deriveFinancialActivationState('onboarding_pending', [payment({ status: 'overdue' })])
    expect(state.implantacaoConfirmed).toBe(false)
  })

  it('Company cancelled propaga para presentationState', () => {
    const state = deriveFinancialActivationState('cancelled', [payment({ status: 'confirmed' })])
    expect(state.presentationState.step).toBe('cancelled')
  })
})

describe('pickImplantacao — determinismo independente da ordem de entrada', () => {
  const antiga = payment({ id: 'impl_antiga', status: 'refunded', createdAt: new Date('2026-01-01T00:00:00.000Z') })
  const nova = payment({ id: 'impl_nova', status: 'confirmed', createdAt: new Date('2026-02-01T00:00:00.000Z') })

  it('array normal e invertido escolhem a mesma cobrança (a mais antiga)', () => {
    expect(pickImplantacao([antiga, nova])?.id).toBe('impl_antiga')
    expect(pickImplantacao([nova, antiga])?.id).toBe('impl_antiga')
  })

  it('limitação conhecida e documentada: reembolsada mais antiga ainda vence a confirmed mais nova (regra de recontratação fica para etapa futura)', () => {
    expect(pickImplantacao([antiga, nova])?.status).toBe('refunded')
  })

  it('duas implantações com mesmo createdAt usam id como desempate (lexical estável), em qualquer ordem', () => {
    const a = payment({ id: 'impl_a', createdAt: new Date('2026-03-01T00:00:00.000Z') })
    const b = payment({ id: 'impl_b', createdAt: new Date('2026-03-01T00:00:00.000Z') })
    expect(pickImplantacao([a, b])?.id).toBe('impl_a')
    expect(pickImplantacao([b, a])?.id).toBe('impl_a')
  })

  it('não muta o array original recebido', () => {
    const payments = [nova, antiga]
    const copy = [...payments]
    pickImplantacao(payments)
    expect(payments).toEqual(copy)
  })

  it('nenhum registro do tipo → null', () => {
    expect(pickImplantacao([])).toBeNull()
  })
})

describe('pickPrimeiraMensalidade — determinismo independente da ordem de entrada', () => {
  const primeira = payment({ id: 'mens_1', type: 'mensalidade', status: 'confirmed', dueDate: new Date('2026-07-27'), createdAt: new Date('2026-06-01T00:00:00.000Z') })
  const futura = payment({ id: 'mens_2', type: 'mensalidade', status: 'pending', dueDate: new Date('2026-08-27'), createdAt: new Date('2026-07-01T00:00:00.000Z') })

  it('escolhida corretamente com array embaralhado (ordem invertida)', () => {
    expect(pickPrimeiraMensalidade([primeira, futura])?.id).toBe('mens_1')
    expect(pickPrimeiraMensalidade([futura, primeira])?.id).toBe('mens_1')
  })

  it('mensalidade futura antes da primeira no array não altera o resultado', () => {
    expect(pickPrimeiraMensalidade([futura, primeira])?.status).toBe('confirmed')
    expect(pickPrimeiraMensalidade([futura, primeira])?.dueDate).toEqual(new Date('2026-07-27'))
  })

  it('dueDate null antes de dueDate válida não vence, em qualquer ordem', () => {
    const semData = payment({ id: 'mens_null', type: 'mensalidade', dueDate: null, createdAt: new Date('2026-01-01T00:00:00.000Z') })
    const comData = payment({ id: 'mens_com_data', type: 'mensalidade', dueDate: new Date('2026-07-27'), createdAt: new Date('2026-06-01T00:00:00.000Z') })
    expect(pickPrimeiraMensalidade([semData, comData])?.id).toBe('mens_com_data')
    expect(pickPrimeiraMensalidade([comData, semData])?.id).toBe('mens_com_data')
  })

  it('dueDate inválida (Invalid Date) antes de válida não vence', () => {
    const invalida = payment({ id: 'mens_invalida', type: 'mensalidade', dueDate: new Date('data-invalida'), createdAt: new Date('2026-01-01T00:00:00.000Z') })
    const valida = payment({ id: 'mens_valida', type: 'mensalidade', dueDate: new Date('2026-07-27'), createdAt: new Date('2026-06-01T00:00:00.000Z') })
    expect(pickPrimeiraMensalidade([invalida, valida])?.id).toBe('mens_valida')
    expect(pickPrimeiraMensalidade([valida, invalida])?.id).toBe('mens_valida')
  })

  it('empate de dueDate usa createdAt e, se necessário, id — em qualquer ordem', () => {
    const maisAntiga = payment({ id: 'mens_a', type: 'mensalidade', dueDate: new Date('2026-07-27'), createdAt: new Date('2026-06-01T00:00:00.000Z') })
    const maisNova = payment({ id: 'mens_b', type: 'mensalidade', dueDate: new Date('2026-07-27'), createdAt: new Date('2026-06-02T00:00:00.000Z') })
    expect(pickPrimeiraMensalidade([maisAntiga, maisNova])?.id).toBe('mens_a')
    expect(pickPrimeiraMensalidade([maisNova, maisAntiga])?.id).toBe('mens_a')
  })

  it('não muta o array original recebido', () => {
    const payments = [futura, primeira]
    const copy = [...payments]
    pickPrimeiraMensalidade(payments)
    expect(payments).toEqual(copy)
  })

  it('nenhum registro do tipo → null', () => {
    expect(pickPrimeiraMensalidade([])).toBeNull()
  })
})

describe('getPaymentOrderBy', () => {
  it('duas chamadas retornam estruturas com o mesmo conteúdo mas referências independentes', () => {
    const a = getPaymentOrderBy()
    const b = getPaymentOrderBy()
    expect(a).toEqual(b)
    expect(a).not.toBe(b)
  })

  it('mutar o resultado de uma chamada não afeta a próxima', () => {
    const a = getPaymentOrderBy()
    a.push({ amount: 'desc' } as any)
    const b = getPaymentOrderBy()
    expect(b.length).toBe(3)
  })
})

describe('safeCheckoutUrl', () => {
  it('13) URL Asaas válida (https + host oficial) é aceita', () => {
    expect(safeCheckoutUrl('https://www.asaas.com/i/abc123')).toBe('https://www.asaas.com/i/abc123')
  })

  it('14) domínio semelhante (asaas.com.exemplo.com) é rejeitado', () => {
    expect(safeCheckoutUrl('https://asaas.com.exemplo.com/i/abc')).toBeUndefined()
  })

  it('15) URL com userinfo (usuário/senha) é rejeitada', () => {
    expect(safeCheckoutUrl('https://user:pass@www.asaas.com/i/abc')).toBeUndefined()
  })

  it('16) URL com porta inesperada é rejeitada', () => {
    expect(safeCheckoutUrl('https://www.asaas.com:9999/i/abc')).toBeUndefined()
  })

  it('http:// (não https) é rejeitada', () => {
    expect(safeCheckoutUrl('http://www.asaas.com/i/abc')).toBeUndefined()
  })

  it('URL inválida (não parseável) vira undefined, nunca lança', () => {
    expect(safeCheckoutUrl('not-a-url')).toBeUndefined()
  })

  it('ausente/nulo → undefined', () => {
    expect(safeCheckoutUrl(null)).toBeUndefined()
    expect(safeCheckoutUrl(undefined)).toBeUndefined()
  })

  it('19) módulo não importa nada de @/lib/asaas — nunca pode chamar a Asaas', async () => {
    const mod = await import('./paymentPresentation')
    expect(Object.keys(mod).sort()).toEqual([
      'ALLOWED_ASAAS_HOSTS', 'PAYMENT_SELECT', 'deriveFinancialActivationState',
      'getPaymentOrderBy', 'pickImplantacao', 'pickPrimeiraMensalidade', 'safeCheckoutUrl',
    ].sort())
  })
})
