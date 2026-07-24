import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { verifyAdminSecret } from '@/lib/adminAuth'

function auth(req: NextRequest) {
  return verifyAdminSecret(req.headers.get('x-admin-secret'))
}

// ── VISÕES ────────────────────────────────────────────────────
// Cada visão define o status padrão da TABELA e qual data rege o período.
// Os cards de totais usam sempre a MESMA data-base + período + parceiro da
// visão, mas nunca aplicam filtro de status — servem de visão geral do
// período, independente do que a tabela está mostrando.
const VIEWS = ['a_pagar', 'a_liberar', 'pagas', 'competencia', 'auditoria'] as const
type View = (typeof VIEWS)[number]

const DATE_BASE_FIELDS = ['liberadaEm', 'pagaEm', 'createdAt', 'referencia'] as const
type DateBaseField = (typeof DATE_BASE_FIELDS)[number]

const VIEW_CONFIG: Record<View, { defaultStatus: string | null; dateBase: DateBaseField | null }> = {
  a_pagar:     { defaultStatus: 'liberada',    dateBase: 'liberadaEm' },
  a_liberar:   { defaultStatus: 'em_carencia', dateBase: 'liberadaEm' },
  pagas:       { defaultStatus: 'paga',        dateBase: 'pagaEm' },
  competencia: { defaultStatus: null,          dateBase: 'referencia' },
  auditoria:   { defaultStatus: null,          dateBase: null }, // resolvido via ?dateBase=
}

const STATUS_KEYS = ['em_carencia', 'liberada', 'paga', 'bloqueada', 'estornada'] as const

function startOfDayUTC(d: string) {
  return new Date(`${d}T00:00:00.000Z`)
}
// "to" inclusivo implementado como início do dia seguinte, exclusivo.
function nextDayUTC(d: string) {
  const dt = startOfDayUTC(d)
  dt.setUTCDate(dt.getUTCDate() + 1)
  return dt
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ success: false, error: 'Não autorizado.' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const viewParam = searchParams.get('view') ?? 'a_pagar'
  const view: View = (VIEWS as readonly string[]).includes(viewParam) ? (viewParam as View) : 'a_pagar'
  const config = VIEW_CONFIG[view]

  const statusOverride = searchParams.get('status')
  const partnerId = searchParams.get('partnerId')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const referenceFrom = searchParams.get('referenceFrom')
  const referenceTo = searchParams.get('referenceTo')
  const dateBaseParam = searchParams.get('dateBase')

  const dateBase: DateBaseField | null =
    view === 'auditoria'
      ? ((dateBaseParam && (DATE_BASE_FIELDS as readonly string[]).includes(dateBaseParam))
          ? (dateBaseParam as DateBaseField)
          : 'liberadaEm')
      : config.dateBase

  // Base usada tanto pela tabela quanto pelos cards — parceiro + período,
  // NUNCA status (status é aplicado só na query da tabela, abaixo).
  const baseWhere: Record<string, unknown> = {}
  if (partnerId) baseWhere.partnerId = partnerId

  if (dateBase === 'referencia') {
    if (referenceFrom || referenceTo) {
      baseWhere.referencia = {
        ...(referenceFrom ? { gte: referenceFrom } : {}),
        ...(referenceTo ? { lte: referenceTo } : {}),
      }
    }
  } else if (dateBase) {
    if (from || to) {
      baseWhere[dateBase] = {
        ...(from ? { gte: startOfDayUTC(from) } : {}),
        ...(to ? { lt: nextDayUTC(to) } : {}),
      }
    }
  }

  // Filtro manual de status (?status=) sobrepõe o padrão da visão; visões
  // sem padrão (competencia/auditoria) ficam sem filtro de status = todos.
  const appliedStatus = statusOverride || config.defaultStatus

  const [commissions, totalsRaw, partners] = await Promise.all([
    prisma.commission.findMany({
      where: { ...baseWhere, ...(appliedStatus ? { status: appliedStatus } : {}) },
      orderBy: [{ liberadaEm: 'desc' }, { createdAt: 'desc' }],
      include: {
        partner: { select: { id: true, name: true, office: true, code: true } },
        company: { select: { id: true, razaoSocial: true, cnpj: true } },
        payment: { select: { id: true, type: true, amount: true, paidAt: true, asaasId: true } },
      },
    }),
    // Cards: mesma base (parceiro+período+data-base), SEM filtro de status —
    // é o breakdown por status desse período, independente do que a tabela mostra.
    prisma.commission.groupBy({
      by: ['status'],
      where: baseWhere,
      _count: { _all: true },
      _sum: { valorComissao: true },
    }),
    prisma.partner.findMany({
      where: { commissions: { some: {} } },
      select: { id: true, name: true, office: true, code: true },
      orderBy: { name: 'asc' },
    }),
  ])

  const totals: Record<string, { count: number; totalCentavos: number }> = Object.fromEntries(
    STATUS_KEYS.map(k => [k, { count: 0, totalCentavos: 0 }])
  )
  for (const row of totalsRaw) {
    totals[row.status] = { count: row._count._all, totalCentavos: row._sum.valorComissao ?? 0 }
  }

  return NextResponse.json({
    success: true,
    data: { view, dateBase, appliedStatus, commissions, totals, partners },
  })
}

const patchSchema = z.object({
  id: z.string().min(1),
  referenciaPagamento: z.string().min(1, 'Informe a referência do pagamento (ex: PIX, data, comprovante).'),
})

// Marca uma comissão LIBERADA como PAGA. Não transfere dinheiro — só registra
// que um pagamento já feito fora do sistema foi conferido. Guard atômico:
// só transiciona se o status ainda for 'liberada' no momento exato do update
// (impede pagar em_carencia/bloqueada/estornada, ou re-pagar uma já paga, sem
// race condition — 2ª chamada concorrente sempre encontra count:0).
export async function PATCH(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ success: false, error: 'Não autorizado.' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Dados inválidos.', details: parsed.error.errors }, { status: 400 })
  }
  const { id, referenciaPagamento } = parsed.data

  const existing = await prisma.commission.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ success: false, error: 'Comissão não encontrada.' }, { status: 404 })

  const stamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  const noteLine = `[${stamp}] Marcada como paga — referência: ${referenciaPagamento}`
  const observacoes = existing.observacoes ? `${existing.observacoes}\n${noteLine}` : noteLine

  const transition = await prisma.commission.updateMany({
    where: { id, status: 'liberada' },
    data: { status: 'paga', pagaEm: new Date(), observacoes },
  })

  if (transition.count === 0) {
    return NextResponse.json(
      { success: false, error: 'Só comissões liberadas podem ser marcadas como pagas.' },
      { status: 422 }
    )
  }

  const updated = await prisma.commission.findUnique({
    where: { id },
    include: {
      partner: { select: { id: true, name: true, office: true, code: true } },
      company: { select: { id: true, razaoSocial: true, cnpj: true } },
      payment: { select: { id: true, type: true, amount: true, paidAt: true, asaasId: true } },
    },
  })

  return NextResponse.json({ success: true, data: updated })
}
