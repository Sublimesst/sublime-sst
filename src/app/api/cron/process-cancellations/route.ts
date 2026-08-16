import { NextRequest, NextResponse } from 'next/server'
import { processDueCancellations } from '@/lib/cancellationProcessor'

// Called daily to apply the effective closure of cancellation requests whose
// effectiveAt has already arrived (regra de vigência de 12 meses — ver
// src/lib/cancellationProcessor.ts).
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')
  if (token !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await processDueCancellations()
  return NextResponse.json({ ok: true, ...result })
}
