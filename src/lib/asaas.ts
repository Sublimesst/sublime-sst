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
