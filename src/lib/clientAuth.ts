import { NextRequest } from 'next/server'
import { verifySessionCookie } from './sessionCookie'
import { prisma } from '@/lib/prisma'

export interface ClientSessionPayload {
  companyId: string
  email: string
  issuedAt: number
  // Id da ClientSession que originou o login (não o token bruto). Opcional
  // para manter válidos os cookies assinados antes desta correção — nesses,
  // a chave simplesmente não existe no payload decodificado.
  sessionId?: string
}

export interface AuthorizedCompany {
  id: string
  status: string
  razaoSocial: string
  cnpj: string
  // Evidência persistente de entrega formal dos documentos técnicos — ver
  // src/lib/documentVisibility.ts. Nunca deduzido do status atual.
  documentsDeliveredAt: Date | null
  // Id da ClientSession do login atual, para diferenciar acesso do cliente
  // de acesso administrativo no DocumentAccessLog. null para cookies
  // emitidos antes desta correção (janela de compatibilidade, ver
  // sessionCookie.ts) — nunca reconsultado no banco, vem só do payload
  // já autenticado pelo HMAC.
  clientSessionId: string | null
}

// Verifica a assinatura/expiração do cookie E revalida que a empresa não foi
// cancelada — sem isso, uma Company cancelada continuaria acessando o portal
// até o cookie (30 dias) expirar sozinho. Retorna a Company já carregada para
// a mesma consulta servir de autenticação e de dado de resposta.
export async function getClientSession(req: NextRequest): Promise<AuthorizedCompany | null> {
  const raw = req.cookies.get('sublime_client')?.value
  const payload = verifySessionCookie<ClientSessionPayload>(raw)
  if (!payload?.companyId || !payload.email) return null

  const company = await prisma.company.findFirst({
    where: { id: payload.companyId, NOT: { status: 'cancelled' } },
    select: { id: true, status: true, razaoSocial: true, cnpj: true, documentsDeliveredAt: true },
  })
  if (!company) return null

  const clientSessionId = typeof payload.sessionId === 'string' && payload.sessionId.length > 0
    ? payload.sessionId
    : null

  return { ...company, clientSessionId }
}
