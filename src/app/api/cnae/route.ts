import { NextRequest, NextResponse } from 'next/server'
import { searchCnae, getCnaeByCode } from '@/lib/eligibility'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') ?? ''
  const code = searchParams.get('code')

  if (code) {
    const entry = getCnaeByCode(code)
    return entry
      ? NextResponse.json({ success: true, data: entry })
      : NextResponse.json({ success: false, error: 'CNAE não encontrado.' }, { status: 404 })
  }

  const results = searchCnae(q, 10)
  return NextResponse.json({ success: true, data: results })
}
