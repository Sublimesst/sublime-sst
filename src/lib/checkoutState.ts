// ═══════════════════════════════════════════════════════════
// SUBLIME SST — Derivação de estado da página de continuação (Etapa 2A)
// Função pura, sem I/O — usa somente os status já existentes no projeto
// (pending | confirmed | overdue | refunded | disputed). Não inventa status
// novo. "Em confirmação" não é distinguível de "pending" nesta etapa (isso
// depende do callback pós-checkout, fora de escopo — Etapa 2B); por isso o
// polling do lado do cliente trata "pending" como o estado que pode virar
// "confirmed" a qualquer momento via webhook.
// ═══════════════════════════════════════════════════════════

export type PaymentStatus = 'pending' | 'confirmed' | 'overdue' | 'refunded' | 'disputed'

export type Step =
  | 'step1'              // implantação pendente (mensalidade pode ou não já existir — boleto)
  | 'step2'               // implantação confirmada, mensalidade pendente
  | 'preparing'           // implantação confirmada, mensalidade ainda não sincronizada
  | 'completed'           // ambas confirmadas
  | 'implantacao_issue'   // implantação overdue/refunded/disputed
  | 'mensalidade_issue'   // mensalidade overdue/refunded/disputed
  | 'cancelled'

export interface DerivedState {
  step: Step
  financiallyComplete: boolean
  showsCommonPaymentButton: boolean // false para overdue/refunded/disputed/cancelled
}

export function deriveContratacaoState(input: {
  companyStatus: string
  implantacaoStatus: PaymentStatus | null
  mensalidadeStatus: PaymentStatus | 'not_ready'
}): DerivedState {
  const { companyStatus, implantacaoStatus, mensalidadeStatus } = input

  if (companyStatus === 'cancelled') {
    return { step: 'cancelled', financiallyComplete: false, showsCommonPaymentButton: false }
  }

  // Implantação nunca deveria ser null neste ponto do fluxo, mas é tratado
  // defensivamente como "step1" (nada a mostrar de mensalidade ainda).
  if (implantacaoStatus === null || implantacaoStatus === 'pending') {
    return { step: 'step1', financiallyComplete: false, showsCommonPaymentButton: true }
  }

  if (implantacaoStatus === 'overdue' || implantacaoStatus === 'refunded' || implantacaoStatus === 'disputed') {
    return { step: 'implantacao_issue', financiallyComplete: false, showsCommonPaymentButton: false }
  }

  // implantacaoStatus === 'confirmed' a partir daqui
  if (mensalidadeStatus === 'not_ready') {
    return { step: 'preparing', financiallyComplete: false, showsCommonPaymentButton: false }
  }
  if (mensalidadeStatus === 'pending') {
    return { step: 'step2', financiallyComplete: false, showsCommonPaymentButton: true }
  }
  if (mensalidadeStatus === 'overdue' || mensalidadeStatus === 'refunded' || mensalidadeStatus === 'disputed') {
    return { step: 'mensalidade_issue', financiallyComplete: false, showsCommonPaymentButton: false }
  }
  // mensalidadeStatus === 'confirmed'
  return { step: 'completed', financiallyComplete: true, showsCommonPaymentButton: false }
}
