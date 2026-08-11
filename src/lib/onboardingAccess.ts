// ═══════════════════════════════════════════════════════════
// SUBLIME SST — Autorização compartilhada das rotas de onboarding do cliente
// Extrai o gate de sessão + financeiro que já existia isolado dentro de
// POST /api/cliente/onboarding, para ser reaproveitado sem duplicação pelas
// novas rotas (rascunho geral, workers). Mesma consulta, mesmas mensagens —
// nenhum comportamento novo em relação ao gate já existente e testado.
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClientSession, type AuthorizedCompany } from '@/lib/clientAuth'
import { deriveFinancialActivationState, PAYMENT_SELECT, getPaymentOrderBy } from '@/lib/paymentPresentation'

export type OnboardingAccessResult =
  | { ok: true; company: AuthorizedCompany }
  | { ok: false; response: NextResponse }

// Reproduz exatamente o gate já usado hoje pela rota de envio: sessão válida
// (empresa não cancelada) + implantação e primeira mensalidade confirmadas.
// Nunca escreve no banco, nunca chama a Asaas.
export async function requireOnboardingAccess(req: NextRequest): Promise<OnboardingAccessResult> {
  const company = await getClientSession(req)
  if (!company) {
    return { ok: false, response: NextResponse.json({ error: 'Não autorizado.' }, { status: 401 }) }
  }

  const payments = await prisma.payment.findMany({
    where: { companyId: company.id, type: { in: ['implantacao', 'mensalidade'] } },
    select: PAYMENT_SELECT,
    orderBy: getPaymentOrderBy(),
  })
  const financialState = deriveFinancialActivationState(company.status, payments)
  if (!financialState.financiallyComplete) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          code: 'financial_activation_required',
          error: 'O preenchimento dos dados será liberado após a confirmação da implantação e da primeira mensalidade.',
        },
        { status: 409 }
      ),
    }
  }

  return { ok: true, company }
}

// true quando a declaração já foi enviada — nenhuma mutação de dados gerais
// ou de Worker deve ser aceita depois disso. Ausência de registro
// (onboarding ainda não iniciado) nunca é tratada como travada.
export function isOnboardingLocked(onboarding: { status: string } | null | undefined): boolean {
  return onboarding?.status === 'enviado'
}

// Lançado dentro de uma transação (ver src/lib/prismaSerializable.ts) quando
// uma leitura fresca mostra que a declaração foi travada — inclusive por uma
// escrita concorrente que aconteceu depois da checagem inicial da rota.
// Mapeado para onboardingLockedResponse() no catch de cada rota.
export class OnboardingLockedError extends Error {
  constructor() {
    super('onboarding_already_submitted')
    this.name = 'OnboardingLockedError'
  }
}

// Função (não uma instância compartilhada) — o corpo de um NextResponse só
// pode ser lido uma vez; reaproveitar a mesma instância entre requisições
// concorrentes quebraria a segunda leitura.
export function onboardingLockedResponse(): NextResponse {
  return NextResponse.json(
    {
      success: false,
      code: 'onboarding_already_submitted',
      error: 'Estas informações já foram enviadas e não podem mais ser alteradas pelo Portal.',
    },
    { status: 409 }
  )
}
