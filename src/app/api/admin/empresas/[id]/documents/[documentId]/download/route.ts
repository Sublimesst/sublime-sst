import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { storage } from '@/lib/storage'
import { verifyAdminSecret } from '@/lib/adminAuth'

function auth(req: NextRequest) {
  return verifyAdminSecret(req.headers.get('x-admin-secret'))
}

function safeFilename(name: string): string {
  return name.replace(/[\r\n"]/g, '').trim() || 'documento'
}

// Download administrativo de um documento específico. Espelha o download do
// cliente (src/app/api/cliente/documents/[id]/download/route.ts), trocando a
// autenticação de sessão do cliente por admin secret. O access log grava
// sessionId: null propositalmente para representar acesso administrativo —
// desde a correção de atribuição de ator (src/lib/clientAuth.ts), os
// acessos do cliente com cookie emitido após o deploy gravam o
// clientSessionId real, então null aqui já discrimina do lado administrativo.
// Cookies de cliente emitidos antes dessa correção também produzem null
// (janela de compatibilidade) até expirarem ou o cliente relogar.
export async function GET(req: NextRequest, { params }: { params: { id: string; documentId: string } }) {
  if (!auth(req)) return NextResponse.json({ success: false, error: 'Não autorizado.' }, { status: 401 })

  // id do documento e companyId da rota exigidos juntos na mesma consulta —
  // um documento de outra empresa nunca é encontrado, mesmo com id correto.
  const document = await prisma.document.findFirst({
    where: { id: params.documentId, companyId: params.id },
  })
  if (!document) {
    return NextResponse.json({ success: false, error: 'Documento não encontrado.' }, { status: 404 })
  }

  const file = await storage.download(document.storageKey)
  if (!file) {
    return NextResponse.json({ success: false, error: 'Arquivo indisponível.' }, { status: 404 })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? null
  const userAgent = req.headers.get('user-agent') ?? null

  // sessionId null representa acesso administrativo (sem sessão de cliente),
  // mesma tabela/estrutura já usada para os acessos do cliente.
  await prisma.documentAccessLog.create({
    data: {
      companyId:     document.companyId,
      sessionId:     null,
      tipoDocumento: document.tipoDocumento,
      nomeDocumento: document.nomeArquivo,
      acao:          'download',
      ip,
      userAgent,
    },
  })

  const filename = safeFilename(document.nomeArquivo)
  return new NextResponse(new Uint8Array(file.buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Content-Length': String(file.buffer.length),
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
