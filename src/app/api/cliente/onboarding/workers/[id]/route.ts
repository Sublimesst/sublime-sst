import { NextRequest, NextResponse } from 'next/server'
import { runSerializable } from '@/lib/prismaSerializable'
import { requireOnboardingAccess, isOnboardingLocked, onboardingLockedResponse, OnboardingLockedError } from '@/lib/onboardingAccess'
import { workerDraftSchema, toWorkerWriteData, serializeWorker, WorkerNotFoundError } from '@/lib/onboardingWorkers'

// Status do onboarding + posse do Worker (id+companyId) são lidos dentro da
// MESMA transação Serializable que faz a escrita: se um envio concorrente
// travar a declaração entre a checagem inicial da rota e a escrita, o
// Postgres detecta o conflito de leitura/escrita cruzado e aborta uma das
// duas transações (P2034) — runSerializable reexecuta com leitura fresca,
// que então vê o status já "enviado" e rejeita corretamente.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireOnboardingAccess(req)
  if (!access.ok) return access.response
  const { company } = access

  const body = await req.json().catch(() => ({}))
  const parsed = workerDraftSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Dados inválidos.', details: parsed.error.errors }, { status: 400 })
  }

  try {
    const updated = await runSerializable(async (tx) => {
      const onboarding = await tx.onboardingData.findUnique({ where: { companyId: company.id } })
      if (isOnboardingLocked(onboarding)) throw new OnboardingLockedError()

      // id + companyId exigidos juntos na mesma consulta — um Worker de
      // outra empresa nunca é encontrado, mesmo com id correto.
      const existing = await tx.worker.findFirst({ where: { id: params.id, companyId: company.id } })
      if (!existing) throw new WorkerNotFoundError()

      return tx.worker.update({ where: { id: existing.id }, data: toWorkerWriteData(parsed.data) })
    })

    return NextResponse.json({ success: true, data: serializeWorker(updated) })
  } catch (err) {
    if (err instanceof OnboardingLockedError) return onboardingLockedResponse()
    if (err instanceof WorkerNotFoundError) {
      return NextResponse.json({ success: false, error: 'Trabalhador não encontrado.' }, { status: 404 })
    }
    throw err
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireOnboardingAccess(req)
  if (!access.ok) return access.response
  const { company } = access

  try {
    await runSerializable(async (tx) => {
      const onboarding = await tx.onboardingData.findUnique({ where: { companyId: company.id } })
      if (isOnboardingLocked(onboarding)) throw new OnboardingLockedError()

      const existing = await tx.worker.findFirst({ where: { id: params.id, companyId: company.id } })
      if (!existing) throw new WorkerNotFoundError()

      await tx.worker.delete({ where: { id: existing.id } })
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof OnboardingLockedError) return onboardingLockedResponse()
    if (err instanceof WorkerNotFoundError) {
      return NextResponse.json({ success: false, error: 'Trabalhador não encontrado.' }, { status: 404 })
    }
    throw err
  }
}
