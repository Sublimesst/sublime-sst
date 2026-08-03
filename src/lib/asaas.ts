// ═══════════════════════════════════════════════════════════
// SUBLIME SST — Adapter Asaas (Pagamentos)
// MOCK ativo até configuração das credenciais reais
// Para ativar: configure ASAAS_API_KEY no .env.local
// ═══════════════════════════════════════════════════════════

const ASAAS_BASE_URL = process.env.ASAAS_BASE_URL ?? 'https://sandbox.asaas.com/api/v3'
const ASAAS_API_KEY = process.env.ASAAS_API_KEY ?? ''
const IS_MOCK = !ASAAS_API_KEY || ASAAS_API_KEY.startsWith('$aact_SuaChave')

// Forma de pagamento da assinatura recorrente. UNDEFINED = cliente escolhe
// na Asaas (mesmo padrão já usado na cobrança de implantação); a partir do
// 1º pagamento a forma escolhida se repete nos ciclos seguintes. Configurável
// porque o comportamento pode depender de recursos habilitados na conta Asaas.
const SUBSCRIPTION_BILLING_TYPE =
  (process.env.ASAAS_SUBSCRIPTION_BILLING_TYPE as CreateChargeParams['billingType']) ?? 'UNDEFINED'

// Parâmetros de mora — devem ser IDÊNTICOS à Cláusula 4ª do /termos ("multa de
// 2%... e juros de mora de 1% ao mês, pro rata die"). Fonte única aqui: mudar
// o contrato exige mudar aqui também, nunca duplicar o número em outro lugar.
const MORA_MULTA_PERCENTUAL = 2
const MORA_JUROS_PERCENTUAL_MES = 1

interface AsaasMoraCharges {
  fine: { value: number; type: 'PERCENTAGE' }
  interest: { value: number }
}

// Aplicada em toda cobrança/assinatura criada — nunca em desconto (não pedido
// pelo contrato). `fine.type: 'PERCENTAGE'` é explícito mesmo sendo o default
// da Asaas, para não depender de um comportamento implícito da API.
export function moraCharges(): AsaasMoraCharges {
  return {
    fine:     { value: MORA_MULTA_PERCENTUAL, type: 'PERCENTAGE' },
    interest: { value: MORA_JUROS_PERCENTUAL_MES },
  }
}

interface AsaasCustomer {
  id: string
  name: string
  cpfCnpj: string
  email: string
  mobilePhone: string
}

// Fonte única dos billingTypes aceitos pela API e já usados pelo projeto na
// criação de cobranças/assinatura — reutilizada também na validação do GET
// antes do PUT de callback, nunca duplicada em uma lista paralela.
export type AsaasBillingType = 'BOLETO' | 'PIX' | 'CREDIT_CARD' | 'UNDEFINED'

export interface AsaasCharge {
  id: string
  status: string
  value: number
  dueDate: string
  billingType?: string
  invoiceUrl: string
  bankSlipUrl?: string
  pixQrCodeId?: string
  invoiceNumber: string
}

interface AsaasSubscription {
  id: string
  status: string
  value: number
  nextDueDate: string
  cycle: string
}

interface CreateChargeParams {
  customer: string
  value: number
  dueDate: string
  description: string
  billingType?: AsaasBillingType
  externalReference?: string
}

// Log de alerta quando uma operação real cai em modo mock. Em produção isso
// nunca deveria acontecer — vira console.error (alto) em vez do warn de dev,
// para não mascarar silenciosamente uma ASAAS_API_KEY ausente na Vercel.
function warnMock(fnName: string) {
  if (process.env.NODE_ENV === 'production') {
    console.error(`[ASAAS] ASAAS_API_KEY ausente/inválida em PRODUÇÃO — ${fnName} rodando em modo mock. Nenhuma cobrança real foi criada.`)
  } else {
    console.warn(`[ASAAS MOCK] ${fnName} — configure ASAAS_API_KEY para usar produção`)
  }
}

// ── MOCK RESPONSES ────────────────────────────────────────────
function mockCustomer(cnpj: string, name: string): AsaasCustomer {
  return {
    id: `cus_mock_${Date.now()}`,
    name,
    cpfCnpj: cnpj.replace(/\D/g, ''),
    email: '',
    mobilePhone: '',
  }
}

function mockCharge(value: number): AsaasCharge {
  const id = `pay_mock_${Date.now()}`
  return {
    id,
    status: 'PENDING',
    value,
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    invoiceUrl: `https://sandbox.asaas.com/i/${id}`,
    bankSlipUrl: `https://sandbox.asaas.com/b/${id}`,
    invoiceNumber: `MOCK-${Date.now()}`,
  }
}

function mockSubscription(value: number): AsaasSubscription {
  return {
    id: `sub_mock_${Date.now()}`,
    status: 'ACTIVE',
    value,
    nextDueDate: new Date().toISOString().split('T')[0],
    cycle: 'MONTHLY',
  }
}

// Erro estruturado da Asaas — preserva a MESMA `.message` que o `Error` genérico
// de antes (nenhum chamador existente que só lê `.message` percebe diferença),
// mas expõe `httpStatus`/`body` como propriedades para quem precisa reagir de
// forma estruturada (hoje só configurePaymentCallback) sem ter que reanalisar
// a string da mensagem.
class AsaasApiError extends Error {
  readonly httpStatus: number
  readonly body: unknown
  constructor(httpStatus: number, body: unknown) {
    super(`Asaas API error ${httpStatus}: ${JSON.stringify(body)}`)
    this.name = 'AsaasApiError'
    this.httpStatus = httpStatus
    this.body = body
  }
}

// ── ASAAS API CALLS ───────────────────────────────────────────
async function asaasFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${ASAAS_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      access_token: ASAAS_API_KEY,
      ...options.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new AsaasApiError(res.status, err)
  }
  return res.json()
}

// ── PUBLIC API ────────────────────────────────────────────────
export async function createOrFindCustomer(params: {
  cnpj: string
  name: string
  email: string
  phone: string
}): Promise<AsaasCustomer> {
  if (IS_MOCK) {
    warnMock('createOrFindCustomer')
    return mockCustomer(params.cnpj, params.name)
  }

  const cpfCnpj = params.cnpj.replace(/\D/g, '')

  // Busca real por CNPJ antes de criar — evita duplicar customer na Asaas
  // em reenvios/retries do formulário de cadastro.
  const existing = await asaasFetch<{ data: AsaasCustomer[] }>(`/customers?cpfCnpj=${cpfCnpj}`)
  if (existing.data.length > 0) {
    return existing.data[0]
  }

  return asaasFetch<AsaasCustomer>('/customers', {
    method: 'POST',
    body: JSON.stringify({
      name: params.name,
      cpfCnpj,
      email: params.email,
      mobilePhone: params.phone.replace(/\D/g, ''),
      notificationDisabled: false,
    }),
  })
}

export async function createImplantacaoCharge(params: {
  customerId: string
  isPromo: boolean
  ltcatAddon: boolean
  companyId: string
  cnpj: string
  amount: number   // em reais (não centavos) — já inclui o LTCAT quando `ltcatAddon: true`
  planLabel: string
}): Promise<AsaasCharge> {
  const value = params.amount

  if (IS_MOCK) {
    warnMock('createImplantacaoCharge')
    return mockCharge(value)
  }

  const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]

  const descPromo = params.isPromo ? ' Promocional' : ''
  const descLtcat = params.ltcatAddon ? ' + LTCAT' : ''
  const valorFmt = value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return asaasFetch<AsaasCharge>('/payments', {
    method: 'POST',
    body: JSON.stringify({
      customer: params.customerId,
      billingType: 'UNDEFINED',
      value,
      dueDate,
      description: `Sublime ${params.planLabel} — Implantação${descPromo}${descLtcat} (${valorFmt})`,
      externalReference: params.companyId,
      ...moraCharges(),
    }),
  })
}

export async function createSubscription(params: {
  customerId: string
  companyId: string
  value: number   // em reais (não centavos) — mensalidade do plano/faixa
  planLabel: string
}): Promise<AsaasSubscription> {
  if (IS_MOCK) {
    warnMock('createSubscription')
    return mockSubscription(params.value)
  }

  // Primeira cobrança da assinatura vence HOJE (data da contratação) — é a
  // 1ª mensalidade, cobrada no ato junto da implantação, não uma cobrança
  // avulsa separada. Documentado pela própria Asaas: informar nextDueDate
  // como a data atual faz a 1ª cobrança sair na criação da assinatura.
  // Sem relação com a carência de 30 dias da Commission (calculada à parte,
  // a partir da confirmação do pagamento — ver webhook/asaas/route.ts).
  const nextDueDate = new Date().toISOString().split('T')[0]

  return asaasFetch<AsaasSubscription>('/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      customer: params.customerId,
      billingType: SUBSCRIPTION_BILLING_TYPE,
      value: params.value,
      nextDueDate,
      cycle: 'MONTHLY',
      description: `Sublime ${params.planLabel} — Mensalidade`,
      externalReference: params.companyId,
      ...moraCharges(),
    }),
  })
}

export async function getCharge(chargeId: string): Promise<AsaasCharge> {
  if (IS_MOCK) {
    return mockCharge(190)
  }
  return asaasFetch<AsaasCharge>(`/payments/${encodeURIComponent(chargeId)}`)
}

// Lista as cobranças já geradas por uma assinatura (GET /subscriptions/{id}/payments).
// Somente leitura — nunca cria cobrança nova. Usado logo após a criação da
// assinatura, quando se espera só a 1ª cobrança — sem paginação de propósito
// (o limit já cobre a janela real de uso; se reaproveitado em assinatura com
// histórico extenso, paginar fica para uma etapa futura).
export async function listSubscriptionPayments(subscriptionId: string): Promise<AsaasCharge[]> {
  if (IS_MOCK) {
    // Modo mock: nenhuma cobrança real foi criada na Asaas, então não há o
    // que listar — devolver vazio é o único resultado honesto e não diverge
    // por faixa/plano (um valor fixo divergiria da mensalidade real de cada
    // faixa). Testes controlam o comportamento via vi.mock, não por aqui.
    return []
  }
  const res = await asaasFetch<{ data: AsaasCharge[] }>(
    `/subscriptions/${encodeURIComponent(subscriptionId)}/payments?limit=20`
  )
  return res.data
}

// Cancela a assinatura recorrente (DELETE /subscriptions/{id}). A Asaas
// retorna 404 tanto para "já cancelada" quanto "nunca existiu" — os dois
// casos já são o estado desejado (sem cobrança futura), então são tratados
// como sucesso, não erro. Só propaga exceção pra falha de verdade (rede,
// 401, 400 etc.), pra quem chama saber que a assinatura AINDA está ativa.
export async function cancelSubscription(subscriptionId: string): Promise<{ alreadyCancelled: boolean }> {
  if (IS_MOCK) {
    warnMock('cancelSubscription')
    return { alreadyCancelled: false }
  }

  const res = await fetch(`${ASAAS_BASE_URL}/subscriptions/${subscriptionId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      access_token: ASAAS_API_KEY,
    },
  })

  if (res.status === 404) {
    return { alreadyCancelled: true }
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Asaas API error ${res.status}: ${JSON.stringify(err)}`)
  }
  return { alreadyCancelled: false }
}

export const isAsaasMock = IS_MOCK

// ── CALLBACK DE CONTINUAÇÃO (Etapa 2B.1) ──────────────────────
// Best-effort: configura o retorno automático da Asaas para a página de
// continuação (/cadastro/continuar) em uma cobrança JÁ CRIADA — nunca cria
// cobrança, nunca mexe em assinatura (o `callback` da assinatura vazaria
// para todos os ciclos futuros). Falha aqui nunca deve derrubar o cadastro:
// esta função nunca lança, só devolve um resultado estruturado.

const CALLBACK_URL = 'https://www.sublimesst.com/cadastro/continuar'
const CALLBACK_PATH = '/cadastro/continuar'
const CALLBACK_OFFICIAL_HOSTS = new Set(['sublimesst.com', 'www.sublimesst.com'])
const ASAAS_PROD_HOSTNAME = 'api.asaas.com'
const ASAAS_PROD_PATH = '/v3'

// Valida a forma da URL final antes de ela ir para qualquer payload — defesa
// extra mesmo sendo hoje uma constante fixa (protege uma futura edição
// acidental da constante, ex.: query string ou porta adicionada sem querer).
function isValidCallbackUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return false
    if (parsed.hostname !== 'www.sublimesst.com') return false
    if (parsed.username !== '' || parsed.password !== '') return false
    if (parsed.port !== '') return false
    if (parsed.pathname !== CALLBACK_PATH) return false
    if (parsed.search !== '' || parsed.hash !== '') return false
    return true
  } catch {
    return false
  }
}

// Parsing real via URL (nunca contains/startsWith — um domínio parecido tipo
// "sublimesst.com.evil.tld" ou "www.sublimesst.com@evil.tld" nunca passa aqui,
// só igualdade exata de hostname). trim() absorve espaços acidentais na env
// var; barra final é tolerada via pathname normalizado.
function isOfficialAppBaseUrl(raw: string | undefined): boolean {
  const trimmed = (raw ?? '').trim()
  if (!trimmed) return false
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'https:') return false
    if (parsed.username !== '' || parsed.password !== '') return false
    if (parsed.port !== '') return false
    if (parsed.search !== '' || parsed.hash !== '') return false
    if (!CALLBACK_OFFICIAL_HOSTS.has(parsed.hostname.toLowerCase())) return false
    const path = parsed.pathname.replace(/\/+$/, '')
    return path === ''
  } catch {
    return false
  }
}

// Mesma lógica de parsing real para a base da API — só aceita a forma exata
// da API de Produção (https://api.asaas.com/v3, com ou sem barra final),
// nunca sandbox.asaas.com nem qualquer variação por substring.
function isOfficialAsaasBaseUrl(raw: string | undefined): boolean {
  const trimmed = (raw ?? '').trim()
  if (!trimmed) return false
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'https:') return false
    if (parsed.username !== '' || parsed.password !== '') return false
    if (parsed.port !== '') return false
    if (parsed.search !== '' || parsed.hash !== '') return false
    if (parsed.hostname.toLowerCase() !== ASAAS_PROD_HOSTNAME) return false
    const path = parsed.pathname.replace(/\/+$/, '')
    return path === ASAAS_PROD_PATH
  } catch {
    return false
  }
}

export type CheckoutCallbackUrlResult =
  | { outcome: 'available'; url: string }
  | { outcome: 'skipped_environment' }
  | { outcome: 'missing_asaas_api_key' }
  | { outcome: 'invalid_asaas_base_url' }
  | { outcome: 'invalid_public_base_url' }

// Só devolve uma URL fora do modo mock/teste e só em Produção (VERCEL_ENV),
// com ASAAS_BASE_URL/NEXT_PUBLIC_BASE_URL representando exatamente os hosts
// oficiais (parsing real via URL, nunca contains/startsWith) e ASAAS_API_KEY
// presente. Preview e qualquer outro ambiente: sempre 'skipped_environment' —
// nunca reaproveita a base pública para o callback fora de Produção, para
// nunca configurar por engano um retorno para o domínio de Produção a partir
// de um teste em Preview. A successUrl devolvida é sempre a constante
// canônica com www — independente de a env var oficial estar com ou sem www.
export function getCheckoutContinuationCallbackUrl(): CheckoutCallbackUrlResult {
  if (process.env.VERCEL_ENV !== 'production') {
    return { outcome: 'skipped_environment' }
  }
  if (!process.env.ASAAS_API_KEY) {
    return { outcome: 'missing_asaas_api_key' }
  }
  if (!isOfficialAsaasBaseUrl(process.env.ASAAS_BASE_URL)) {
    return { outcome: 'invalid_asaas_base_url' }
  }
  if (!isOfficialAppBaseUrl(process.env.NEXT_PUBLIC_BASE_URL) || !isValidCallbackUrl(CALLBACK_URL)) {
    return { outcome: 'invalid_public_base_url' }
  }

  return { outcome: 'available', url: CALLBACK_URL }
}

export type InvalidChargeDataReason = 'invalid_billing_type' | 'invalid_value' | 'invalid_due_date'

export type ConfigureCallbackResult =
  | { outcome: 'configured' }
  | { outcome: 'skipped_mock' }
  | { outcome: 'skipped_invalid_status' }
  | { outcome: 'skipped_invalid_charge_data'; reason: InvalidChargeDataReason }
  | { outcome: 'error'; httpStatus?: number; errorCode?: string }

// Só atualiza cobranças ainda "em aberto" — nunca uma já CONFIRMED, RECEIVED,
// REFUNDED, DELETED, CANCELLED ou qualquer status desconhecido/futuro.
const CALLBACK_UPDATABLE_STATUSES = new Set(['PENDING', 'OVERDUE'])

const VALID_BILLING_TYPES: ReadonlySet<string> = new Set<AsaasBillingType>(['BOLETO', 'PIX', 'CREDIT_CARD', 'UNDEFINED'])

const DUE_DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/

// Confirma que a string (já validada pelo formato YYYY-MM-DD) representa uma
// data de calendário real — ex.: rejeita 2026-02-30, mês 13, dia 0. Usa
// Date.UTC só para essa checagem de existência, nunca para reformatar ou
// converter timezone; a string original é sempre a reenviada, nunca este Date.
function isRealCalendarDate(dateStr: string): boolean {
  const [year, month, day] = dateStr.split('-').map(Number)
  if (month < 1 || month > 12) return false
  if (day < 1 || day > 31) return false
  const d = new Date(Date.UTC(year, month - 1, day))
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day
}

// Valida billingType/value/dueDate exatamente como vieram do GET — nunca
// aceita ausente/vazio/fora da allowlist, nunca converte string numérica,
// nunca aceita NaN/Infinity/zero/negativo, nunca aceita formato de data
// diferente de YYYY-MM-DD nem data inexistente. Não corrige nem aplica
// default — só aprova ou reprova o valor exatamente como recebido.
function validateChargeDataForCallbackUpdate(
  charge: AsaasCharge
): { valid: true } | { valid: false; reason: InvalidChargeDataReason } {
  if (typeof charge.billingType !== 'string' || charge.billingType.length === 0 || !VALID_BILLING_TYPES.has(charge.billingType)) {
    return { valid: false, reason: 'invalid_billing_type' }
  }
  if (typeof charge.value !== 'number' || !Number.isFinite(charge.value) || charge.value <= 0) {
    return { valid: false, reason: 'invalid_value' }
  }
  if (typeof charge.dueDate !== 'string' || !DUE_DATE_FORMAT.test(charge.dueDate) || !isRealCalendarDate(charge.dueDate)) {
    return { valid: false, reason: 'invalid_due_date' }
  }
  return { valid: true }
}

const MAX_ERROR_CODE_LENGTH = 60

// Codepoints Unicode reconhecidos como quebra de linha por diversas
// ferramentas de processamento de texto/log (NEXT LINE, LINE SEPARATOR,
// PARAGRAPH SEPARATOR) alem dos controles ASCII/DEL — nenhum deles pode
// sobreviver no errorCode, ou um log poderia ser forjado como se fosse
// multilinha em visualizadores Unicode-aware. Constantes numericas, nunca
// escapes de unicode como texto na fonte.
const UNICODE_NEXT_LINE = 133
const UNICODE_LINE_SEPARATOR = 8232
const UNICODE_PARAGRAPH_SEPARATOR = 8233

// Remove qualquer caractere de controle ASCII (codigo <= 0x1f, inclui CR/LF/TAB),
// o DEL (0x7f) e os 3 separadores de linha Unicode acima, substituindo cada um
// por um espaco simples. Usa comparacao numerica de codePoint, nunca uma
// classe de regex com escapes de unicode incorporados na fonte.
function stripAsciiControlChars(input: string): string {
  let out = ''
  for (const ch of input) {
    const code = ch.codePointAt(0) ?? 0
    const isControlOrLineSeparator =
      code <= 0x1f ||
      code === 0x7f ||
      code === UNICODE_NEXT_LINE ||
      code === UNICODE_LINE_SEPARATOR ||
      code === UNICODE_PARAGRAPH_SEPARATOR
    out += isControlOrLineSeparator ? ' ' : ch
  }
  return out
}

// Extrai só o primeiro `errors[0].code` do corpo de erro da Asaas — nunca a
// `description` (pode conter texto arbitrário da API), nunca o corpo inteiro.
// Remove qualquer caractere de controle (nunca deixa \r/\n/\t chegarem ao
// log — proteção contra log injection), normaliza espaços repetidos, corta em
// 60 caracteres. Sempre uma string curta de uma linha só, ou undefined;
// nunca lança.
function sanitizeAsaasErrorCode(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined
  const errors = (body as { errors?: unknown }).errors
  if (!Array.isArray(errors) || errors.length === 0) return undefined
  const first = errors[0]
  if (!first || typeof first !== 'object') return undefined
  const code = (first as { code?: unknown }).code
  if (typeof code !== 'string') return undefined

  const sanitized = stripAsciiControlChars(code)
    .replace(/\s+/g, ' ')
    .trim()

  if (sanitized.length === 0) return undefined
  return sanitized.slice(0, MAX_ERROR_CODE_LENGTH)
}

// PUT /payments/{paymentId} — atualiza SOMENTE o callback de uma cobrança já
// existente. A Asaas exige billingType/value/dueDate no payload de PUT
// (payload anterior enviava só `callback` e por isso falhava sempre); os três
// campos vêm SEMPRE de um GET feito imediatamente antes, na própria Asaas —
// nunca do banco local, nunca de valor fornecido por quem chama — para nunca
// reenviar algo desatualizado ou divergente do que já está persistido na
// cobrança real, e são validados antes de ir para o payload (nunca reenviados
// crus). Nunca cria cobrança, nunca mexe em customer/subscription, nunca
// altera valor/vencimento/forma de pagamento/status. Nunca lança: quem chama
// nunca precisa de try/catch para não quebrar; falha aqui é só um resultado
// estruturado, best-effort (nunca desfaz cadastro/Company/cobrança).
export async function configurePaymentCallback(paymentId: string, successUrl: string): Promise<ConfigureCallbackResult> {
  if (IS_MOCK) return { outcome: 'skipped_mock' }

  try {
    const current = await getCharge(paymentId)

    if (!CALLBACK_UPDATABLE_STATUSES.has(current.status)) {
      return { outcome: 'skipped_invalid_status' }
    }

    const dataCheck = validateChargeDataForCallbackUpdate(current)
    if (!dataCheck.valid) {
      return { outcome: 'skipped_invalid_charge_data', reason: dataCheck.reason }
    }

    await asaasFetch(`/payments/${encodeURIComponent(paymentId)}`, {
      method: 'PUT',
      body: JSON.stringify({
        billingType: current.billingType,
        value: current.value,
        dueDate: current.dueDate,
        callback: { successUrl, autoRedirect: true },
      }),
    })
    return { outcome: 'configured' }
  } catch (err) {
    if (err instanceof AsaasApiError) {
      return { outcome: 'error', httpStatus: err.httpStatus, errorCode: sanitizeAsaasErrorCode(err.body) }
    }
    return { outcome: 'error' }
  }
}
