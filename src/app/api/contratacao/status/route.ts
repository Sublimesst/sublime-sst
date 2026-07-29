// ═══════════════════════════════════════════════════════════
// SUBLIME SST — GET /api/contratacao/status (Etapa 2A)
// Somente leitura: valida o cookie de continuação, lê os Payments já
// persistidos e devolve o mínimo necessário para a página exibir progresso.
// Nunca chama a Asaas, nunca grava no banco, nunca reconcilia pagamento.
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyCheckoutSessionToken, CHECKOUT_SESSION_COOKIE } from '@/lib/checkoutSession'
import {
  safeCheckoutUrl,
  deriveFinancialActivationState,
  PAYMENT_SELECT,
  getPaymentOrderBy,
} from '@/lib/paymentPresentation'

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store', Vary: 'Cookie' }

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS })
}

export async function GET(req: NextRequest) {
  const session = verifyCheckoutSessionToken(req.cookies.get(CHECKOUT_SESSION_COOKIE)?.value)
  if (!session) {
    return json({ success: false, code: 'session_invalid', error: 'Sessão inválida ou expirada.' }, 401)
  }

  const company = await prisma.company.findUnique({
    where: { id: session.companyId },
    select: {
      status: true,
      planType: true,
      mensalidadeValor: true,
      payments: {
        where: { type: { in: ['implantacao', 'mensalidade'] } },
        select: PAYMENT_SELECT,
        orderBy: getPaymentOrderBy(),
      },
    },
  })
  if (!company) {
    return json({ success: false, code: 'not_found', error: 'Não encontrada.' }, 404)
  }
  if (company.status === 'cancelled') {
    return json({ success: false, code: 'company_cancelled', error: 'Contratação cancelada.' }, 403)
  }

  const state = deriveFinancialActivationState(company.status, company.payments)

  return json({
    success: true,
    data: {
      step: state.presentationState.step,
      financiallyComplete: state.financiallyComplete,
      showsCommonPaymentButton: state.presentationState.showsCommonPaymentButton,
      planType: company.planType,
      mensalidadeValor: company.mensalidadeValor,
      implantacao: state.implantacao ? {
        status: state.implantacaoStatus,
        amount: state.implantacao.amount,
        dueDate: state.implantacao.dueDate,
        checkoutUrl: safeCheckoutUrl(state.implantacao.checkoutUrl),
      } : null,
      mensalidade: state.primeiraMensalidade ? {
        status: state.mensalidadeStatus,
        amount: state.primeiraMensalidade.amount,
        dueDate: state.primeiraMensalidade.dueDate,
        checkoutUrl: safeCheckoutUrl(state.primeiraMensalidade.checkoutUrl),
      } : null,
    },
  }, 200)
}
