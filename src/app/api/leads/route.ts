import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { notifyNewLead } from '@/lib/mailer'
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit'

// POST /api/leads — captura inicial do lead
const leadSchema = z.object({
  cnpj: z.string().min(14),
  companyName: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  whatsapp: z.string().min(10),
  source: z.string().optional(),
  partnerRef: z.string().optional(), // código do parceiro (?ref=CODE)
})

export async function POST(req: NextRequest) {
  const limit = Number(process.env.RATE_LIMIT_LEADS ?? 5)
  if (!rateLimit(req, limit)) return rateLimitResponse()

  try {
    const body = await req.json()
    const data = leadSchema.parse(body)
    const id = `cnpj_${data.cnpj.replace(/\D/g,'')}`

    // Vincula o parceiro já na captura — antes o vínculo só nascia no cadastro
    // completo, e leads que paravam no teste ficavam sem indicador
    const partner = data.partnerRef
      ? await prisma.partner.findFirst({ where: { code: data.partnerRef, status: 'active' } })
      : null

    const existing = await prisma.lead.findUnique({ where: { id } })
    const lead = await prisma.lead.upsert({
      where: { id },
      update: {
        name: data.name, email: data.email, whatsapp: data.whatsapp,
        // atribuição first-touch: não sobrescreve parceiro já vinculado
        ...(partner && !existing?.partnerId ? { partnerId: partner.id, source: 'partner' } : {}),
      },
      create: {
        id,
        cnpj: data.cnpj,
        companyName: data.companyName,
        name: data.name,
        email: data.email,
        whatsapp: data.whatsapp,
        source: partner ? 'partner' : (data.source ?? 'site'),
        partnerId: partner?.id,
        status: 'captured',
      },
    })

    // Notify team (non-blocking)
    await notifyNewLead({
      cnpj: data.cnpj, companyName: data.companyName,
      name: data.name, email: data.email, whatsapp: data.whatsapp,
    }).catch(() => {})

    return NextResponse.json({ success: true, data: { id: lead.id } })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Dados inválidos.' }, { status: 400 })
    }
    console.error('[API /leads POST]', err)
    return NextResponse.json({ success: false, error: 'Erro interno.' }, { status: 500 })
  }
}

// GET /api/leads — listagem para admin
export async function GET(req: NextRequest) {
  try {
    const secret = req.headers.get('x-admin-secret')
    if (secret !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ success: false, error: 'Não autorizado.' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const page = Number(searchParams.get('page') ?? '1')
    const limit = 50

    const where = {
      ...(status ? { status } : {}),
      ...(search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { companyName: { contains: search, mode: 'insensitive' as const } },
          { cnpj: { contains: search } },
        ],
      } : {}),
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: { eligibilityAssessments: { orderBy: { createdAt: 'desc' }, take: 1 } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.lead.count({ where }),
    ])

    return NextResponse.json({ success: true, data: { leads, total, page, pages: Math.ceil(total / limit) } })
  } catch (err) {
    console.error('[API /leads GET]', err)
    return NextResponse.json({ success: false, error: 'Erro interno.' }, { status: 500 })
  }
}
