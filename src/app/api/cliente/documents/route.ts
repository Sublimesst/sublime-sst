import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClientSession } from '@/lib/clientAuth'

export async function GET(req: NextRequest) {
  const session = getClientSession(req)
  if (!session) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const documents = await prisma.document.findMany({
    where: { companyId: session.companyId },
    orderBy: { uploadedAt: 'desc' },
    select: {
      id: true, tipoDocumento: true, nomeArquivo: true, tamanhoBytes: true, uploadedAt: true,
    },
  })

  return NextResponse.json({ success: true, data: documents })
}
