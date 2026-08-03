import { describe, it, expect } from 'vitest'
import { formatOptionalText, formatPossuiPgr, employeeCountDiverges } from './onboardingDisplay'

describe('formatOptionalText', () => {
  it('retorna o texto quando presente', () => {
    expect(formatOptionalText('Diurno')).toBe('Diurno')
  })

  it('remove espaços nas pontas', () => {
    expect(formatOptionalText('  Diurno  ')).toBe('Diurno')
  })

  it('retorna "Não informado" para undefined', () => {
    expect(formatOptionalText(undefined)).toBe('Não informado')
  })

  it('retorna "Não informado" para null', () => {
    expect(formatOptionalText(null)).toBe('Não informado')
  })

  it('retorna "Não informado" para string vazia', () => {
    expect(formatOptionalText('')).toBe('Não informado')
  })

  it('retorna "Não informado" para string só com espaços', () => {
    expect(formatOptionalText('   ')).toBe('Não informado')
  })

  it('preserva quebras de linha internas de observações', () => {
    const texto = 'Linha 1\nLinha 2'
    expect(formatOptionalText(texto)).toBe(texto)
  })

  it('não interpreta HTML — retorna a tag como texto literal', () => {
    const texto = '<script>alert(1)</script>'
    expect(formatOptionalText(texto)).toBe(texto)
  })
})

describe('formatPossuiPgr', () => {
  it('true → "Sim"', () => {
    expect(formatPossuiPgr(true)).toBe('Sim')
  })

  it('false → "Não"', () => {
    expect(formatPossuiPgr(false)).toBe('Não')
  })

  it('undefined → "Não informado"', () => {
    expect(formatPossuiPgr(undefined)).toBe('Não informado')
  })

  it('null → "Não informado"', () => {
    expect(formatPossuiPgr(null)).toBe('Não informado')
  })
})

describe('employeeCountDiverges', () => {
  it('valores iguais → false (sem aviso)', () => {
    expect(employeeCountDiverges(5, 5)).toBe(false)
  })

  it('valores diferentes → true (mostra aviso)', () => {
    expect(employeeCountDiverges(5, 8)).toBe(true)
  })

  it('zero vs positivo → true', () => {
    expect(employeeCountDiverges(0, 1)).toBe(true)
  })
})
