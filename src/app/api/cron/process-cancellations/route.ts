import { NextRequest, NextResponse } from 'next/server'
import { processDueCancellations } from '@/lib/cancellationProcessor'
import { verifyCronSecret } from '@/lib/cronAuth'

// Called daily to apply the effective closure of cancellation requests whose
// effectiveAt has already arrived (regra de vigência de 12 meses — ver
// src/lib/cancellationProcessor.ts).
export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await processDueCancellations()
  return NextResponse.json({ ok: true, ...result })
}
