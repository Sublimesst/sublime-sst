// ═══════════════════════════════════════════════════════════
// SUBLIME SST — Registro centralizado de Company.activatedAt
// (regra de vigência de 12 meses — docs/DECISIONS.md, docs/CONTRACT_MVP_V1.md §1-2)
//
// Fonte única para "checar se a Company já está financeiramente completa
// AGORA e, se sim, gravar activatedAt uma única vez" — usada pelos dois
// pontos do código que podem legitimamente completar essa condição para uma
// Company nova:
//   1. webhook Asaas (src/app/api/webhooks/asaas/route.ts) — chamada DENTRO
//      da mesma transação que confirma o Payment (ver comentário no webhook),
//      passando o `tx` da transação e o mesmo `now` usado no `paidAt` do
//      Payment. Isso é o que torna a ativação recuperável por retry: se a
//      escrita de activatedAt falhar, a transação inteira desfaz também a
//      confirmação do Payment, então uma reentrega do MESMO evento Asaas
//      encontra o Payment ainda não confirmado e refaz a dupla
//      (confirmação + ativação) do zero — nunca fica um Payment confirmed
//      "orfão" de ativação, sem depender de nenhum backfill/reparo à parte.
//   2. sincronização da 1ª mensalidade no cadastro
//      (src/app/api/leads/register/route.ts), logo após
//      syncFirstSubscriptionPayment, fora de qualquer transação — chamada
//      best-effort de propósito (ver comentário no call site: hoje esse
//      ponto nunca completa a ativação de fato, porque a implantação ainda
//      está sempre 'pending' nesse instante do cadastro; é só uma rede de
//      segurança para um refator futuro que quebre essa ordem, não um
//      mecanismo de recovery em si).
//
// Nunca chamado a partir de um contexto que possa representar uma Company
// LEGADA (cadastrada antes desta migração): quem decide ISSO é o chamador —
// ver o guard `isRelevantConfirmation` no webhook, que só invoca esta função
// quando o pagamento que acabou de confirmar é candidato real a completar a
// ativação pela primeira vez, nunca em qualquer confirmação de mensalidade
// (2ª em diante) nem em uma reentrega de um Payment já confirmado antes
// (`transition.count === 0` no webhook nunca chega a chamar esta função). O
// ponto de chamada do cadastro nunca tem esse risco: só roda para uma
// Company recém-criada na mesma requisição.
// ═══════════════════════════════════════════════════════════

import type { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { deriveFinancialActivationState, PAYMENT_SELECT } from './paymentPresentation'

// Aceita opcionalmente o client de uma transação em andamento (`tx`) — para
// que a leitura de Company/Payment e a escrita de activatedAt participem da
// MESMA transação que confirma o Payment (ver webhook). Sem isso, não haveria
// como fazer a confirmação do Payment e a ativação falharem/vingarem juntas.
type PrismaOrTx = typeof prisma | Prisma.TransactionClient

// Idempotente e seguro para corrida: o updateMany só escreve quando
// activatedAt ainda é null (guard no próprio WHERE), então chamar esta
// função múltiplas vezes — inclusive concorrentemente, para a mesma Company —
// nunca sobrescreve uma ativação já gravada.
//
// PODE LANÇAR: ao contrário de uma versão anterior desta função, esta NÃO
// engole erros de leitura/escrita — quem chama decide se quer propagar (caso
// do webhook, dentro de uma transação: propagar é o que garante a
// recuperação por retry) ou tratar como best-effort (caso do cadastro, fora
// de transação, onde a falha aqui não pode derrubar um cadastro já
// financeiramente incompleto de qualquer forma — ver call site).
//
// `now`: instante a gravar em activatedAt caso complete a ativação — default
// `new Date()`, mas o webhook passa explicitamente o MESMO instante já usado
// no `paidAt` do Payment que está sendo confirmado na mesma transação, para
// que ambos os campos reflitam exatamente o mesmo evento, nunca dois
// `new Date()` levemente divergentes.
export async function markCompanyActivatedIfComplete(
  companyId: string,
  options: { client?: PrismaOrTx; now?: Date } = {}
): Promise<void> {
  const client = options.client ?? prisma
  const now = options.now ?? new Date()

  const company = await client.company.findUnique({
    where: { id: companyId },
    select: { status: true, activatedAt: true },
  })
  if (!company || company.activatedAt !== null) return

  const payments = await client.payment.findMany({
    where: { companyId, type: { in: ['implantacao', 'mensalidade'] } },
    select: PAYMENT_SELECT,
  })
  const { financiallyComplete } = deriveFinancialActivationState(company.status, payments)
  if (!financiallyComplete) return

  await client.company.updateMany({
    where: { id: companyId, activatedAt: null },
    data: { activatedAt: now },
  })
}
