import { NextRequest } from 'next/server'
import { verifySessionCookie } from './sessionCookie'

export interface ClientSessionPayload {
  companyId: string
  email: string
  issuedAt: number
}

export function getClientSession(req: NextRequest): ClientSessionPayload | null {
  const raw = req.cookies.get('sublime_client')?.value
  const payload = verifySessionCookie<ClientSessionPayload>(raw)
  if (!payload?.companyId || !payload.email) return null
  return payload
}
