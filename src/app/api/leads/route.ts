import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { notifyNewLead } from '@/lib/mailer'

// POST /api/leads — captura inicial do lead
const leadSchema = z.object({
  cnpj: z.string().min(14),
  companyName: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  whatsapp: z.string().min(10),
  source: z.string().optional(),
  partnerId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = leadSchema.parse(body)
    const id = `cnpj_${data.cnpj.replace(/\D/g,'')}`

    const lead = await prisma.lead.upsert({
      where: { id },
      update: { name: data.name, email: data.email, whatsapp: data.whatsapp },
      create: {
        id,
        cnpj: data.cnpj,
        companyName: data.companyName,
        name: data.name,
        email: data.email,
        whatsapp: data.whatsapp,
        source: data.source ?? 'site',
        partnerId: data.partnerId,
        status: 'captured',
      },
    })

    // Notify team (non-blocking)
    notifyNewLead({
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
