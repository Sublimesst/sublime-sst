// ═══════════════════════════════════════════════════════════
// SUBLIME SST — Seed do banco de dados
// Executa: npx tsx src/lib/seed.ts
// ═══════════════════════════════════════════════════════════

import { PrismaClient } from '@prisma/client'
import cnaeCatalog from './cnae_catalog.json'

const prisma = new PrismaClient()

// CNAEs pré-aprovados pelo responsável técnico (lista branca inicial)
const APPROVED_CODES = new Set([
  '69.20-6', // Contabilidade
  '70.20-4', // Consultoria em gestão
  '73.11-4', // Agências de publicidade
  '73.19-0', // Publicidade
  '73.20-3', // Pesquisa de mercado
  '74.10-2', // Design
  '74.90-1', // Atividades técnicas
  '71.11-1', // Arquitetura
  '71.12-0', // Engenharia
  '71.19-7', // Técnicas de arquitetura
  '82.11-3', // Escritório e apoio administrativo
  '68.21-8', // Imobiliária — compra/venda
  '68.22-6', // Gestão imobiliária
  '66.21-5', // Avaliação de riscos (seguros)
  '66.22-3', // Corretores de seguros
  '69.11-7', // Atividades jurídicas
  '69.12-5', // Cartórios
])

async function seed() {
  console.log('🌱 Iniciando seed...')

  // ── PLANOS ──
  console.log('📋 Criando planos...')
  await prisma.plan.deleteMany()
  await prisma.plan.createMany({
    data: [
      { name: '1-5', label: '1 a 5 funcionários', monthlyPrice: 14200, minEmployees: 1, maxEmployees: 5 },
      { name: '6-10', label: '6 a 10 funcionários', monthlyPrice: 25000, minEmployees: 6, maxEmployees: 10 },
      { name: '11-20', label: '11 a 20 funcionários', monthlyPrice: 43000, minEmployees: 11, maxEmployees: 20 },
    ],
  })

  // ── CNAE CATALOG ──
  console.log('🏭 Importando catálogo CNAE...')
  await prisma.cnaeCatalog.deleteMany()

  const entries = (cnaeCatalog as { entries: Array<{
    nr4_class_code: string
    description: string
    grau_risco_nr4: number
    source_page_pdf: number | null
    online_catalog_status: string
    notes: string | null
  }> }).entries

  let approved = 0
  for (const entry of entries) {
    const isApproved = APPROVED_CODES.has(entry.nr4_class_code)
    await prisma.cnaeCatalog.create({
      data: {
        code: entry.nr4_class_code,
        description: entry.description,
        grauRiscoNr4: entry.grau_risco_nr4 ?? 1,
        sourcePagePdf: entry.source_page_pdf,
        onlineCatalogStatus: isApproved ? 'approved' : 'pending',
        eligivelOnline: isApproved,
        notes: entry.notes,
        approvedBy: isApproved ? 'seed_inicial' : null,
        approvedAt: isApproved ? new Date() : null,
      },
    })
    if (isApproved) approved++
  }

  console.log(`✅ ${entries.length} CNAEs importados (${approved} aprovados)`)
  console.log('🎉 Seed concluído!')
}

seed()
  .catch((e) => { console.error('❌ Seed error:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
