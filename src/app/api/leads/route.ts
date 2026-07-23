import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { notifyNewLead } from '@/lib/mailer'
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit'
import { verifyAdminSecret } from '@/lib/adminAuth'

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
    let partner = data.partnerRef
      ? await prisma.partner.findFirst({ where: { code: data.partnerRef, status: 'active' } })
      : null

    // Autoindicação: parceiro não pode se indicar usando o próprio CNPJ. Ignora
    // o vínculo (segue como se não houvesse ?ref=) — mesma regra já aplicada
    // em /api/eligibility e /api/leads/register.
    if (partner?.cnpj && partner.cnpj.replace(/\D/g, '') === data.cnpj.replace(/\D/g, '')) {
      partner = null
    }

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
    if (!verifyAdminSecret(secret)) {
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
        include: {
          eligibilityAssessments: { orderBy: { createdAt: 'desc' }, take: 1 },
          partner: { select: { id: true, name: true, office: true, code: true } },
        },
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

// PATCH /api/leads — ações operacionais do admin sobre um lead
const patchSchema = z.object({
  id:     z.string().min(1),
  action: z.enum(['discard', 'backoffice', 'contact']),
  note:   z.string().optional(),
})

export async function PATCH(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret')
  if (!verifyAdminSecret(secret)) {
    return NextResponse.json({ success: false, error: 'Não autorizado.' }, { status: 401 })
  }
  try {
    const body = await req.json()
    const data = patchSchema.parse(body)

    const lead = await prisma.lead.findUnique({ where: { id: data.id } })
    if (!lead) return NextResponse.json({ success: false, error: 'Lead não encontrado.' }, { status: 404 })

    const stamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    const noteLine = data.action === 'discard'
      ? `[${stamp}] Descartado${data.note ? ': ' + data.note : ''}`
      : data.action === 'backoffice'
        ? `[${stamp}] Encaminhado para Consultoria${data.note ? ': ' + data.note : ''}`
        : `[${stamp}] Contato realizado${data.note ? ': ' + data.note : ''}`
    const notes = lead.notes ? `${lead.notes}\n${noteLine}` : noteLine

    const updated = await prisma.lead.update({
      where: { id: data.id },
      data: {
        notes,
        ...(data.action === 'discard' ? { status: 'discarded' } : {}),
        ...(data.action === 'backoffice' ? { status: 'backoffice' } : {}),
      },
    })

    return NextResponse.json({ success: true, data: { id: updated.id, status: updated.status, notes: updated.notes } })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Dados inválidos.' }, { status: 400 })
    }
    console.error('[API /leads PATCH]', err)
    return NextResponse.json({ success: false, error: 'Erro interno.' }, { status: 500 })
  }
}
