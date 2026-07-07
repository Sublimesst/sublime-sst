import { NextRequest } from 'next/server'
import { verifySessionCookie } from './sessionCookie'

export interface PartnerSessionPayload {
  partnerId: string
  email: string
  issuedAt: number
}

export function getPartnerSession(req: NextRequest): PartnerSessionPayload | null {
  const raw = req.cookies.get('sublime_partner')?.value
  const payload = verifySessionCookie<PartnerSessionPayload>(raw)
  if (!payload?.partnerId) return null
  return payload
}
