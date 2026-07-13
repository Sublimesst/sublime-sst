import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { verifyAdminSecret } from '@/lib/adminAuth'

const STATUS_VALUES = ['pending', 'in_progress', 'done'] as const

const patchSchema = z.object({
  pgrStatus:            z.enum(STATUS_VALUES).optional(),
  pgrConcluidoPor:      z.string().optional(),
  pcmsoStatus:          z.enum(STATUS_VALUES).optional(),
  pcmsoMedico:          z.string().optional(),
  pcmsoConcluidoPor:    z.string().optional(),
  declaracaoStatus:     z.enum(STATUS_VALUES).optional(),
  declaracaoConcluidaPor: z.string().optional(),
  osEpiStatus:          z.enum(STATUS_VALUES).optional(),
  osEpiConcluidoPor:    z.string().optional(),
  ltcatStatus:          z.enum(STATUS_VALUES).nullable().optional(),
  ltcatConcluidoPor:    z.string().optional(),
  observacoes:          z.string().optional(),
})

function auth(req: NextRequest) {
  return verifyAdminSecret(req.headers.get('x-admin-secret'))
}

function nowIfDone(currentStatus: string | undefined | null, newStatus: string | undefined) {
  if (newStatus === 'done' && currentStatus !== 'done') return new Date()
  if (newStatus && newStatus !== 'done') return null
  return undefined
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!auth(req)) return NextResponse.json({ success: false, error: 'Não autorizado.' }, { status: 401 })

  const checklist = await prisma.implantacaoChecklist.findUnique({
    where: { companyId: params.id },
  })

  return NextResponse.json({ success: true, data: checklist })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!auth(req)) return NextResponse.json({ success: false, error: 'Não autorizado.' }, { status: 401 })

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Dados inválidos.', details: parsed.error.errors }, { status: 400 })

  const company = await prisma.company.findUnique({ where: { id: params.id } })
  if (!company) return NextResponse.json({ success: false, error: 'Empresa não encontrada.' }, { status: 404 })

  const existing = await prisma.implantacaoChecklist.findUnique({ where: { companyId: params.id } })

  const d = parsed.data

  const pgrConcluidoEm    = nowIfDone(existing?.pgrStatus, d.pgrStatus)
  const pcmsoConcluidoEm  = nowIfDone(existing?.pcmsoStatus, d.pcmsoStatus)
  const declaracaoConcluidaEm = nowIfDone(existing?.declaracaoStatus, d.declaracaoStatus)
  const osEpiConcluidoEm  = nowIfDone(existing?.osEpiStatus, d.osEpiStatus)
  const ltcatConcluidoEm  = nowIfDone(existing?.ltcatStatus, d.ltcatStatus ?? undefined)

  const data = {
    ...(d.pgrStatus            !== undefined ? { pgrStatus: d.pgrStatus }                       : {}),
    ...(pgrConcluidoEm         !== undefined ? { pgrConcluidoEm }                               : {}),
    ...(d.pgrConcluidoPor      !== undefined ? { pgrConcluidoPor: d.pgrConcluidoPor }           : {}),
    ...(d.pcmsoStatus          !== undefined ? { pcmsoStatus: d.pcmsoStatus }                   : {}),
    ...(pcmsoConcluidoEm       !== undefined ? { pcmsoConcluidoEm }                             : {}),
    ...(d.pcmsoMedico          !== undefined ? { pcmsoMedico: d.pcmsoMedico }                   : {}),
    ...(d.pcmsoConcluidoPor    !== undefined ? { pcmsoConcluidoPor: d.pcmsoConcluidoPor }       : {}),
    ...(d.declaracaoStatus     !== undefined ? { declaracaoStatus: d.declaracaoStatus }         : {}),
    ...(declaracaoConcluidaEm  !== undefined ? { declaracaoConcluidaEm }                        : {}),
    ...(d.declaracaoConcluidaPor !== undefined ? { declaracaoConcluidaPor: d.declaracaoConcluidaPor } : {}),
    ...(d.osEpiStatus          !== undefined ? { osEpiStatus: d.osEpiStatus }                   : {}),
    ...(osEpiConcluidoEm       !== undefined ? { osEpiConcluidoEm }                             : {}),
    ...(d.osEpiConcluidoPor    !== undefined ? { osEpiConcluidoPor: d.osEpiConcluidoPor }       : {}),
    ...(d.ltcatStatus          !== undefined ? { ltcatStatus: d.ltcatStatus }                   : {}),
    ...(ltcatConcluidoEm       !== undefined ? { ltcatConcluidoEm }                             : {}),
    ...(d.ltcatConcluidoPor    !== undefined ? { ltcatConcluidoPor: d.ltcatConcluidoPor }       : {}),
    ...(d.observacoes          !== undefined ? { observacoes: d.observacoes }                   : {}),
  }

  const checklist = existing
    ? await prisma.implantacaoChecklist.update({ where: { companyId: params.id }, data })
    : await prisma.implantacaoChecklist.create({ data: { companyId: params.id, ...data } })

  return NextResponse.json({ success: true, data: checklist })
}
