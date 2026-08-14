import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { runSerializable } from '@/lib/prismaSerializable'
import { notifyNewPartner, notifyNewLead, sendPartnerActivated } from '@/lib/mailer'
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit'
import { PARTNER_TERMS_VERSION } from '@/lib/pricing'
import { verifyAdminSecret } from '@/lib/adminAuth'
import { validateCNPJ } from '@/lib/utils'

// Erro interno só para distinguir qual campo colidiu — nunca sai da rota,
// é sempre convertido para a resposta 409 correspondente no catch abaixo.
class PartnerDuplicateError extends Error {
  constructor(public field: 'email' | 'cnpj') { super(`duplicate_${field}`) }
}

const DUPLICATE_MESSAGE: Record<'email' | 'cnpj', string> = {
  email: 'Este e-mail já possui cadastro de parceiro. Se já foi ativado, acesse o portal em /parceiro/login. Dúvidas: (21) 99724-8630.',
  cnpj:  'Este CNPJ já possui cadastro de parceiro. Se já foi ativado, acesse o portal em /parceiro/login. Dúvidas: (21) 99724-8630.',
}

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
  // MVP: parceiro somente PJ — CNPJ é obrigatório aqui e validado (checksum)
  // logo abaixo, no handler (o formato bruto ainda pode vir mascarado do
  // frontend, então só o tamanho mínimo é checado no schema).
  cnpj: z.string().min(1),
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

    // MVP: parceiro somente PJ — CNPJ obrigatório e validado (checksum módulo 11)
    // no servidor, nunca só no frontend. Normalizado para dígitos antes de
    // gravar (mesma convenção usada no id determinístico de Lead), o que também
    // torna a checagem de duplicidade abaixo uma comparação exata, sem precisar
    // varrer todos os parceiros comparando máscaras diferentes.
    if (!validateCNPJ(data.cnpj)) {
      return NextResponse.json({ success: false, error: 'CNPJ inválido.' }, { status: 400 })
    }
    const cnpjDigits = data.cnpj.replace(/\D/g, '')

    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? req.headers.get('x-real-ip')
      ?? 'unknown'

    // Proteção de duplicidade compatível com o schema atual (Partner.email e
    // Partner.cnpj não têm índice único — não é uma garantia equivalente a uma
    // constraint no banco). Checagem + criação rodam dentro da mesma transação
    // Serializable (mesma técnica já usada em onboarding/workers): duas
    // requisições concorrentes que ambas leem "sem duplicata" e tentam criar
    // colidem por write-skew — o Postgres aborta uma delas (P2034) e
    // runSerializable reexecuta do zero, vendo então o Partner já criado pela
    // outra. `fn` não tem nenhum efeito colateral externo (e-mail só é
    // disparado depois, fora da transação, uma única vez).
    let partner: Awaited<ReturnType<typeof prisma.partner.create>>
    try {
      partner = await runSerializable(async (tx) => {
        const [existingByEmail, existingByCnpj] = await Promise.all([
          tx.partner.findFirst({ where: { email: { equals: data.email, mode: 'insensitive' } } }),
          tx.partner.findFirst({ where: { cnpj: cnpjDigits } }),
        ])
        if (existingByEmail) throw new PartnerDuplicateError('email')
        if (existingByCnpj) throw new PartnerDuplicateError('cnpj')

        // Autoativação: cadastro PJ com CNPJ válido, sem duplicidade e com
        // aceite do Termo de Parceria já registrado (data/IP/versão abaixo)
        // entra direto como 'active' — sem depender de ativação manual do
        // Admin. O Admin continua podendo inativar/reativar a qualquer momento.
        return tx.partner.create({
          data: {
            name: data.name,
            office: data.office,
            cnpj: cnpjDigits,
            email: data.email,
            whatsapp: data.whatsapp,
            clientsEstimate: data.clientsEstimate,
            city: data.city,
            state: data.state,
            status: 'active',
            // Aceite eletrônico do Termo de Parceria (data, IP e versão)
            termsAcceptedAt:   new Date(),
            termsAcceptanceIp: clientIp,
            termsVersion:      PARTNER_TERMS_VERSION,
          },
        })
      })
    } catch (err) {
      if (err instanceof PartnerDuplicateError) {
        return NextResponse.json({ success: false, error: DUPLICATE_MESSAGE[err.field] }, { status: 409 })
      }
      throw err
    }

    // E-mail de boas-vindas com o link de indicação exclusivo — com await
    // (mesmo motivo do PATCH de ativação manual: fire-and-forget morre quando
    // a função serverless retorna). Falha aqui NUNCA reverte o Partner já
    // criado e válido — só fica registrada em log para acompanhamento manual.
    try {
      await sendPartnerActivated({ to: partner.email, name: partner.name, code: partner.code })
    } catch (err) {
      console.error('[API /partners] sendPartnerActivated (autoativação):', err)
    }

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
