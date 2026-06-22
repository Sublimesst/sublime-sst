// ═══════════════════════════════════════════════════════════
// SUBLIME SST — Motor de Elegibilidade
// Regras rígidas conforme briefing técnico
// ═══════════════════════════════════════════════════════════

import type {
  EligibilityData,
  EligibilityResult,
  EligibilityReason,
  EmployeeRange,
} from '@/types'
import { getPlan } from '@/lib/utils'
import cnaeCatalog from '@/lib/cnae_catalog.json'

// ── CNAE CATALOG ──────────────────────────────────────────────
interface CnaeEntry {
  nr4_class_code: string
  description: string
  grau_risco_nr4: number
  source_page_pdf: number | null
  online_catalog_status: string
  notes: string | null
}

const catalog: CnaeEntry[] = (cnaeCatalog as { entries: CnaeEntry[] }).entries

// Índice rápido por código
const cnaeIndex = new Map<string, CnaeEntry>()
catalog.forEach((entry) => cnaeIndex.set(entry.nr4_class_code, entry))

// ── REGRA DE ELEGIBILIDADE ────────────────────────────────────
/**
 * Avalia se uma empresa pode usar o modelo digital.
 *
 * Ordem das verificações (todas devem passar):
 * 1. Número de funcionários ≤ 20
 * 2. CNAE presente no catálogo GR1 da NR-4 (todos os 122 são GR1 — validado pela RT)
 * 3. Nenhuma resposta crítica = true
 */
export function runEligibilityEngine(data: EligibilityData): EligibilityResult {
  const reasons: EligibilityReason[] = []

  // Regra 1 — Funcionários
  if (data.employees === '21+') {
    reasons.push('MAIS_DE_20_FUNCIONARIOS')
  }

  // Regra 2 — CNAE no catálogo GR1
  const cnaeEntry = data.cnaeCode ? cnaeIndex.get(data.cnaeCode) : undefined
  if (!cnaeEntry) {
    reasons.push('CNAE_NAO_GR1')
  }

  // Regra 4 — Respostas críticas
  if (data.usesMachines)   reasons.push('USA_MAQUINAS_INDUSTRIAIS')
  if (data.usesChemicals)  reasons.push('MANIPULA_QUIMICOS')
  if (data.worksAtHeight)  reasons.push('TRABALHO_EM_ALTURA')
  if (data.hasExternalWork) reasons.push('ATIVIDADES_EXTERNAS_FREQUENTES')

  const eligible = reasons.length === 0

  const plan = eligible && data.employees !== '21+'
    ? getPlan(data.employees as Exclude<EmployeeRange, '21+'>)
    : null

  return { eligible, reasons, plan: plan ?? undefined }
}

// ── BUSCA DE CNAE ─────────────────────────────────────────────
export function searchCnae(query: string, limit = 8): CnaeEntry[] {
  const q = query.toLowerCase().trim()
  if (!q || q.length < 2) return []
  return catalog
    .filter(
      (c) =>
        c.nr4_class_code.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
    )
    .slice(0, limit)
}

export function getCnaeByCode(code: string): CnaeEntry | undefined {
  return cnaeIndex.get(code)
}

export function isCnaeWhitelisted(code: string): boolean {
  return cnaeIndex.has(code)
}

// ── LABEL DOS MOTIVOS ─────────────────────────────────────────
export const REASON_LABELS: Record<EligibilityReason, string> = {
  MAIS_DE_20_FUNCIONARIOS:        'Mais de 20 funcionários',
  CNAE_NAO_GR1:                   'CNAE não classificado como GR 1 na NR-4',
  CNAE_PENDENTE_VALIDACAO_RT:     'CNAE pendente de validação pelo responsável técnico',
  CNAE_BLOQUEADO:                 'CNAE bloqueado para o modelo online',
  USA_MAQUINAS_INDUSTRIAIS:       'Uso de máquinas industriais',
  MANIPULA_QUIMICOS:              'Manipulação de produtos químicos perigosos',
  TRABALHO_EM_ALTURA:             'Trabalho em altura',
  ATIVIDADES_EXTERNAS_FREQUENTES: 'Atividades externas frequentes',
}
