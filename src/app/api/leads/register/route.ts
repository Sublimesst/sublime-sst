import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createOrFindCustomer, createImplantacaoCharge, isAsaasMock } from '@/lib/asaas'
import { getPromoDeadline } from '@/lib/utils'
import { PRICING, CONTRACT_VERSION, PROMO_WINDOW_MS, type PlanKey, type FaixaKey } from '@/lib/pricing'

const schema = z.object({
  razaoSocial:        z.string().min(1),
  nomeFantasia:       z.string().optional(),
  responsavel:        z.string().min(1),
  email:              z.string().email(),
  whatsapp:           z.string().min(10),
  cep:                z.string().min(8),
  cidade:             z.string().min(1),
  estado:             z.string().length(2),
  endereco:           z.string().min(1),
  numFuncionarios:    z.coerce.number().min(1).max(20),
  cargos:             z.string().optional(),
  observations:       z.string().optional(),
  planType:           z.enum(['essencial', 'premium']).default('essencial'),
  consentDataUsage:   z.boolean(),
  consentDeclaration: z.boolean(),
  consentTerms:       z.boolean(),
  contractAccepted:   z.boolean(),
  ltcatAddon:         z.boolean().optional().default(false),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = schema.parse(body)

    if (!data.consentDataUsage || !data.consentDeclaration || !data.consentTerms) {
      return NextResponse.json({ success: false, error: 'Todos os consentimentos são obrigatórios.' }, { status: 400 })
    }

    if (!data.contractAccepted) {
      return NextResponse.json({ success: false, error: 'É necessário aceitar o contrato de prestação de serviços.' }, { status: 400 })
    }

    const lead = await prisma.lead.findFirst({
      where: { email: data.email },
      orderBy: { createdAt: 'desc' },
      include: { eligibilityAssessments: { orderBy: { createdAt: 'desc' }, take: 1 } },
    })

    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead não encontrado. Refaça o teste de elegibilidade.' }, { status: 404 })
    }

    const assessment = lead.eligibilityAssessments[0]
    const isPromo = assessment?.resultShownAt
      ? (Date.now() - new Date(assessment.resultShownAt).getTime()) < PROMO_WINDOW_MS
      : false

    const planType = data.planType as PlanKey
    const employees = ((assessment?.employees ?? '1-5') as FaixaKey)
    const plan = PRICING[planType]

    const implantacaoValorCentavos = isPromo ? plan.implantacao.promo : plan.implantacao.padrao
    const implantacaoValorReais    = implantacaoValorCentavos / 100
    const mensalidadeValor         = plan.faixas[employees]?.monthly ?? plan.faixas['1-5'].monthly

    const dbPlan = await prisma.plan.findFirst({ where: { name: employees } })

    const customer = await createOrFindCustomer({
      cnpj:  lead.cnpj,
      name:  data.razaoSocial,
      email: data.email,
      phone: data.whatsapp,
    })

    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? req.headers.get('x-real-ip')
      ?? 'unknown'
    const clientUa = req.headers.get('user-agent') ?? 'unknown'

    const company = await prisma.company.create({
      data: {
        leadId:               lead.id,
        planId:               dbPlan?.id,
        cnpj:                 lead.cnpj,
        razaoSocial:          data.razaoSocial,
        nomeFantasia:         data.nomeFantasia,
        responsavel:          data.responsavel,
        email:                data.email,
        whatsapp:             data.whatsapp,
        cep:                  data.cep,
        cidade:               data.cidade,
        estado:               data.estado,
        endereco:             data.endereco,
        numFuncionarios:      data.numFuncionarios,
        cargos:               data.cargos,
        observations:         data.observations,
        source:               'site',
        planType,
        implantacaoValor:     implantacaoValorCentavos,
        implantacaoPromo:     isPromo,
        promoDeadline:        isPromo ? getPromoDeadline(24) : null,
        contractAcceptedAt:   new Date(),
        contractAcceptanceIp: clientIp,
        contractAcceptanceUa: clientUa,
        contractVersion:      CONTRACT_VERSION,
        status:               'pending',
      },
    })

    const charge = await createImplantacaoCharge({
      customerId: customer.id,
      isPromo,
      companyId:  company.id,
      cnpj:       lead.cnpj,
      amount:     implantacaoValorReais,
      planLabel:  plan.name,
    })

    await prisma.payment.create({
      data: {
        companyId:   company.id,
        asaasId:     charge.id,
        type:        'implantacao',
        amount:      implantacaoValorCentavos,
        status:      'pending',
        checkoutUrl: charge.invoiceUrl,
        invoiceUrl:  charge.invoiceUrl,
      },
    })

    await prisma.lead.update({ where: { id: lead.id }, data: { status: 'registered' } })

    return NextResponse.json({
      success: true,
      data: {
        companyId:        company.id,
        checkoutUrl:      charge.invoiceUrl,
        isMock:           isAsaasMock,
        isPromo,
        planType,
        implantacaoValor: implantacaoValorReais,
        mensalidadeValor,
      },
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Dados inválidos.', details: err.errors }, { status: 400 })
    }
    console.error('[API /leads/register]', err)
    return NextResponse.json({ success: false, error: 'Erro ao processar cadastro. Tente novamente.' }, { status: 500 })
  }
}
