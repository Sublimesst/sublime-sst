import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createOrFindCustomer, createImplantacaoCharge, createSubscription, isAsaasMock } from '@/lib/asaas'
import { notifySubscriptionFailed } from '@/lib/mailer'
import { getPromoDeadline } from '@/lib/utils'
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit'
import { PRICING, CONTRACT_VERSION, PROMO_WINDOW_MS, type PlanKey, type FaixaKey } from '@/lib/pricing'

const schema = z.object({
  cnpj:               z.string().min(14),
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
  partnerRef:         z.string().optional(),
})

type ExistingCompany = {
  id: string; implantacaoPromo: boolean; planType: string | null; implantacaoValor: number
  asaasSubscriptionId: string | null; payments: { checkoutUrl: string | null }[]
}

// Monta a resposta de sucesso a partir de uma Company já existente — usado
// tanto no caminho normal de idempotência quanto na corrida de duplo-clique.
function idempotentResponse(company: ExistingCompany, mensalidadeValor: number) {
  return NextResponse.json({
    success: true,
    data: {
      companyId:           company.id,
      checkoutUrl:         company.payments[0]?.checkoutUrl ?? null,
      isMock:              isAsaasMock,
      isPromo:             company.implantacaoPromo,
      planType:            company.planType,
      implantacaoValor:    company.implantacaoValor / 100,
      mensalidadeValor,
      subscriptionCreated: !!company.asaasSubscriptionId,
      alreadyRegistered:   true,
    },
  })
}

// Única checagem de idempotência (usada nos dois pontos onde uma Company já
// existente é encontrada) — só considera "sucesso" se houver Payment de
// implantação com checkoutUrl real. Sem isso, é um estado parcial de uma
// falha anterior na cobrança (Company criada, createImplantacaoCharge falhou
// depois) — um retry NÃO pode disfarçar isso de sucesso com checkoutUrl nulo.
function respondForExistingCompany(company: ExistingCompany, mensalidadeValor: number, leadId: string) {
  const payment = company.payments[0]
  if (payment?.checkoutUrl) {
    return idempotentResponse(company, mensalidadeValor)
  }
  console.error(
    `[LEADS/REGISTER] Company existente SEM Payment de implantação válido — provável estado parcial de falha anterior na cobrança. leadId=${leadId} companyId=${company.id}`
  )
  return NextResponse.json(
    { success: false, error: 'Encontramos um cadastro iniciado, mas a cobrança não foi gerada corretamente. Nossa equipe foi acionada para concluir o processo.' },
    { status: 409 }
  )
}

export async function POST(req: NextRequest) {
  const limit = Number(process.env.RATE_LIMIT_REGISTER ?? 5)
  if (!rateLimit(req, limit)) return rateLimitResponse()

  try {
    const body = await req.json()
    const data = schema.parse(body)

    if (!data.consentDataUsage || !data.consentDeclaration || !data.consentTerms) {
      return NextResponse.json({ success: false, error: 'Todos os consentimentos são obrigatórios.' }, { status: 400 })
    }

    if (!data.contractAccepted) {
      return NextResponse.json({ success: false, error: 'É necessário aceitar o contrato de prestação de serviços.' }, { status: 400 })
    }

    // Lead resolvido pelo mesmo id determinístico usado em /api/leads e
    // /api/eligibility (cnpj_XXXX) — não mais por e-mail, que é ambíguo
    // (mesmo e-mail pode ter testado várias empresas/CNPJs diferentes).
    const leadId = `cnpj_${data.cnpj.replace(/\D/g, '')}`
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { eligibilityAssessments: { orderBy: { createdAt: 'desc' }, take: 1 } },
    })

    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead não encontrado. Refaça o teste de elegibilidade.' }, { status: 404 })
    }

    const assessment = lead.eligibilityAssessments[0]
    if (!assessment) {
      return NextResponse.json(
        { success: false, error: 'Não encontramos sua avaliação de elegibilidade. Refaça o teste antes de continuar o cadastro.' },
        { status: 422 }
      )
    }

    const isPromo = assessment.resultShownAt
      ? (Date.now() - new Date(assessment.resultShownAt).getTime()) < PROMO_WINDOW_MS
      : false

    const planType = data.planType as PlanKey
    const employees = assessment.employees as FaixaKey
    const plan = PRICING[planType]

    const implantacaoValorCentavos = isPromo ? plan.implantacao.promo : plan.implantacao.padrao
    const implantacaoValorReais    = implantacaoValorCentavos / 100
    // Fallback aqui é só defesa de indexação (employees nunca deveria ser algo
    // fora das 3 faixas, já que '21+' nunca é elegível) — não é mais o fallback
    // de dado ausente que existia antes de o assessment ser obrigatório acima.
    const mensalidadeValor = plan.faixas[employees]?.monthly ?? plan.faixas['1-5'].monthly

    // Idempotência: Company.leadId é @unique — se já existe uma empresa para
    // este lead, retorna o resultado já existente em vez de criar duplicata
    // (cobre duplo-clique e retry do mesmo POST).
    const existingCompany = await prisma.company.findUnique({
      where: { leadId: lead.id },
      include: { payments: { where: { type: 'implantacao' }, take: 1 } },
    })
    if (existingCompany) {
      return respondForExistingCompany(existingCompany, mensalidadeValor, lead.id)
    }

    const dbPlan = await prisma.plan.findFirst({ where: { name: employees } })

    // Resolve partner from ref code
    const partner = data.partnerRef
      ? await prisma.partner.findFirst({ where: { code: data.partnerRef, status: 'active' } })
      : null

    // Nenhuma Company é criada antes deste ponto — se a Asaas falhar aqui
    // (ex.: chave/URL de ambiente incompatível, conta mal configurada), nada
    // fica pendente no banco local. Mensagem específica em vez de cair no
    // catch genérico, que sempre dizia "erro ao processar cadastro" mesmo
    // quando o problema era só de configuração/conectividade com a Asaas.
    let customer
    try {
      customer = await createOrFindCustomer({
        cnpj:  lead.cnpj,
        name:  data.razaoSocial,
        email: data.email,
        phone: data.whatsapp,
      })
    } catch (err) {
      console.error('[LEADS/REGISTER] Falha ao criar/buscar customer na Asaas:', err)
      return NextResponse.json(
        { success: false, error: 'Não foi possível conectar ao sistema de cobrança no momento. Tente novamente em alguns minutos ou fale conosco pelo WhatsApp.' },
        { status: 502 }
      )
    }

    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? req.headers.get('x-real-ip')
      ?? 'unknown'
    const clientUa = req.headers.get('user-agent') ?? 'unknown'

    let company
    try {
      company = await prisma.company.create({
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
          planType,
          implantacaoValor:     implantacaoValorCentavos,
          implantacaoPromo:     isPromo,
          promoDeadline:        isPromo ? getPromoDeadline(24) : null,
          contractAcceptedAt:   new Date(),
          contractAcceptanceIp: clientIp,
          contractAcceptanceUa: clientUa,
          contractVersion:      CONTRACT_VERSION,
          ltcatAddon:           data.ltcatAddon,
          partnerId:            partner?.id,
          source:               partner ? 'partner' : 'site',
          status:               'pending',
          asaasCustomerId:      customer.id,
        },
      })
    } catch (err) {
      // Corrida: outra requisição (duplo-clique/retry quase simultâneo) já
      // criou a Company para este leadId entre o check de idempotência acima
      // e este create — trata como sucesso idempotente, não como erro.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const raced = await prisma.company.findUnique({
          where: { leadId: lead.id },
          include: { payments: { where: { type: 'implantacao' }, take: 1 } },
        })
        if (raced) return respondForExistingCompany(raced, mensalidadeValor, lead.id)
      }
      throw err
    }

    // A Company (id acima) já existe no banco neste ponto — se a cobrança
    // falhar aqui, fica uma Company sem Payment. Logamos o companyId pra dar
    // pra investigar/retomar manualmente; o cliente recebe mensagem específica.
    let charge
    try {
      charge = await createImplantacaoCharge({
        customerId: customer.id,
        isPromo,
        companyId:  company.id,
        cnpj:       lead.cnpj,
        amount:     implantacaoValorReais,
        planLabel:  plan.name,
      })
    } catch (err) {
      console.error(`[LEADS/REGISTER] Falha ao criar cobrança de implantação na Asaas (companyId=${company.id}):`, err)
      return NextResponse.json(
        { success: false, error: 'Não foi possível gerar a cobrança de implantação no momento. Tente novamente em alguns minutos ou fale conosco pelo WhatsApp.' },
        { status: 502 }
      )
    }

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

    // Assinatura recorrente (mensalidade). Falha aqui NÃO derruba o cadastro —
    // o cliente já tem uma cobrança de implantação válida. subscriptionCreated
    // vai na resposta como sinal explícito (não só em log) para o time saber
    // que precisa criar a assinatura manualmente no painel da Asaas.
    let subscriptionCreated = true
    let subscriptionFailureNotified: boolean | null = null
    try {
      const subscription = await createSubscription({
        customerId: customer.id,
        companyId:  company.id,
        value:      mensalidadeValor / 100,
        planLabel:  plan.name,
      })
      await prisma.company.update({
        where: { id: company.id },
        data: {
          asaasSubscriptionId: subscription.id,
          subscriptionStatus:  subscription.status.toLowerCase(),
        },
      })
    } catch (err) {
      subscriptionCreated = false
      console.error('[LEADS/REGISTER] Falha ao criar assinatura recorrente:', err)
      try {
        await notifySubscriptionFailed({
          companyName: company.razaoSocial,
          cnpj:        company.cnpj,
          companyId:   company.id,
          error:       err instanceof Error ? err.message : String(err),
        })
        subscriptionFailureNotified = true
      } catch (notifyErr) {
        subscriptionFailureNotified = false
        console.error('[LEADS/REGISTER] Falha ao notificar equipe sobre assinatura (e-mail NÃO enviado):', notifyErr)
      }
    }

    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: 'registered', ...(partner ? { partnerId: partner.id } : {}) },
    })

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
        subscriptionCreated,
        ...(subscriptionCreated ? {} : { subscriptionFailureNotified }),
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
