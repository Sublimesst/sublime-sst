// ═══════════════════════════════════════════════════════════
// SUBLIME SST — GET /api/contratacao/status (Etapa 2A)
// Somente leitura: valida o cookie de continuação, lê os Payments já
// persistidos e devolve o mínimo necessário para a página exibir progresso.
// Nunca chama a Asaas, nunca grava no banco, nunca reconcilia pagamento.
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyCheckoutSessionToken, CHECKOUT_SESSION_COOKIE } from '@/lib/checkoutSession'
import { deriveContratacaoState, type PaymentStatus } from '@/lib/checkoutState'

const ALLOWED_ASAAS_HOSTS = new Set(['www.asaas.com', 'asaas.com', 'sandbox.asaas.com'])

// Só devolve a URL se for https, apontar para um host oficial da Asaas (por
// igualdade exata, nunca sufixo/substring), sem credenciais embutidas e sem
// porta não-padrão — caso contrário, undefined (o botão fica indisponível,
// nunca redireciona para um destino arbitrário).
function safeCheckoutUrl(url: string | null | undefined): string | undefined {
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

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store', Vary: 'Cookie' }

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS })
}

function isKnownStatus(status: string): status is PaymentStatus {
  return status === 'pending' || status === 'confirmed' || status === 'overdue' ||
         status === 'refunded' || status === 'disputed'
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
        select: { type: true, status: true, amount: true, dueDate: true, checkoutUrl: true },
        // Primeira mensalidade = menor dueDate; desempate estável por createdAt e id
        // (nunca findFirst às cegas — nulls de dueDate ficam por último).
        orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }, { id: 'asc' }],
      },
    },
  })
  if (!company) {
    return json({ success: false, code: 'not_found', error: 'Não encontrada.' }, 404)
  }
  if (company.status === 'cancelled') {
    return json({ success: false, code: 'company_cancelled', error: 'Contratação cancelada.' }, 403)
  }

  const implantacao = company.payments.find(p => p.type === 'implantacao') ?? null
  const mensalidade = company.payments.find(p => p.type === 'mensalidade') ?? null

  const implantacaoStatus = implantacao && isKnownStatus(implantacao.status) ? implantacao.status : null
  const mensalidadeStatus = mensalidade && isKnownStatus(mensalidade.status) ? mensalidade.status : 'not_ready' as const

  const derived = deriveContratacaoState({
    companyStatus: company.status,
    implantacaoStatus,
    mensalidadeStatus,
  })

  return json({
    success: true,
    data: {
      step: derived.step,
      financiallyComplete: derived.financiallyComplete,
      showsCommonPaymentButton: derived.showsCommonPaymentButton,
      planType: company.planType,
      mensalidadeValor: company.mensalidadeValor,
      implantacao: implantacao ? {
        status: implantacaoStatus,
        amount: implantacao.amount,
        dueDate: implantacao.dueDate,
        checkoutUrl: safeCheckoutUrl(implantacao.checkoutUrl),
      } : null,
      mensalidade: mensalidade ? {
        status: mensalidadeStatus,
        amount: mensalidade.amount,
        dueDate: mensalidade.dueDate,
        checkoutUrl: safeCheckoutUrl(mensalidade.checkoutUrl),
      } : null,
    },
  }, 200)
}
