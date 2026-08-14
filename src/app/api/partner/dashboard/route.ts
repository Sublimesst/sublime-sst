import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getPartnerSession } from '@/lib/partnerAuth'
import { deriveFinancialActivationState, PAYMENT_SELECT, type PaymentLike } from '@/lib/paymentPresentation'

export type LeadClassification =
  | 'indicacao_recebida'
  | 'elegibilidade_avaliada'
  | 'encaminhada_consultoria'
  | 'cadastro_em_andamento'
  | 'contratacao_concluida'

// Classificação comercial única do funil do parceiro — nunca expõe
// Lead.status/Company.status técnicos ao parceiro. A fonte financeira
// read-only central (deriveFinancialActivationState), a mesma usada pelo
// Portal do Cliente, decide "contratacao_concluida": uma Company criada mas
// com implantação/mensalidade ainda não confirmadas é "cadastro_em_andamento",
// nunca "concluída" só por a Company existir.
function classifyLead(
  lead: { status: string },
  company: { status: string; payments: PaymentLike[] } | null
): LeadClassification {
  if (company) {
    const { financiallyComplete } = deriveFinancialActivationState(company.status, company.payments)
    return financiallyComplete ? 'contratacao_concluida' : 'cadastro_em_andamento'
  }
  if (lead.status === 'backoffice') return 'encaminhada_consultoria'
  if (lead.status === 'assessed' || lead.status === 'eligible') return 'elegibilidade_avaliada'
  return 'indicacao_recebida'
}

export async function GET(req: NextRequest) {
  const partner = await getPartnerSession(req)
  if (!partner) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const [leads, commissions] = await Promise.all([
    prisma.lead.findMany({
      where: { partnerId: partner.id },
      orderBy: { createdAt: 'desc' },
      include: {
        company: { select: { status: true, planType: true, createdAt: true, payments: { select: PAYMENT_SELECT } } },
      },
    }),
    prisma.commission.findMany({
      where: { partnerId: partner.id },
      orderBy: { createdAt: 'desc' },
      include: { company: { select: { razaoSocial: true } } },
    }),
  ])

  // Estornadas ficam fora do total previsto — o parceiro não vai receber esses valores
  const totalComissoes = commissions.filter(c => c.status !== 'estornada').reduce((sum, c) => sum + c.valorComissao, 0)
  const liberadas      = commissions.filter(c => c.status === 'liberada').reduce((sum, c) => sum + c.valorComissao, 0)
  const pagas          = commissions.filter(c => c.status === 'paga').reduce((sum, c) => sum + c.valorComissao, 0)

  // CNPJ do lead nunca sai desta API — o parceiro identifica a indicação pelo
  // nome da empresa; o CNPJ completo do cliente é dado que o Portal do
  // Parceiro não precisa e não deve expor (minimização de dados).
  const classifiedLeads = leads.map(l => ({
    id:             l.id,
    companyName:    l.companyName,
    classification: classifyLead(l, l.company),
    planType:       l.company?.planType ?? null,
    createdAt:      l.createdAt,
  }))
  const indicacoesRecebidas = classifiedLeads.length
  const convertidas         = classifiedLeads.filter(l => l.classification === 'contratacao_concluida').length
  const emAndamento         = indicacoesRecebidas - convertidas

  return NextResponse.json({
    success: true,
    data: {
      partner,
      leads: classifiedLeads,
      commissions: commissions.map(c => ({
        id:            c.id,
        companyName:   c.company.razaoSocial,
        mensalidadeNum: c.mensalidadeNum,
        valorComissao: c.valorComissao,
        status:        c.status,
        liberadaEm:    c.liberadaEm,
        pagaEm:        c.pagaEm,
        referencia:    c.referencia,
      })),
      summary: { indicacoesRecebidas, emAndamento, convertidas, totalComissoes, liberadas, pagas },
    },
  })
}
