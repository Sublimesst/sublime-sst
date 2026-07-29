// ═══════════════════════════════════════════════════════════
// SUBLIME SST — Apresentação da linha de pagamento no Portal Cliente (Etapa 2C.1B)
// Função pura (sem JSX), extraída para fora de page.tsx: Next.js App Router
// só permite exports específicos (default/metadata/config/...) em arquivos
// page.tsx — qualquer outro export quebra a checagem de tipos gerada pelo
// build. Também facilita testar sem infraestrutura de teste de componente.
// ═══════════════════════════════════════════════════════════

import { safeCheckoutUrl, type PaymentStatus } from '@/lib/paymentPresentation'

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  confirmed: 'Pagamento confirmado',
  pending:   'Aguardando pagamento',
  overdue:   'Pagamento vencido',
  refunded:  'Pagamento estornado',
  disputed:  'Pagamento em análise',
}

// checkoutUrl só passa por safeCheckoutUrl (já validado em paymentPresentation.ts);
// nunca cria cobrança, nunca lê dado de outra Company.
export function paymentDisplayInfo(
  payment: { amount: number; dueDate: Date | null; checkoutUrl: string | null } | null,
  status: PaymentStatus | 'not_ready' | null
) {
  const statusLabel = status && status !== 'not_ready' ? PAYMENT_STATUS_LABELS[status] : 'Cobrança ainda não disponível'
  const validUrl = payment ? safeCheckoutUrl(payment.checkoutUrl) : undefined
  const amountLabel = payment ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payment.amount / 100) : null
  const dueDateLabel = payment?.dueDate ? new Intl.DateTimeFormat('pt-BR').format(payment.dueDate) : null
  return { statusLabel, validUrl, amountLabel, dueDateLabel }
}
