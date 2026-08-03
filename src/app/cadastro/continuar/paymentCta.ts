// ═══════════════════════════════════════════════════════════
// SUBLIME SST — Decisão de CTA por pagamento em /cadastro/continuar (P0)
// Função pura, sem JSX (extraída para fora de page.tsx e ser testável sem
// infraestrutura de teste de componente). Implantação e primeira mensalidade
// decidem seu próprio botão de forma independente uma da outra — nenhuma
// depende do "step" global nem do status da outra cobrança, para permitir
// pagar em qualquer ordem.
// ═══════════════════════════════════════════════════════════

// Só pending/overdue têm ação de pagamento disponível; confirmed não precisa
// de CTA; refunded/disputed nunca criam cobrança nova (orientação recuperável
// já é mostrada separadamente pelo InfoBanner de issue).
export function canPayNow(status: string | null | undefined): boolean {
  return status === 'pending' || status === 'overdue'
}

// Combina status pagável + checkoutUrl já validada pelo backend (nunca
// construída/concatenada aqui) — nenhum clique cria cobrança.
export function shouldShowPaymentButton(
  payment: { status?: string | null; checkoutUrl?: string | null } | null | undefined
): boolean {
  if (!payment) return false
  return canPayNow(payment.status) && !!payment.checkoutUrl
}

// ═══════════════════════════════════════════════════════════
// MVP de retorno/continuidade do checkout (correção de UX, Etapa 2B.3) —
// funções puras, sem I/O, sem JSX. O callback do Asaas continua sendo só UX
// (best-effort); estas funções nunca decidem status financeiro, apenas texto
// e rótulo exibidos a partir do status já vindo de /api/contratacao/status.
// ═══════════════════════════════════════════════════════════

// Rótulo da etapa mostrado no aviso pré-checkout, a partir do status do OUTRO
// pagamento (não o que está sendo pago agora). Se o outro já está confirmado,
// este é o único que falta; caso contrário, os dois ainda estão em aberto.
export function getPaymentStepLabel(otherStatus: string | null | undefined): string {
  return otherStatus === 'confirmed' ? 'Pagamento restante' : 'Pagamento 1 de 2'
}

// Mensagem do estado intermediário (um pagamento confirmado, o outro ainda
// pendente) — só cobre o par "pending" simples; overdue/refunded/disputed já
// têm seu próprio InfoBanner de issue em page.tsx e não devem ser duplicados
// aqui. Retorna null quando não há nada de intermediário a comunicar (nenhum
// confirmado ainda, ou ambos confirmados, ou o outro está em issue).
export function getIntermediateStatusMessage(
  implantacaoStatus: string | null | undefined,
  mensalidadeStatus: string | null | undefined
): string | null {
  if (mensalidadeStatus === 'confirmed' && implantacaoStatus === 'pending') {
    return 'Sua mensalidade foi confirmada. Falta concluir a implantação para liberar o onboarding.'
  }
  if (implantacaoStatus === 'confirmed' && mensalidadeStatus === 'pending') {
    return 'Sua implantação foi confirmada. Falta concluir a mensalidade para liberar o onboarding.'
  }
  return null
}

// Guarda de disparo único: protege a abertura do checkout (window.open) contra
// duplo clique/cliques rápidos no botão "Continuar" do modal. `tryConsume()` só
// devolve true na PRIMEIRA chamada — qualquer chamada seguinte na mesma
// instância é bloqueada, mesmo que ocorra antes de qualquer re-render (a
// checagem é síncrona, sem depender de setState). Cada instância nova (criada
// a cada montagem do modal) começa destravada — reabrir o modal para outro
// pagamento legítimo depois de fechar sempre funciona, pois usa uma instância
// nova, nunca a mesma já consumida.
export function createSingleShotGuard() {
  let used = false
  return {
    tryConsume(): boolean {
      if (used) return false
      used = true
      return true
    },
  }
}
