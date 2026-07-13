import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminSecret } from '@/lib/adminAuth'

// GET /api/admin/stats — contagens agregadas REAIS para o dashboard.
// Substitui o cálculo anterior, que somava apenas a primeira página de leads
// e rotulava o resultado como total.
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret')
  if (!verifyAdminSecret(secret)) {
    return NextResponse.json({ success: false, error: 'Não autorizado.' }, { status: 401 })
  }

  try {
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [
      leadsTotal, leadsNovos7d, leadsIndicados,
      leadsEligible, leadsBackoffice, leadsRegistered, leadsConverted,
      companiesByStatus,
      pagamentosImplantacaoPendentes,
      partnersPending, partnersActive, referralsTotal,
      commissionsByStatus,
    ] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({ where: { createdAt: { gte: since7d } } }),
      prisma.lead.count({ where: { partnerId: { not: null } } }),
      prisma.lead.count({ where: { status: 'eligible' } }),
      prisma.lead.count({ where: { status: 'backoffice' } }),
      prisma.lead.count({ where: { status: 'registered' } }),
      prisma.lead.count({ where: { status: 'converted' } }),
      prisma.company.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.payment.count({ where: { type: 'implantacao', status: 'pending' } }),
      prisma.partner.count({ where: { status: 'pending' } }),
      prisma.partner.count({ where: { status: 'active' } }),
      prisma.partnerReferral.count(),
      prisma.commission.groupBy({ by: ['status'], _count: { _all: true }, _sum: { valorComissao: true } }),
    ])

    const companies: Record<string, number> = {}
    for (const row of companiesByStatus) companies[row.status] = row._count._all

    const commissions: Record<string, { count: number; totalCentavos: number }> = {}
    for (const row of commissionsByStatus) {
      commissions[row.status] = { count: row._count._all, totalCentavos: row._sum.valorComissao ?? 0 }
    }

    return NextResponse.json({
      success: true,
      data: {
        leads: {
          total: leadsTotal,
          novos7d: leadsNovos7d,
          indicados: leadsIndicados,
          eligible: leadsEligible,
          backoffice: leadsBackoffice,
          registered: leadsRegistered,
          converted: leadsConverted,
        },
        companies, // por status: pending | onboarding_pending | in_production | in_review | documents_delivered | active | overdue | suspended | migrating | cancelled
        pagamentosImplantacaoPendentes,
        partners: { pending: partnersPending, active: partnersActive, referrals: referralsTotal },
        commissions, // por status: em_carencia | liberada | paga | estornada (count + soma em centavos)
      },
    })
  } catch (err) {
    console.error('[API /admin/stats]', err)
    return NextResponse.json({ success: false, error: 'Erro interno.' }, { status: 500 })
  }
}
