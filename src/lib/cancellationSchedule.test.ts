import { describe, it, expect } from 'vitest'
import {
  addCalendarMonthsUtc,
  addCalendarDaysUtc,
  initialTermEnd,
  isWithinInitialTerm,
  computeCancellationEffectiveDate,
  INITIAL_TERM_MONTHS,
  POST_RENEWAL_NOTICE_DAYS,
} from './cancellationSchedule'

function utc(y: number, m: number, d: number, h = 0, min = 0, s = 0, ms = 0): Date {
  return new Date(Date.UTC(y, m - 1, d, h, min, s, ms))
}

describe('addCalendarMonthsUtc', () => {
  it('soma meses simples preservando dia/hora', () => {
    expect(addCalendarMonthsUtc(utc(2026, 1, 15, 10, 30), 1)).toEqual(utc(2026, 2, 15, 10, 30))
  })

  it('12 meses a partir de 31/01 termina em 31/01 do ano seguinte (mês de destino tem 31 dias)', () => {
    expect(addCalendarMonthsUtc(utc(2026, 1, 31), 12)).toEqual(utc(2027, 1, 31))
  })

  it('31/01 + 1 mês cai em fevereiro sem dia 31 → clamp para o último dia de fevereiro (não bissexto)', () => {
    expect(addCalendarMonthsUtc(utc(2026, 1, 31), 1)).toEqual(utc(2026, 2, 28))
  })

  it('31/01 + 1 mês em ano bissexto → clamp para 29/02', () => {
    expect(addCalendarMonthsUtc(utc(2028, 1, 31), 1)).toEqual(utc(2028, 2, 29))
  })

  it('29/02 (bissexto) + 12 meses → clamp para 28/02 do ano seguinte (não bissexto)', () => {
    expect(addCalendarMonthsUtc(utc(2028, 2, 29), 12)).toEqual(utc(2029, 2, 28))
  })

  it('30/01 + 1 mês → clamp para 28/02 (não bissexto)', () => {
    expect(addCalendarMonthsUtc(utc(2026, 1, 30), 1)).toEqual(utc(2026, 2, 28))
  })

  it('30/01 + 1 mês em ano bissexto → clamp para 29/02', () => {
    expect(addCalendarMonthsUtc(utc(2028, 1, 30), 1)).toEqual(utc(2028, 2, 29))
  })

  it('atravessa a virada de ano', () => {
    expect(addCalendarMonthsUtc(utc(2026, 11, 15), 2)).toEqual(utc(2027, 1, 15))
  })

  it('12 meses a partir de dezembro atravessa 1 ano inteiro', () => {
    expect(addCalendarMonthsUtc(utc(2026, 12, 5), 12)).toEqual(utc(2027, 12, 5))
  })

  it('horário próximo da meia-noite é preservado exatamente', () => {
    expect(addCalendarMonthsUtc(utc(2026, 1, 15, 23, 59, 59, 999), 1)).toEqual(utc(2026, 2, 15, 23, 59, 59, 999))
  })
})

describe('addCalendarDaysUtc', () => {
  it('soma dias simples', () => {
    expect(addCalendarDaysUtc(utc(2026, 1, 1), 10)).toEqual(utc(2026, 1, 11))
  })

  it('atravessa a virada de mês', () => {
    expect(addCalendarDaysUtc(utc(2026, 1, 25), 10)).toEqual(utc(2026, 2, 4))
  })

  it('atravessa a virada de ano', () => {
    expect(addCalendarDaysUtc(utc(2026, 12, 20), 90)).toEqual(utc(2027, 3, 20))
  })

  it('90 dias a partir de 1º de dezembro atravessa fevereiro não bissexto corretamente', () => {
    expect(addCalendarDaysUtc(utc(2026, 12, 1), 90)).toEqual(utc(2027, 3, 1))
  })

  it('90 dias atravessando fevereiro bissexto', () => {
    // dez/2027 (31d) + jan/2028 (31d) = 62 dias já elapsados em 1º/jan+31 →
    // restam 28 dias dentro de fevereiro/2028 (bissexto, 29 dias): dia 29.
    expect(addCalendarDaysUtc(utc(2027, 12, 1), 90)).toEqual(utc(2028, 2, 29))
  })
})

describe('initialTermEnd / isWithinInitialTerm', () => {
  const activatedAt = utc(2026, 3, 10, 12, 0, 0)
  const end = initialTermEnd(activatedAt)

  it('fim da vigência inicial é ativação + 12 meses exatos', () => {
    expect(end).toEqual(utc(2027, 3, 10, 12, 0, 0))
  })

  it('logo após a ativação está dentro da vigência inicial', () => {
    expect(isWithinInitialTerm(activatedAt, addCalendarDaysUtc(activatedAt, 1))).toBe(true)
  })

  it('o próprio instante da ativação está dentro da vigência inicial', () => {
    expect(isWithinInitialTerm(activatedAt, activatedAt)).toBe(true)
  })

  it('um milissegundo antes do fim ainda está dentro da vigência inicial', () => {
    expect(isWithinInitialTerm(activatedAt, new Date(end.getTime() - 1))).toBe(true)
  })

  it('exatamente no instante de fim NÃO está mais dentro da vigência inicial (intervalo semiaberto)', () => {
    expect(isWithinInitialTerm(activatedAt, end)).toBe(false)
  })

  it('um milissegundo depois do fim está fora da vigência inicial', () => {
    expect(isWithinInitialTerm(activatedAt, new Date(end.getTime() + 1))).toBe(false)
  })
})

describe('computeCancellationEffectiveDate — vigência inicial', () => {
  const activatedAt = utc(2026, 1, 15, 9, 0, 0)
  const initialEnd = utc(2027, 1, 15, 9, 0, 0)

  it('pedido logo após a ativação encerra ao final dos 12 meses', () => {
    const r = computeCancellationEffectiveDate(activatedAt, addCalendarDaysUtc(activatedAt, 1))
    expect(r.phase).toBe('initial_term')
    expect(r.effectiveAt).toEqual(initialEnd)
  })

  it('pedido no início do período encerra ao final dos 12 meses', () => {
    const r = computeCancellationEffectiveDate(activatedAt, activatedAt)
    expect(r.phase).toBe('initial_term')
    expect(r.effectiveAt).toEqual(initialEnd)
  })

  it('pedido no meio do período encerra ao final dos 12 meses', () => {
    const r = computeCancellationEffectiveDate(activatedAt, addCalendarMonthsUtc(activatedAt, 6))
    expect(r.phase).toBe('initial_term')
    expect(r.effectiveAt).toEqual(initialEnd)
  })

  it('pedido antes dos últimos 90 dias encerra ao final dos 12 meses', () => {
    const beforeLast90 = new Date(initialEnd.getTime() - 91 * 24 * 60 * 60 * 1000)
    const r = computeCancellationEffectiveDate(activatedAt, beforeLast90)
    expect(r.phase).toBe('initial_term')
    expect(r.effectiveAt).toEqual(initialEnd)
  })

  it('pedido exatamente no início dos últimos 90 dias encerra ao final dos 12 meses (sem antecipar nem postergar)', () => {
    const startOfLast90 = new Date(initialEnd.getTime() - POST_RENEWAL_NOTICE_DAYS * 24 * 60 * 60 * 1000)
    const r = computeCancellationEffectiveDate(activatedAt, startOfLast90)
    expect(r.phase).toBe('initial_term')
    expect(r.effectiveAt).toEqual(initialEnd)
  })

  it('pedido dentro dos últimos 90 dias encerra ao final dos 12 meses, sem somar 90 dias adicionais', () => {
    const withinLast90 = new Date(initialEnd.getTime() - 30 * 24 * 60 * 60 * 1000)
    const r = computeCancellationEffectiveDate(activatedAt, withinLast90)
    expect(r.phase).toBe('initial_term')
    expect(r.effectiveAt).toEqual(initialEnd)
    // Mutação a detectar: se o código errado somasse +90 dias aqui, o
    // resultado divergiria do fim exato da vigência inicial.
    expect(r.effectiveAt.getTime()).not.toBe(withinLast90.getTime() + POST_RENEWAL_NOTICE_DAYS * 24 * 60 * 60 * 1000)
  })

  it('pedido próximo ao final do 12º mês (1 dia antes) encerra ao final dos 12 meses', () => {
    const r = computeCancellationEffectiveDate(activatedAt, new Date(initialEnd.getTime() - 24 * 60 * 60 * 1000))
    expect(r.phase).toBe('initial_term')
    expect(r.effectiveAt).toEqual(initialEnd)
  })

  it('pedido no último instante aplicável (1ms antes do fim) encerra ao final dos 12 meses', () => {
    const r = computeCancellationEffectiveDate(activatedAt, new Date(initialEnd.getTime() - 1))
    expect(r.phase).toBe('initial_term')
    expect(r.effectiveAt).toEqual(initialEnd)
  })

  it('todos os pedidos dentro da vigência inicial encerram na MESMA data final, independente do momento do pedido', () => {
    const moments = [
      activatedAt,
      addCalendarDaysUtc(activatedAt, 1),
      addCalendarMonthsUtc(activatedAt, 3),
      addCalendarMonthsUtc(activatedAt, 6),
      addCalendarMonthsUtc(activatedAt, 9),
      new Date(initialEnd.getTime() - POST_RENEWAL_NOTICE_DAYS * 24 * 60 * 60 * 1000),
      new Date(initialEnd.getTime() - 1),
    ]
    const results = moments.map(m => computeCancellationEffectiveDate(activatedAt, m).effectiveAt.getTime())
    const unique = new Set(results)
    expect(unique.size).toBe(1)
    expect(results[0]).toBe(initialEnd.getTime())
  })
})

describe('computeCancellationEffectiveDate — pós-renovação (aviso de 90 dias)', () => {
  const activatedAt = utc(2026, 1, 15, 9, 0, 0)
  const initialEnd = utc(2027, 1, 15, 9, 0, 0)

  it('pedido exatamente no instante de renovação (fronteira) segue a regra de 90 dias, não a de vigência inicial', () => {
    const r = computeCancellationEffectiveDate(activatedAt, initialEnd)
    expect(r.phase).toBe('post_renewal')
    expect(r.effectiveAt).toEqual(addCalendarDaysUtc(initialEnd, POST_RENEWAL_NOTICE_DAYS))
  })

  it('pedido imediatamente após a renovação soma 90 dias corridos a partir do próprio pedido', () => {
    const requestedAt = addCalendarDaysUtc(initialEnd, 1)
    const r = computeCancellationEffectiveDate(activatedAt, requestedAt)
    expect(r.phase).toBe('post_renewal')
    expect(r.effectiveAt).toEqual(addCalendarDaysUtc(requestedAt, POST_RENEWAL_NOTICE_DAYS))
  })

  it('pedido em momento bem posterior à renovação também soma 90 dias a partir do próprio pedido (não da renovação)', () => {
    const requestedAt = addCalendarMonthsUtc(initialEnd, 8)
    const r = computeCancellationEffectiveDate(activatedAt, requestedAt)
    expect(r.phase).toBe('post_renewal')
    expect(r.effectiveAt).toEqual(addCalendarDaysUtc(requestedAt, 90))
  })

  it('não há multa/período de fidelidade novo embutido — effectiveAt é só requestedAt + 90 dias, sem mês adicional', () => {
    const requestedAt = addCalendarDaysUtc(initialEnd, 200)
    const r = computeCancellationEffectiveDate(activatedAt, requestedAt)
    expect(r.effectiveAt.getTime() - requestedAt.getTime()).toBe(POST_RENEWAL_NOTICE_DAYS * 24 * 60 * 60 * 1000)
  })
})

describe('computeCancellationEffectiveDate — testes de calendário (28/29/30/31 dias, bissexto, virada de ano)', () => {
  it('ativação em 28/02 (ano não bissexto) — 12 meses depois cai em 28/02 do ano seguinte', () => {
    const activatedAt = utc(2026, 2, 28)
    expect(initialTermEnd(activatedAt)).toEqual(utc(2027, 2, 28))
  })

  it('ativação em 29/02 (ano bissexto) — 12 meses depois cai em 28/02 do ano seguinte (não bissexto, clamp)', () => {
    const activatedAt = utc(2028, 2, 29)
    expect(initialTermEnd(activatedAt)).toEqual(utc(2029, 2, 28))
  })

  it('ativação em 29/02 — 48 meses depois (novo ano bissexto) cai exatamente em 29/02', () => {
    const activatedAt = utc(2028, 2, 29)
    expect(addCalendarMonthsUtc(activatedAt, 48)).toEqual(utc(2032, 2, 29))
  })

  it('ativação em 30/01 — 12 meses depois cai em 30/01 do ano seguinte (mês de destino tem 31 dias)', () => {
    const activatedAt = utc(2026, 1, 30)
    expect(initialTermEnd(activatedAt)).toEqual(utc(2027, 1, 30))
  })

  it('ativação em 31/01 — 12 meses depois cai em 31/01 do ano seguinte', () => {
    const activatedAt = utc(2026, 1, 31)
    expect(initialTermEnd(activatedAt)).toEqual(utc(2027, 1, 31))
  })

  it('ativação em 31/12 — vigência inicial termina em 31/12 do ano seguinte (virada de ano dupla)', () => {
    const activatedAt = utc(2026, 12, 31)
    expect(initialTermEnd(activatedAt)).toEqual(utc(2027, 12, 31))
  })

  it('ativação às 23:59:59.999 (próximo da meia-noite) preserva o horário exato no fim da vigência', () => {
    const activatedAt = utc(2026, 6, 10, 23, 59, 59, 999)
    expect(initialTermEnd(activatedAt)).toEqual(utc(2027, 6, 10, 23, 59, 59, 999))
  })

  it('30 dias de fevereiro bissexto (29 dias) não afeta a soma de 90 dias corridos (aritmética em ms, não em "meses de 30 dias")', () => {
    // 2028 é bissexto — fevereiro tem 29 dias. addCalendarDaysUtc soma dias
    // reais do calendário, não uma aproximação de 30 dias/mês.
    const start = utc(2028, 1, 1)
    const result = addCalendarDaysUtc(start, POST_RENEWAL_NOTICE_DAYS)
    // 31 (jan) + 29 (fev bissexto) + 30 (mar) = 90 dias exatos → 31/03
    expect(result).toEqual(utc(2028, 3, 31))
  })
})

describe('constantes', () => {
  it('vigência inicial é 12 meses e aviso pós-renovação é 90 dias (nunca alterar por conveniência de teste)', () => {
    expect(INITIAL_TERM_MONTHS).toBe(12)
    expect(POST_RENEWAL_NOTICE_DAYS).toBe(90)
  })
})
