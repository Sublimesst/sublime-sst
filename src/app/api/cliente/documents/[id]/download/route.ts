import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClientSession } from '@/lib/clientAuth'
import { storage } from '@/lib/storage'

function safeFilename(name: string): string {
  return name.replace(/[\r\n"]/g, '').trim() || 'documento'
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const company = await getClientSession(req)
  if (!company) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const document = await prisma.document.findUnique({ where: { id: params.id } })
  if (!document || document.companyId !== company.id) {
    return NextResponse.json({ error: 'Documento não encontrado.' }, { status: 404 })
  }

  const file = await storage.download(document.storageKey)
  if (!file) return NextResponse.json({ error: 'Arquivo indisponível.' }, { status: 404 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? null
  const userAgent = req.headers.get('user-agent') ?? null

  await prisma.documentAccessLog.create({
    data: {
      companyId:     document.companyId,
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
      'Content-Type': file.contentType,
      'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Content-Length': String(file.buffer.length),
    },
  })
}
