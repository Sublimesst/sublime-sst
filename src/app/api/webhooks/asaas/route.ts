import { NextRequest, NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendWelcomeEmail, notifyPaymentConfirmed, notifyPaymentOverdue } from '@/lib/mailer'
import { generateContractPdf } from '@/lib/contractPdf'
import { CONTRACT_VERSION } from '@/lib/pricing'

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
          },
        })
        dbPayment = await prisma.payment.findUniqueOrThrow({
          where: { id: created.id },
          include: { company: { include: { lead: true } } },
        })
      } catch (err) {
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

      let contractPdf: Buffer | undefined
      try {
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
          planType:             co.planType ?? 'essencial',
          implantacaoValor:     co.implantacaoValor,
          implantacaoPromo:     co.implantacaoPromo,
          contractAcceptedAt:   co.contractAcceptedAt ?? new Date(),
          contractAcceptanceIp: co.contractAcceptanceIp ?? 'não registrado',
          contractAcceptanceUa: co.contractAcceptanceUa,
          contractVersion:      co.contractVersion ?? CONTRACT_VERSION,
        })
        if (contractPdf) {
          const hash = createHash('sha256').update(contractPdf).digest('hex')
          await prisma.company.update({
            where: { id: co.id },
            data: { contractHash: hash },
          }).catch(err => console.error('[WEBHOOK] Falha ao salvar contractHash:', err))
        }
      } catch (err) {
        console.error('[WEBHOOK] Falha ao gerar PDF do contrato:', err)
      }

      await sendWelcomeEmail({
        to:          co.email,
        companyName: co.razaoSocial,
        responsavel: co.responsavel,
        loginUrl,
        planType:    co.planType ?? undefined,
        contractPdf,
      }).catch(console.error)
    }
  }

  if (event === 'PAYMENT_OVERDUE' || event === 'PAYMENT_REFUNDED') {
    await prisma.payment.updateMany({
      where: { asaasId: payment.id },
      data: { status: event === 'PAYMENT_OVERDUE' ? 'overdue' : 'refunded' },
    })

    // Inadimplência de MENSALIDADE reflete no pipeline da empresa + avisa a equipe
    if (event === 'PAYMENT_OVERDUE') {
      const overduePay = await prisma.payment.findFirst({
        where: { asaasId: payment.id },
        include: { company: true },
      })
      if (overduePay?.type === 'mensalidade') {
        await prisma.company.updateMany({
          where: { id: overduePay.companyId, status: { in: ['active', 'documents_delivered'] } },
          data: { status: 'overdue' },
        })
      }
      if (overduePay) {
        await notifyPaymentOverdue({
          companyName:   overduePay.company.razaoSocial,
          cnpj:          overduePay.company.cnpj,
          tipo:          overduePay.type,
          valorCentavos: overduePay.amount,
        })
      }
    }

    // Estorno de pagamento estorna a comissão vinculada (razão de ser da carência de 30d).
    // Inclui 'bloqueada' porque este MESMO evento é o que a Asaas reemite quando
    // uma disputa de chargeback é PERDIDA (chargeback efetivado) — a comissão que
    // estava em espera (bloqueada) precisa virar estornada, não ficar presa.
    if (event === 'PAYMENT_REFUNDED') {
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
