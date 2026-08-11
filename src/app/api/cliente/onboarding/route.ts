import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { notifyOnboardingSubmitted } from '@/lib/mailer'
import { runSerializable } from '@/lib/prismaSerializable'
import { requireOnboardingAccess, isOnboardingLocked, onboardingLockedResponse, OnboardingLockedError } from '@/lib/onboardingAccess'
import { serializeWorker, isWorkerCompleteForSubmission, MAX_WORKERS_PER_COMPANY, WorkersLimitReachedError } from '@/lib/onboardingWorkers'

// Rascunho dos dados gerais — todo campo opcional/nullable. numFuncionarios
// não existe mais aqui: passa a ser um snapshot calculado no envio a partir
// de count(Worker), nunca digitado pelo cliente (ver POST).
const generalDraftSchema = z.object({
  cargos: z.union([z.string().max(2000), z.null()]).optional(),
  turnoTrabalho: z.union([z.string().max(200), z.null()]).optional(),
  dataUltimoPcmso: z.union([z.string().max(200), z.null()]).optional(),
  possuiPgr: z.union([z.boolean(), z.null()]).optional(),
  observacoes: z.union([z.string().max(4000), z.null()]).optional(),
})

function normalizeGeneralString(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

// Nada além do confirmado explicitamente controla o envio quando há
// divergência de quantidade.
const submitSchema = z.object({
  confirmMismatch: z.boolean().optional().default(false),
})

// Erros de validação de negócio do envio — lançados dentro da transação
// Serializable e mapeados para a resposta HTTP correta no catch. Nunca
// acionam retry (só P2034 aciona retry em runSerializable).
class PossuiPgrRequiredError extends Error {}
class WorkersRequiredError extends Error {}
class WorkersIncompleteError extends Error {
  constructor(public incompleteIds: string[]) { super() }
}
class QuantityMismatchError extends Error {
  constructor(public contratado: number, public declarado: number) { super() }
}

export async function GET(req: NextRequest) {
  const access = await requireOnboardingAccess(req)
  if (!access.ok) return access.response
  const { company } = access

  const [onboarding, workers, companyRow] = await Promise.all([
    prisma.onboardingData.findUnique({ where: { companyId: company.id } }),
    prisma.worker.findMany({ where: { companyId: company.id }, orderBy: { createdAt: 'asc' } }),
    prisma.company.findUnique({ where: { id: company.id }, select: { numFuncionarios: true } }),
  ])

  return NextResponse.json({
    success: true,
    data: {
      status: onboarding?.status ?? 'em_preenchimento',
      general: {
        cargos: onboarding?.cargos ?? null,
        turnoTrabalho: onboarding?.turnoTrabalho ?? null,
        dataUltimoPcmso: onboarding?.dataUltimoPcmso ?? null,
        possuiPgr: onboarding?.possuiPgr ?? null,
        observacoes: onboarding?.observacoes ?? null,
      },
      numFuncionariosContratado: companyRow?.numFuncionarios ?? null,
      numFuncionariosDeclarado: onboarding?.numFuncionarios ?? null,
      submittedAt: onboarding?.submittedAt ? onboarding.submittedAt.toISOString() : null,
      workers: workers.map(serializeWorker),
    },
  })
}

// Salva rascunho dos campos gerais — nunca marca envio, nunca notifica,
// nunca transiciona Company.status. Idempotente: só toca os campos
// presentes no corpo.
//
// Checagem de status + upsert rodam na mesma transação Serializable: se um
// envio concorrente travar a declaração entre a checagem inicial e a
// escrita, o Postgres detecta o conflito e aborta uma das duas transações
// (P2034) — nunca deixa um rascunho sobrescrever silenciosamente uma
// declaração que acabou de ser congelada.
export async function PATCH(req: NextRequest) {
  const access = await requireOnboardingAccess(req)
  if (!access.ok) return access.response
  const { company } = access

  const body = await req.json().catch(() => ({}))
  const parsed = generalDraftSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Dados inválidos.', details: parsed.error.errors }, { status: 400 })
  }
  const input = parsed.data

  const data: Record<string, string | boolean | null> = {}
  if (input.cargos !== undefined) data.cargos = normalizeGeneralString(input.cargos) ?? null
  if (input.turnoTrabalho !== undefined) data.turnoTrabalho = normalizeGeneralString(input.turnoTrabalho) ?? null
  if (input.dataUltimoPcmso !== undefined) data.dataUltimoPcmso = normalizeGeneralString(input.dataUltimoPcmso) ?? null
  if (input.observacoes !== undefined) data.observacoes = normalizeGeneralString(input.observacoes) ?? null
  if (input.possuiPgr !== undefined) data.possuiPgr = input.possuiPgr

  try {
    const saved = await runSerializable(async (tx) => {
      const existing = await tx.onboardingData.findUnique({ where: { companyId: company.id } })
      if (isOnboardingLocked(existing)) throw new OnboardingLockedError()

      return tx.onboardingData.upsert({
        where: { companyId: company.id },
        update: data,
        create: { companyId: company.id, status: 'em_preenchimento', ...data },
      })
    })

    return NextResponse.json({
      success: true,
      data: {
        status: saved.status,
        general: {
          cargos: saved.cargos,
          turnoTrabalho: saved.turnoTrabalho,
          dataUltimoPcmso: saved.dataUltimoPcmso,
          possuiPgr: saved.possuiPgr,
          observacoes: saved.observacoes,
        },
      },
    })
  } catch (err) {
    if (err instanceof OnboardingLockedError) return onboardingLockedResponse()
    throw err
  }
}

// Envio final — revalida tudo no servidor, nunca confia no que a UI já
// validou. Só recebe a confirmação explícita de divergência: os campos
// gerais e os Workers já estão persistidos pelas rotas de rascunho.
//
// Toda a leitura (status, possuiPgr, Workers, quantidade contratada) e a
// escrita de congelamento rodam dentro de UMA transação Serializable: se um
// Worker for criado/editado/excluído entre a leitura da lista e o
// congelamento, o Postgres detecta o conflito e reexecuta a validação
// inteira do zero (ver runSerializable) — nunca congela um snapshot
// inconsistente com o que realmente existe no banco.
export async function POST(req: NextRequest) {
  const access = await requireOnboardingAccess(req)
  if (!access.ok) return access.response
  const { company } = access

  const body = await req.json().catch(() => ({}))
  const parsed = submitSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Dados inválidos.', details: parsed.error.errors }, { status: 400 })
  }
  const { confirmMismatch } = parsed.data

  let declarado = 0
  let cargosFinal: string | null = null
  const now = new Date()

  try {
    await runSerializable(async (tx) => {
      const onboarding = await tx.onboardingData.findUnique({ where: { companyId: company.id } })
      if (isOnboardingLocked(onboarding)) throw new OnboardingLockedError()
      if (!onboarding || onboarding.possuiPgr === null || onboarding.possuiPgr === undefined) {
        throw new PossuiPgrRequiredError()
      }

      const workers = await tx.worker.findMany({ where: { companyId: company.id }, orderBy: { createdAt: 'asc' } })
      if (workers.length < 1) throw new WorkersRequiredError()
      if (workers.length > MAX_WORKERS_PER_COMPANY) throw new WorkersLimitReachedError()
      const incompleteIds = workers.filter((w) => !isWorkerCompleteForSubmission(w)).map((w) => w.id)
      if (incompleteIds.length > 0) throw new WorkersIncompleteError(incompleteIds)

      const companyRow = await tx.company.findUnique({ where: { id: company.id }, select: { numFuncionarios: true } })
      const contratado = companyRow?.numFuncionarios ?? 0
      declarado = workers.length
      if (contratado !== declarado && !confirmMismatch) throw new QuantityMismatchError(contratado, declarado)

      // Guarda condicional final, redundante com a checagem acima de
      // propósito: fecha a janela entre a leitura do status nesta mesma
      // transação e esta escrita (mesmo dentro de uma única transação
      // Serializable, nunca custa reafirmar a condição no próprio UPDATE).
      const updateResult = await tx.onboardingData.updateMany({
        where: { companyId: company.id, status: { not: 'enviado' } },
        data: { numFuncionarios: declarado, status: 'enviado', submittedAt: now },
      })
      if (updateResult.count === 0) throw new OnboardingLockedError()

      // Transição condicional idêntica à já existente antes desta tranche —
      // resubmissão de uma empresa já em produção/ativa não regride o pipeline.
      await tx.company.updateMany({
        where: { id: company.id, status: { in: ['pending', 'onboarding_pending'] } },
        data: { status: 'in_production' },
      })

      const final = await tx.onboardingData.findUniqueOrThrow({ where: { companyId: company.id } })
      cargosFinal = final.cargos
    })
  } catch (err) {
    if (err instanceof OnboardingLockedError) return onboardingLockedResponse()
    if (err instanceof PossuiPgrRequiredError) {
      return NextResponse.json(
        { success: false, code: 'possui_pgr_required', error: 'Informe se a empresa já possui PGR elaborado antes de enviar.' },
        { status: 400 }
      )
    }
    if (err instanceof WorkersRequiredError) {
      return NextResponse.json(
        { success: false, code: 'workers_required', error: 'Cadastre pelo menos 1 trabalhador antes de enviar.' },
        { status: 400 }
      )
    }
    if (err instanceof WorkersLimitReachedError) {
      return NextResponse.json(
        { success: false, code: 'workers_limit_exceeded', error: `O limite é de ${MAX_WORKERS_PER_COMPANY} trabalhadores.` },
        { status: 400 }
      )
    }
    if (err instanceof WorkersIncompleteError) {
      return NextResponse.json(
        {
          success: false,
          code: 'workers_incomplete',
          error: 'Preencha nome, data de nascimento, sexo, data de admissão e cargo de todos os trabalhadores antes de enviar.',
          data: { incompleteIds: err.incompleteIds },
        },
        { status: 400 }
      )
    }
    if (err instanceof QuantityMismatchError) {
      return NextResponse.json(
        {
          success: false,
          code: 'quantity_mismatch',
          error: 'A quantidade de trabalhadores cadastrados é diferente da quantidade contratada. Confirme para continuar.',
          data: { contratado: err.contratado, declarado: err.declarado },
        },
        { status: 409 }
      )
    }
    throw err
  }

  // Notificação só depois da transação confirmada — nunca dentro dela nem
  // sujeita a retry. notifyOnboardingSubmitted já engole falhas de envio
  // (mailer.ts), mas o try/catch aqui é uma segunda camada: protege contra
  // qualquer exceção síncrona inesperada na construção do e-mail (não a
  // chamada de rede em si) — a declaração já está gravada e travada; um
  // problema só no aviso interno nunca pode fazer esta resposta parecer uma
  // falha do envio.
  try {
    await notifyOnboardingSubmitted({
      companyName: company.razaoSocial,
      cnpj: company.cnpj,
      numFuncionarios: declarado,
      cargos: cargosFinal,
    })
  } catch (err) {
    console.error('[ONBOARDING] Falha ao notificar equipe após envio confirmado:', err instanceof Error ? err.message : err)
  }

  return NextResponse.json({ success: true, data: { status: 'enviado', numFuncionarios: declarado, submittedAt: now.toISOString() } })
}
