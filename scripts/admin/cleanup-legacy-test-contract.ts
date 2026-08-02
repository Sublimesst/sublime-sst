// ═══════════════════════════════════════════════════════════
// SUBLIME SST — Limpeza controlada de dados de teste (contratação antiga)
//
// Este arquivo é genérico e versionado — NUNCA contém CNPJ, e-mail, IDs
// internos, IDs Asaas ou qualquer dado específico de uma empresa. O alvo da
// limpeza (IDs internos exatos + hashes SHA-256 de CNPJ/e-mail para validação
// secundária) vive em um arquivo de configuração LOCAL, ignorado pelo Git:
//   scripts/admin/cleanup-legacy-test-contract.config.local.json
// (ver scripts/admin/cleanup-legacy-test-contract.config.example.json)
//
// Uso (terminal autorizado, nunca via rota web/Admin):
//   Dry-run (padrão, só leitura):
//     npx tsx scripts/admin/cleanup-legacy-test-contract.ts
//   Execução real (exige TODAS as condições simultaneamente — ver seção
//   validateExecuteGuards):
//     CONFIRM_PRODUCTION_TARGET=1 npx tsx scripts/admin/cleanup-legacy-test-contract.ts \
//       --execute --confirm="APAGAR CONTRATACAO DE TESTE <companyId>"
//
// Este script NUNCA deve ser exposto como endpoint HTTP ou botão de Admin.
// Identifica os registros SOMENTE pelos IDs internos exatos da config — nome
// de empresa, CNPJ e e-mail nunca são critério de exclusão, só validação
// secundária (via hash SHA-256, nunca em texto puro).
// ═══════════════════════════════════════════════════════════

import { PrismaClient } from '@prisma/client'
import { createHash } from 'crypto'
import { readFileSync } from 'fs'
import { join } from 'path'

export const prisma = new PrismaClient()

const CONFIG_PATH = join(__dirname, 'cleanup-legacy-test-contract.config.local.json')

// Alvo desta limpeza — carregado em runtime de um arquivo local (nunca
// versionado, ver CONFIG_PATH). Nota de contexto: o Lead.id de contratações
// segue o padrão idempotente já usado em todo o cadastro (`cnpj_${digitos}`)
// — por isso um leadId real contém os dígitos do CNPJ embutidos. Por isso a
// config-alvo fica fora do Git, e nenhum valor de CleanupTarget deve ser
// impresso sozinho num relatório sem mascarar (ver maskId).
export interface CleanupTarget {
  companyId: string
  leadId: string
  paymentIdImplantacao: string
  paymentIdMensalidade: string
  cancellationRequestId: string
  expectedPartnerId: string
  cnpjSha256: string
  emailSha256: string
}

const REQUIRED_TARGET_FIELDS: Array<keyof CleanupTarget> = [
  'companyId', 'leadId', 'paymentIdImplantacao', 'paymentIdMensalidade',
  'cancellationRequestId', 'expectedPartnerId', 'cnpjSha256', 'emailSha256',
]

// Campos que identificam registros distintos — nunca podem coincidir entre
// si (ex.: expectedPartnerId igual a companyId por erro de copiar/colar na
// config local). Hashes (cnpjSha256/emailSha256) ficam de fora de propósito:
// não são identificadores de registro.
const ID_FIELDS_FOR_DISTINCTNESS: Array<keyof CleanupTarget> = [
  'companyId', 'leadId', 'expectedPartnerId', 'paymentIdImplantacao', 'paymentIdMensalidade', 'cancellationRequestId',
]

// Valida a FORMA da config antes de qualquer consulta ao banco — arquivo
// ausente, malformado, com campo vazio ou com IDs duplicados aborta
// imediatamente, sem escrita. Nunca mostra os valores na mensagem de erro,
// só o nome do campo.
export function parseTargetConfig(raw: unknown): CleanupTarget {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Config de limpeza inválida: esperado um objeto JSON.')
  }
  const obj = raw as Record<string, unknown>
  for (const field of REQUIRED_TARGET_FIELDS) {
    if (typeof obj[field] !== 'string' || (obj[field] as string).trim() === '') {
      throw new Error(`Config de limpeza inválida: campo obrigatório ausente ou vazio — "${field}".`)
    }
  }

  const seen = new Set<string>()
  for (const field of ID_FIELDS_FOR_DISTINCTNESS) {
    const value = obj[field] as string
    if (seen.has(value)) {
      throw new Error(
        `Config de limpeza inválida: IDs devem ser mutuamente distintos — valor duplicado detectado no campo "${field}".`
      )
    }
    seen.add(value)
  }

  return obj as unknown as CleanupTarget
}

export function loadTargetConfig(configPath: string): CleanupTarget {
  let content: string
  try {
    content = readFileSync(configPath, 'utf8')
  } catch {
    throw new Error(
      `Config de limpeza não encontrada em ${configPath}. ` +
      'Crie o arquivo local (ver cleanup-legacy-test-contract.config.example.json) antes de rodar o script.'
    )
  }
  let json: unknown
  try {
    json = JSON.parse(content)
  } catch {
    throw new Error(`Config de limpeza em ${configPath} não é um JSON válido.`)
  }
  return parseTargetConfig(json)
}

export function sha256(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
}

export function maskId(id: string | null | undefined): string {
  if (!id) return '(ausente)'
  return id.length <= 10 ? id : `${id.slice(0, 6)}…${id.slice(-4)}`
}

export interface Precondition {
  label: string
  ok: boolean
  detail?: string
}

// Client mínimo exigido por collectPreconditions/runCleanupTransaction — só os
// métodos realmente usados, pra permitir injetar um stub em teste sem
// precisar mockar o módulo inteiro do Prisma.
export interface CleanupPrismaClient {
  company: {
    findMany: (args: any) => Promise<any[]>
    count: (args: any) => Promise<number>
  }
  lead: {
    findMany: (args: any) => Promise<any[]>
    count: (args: any) => Promise<number>
  }
  payment: {
    findMany: (args: any) => Promise<any[]>
  }
  cancellationRequest: {
    findMany: (args: any) => Promise<any[]>
  }
  commission: { count: (args: any) => Promise<number> }
  onboardingData: { count: (args: any) => Promise<number> }
  clientSession: { count: (args: any) => Promise<number> }
  document: { count: (args: any) => Promise<number> }
  documentAccessLog: { count: (args: any) => Promise<number> }
  implantacaoChecklist: { count: (args: any) => Promise<number> }
  esocialLog: { count: (args: any) => Promise<number> }
  partner: { findUnique: (args: any) => Promise<any> }
  $transaction: (fn: (tx: CleanupTxClient) => Promise<void>) => Promise<void>
}

export interface CleanupTxClient {
  payment: { deleteMany: (args: any) => Promise<{ count: number }> }
  cancellationRequest: { deleteMany: (args: any) => Promise<{ count: number }> }
  company: { deleteMany: (args: any) => Promise<{ count: number }> }
  lead: { deleteMany: (args: any) => Promise<{ count: number }> }
}

// Reúne TODAS as precondições da limpeza. Somente leitura — nunca chama
// nenhum método de escrita. Usada tanto no dry-run quanto, revalidada, dentro
// do fluxo de execução real.
export async function collectPreconditions(
  db: CleanupPrismaClient,
  target: CleanupTarget
): Promise<{ preconditions: Precondition[]; allOk: boolean }> {
  const preconditions: Precondition[] = []
  const targetPaymentIds: readonly string[] = [target.paymentIdImplantacao, target.paymentIdMensalidade]

  const companies = await db.company.findMany({ where: { id: target.companyId } })
  preconditions.push({ label: 'Company existe exatamente 1 vez', ok: companies.length === 1 })
  const company = companies[0]

  preconditions.push({ label: 'Company.id corresponde ao alvo', ok: company?.id === target.companyId })
  preconditions.push({ label: 'Company.status === cancelled', ok: company?.status === 'cancelled' })
  preconditions.push({
    label: 'Company.partnerId corresponde ao parceiro esperado',
    ok: company?.partnerId === target.expectedPartnerId,
  })
  if (company) {
    preconditions.push({ label: 'CNPJ confere (hash secundário)', ok: sha256(company.cnpj) === target.cnpjSha256 })
    preconditions.push({ label: 'E-mail confere (hash secundário)', ok: sha256(company.email) === target.emailSha256 })
  }

  const payments = await db.payment.findMany({ where: { companyId: target.companyId } })
  preconditions.push({ label: 'Exatamente 2 Payments', ok: payments.length === 2 })
  preconditions.push({
    label: 'IDs dos Payments batem exatamente com os esperados',
    ok: payments.length === 2 && payments.every((p: any) => targetPaymentIds.includes(p.id)),
  })
  const implantacao = payments.find((p: any) => p.type === 'implantacao')
  const mensalidade = payments.find((p: any) => p.type === 'mensalidade')
  preconditions.push({ label: 'Payment implantacao com status refunded', ok: implantacao?.status === 'refunded' })
  preconditions.push({ label: 'Payment mensalidade com status overdue', ok: mensalidade?.status === 'overdue' })

  const cancellationRequests = await db.cancellationRequest.findMany({ where: { companyId: target.companyId } })
  preconditions.push({ label: 'Exatamente 1 CancellationRequest', ok: cancellationRequests.length === 1 })
  preconditions.push({
    label: 'ID da CancellationRequest bate com o esperado',
    ok: cancellationRequests[0]?.id === target.cancellationRequestId,
  })

  const zeroChecks: Array<[string, number]> = [
    ['Commission', await db.commission.count({ where: { companyId: target.companyId } })],
    ['OnboardingData', await db.onboardingData.count({ where: { companyId: target.companyId } })],
    ['ClientSession', await db.clientSession.count({ where: { companyId: target.companyId } })],
    ['Document', await db.document.count({ where: { companyId: target.companyId } })],
    ['DocumentAccessLog', await db.documentAccessLog.count({ where: { companyId: target.companyId } })],
    ['ImplantacaoChecklist', await db.implantacaoChecklist.count({ where: { companyId: target.companyId } })],
    ['EsocialLog', await db.esocialLog.count({ where: { companyId: target.companyId } })],
  ]
  for (const [name, count] of zeroChecks) {
    preconditions.push({ label: `${name} = 0`, ok: count === 0, detail: `contagem atual: ${count}` })
  }
  // 0 objetos de storage decorre de 0 Document (nenhum Document ⇒ nenhuma storageKey a checar).
  const documentCount = zeroChecks.find(([name]) => name === 'Document')![1]
  preconditions.push({ label: '0 objetos de storage (decorrente de 0 Document)', ok: documentCount === 0 })

  const leads = await db.lead.findMany({ where: { id: target.leadId } })
  preconditions.push({ label: 'Lead antigo existe exatamente 1 vez', ok: leads.length === 1 })
  preconditions.push({ label: 'Lead.id corresponde ao alvo', ok: leads[0]?.id === target.leadId })
  preconditions.push({
    label: 'Lead.partnerId corresponde ao parceiro esperado',
    ok: leads[0]?.partnerId === target.expectedPartnerId,
  })

  const partner = await db.partner.findUnique({ where: { id: target.expectedPartnerId } })
  preconditions.push({ label: 'Parceiro existe e está active', ok: partner?.status === 'active' })

  const partnerOtherCompanies = await db.company.count({
    where: { partnerId: target.expectedPartnerId, id: { not: target.companyId } },
  })
  const partnerOtherLeads = await db.lead.count({
    where: { partnerId: target.expectedPartnerId, id: { not: target.leadId } },
  })
  preconditions.push({
    label: 'Parceiro possui outros registros preservados (fora do escopo desta limpeza)',
    ok: partnerOtherCompanies > 0 || partnerOtherLeads > 0,
    detail: `outrasCompanies=${partnerOtherCompanies} outrosLeads=${partnerOtherLeads}`,
  })

  return { preconditions, allOk: preconditions.every(p => p.ok) }
}

// Transação real de exclusão — só chamada pelo fluxo de execução, nunca pelo
// dry-run. Cada delete usa companyId/id exatos, nunca deleteMany amplo por
// partnerId/cnpj/e-mail. Partner NUNCA aparece em nenhum delete (a interface
// CleanupTxClient nem declara partner.deleteMany).
export async function runCleanupTransaction(db: CleanupPrismaClient, target: CleanupTarget): Promise<void> {
  const targetPaymentIds: readonly string[] = [target.paymentIdImplantacao, target.paymentIdMensalidade]

  await db.$transaction(async (tx) => {
    const paymentsDeleted = await tx.payment.deleteMany({
      where: { companyId: target.companyId, id: { in: targetPaymentIds } },
    })
    if (paymentsDeleted.count !== 2) {
      throw new Error(`Esperava excluir 2 Payments, excluiu ${paymentsDeleted.count} — abortando transação.`)
    }

    const cancellationDeleted = await tx.cancellationRequest.deleteMany({
      where: { id: target.cancellationRequestId, companyId: target.companyId },
    })
    if (cancellationDeleted.count !== 1) {
      throw new Error(`Esperava excluir 1 CancellationRequest, excluiu ${cancellationDeleted.count} — abortando transação.`)
    }

    const companyDeleted = await tx.company.deleteMany({ where: { id: target.companyId } })
    if (companyDeleted.count !== 1) {
      throw new Error(`Esperava excluir 1 Company, excluiu ${companyDeleted.count} — abortando transação.`)
    }

    const leadDeleted = await tx.lead.deleteMany({ where: { id: target.leadId } })
    if (leadDeleted.count !== 1) {
      throw new Error(`Esperava excluir 1 Lead, excluiu ${leadDeleted.count} — abortando transação.`)
    }
  })
}

export function buildConfirmPhrase(companyId: string): string {
  return `APAGAR CONTRATACAO DE TESTE ${companyId}`
}

// Valida os pré-requisitos do modo execute que NÃO dependem do banco (flags
// de linha de comando / variável de ambiente) — puro, testável sem prisma.
export function validateExecuteGuards(
  argv: string[],
  env: NodeJS.ProcessEnv,
  companyId: string
): { ok: boolean; reason?: string } {
  if (!argv.includes('--execute')) {
    return { ok: false, reason: 'flag --execute ausente' }
  }
  const confirmArg = argv.find(a => a.startsWith('--confirm='))
  const expected = buildConfirmPhrase(companyId)
  if (confirmArg?.slice('--confirm='.length) !== expected) {
    return { ok: false, reason: 'frase de confirmação ausente ou incorreta' }
  }
  if (env.NODE_ENV !== 'production' && env.CONFIRM_PRODUCTION_TARGET !== '1') {
    return { ok: false, reason: 'ambiente Production não reconhecido (defina CONFIRM_PRODUCTION_TARGET=1)' }
  }
  return { ok: true }
}

export async function dryRun(db: CleanupPrismaClient, target: CleanupTarget): Promise<void> {
  console.log('=== MODO DRY-RUN (nenhuma escrita será feita) ===')
  const { preconditions, allOk } = await collectPreconditions(db, target)
  for (const p of preconditions) {
    console.log(`${p.ok ? 'OK    ' : 'FALHOU'} — ${p.label}${p.detail ? ' (' + p.detail + ')' : ''}`)
  }

  const companyFound = preconditions.find(p => p.label.startsWith('Company existe'))?.ok ?? false
  console.log(`\nCompany alvo encontrada: ${companyFound ? 'sim' : 'não'}`)
  console.log(`Precondições aprovadas: ${allOk ? 'sim' : 'não'}`)

  if (!allOk) {
    console.log('\nDivergência detectada — nenhuma exclusão seria permitida. Abortando dry-run.')
    return
  }

  console.log('\nRegistros que SERIAM removidos (execução futura), por tipo e ID mascarado:')
  console.log(`- Payment (implantacao): ${maskId(target.paymentIdImplantacao)}`)
  console.log(`- Payment (mensalidade): ${maskId(target.paymentIdMensalidade)}`)
  console.log(`- CancellationRequest: ${maskId(target.cancellationRequestId)}`)
  console.log(`- Company: ${maskId(target.companyId)}`)
  console.log(`- Lead: ${maskId(target.leadId)}`)
  console.log(`\nParceiro preservado (nunca incluído em nenhum delete): ${maskId(target.expectedPartnerId)}`)
  console.log('Nenhuma escrita foi realizada neste modo.')
}

export async function execute(
  db: CleanupPrismaClient,
  target: CleanupTarget,
  argv: string[] = process.argv,
  env: NodeJS.ProcessEnv = process.env
): Promise<void> {
  const guard = validateExecuteGuards(argv, env, target.companyId)
  if (!guard.ok) {
    throw new Error(`Execução bloqueada: ${guard.reason}`)
  }

  const { preconditions, allOk } = await collectPreconditions(db, target)
  if (!allOk) {
    for (const p of preconditions) if (!p.ok) console.error(`PRECONDIÇÃO FALHOU: ${p.label}`)
    throw new Error('Precondições falharam na revalidação — abortando, nenhuma exclusão foi feita.')
  }

  console.log('=== MODO EXECUTE — iniciando transação ===')
  await runCleanupTransaction(db, target)
  console.log('Transação concluída.')

  console.log('\n=== VALIDAÇÃO PÓS-EXECUÇÃO ===')
  const companyAfter = await db.company.count({ where: { id: target.companyId } })
  const leadAfter = await db.lead.count({ where: { id: target.leadId } })
  const targetPaymentIds: readonly string[] = [target.paymentIdImplantacao, target.paymentIdMensalidade]
  const paymentsAfter = (await db.payment.findMany({ where: { id: { in: targetPaymentIds } } })).length
  const cancellationAfter = (await db.cancellationRequest.findMany({ where: { id: target.cancellationRequestId } })).length
  const partnerAfter = await db.partner.findUnique({ where: { id: target.expectedPartnerId } })
  const partnerCompaniesAfter = await db.company.count({ where: { partnerId: target.expectedPartnerId } })
  const partnerLeadsAfter = await db.lead.count({ where: { partnerId: target.expectedPartnerId } })

  console.log(`Company antiga = ${companyAfter} (esperado 0)`)
  console.log(`Lead antigo = ${leadAfter} (esperado 0)`)
  console.log(`Payments antigos = ${paymentsAfter} (esperado 0)`)
  console.log(`CancellationRequest antiga = ${cancellationAfter} (esperado 0)`)
  console.log(`Parceiro status = ${partnerAfter?.status} (esperado active)`)
  console.log(`Outras Companies do parceiro preservadas = ${partnerCompaniesAfter}`)
  console.log(`Outros Leads do parceiro preservados = ${partnerLeadsAfter}`)
}

/* istanbul ignore next -- executado apenas via CLI real, coberto por teste através de dryRun/execute diretamente */
async function main() {
  const target = loadTargetConfig(CONFIG_PATH)
  const isExecute = process.argv.includes('--execute')
  if (isExecute) {
    await execute(prisma as unknown as CleanupPrismaClient, target)
  } else {
    await dryRun(prisma as unknown as CleanupPrismaClient, target)
  }
}

if (require.main === module) {
  main()
    .catch(e => { console.error('ABORTADO:', e.message); process.exitCode = 1 })
    .finally(() => prisma.$disconnect())
}
