import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClientSession } from '@/lib/clientAuth'
import { isDocumentVisibleToClient } from '@/lib/documentVisibility'

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

  // Defesa em profundidade: mesmo gate aplicado no dashboard e no download
  // direto — documentos técnicos só listados depois da entrega formal.
  const visibleDocuments = documents.filter(doc =>
    isDocumentVisibleToClient(doc.tipoDocumento, company.documentsDeliveredAt)
  )

  return NextResponse.json({ success: true, data: visibleDocuments })
}
