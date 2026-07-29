import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createOrFindCustomer, createImplantacaoCharge, createSubscription, isAsaasMock, configurePaymentCallback, getCheckoutContinuationCallbackUrl } from '@/lib/asaas'
import { syncFirstSubscriptionPayment } from '@/lib/subscriptionSync'
import { issueCheckoutSessionToken, CHECKOUT_SESSION_COOKIE, CHECKOUT_SESSION_MAX_AGE_SECONDS } from '@/lib/checkoutSession'
import { notifySubscriptionFailed } from '@/lib/mailer'
import { getPromoDeadline } from '@/lib/utils'
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit'
import { PRICING, CONTRACT_VERSION, PROMO_WINDOW_MS, LTCAT_ADDON_PRICE_CENTS, type PlanKey, type FaixaKey } from '@/lib/pricing'

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
  id: string; razaoSocial: string; cnpj: string; implantacaoPromo: boolean; planType: string | null; implantacaoValor: number
  mensalidadeValor: number
  asaasCustomerId: string | null; asaasSubscriptionId: string | null
  payments: { checkoutUrl: string | null }[]
}

// Monta a resposta de sucesso a partir de uma Company já existente — usado
// tanto no caminho normal de idempotência quanto na corrida de duplo-clique.
// mensalidadeValor SEMPRE vem do snapshot gravado na Company (nunca recalculado
// a partir de pricing.ts) — um reenvio/retry depois de pricing.ts mudar não
// pode fazer a resposta divergir do que foi realmente contratado.
function idempotentResponse(company: ExistingCompany) {
  return NextResponse.json({
    success: true,
    data: {
      companyId:           company.id,
      checkoutUrl:         company.payments[0]?.checkoutUrl ?? null,
      isMock:              isAsaasMock,
      isPromo:             company.implantacaoPromo,
      planType:            company.planType,
      implantacaoValor:    company.implantacaoValor / 100,
      mensalidadeValor:    company.mensalidadeValor,
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
//
// Se a implantação está OK mas a assinatura nunca foi criada (asaasSubscriptionId
// nulo — único sinal existente de falha, o catch original nunca grava um valor
// parcial), o retry tenta criar SÓ a assinatura, reaproveitando o customer já
// existente e o snapshot de mensalidade já salvo — nunca recria a cobrança de
// implantação, nunca cria uma segunda Company.
async function respondForExistingCompany(company: ExistingCompany, leadId: string, planLabel: string) {
  const payment = company.payments[0]
  if (!payment?.checkoutUrl) {
    console.error(
      `[LEADS/REGISTER] Company existente SEM Payment de implantação válido — provável estado parcial de falha anterior na cobrança. leadId=${leadId} companyId=${company.id}`
    )
    return NextResponse.json(
      { success: false, error: 'Encontramos um cadastro iniciado, mas a cobrança não foi gerada corretamente. Nossa equipe foi acionada para concluir o processo.' },
      { status: 409 }
    )
  }

  let finalCompany = company
  if (!company.asaasSubscriptionId && company.asaasCustomerId) {
    try {
      const subscription = await createSubscription({
        customerId: company.asaasCustomerId,
        companyId:  company.id,
        value:      company.mensalidadeValor / 100,
        planLabel,
      })
      finalCompany = await prisma.company.update({
        where: { id: company.id },
        data: {
          asaasSubscriptionId: subscription.id,
          subscriptionStatus:  subscription.status.toLowerCase(),
        },
        include: { payments: { where: { type: 'implantacao' }, take: 1 } },
      })
    } catch (err) {
      console.error(`[LEADS/REGISTER] Retry de recuperação de assinatura falhou (companyId=${company.id}):`, err)
      try {
        await notifySubscriptionFailed({
          companyName: company.razaoSocial,
          cnpj:        company.cnpj,
          companyId:   company.id,
          error:       err instanceof Error ? err.message : String(err),
        })
      } catch (notifyErr) {
        console.error('[LEADS/REGISTER] Falha ao notificar equipe sobre retry de assinatura (e-mail NÃO enviado):', notifyErr)
      }
      // segue sem assinatura — mesma resposta idempotente de sempre, só que
      // ainda com subscriptionCreated:false, pronta pra próxima tentativa.
    }
  }

  return idempotentResponse(finalCompany)
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

    const implantacaoBaseCentavos = isPromo ? plan.implantacao.promo : plan.implantacao.padrao
    // LTCAT só é um adicional pago no Essencial — no Premium já vem incluso
    // (ltcatIncluido:true em pricing.ts), então cobrar de novo seria duplicar
    // um serviço que o cliente já pagou dentro da mensalidade. A UI de
    // /elegibilidade já só oferece o checkbox pro Essencial; esta é a mesma
    // regra aplicada no backend, para não depender só do frontend.
    const ltcatCharged = data.ltcatAddon && planType === 'essencial'
    // R$450 somado DEPOIS da escolha promo/padrão — o desconto promocional
    // nunca incide sobre o LTCAT, só sobre a implantação-base.
    const implantacaoValorCentavos = implantacaoBaseCentavos + (ltcatCharged ? LTCAT_ADDON_PRICE_CENTS : 0)
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
      return await respondForExistingCompany(existingCompany, lead.id, plan.name)
    }

    const dbPlan = await prisma.plan.findFirst({ where: { name: employees } })

    // Resolve partner from ref code
    let partner = data.partnerRef
      ? await prisma.partner.findFirst({ where: { code: data.partnerRef, status: 'active' } })
      : null

    // Autoindicação: parceiro não pode se indicar usando o próprio CNPJ. Ignora
    // o vínculo (segue como se não houvesse ?ref=) — não bloqueia o cadastro,
    // só evita que a empresa do parceiro gere Commission pra ele mesmo.
    if (partner?.cnpj && partner.cnpj.replace(/\D/g, '') === lead.cnpj.replace(/\D/g, '')) {
      partner = null
    }

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
          mensalidadeValor,
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
        if (raced) return await respondForExistingCompany(raced, lead.id, plan.name)
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
        ltcatAddon: ltcatCharged,
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
    let mensalidadeAsaasId: string | null = null
    try {
      const subscription = await createSubscription({
        customerId: customer.id,
        companyId:  company.id,
        value:      company.mensalidadeValor / 100,
        planLabel:  plan.name,
      })
      await prisma.company.update({
        where: { id: company.id },
        data: {
          asaasSubscriptionId: subscription.id,
          subscriptionStatus:  subscription.status.toLowerCase(),
        },
      })

      // Sincroniza (só leitura no Asaas) a 1ª cobrança já gerada pela
      // assinatura — nunca cria cobrança nova. Falha aqui NUNCA desfaz o
      // cadastro nem cria uma 2ª assinatura/cobrança; o cliente segue
      // recebendo o checkout da implantação normalmente (Etapa 1A).
      try {
        const syncResult = await syncFirstSubscriptionPayment({
          companyId:           company.id,
          subscriptionId:      subscription.id,
          expectedAmountCents: company.mensalidadeValor,
        })
        console.error(`[LEADS/REGISTER] Sync 1ª mensalidade — companyId=${company.id} subscriptionId=${subscription.id.slice(0, 6)}...${subscription.id.slice(-4)} outcome=${syncResult.outcome}`)
        if (syncResult.outcome === 'synced' || syncResult.outcome === 'already_exists') {
          mensalidadeAsaasId = syncResult.asaasId
        }
      } catch (syncErr) {
        console.error(`[LEADS/REGISTER] Falha ao sincronizar 1ª mensalidade — companyId=${company.id}:`, syncErr)
      }
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

    // Callback de continuação (Etapa 2B.1) — best-effort sobre cobranças já
    // criadas, nunca cria cobrança nova, nunca mexe na assinatura. Só roda
    // em Produção com configuração validada (ver getCheckoutContinuationCallbackUrl);
    // qualquer falha aqui é só log, nunca afeta a resposta do cadastro.
    const callbackUrlResult = getCheckoutContinuationCallbackUrl()
    if (callbackUrlResult.outcome === 'available') {
      try {
        const result = await configurePaymentCallback(charge.id, callbackUrlResult.url)
        console.error(`[LEADS/REGISTER] evento=callback_configurado companyId=${company.id} tipo=implantacao outcome=${result.outcome}`)
      } catch {
        console.error(`[LEADS/REGISTER] evento=callback_falhou companyId=${company.id} tipo=implantacao`)
      }

      if (mensalidadeAsaasId) {
        try {
          const result = await configurePaymentCallback(mensalidadeAsaasId, callbackUrlResult.url)
          console.error(`[LEADS/REGISTER] evento=callback_configurado companyId=${company.id} tipo=mensalidade outcome=${result.outcome}`)
        } catch {
          console.error(`[LEADS/REGISTER] evento=callback_falhou companyId=${company.id} tipo=mensalidade`)
        }
      } else {
        console.error(`[LEADS/REGISTER] evento=callback_pulado companyId=${company.id} tipo=mensalidade motivo=nao_sincronizada`)
      }
    }

    const response = NextResponse.json({
      success: true,
      data: {
        companyId:        company.id,
        checkoutUrl:      charge.invoiceUrl,
        isMock:           isAsaasMock,
        isPromo,
        planType,
        implantacaoValor: implantacaoValorReais,
        mensalidadeValor: company.mensalidadeValor,
        subscriptionCreated,
        ...(subscriptionCreated ? {} : { subscriptionFailureNotified }),
      },
    })
    // Sessão de continuação é um extra de conveniência — se falhar (ex.: secret
    // ausente), o cadastro já está 100% completo (Company/cobrança/assinatura
    // persistidas) e a resposta ao cliente não pode virar erro por causa disso.
    try {
      response.cookies.set(CHECKOUT_SESSION_COOKIE, issueCheckoutSessionToken(company.id), {
        httpOnly: true,
        secure:   process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path:     '/',
        maxAge:   CHECKOUT_SESSION_MAX_AGE_SECONDS,
      })
    } catch (cookieErr) {
      console.error(`[LEADS/REGISTER] evento=checkout_session_falhou companyId=${company.id} tipoErro=${cookieErr instanceof Error ? cookieErr.constructor.name : typeof cookieErr}`)
    }
    return response
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Dados inválidos.', details: err.errors }, { status: 400 })
    }
    console.error('[API /leads/register]', err)
    return NextResponse.json({ success: false, error: 'Erro ao processar cadastro. Tente novamente.' }, { status: 500 })
  }
}
