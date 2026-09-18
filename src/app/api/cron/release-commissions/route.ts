import { NextRequest, NextResponse } from 'next/server'
import { releaseDueCommissions } from '@/lib/commissionRelease'
import { verifyCronSecret } from '@/lib/cronAuth'

// Chamado diariamente para transicionar em_carencia -> liberada toda
// Commission cuja carência de 30 dias já venceu (liberadaEm <= now) — ver
// src/lib/commissionRelease.ts. Não paga nada, não chama Asaas, não cria
// comissão nova.
export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await releaseDueCommissions()
  return NextResponse.json({ ok: true, ...result })
}
