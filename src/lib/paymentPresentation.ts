// ═══════════════════════════════════════════════════════════
// SUBLIME SST — Apresentação e validação da ativação financeira (Etapa 2C.1A)
// Fonte única de verdade para: localizar implantação/primeira mensalidade de
// forma determinística, validar checkoutUrl com segurança, e determinar se a
// contratação está financeiramente ativada. Usado hoje por
// /api/contratacao/status; será reaproveitado (Etapa 2C.1B) pelo Portal
// Cliente e por um futuro gate server-side do onboarding — nenhum dos dois é
// alterado nesta etapa. Somente leitura — nunca chama Asaas, nunca grava no banco.
// ═══════════════════════════════════════════════════════════

import type { Prisma } from '@prisma/client'
import { deriveContratacaoState, type PaymentStatus, type DerivedState } from './checkoutState'

export const ALLOWED_ASAAS_HOSTS = new Set(['www.asaas.com', 'asaas.com', 'sandbox.asaas.com'])

// Campos mínimos que qualquer chamador (rota, Server Component) deve
// selecionar do Prisma para usar as funções deste arquivo — sem dado pessoal.
// `id`/`createdAt` existem só para o desempate determinístico interno; as
// rotas que expõem isso publicamente (ex.: /api/contratacao/status) já
// selecionam campo a campo na resposta e nunca repassam o objeto inteiro.
export interface PaymentLike {
  id: string
  type: string
  status: string
  amount: number
  dueDate: Date | null
  createdAt: Date
  checkoutUrl: string | null
}

export const PAYMENT_SELECT = {
  id: true, type: true, status: true, amount: true, dueDate: true, createdAt: true, checkoutUrl: true,
} as const

// Função (não array exportado) — cada chamada devolve uma estrutura nova, sem
// referência compartilhada mutável entre chamadores. Serve só de conveniência
// para quem faz a query no Prisma; a correção das funções de seleção abaixo
// NÃO depende deste orderBy (ver pickImplantacao/pickPrimeiraMensalidade).
export function getPaymentOrderBy(): Prisma.PaymentOrderByWithRelationInput[] {
  return [
    { dueDate: { sort: 'asc', nulls: 'last' } },
    { createdAt: 'asc' },
    { id: 'asc' },
  ]
}

function isKnownStatus(status: string): status is PaymentStatus {
  return status === 'pending' || status === 'confirmed' || status === 'overdue' ||
         status === 'refunded' || status === 'disputed'
}

// Só devolve a URL se for https, apontar para um host oficial da Asaas (por
// igualdade exata, nunca sufixo/substring), sem credenciais embutidas e sem
// porta não-padrão — caso contrário, undefined (o botão fica indisponível,
// nunca redireciona para um destino arbitrário).
export function safeCheckoutUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return undefined
    if (!ALLOWED_ASAAS_HOSTS.has(parsed.hostname)) return undefined
    if (parsed.username !== '' || parsed.password !== '') return undefined
    if (parsed.port !== '' && parsed.port !== '443') return undefined
    return url
  } catch {
    return undefined
  }
}

// Desempate estável comum às duas seleções abaixo: menor createdAt primeiro;
// empate exato → ordem lexical estável do id (cuid). Nunca depende da ordem
// em que `payments` foi recebido.
function compareByCreatedAtThenId(a: PaymentLike, b: PaymentLike): number {
  const diff = a.createdAt.getTime() - b.createdAt.getTime()
  if (diff !== 0) return diff
  if (a.id < b.id) return -1
  if (a.id > b.id) return 1
  return 0
}

// Implantação: em operação normal existe exatamente 1 registro por Company.
// Se houver mais de um (histórico/retry), escolhe deterministicamente a mais
// antiga (menor createdAt, desempate por id) — a cobrança original do
// contrato — INDEPENDENTE da ordem de `payments` recebida (filter+reduce,
// nunca `.find()` num array só supostamente ordenado). Não muta o array
// recebido.
//
// Limitação conhecida, não resolvida nesta etapa: se a implantação original
// for reembolsada/disputada e uma nova cobrança for criada depois e
// confirmada, esta função ainda retorna a mais antiga (reembolsada) — um
// fluxo de reemissão/recontratação ficaria bloqueado. Isso é uma decisão de
// regra de negócio a definir numa etapa futura, não implementada aqui.
export function pickImplantacao<T extends PaymentLike>(payments: T[]): T | null {
  const candidates = payments.filter(p => p.type === 'implantacao')
  if (candidates.length === 0) return null
  return candidates.reduce((oldest, current) =>
    compareByCreatedAtThenId(current, oldest) < 0 ? current : oldest
  )
}

function hasValidDueDate(p: PaymentLike): boolean {
  return p.dueDate !== null && !Number.isNaN(p.dueDate.getTime())
}

// Primeira mensalidade = menor dueDate válida entre os registros
// type=mensalidade; dueDate nula OU inválida (Invalid Date) nunca vence uma
// data válida — fica sempre depois; empate de dueDate desempatado por
// createdAt e id. INDEPENDENTE da ordem de `payments` recebida (filter+reduce
// com comparador próprio, nunca confia em pré-ordenação externa). Não muta o
// array recebido.
export function pickPrimeiraMensalidade<T extends PaymentLike>(payments: T[]): T | null {
  const candidates = payments.filter(p => p.type === 'mensalidade')
  if (candidates.length === 0) return null
  return candidates.reduce((first, current) => {
    const currentValid = hasValidDueDate(current)
    const firstValid = hasValidDueDate(first)
    if (currentValid !== firstValid) return currentValid ? current : first
    if (currentValid && firstValid) {
      const diff = current.dueDate!.getTime() - first.dueDate!.getTime()
      if (diff !== 0) return diff < 0 ? current : first
    }
    return compareByCreatedAtThenId(current, first) < 0 ? current : first
  })
}

export type MissingPayment = 'implantacao' | 'mensalidade' | 'ambos' | 'nenhum'

export interface FinancialActivationState<T extends PaymentLike = PaymentLike> {
  implantacao: T | null
  primeiraMensalidade: T | null
  implantacaoStatus: PaymentStatus | null
  mensalidadeStatus: PaymentStatus | 'not_ready'
  implantacaoConfirmed: boolean
  mensalidadeConfirmed: boolean
  financiallyComplete: boolean
  missingPayment: MissingPayment
  presentationState: DerivedState
}

// Fonte única do estado financeiro: a partir dos Payments já buscados (ver
// PAYMENT_SELECT/getPaymentOrderBy) e do status da Company, determina se a
// contratação está financeiramente ativada. Nunca trata pending/overdue/
// refunded/disputed como confirmado — só o status literal "confirmed" conta.
export function deriveFinancialActivationState<T extends PaymentLike>(
  companyStatus: string,
  payments: T[]
): FinancialActivationState<T> {
  const implantacao = pickImplantacao(payments)
  const primeiraMensalidade = pickPrimeiraMensalidade(payments)

  const implantacaoStatus = implantacao && isKnownStatus(implantacao.status) ? implantacao.status : null
  const mensalidadeStatus = primeiraMensalidade && isKnownStatus(primeiraMensalidade.status)
    ? primeiraMensalidade.status
    : 'not_ready' as const

  const implantacaoConfirmed = implantacaoStatus === 'confirmed'
  const mensalidadeConfirmed = mensalidadeStatus === 'confirmed'
  const financiallyComplete = implantacaoConfirmed && mensalidadeConfirmed

  const missingPayment: MissingPayment =
    !implantacaoConfirmed && !mensalidadeConfirmed ? 'ambos' :
    !implantacaoConfirmed ? 'implantacao' :
    !mensalidadeConfirmed ? 'mensalidade' : 'nenhum'

  const presentationState = deriveContratacaoState({ companyStatus, implantacaoStatus, mensalidadeStatus })

  return {
    implantacao,
    primeiraMensalidade,
    implantacaoStatus,
    mensalidadeStatus,
    implantacaoConfirmed,
    mensalidadeConfirmed,
    financiallyComplete,
    missingPayment,
    presentationState,
  }
}
