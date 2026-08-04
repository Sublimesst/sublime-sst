// ═══════════════════════════════════════════════════════════
// SUBLIME SST — Persistência idempotente do PDF do contrato
// Garante que o mesmo Buffer gerado no webhook de confirmação da
// implantação seja gravado em storage + Document + Company.contractHash
// de forma atômica, sem duplicar nem sobrescrever artefato existente.
// ═══════════════════════════════════════════════════════════

import { createHash } from 'crypto'
import { Prisma } from '@prisma/client'
import { prisma } from './prisma'

const CONTRACT_TIPO_DOCUMENTO = 'contrato'
const CONTRACT_CONTENT_TYPE = 'application/pdf'
const CONTRACT_NOME_ARQUIVO = 'Contrato_Sublime_Digital.pdf'

// Identidade determinística do contrato: companyId + contractVersion +
// contractAcceptedAt — nunca a data/hora da geração do PDF (que muda a cada
// tentativa). A mesma tripla sempre produz a mesma storageKey, permitindo
// que uma nova tentativa do mesmo aceite reconheça o artefato já existente
// (via Document.storageKey, já @unique no schema) em vez de criar um novo.
// Sem dado pessoal: companyId é um cuid interno, nunca CPF/CNPJ/e-mail.
export function buildContractStorageKey(
  companyId: string,
  contractVersion: string,
  contractAcceptedAt: Date
): string {
  const acceptedAtKey = contractAcceptedAt.toISOString().replace(/[:.]/g, '-')
  return `contrato/${companyId}/${contractVersion}/${acceptedAtKey}`
}

function sha256Hex(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

export type PersistContractResult =
  | { outcome: 'created'; documentId: string; storageKey: string; hash: string }
  | { outcome: 'document_recovered'; documentId: string; storageKey: string; hash: string }
  | { outcome: 'already_persisted'; documentId: string; storageKey: string; hash: string }
  | { outcome: 'company_hash_mismatch'; storageKey: string; hash: string }
  | { outcome: 'storage_bytes_mismatch'; storageKey: string; hash: string }
  | { outcome: 'orphan_document'; documentId: string; storageKey: string }
  | { outcome: 'error'; reason: string }

// Subtipo dos outcomes em que o PDF foi de fato persistido íntegro (criado
// agora ou reconhecido idêntico a uma tentativa anterior) — usado para que
// isContractPersisted funcione como type guard real: dentro do `if`, o
// chamador (ex.: o webhook) recupera acesso a storageKey/hash/documentId,
// presentes nos três, sem precisar de asserção manual de tipo.
type PersistedContractResult = Extract<
  PersistContractResult,
  { outcome: 'created' | 'already_persisted' | 'document_recovered' }
>

// Fonte única desta classificação — nunca duplicar a lista de outcomes em
// outro arquivo (ex.: no webhook, para decidir se anexa o PDF ao e-mail).
const SUCCESSFUL_PERSIST_OUTCOMES: ReadonlySet<PersistContractResult['outcome']> =
  new Set<PersistContractResult['outcome']>(['created', 'already_persisted', 'document_recovered'])

export function isContractPersisted(result: PersistContractResult): result is PersistedContractResult {
  return SUCCESSFUL_PERSIST_OUTCOMES.has(result.outcome)
}

export interface PersistContractParams {
  companyId: string
  contractVersion: string
  contractAcceptedAt: Date
  pdfBuffer: Buffer
}

// Núcleo transacional — lê, decide e escreve dentro de uma única
// prisma.$transaction, para nunca deixar storage/Document/contractHash
// inconsistentes entre si mesmo sob falha no meio do caminho. Nunca usa
// storage.upload()/DbStorageProvider (que faz upsert e sobrescreveria
// silenciosamente) — grava direto via tx.dbStorageObject.create, que falha
// com P2002 se a key já existir, nunca substitui bytes.
async function runPersistTransaction(
  params: PersistContractParams,
  hash: string,
  storageKey: string
): Promise<PersistContractResult> {
  return prisma.$transaction(async tx => {
    const company = await tx.company.findUnique({
      where: { id: params.companyId },
      select: { contractHash: true },
    })
    if (!company) {
      return { outcome: 'error', reason: 'company_not_found' } as const
    }

    // Cenário E — Company.contractHash já preenchido e divergente do Buffer
    // atual: nunca sobrescreve hash, nunca mexe em storage, nunca cria
    // contrato novo. Checado ANTES de qualquer leitura de Document/storage.
    if (company.contractHash && company.contractHash !== hash) {
      return { outcome: 'company_hash_mismatch', storageKey, hash } as const
    }

    const [existingDocument, existingStorage] = await Promise.all([
      tx.document.findUnique({ where: { storageKey } }),
      tx.dbStorageObject.findUnique({ where: { key: storageKey } }),
    ])

    // Cenário D — Document existe, mas o storage referenciado não. Estado
    // inconsistente: nunca cria um novo arquivo silenciosamente como se
    // fosse o original.
    if (existingDocument && !existingStorage) {
      return { outcome: 'orphan_document', documentId: existingDocument.id, storageKey } as const
    }

    if (existingStorage) {
      const existingHash = sha256Hex(existingStorage.data)
      // Storage já existe (Cenário B ou C) — bytes precisam corresponder
      // exatamente ao Buffer atual. Divergência nunca é sobrescrita.
      if (existingHash !== hash) {
        return { outcome: 'storage_bytes_mismatch', storageKey, hash } as const
      }

      if (existingDocument) {
        // Cenário B — tudo já existe e corresponde: idempotente, sem
        // duplicar e sem sobrescrever. Só completa contractHash se ainda
        // estiver nulo (o gate acima já garante que, se preenchido, bate).
        if (!company.contractHash) {
          await tx.company.update({ where: { id: params.companyId }, data: { contractHash: hash } })
        }
        return { outcome: 'already_persisted', documentId: existingDocument.id, storageKey, hash } as const
      }

      // Cenário C — storage existe, Document não, hash corresponde: cria
      // somente o Document apontando para o storage já existente.
      const recoveredDocument = await tx.document.create({
        data: {
          companyId:       params.companyId,
          tipoDocumento:   CONTRACT_TIPO_DOCUMENTO,
          nomeArquivo:     CONTRACT_NOME_ARQUIVO,
          mimeType:        CONTRACT_CONTENT_TYPE,
          tamanhoBytes:    existingStorage.data.length,
          storageProvider: 'db',
          storageKey,
        },
      })
      if (!company.contractHash) {
        await tx.company.update({ where: { id: params.companyId }, data: { contractHash: hash } })
      }
      return { outcome: 'document_recovered', documentId: recoveredDocument.id, storageKey, hash } as const
    }

    // Cenário A — nada existe: cria storage + Document + hash, os três
    // dentro da mesma transação.
    await tx.dbStorageObject.create({
      data: { key: storageKey, data: params.pdfBuffer, contentType: CONTRACT_CONTENT_TYPE },
    })
    const createdDocument = await tx.document.create({
      data: {
        companyId:       params.companyId,
        tipoDocumento:   CONTRACT_TIPO_DOCUMENTO,
        nomeArquivo:     CONTRACT_NOME_ARQUIVO,
        mimeType:        CONTRACT_CONTENT_TYPE,
        tamanhoBytes:    params.pdfBuffer.length,
        storageProvider: 'db',
        storageKey,
      },
    })
    if (!company.contractHash) {
      await tx.company.update({ where: { id: params.companyId }, data: { contractHash: hash } })
    }
    return { outcome: 'created', documentId: createdDocument.id, storageKey, hash } as const
  })
}

// Nomes de constraint únicos alcançáveis pelas escritas desta transação —
// conferido em prisma/schema.prisma: DbStorageObject.key é @id (mapeado
// para a tabela storage_objects_db) e Document.storageKey é @unique
// (mapeado para a tabela documents). Nenhum outro campo único é escrito por
// esta transação (Company.update só toca contractHash, que não é único).
// O Prisma pode reportar meta.target tanto como o nome da coluna (forma
// documentada para a maioria dos conectores) quanto, para alguns tipos de
// conflito, como o nome do constraint gerado pelo Postgres via `prisma db
// push` (convenção padrão: `<tabela>_pkey` / `<tabela>_<coluna>_key`) — os
// dois formatos são aceitos explicitamente, nunca por correspondência
// aproximada de string.
const RETRYABLE_UNIQUE_TARGETS: ReadonlySet<string> = new Set([
  'key',                        // nome da coluna (DbStorageObject.key)
  'storageKey',                 // nome da coluna (Document.storageKey)
  'storage_objects_db_pkey',    // nome padrão do constraint de PK no Postgres
  'documents_storageKey_key',   // nome padrão do constraint @unique no Postgres
])

// Normaliza meta.target (tipado só como `unknown` pelo Prisma) para uma
// lista de strings — aceita tanto o formato string quanto array de string;
// qualquer outro formato (ausente, número, objeto) vira lista vazia.
function normalizeUniqueTarget(target: unknown): string[] {
  if (typeof target === 'string') return [target]
  if (Array.isArray(target)) return target.filter((t): t is string => typeof t === 'string')
  return []
}

// Só reconhece como "corrida esperada, seguro retentar" um P2002 cujo
// meta.target aponte exatamente para uma das duas constraints únicas
// alcançáveis por esta transação (ver RETRYABLE_UNIQUE_TARGETS). Nunca usa
// err.message. Target ausente, ilegível ou apontando para qualquer outro
// campo/constraint NUNCA é tratado como concorrência válida — vira erro
// controlado sem retentativa.
export function isRetryableStorageConflict(err: unknown): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return false
  if (err.code !== 'P2002') return false
  const targets = normalizeUniqueTarget(err.meta?.target)
  if (targets.length === 0) return false
  return targets.some(target => RETRYABLE_UNIQUE_TARGETS.has(target))
}

// Ponto de entrada público. Idempotente: reexecuções com os mesmos dados de
// entrada (mesmo companyId/contractVersion/contractAcceptedAt/Buffer) nunca
// duplicam Document/storage nem sobrescrevem hash. Nunca lança — toda falha
// vira um outcome estruturado, para o chamador tratar como best-effort sem
// derrubar o webhook nem reverter Payment/Company.status. Retentativa única,
// e somente para a corrida real e esperada nas duas constraints desta
// transação (ver isRetryableStorageConflict) — qualquer outro erro,
// incluindo P2002 de origem não reconhecida, encerra na primeira tentativa.
export async function persistContractPdf(
  params: PersistContractParams,
  attempt = 0
): Promise<PersistContractResult> {
  const hash = sha256Hex(params.pdfBuffer)
  const storageKey = buildContractStorageKey(params.companyId, params.contractVersion, params.contractAcceptedAt)

  try {
    return await runPersistTransaction(params, hash, storageKey)
  } catch (err) {
    if (isRetryableStorageConflict(err) && attempt === 0) {
      return persistContractPdf(params, attempt + 1)
    }
    return {
      outcome: 'error',
      reason: err instanceof Error ? err.name : 'unknown_error',
    }
  }
}
