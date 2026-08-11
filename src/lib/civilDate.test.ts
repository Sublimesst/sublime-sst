import { describe, it, expect } from 'vitest'
import { parseCivilDate, formatCivilDate } from './civilDate'

describe('parseCivilDate', () => {
  it('converte "YYYY-MM-DD" numa data à meia-noite UTC do mesmo dia', () => {
    const date = parseCivilDate('1990-03-15')
    expect(date).not.toBeNull()
    expect(date!.getUTCFullYear()).toBe(1990)
    expect(date!.getUTCMonth()).toBe(2) // 0-indexed
    expect(date!.getUTCDate()).toBe(15)
    expect(date!.getUTCHours()).toBe(0)
  })

  it('rejeita formato inválido', () => {
    expect(parseCivilDate('15/03/1990')).toBeNull()
    expect(parseCivilDate('1990-3-15')).toBeNull()
    expect(parseCivilDate('não é uma data')).toBeNull()
    expect(parseCivilDate('')).toBeNull()
  })

  it('rejeita data civil inexistente (não "rola" para o mês seguinte)', () => {
    expect(parseCivilDate('2024-02-30')).toBeNull()
    expect(parseCivilDate('2023-02-29')).toBeNull() // 2023 não é bissexto
    expect(parseCivilDate('2024-13-01')).toBeNull()
    expect(parseCivilDate('2024-00-01')).toBeNull()
  })

  it('aceita 29 de fevereiro em ano bissexto', () => {
    expect(parseCivilDate('2024-02-29')).not.toBeNull()
  })

  it('nunca desloca o dia por causa de timezone — mesmo dia entra e sai', () => {
    // Regressão do bug clássico: usar Date local em vez de UTC faria o dia
    // "voltar" em timezones negativos (ex.: America/Sao_Paulo, UTC-3).
    const date = parseCivilDate('2026-01-01')!
    expect(formatCivilDate(date)).toBe('2026-01-01')
  })
})

describe('formatCivilDate', () => {
  it('formata de volta para "YYYY-MM-DD" usando componentes UTC', () => {
    const date = new Date(Date.UTC(2026, 7, 9)) // 9 de agosto de 2026
    expect(formatCivilDate(date)).toBe('2026-08-09')
  })

  it('preserva zero à esquerda em mês e dia', () => {
    const date = new Date(Date.UTC(2026, 0, 5))
    expect(formatCivilDate(date)).toBe('2026-01-05')
  })

  it('parse → format é uma função identidade para datas civis válidas', () => {
    for (const value of ['2000-01-01', '1985-12-31', '2026-08-09', '2024-02-29']) {
      expect(formatCivilDate(parseCivilDate(value)!)).toBe(value)
    }
  })
})
