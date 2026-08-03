import { describe, it, expect } from 'vitest'
import {
  canPayNow,
  shouldShowPaymentButton,
  getPaymentStepLabel,
  getIntermediateStatusMessage,
  createSingleShotGuard,
} from './paymentCta'

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

describe('getPaymentStepLabel', () => {
  it('outro pagamento confirmado → "Pagamento restante"', () => {
    expect(getPaymentStepLabel('confirmed')).toBe('Pagamento restante')
  })
  it('outro pagamento pending → "Pagamento 1 de 2"', () => {
    expect(getPaymentStepLabel('pending')).toBe('Pagamento 1 de 2')
  })
  it('outro pagamento overdue/refunded/disputed → "Pagamento 1 de 2" (nenhum dos dois concluído)', () => {
    expect(getPaymentStepLabel('overdue')).toBe('Pagamento 1 de 2')
    expect(getPaymentStepLabel('refunded')).toBe('Pagamento 1 de 2')
    expect(getPaymentStepLabel('disputed')).toBe('Pagamento 1 de 2')
  })
  it('ausente/null → "Pagamento 1 de 2"', () => {
    expect(getPaymentStepLabel(null)).toBe('Pagamento 1 de 2')
    expect(getPaymentStepLabel(undefined)).toBe('Pagamento 1 de 2')
  })
})

describe('getIntermediateStatusMessage', () => {
  it('mensalidade confirmed + implantação pending → orienta concluir a implantação', () => {
    expect(getIntermediateStatusMessage('pending', 'confirmed')).toBe(
      'Sua mensalidade foi confirmada. Falta concluir a implantação para liberar o onboarding.'
    )
  })

  it('implantação confirmed + mensalidade pending → orienta concluir a mensalidade', () => {
    expect(getIntermediateStatusMessage('confirmed', 'pending')).toBe(
      'Sua implantação foi confirmada. Falta concluir a mensalidade para liberar o onboarding.'
    )
  })

  it('ambas pending → null (nada intermediário a comunicar, banners normais já cobrem)', () => {
    expect(getIntermediateStatusMessage('pending', 'pending')).toBeNull()
  })

  it('ambas confirmed → null (banner de "completed" já cobre)', () => {
    expect(getIntermediateStatusMessage('confirmed', 'confirmed')).toBeNull()
  })

  it('implantação confirmed + mensalidade not_ready (preparing) → null, não duplica o banner de preparing', () => {
    expect(getIntermediateStatusMessage('confirmed', 'not_ready')).toBeNull()
  })

  it('implantação em issue (overdue/refunded/disputed) → null, não duplica o InfoBanner de issue existente', () => {
    expect(getIntermediateStatusMessage('overdue', 'confirmed')).toBeNull()
    expect(getIntermediateStatusMessage('refunded', 'confirmed')).toBeNull()
    expect(getIntermediateStatusMessage('disputed', 'confirmed')).toBeNull()
  })

  it('mensalidade em issue (overdue/refunded/disputed) → null, não duplica o InfoBanner de issue existente', () => {
    expect(getIntermediateStatusMessage('confirmed', 'overdue')).toBeNull()
    expect(getIntermediateStatusMessage('confirmed', 'refunded')).toBeNull()
    expect(getIntermediateStatusMessage('confirmed', 'disputed')).toBeNull()
  })

  it('valores ausentes/nulos → null, nunca lança', () => {
    expect(getIntermediateStatusMessage(null, null)).toBeNull()
    expect(getIntermediateStatusMessage(undefined, undefined)).toBeNull()
  })
})

describe('createSingleShotGuard — proteção contra clique duplo/cliques rápidos', () => {
  it('primeira chamada consome com sucesso', () => {
    const guard = createSingleShotGuard()
    expect(guard.tryConsume()).toBe(true)
  })

  it('duas chamadas rápidas na MESMA instância → só a primeira abre, a segunda é bloqueada', () => {
    const guard = createSingleShotGuard()
    expect(guard.tryConsume()).toBe(true)
    expect(guard.tryConsume()).toBe(false)
  })

  it('chamadas repetidas continuam bloqueadas (não reabre sozinho após o primeiro uso)', () => {
    const guard = createSingleShotGuard()
    expect(guard.tryConsume()).toBe(true)
    expect(guard.tryConsume()).toBe(false)
    expect(guard.tryConsume()).toBe(false)
    expect(guard.tryConsume()).toBe(false)
  })

  it('instâncias independentes nunca interferem entre si — reabertura legítima do modal usa uma instância nova', () => {
    const primeiraAbertura = createSingleShotGuard()
    expect(primeiraAbertura.tryConsume()).toBe(true)

    // Simula o modal fechando e reabrindo para outro pagamento legítimo:
    // uma instância NOVA do guard, independente da anterior já consumida.
    const segundaAbertura = createSingleShotGuard()
    expect(segundaAbertura.tryConsume()).toBe(true)
  })
})
