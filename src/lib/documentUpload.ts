// Validação centralizada do upload manual de documentos (Admin).
// Único ponto de verdade para tipos permitidos, formato e limite de tamanho —
// a rota de upload e os testes importam daqui, nunca duplicam a regra.
//
// Fora de escopo de propósito: o tipo "contrato" nunca passa por aqui — o
// contrato usa fluxo próprio de geração/persistência/hash em
// src/lib/contractPersistence.ts, que chama prisma.document.create()
// diretamente, sem depender deste validador.

export const ALLOWED_ADMIN_TIPOS = ['pgr', 'pcmso', 'declaracao', 'os_epi', 'ltcat'] as const
export type AllowedAdminTipo = (typeof ALLOWED_ADMIN_TIPOS)[number]

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024 // 10 MiB
const PDF_SIGNATURE = '%PDF-'
const PDF_SIGNATURE_SEARCH_WINDOW = 1024 // início permitido pelo formato, não só o byte 0
const FORBIDDEN_FILENAME_CHARS = /[\r\n\0/\\]/

export type DocumentUploadErrorCode =
  | 'invalid_tipo'
  | 'missing_file'
  | 'invalid_filename'
  | 'invalid_extension'
  | 'invalid_mime'
  | 'empty_file'
  | 'file_too_large'
  | 'invalid_signature'

export interface DocumentUploadOk {
  ok: true
  tipoDocumento: AllowedAdminTipo
  nomeArquivo: string
  contentType: 'application/pdf'
  buffer: Buffer
}

export interface DocumentUploadError {
  ok: false
  code: DocumentUploadErrorCode
  error: string
}

export type DocumentUploadResult = DocumentUploadOk | DocumentUploadError

function fail(code: DocumentUploadErrorCode, error: string): DocumentUploadError {
  return { ok: false, code, error }
}

function isValidFilename(name: string): boolean {
  const trimmed = name.trim()
  if (!trimmed) return false
  return !FORBIDDEN_FILENAME_CHARS.test(name)
}

function hasPdfSignature(buffer: Buffer): boolean {
  const window = buffer.subarray(0, Math.min(PDF_SIGNATURE_SEARCH_WINDOW, buffer.length))
  return window.toString('latin1').includes(PDF_SIGNATURE)
}

// Nunca inclui nome de arquivo, conteúdo ou dados da empresa nas mensagens —
// só o suficiente para o operador entender qual regra foi violada.
export async function validateDocumentUpload(input: {
  file: unknown
  tipoDocumento: unknown
}): Promise<DocumentUploadResult> {
  const { file, tipoDocumento } = input

  if (typeof tipoDocumento !== 'string' || !ALLOWED_ADMIN_TIPOS.includes(tipoDocumento as AllowedAdminTipo)) {
    return fail('invalid_tipo', 'Tipo de documento não permitido para upload manual.')
  }

  if (!(file instanceof File)) {
    return fail('missing_file', 'Nenhum arquivo enviado.')
  }

  if (!isValidFilename(file.name)) {
    return fail('invalid_filename', 'Nome de arquivo inválido.')
  }

  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return fail('invalid_extension', 'Somente arquivos .pdf são aceitos.')
  }

  if (file.type !== 'application/pdf') {
    return fail('invalid_mime', 'Tipo de conteúdo inválido — esperado application/pdf.')
  }

  if (file.size === 0) {
    return fail('empty_file', 'Arquivo vazio.')
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return fail('file_too_large', 'Arquivo excede o tamanho máximo permitido (10 MiB).')
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  if (!hasPdfSignature(buffer)) {
    return fail('invalid_signature', 'Conteúdo não corresponde a um PDF válido.')
  }

  return {
    ok: true,
    tipoDocumento: tipoDocumento as AllowedAdminTipo,
    nomeArquivo: file.name,
    contentType: 'application/pdf',
    buffer,
  }
}
