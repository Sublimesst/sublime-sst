import { NextRequest } from 'next/server'
import { verifySessionCookie } from './sessionCookie'
import { prisma } from '@/lib/prisma'

export interface ClientSessionPayload {
  companyId: string
  email: string
  issuedAt: number
}

export interface AuthorizedCompany {
  id: string
  status: string
  razaoSocial: string
  cnpj: string
}

// Verifica a assinatura/expiração do cookie E revalida que a empresa não foi
// cancelada — sem isso, uma Company cancelada continuaria acessando o portal
// até o cookie (30 dias) expirar sozinho. Retorna a Company já carregada para
// a mesma consulta servir de autenticação e de dado de resposta.
export async function getClientSession(req: NextRequest): Promise<AuthorizedCompany | null> {
  const raw = req.cookies.get('sublime_client')?.value
  const payload = verifySessionCookie<ClientSessionPayload>(raw)
  if (!payload?.companyId || !payload.email) return null

  return prisma.company.findFirst({
    where: { id: payload.companyId, NOT: { status: 'cancelled' } },
    select: { id: true, status: true, razaoSocial: true, cnpj: true },
  })
}
