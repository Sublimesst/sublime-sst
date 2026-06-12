import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { notifyNewPartner } from '@/lib/mailer'

const referralSchema = z.object({
  companyName: z.string().optional(),
  cnpj: z.string().optional(),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  employeesEst: z.coerce.number().optional(),
  observations: z.string().optional(),
}).optional()

const schema = z.object({
  name: z.string().min(1),
  office: z.string().min(1),
  cnpj: z.string().optional(),
  email: z.string().email(),
  whatsapp: z.string().min(10),
  clientsEstimate: z.coerce.number().optional(),
  city: z.string().min(1),
  state: z.string().length(2),
  consentContact: z.boolean(),
  referral: referralSchema,
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = schema.parse(body)

    if (!data.consentContact) {
      return NextResponse.json({ success: false, error: 'Autorização de contato é obrigatória.' }, { status: 400 })
    }

    const partner = await prisma.partner.create({
      data: {
        name: data.name,
        office: data.office,
        cnpj: data.cnpj,
        email: data.email,
        whatsapp: data.whatsapp,
        clientsEstimate: data.clientsEstimate,
        city: data.city,
        state: data.state,
        status: 'pending',
      },
    })

    // Save referral if provided
    if (data.referral?.companyName) {
      await prisma.partnerReferral.create({
        data: {
          partnerId: partner.id,
          companyName: data.referral.companyName ?? '',
          cnpj: data.referral.cnpj,
          contactName: data.referral.contactName,
          phone: data.referral.phone,
          email: data.referral.email,
          employeesEst: data.referral.employeesEst,
          observations: data.referral.observations,
          status: 'pending',
        },
      })
    }

    // Notify team (non-blocking)
    notifyNewPartner({
      name: data.name, office: data.office,
      email: data.email, whatsapp: data.whatsapp,
      city: data.city, state: data.state,
      clientsEstimate: data.clientsEstimate,
      hasReferral: !!data.referral?.companyName,
      referralCompany: data.referral?.companyName,
    }).catch(() => {})

    return NextResponse.json({ success: true, data: { partnerId: partner.id, code: partner.code } })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Dados inválidos.', details: err.errors }, { status: 400 })
    }
    console.error('[API /partners]', err)
    return NextResponse.json({ success: false, error: 'Erro ao salvar dados.' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret')
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ success: false, error: 'Não autorizado.' }, { status: 401 })
  }
  const partners = await prisma.partner.findMany({
    include: { referrals: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ success: true, data: partners })
}
