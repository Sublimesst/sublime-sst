import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { runSerializable } from '@/lib/prismaSerializable'
import { requireOnboardingAccess, isOnboardingLocked, onboardingLockedResponse, OnboardingLockedError } from '@/lib/onboardingAccess'
import { workerDraftSchema, toWorkerWriteData, serializeWorker, MAX_WORKERS_PER_COMPANY, WorkersLimitReachedError } from '@/lib/onboardingWorkers'

export async function GET(req: NextRequest) {
  const access = await requireOnboardingAccess(req)
  if (!access.ok) return access.response
  const { company } = access

  const workers = await prisma.worker.findMany({ where: { companyId: company.id }, orderBy: { createdAt: 'asc' } })
  return NextResponse.json({ success: true, data: workers.map(serializeWorker) })
}

// "Adicionar trabalhador" pode criar um Worker vazio de rascunho — todo
// campo é opcional neste momento; obrigatoriedade só é exigida no envio.
//
// Contagem + criação rodam dentro de uma transação Serializable: duas
// criações concorrentes no 20º trabalhador nunca resultam em 21 linhas —
// o Postgres aborta uma delas por conflito de serialização (P2034), que
// runSerializable reexecuta do zero. A checagem de status também é lida
// dentro da mesma transação, para nunca criar um Worker num onboarding que
// acabou de ser congelado por um envio concorrente.
export async function POST(req: NextRequest) {
  const access = await requireOnboardingAccess(req)
  if (!access.ok) return access.response
  const { company } = access

  const body = await req.json().catch(() => ({}))
  const parsed = workerDraftSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Dados inválidos.', details: parsed.error.errors }, { status: 400 })
  }

  try {
    const created = await runSerializable(async (tx) => {
      const onboarding = await tx.onboardingData.findUnique({ where: { companyId: company.id } })
      if (isOnboardingLocked(onboarding)) throw new OnboardingLockedError()

      const currentCount = await tx.worker.count({ where: { companyId: company.id } })
      if (currentCount >= MAX_WORKERS_PER_COMPANY) throw new WorkersLimitReachedError()

      return tx.worker.create({ data: { companyId: company.id, ...toWorkerWriteData(parsed.data) } })
    })

    return NextResponse.json({ success: true, data: serializeWorker(created) }, { status: 201 })
  } catch (err) {
    if (err instanceof OnboardingLockedError) return onboardingLockedResponse()
    if (err instanceof WorkersLimitReachedError) {
      return NextResponse.json(
        { success: false, code: 'workers_limit_reached', error: `O limite é de ${MAX_WORKERS_PER_COMPANY} trabalhadores.` },
        { status: 409 }
      )
    }
    throw err
  }
}
