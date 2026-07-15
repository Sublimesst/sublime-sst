import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClientSession } from '@/lib/clientAuth'

export async function GET(req: NextRequest) {
  const company = await getClientSession(req)
  if (!company) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const documents = await prisma.document.findMany({
    where: { companyId: company.id },
    orderBy: { uploadedAt: 'desc' },
    select: {
      id: true, tipoDocumento: true, nomeArquivo: true, tamanhoBytes: true, uploadedAt: true,
    },
  })

  return NextResponse.json({ success: true, data: documents })
}
