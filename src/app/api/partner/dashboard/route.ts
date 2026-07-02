import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function getPartnerSession(req: NextRequest) {
  const raw = req.cookies.get('sublime_partner')?.value
  if (!raw) return null
  try {
    return JSON.parse(Buffer.from(raw, 'base64').toString('utf-8')) as { partnerId?: string }
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const session = getPartnerSession(req)
  if (!session?.partnerId) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const [partner, leads, commissions] = await Promise.all([
    prisma.partner.findUnique({
      where: { id: session.partnerId },
      select: { id: true, name: true, code: true, email: true, tier: true, status: true },
    }),
    prisma.lead.findMany({
      where: { partnerId: session.partnerId },
      orderBy: { createdAt: 'desc' },
      include: {
        company: { select: { status: true, planType: true, createdAt: true } },
      },
    }),
    prisma.commission.findMany({
      where: { partnerId: session.partnerId },
      orderBy: { createdAt: 'desc' },
      include: { company: { select: { razaoSocial: true } } },
    }),
  ])

  if (!partner) return NextResponse.json({ error: 'Parceiro não encontrado.' }, { status: 404 })

  const totalComissoes = commissions.reduce((sum, c) => sum + c.valorComissao, 0)
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
