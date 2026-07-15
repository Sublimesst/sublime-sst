import { NextRequest } from 'next/server'
import { verifySessionCookie } from './sessionCookie'
import { prisma } from '@/lib/prisma'

export interface PartnerSessionPayload {
  partnerId: string
  email: string
  issuedAt: number
}

export interface AuthorizedPartner {
  id: string
  name: string
  code: string
  email: string
  tier: string
  status: string
}

// Verifica a assinatura/expiração do cookie E revalida o status atual no
// banco a cada request — sem isso, um parceiro desativado pelo admin
// continuaria acessando o dashboard até o cookie (30 dias) expirar sozinho.
// Retorna o Partner já carregado (não só o payload do cookie) para a mesma
// consulta servir de autenticação e de dado de resposta, sem query duplicada.
export async function getPartnerSession(req: NextRequest): Promise<AuthorizedPartner | null> {
  const raw = req.cookies.get('sublime_partner')?.value
  const payload = verifySessionCookie<PartnerSessionPayload>(raw)
  if (!payload?.partnerId) return null

  return prisma.partner.findFirst({
    where: { id: payload.partnerId, status: 'active' },
    select: { id: true, name: true, code: true, email: true, tier: true, status: true },
  })
}
