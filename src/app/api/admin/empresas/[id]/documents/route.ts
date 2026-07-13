import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { storage } from '@/lib/storage'
import { verifyAdminSecret } from '@/lib/adminAuth'

const TIPOS = ['pgr', 'pcmso', 'declaracao', 'os_epi', 'ltcat', 'contrato'] as const

function auth(req: NextRequest) {
  return verifyAdminSecret(req.headers.get('x-admin-secret'))
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!auth(req)) return NextResponse.json({ success: false, error: 'Não autorizado.' }, { status: 401 })

  const documents = await prisma.document.findMany({
    where: { companyId: params.id },
    orderBy: { uploadedAt: 'desc' },
    select: {
      id: true, tipoDocumento: true, nomeArquivo: true, mimeType: true,
      tamanhoBytes: true, uploadedBy: true, uploadedAt: true,
    },
  })

  return NextResponse.json({ success: true, data: documents })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!auth(req)) return NextResponse.json({ success: false, error: 'Não autorizado.' }, { status: 401 })

  const company = await prisma.company.findUnique({ where: { id: params.id } })
  if (!company) return NextResponse.json({ success: false, error: 'Empresa não encontrada.' }, { status: 404 })

  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  const tipoDocumento = form?.get('tipoDocumento')
  const uploadedBy = form?.get('uploadedBy')

  if (!(file instanceof File) || typeof tipoDocumento !== 'string' || !TIPOS.includes(tipoDocumento as typeof TIPOS[number])) {
    return NextResponse.json({ success: false, error: 'Dados inválidos.' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const contentType = file.type || 'application/octet-stream'
  const key = `${params.id}/${tipoDocumento}/${randomUUID()}`

  await storage.upload(key, buffer, contentType)

  const document = await prisma.document.create({
    data: {
      companyId:       params.id,
      tipoDocumento,
      nomeArquivo:     file.name,
      mimeType:        contentType,
      tamanhoBytes:    buffer.length,
      storageProvider: 'db',
      storageKey:      key,
      uploadedBy:      typeof uploadedBy === 'string' && uploadedBy ? uploadedBy : null,
    },
  })

  return NextResponse.json({ success: true, data: document }, { status: 201 })
}
