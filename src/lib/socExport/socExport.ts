// ═══════════════════════════════════════════════════════════
// SUBLIME SST — Exportação compatível com o Modelo I de importação do SOC
// Gera um .xls BIFF8 real (assinatura OLE2/CFB, não XLSX renomeado) a
// partir de Company + Worker, reproduzindo título/cabeçalho/ordem de
// colunas do modelo oficial (ver socTemplate.ts). Só os 8 campos marcados
// como obrigatórios no modelo real recebem valor — as demais 110 colunas
// ficam sempre vazias nesta tranche: nenhuma tem origem determinística sem
// inventar valor ou coletar dado pessoal ainda não coletado pelo
// onboarding (ver docs/DECISIONS.md).
// ═══════════════════════════════════════════════════════════

import * as XLSX from 'xlsx'
import { SOC_TITLE, SOC_SHEET_NAME, SOC_HEADERS, SOC_COLUMN_INDEX } from './socTemplate'

export interface SocExportWorkerInput {
  nome: string
  dataNascimento: Date
  sexo: 'M' | 'F'
  dataAdmissao: Date
  cargo: string
  setor: string
}

export interface SocExportWorkerCompleteness {
  nome: string | null
  dataNascimento: Date | null
  sexo: string | null
  dataAdmissao: Date | null
  cargo: string | null
  setor: string | null
}

// Mesmos 5 campos já exigidos no envio do onboarding (ver
// isWorkerCompleteForSubmission em onboardingWorkers.ts) mais setor, que só
// é obrigatório para a exportação SOC nesta tranche — não altera a
// obrigatoriedade de setor em declarações já enviadas antes desta mudança.
export function isWorkerReadyForSocExport(worker: SocExportWorkerCompleteness): boolean {
  return (
    !!worker.nome &&
    !!worker.dataNascimento &&
    (worker.sexo === 'M' || worker.sexo === 'F') &&
    !!worker.dataAdmissao &&
    !!worker.cargo &&
    !!worker.setor
  )
}

// DD/MM/AAAA a partir dos componentes UTC do Date (mesmo padrão de
// src/lib/civilDate.ts) — nunca desloca o dia por timezone do processo.
export function formatDateBR(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, '0')
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const year = String(date.getUTCFullYear()).padStart(4, '0')
  return `${day}/${month}/${year}`
}

function buildWorkerRow(razaoSocial: string, worker: SocExportWorkerInput): string[] {
  const row = new Array<string>(SOC_HEADERS.length).fill('')
  row[SOC_COLUMN_INDEX.nomeUnidade] = razaoSocial
  row[SOC_COLUMN_INDEX.nomeSetor] = worker.setor
  row[SOC_COLUMN_INDEX.nomeCargo] = worker.cargo
  row[SOC_COLUMN_INDEX.nomeFuncionario] = worker.nome
  row[SOC_COLUMN_INDEX.dtNascimento] = formatDateBR(worker.dataNascimento)
  row[SOC_COLUMN_INDEX.sexo] = worker.sexo
  row[SOC_COLUMN_INDEX.situacao] = 'S'
  row[SOC_COLUMN_INDEX.dtAdmissao] = formatDateBR(worker.dataAdmissao)
  return row
}

// Monta as linhas de dados (uma por Worker, na ordem recebida — o caller é
// responsável por passar os Workers já ordenados deterministicamente, ex.
// orderBy createdAt asc). Função pura, sem I/O — testável sem gerar o
// arquivo binário inteiro.
export function buildSocExportRows(razaoSocial: string, workers: SocExportWorkerInput[]): string[][] {
  return workers.map((w) => buildWorkerRow(razaoSocial, w))
}

// Gera o .xls BIFF8 real (assinatura OLE2/CFB) — nunca XLSX renomeado.
// Título e cabeçalho reproduzem exatamente o Modelo1.xls original; uma
// linha por Worker imediatamente após o cabeçalho, sem reproduzir
// legenda/observações do arquivo original (que são só documentação para
// preenchimento manual, não fazem parte da estrutura de dados importável).
export function generateSocWorkbookBuffer(razaoSocial: string, workers: SocExportWorkerInput[]): Buffer {
  const rows: (string[])[] = [[SOC_TITLE], [...SOC_HEADERS], ...buildSocExportRows(razaoSocial, workers)]

  const sheet = XLSX.utils.aoa_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, SOC_SHEET_NAME)

  return XLSX.write(workbook, { bookType: 'biff8', type: 'buffer' }) as Buffer
}
