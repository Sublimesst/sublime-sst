import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { NextRequest } from 'next/server'
import * as XLSX from 'xlsx'
import { SOC_HEADERS, SOC_TITLE, SOC_SHEET_NAME } from '@/lib/socExport/socTemplate'

vi.mock('@/lib/adminAuth', () => ({
  verifyAdminSecret: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    company: { findUnique: vi.fn() },
  },
}))

let GET: typeof import('./route').GET
let verifyAdminSecret: typeof import('@/lib/adminAuth').verifyAdminSecret
let prisma: typeof import('@/lib/prisma').prisma

beforeAll(async () => {
  ;({ GET } = await import('./route'))
  ;({ verifyAdminSecret } = await import('@/lib/adminAuth'))
  ;({ prisma } = await import('@/lib/prisma'))
})

const PARAMS = { params: { id: 'company_1' } }

function worker(overrides: Partial<{
  id: string; nome: string | null; dataNascimento: Date | null; sexo: string | null
  dataAdmissao: Date | null; cargo: string | null; setor: string | null
}> = {}) {
  return {
    id: 'w1', nome: 'Ana Teste', dataNascimento: new Date('1990-05-10'), sexo: 'F',
    dataAdmissao: new Date('2026-01-15'), cargo: 'Analista', setor: 'Financeiro',
    ...overrides,
  }
}

const COMPANY_FIXTURE = {
  id: 'company_1',
  cnpj: '12.345.678/0001-90',
  razaoSocial: 'Empresa Teste LTDA',
  workers: [worker()],
}

function exportRequest(secret = 'correct-secret') {
  return new NextRequest('https://www.sublimesst.com/api/admin/empresas/company_1/export/soc', {
    headers: secret ? { 'x-admin-secret': secret } : {},
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(verifyAdminSecret).mockReturnValue(true)
  vi.mocked(prisma.company.findUnique).mockResolvedValue(COMPANY_FIXTURE as any)
})

describe('GET /api/admin/empresas/[id]/export/soc', () => {
  it('sem admin secret → 401, sem consultar Prisma', async () => {
    vi.mocked(verifyAdminSecret).mockReturnValue(false)
    const res = await GET(exportRequest('wrong'), PARAMS)
    expect(res.status).toBe(401)
    expect(prisma.company.findUnique).not.toHaveBeenCalled()
  })

  it('secret ausente → 401', async () => {
    vi.mocked(verifyAdminSecret).mockReturnValue(false)
    const res = await GET(exportRequest(''), PARAMS)
    expect(res.status).toBe(401)
  })

  it('empresa inexistente → 404', async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue(null)
    const res = await GET(exportRequest(), PARAMS)
    expect(res.status).toBe(404)
  })

  it('busca Workers só pelo relacionamento da Company do id da rota (isolamento por Company)', async () => {
    await GET(exportRequest(), { params: { id: 'company_2' } })
    expect(prisma.company.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'company_2' } })
    )
  })

  it('zero Workers → 422 soc_export_no_workers, nenhum arquivo gerado', async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue({ ...COMPANY_FIXTURE, workers: [] } as any)
    const res = await GET(exportRequest(), PARAMS)
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.code).toBe('soc_export_no_workers')
    expect(res.headers.get('Content-Type')).not.toContain('vnd.ms-excel')
  })

  it('Worker sem setor → 422 soc_export_workers_incomplete, sem expor id nem nome', async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue({
      ...COMPANY_FIXTURE, workers: [worker({ id: 'w1', setor: null })],
    } as any)
    const res = await GET(exportRequest(), PARAMS)
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.code).toBe('soc_export_workers_incomplete')
    expect(body.data.incompleteCount).toBe(1)
    const bodyDump = JSON.stringify(body)
    expect(bodyDump).not.toContain('w1')
    expect(bodyDump).not.toContain('Ana Teste')
  })

  it('um Worker sem setor bloqueia a exportação da Company inteira, mesmo com outros Workers completos', async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue({
      ...COMPANY_FIXTURE,
      workers: [worker({ id: 'w1' }), worker({ id: 'w2', setor: null })],
    } as any)
    const res = await GET(exportRequest(), PARAMS)
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.code).toBe('soc_export_workers_incomplete')
  })

  it('1 Worker completo → 200, arquivo .xls BIFF8 real (assinatura OLE2/CFB)', async () => {
    const res = await GET(exportRequest(), PARAMS)
    expect(res.status).toBe(200)
    const buf = Buffer.from(await res.arrayBuffer())
    expect(buf.subarray(0, 8).toString('hex')).toBe('d0cf11e0a1b11ae1')
  })

  it('cabeçalhos: Content-Type xls, Content-Disposition attachment com nome baseado no CNPJ, anti-cache', async () => {
    const res = await GET(exportRequest(), PARAMS)
    expect(res.headers.get('Content-Type')).toBe('application/vnd.ms-excel')
    expect(res.headers.get('Content-Disposition')).toContain('attachment')
    expect(res.headers.get('Content-Disposition')).toContain('SOC-12345678000190.xls')
    expect(res.headers.get('Cache-Control')).toBe('private, no-store, max-age=0')
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
  })

  it('arquivo gerado tem os 118 cabeçalhos exatos, na ordem, na aba ModeloI', async () => {
    const res = await GET(exportRequest(), PARAMS)
    const buf = Buffer.from(await res.arrayBuffer())
    const wb = XLSX.read(buf, { type: 'buffer' })
    expect(wb.SheetNames).toEqual([SOC_SHEET_NAME])
    const rows = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[SOC_SHEET_NAME], { header: 1 })
    expect(rows[0][0]).toBe(SOC_TITLE)
    expect(rows[1]).toEqual([...SOC_HEADERS])
  })

  it('múltiplos Workers → uma linha por Worker, na ordem recebida (createdAt asc já garantido pela query)', async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue({
      ...COMPANY_FIXTURE,
      workers: [
        worker({ id: 'w1', nome: 'Primeiro' }),
        worker({ id: 'w2', nome: 'Segundo' }),
        worker({ id: 'w3', nome: 'Terceiro' }),
      ],
    } as any)
    const res = await GET(exportRequest(), PARAMS)
    const buf = Buffer.from(await res.arrayBuffer())
    const wb = XLSX.read(buf, { type: 'buffer' })
    const rows = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[SOC_SHEET_NAME], { header: 1 })
    expect(rows.length).toBe(5) // título + cabeçalho + 3 workers
    expect(rows[2][8]).toBe('Primeiro')
    expect(rows[3][8]).toBe('Segundo')
    expect(rows[4][8]).toBe('Terceiro')
  })

  it('mapeamento correto dos 8 campos obrigatórios e demais 110 colunas vazias', async () => {
    const res = await GET(exportRequest(), PARAMS)
    const buf = Buffer.from(await res.arrayBuffer())
    const wb = XLSX.read(buf, { type: 'buffer' })
    const rows = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[SOC_SHEET_NAME], { header: 1, defval: '' })
    const dataRow = rows[2]
    expect(dataRow[1]).toBe('Empresa Teste LTDA') // Nome Unidade
    expect(dataRow[3]).toBe('Financeiro')          // Nome Setor
    expect(dataRow[5]).toBe('Analista')            // Nome Cargo
    expect(dataRow[8]).toBe('Ana Teste')            // Nome Funcionário
    expect(dataRow[9]).toBe('10/05/1990')           // Dt.Nascimento
    expect(dataRow[10]).toBe('F')                   // Sexo
    expect(dataRow[11]).toBe('S')                   // Situação
    expect(dataRow[12]).toBe('15/01/2026')          // Dt.Admissão

    const filledIndexes = new Set([1, 3, 5, 8, 9, 10, 11, 12])
    for (let i = 0; i < SOC_HEADERS.length; i++) {
      if (!filledIndexes.has(i)) expect(dataRow[i] ?? '').toBe('')
    }
  })

  it('datas civis sem deslocamento de timezone (data de nascimento em fuso negativo permanece o mesmo dia)', async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue({
      ...COMPANY_FIXTURE,
      workers: [worker({ dataNascimento: new Date(Date.UTC(1990, 11, 31)) })], // 31/12/1990 à meia-noite UTC
    } as any)
    const res = await GET(exportRequest(), PARAMS)
    const buf = Buffer.from(await res.arrayBuffer())
    const wb = XLSX.read(buf, { type: 'buffer' })
    const rows = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[SOC_SHEET_NAME], { header: 1 })
    expect(rows[2][9]).toBe('31/12/1990')
  })

  it('Nome Unidade usa Company.razaoSocial mesmo com múltiplos Workers (mesma Unidade para todos)', async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue({
      ...COMPANY_FIXTURE,
      workers: [worker({ id: 'w1' }), worker({ id: 'w2' })],
    } as any)
    const res = await GET(exportRequest(), PARAMS)
    const buf = Buffer.from(await res.arrayBuffer())
    const wb = XLSX.read(buf, { type: 'buffer' })
    const rows = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[SOC_SHEET_NAME], { header: 1 })
    expect(rows[2][1]).toBe('Empresa Teste LTDA')
    expect(rows[3][1]).toBe('Empresa Teste LTDA')
  })
})
