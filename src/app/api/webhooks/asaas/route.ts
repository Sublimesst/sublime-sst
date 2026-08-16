import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { sendWelcomeEmail, notifyPaymentConfirmed, notifyPaymentOverdue, notifyContractPdfFailed } from '@/lib/mailer'
import { generateContractPdf } from '@/lib/contractPdf'
import { persistContractPdf, isContractPersisted } from '@/lib/contractPersistence'
import { CONTRACT_VERSION } from '@/lib/pricing'
import { safeCheckoutUrl } from '@/lib/paymentPresentation'

// Backfill atômico de URL (P0): cada campo é protegido pela própria condição
// de nulidade no where — nunca por uma leitura anterior — então duas
// atualizações concorrentes (ex.: esta e um evento simultâneo) nunca se
// sobrescrevem. Usado tanto após conflito de criação (P2002) quanto no ramo
// de Payment já existente. Nunca apaga um valor já presente; nunca chama a
// Asaas. Se validInvoiceUrl estiver ausente, não faz nenhuma atualização.
async function backfillPaymentUrls(paymentId: string, validInvoiceUrl: string | null): Promise<void> {
  if (!validInvoiceUrl) return
  // Promise.all (não await sequencial): as duas chamadas disparam juntas, então
  // a falha de uma nunca impede a outra de ser tentada contra o banco.
  await Promise.all([
    prisma.payment.updateMany({
      where: { id: paymentId, checkoutUrl: null },
      data: { checkoutUrl: validInvoiceUrl },
    }),
    prisma.payment.updateMany({
      where: { id: paymentId, invoiceUrl: null },
      data: { invoiceUrl: validInvoiceUrl },
    }),
  ])
}

// P2002 (asaasId @unique): quando o create colide com uma criação concorrente
// que já venceu a corrida, busca o registro vencedor por asaasId (select
// mínimo, sem dado pessoal) e confirma companyId/type antes de aplicar o
// backfill atômico — nunca cria outro Payment, nunca loga id/URL.
async function backfillAfterCreateConflict(params: {
  asaasId: string
  companyId: string
  type: string
  validInvoiceUrl: string | null
}): Promise<void> {
  const winner = await prisma.payment.findFirst({
    where: { asaasId: params.asaasId },
    select: { id: true, companyId: true, type: true },
  })
  if (!winner) {
    console.error('[WEBHOOK] Conflito de criação (P2002) sem registro vencedor localizável por asaasId')
    return
  }
  if (winner.companyId !== params.companyId || winner.type !== params.type) {
    console.error('[WEBHOOK] Conflito de criação (P2002) com divergência de integridade — backfill ignorado')
    return
  }
  await backfillPaymentUrls(winner.id, params.validInvoiceUrl)
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('asaas-access-token') ?? ''
  const secret = process.env.ASAAS_WEBHOOK_TOKEN ?? ''
  const tokenBuf = Buffer.from(token)
  const secretBuf = Buffer.from(secret)
  const authorized = secret.length > 0 &&
    tokenBuf.length === secretBuf.length &&
    timingSafeEqual(tokenBuf, secretBuf)
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body?.event || !body?.payment) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const { event, payment } = body

  if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
    // Validado ANTES de persistir (P0 checkoutUrl) — aceita só https + host
    // oficial Asaas; nunca inventa URL, nunca chama a Asaas para obter isso.
    const validInvoiceUrl = safeCheckoutUrl(payment.invoiceUrl) ?? null

    let dbPayment = await prisma.payment.findFirst({
      where: { asaasId: payment.id },
      include: { company: { include: { lead: true } } },
    })

    if (!dbPayment) {
      // Mensalidade gerada pela assinatura Asaas, ainda sem Payment local.
      // Reconcilia por externalReference (= companyId, propagado da
      // assinatura para cada cobrança gerada) ou, se ausente, pelo
      // subscription id gravado em Company.asaasSubscriptionId. Uma
      // implantação NUNCA cai aqui — o Payment dela já existe antes de
      // qualquer webhook (criado na mesma request que gera a cobrança).
      const byExternalRef = payment.externalReference
        ? await prisma.company.findUnique({ where: { id: payment.externalReference } })
        : null
      const resolvedCompany = byExternalRef ?? (payment.subscription
        ? await prisma.company.findFirst({ where: { asaasSubscriptionId: payment.subscription } })
        : null)

      if (!resolvedCompany) {
        console.error('[WEBHOOK] Pagamento desconhecido, sem externalReference/subscription reconciliável:', payment.id)
        return NextResponse.json({ ok: true, note: 'payment not found in db' })
      }

      // asaasId é @unique: uma 2ª entrega concorrente do mesmo evento colide
      // aqui e cai no catch — tratado como idempotente, sem duplicar.
      try {
        const created = await prisma.payment.create({
          data: {
            companyId:         resolvedCompany.id,
            asaasId:           payment.id,
            externalReference: payment.externalReference ?? null,
            type:              'mensalidade',
            amount:            Math.round((payment.value ?? 0) * 100),
            status:            'confirmed',
            paidAt:            new Date(),
            billingType:       payment.billingType ?? null,
            checkoutUrl:       validInvoiceUrl,
            invoiceUrl:        validInvoiceUrl,
          },
        })
        dbPayment = await prisma.payment.findUniqueOrThrow({
          where: { id: created.id },
          include: { company: { include: { lead: true } } },
        })
      } catch (err) {
        // Só um conflito real de unicidade (2ª entrega concorrente) é
        // idempotente. Qualquer outro erro de create é relançado sem
        // mascarar como sucesso — o handler não tem try/catch externo, então
        // isso vira um 500 padrão do Next.js (sem detalhe interno exposto) e
        // permite o Asaas reentregar o evento.
        const isUniqueConflict = err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'
        if (!isUniqueConflict) throw err

        await backfillAfterCreateConflict({
          asaasId:         payment.id,
          companyId:       resolvedCompany.id,
          type:            'mensalidade',
          validInvoiceUrl,
        }).catch(backfillErr => console.error('[WEBHOOK] Falha ao aplicar backfill pós-conflito (P2002):', backfillErr))
        return NextResponse.json({ ok: true, note: 'already processed (race)' })
      }
    } else {
      // Idempotência atômica: só o primeiro webhook consegue fazer a transição
      // pending → confirmed. Entregas simultâneas (Asaas reenvia) retornam aqui
      // sem duplicar comissão nem reenviar e-mail.
      const transition = await prisma.payment.updateMany({
        where: { id: dbPayment.id, status: { not: 'confirmed' } },
        data: {
          status:      'confirmed',
          paidAt:      new Date(),
          billingType: payment.billingType ?? null,
        },
      })
      // Backfill (P0): atômico por campo (ver backfillPaymentUrls), independente
      // da transição de status acima — roda mesmo numa reentrega, pra recuperar
      // um registro legado que nunca teve URL preenchida.
      await backfillPaymentUrls(dbPayment.id, validInvoiceUrl).catch(backfillErr =>
        console.error('[WEBHOOK] Falha ao aplicar backfill em Payment existente:', backfillErr)
      )
      if (transition.count === 0) {
        return NextResponse.json({ ok: true, note: 'already processed' })
      }
    }

    // Notifica a equipe (com await — fire-and-forget morre em serverless)
    await notifyPaymentConfirmed({
      companyName:   dbPayment.company.razaoSocial,
      cnpj:          dbPayment.company.cnpj,
      tipo:          dbPayment.type,
      valorCentavos: dbPayment.amount,
      planType:      dbPayment.company.planType,
    })

    // Commission engine: create Commission record for mensalidade payments with a partner
    // (empresa cancelada não gera comissão nova — P0 cancelamento)
    if (dbPayment.type === 'mensalidade' && dbPayment.company.partnerId && dbPayment.company.status !== 'cancelled') {
      // Se já existe Commission para este Payment, NÃO cria de novo — cobre o
      // caso de um chargeback revertido (disputa ganha): o pagamento volta a
      // confirmed e cai aqui de novo, mas a competência já foi contada uma
      // vez. Só reabre (bloqueada -> em_carencia) a comissão que essa mesma
      // recuperação de valor está devolvendo; qualquer outro status (em
      // carência, liberada, paga, estornada) fica como está.
      const existingCommission = await prisma.commission.findFirst({ where: { paymentId: dbPayment.id } })
      if (existingCommission) {
        if (existingCommission.status === 'bloqueada') {
          await prisma.commission.update({
            where: { id: existingCommission.id },
            data: { status: 'em_carencia' },
          }).catch(err => console.error('[WEBHOOK] Falha ao reverter Commission bloqueada:', err))
        }
      } else {
        // Competência = posição cronológica FIXA entre os Payment de mensalidade
        // já criados pra esta empresa — conta TODOS os status, não só 'confirmed'.
        // Uma competência já contada nunca "libera vaga": refund/chargeback só
        // mudam o status da linha, nunca a apagam, então a contagem jamais
        // decresce. Sem isso, estornar uma mensalidade antiga fazia a 13ª ser
        // comissionada como se fosse a 12ª (bug corrigido em sessão anterior).
        const mensalidadeCount = await prisma.payment.count({
          where: { companyId: dbPayment.companyId, type: 'mensalidade' },
        })
        if (mensalidadeCount <= 12) {
          const net = dbPayment.amount // uses gross amount as net proxy (adjust if taxes are known)
          const valorComissao = Math.round(net * 0.10)
          const now = new Date()
          await prisma.commission.create({
            data: {
              partnerId:     dbPayment.company.partnerId,
              companyId:     dbPayment.companyId,
              paymentId:     dbPayment.id,
              mensalidadeNum: mensalidadeCount,
              mensalidadeLiq: net,
              percentual:    10,
              valorComissao,
              status:        'em_carencia',
              liberadaEm:    new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
              referencia:    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
            },
          }).catch(err => console.error('[WEBHOOK] Falha ao criar Commission:', err))
        }
      }
    }

    // Mensalidade paga de empresa inadimplente: regulariza (volta a active)
    if (dbPayment.type === 'mensalidade' && dbPayment.company.status === 'overdue') {
      await prisma.company.update({
        where: { id: dbPayment.companyId },
        data: { status: 'active' },
      })
    }

    // D2 (2026-07-07): pagamento da implantação inicia o ONBOARDING — não pula
    // direto para active. 'active' = documentos entregues + gestão mensal.
    if (dbPayment.type === 'implantacao' && dbPayment.company.status === 'pending') {
      await prisma.company.update({
        where: { id: dbPayment.companyId },
        data: { status: 'onboarding_pending' },
      })

      const co = dbPayment.company
      const loginUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://sublimesst.com'}/cliente/login`

      // Resolvidos uma única vez e reaproveitados tanto na geração do PDF
      // quanto na identidade de persistência (storageKey) — nunca uma 2ª
      // leitura de `new Date()`, que quebraria o determinismo entre tentativas.
      const resolvedContractVersion = co.contractVersion ?? CONTRACT_VERSION
      const resolvedContractAcceptedAt = co.contractAcceptedAt ?? new Date()

      let contractPdf: Buffer | undefined
      try {
        // Único ponto de geração do PDF nesta execução — o mesmo Buffer é
        // reaproveitado abaixo para persistência (hash incluso) e para o
        // anexo do e-mail; nunca é regenerado.
        contractPdf = await generateContractPdf({
          razaoSocial:          co.razaoSocial,
          cnpj:                 co.cnpj,
          responsavel:          co.responsavel,
          endereco:             co.endereco,
          cidade:               co.cidade,
          estado:               co.estado,
          cep:                  co.cep,
          numFuncionarios:      co.numFuncionarios,
          email:                co.email,
          planType:               co.planType ?? 'essencial',
          mensalidadeValor:       co.mensalidadeValor,
          implantacaoValor:       co.implantacaoValor,
          implantacaoValorPadrao: co.implantacaoValorPadrao,
          implantacaoPromo:       co.implantacaoPromo,
          ltcatAddon:             co.ltcatAddon,
          contractAcceptedAt:   resolvedContractAcceptedAt,
          contractAcceptanceIp: co.contractAcceptanceIp ?? 'não registrado',
          contractAcceptanceUa: co.contractAcceptanceUa,
          contractVersion:      resolvedContractVersion,
        })

        const persistResult = await persistContractPdf({
          companyId:          co.id,
          contractVersion:    resolvedContractVersion,
          contractAcceptedAt: resolvedContractAcceptedAt,
          pdfBuffer:          contractPdf,
        })

        if (isContractPersisted(persistResult)) {
          console.error(`[WEBHOOK] Contrato persistido — companyId=${co.id} outcome=${persistResult.outcome} storageKey=${persistResult.storageKey}`)
        } else {
          // Resiliente de propósito: o pagamento já está confirmado e não
          // pode ser desfeito por falha de persistência do contrato. Loga só
          // o outcome estruturado (nunca CPF/CNPJ/e-mail/IP/bytes) e avisa a
          // equipe pelo mesmo canal já usado para falha de geração do PDF.
          const persistFailureReason = persistResult.outcome === 'error' ? persistResult.reason : persistResult.outcome
          console.error(`[WEBHOOK] Persistência do contrato não concluída — companyId=${co.id} outcome=${persistResult.outcome}`)
          await notifyContractPdfFailed({
            companyId:    co.id,
            companyName:  co.razaoSocial,
            errorName:    'ContractPersistenceFailed',
            errorMessage: persistFailureReason,
          }).catch(notifyErr => console.error('[WEBHOOK] Falha ao notificar equipe sobre PDF do contrato:', notifyErr))
          // Nunca anexa ao e-mail um PDF que não foi confirmado como
          // persistido íntegro — evita o cliente receber, por e-mail, uma
          // versão divergente da que ficará (ou não) ancorada no portal.
          // O e-mail de boas-vindas continua sendo enviado, só sem anexo.
          contractPdf = undefined
        }
      } catch (err) {
        // Resiliente de propósito: o pagamento já está confirmado e não pode
        // ser desfeito por uma falha de PDF. Loga estruturado (sem payload
        // completo nem dado pessoal além do necessário) e avisa a equipe —
        // sem isso, a única forma de notar era auditar contractHash manualmente.
        const errorName = err instanceof Error ? err.name : 'UnknownError'
        const errorMessage = err instanceof Error ? err.message : String(err)
        console.error(`[WEBHOOK] Falha ao gerar PDF do contrato — companyId=${co.id} error=${errorName}: ${errorMessage}`)
        await notifyContractPdfFailed({
          companyId:    co.id,
          companyName:  co.razaoSocial,
          errorName,
          errorMessage,
        }).catch(notifyErr => console.error('[WEBHOOK] Falha ao notificar equipe sobre PDF do contrato:', notifyErr))
      }

      await sendWelcomeEmail({
        to:               co.email,
        companyName:      co.razaoSocial,
        responsavel:      co.responsavel,
        loginUrl,
        planType:         co.planType ?? undefined,
        numFuncionarios:  co.numFuncionarios,
        implantacaoValor: co.implantacaoValor,
        mensalidadeValor: co.mensalidadeValor,
        ltcatAddon:       co.ltcatAddon,
        contractPdf,
      }).catch(console.error)
    }
  }

  if (event === 'PAYMENT_OVERDUE' || event === 'PAYMENT_REFUNDED') {
    // Inadimplência de MENSALIDADE reflete no pipeline da empresa + avisa a equipe
    if (event === 'PAYMENT_OVERDUE') {
      // Validado ANTES de persistir (P0 checkoutUrl) — mesma regra do bloco
      // CONFIRMED/RECEIVED acima.
      const validInvoiceUrl = safeCheckoutUrl(payment.invoiceUrl) ?? null

      let dbPayment = await prisma.payment.findFirst({
        where: { asaasId: payment.id },
        include: { company: true },
      })

      if (!dbPayment) {
        // Mensalidade que venceu SEM nunca ter sido confirmada antes — nunca
        // teve Payment local criado (só nascia via reconciliação no bloco
        // CONFIRMED/RECEIVED, que este bloco não tinha). Reconcilia do mesmo
        // jeito, mas só quando há subscription: sem isso não dá pra assumir
        // com segurança que é mensalidade.
        if (!payment.subscription) {
          console.error('[WEBHOOK] PAYMENT_OVERDUE desconhecido sem subscription — não classificado como mensalidade:', payment.id)
          return NextResponse.json({ ok: true, note: 'overdue payment unknown, no subscription' })
        }

        const byExternalRef = payment.externalReference
          ? await prisma.company.findUnique({ where: { id: payment.externalReference } })
          : null
        const resolvedCompany = byExternalRef ?? await prisma.company.findFirst({ where: { asaasSubscriptionId: payment.subscription } })

        if (!resolvedCompany) {
          console.error('[WEBHOOK] PAYMENT_OVERDUE desconhecido, sem externalReference/subscription reconciliável:', payment.id)
          return NextResponse.json({ ok: true, note: 'overdue payment not found in db' })
        }

        // asaasId é @unique: uma 2ª entrega concorrente do mesmo evento colide
        // aqui e cai no catch — tratado como idempotente, sem duplicar.
        try {
          const created = await prisma.payment.create({
            data: {
              companyId:         resolvedCompany.id,
              asaasId:           payment.id,
              externalReference: payment.externalReference ?? null,
              type:              'mensalidade',
              amount:            Math.round((payment.value ?? 0) * 100),
              status:            'overdue',
              dueDate:           payment.dueDate ? new Date(payment.dueDate) : null,
              billingType:       payment.billingType ?? null,
              checkoutUrl:       validInvoiceUrl,
              invoiceUrl:        validInvoiceUrl,
            },
          })
          dbPayment = await prisma.payment.findUniqueOrThrow({
            where: { id: created.id },
            include: { company: true },
          })
        } catch (err) {
          // Só um conflito real de unicidade (2ª entrega concorrente) é
          // idempotente — mesma regra do bloco CONFIRMED/RECEIVED acima.
          const isUniqueConflict = err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'
          if (!isUniqueConflict) throw err

          await backfillAfterCreateConflict({
            asaasId:         payment.id,
            companyId:       resolvedCompany.id,
            type:            'mensalidade',
            validInvoiceUrl,
          }).catch(backfillErr => console.error('[WEBHOOK] Falha ao aplicar backfill pós-conflito (P2002):', backfillErr))
          return NextResponse.json({ ok: true, note: 'already processed (race)' })
        }
      } else {
        await prisma.payment.updateMany({
          where: { id: dbPayment.id, status: { not: 'overdue' } },
          data: { status: 'overdue' },
        })
        // Backfill (P0): atômico por campo (ver backfillPaymentUrls) — mesma
        // regra do bloco CONFIRMED/RECEIVED acima.
        await backfillPaymentUrls(dbPayment.id, validInvoiceUrl).catch(backfillErr =>
          console.error('[WEBHOOK] Falha ao aplicar backfill em Payment existente:', backfillErr)
        )
      }

      if (dbPayment.type === 'mensalidade') {
        await prisma.company.updateMany({
          where: { id: dbPayment.companyId, status: { in: ['active', 'documents_delivered'] } },
          data: { status: 'overdue' },
        })
      }

      await notifyPaymentOverdue({
        companyName:   dbPayment.company.razaoSocial,
        cnpj:          dbPayment.company.cnpj,
        tipo:          dbPayment.type,
        valorCentavos: dbPayment.amount,
      })
    }

    // Estorno de pagamento estorna a comissão vinculada (razão de ser da carência de 30d).
    // Inclui 'bloqueada' porque este MESMO evento é o que a Asaas reemite quando
    // uma disputa de chargeback é PERDIDA (chargeback efetivado) — a comissão que
    // estava em espera (bloqueada) precisa virar estornada, não ficar presa.
    if (event === 'PAYMENT_REFUNDED') {
      await prisma.payment.updateMany({
        where: { asaasId: payment.id },
        data: { status: 'refunded' },
      })

      const refunded = await prisma.payment.findFirst({ where: { asaasId: payment.id } })
      if (refunded) {
        await prisma.commission.updateMany({
          where: { paymentId: refunded.id, status: { in: ['em_carencia', 'liberada', 'bloqueada'] } },
          data: { status: 'estornada' },
        }).catch(err => console.error('[WEBHOOK] Falha ao estornar Commission:', err))
      }
    }
  }

  // Captura de cartão recusada: pagamento nunca chegou a existir como
  // confirmado — se já houver um Payment local (pending, de alguma tentativa
  // anterior), marca como failed. Nunca regride um pagamento já confirmed ou
  // refunded (evento fora de ordem/atrasado não pode desfazer um pagamento
  // já liquidado). Nenhuma Commission é tocada — nunca existiu uma pra esse
  // Payment (só nasce a partir de CONFIRMED/RECEIVED).
  if (event === 'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED') {
    const updated = await prisma.payment.updateMany({
      where: { asaasId: payment.id, status: { notIn: ['confirmed', 'refunded'] } },
      data: { status: 'failed' },
    })
    console.error(`[WEBHOOK] Captura de cartão recusada: asaasId=${payment.id} — Payment local atualizado: ${updated.count > 0}`)
  }

  // Chargeback solicitado pelo titular do cartão ou disputa em andamento
  // (documentos enviados) — mesmo tratamento pros dois: o dinheiro está em
  // risco até o desfecho, então a comissão correspondente fica em espera
  // (bloqueada) em vez de liberar/pagar normalmente. Só toca em_carencia e
  // liberada — igual ao PAYMENT_REFUNDED, comissão já paga não sofre
  // clawback. Sinaliza ação manual via log (console.error). Se o Payment
  // local não existir (fora de ordem/desconhecido), não há o que bloquear —
  // no-op seguro.
  if (event === 'PAYMENT_CHARGEBACK_REQUESTED' || event === 'PAYMENT_CHARGEBACK_DISPUTE') {
    const transition = await prisma.payment.updateMany({
      where: { asaasId: payment.id, status: 'confirmed' },
      data: { status: 'disputed' },
    })
    const disputedPayment = await prisma.payment.findFirst({ where: { asaasId: payment.id } })
    if (disputedPayment) {
      await prisma.commission.updateMany({
        where: { paymentId: disputedPayment.id, status: { in: ['em_carencia', 'liberada'] } },
        data: { status: 'bloqueada' },
      }).catch(err => console.error('[WEBHOOK] Falha ao bloquear Commission em disputa:', err))
    }
    console.error(`[WEBHOOK] AÇÃO MANUAL — ${event}: asaasId=${payment.id} — Payment marcado disputed: ${transition.count > 0}. Acompanhar desfecho no painel Asaas.`)
  }

  // Disputa ganha, aguardando o banco emissor devolver o valor — informativo
  // por enquanto: o valor ainda não voltou (Payment continua disputed,
  // Commission continua bloqueada). A recuperação de fato é sinalizada pela
  // própria Asaas reemitindo PAYMENT_CONFIRMED/RECEIVED (tratado acima, no
  // bloco que já existe — reabre a Commission bloqueada automaticamente).
  if (event === 'PAYMENT_AWAITING_CHARGEBACK_REVERSAL') {
    console.error(`[WEBHOOK] Disputa de chargeback ganha, aguardando estorno do banco: asaasId=${payment.id}`)
  }

  return NextResponse.json({ ok: true })
}
