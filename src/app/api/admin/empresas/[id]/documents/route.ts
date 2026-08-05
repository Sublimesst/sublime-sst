import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { storage } from '@/lib/storage'
import { verifyAdminSecret } from '@/lib/adminAuth'
import { validateDocumentUpload } from '@/lib/documentUpload'

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

  // Empresa sempre resolvida pelo parâmetro da rota — nenhum companyId vindo
  // do corpo da requisição é lido ou pode prevalecer.
  const company = await prisma.company.findUnique({ where: { id: params.id } })
  if (!company) return NextResponse.json({ success: false, error: 'Empresa não encontrada.' }, { status: 404 })

  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  const tipoDocumento = form?.get('tipoDocumento')
  const uploadedBy = form?.get('uploadedBy')

  const validated = await validateDocumentUpload({ file, tipoDocumento })
  if (!validated.ok) {
    return NextResponse.json({ success: false, error: validated.error, code: validated.code }, { status: 400 })
  }

  const key = `${params.id}/${validated.tipoDocumento}/${randomUUID()}`

  // Resposta genérica e estável para qualquer falha de upload — nunca inclui
  // mensagem interna, stack, storageKey ou identificadores. Reaproveitada
  // pelos três pontos de falha desta rota (storage, persistência, compensação).
  const genericUploadFailureResponse = () =>
    NextResponse.json({ success: false, error: 'Falha ao processar o upload. Tente novamente.' }, { status: 500 })

  try {
    await storage.upload(key, validated.buffer, validated.contentType)
  } catch {
    // Upload nunca confirmado — nada para compensar (document.create e
    // storage.delete não são chamados). Log é só o código fixo do evento,
    // sem companyId, storageKey, mensagem do provider ou stack.
    console.error('document_upload_storage_failed')
    return genericUploadFailureResponse()
  }

  let document
  try {
    document = await prisma.document.create({
      data: {
        companyId:       params.id,
        tipoDocumento:   validated.tipoDocumento,
        nomeArquivo:     validated.nomeArquivo,
        mimeType:        validated.contentType,
        tamanhoBytes:    validated.buffer.length,
        storageProvider: 'db',
        storageKey:      key,
        uploadedBy:      typeof uploadedBy === 'string' && uploadedBy ? uploadedBy : null,
      },
    })
  } catch {
    // Compensação: o storage já foi gravado, mas o registro não pôde ser
    // criado — sem isso, o objeto ficaria órfão (sem nenhum Document
    // apontando para ele). Logs são só os códigos fixos do evento — nunca
    // companyId, documentId, storageKey, nome de arquivo, MIME do usuário,
    // mensagem bruta do Prisma/provider ou stack. A falha original
    // (document_upload_persistence_failed) nunca é substituída ou escondida
    // pelo resultado da compensação — se a compensação também falhar, o
    // código de compensação é só somado ao log, não a troca.
    console.error('document_upload_persistence_failed')
    try {
      await storage.delete(key)
    } catch {
      console.error('document_upload_compensation_failed')
    }
    return genericUploadFailureResponse()
  }

  return NextResponse.json({
    success: true,
    data: {
      id: document.id,
      tipoDocumento: document.tipoDocumento,
      nomeArquivo: document.nomeArquivo,
      mimeType: document.mimeType,
      tamanhoBytes: document.tamanhoBytes,
      uploadedBy: document.uploadedBy,
      uploadedAt: document.uploadedAt,
    },
  }, { status: 201 })
}
