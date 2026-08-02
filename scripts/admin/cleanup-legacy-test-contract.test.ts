import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import {
  maskId,
  sha256,
  buildConfirmPhrase,
  validateExecuteGuards,
  parseTargetConfig,
  loadTargetConfig,
  collectPreconditions,
  runCleanupTransaction,
  dryRun,
  execute,
  type CleanupTarget,
  type CleanupPrismaClient,
} from './cleanup-legacy-test-contract'

// ── Alvo 100% sintético — nenhum valor real de produção entra neste arquivo.
// Isso prova que o script é testável sem depender de dados reais, e que a
// lógica de precondições/transação funciona para QUALQUER config válida, não
// só a config-alvo real (que nunca é lida por este teste).
const FAKE_CNPJ = '11222333000181' // CNPJ sintético (dígito verificador não validado aqui de propósito)
const FAKE_EMAIL = 'empresa-fake@exemplo.test'

const TARGET: CleanupTarget = {
  companyId: 'company_fake_1',
  leadId: 'lead_fake_1',
  paymentIdImplantacao: 'payment_fake_implantacao',
  paymentIdMensalidade: 'payment_fake_mensalidade',
  cancellationRequestId: 'cancellation_fake_1',
  eligibilityAssessmentId: 'eligibility_assessment_fake_1',
  expectedPartnerId: 'partner_fake_1',
  cnpjSha256: sha256(FAKE_CNPJ),
  emailSha256: sha256(FAKE_EMAIL),
}

function goodCompany(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: TARGET.companyId,
    status: 'cancelled',
    partnerId: TARGET.expectedPartnerId,
    cnpj: FAKE_CNPJ,
    email: FAKE_EMAIL,
    ...overrides,
  }
}

function goodPayments() {
  return [
    { id: TARGET.paymentIdImplantacao, companyId: TARGET.companyId, type: 'implantacao', status: 'refunded' },
    { id: TARGET.paymentIdMensalidade, companyId: TARGET.companyId, type: 'mensalidade', status: 'overdue' },
  ]
}

function goodCancellationRequest() {
  return [{ id: TARGET.cancellationRequestId, companyId: TARGET.companyId }]
}

function goodLead(overrides: Partial<Record<string, unknown>> = {}) {
  return { id: TARGET.leadId, partnerId: TARGET.expectedPartnerId, ...overrides }
}

// Nunca inclui cnae/reasons/ip/userAgent no teste — o precondition só compara
// id/leadId, nunca o conteúdo da avaliação.
function goodEligibilityAssessment(overrides: Partial<Record<string, unknown>> = {}) {
  return { id: TARGET.eligibilityAssessmentId, leadId: TARGET.leadId, eligible: true, ...overrides }
}

// Estado sintético compartilhado por fullyValidState()/buildReadOnlyDb() —
// partner é explicitamente nulável para permitir o teste "Partner ausente"
// sem recorrer a any/cast inseguro.
interface SyntheticState {
  company?: any
  payments?: any[]
  cancellationRequests?: any[]
  eligibilityAssessments?: any[]
  contactRequestCount?: number
  lead?: any
  partner: { id: string; status: string } | null
  zeroCounts?: Partial<Record<
    'commission' | 'onboardingData' | 'clientSession' | 'document' | 'documentAccessLog' | 'implantacaoChecklist' | 'esocialLog',
    number
  >>
  partnerOtherCompanies?: number
  partnerOtherLeads?: number
}

// Stub mínimo — implementa só a interface CleanupPrismaClient. O `db` de
// leitura (usado no dry-run e na revalidação de precondições) NÃO TEM nenhum
// método de escrita — se o código sob teste tentar chamar um, o teste falha
// com "is not a function", provando estruturalmente que dry-run nunca escreve.
function buildReadOnlyDb(state: SyntheticState): CleanupPrismaClient {
  const zero = {
    commission: 0, onboardingData: 0, clientSession: 0, document: 0,
    documentAccessLog: 0, implantacaoChecklist: 0, esocialLog: 0,
    ...state.zeroCounts,
  }

  return {
    company: {
      findMany: vi.fn(async (args: any) =>
        args.where.id === TARGET.companyId && state.company ? [state.company] : []
      ),
      count: vi.fn(async () => state.partnerOtherCompanies ?? 1),
    },
    lead: {
      findMany: vi.fn(async (args: any) =>
        args.where.id === TARGET.leadId && state.lead ? [state.lead] : []
      ),
      count: vi.fn(async () => state.partnerOtherLeads ?? 0),
    },
    payment: {
      findMany: vi.fn(async () => state.payments ?? []),
    },
    cancellationRequest: {
      findMany: vi.fn(async () => state.cancellationRequests ?? []),
    },
    eligibilityAssessment: {
      findMany: vi.fn(async () => state.eligibilityAssessments ?? []),
    },
    contactRequest: {
      count: vi.fn(async () => state.contactRequestCount ?? 0),
    },
    commission: { count: vi.fn(async () => zero.commission) },
    onboardingData: { count: vi.fn(async () => zero.onboardingData) },
    clientSession: { count: vi.fn(async () => zero.clientSession) },
    document: { count: vi.fn(async () => zero.document) },
    documentAccessLog: { count: vi.fn(async () => zero.documentAccessLog) },
    implantacaoChecklist: { count: vi.fn(async () => zero.implantacaoChecklist) },
    esocialLog: { count: vi.fn(async () => zero.esocialLog) },
    partner: { findUnique: vi.fn(async () => state.partner ?? null) },
    // Estruturalmente ausente de propósito: nenhum método de escrita aqui.
    $transaction: vi.fn(async () => {
      throw new Error('$transaction não deveria ser chamado a partir do db somente-leitura')
    }),
  } as unknown as CleanupPrismaClient
}

function fullyValidState(): SyntheticState {
  return {
    company: goodCompany(),
    payments: goodPayments(),
    cancellationRequests: goodCancellationRequest(),
    eligibilityAssessments: [goodEligibilityAssessment()],
    contactRequestCount: 0,
    lead: goodLead(),
    partner: { id: TARGET.expectedPartnerId, status: 'active' },
    partnerOtherCompanies: 1,
    partnerOtherLeads: 1,
  }
}

let consoleLogSpy: ReturnType<typeof vi.spyOn>
let consoleErrorSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  consoleLogSpy.mockRestore()
  consoleErrorSpy.mockRestore()
})

describe('importar o módulo não executa nada', () => {
  it('collectPreconditions/runCleanupTransaction/dryRun/execute são só funções — nada roda no import', () => {
    // O próprio import no topo do arquivo já prova isso: se o módulo tivesse
    // side effect de rede/DB no top-level, este arquivo de teste falharia ao
    // carregar (sem DATABASE_URL real configurado neste ambiente de teste).
    // A prisma real só é usada dentro de main(), atrás de `require.main === module`.
    expect(typeof collectPreconditions).toBe('function')
    expect(typeof runCleanupTransaction).toBe('function')
    expect(typeof dryRun).toBe('function')
    expect(typeof execute).toBe('function')
  })
})

describe('parseTargetConfig — valida a forma antes de qualquer consulta ao banco', () => {
  it('config completa e válida é aceita', () => {
    expect(() => parseTargetConfig({ ...TARGET })).not.toThrow()
  })

  it('config não-objeto é rejeitada', () => {
    expect(() => parseTargetConfig(null)).toThrow()
    expect(() => parseTargetConfig('string qualquer')).toThrow()
  })

  it('campo obrigatório ausente é rejeitado', () => {
    const { companyId, ...rest } = TARGET
    expect(() => parseTargetConfig(rest)).toThrow(/companyId/)
  })

  it('campo vazio é rejeitado', () => {
    expect(() => parseTargetConfig({ ...TARGET, leadId: '' })).toThrow(/leadId/)
  })

  it('eligibilityAssessmentId ausente é rejeitado', () => {
    const { eligibilityAssessmentId, ...rest } = TARGET
    expect(() => parseTargetConfig(rest)).toThrow(/eligibilityAssessmentId/)
  })

  it('eligibilityAssessmentId vazio é rejeitado', () => {
    expect(() => parseTargetConfig({ ...TARGET, eligibilityAssessmentId: '' })).toThrow(/eligibilityAssessmentId/)
  })

  it('eligibilityAssessmentId duplicado com qualquer outro ID é rejeitado', () => {
    expect(() => parseTargetConfig({ ...TARGET, eligibilityAssessmentId: TARGET.companyId })).toThrow(/mutuamente distintos/)
    expect(() => parseTargetConfig({ ...TARGET, eligibilityAssessmentId: TARGET.leadId })).toThrow(/mutuamente distintos/)
    expect(() => parseTargetConfig({ ...TARGET, eligibilityAssessmentId: TARGET.expectedPartnerId })).toThrow(/mutuamente distintos/)
    expect(() => parseTargetConfig({ ...TARGET, eligibilityAssessmentId: TARGET.paymentIdImplantacao })).toThrow(/mutuamente distintos/)
    expect(() => parseTargetConfig({ ...TARGET, eligibilityAssessmentId: TARGET.paymentIdMensalidade })).toThrow(/mutuamente distintos/)
    expect(() => parseTargetConfig({ ...TARGET, eligibilityAssessmentId: TARGET.cancellationRequestId })).toThrow(/mutuamente distintos/)
  })

  it('companyId igual a expectedPartnerId é rejeitado (IDs devem ser mutuamente distintos)', () => {
    expect(() => parseTargetConfig({ ...TARGET, expectedPartnerId: TARGET.companyId })).toThrow(/mutuamente distintos/)
  })

  it('paymentIds duplicados entre si são rejeitados', () => {
    expect(() =>
      parseTargetConfig({ ...TARGET, paymentIdMensalidade: TARGET.paymentIdImplantacao })
    ).toThrow(/mutuamente distintos/)
  })

  it('leadId igual a cancellationRequestId é rejeitado (duplicação entre categorias diferentes)', () => {
    expect(() => parseTargetConfig({ ...TARGET, cancellationRequestId: TARGET.leadId })).toThrow(/mutuamente distintos/)
  })

  it('configuração válida com os 7 IDs distintos continua aceita', () => {
    expect(() => parseTargetConfig({ ...TARGET })).not.toThrow()
  })

  it('mensagem de erro de duplicação não contém os IDs sintéticos completos', () => {
    try {
      parseTargetConfig({ ...TARGET, expectedPartnerId: TARGET.companyId })
      expect.fail('deveria ter lançado erro')
    } catch (err) {
      const message = (err as Error).message
      expect(message).not.toContain(TARGET.companyId)
      expect(message).toContain('expectedPartnerId')
    }
  })
})

describe('loadTargetConfig — carrega a config de um arquivo local, nunca da config real', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'cleanup-config-test-'))
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  it('arquivo ausente: aborta com mensagem segura, sem conexão/transação/escrita', () => {
    const missingPath = join(tempDir, 'nao-existe.json')
    expect(() => loadTargetConfig(missingPath)).toThrow(/não encontrada/)
    // A mensagem inclui o CAMINHO (não sensível — é local ao filesystem do
    // operador), mas nunca dados de config (que nem chegaram a ser lidos).
    try {
      loadTargetConfig(missingPath)
    } catch (err) {
      const message = (err as Error).message
      expect(message).not.toContain(TARGET.companyId)
      expect(message).not.toContain(FAKE_CNPJ)
      expect(message).not.toContain(FAKE_EMAIL)
    }
  })

  it('JSON inválido: aborta com mensagem segura, não chega a parseTargetConfig', () => {
    const malformedPath = join(tempDir, 'malformado.json')
    writeFileSync(malformedPath, '{ "companyId": "x", isso não é json válido ]')
    expect(() => loadTargetConfig(malformedPath)).toThrow(/não é um JSON válido/)
  })

  it('JSON válido mas com campo faltando propaga o erro de parseTargetConfig (mesmo caminho de validação)', () => {
    const incompletePath = join(tempDir, 'incompleto.json')
    const { companyId, ...rest } = TARGET
    writeFileSync(incompletePath, JSON.stringify(rest))
    expect(() => loadTargetConfig(incompletePath)).toThrow(/companyId/)
  })

  it('config válida no arquivo é carregada corretamente', () => {
    const validPath = join(tempDir, 'valido.json')
    writeFileSync(validPath, JSON.stringify(TARGET))
    const loaded = loadTargetConfig(validPath)
    expect(loaded).toEqual(TARGET)
  })
})

describe('maskId / sha256 / buildConfirmPhrase', () => {
  it('maskId nunca devolve o ID completo para IDs longos', () => {
    const longId = 'company_fake_bem_comprido_para_mascarar'
    const masked = maskId(longId)
    expect(masked).not.toBe(longId)
    expect(masked).toContain('…')
  })

  it('maskId trata ausência com segurança', () => {
    expect(maskId(null)).toBe('(ausente)')
    expect(maskId(undefined)).toBe('(ausente)')
  })

  it('sha256 é determinístico e normaliza caixa/espaços', () => {
    expect(sha256('Teste@Exemplo.com')).toBe(sha256('teste@exemplo.com  '.trim().toLowerCase()))
  })

  it('buildConfirmPhrase inclui o companyId exato (frase difícil de acionar por engano)', () => {
    expect(buildConfirmPhrase(TARGET.companyId)).toBe(`APAGAR CONTRATACAO DE TESTE ${TARGET.companyId}`)
  })
})

describe('validateExecuteGuards — condições simultâneas do modo execute', () => {
  it('sem --execute, bloqueia', () => {
    const result = validateExecuteGuards([], { NODE_ENV: 'production' } as any, TARGET.companyId)
    expect(result.ok).toBe(false)
  })

  it('com --execute mas sem frase de confirmação, bloqueia', () => {
    const result = validateExecuteGuards(['--execute'], { NODE_ENV: 'production' } as any, TARGET.companyId)
    expect(result.ok).toBe(false)
  })

  it('com --execute e frase errada, bloqueia', () => {
    const result = validateExecuteGuards(['--execute', '--confirm=coisa errada'], { NODE_ENV: 'production' } as any, TARGET.companyId)
    expect(result.ok).toBe(false)
  })

  it('com --execute e frase certa mas sem ambiente Production reconhecido, bloqueia', () => {
    const result = validateExecuteGuards(
      ['--execute', `--confirm=${buildConfirmPhrase(TARGET.companyId)}`],
      { NODE_ENV: 'development' } as any,
      TARGET.companyId
    )
    expect(result.ok).toBe(false)
  })

  it('com todas as condições simultâneas (flag + frase + ambiente), libera', () => {
    const result = validateExecuteGuards(
      ['--execute', `--confirm=${buildConfirmPhrase(TARGET.companyId)}`],
      { NODE_ENV: 'production' } as any,
      TARGET.companyId
    )
    expect(result.ok).toBe(true)
  })

  it('CONFIRM_PRODUCTION_TARGET=1 também libera a condição de ambiente fora de NODE_ENV=production', () => {
    const result = validateExecuteGuards(
      ['--execute', `--confirm=${buildConfirmPhrase(TARGET.companyId)}`],
      { NODE_ENV: 'development', CONFIRM_PRODUCTION_TARGET: '1' } as any,
      TARGET.companyId
    )
    expect(result.ok).toBe(true)
  })

  it('frase de confirmação de OUTRO companyId não libera (evita apontar para empresa errada)', () => {
    const result = validateExecuteGuards(
      ['--execute', `--confirm=${buildConfirmPhrase('company_outro_qualquer')}`],
      { NODE_ENV: 'production' } as any,
      TARGET.companyId
    )
    expect(result.ok).toBe(false)
  })
})

describe('collectPreconditions — aborta em qualquer divergência', () => {
  it('estado totalmente válido → allOk true', async () => {
    const db = buildReadOnlyDb(fullyValidState())
    const { allOk } = await collectPreconditions(db, TARGET)
    expect(allOk).toBe(true)
  })

  it('Company.status !== cancelled → aborta', async () => {
    const state = fullyValidState()
    state.company = goodCompany({ status: 'active' })
    const { allOk, preconditions } = await collectPreconditions(buildReadOnlyDb(state), TARGET)
    expect(allOk).toBe(false)
    expect(preconditions.find(p => p.label.includes('cancelled'))?.ok).toBe(false)
  })

  it('Commission inesperada (count > 0) → aborta', async () => {
    const state = fullyValidState()
    state.zeroCounts = { commission: 1 }
    const { allOk, preconditions } = await collectPreconditions(buildReadOnlyDb(state), TARGET)
    expect(allOk).toBe(false)
    expect(preconditions.find(p => p.label === 'Commission = 0')?.ok).toBe(false)
  })

  it('registro dependente inesperado (Document > 0) → aborta', async () => {
    const state = fullyValidState()
    state.zeroCounts = { document: 2 }
    const { allOk, preconditions } = await collectPreconditions(buildReadOnlyDb(state), TARGET)
    expect(allOk).toBe(false)
    expect(preconditions.find(p => p.label === 'Document = 0')?.ok).toBe(false)
  })

  it('divergência de contagem de Payments (3 em vez de 2) → aborta', async () => {
    const state = fullyValidState()
    state.payments = [...goodPayments(), { id: 'payment_extra', companyId: TARGET.companyId, type: 'mensalidade', status: 'pending' }]
    const { allOk, preconditions } = await collectPreconditions(buildReadOnlyDb(state), TARGET)
    expect(allOk).toBe(false)
    expect(preconditions.find(p => p.label === 'Exatamente 2 Payments')?.ok).toBe(false)
  })

  it('Payment com ID inesperado (mesmo em número correto) → aborta', async () => {
    const state = fullyValidState()
    state.payments = [
      { id: 'payment_desconhecido', companyId: TARGET.companyId, type: 'implantacao', status: 'refunded' },
      goodPayments()[1],
    ]
    const { allOk, preconditions } = await collectPreconditions(buildReadOnlyDb(state), TARGET)
    expect(allOk).toBe(false)
    expect(preconditions.find(p => p.label.includes('IDs dos Payments'))?.ok).toBe(false)
  })

  it('CancellationRequest com ID inesperado → aborta', async () => {
    const state = fullyValidState()
    state.cancellationRequests = [{ id: 'cr_desconhecido', companyId: TARGET.companyId }]
    const { allOk, preconditions } = await collectPreconditions(buildReadOnlyDb(state), TARGET)
    expect(allOk).toBe(false)
    expect(preconditions.find(p => p.label.includes('CancellationRequest bate'))?.ok).toBe(false)
  })

  it('partnerId da Company diferente do esperado → aborta (protege o parceiro certo)', async () => {
    const state = fullyValidState()
    state.company = goodCompany({ partnerId: 'partner_outro' })
    const { allOk, preconditions } = await collectPreconditions(buildReadOnlyDb(state), TARGET)
    expect(allOk).toBe(false)
    expect(preconditions.find(p => p.label.includes('partnerId corresponde'))?.ok).toBe(false)
  })

  it('CNPJ divergente do hash esperado → aborta', async () => {
    const state = fullyValidState()
    state.company = goodCompany({ cnpj: '00000000000191' })
    const { allOk, preconditions } = await collectPreconditions(buildReadOnlyDb(state), TARGET)
    expect(allOk).toBe(false)
    expect(preconditions.find(p => p.label.includes('CNPJ confere'))?.ok).toBe(false)
  })

  it('Partner ativo com ZERO outras Companies/Leads → allOk continua true, aviso operacional é produzido, Partner não é tocado', async () => {
    const state = fullyValidState()
    state.partnerOtherCompanies = 0
    state.partnerOtherLeads = 0
    const db = buildReadOnlyDb(state)
    const result = await collectPreconditions(db, TARGET)
    expect(result.allOk).toBe(true)
    expect(result.otherCompaniesCount).toBe(0)
    expect(result.otherLeadsCount).toBe(0)
    expect(result.partnerWillHaveNoLinkedRecordsAfterCleanup).toBe(true)
    expect(result.warnings).toEqual([
      'O parceiro permanecerá ativo, mas ficará sem Companies ou Leads vinculados após a limpeza.',
    ])
    expect(db.$transaction).not.toHaveBeenCalled()
  })

  it('Partner ativo com outra Company além da alvo → allOk true, sem aviso de "ficará vazio"', async () => {
    const state = fullyValidState()
    state.partnerOtherCompanies = 1
    state.partnerOtherLeads = 0
    const result = await collectPreconditions(buildReadOnlyDb(state), TARGET)
    expect(result.allOk).toBe(true)
    expect(result.partnerWillHaveNoLinkedRecordsAfterCleanup).toBe(false)
    expect(result.warnings).toEqual([])
  })

  it('Partner ativo com outro Lead além do alvo → allOk true, sem aviso de "ficará vazio"', async () => {
    const state = fullyValidState()
    state.partnerOtherCompanies = 0
    state.partnerOtherLeads = 1
    const result = await collectPreconditions(buildReadOnlyDb(state), TARGET)
    expect(result.allOk).toBe(true)
    expect(result.partnerWillHaveNoLinkedRecordsAfterCleanup).toBe(false)
    expect(result.warnings).toEqual([])
  })

  it('Partner ausente → aborta', async () => {
    const state = fullyValidState()
    state.partner = null
    const { allOk, preconditions } = await collectPreconditions(buildReadOnlyDb(state), TARGET)
    expect(allOk).toBe(false)
    expect(preconditions.find(p => p.label === 'Parceiro existe e está active')?.ok).toBe(false)
  })

  it('Partner inactive → aborta', async () => {
    const state = fullyValidState()
    state.partner = { id: TARGET.expectedPartnerId, status: 'inactive' }
    const { allOk, preconditions } = await collectPreconditions(buildReadOnlyDb(state), TARGET)
    expect(allOk).toBe(false)
    expect(preconditions.find(p => p.label === 'Parceiro existe e está active')?.ok).toBe(false)
  })

  it('Lead vinculado a um Partner divergente do esperado → aborta', async () => {
    const state = fullyValidState()
    state.lead = goodLead({ partnerId: 'partner_outro_qualquer' })
    const { allOk, preconditions } = await collectPreconditions(buildReadOnlyDb(state), TARGET)
    expect(allOk).toBe(false)
    expect(preconditions.find(p => p.label.includes('Lead.partnerId corresponde'))?.ok).toBe(false)
  })

  it('EligibilityAssessment ausente (0 vinculados ao Lead) → aborta', async () => {
    const state = fullyValidState()
    state.eligibilityAssessments = []
    const { allOk, preconditions } = await collectPreconditions(buildReadOnlyDb(state), TARGET)
    expect(allOk).toBe(false)
    expect(preconditions.find(p => p.label === 'Exatamente 1 EligibilityAssessment vinculado ao Lead')?.ok).toBe(false)
  })

  it('EligibilityAssessment com ID inesperado (mas leadId correto) → aborta na checagem de ID', async () => {
    const state = fullyValidState()
    state.eligibilityAssessments = [goodEligibilityAssessment({ id: 'assessment_desconhecido' })]
    const { allOk, preconditions } = await collectPreconditions(buildReadOnlyDb(state), TARGET)
    expect(allOk).toBe(false)
    expect(preconditions.find(p => p.label === 'Exatamente 1 EligibilityAssessment vinculado ao Lead')?.ok).toBe(true)
    expect(preconditions.find(p => p.label === 'ID do EligibilityAssessment bate com o esperado')?.ok).toBe(false)
  })

  it('dois EligibilityAssessments vinculados ao mesmo Lead → aborta', async () => {
    const state = fullyValidState()
    state.eligibilityAssessments = [goodEligibilityAssessment(), goodEligibilityAssessment({ id: 'assessment_extra' })]
    const { allOk, preconditions } = await collectPreconditions(buildReadOnlyDb(state), TARGET)
    expect(allOk).toBe(false)
    expect(preconditions.find(p => p.label === 'Exatamente 1 EligibilityAssessment vinculado ao Lead')?.ok).toBe(false)
  })

  it('ContactRequest = 0 vinculado ao Lead → aprovado', async () => {
    const state = fullyValidState()
    state.contactRequestCount = 0
    const { allOk, preconditions } = await collectPreconditions(buildReadOnlyDb(state), TARGET)
    expect(allOk).toBe(true)
    expect(preconditions.find(p => p.label === 'ContactRequest vinculado ao Lead = 0')?.ok).toBe(true)
  })

  it('ContactRequest > 0 vinculado ao Lead → reprova (nenhuma limpeza pode ocorrer)', async () => {
    const state = fullyValidState()
    state.contactRequestCount = 2
    const { allOk, preconditions, contactRequestCount } = await collectPreconditions(buildReadOnlyDb(state), TARGET)
    expect(allOk).toBe(false)
    expect(preconditions.find(p => p.label === 'ContactRequest vinculado ao Lead = 0')?.ok).toBe(false)
    expect(contactRequestCount).toBe(2)
  })

  it('nunca chama nenhum método de escrita (db somente-leitura não tem deleteMany/$transaction usável)', async () => {
    const db = buildReadOnlyDb(fullyValidState())
    await collectPreconditions(db, TARGET)
    expect(db.$transaction).not.toHaveBeenCalled()
  })
})

describe('dryRun — nunca escreve, mesmo com estado válido', () => {
  it('não chama $transaction nem qualquer delete, mesmo quando todas as precondições passam', async () => {
    const db = buildReadOnlyDb(fullyValidState())
    await expect(dryRun(db, TARGET)).resolves.toBeUndefined()
    expect(db.$transaction).not.toHaveBeenCalled()
  })

  it('relata os registros que seriam removidos com IDs mascarados, nunca completos', async () => {
    const db = buildReadOnlyDb(fullyValidState())
    await dryRun(db, TARGET)
    const logged = consoleLogSpy.mock.calls.flat().join('\n')
    expect(logged).not.toContain(TARGET.companyId)
    expect(logged).not.toContain(TARGET.leadId)
    expect(logged).not.toContain(FAKE_CNPJ)
    expect(logged).not.toContain(FAKE_EMAIL)
    expect(logged).toContain('Nenhuma escrita foi realizada')
  })

  it('com zero outras Companies/Leads do parceiro: NÃO reprova o dry-run, exibe aviso mascarado, continua sem escrita', async () => {
    const state = fullyValidState()
    state.partnerOtherCompanies = 0
    state.partnerOtherLeads = 0
    const db = buildReadOnlyDb(state)
    await dryRun(db, TARGET)
    const logged = consoleLogSpy.mock.calls.flat().join('\n')
    expect(logged).toContain('Precondições aprovadas: sim')
    expect(logged).toContain('O parceiro permanecerá ativo, mas ficará sem Companies ou Leads vinculados após a limpeza.')
    expect(logged).not.toContain(TARGET.companyId)
    expect(logged).not.toContain(TARGET.expectedPartnerId)
    expect(db.$transaction).not.toHaveBeenCalled()
  })

  it('com outra Company/Lead do parceiro presentes: não exibe o aviso de "ficará vazio"', async () => {
    const db = buildReadOnlyDb(fullyValidState())
    await dryRun(db, TARGET)
    const logged = consoleLogSpy.mock.calls.flat().join('\n')
    expect(logged).not.toContain('ficará sem Companies ou Leads vinculados')
  })

  it('com divergência, aborta e não lista registros a remover', async () => {
    const state = fullyValidState()
    state.company = goodCompany({ status: 'active' })
    const db = buildReadOnlyDb(state)
    await dryRun(db, TARGET)
    const logged = consoleLogSpy.mock.calls.flat().join('\n')
    expect(logged).toContain('Divergência detectada')
    expect(logged).not.toContain('SERIAM removidos')
  })

  it('relata contagens de EligibilityAssessment/ContactRequest, sem expor conteúdo da avaliação nem ID completo', async () => {
    const db = buildReadOnlyDb(fullyValidState())
    await dryRun(db, TARGET)
    const logged = consoleLogSpy.mock.calls.flat().join('\n')
    expect(logged).toContain('EligibilityAssessment esperado encontrado: sim')
    expect(logged).toContain('Total de EligibilityAssessments do Lead: 1')
    expect(logged).toContain('ContactRequests vinculados ao Lead: 0')
    expect(logged).toContain('ContactRequest zero: aprovado')
    expect(logged).not.toContain(TARGET.eligibilityAssessmentId)
    expect(logged).not.toContain('eligible')
    expect(logged).not.toContain('cnae')
  })

  it('com ContactRequest > 0, relata "reprovado" e a contagem real', async () => {
    const state = fullyValidState()
    state.contactRequestCount = 3
    const db = buildReadOnlyDb(state)
    await dryRun(db, TARGET)
    const logged = consoleLogSpy.mock.calls.flat().join('\n')
    expect(logged).toContain('ContactRequests vinculados ao Lead: 3')
    expect(logged).toContain('ContactRequest zero: reprovado')
    expect(logged).toContain('Precondições aprovadas: não')
  })
})

describe('execute — bloqueios e transação', () => {
  it('sem confirmação explícita, aborta antes de tocar no banco', async () => {
    const db = buildReadOnlyDb(fullyValidState())
    await expect(execute(db, TARGET, ['node', 'script.ts'], { NODE_ENV: 'production' } as any)).rejects.toThrow('Execução bloqueada')
    expect(db.company.findMany).not.toHaveBeenCalled()
    expect(db.$transaction).not.toHaveBeenCalled()
  })

  it('com ambiente não reconhecido, aborta antes de tocar no banco', async () => {
    const db = buildReadOnlyDb(fullyValidState())
    const argv = ['node', 'script.ts', '--execute', `--confirm=${buildConfirmPhrase(TARGET.companyId)}`]
    await expect(execute(db, TARGET, argv, { NODE_ENV: 'development' } as any)).rejects.toThrow('Execução bloqueada')
    expect(db.company.findMany).not.toHaveBeenCalled()
  })

  it('com confirmação mas precondições divergentes, aborta sem chamar $transaction', async () => {
    const state = fullyValidState()
    state.company = goodCompany({ status: 'active' })
    const db = buildReadOnlyDb(state)
    const argv = ['node', 'script.ts', '--execute', `--confirm=${buildConfirmPhrase(TARGET.companyId)}`]
    await expect(execute(db, TARGET, argv, { NODE_ENV: 'production' } as any)).rejects.toThrow('Precondições falharam')
    expect(db.$transaction).not.toHaveBeenCalled()
  })

  it('com ContactRequest > 0 vinculado ao Lead, aborta sem chamar $transaction (nenhuma limpeza pode ocorrer)', async () => {
    const state = fullyValidState()
    state.contactRequestCount = 1
    const db = buildReadOnlyDb(state)
    const argv = ['node', 'script.ts', '--execute', `--confirm=${buildConfirmPhrase(TARGET.companyId)}`]
    await expect(execute(db, TARGET, argv, { NODE_ENV: 'production' } as any)).rejects.toThrow('Precondições falharam')
    expect(db.$transaction).not.toHaveBeenCalled()
  })
})

describe('runCleanupTransaction — lock do Lead, revalidação de ContactRequest, ordem e rollback', () => {
  function buildTxSpies(
    overrides: Partial<Record<'payment' | 'cancellationRequest' | 'company' | 'eligibilityAssessment' | 'lead', number>> = {},
    options: { lockRows?: number; contactRequestCount?: number } = {}
  ) {
    const calls: string[] = []
    const tx = {
      $queryRaw: vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
        calls.push('lock')
        const rowCount = options.lockRows ?? 1
        return Array.from({ length: rowCount }, () => ({ id: values[0] as string }))
      }),
      payment: {
        deleteMany: vi.fn(async (args: any) => {
          calls.push('payment')
          expect(args.where.companyId).toBe(TARGET.companyId)
          expect(args.where.id.in).toEqual([TARGET.paymentIdImplantacao, TARGET.paymentIdMensalidade])
          return { count: overrides.payment ?? 2 }
        }),
      },
      cancellationRequest: {
        deleteMany: vi.fn(async (args: any) => {
          calls.push('cancellationRequest')
          expect(args.where.id).toBe(TARGET.cancellationRequestId)
          expect(args.where.companyId).toBe(TARGET.companyId)
          return { count: overrides.cancellationRequest ?? 1 }
        }),
      },
      company: {
        deleteMany: vi.fn(async (args: any) => {
          calls.push('company')
          expect(args.where).toEqual({ id: TARGET.companyId })
          return { count: overrides.company ?? 1 }
        }),
      },
      eligibilityAssessment: {
        deleteMany: vi.fn(async (args: any) => {
          calls.push('eligibilityAssessment')
          expect(args.where.id).toBe(TARGET.eligibilityAssessmentId)
          expect(args.where.leadId).toBe(TARGET.leadId)
          return { count: overrides.eligibilityAssessment ?? 1 }
        }),
      },
      contactRequest: {
        count: vi.fn(async (args: any) => {
          calls.push('contactRequestCount')
          expect(args.where).toEqual({ leadId: TARGET.leadId })
          return options.contactRequestCount ?? 0
        }),
      },
      lead: {
        deleteMany: vi.fn(async (args: any) => {
          calls.push('lead')
          expect(args.where).toEqual({ id: TARGET.leadId })
          return { count: overrides.lead ?? 1 }
        }),
      },
    }
    return { tx, calls }
  }

  const FULL_ORDER = ['lock', 'payment', 'cancellationRequest', 'company', 'eligibilityAssessment', 'contactRequestCount', 'lead']

  describe('A) Lock do Lead (FOR UPDATE)', () => {
    it('o lock é a PRIMEIRA operação da transação, antes de qualquer delete', async () => {
      const { tx, calls } = buildTxSpies()
      const db = { $transaction: vi.fn(async (fn: any) => fn(tx)) } as unknown as CleanupPrismaClient
      await runCleanupTransaction(db, TARGET)
      expect(calls[0]).toBe('lock')
      expect(calls).toEqual(FULL_ORDER)
    })

    it('a query usa FOR UPDATE', async () => {
      const { tx } = buildTxSpies()
      const db = { $transaction: vi.fn(async (fn: any) => fn(tx)) } as unknown as CleanupPrismaClient
      await runCleanupTransaction(db, TARGET)
      const [strings] = (tx.$queryRaw as any).mock.calls[0]
      expect(strings.join('')).toContain('FOR UPDATE')
      expect(strings.join('')).toContain('"leads"')
    })

    it('a query é parametrizada — o leadId vai como valor interpolado, nunca concatenado nas strings literais', async () => {
      const { tx } = buildTxSpies()
      const db = { $transaction: vi.fn(async (fn: any) => fn(tx)) } as unknown as CleanupPrismaClient
      await runCleanupTransaction(db, TARGET)
      const [strings, ...values] = (tx.$queryRaw as any).mock.calls[0]
      expect(values).toEqual([TARGET.leadId])
      for (const part of strings) {
        expect(part).not.toContain(TARGET.leadId)
      }
    })

    it('não existe uso de $queryRawUnsafe/$executeRawUnsafe no arquivo-fonte (só menção em comentário de aviso é permitida)', () => {
      const source = require('fs').readFileSync(
        require('path').join(__dirname, 'cleanup-legacy-test-contract.ts'),
        'utf8'
      )
      // Verifica a INVOCAÇÃO real (chamada de método, com parênteses abrindo
      // logo em seguida) — não apenas a menção textual, que aparece de
      // propósito num comentário explicando o que nunca deve ser usado.
      expect(source).not.toMatch(/\$queryRawUnsafe\s*\(/)
      expect(source).not.toMatch(/\$executeRawUnsafe\s*\(/)
    })

    it('exatamente 1 Lead bloqueado permite continuar (fluxo completo)', async () => {
      const { tx, calls } = buildTxSpies({}, { lockRows: 1 })
      const db = { $transaction: vi.fn(async (fn: any) => fn(tx)) } as unknown as CleanupPrismaClient
      await runCleanupTransaction(db, TARGET)
      expect(calls).toEqual(FULL_ORDER)
    })

    it('0 Leads bloqueados aborta ANTES de qualquer delete', async () => {
      const { tx, calls } = buildTxSpies({}, { lockRows: 0 })
      const db = { $transaction: vi.fn(async (fn: any) => fn(tx)) } as unknown as CleanupPrismaClient
      await expect(runCleanupTransaction(db, TARGET)).rejects.toThrow('Esperava bloquear 1 Lead')
      expect(calls).toEqual(['lock'])
      expect(tx.payment.deleteMany).not.toHaveBeenCalled()
      expect(tx.cancellationRequest.deleteMany).not.toHaveBeenCalled()
      expect(tx.company.deleteMany).not.toHaveBeenCalled()
      expect(tx.eligibilityAssessment.deleteMany).not.toHaveBeenCalled()
      expect(tx.contactRequest.count).not.toHaveBeenCalled()
      expect(tx.lead.deleteMany).not.toHaveBeenCalled()
    })

    it('mais de 1 linha bloqueada (simulável no stub) aborta antes de qualquer delete', async () => {
      const { tx, calls } = buildTxSpies({}, { lockRows: 2 })
      const db = { $transaction: vi.fn(async (fn: any) => fn(tx)) } as unknown as CleanupPrismaClient
      await expect(runCleanupTransaction(db, TARGET)).rejects.toThrow('Esperava bloquear 1 Lead')
      expect(calls).toEqual(['lock'])
      expect(tx.payment.deleteMany).not.toHaveBeenCalled()
    })
  })

  describe('B) Corrida de ContactRequest — revalidação atômica dentro da transação', () => {
    it('precondição externa ContactRequest=0, mas count transacional=1 (surgiu durante a transação): lança erro, lead.deleteMany NUNCA é chamado, nada persiste', async () => {
      const { tx, calls } = buildTxSpies({}, { contactRequestCount: 1 })
      const db = { $transaction: vi.fn(async (fn: any) => fn(tx)) } as unknown as CleanupPrismaClient

      await expect(runCleanupTransaction(db, TARGET)).rejects.toThrow('ContactRequest vinculado ao Lead surgiu durante a transação')
      expect(calls).toEqual(['lock', 'payment', 'cancellationRequest', 'company', 'eligibilityAssessment', 'contactRequestCount'])
      expect(tx.lead.deleteMany).not.toHaveBeenCalled()
    })
  })

  describe('C) Caminho aprovado', () => {
    it('lock aprovado + count transacional=0: ordem completa executada, Lead deletado só depois da revalidação', async () => {
      const { tx, calls } = buildTxSpies({}, { lockRows: 1, contactRequestCount: 0 })
      const db = { $transaction: vi.fn(async (fn: any) => fn(tx)) } as unknown as CleanupPrismaClient

      await runCleanupTransaction(db, TARGET)

      expect(calls).toEqual(FULL_ORDER)
      expect(calls.indexOf('contactRequestCount')).toBeLessThan(calls.indexOf('lead'))
      expect(tx.lead.deleteMany).toHaveBeenCalledTimes(1)
    })
  })

  describe('D) Escopo — Partner e ContactRequest nunca sofrem operação destrutiva', () => {
    it('nunca chama partner.deleteMany (partner sequer existe no objeto tx)', async () => {
      const { tx } = buildTxSpies()
      expect((tx as any).partner).toBeUndefined()
      const db = { $transaction: vi.fn(async (fn: any) => fn(tx)) } as unknown as CleanupPrismaClient
      await runCleanupTransaction(db, TARGET)
    })

    it('ContactRequest nunca recebe delete nem update (só "count" existe no objeto tx)', async () => {
      const { tx } = buildTxSpies()
      expect((tx.contactRequest as any).deleteMany).toBeUndefined()
      expect((tx.contactRequest as any).delete).toBeUndefined()
      expect((tx.contactRequest as any).update).toBeUndefined()
      expect((tx.contactRequest as any).updateMany).toBeUndefined()
      const db = { $transaction: vi.fn(async (fn: any) => fn(tx)) } as unknown as CleanupPrismaClient
      await runCleanupTransaction(db, TARGET)
    })

    it('a contagem de ContactRequest usa filtro exato — nunca um where amplo', async () => {
      const { tx } = buildTxSpies()
      const db = { $transaction: vi.fn(async (fn: any) => fn(tx)) } as unknown as CleanupPrismaClient
      await runCleanupTransaction(db, TARGET)
      const where = (tx.contactRequest.count as any).mock.calls[0][0].where
      expect(where).toEqual({ leadId: TARGET.leadId })
    })
  })

  it('só usa deleteMany com id/companyId/leadId exatos — nunca deleteMany amplo por partnerId', async () => {
    const { tx } = buildTxSpies()
    const db = { $transaction: vi.fn(async (fn: any) => fn(tx)) } as unknown as CleanupPrismaClient
    await runCleanupTransaction(db, TARGET)
    const leadWhere = (tx.lead.deleteMany as any).mock.calls[0][0].where
    expect(leadWhere).not.toHaveProperty('partnerId')
    expect(leadWhere).not.toHaveProperty('cnpj')
    const companyWhere = (tx.company.deleteMany as any).mock.calls[0][0].where
    expect(companyWhere).not.toHaveProperty('partnerId')
    const assessmentWhere = (tx.eligibilityAssessment.deleteMany as any).mock.calls[0][0].where
    expect(Object.keys(assessmentWhere).sort()).toEqual(['id', 'leadId'])
  })

  it('contagem de Payments deletados diferente de 2 → lança erro (contrato de rollback: $transaction do Prisma desfaz tudo se o callback rejeitar)', async () => {
    const { tx, calls } = buildTxSpies({ payment: 1 })
    const db = { $transaction: vi.fn(async (fn: any) => fn(tx)) } as unknown as CleanupPrismaClient

    await expect(runCleanupTransaction(db, TARGET)).rejects.toThrow('Esperava excluir 2 Payments')
    expect(calls).toEqual(['lock', 'payment'])
    expect(tx.cancellationRequest.deleteMany).not.toHaveBeenCalled()
    expect(tx.company.deleteMany).not.toHaveBeenCalled()
    expect(tx.eligibilityAssessment.deleteMany).not.toHaveBeenCalled()
    expect(tx.contactRequest.count).not.toHaveBeenCalled()
    expect(tx.lead.deleteMany).not.toHaveBeenCalled()
  })

  it('contagem de Company deletada diferente de 1 → lança erro após Payment/CancellationRequest já terem sido chamados (prova que o erro é detectado e propagado para o Prisma reverter)', async () => {
    const { tx, calls } = buildTxSpies({ company: 0 })
    const db = { $transaction: vi.fn(async (fn: any) => fn(tx)) } as unknown as CleanupPrismaClient

    await expect(runCleanupTransaction(db, TARGET)).rejects.toThrow('Esperava excluir 1 Company')
    expect(calls).toEqual(['lock', 'payment', 'cancellationRequest', 'company'])
    expect(tx.eligibilityAssessment.deleteMany).not.toHaveBeenCalled()
    expect(tx.contactRequest.count).not.toHaveBeenCalled()
    expect(tx.lead.deleteMany).not.toHaveBeenCalled()
  })

  it('contagem de EligibilityAssessment deletado diferente de 1 → lança erro e o Lead NUNCA é tentado (mesma falha real já ocorrida em produção, agora coberta)', async () => {
    const { tx, calls } = buildTxSpies({ eligibilityAssessment: 0 })
    const db = { $transaction: vi.fn(async (fn: any) => fn(tx)) } as unknown as CleanupPrismaClient

    await expect(runCleanupTransaction(db, TARGET)).rejects.toThrow('Esperava excluir 1 EligibilityAssessment')
    expect(calls).toEqual(['lock', 'payment', 'cancellationRequest', 'company', 'eligibilityAssessment'])
    expect(tx.contactRequest.count).not.toHaveBeenCalled()
    expect(tx.lead.deleteMany).not.toHaveBeenCalled()
  })

  it('EligibilityAssessment é deletado por id + leadId simultaneamente (nunca só por leadId)', async () => {
    const { tx } = buildTxSpies()
    const db = { $transaction: vi.fn(async (fn: any) => fn(tx)) } as unknown as CleanupPrismaClient
    await runCleanupTransaction(db, TARGET)
    const where = (tx.eligibilityAssessment.deleteMany as any).mock.calls[0][0].where
    expect(where).toEqual({ id: TARGET.eligibilityAssessmentId, leadId: TARGET.leadId })
  })

  it('Lead de outra contratação nunca é alvo — where do delete usa somente o leadId exato do TARGET', async () => {
    const { tx } = buildTxSpies()
    const db = { $transaction: vi.fn(async (fn: any) => fn(tx)) } as unknown as CleanupPrismaClient
    await runCleanupTransaction(db, TARGET)
    expect((tx.lead.deleteMany as any).mock.calls[0][0].where.id).toBe(TARGET.leadId)
    expect((tx.lead.deleteMany as any).mock.calls[0][0].where.id).not.toBe('outro_lead_qualquer')
  })
})
