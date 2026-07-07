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
    const dbPayment = await prisma.payment.findFirst({
      where: { asaasId: payment.id },
      include: { company: { include: { lead: true } } },
    })

    if (!dbPayment) {
      return NextResponse.json({ ok: true, note: 'payment not found in db' })
    }

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

    // Notifica a equipe (com await — fire-and-forget morre em serverless)
    await notifyPaymentConfirmed({
      companyName:   dbPayment.company.razaoSocial,
      cnpj:          dbPayment.company.cnpj,
      tipo:          dbPayment.type,
      valorCentavos: dbPayment.amount,
      planType:      dbPayment.company.planType,
    })

    // Commission engine: create Commission record for mensalidade payments with a partner
    if (dbPayment.type === 'mensalidade' && dbPayment.company.partnerId) {
      const mensalidadeCount = await prisma.payment.count({
        where: { companyId: dbPayment.companyId, type: 'mensalidade', status: 'confirmed' },
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

    // Estorno de pagamento estorna a comissão vinculada (razão de ser da carência de 30d)
    if (event === 'PAYMENT_REFUNDED') {
      const refunded = await prisma.payment.findFirst({ where: { asaasId: payment.id } })
      if (refunded) {
        await prisma.commission.updateMany({
          where: { paymentId: refunded.id, status: { in: ['em_carencia', 'liberada'] } },
          data: { status: 'estornada' },
        }).catch(err => console.error('[WEBHOOK] Falha ao estornar Commission:', err))
      }
    }
  }

  return NextResponse.json({ ok: true })
}
