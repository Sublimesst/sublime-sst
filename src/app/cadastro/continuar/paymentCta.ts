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
