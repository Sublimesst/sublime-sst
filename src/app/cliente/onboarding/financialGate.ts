// ═══════════════════════════════════════════════════════════
// SUBLIME SST — Gate financeiro da página de onboarding (Etapa 2C.1B)
// Extraído de page.tsx: Next.js App Router só permite exports específicos
// (default/metadata/config/...) em arquivos page.tsx — qualquer outro export
// quebra a checagem de tipos gerada pelo build. Também facilita testar sem
// infraestrutura de teste de componente/JSX.
//
// Consulta apenas os Payments da Company autenticada pelo cookie — nunca
// aceita companyId vindo do cliente, nunca chama a Asaas, nunca grava no banco.
// ═══════════════════════════════════════════════════════════

import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifySessionCookie } from '@/lib/sessionCookie'
import type { ClientSessionPayload } from '@/lib/clientAuth'
import { deriveFinancialActivationState, PAYMENT_SELECT, getPaymentOrderBy } from '@/lib/paymentPresentation'

export async function getFinancialState() {
  const cookieStore = await cookies()
  const raw = cookieStore.get('sublime_client')?.value
  const payload = verifySessionCookie<ClientSessionPayload>(raw)
  if (!payload?.companyId) return null

  const company = await prisma.company.findUnique({
    where: { id: payload.companyId },
    select: {
      status: true,
      payments: {
        where: { type: { in: ['implantacao', 'mensalidade'] } },
        select: PAYMENT_SELECT,
        orderBy: getPaymentOrderBy(),
      },
    },
  })
  if (!company || company.status === 'cancelled') return null

  return deriveFinancialActivationState(company.status, company.payments)
}
