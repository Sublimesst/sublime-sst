import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { isWorkerReadyForSocExport, formatDateBR, buildSocExportRows, generateSocWorkbookBuffer } from './socExport'
import { SOC_HEADERS, SOC_TITLE, SOC_SHEET_NAME } from './socTemplate'

describe('socTemplate', () => {
  it('tem exatamente 118 colunas', () => {
    expect(SOC_HEADERS.length).toBe(118)
  })
})

describe('isWorkerReadyForSocExport', () => {
  const complete = {
    nome: 'Ana', dataNascimento: new Date('1990-01-01'), sexo: 'F',
    dataAdmissao: new Date('2026-01-01'), cargo: 'Analista', setor: 'Financeiro',
  }

  it('completo → true', () => {
    expect(isWorkerReadyForSocExport(complete)).toBe(true)
  })
  it('sem setor → false', () => {
    expect(isWorkerReadyForSocExport({ ...complete, setor: null })).toBe(false)
  })
  it('sem nome → false', () => {
    expect(isWorkerReadyForSocExport({ ...complete, nome: null })).toBe(false)
  })
  it('sem data de nascimento → false', () => {
    expect(isWorkerReadyForSocExport({ ...complete, dataNascimento: null })).toBe(false)
  })
  it('sexo inválido → false', () => {
    expect(isWorkerReadyForSocExport({ ...complete, sexo: 'X' })).toBe(false)
  })
  it('sem data de admissão → false', () => {
    expect(isWorkerReadyForSocExport({ ...complete, dataAdmissao: null })).toBe(false)
  })
  it('sem cargo → false', () => {
    expect(isWorkerReadyForSocExport({ ...complete, cargo: null })).toBe(false)
  })
})

describe('formatDateBR', () => {
  it('formata DD/MM/AAAA a partir dos componentes UTC', () => {
    expect(formatDateBR(new Date(Date.UTC(1990, 4, 10)))).toBe('10/05/1990')
  })
  it('não desloca o dia em datas no fim/início de ano (fronteira UTC)', () => {
    expect(formatDateBR(new Date(Date.UTC(1990, 11, 31)))).toBe('31/12/1990')
    expect(formatDateBR(new Date(Date.UTC(2026, 0, 1)))).toBe('01/01/2026')
  })
})

describe('buildSocExportRows', () => {
  const worker = {
    nome: 'Ana Teste', dataNascimento: new Date(Date.UTC(1990, 4, 10)), sexo: 'F' as const,
    dataAdmissao: new Date(Date.UTC(2026, 0, 15)), cargo: 'Analista', setor: 'Financeiro',
  }

  it('gera uma linha com 118 colunas', () => {
    const rows = buildSocExportRows('Empresa Teste LTDA', [worker])
    expect(rows[0].length).toBe(118)
  })

  it('preenche só os 8 campos obrigatórios, resto vazio', () => {
    const [row] = buildSocExportRows('Empresa Teste LTDA', [worker])
    expect(row[1]).toBe('Empresa Teste LTDA')
    expect(row[3]).toBe('Financeiro')
    expect(row[5]).toBe('Analista')
    expect(row[8]).toBe('Ana Teste')
    expect(row[9]).toBe('10/05/1990')
    expect(row[10]).toBe('F')
    expect(row[11]).toBe('S')
    expect(row[12]).toBe('15/01/2026')

    const filled = new Set([1, 3, 5, 8, 9, 10, 11, 12])
    row.forEach((cell, i) => { if (!filled.has(i)) expect(cell).toBe('') })
  })

  it('lista vazia → nenhuma linha', () => {
    expect(buildSocExportRows('Empresa Teste LTDA', [])).toEqual([])
  })

  it('ordem de saída é a mesma ordem de entrada (determinística)', () => {
    const rows = buildSocExportRows('Empresa Teste LTDA', [
      { ...worker, nome: 'Primeiro' },
      { ...worker, nome: 'Segundo' },
    ])
    expect(rows[0][8]).toBe('Primeiro')
    expect(rows[1][8]).toBe('Segundo')
  })
})

describe('generateSocWorkbookBuffer', () => {
  const worker = {
    nome: 'Ana Teste', dataNascimento: new Date(Date.UTC(1990, 4, 10)), sexo: 'F' as const,
    dataAdmissao: new Date(Date.UTC(2026, 0, 15)), cargo: 'Analista', setor: 'Financeiro',
  }

  it('gera um .xls BIFF8 real — assinatura OLE2/CFB, não XLSX (ZIP)', () => {
    const buf = generateSocWorkbookBuffer('Empresa Teste LTDA', [worker])
    expect(buf.subarray(0, 8).toString('hex')).toBe('d0cf11e0a1b11ae1')
    expect(buf.subarray(0, 4).toString('hex')).not.toBe('504b0304') // não é ZIP/XLSX
  })

  it('arquivo é reaberto corretamente: aba ModeloI, título, cabeçalho e dado', () => {
    const buf = generateSocWorkbookBuffer('Empresa Teste LTDA', [worker])
    const wb = XLSX.read(buf, { type: 'buffer' })
    expect(wb.SheetNames).toEqual([SOC_SHEET_NAME])
    const rows = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[SOC_SHEET_NAME], { header: 1 })
    expect(rows[0][0]).toBe(SOC_TITLE)
    expect(rows[1]).toEqual([...SOC_HEADERS])
    expect(rows[2][8]).toBe('Ana Teste')
  })

  it('nenhum trabalhador → arquivo só com título e cabeçalho, sem linha de dados', () => {
    const buf = generateSocWorkbookBuffer('Empresa Teste LTDA', [])
    const wb = XLSX.read(buf, { type: 'buffer' })
    const rows = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[SOC_SHEET_NAME], { header: 1 })
    expect(rows.length).toBe(2)
  })
})
