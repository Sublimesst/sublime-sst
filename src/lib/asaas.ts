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

export interface AsaasCharge {
  id: string
  status: string
  value: number
  dueDate: string
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
  billingType?: 'BOLETO' | 'PIX' | 'CREDIT_CARD' | 'UNDEFINED'
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
    throw new Error(`Asaas API error ${res.status}: ${JSON.stringify(err)}`)
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
  return asaasFetch<AsaasCharge>(`/payments/${chargeId}`)
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
const CALLBACK_EXPECTED_ASAAS_BASE_URL = 'https://api.asaas.com/v3'
const CALLBACK_EXPECTED_APP_BASE_URL = 'https://www.sublimesst.com'

function normalizeBaseUrl(raw: string | undefined): string {
  return (raw ?? '').trim().replace(/\/+$/, '')
}

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
    if (parsed.pathname !== '/cadastro/continuar') return false
    if (parsed.search !== '' || parsed.hash !== '') return false
    return true
  } catch {
    return false
  }
}

export type CheckoutCallbackUrlResult =
  | { outcome: 'available'; url: string }
  | { outcome: 'skipped_environment' }
  | { outcome: 'invalid_config' }

// Só devolve uma URL fora do modo mock/teste e só em Produção (VERCEL_ENV),
// com ASAAS_BASE_URL/NEXT_PUBLIC_BASE_URL exatamente iguais ao esperado e
// ASAAS_API_KEY presente. Preview e qualquer outro ambiente: sempre
// 'skipped_environment' — nunca reaproveita a base pública para o callback
// fora de Produção, para nunca configurar por engano um retorno para o
// domínio de Produção a partir de um teste em Preview.
export function getCheckoutContinuationCallbackUrl(): CheckoutCallbackUrlResult {
  if (process.env.VERCEL_ENV !== 'production') {
    return { outcome: 'skipped_environment' }
  }

  const asaasBaseOk = normalizeBaseUrl(process.env.ASAAS_BASE_URL) === CALLBACK_EXPECTED_ASAAS_BASE_URL
  const appBaseOk    = normalizeBaseUrl(process.env.NEXT_PUBLIC_BASE_URL) === CALLBACK_EXPECTED_APP_BASE_URL
  const apiKeyOk      = !!process.env.ASAAS_API_KEY

  if (!asaasBaseOk || !appBaseOk || !apiKeyOk || !isValidCallbackUrl(CALLBACK_URL)) {
    return { outcome: 'invalid_config' }
  }

  return { outcome: 'available', url: CALLBACK_URL }
}

export type ConfigureCallbackResult =
  | { outcome: 'configured' }
  | { outcome: 'skipped_mock' }
  | { outcome: 'error' }

// PUT /payments/{paymentId} — payload mínimo, só o callback. Nunca altera
// valor, vencimento, billingType ou descrição da cobrança já existente.
// Nunca lança: quem chama nunca precisa de try/catch para não quebrar.
export async function configurePaymentCallback(paymentId: string, successUrl: string): Promise<ConfigureCallbackResult> {
  if (IS_MOCK) return { outcome: 'skipped_mock' }

  try {
    await asaasFetch(`/payments/${encodeURIComponent(paymentId)}`, {
      method: 'PUT',
      body: JSON.stringify({
        callback: { successUrl, autoRedirect: true },
      }),
    })
    return { outcome: 'configured' }
  } catch {
    return { outcome: 'error' }
  }
}
