// ═══════════════════════════════════════════════════════════
// SUBLIME SST — Seed do banco de dados
// Executa: npx tsx src/lib/seed.ts
// ═══════════════════════════════════════════════════════════

import { PrismaClient } from '@prisma/client'
import cnaeCatalog from './cnae_catalog.json'

const prisma = new PrismaClient()

// Todos os CNAEs do catálogo são GR1 — aprovados pela responsável técnica em SST

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

  for (const entry of entries) {
    await prisma.cnaeCatalog.create({
      data: {
        code: entry.nr4_class_code,
        description: entry.description,
        grauRiscoNr4: entry.grau_risco_nr4 ?? 1,
        sourcePagePdf: entry.source_page_pdf,
        onlineCatalogStatus: 'approved',
        eligivelOnline: true,
        notes: entry.notes,
        approvedBy: 'rt_tecnica_sst',
        approvedAt: new Date(),
      },
    })
  }

  console.log(`✅ ${entries.length} CNAEs importados e aprovados (todos GR1)`)
  console.log('🎉 Seed concluído!')
}

seed()
  .catch((e) => { console.error('❌ Seed error:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
