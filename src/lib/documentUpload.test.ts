import { describe, it, expect } from 'vitest'
import { validateDocumentUpload, ALLOWED_ADMIN_TIPOS, MAX_UPLOAD_BYTES } from './documentUpload'

// PDF sintético mínimo — nenhum dado real, só a assinatura exigida pelo formato.
function syntheticPdf(bytes = 64): File {
  const body = `%PDF-1.4\n${'0'.repeat(Math.max(0, bytes - 9))}`
  return new File([body], 'documento.pdf', { type: 'application/pdf' })
}

describe('validateDocumentUpload', () => {
  it('aceita um PDF sintético válido em cada tipo permitido', async () => {
    for (const tipo of ALLOWED_ADMIN_TIPOS) {
      const result = await validateDocumentUpload({ file: syntheticPdf(), tipoDocumento: tipo })
      expect(result.ok).toBe(true)
    }
  })

  it('rejeita tipoDocumento = contrato', async () => {
    const result = await validateDocumentUpload({ file: syntheticPdf(), tipoDocumento: 'contrato' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('invalid_tipo')
  })

  it('rejeita tipoDocumento desconhecido', async () => {
    const result = await validateDocumentUpload({ file: syntheticPdf(), tipoDocumento: 'qualquer_coisa' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('invalid_tipo')
  })

  it('rejeita ausência de arquivo', async () => {
    const result = await validateDocumentUpload({ file: null, tipoDocumento: 'pgr' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('missing_file')
  })

  it('rejeita algo que não é um File', async () => {
    const result = await validateDocumentUpload({ file: 'não é um arquivo', tipoDocumento: 'pgr' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('missing_file')
  })

  it('rejeita nome vazio', async () => {
    const file = new File(['%PDF-1.4\n'], '', { type: 'application/pdf' })
    const result = await validateDocumentUpload({ file, tipoDocumento: 'pgr' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('invalid_filename')
  })

  it('rejeita nome com tentativa de quebra de header (CRLF)', async () => {
    const file = new File(['%PDF-1.4\n'], 'a.pdf\r\nX-Injected: 1', { type: 'application/pdf' })
    const result = await validateDocumentUpload({ file, tipoDocumento: 'pgr' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('invalid_filename')
  })

  it('rejeita nome com tentativa de path traversal', async () => {
    const file = new File(['%PDF-1.4\n'], '../../etc/passwd.pdf', { type: 'application/pdf' })
    const result = await validateDocumentUpload({ file, tipoDocumento: 'pgr' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('invalid_filename')
  })

  it('rejeita extensão diferente de .pdf', async () => {
    const file = new File(['%PDF-1.4\n'], 'documento.exe', { type: 'application/pdf' })
    const result = await validateDocumentUpload({ file, tipoDocumento: 'pgr' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('invalid_extension')
  })

  it('aceita extensão .PDF em maiúsculas', async () => {
    const body = '%PDF-1.4\n'
    const file = new File([body], 'DOCUMENTO.PDF', { type: 'application/pdf' })
    const result = await validateDocumentUpload({ file, tipoDocumento: 'pgr' })
    expect(result.ok).toBe(true)
  })

  it('rejeita MIME diferente de application/pdf', async () => {
    const file = new File(['%PDF-1.4\n'], 'documento.pdf', { type: 'image/png' })
    const result = await validateDocumentUpload({ file, tipoDocumento: 'pgr' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('invalid_mime')
  })

  it('rejeita arquivo vazio', async () => {
    const file = new File([], 'documento.pdf', { type: 'application/pdf' })
    const result = await validateDocumentUpload({ file, tipoDocumento: 'pgr' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('empty_file')
  })

  it('rejeita arquivo acima de 10 MiB', async () => {
    const big = new Uint8Array(MAX_UPLOAD_BYTES + 1)
    const file = new File([big], 'documento.pdf', { type: 'application/pdf' })
    const result = await validateDocumentUpload({ file, tipoDocumento: 'pgr' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('file_too_large')
  })

  it('aceita arquivo exatamente no limite de 10 MiB', async () => {
    const body = new Uint8Array(MAX_UPLOAD_BYTES)
    const header = Buffer.from('%PDF-1.4\n')
    header.forEach((b, i) => (body[i] = b))
    const file = new File([body], 'documento.pdf', { type: 'application/pdf' })
    const result = await validateDocumentUpload({ file, tipoDocumento: 'pgr' })
    expect(result.ok).toBe(true)
  })

  it('rejeita arquivo disfarçado (extensão e MIME corretos, sem assinatura %PDF-)', async () => {
    const file = new File(['isto não é um pdf de verdade'], 'documento.pdf', { type: 'application/pdf' })
    const result = await validateDocumentUpload({ file, tipoDocumento: 'pgr' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('invalid_signature')
  })

  it('aceita assinatura %PDF- dentro da janela inicial permitida (não só no byte 0)', async () => {
    const padding = '\x00'.repeat(100)
    const file = new File([`${padding}%PDF-1.4\n`], 'documento.pdf', { type: 'application/pdf' })
    const result = await validateDocumentUpload({ file, tipoDocumento: 'pgr' })
    expect(result.ok).toBe(true)
  })

  it('não inclui nome de arquivo nem conteúdo na mensagem de erro', async () => {
    const file = new File(['x'], 'nome-sensivel-da-empresa.pdf', { type: 'text/plain' })
    const result = await validateDocumentUpload({ file, tipoDocumento: 'pgr' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).not.toContain('nome-sensivel-da-empresa')
      expect(result.error).not.toContain('x')
    }
  })

  it('em sucesso, retorna o buffer e o tipo normalizados para uso pela rota', async () => {
    const result = await validateDocumentUpload({ file: syntheticPdf(), tipoDocumento: 'ltcat' })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.contentType).toBe('application/pdf')
      expect(Buffer.isBuffer(result.buffer)).toBe(true)
      expect(result.tipoDocumento).toBe('ltcat')
    }
  })
})
