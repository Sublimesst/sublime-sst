import { NextRequest } from 'next/server'

export interface ClientSessionPayload {
  companyId: string
  email: string
  issuedAt: number
}

export function getClientSession(req: NextRequest): ClientSessionPayload | null {
  const raw = req.cookies.get('sublime_client')?.value
  if (!raw) return null
  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf-8')
    const payload = JSON.parse(decoded) as ClientSessionPayload
    if (!payload.companyId || !payload.email) return null
    return payload
  } catch {
    return null
  }
}
