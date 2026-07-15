import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getPartnerSession } from '@/lib/partnerAuth'

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
        company: { select: { status: true, planType: true, createdAt: true } },
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

  return NextResponse.json({
    success: true,
    data: {
      partner,
      leads: leads.map(l => ({
        id:          l.id,
        companyName: l.companyName,
        cnpj:        l.cnpj,
        status:      l.status,
        converted:   !!l.company,
        planType:    l.company?.planType ?? null,
        createdAt:   l.createdAt,
      })),
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
      summary: { totalComissoes, liberadas, pagas },
    },
  })
}
