import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createHash } from 'crypto'
import { Prisma } from '@prisma/client'

// Mock sem banco real — vi.mock intercepta o módulo antes do import do
// arquivo sob teste. $transaction é mockado para invocar diretamente o
// callback com um `tx` fake, do mesmo jeito que o Prisma real faria.
vi.mock('./prisma', () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}))

import { persistContractPdf, buildContractStorageKey, isContractPersisted, isRetryableStorageConflict } from './contractPersistence'
import { prisma } from './prisma'

const transactionMock = vi.mocked(prisma.$transaction)

const COMPANY_ID = 'company-1'
const CONTRACT_VERSION = '2026-07-04'
const ACCEPTED_AT = new Date('2026-07-20T14:33:02.123Z')

function buffer(content = 'PDF-BYTES-SINTETICOS') {
  return Buffer.from(content)
}

function hashOf(buf: Buffer) {
  return createHash('sha256').update(buf).digest('hex')
}

function uniqueConflict(target: string) {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002', clientVersion: '5.22.0', meta: { target: [target] },
  })
}

// tx fake mínimo — cada teste sobrescreve só o que precisa.
function makeTx(overrides: {
  companyContractHash?: string | null
  companyExists?: boolean
  existingDocument?: { id: string } | null
  existingStorage?: { data: Buffer } | null
  documentCreate?: ReturnType<typeof vi.fn>
  storageCreate?: ReturnType<typeof vi.fn>
  companyUpdate?: ReturnType<typeof vi.fn>
}) {
  const documentCreate = overrides.documentCreate ?? vi.fn().mockResolvedValue({ id: 'doc-new' })
  const storageCreate = overrides.storageCreate ?? vi.fn().mockResolvedValue({})
  const companyUpdate = overrides.companyUpdate ?? vi.fn().mockResolvedValue({})

  return {
    tx: {
      company: {
        findUnique: vi.fn().mockResolvedValue(
          overrides.companyExists === false ? null : { contractHash: overrides.companyContractHash ?? null }
        ),
        update: companyUpdate,
      },
      document: {
        findUnique: vi.fn().mockResolvedValue(overrides.existingDocument ?? null),
        create: documentCreate,
      },
      dbStorageObject: {
        findUnique: vi.fn().mockResolvedValue(overrides.existingStorage ?? null),
        create: storageCreate,
      },
    },
    documentCreate,
    storageCreate,
    companyUpdate,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('buildContractStorageKey', () => {
  it('é determinística para a mesma tripla companyId/version/acceptedAt', () => {
    const a = buildContractStorageKey(COMPANY_ID, CONTRACT_VERSION, ACCEPTED_AT)
    const b = buildContractStorageKey(COMPANY_ID, CONTRACT_VERSION, ACCEPTED_AT)
    expect(a).toBe(b)
  })

  it('usa exatamente o contractAcceptedAt recebido, nunca a data de geração atual', () => {
    const key = buildContractStorageKey(COMPANY_ID, CONTRACT_VERSION, ACCEPTED_AT)
    expect(key).toBe(`contrato/${COMPANY_ID}/${CONTRACT_VERSION}/2026-07-20T14-33-02-123Z`)
  })

  it('não contém CPF/CNPJ/e-mail — só companyId, version e timestamp', () => {
    const key = buildContractStorageKey(COMPANY_ID, CONTRACT_VERSION, ACCEPTED_AT)
    expect(key.split('/')).toHaveLength(4)
  })
})

describe('isContractPersisted', () => {
  it('classifica created/already_persisted/document_recovered como persistido', () => {
    expect(isContractPersisted({ outcome: 'created', documentId: 'd', storageKey: 'k', hash: 'h' })).toBe(true)
    expect(isContractPersisted({ outcome: 'already_persisted', documentId: 'd', storageKey: 'k', hash: 'h' })).toBe(true)
    expect(isContractPersisted({ outcome: 'document_recovered', documentId: 'd', storageKey: 'k', hash: 'h' })).toBe(true)
  })

  it('classifica company_hash_mismatch/storage_bytes_mismatch/orphan_document/error como NÃO persistido', () => {
    expect(isContractPersisted({ outcome: 'company_hash_mismatch', storageKey: 'k', hash: 'h' })).toBe(false)
    expect(isContractPersisted({ outcome: 'storage_bytes_mismatch', storageKey: 'k', hash: 'h' })).toBe(false)
    expect(isContractPersisted({ outcome: 'orphan_document', documentId: 'd', storageKey: 'k' })).toBe(false)
    expect(isContractPersisted({ outcome: 'error', reason: 'x' })).toBe(false)
  })
})

describe('isRetryableStorageConflict', () => {
  it('P2002 com target contendo "key" (DbStorageObject) — retentável', () => {
    expect(isRetryableStorageConflict(uniqueConflict('key'))).toBe(true)
  })

  it('P2002 com target contendo "storageKey" (Document) — retentável', () => {
    expect(isRetryableStorageConflict(uniqueConflict('storageKey'))).toBe(true)
  })

  it('P2002 com target no formato string única (não array) — retentável se reconhecido', () => {
    const err = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002', clientVersion: '5.22.0', meta: { target: 'storageKey' },
    })
    expect(isRetryableStorageConflict(err)).toBe(true)
  })

  it('P2002 com target de constraint Postgres (nome completo) — retentável', () => {
    expect(isRetryableStorageConflict(uniqueConflict('storage_objects_db_pkey'))).toBe(true)
    expect(isRetryableStorageConflict(uniqueConflict('documents_storageKey_key'))).toBe(true)
  })

  it('P2002 com target não relacionado (outro campo único) — NÃO retentável', () => {
    expect(isRetryableStorageConflict(uniqueConflict('asaasId'))).toBe(false)
    expect(isRetryableStorageConflict(uniqueConflict('companies_cnpj_key'))).toBe(false)
  })

  it('P2002 sem target (meta ausente) — NÃO retentável', () => {
    const err = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002', clientVersion: '5.22.0',
    })
    expect(isRetryableStorageConflict(err)).toBe(false)
  })

  it('P2002 com meta.target ausente (meta presente, sem target) — NÃO retentável', () => {
    const err = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002', clientVersion: '5.22.0', meta: {},
    })
    expect(isRetryableStorageConflict(err)).toBe(false)
  })

  it('erro Prisma com code diferente de P2002 — NÃO retentável mesmo com target reconhecido', () => {
    const err = new Prisma.PrismaClientKnownRequestError('Foreign key constraint failed', {
      code: 'P2003', clientVersion: '5.22.0', meta: { target: ['storageKey'] },
    })
    expect(isRetryableStorageConflict(err)).toBe(false)
  })

  it('erro que não é PrismaClientKnownRequestError — NÃO retentável', () => {
    expect(isRetryableStorageConflict(new Error('erro genérico'))).toBe(false)
    expect(isRetryableStorageConflict('string qualquer')).toBe(false)
    expect(isRetryableStorageConflict(null)).toBe(false)
  })
})

describe('persistContractPdf', () => {
  it('1) Cenário A — nada existe: cria storage, Document e hash, retorna created', async () => {
    const buf = buffer()
    const { tx, documentCreate, storageCreate, companyUpdate } = makeTx({})
    transactionMock.mockImplementation(async fn => fn(tx as any))

    const result = await persistContractPdf({
      companyId: COMPANY_ID, contractVersion: CONTRACT_VERSION, contractAcceptedAt: ACCEPTED_AT, pdfBuffer: buf,
    })

    expect(result.outcome).toBe('created')
    expect(storageCreate).toHaveBeenCalledTimes(1)
    expect(documentCreate).toHaveBeenCalledTimes(1)
    expect(documentCreate.mock.calls[0][0].data).toMatchObject({
      companyId: COMPANY_ID, tipoDocumento: 'contrato', storageProvider: 'db',
    })
    expect(companyUpdate).toHaveBeenCalledWith({
      where: { id: COMPANY_ID }, data: { contractHash: hashOf(buf) },
    })
  })

  it('2) segunda execução idêntica — Document + storage já existem e correspondem: idempotente, sem duplicar', async () => {
    const buf = buffer()
    const { tx, documentCreate, storageCreate, companyUpdate } = makeTx({
      companyContractHash: hashOf(buf),
      existingDocument: { id: 'doc-1' },
      existingStorage: { data: buf },
    })
    transactionMock.mockImplementation(async fn => fn(tx as any))

    const result = await persistContractPdf({
      companyId: COMPANY_ID, contractVersion: CONTRACT_VERSION, contractAcceptedAt: ACCEPTED_AT, pdfBuffer: buf,
    })

    expect(result).toMatchObject({ outcome: 'already_persisted', documentId: 'doc-1' })
    expect(storageCreate).not.toHaveBeenCalled()
    expect(documentCreate).not.toHaveBeenCalled()
    expect(companyUpdate).not.toHaveBeenCalled() // hash já preenchido e igual — nenhuma escrita extra
  })

  it('3) storage existente, Document ausente, hash correspondente — cria só o Document (document_recovered)', async () => {
    const buf = buffer()
    const { tx, documentCreate, storageCreate, companyUpdate } = makeTx({
      companyContractHash: null,
      existingDocument: null,
      existingStorage: { data: buf },
    })
    transactionMock.mockImplementation(async fn => fn(tx as any))

    const result = await persistContractPdf({
      companyId: COMPANY_ID, contractVersion: CONTRACT_VERSION, contractAcceptedAt: ACCEPTED_AT, pdfBuffer: buf,
    })

    expect(result).toMatchObject({ outcome: 'document_recovered' })
    expect(storageCreate).not.toHaveBeenCalled() // nunca recria o storage já existente
    expect(documentCreate).toHaveBeenCalledTimes(1)
    expect(companyUpdate).toHaveBeenCalledWith({
      where: { id: COMPANY_ID }, data: { contractHash: hashOf(buf) },
    })
  })

  it('4) Company.contractHash existente e divergente — não sobrescreve nada, retorna erro controlado', async () => {
    const buf = buffer()
    const outroHash = hashOf(buffer('OUTRO-CONTEUDO'))
    const { tx, documentCreate, storageCreate, companyUpdate } = makeTx({
      companyContractHash: outroHash,
    })
    transactionMock.mockImplementation(async fn => fn(tx as any))

    const result = await persistContractPdf({
      companyId: COMPANY_ID, contractVersion: CONTRACT_VERSION, contractAcceptedAt: ACCEPTED_AT, pdfBuffer: buf,
    })

    expect(result).toMatchObject({ outcome: 'company_hash_mismatch' })
    expect(storageCreate).not.toHaveBeenCalled()
    expect(documentCreate).not.toHaveBeenCalled()
    expect(companyUpdate).not.toHaveBeenCalled()
    // tx.document/dbStorageObject nunca deveriam nem ser lidos após o gate de hash
    expect(tx.document.findUnique).not.toHaveBeenCalled()
    expect(tx.dbStorageObject.findUnique).not.toHaveBeenCalled()
  })

  it('5) storage existente com bytes divergentes do Buffer atual — não sobrescreve, retorna erro controlado', async () => {
    const buf = buffer()
    const bytesAntigos = buffer('BYTES-ANTIGOS-DIFERENTES')
    const { tx, documentCreate, storageCreate, companyUpdate } = makeTx({
      companyContractHash: null,
      existingDocument: null,
      existingStorage: { data: bytesAntigos },
    })
    transactionMock.mockImplementation(async fn => fn(tx as any))

    const result = await persistContractPdf({
      companyId: COMPANY_ID, contractVersion: CONTRACT_VERSION, contractAcceptedAt: ACCEPTED_AT, pdfBuffer: buf,
    })

    expect(result).toMatchObject({ outcome: 'storage_bytes_mismatch' })
    expect(storageCreate).not.toHaveBeenCalled()
    expect(documentCreate).not.toHaveBeenCalled()
    expect(companyUpdate).not.toHaveBeenCalled()
  })

  it('6) Document existente sem storage correspondente — estado inconsistente, erro controlado', async () => {
    const buf = buffer()
    const { tx, documentCreate, storageCreate, companyUpdate } = makeTx({
      companyContractHash: null,
      existingDocument: { id: 'doc-orfao' },
      existingStorage: null,
    })
    transactionMock.mockImplementation(async fn => fn(tx as any))

    const result = await persistContractPdf({
      companyId: COMPANY_ID, contractVersion: CONTRACT_VERSION, contractAcceptedAt: ACCEPTED_AT, pdfBuffer: buf,
    })

    expect(result).toMatchObject({ outcome: 'orphan_document', documentId: 'doc-orfao' })
    expect(storageCreate).not.toHaveBeenCalled()
    expect(documentCreate).not.toHaveBeenCalled()
    expect(companyUpdate).not.toHaveBeenCalled()
  })

  it('7) duas execuções concorrentes — a perdedora esbarra em P2002 e retenta uma vez, retorna idempotente', async () => {
    const buf = buffer()
    transactionMock
      .mockRejectedValueOnce(uniqueConflict('storage_objects_db_pkey'))
      .mockImplementationOnce(async fn => {
        const { tx } = makeTx({
          companyContractHash: hashOf(buf),
          existingDocument: { id: 'doc-vencedor' },
          existingStorage: { data: buf },
        })
        return fn(tx as any)
      })

    const result = await persistContractPdf({
      companyId: COMPANY_ID, contractVersion: CONTRACT_VERSION, contractAcceptedAt: ACCEPTED_AT, pdfBuffer: buf,
    })

    expect(result).toMatchObject({ outcome: 'already_persisted', documentId: 'doc-vencedor' })
    expect(transactionMock).toHaveBeenCalledTimes(2)
  })

  it('8) conflito persistente (2ª tentativa também falha) — retorna erro controlado, nunca lança', async () => {
    const buf = buffer()
    transactionMock.mockRejectedValue(uniqueConflict('storage_objects_db_pkey'))

    const result = await persistContractPdf({
      companyId: COMPANY_ID, contractVersion: CONTRACT_VERSION, contractAcceptedAt: ACCEPTED_AT, pdfBuffer: buf,
    })

    expect(result.outcome).toBe('error')
    expect(transactionMock).toHaveBeenCalledTimes(2) // 1 tentativa original + 1 retry, nunca mais
  })

  it('8b) P2002 com target não relacionado (ex.: conflito em outro campo único) — NÃO retenta, erro controlado', async () => {
    const buf = buffer()
    transactionMock.mockRejectedValue(uniqueConflict('asaasId'))

    const result = await persistContractPdf({
      companyId: COMPANY_ID, contractVersion: CONTRACT_VERSION, contractAcceptedAt: ACCEPTED_AT, pdfBuffer: buf,
    })

    expect(result.outcome).toBe('error')
    expect(transactionMock).toHaveBeenCalledTimes(1) // conflito não reconhecido nunca é retentado
  })

  it('8c) P2002 sem meta.target — NÃO retenta, erro controlado', async () => {
    const buf = buffer()
    const semTarget = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002', clientVersion: '5.22.0',
    })
    transactionMock.mockRejectedValue(semTarget)

    const result = await persistContractPdf({
      companyId: COMPANY_ID, contractVersion: CONTRACT_VERSION, contractAcceptedAt: ACCEPTED_AT, pdfBuffer: buf,
    })

    expect(result.outcome).toBe('error')
    expect(transactionMock).toHaveBeenCalledTimes(1)
  })

  it('9) erro inesperado (não P2002) na transação — retorna erro controlado sem expor detalhes sensíveis', async () => {
    const buf = buffer()
    transactionMock.mockRejectedValue(new Error('connection string: postgres://user:senha@host/db'))

    const result = await persistContractPdf({
      companyId: COMPANY_ID, contractVersion: CONTRACT_VERSION, contractAcceptedAt: ACCEPTED_AT, pdfBuffer: buf,
    })

    expect(result).toEqual({ outcome: 'error', reason: 'Error' }) // só err.name, nunca err.message
    expect(transactionMock).toHaveBeenCalledTimes(1) // erro não-P2002 não é retentado
  })

  it('10) Company inexistente — erro controlado, nenhuma escrita', async () => {
    const buf = buffer()
    const { tx, documentCreate, storageCreate } = makeTx({ companyExists: false })
    transactionMock.mockImplementation(async fn => fn(tx as any))

    const result = await persistContractPdf({
      companyId: COMPANY_ID, contractVersion: CONTRACT_VERSION, contractAcceptedAt: ACCEPTED_AT, pdfBuffer: buf,
    })

    expect(result).toEqual({ outcome: 'error', reason: 'company_not_found' })
    expect(storageCreate).not.toHaveBeenCalled()
    expect(documentCreate).not.toHaveBeenCalled()
  })
})
