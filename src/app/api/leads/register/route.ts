import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createOrFindCustomer, createImplantacaoCharge, createSubscription, isAsaasMock, configurePaymentCallback, getCheckoutContinuationCallbackUrl, type ConfigureCallbackResult } from '@/lib/asaas'
import { syncFirstSubscriptionPayment } from '@/lib/subscriptionSync'
import { markCompanyActivatedIfComplete } from '@/lib/companyActivation'
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

// Log do resultado de configurePaymentCallback distinguindo sucesso de falha
// pelo NOME do evento (não só por um campo dentro da linha) — evento_configurado
// só é logado quando o outcome realmente foi 'configured'; um bloqueio
// deliberado (status incompatível, ou billingType/value/dueDate inválidos
// vindos do GET) vira callback_pulado, nunca "falha"; qualquer erro de fato
// vira callback_configuracao_falhou com httpStatus/errorCode sanitizados
// quando disponíveis. Nunca recebe nem loga paymentId, checkoutUrl/invoiceUrl,
// API key, dado pessoal, ou o valor inválido de billingType/value/dueDate —
// só companyId, tipo e os campos seguros do outcome (nunca o dado em si).
function logCallbackOutcome(companyId: string, tipo: 'implantacao' | 'mensalidade', result: ConfigureCallbackResult) {
  if (result.outcome === 'configured') {
    console.error(`[LEADS/REGISTER] evento=callback_configurado companyId=${companyId} tipo=${tipo}`)
    return
  }
  if (result.outcome === 'skipped_invalid_status') {
    console.error(`[LEADS/REGISTER] evento=callback_pulado companyId=${companyId} tipo=${tipo} motivo=status_invalido`)
    return
  }
  if (result.outcome === 'skipped_invalid_charge_data') {
    console.error(`[LEADS/REGISTER] evento=callback_pulado companyId=${companyId} tipo=${tipo} motivo=${result.reason}`)
    return
  }
  if (result.outcome === 'skipped_mock') {
    console.error(`[LEADS/REGISTER] evento=callback_pulado companyId=${companyId} tipo=${tipo} motivo=skipped_mock`)
    return
  }
  const parts = [`evento=callback_configuracao_falhou`, `companyId=${companyId}`, `tipo=${tipo}`, `outcome=error`]
  if (result.httpStatus !== undefined) parts.push(`httpStatus=${result.httpStatus}`)
  if (result.errorCode !== undefined) parts.push(`errorCode=${result.errorCode}`)
  console.error(`[LEADS/REGISTER] ${parts.join(' ')}`)
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

    // Valor "normal" (sem promo, sem LTCAT) congelado à parte do valor base
    // efetivamente usado na cobrança — snapshot histórico do Eixo B, nunca
    // relido de pricing.ts depois (ver Company.implantacaoValorPadrao).
    const implantacaoPadraoCentavos = plan.implantacao.padrao
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

    // Lead.partnerId (se já persistido) é a fonte de verdade do first-touch —
    // foi atribuído antes, em /api/leads ou /api/eligibility, e nenhum
    // partnerRef desta própria request pode substituí-lo. Sem essa checagem,
    // um segundo `?ref=` chegando só nesta etapa "roubava" a indicação de quem
    // trouxe o lead primeiro. Só quando o lead ainda não tem partnerId (first
    // touch nunca aconteceu antes) um partnerRef desta request é considerado.
    let partner = lead.partnerId
      ? await prisma.partner.findUnique({ where: { id: lead.partnerId } })
      : (data.partnerRef
          ? await prisma.partner.findFirst({ where: { code: data.partnerRef, status: 'active' } })
          : null)

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

    let company: Awaited<ReturnType<typeof prisma.company.create>>
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
          implantacaoValor:       implantacaoValorCentavos,
          implantacaoValorPadrao: implantacaoPadraoCentavos,
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
    let charge: Awaited<ReturnType<typeof createImplantacaoCharge>>
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

      // Defesa em profundidade, NÃO um mecanismo de recovery: o sync acima
      // pode em tese criar a mensalidade já com status='confirmed' (mapeado
      // direto do status retornado pela Asaas), sem passar pelo webhook —
      // este é o único ponto do código onde isso acontece. Na prática, porém,
      // isso nunca completa a ativação HOJE: a implantação é sempre 'pending'
      // neste exato instante do cadastro (criada linhas acima, e o
      // checkoutUrl só é devolvido ao cliente na resposta desta mesma
      // requisição, bem depois deste ponto — o cliente fisicamente não pode
      // ainda ter pago a implantação). Esta chamada é só uma rede de
      // segurança caso um refator futuro quebre essa ordem — por isso
      // best-effort (.catch) é aceitável aqui, diferente do webhook (ver
      // markCompanyActivatedIfComplete): não há nada de fato "em risco de
      // ficar faltando" neste call site hoje, então não precisa da garantia
      // transacional. Company recém-criada nesta mesma requisição, então
      // também não há risco de "ativação tardia inventada" de Company legada
      // (esse risco só existe no webhook, que audita pagamentos de Companies
      // já existentes há tempo — ver o guard isRelevantConfirmation em
      // src/app/api/webhooks/asaas/route.ts).
      await markCompanyActivatedIfComplete(company.id)
        .catch(err => console.error(`[LEADS/REGISTER] Falha ao verificar ativação após sync — companyId=${company.id}:`, err))
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
      // Só grava partnerId aqui quando é a primeira atribuição (lead.partnerId
      // ainda não existia) — se já vinha do Lead, é reafirmação redundante do
      // mesmo valor já persistido, não uma escrita nova.
      data: { status: 'registered', ...(partner && !lead.partnerId ? { partnerId: partner.id } : {}) },
    })

    // Sessão de continuação é um extra de conveniência — se falhar (ex.: secret
    // ausente), o cadastro já está 100% completo (Company/cobrança/assinatura
    // persistidas) e a resposta ao cliente não pode virar erro por causa disso.
    // Resposta otimista real (sem dry-run): tenta aplicar o cookie NA PRÓPRIA
    // resposta que será devolvida; só se essa aplicação específica funcionar
    // é que `continuationReady` vira true e os callbacks (abaixo) são
    // tentados — nunca numa resposta descartável separada.
    const buildResponseBody = (continuationReady: boolean) => {
      return {
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
          continuationReady,
        },
      }
    }

    let checkoutToken: string | null = null
    try {
      checkoutToken = issueCheckoutSessionToken(company.id)
    } catch (err) {
      console.error(`[LEADS/REGISTER] evento=checkout_session_falhou companyId=${company.id} tipoErro=${err instanceof Error ? err.constructor.name : typeof err}`)
    }

    let continuationReady = false
    let response: NextResponse | undefined
    if (checkoutToken) {
      try {
        const optimisticResponse = NextResponse.json(buildResponseBody(true))
        optimisticResponse.cookies.set(CHECKOUT_SESSION_COOKIE, checkoutToken, {
          httpOnly: true,
          secure:   process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path:     '/',
          maxAge:   CHECKOUT_SESSION_MAX_AGE_SECONDS,
        })
        response = optimisticResponse
        continuationReady = true
      } catch (cookieErr) {
        console.error(`[LEADS/REGISTER] evento=checkout_session_falhou companyId=${company.id} tipoErro=${cookieErr instanceof Error ? cookieErr.constructor.name : typeof cookieErr}`)
      }
    }
    if (!response) {
      // Sem token ou cookies.set falhou — descarta qualquer resposta parcial
      // e devolve uma nova, limpa, com continuationReady:false.
      response = NextResponse.json(buildResponseBody(false))
    }

    // Callback de continuação (Etapa 2B.1/2B.2) — best-effort sobre cobranças
    // já criadas, nunca cria cobrança nova, nunca mexe na assinatura. Só roda
    // em Produção com configuração validada E somente depois que o cookie já
    // foi aplicado de verdade na resposta real (continuationReady=true) —
    // nunca configura um retorno para uma página cuja sessão não foi emitida.
    if (continuationReady) {
      const callbackUrlResult = getCheckoutContinuationCallbackUrl()
      if (callbackUrlResult.outcome === 'available') {
        try {
          const result = await configurePaymentCallback(charge.id, callbackUrlResult.url)
          logCallbackOutcome(company.id, 'implantacao', result)
        } catch {
          // configurePaymentCallback nunca lança (sempre devolve outcome
          // estruturado) — este catch é só defesa extra, nunca deve ser
          // alcançado na prática; nunca serializa o erro capturado.
          logCallbackOutcome(company.id, 'implantacao', { outcome: 'error' })
        }

        if (mensalidadeAsaasId) {
          try {
            const result = await configurePaymentCallback(mensalidadeAsaasId, callbackUrlResult.url)
            logCallbackOutcome(company.id, 'mensalidade', result)
          } catch {
            logCallbackOutcome(company.id, 'mensalidade', { outcome: 'error' })
          }
        } else {
          console.error(`[LEADS/REGISTER] evento=callback_pulado companyId=${company.id} tipo=mensalidade motivo=nao_sincronizada`)
        }
      } else {
        // Gate de ambiente/config não liberou o callback — nunca loga a chave,
        // a URL de checkout/invoice nem o paymentId, só o motivo diagnóstico
        // (um dos outcomes de getCheckoutContinuationCallbackUrl) para permitir
        // diferenciar a causa em produção sem expor segredo algum.
        console.error(`[LEADS/REGISTER] evento=callback_pulado companyId=${company.id} tipo=implantacao motivo=${callbackUrlResult.outcome}`)
        console.error(`[LEADS/REGISTER] evento=callback_pulado companyId=${company.id} tipo=mensalidade motivo=${callbackUrlResult.outcome}`)
      }
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
