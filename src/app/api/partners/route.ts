import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { notifyNewPartner, notifyNewLead, sendPartnerActivated } from '@/lib/mailer'
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit'
import { PARTNER_TERMS_VERSION } from '@/lib/pricing'
import { verifyAdminSecret } from '@/lib/adminAuth'

// .nullish() (não .optional()): o frontend envia referral: null quando o
// checkbox de indicação está desmarcado, e .optional() rejeita null com
// "Dados inválidos" — bloqueava todo cadastro sem indicação imediata.
const referralSchema = z.object({
  companyName: z.string().optional(),
  cnpj: z.string().optional(),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  employeesEst: z.coerce.number().optional(),
  observations: z.string().optional(),
}).nullish()

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
  consentTerms: z.boolean().optional().default(false),
  referral: referralSchema,
})

export async function POST(req: NextRequest) {
  if (!rateLimit(req, 5)) return rateLimitResponse()

  try {
    const body = await req.json()
    const data = schema.parse(body)

    if (!data.consentContact) {
      return NextResponse.json({ success: false, error: 'Autorização de contato é obrigatória.' }, { status: 400 })
    }
    if (!data.consentTerms) {
      return NextResponse.json({ success: false, error: 'É necessário aceitar o Termo de Parceria.' }, { status: 400 })
    }

    // Evita parceiros duplicados por e-mail (cada submit criava um registro novo)
    const existing = await prisma.partner.findFirst({
      where: { email: { equals: data.email, mode: 'insensitive' } },
    })
    if (existing) {
      return NextResponse.json({
        success: false,
        error: 'Este e-mail já possui cadastro de parceiro. Se já foi ativado, acesse o portal em /parceiro/login. Dúvidas: (21) 99724-8630.',
      }, { status: 409 })
    }

    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? req.headers.get('x-real-ip')
      ?? 'unknown'

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
        // Aceite eletrônico do Termo de Parceria (data, IP e versão)
        termsAcceptedAt:   new Date(),
        termsAcceptanceIp: clientIp,
        termsVersion:      PARTNER_TERMS_VERSION,
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

      // A indicação também entra no pipeline de leads (antes ficava só em
      // partner_referrals e não aparecia em /admin/leads nem notificava a equipe)
      const refCnpjDigits = (data.referral.cnpj ?? '').replace(/\D/g, '')
      if (refCnpjDigits.length === 14) {
        const leadId = `cnpj_${refCnpjDigits}`
        await prisma.lead.upsert({
          where: { id: leadId },
          update: {}, // lead já existente não é sobrescrito por indicação manual
          create: {
            id: leadId,
            cnpj: data.referral.cnpj ?? '',
            companyName: data.referral.companyName,
            name: data.referral.contactName ?? 'Contato não informado',
            email: data.referral.email ?? data.email, // fallback: e-mail do parceiro
            whatsapp: data.referral.phone ?? data.whatsapp,
            source: 'partner',
            partnerId: partner.id,
            status: 'captured',
            notes: `Indicação manual no cadastro do parceiro ${data.name} (${data.office}).${data.referral.observations ? ' Obs: ' + data.referral.observations : ''}`,
          },
        }).catch(err => console.error('[API /partners] lead da indicação:', err))
        await notifyNewLead({
          cnpj: data.referral.cnpj ?? '',
          companyName: data.referral.companyName,
          name: data.referral.contactName ?? 'Contato não informado',
          email: data.referral.email ?? data.email,
          whatsapp: data.referral.phone ?? data.whatsapp,
        }).catch(() => {})
      }
    }

    // Notify team (non-blocking)
    await notifyNewPartner({
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
  if (!verifyAdminSecret(secret)) {
    return NextResponse.json({ success: false, error: 'Não autorizado.' }, { status: 401 })
  }
  const partners = await prisma.partner.findMany({
    include: { referrals: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ success: true, data: partners })
}

const patchSchema = z.object({
  id:     z.string().min(1),
  status: z.enum(['pending', 'active', 'inactive']),
  tier:   z.enum(['comum', 'recorrente', 'estratégico']).optional(),
})

// Ativação/inativação de parceiro pelo admin — sem status 'active'
// o parceiro não consegue logar nem ter indicações rastreadas
export async function PATCH(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret')
  if (!verifyAdminSecret(secret)) {
    return NextResponse.json({ success: false, error: 'Não autorizado.' }, { status: 401 })
  }
  try {
    const body = await req.json()
    const data = patchSchema.parse(body)

    const before = await prisma.partner.findUnique({ where: { id: data.id } })
    if (!before) {
      return NextResponse.json({ success: false, error: 'Parceiro não encontrado.' }, { status: 404 })
    }

    const partner = await prisma.partner.update({
      where: { id: data.id },
      data: { status: data.status, ...(data.tier ? { tier: data.tier } : {}) },
    })

    // Primeira ativação: envia boas-vindas com acesso ao portal e link de indicação.
    // IMPORTANTE: com await — envio fire-and-forget morre quando a função
    // serverless retorna (a Vercel congela a instância antes da promise completar).
    let emailSent = false
    if (data.status === 'active' && before.status !== 'active') {
      try {
        await sendPartnerActivated({ to: partner.email, name: partner.name, code: partner.code })
        emailSent = true
      } catch (err) {
        console.error('[API /partners] sendPartnerActivated:', err)
      }
    }

    return NextResponse.json({ success: true, data: { id: partner.id, status: partner.status, code: partner.code, emailSent } })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Dados inválidos.', details: err.errors }, { status: 400 })
    }
    console.error('[API /partners PATCH]', err)
    return NextResponse.json({ success: false, error: 'Erro ao atualizar parceiro.' }, { status: 500 })
  }
}
