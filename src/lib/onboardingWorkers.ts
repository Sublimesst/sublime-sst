// ═══════════════════════════════════════════════════════════
// SUBLIME SST — Trabalhadores individuais do onboarding
// Validação, normalização e regras puras compartilhadas entre as rotas do
// Portal Cliente e (potencialmente) a UI. Nenhuma dependência de Prisma/DB
// aqui — só transformação e regra de negócio, testável sem mock.
// ═══════════════════════════════════════════════════════════

import { z } from 'zod'
import { parseCivilDate, formatCivilDate } from './civilDate'

export const MAX_WORKERS_PER_COMPANY = 20

// Lançados dentro de uma transação Serializable (ver
// src/lib/prismaSerializable.ts) e mapeados para a resposta HTTP correta no
// catch de cada rota — nunca acionam retry (só P2034 aciona retry).
export class WorkersLimitReachedError extends Error {
  constructor() {
    super('workers_limit_reached')
    this.name = 'WorkersLimitReachedError'
  }
}

export class WorkerNotFoundError extends Error {
  constructor() {
    super('worker_not_found')
    this.name = 'WorkerNotFoundError'
  }
}

export type WorkerSex = 'M' | 'F'

// Trabalhador como persistido/serializado para o cliente (datas já em
// "YYYY-MM-DD", nunca Date cru).
export interface WorkerView {
  id: string
  nome: string | null
  dataNascimento: string | null
  sexo: WorkerSex | null
  dataAdmissao: string | null
  cargo: string | null
  setor: string | null
}

// Trim + normaliza string vazia/só-espaço para null — nunca falsifica um
// campo "preenchido com nada" como se fosse uma resposta real.
export function normalizeOptionalString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

// Aceita "" como equivalente a "campo limpo" (null) — inputs de data
// controlados enviam string vazia ao serem apagados, não devem virar erro.
function civilDateField() {
  return z.union([z.string(), z.null()])
    .optional()
    .transform((value) => (value === '' ? null : value))
    .superRefine((value, ctx) => {
      if (value === undefined || value === null) return
      if (parseCivilDate(value) === null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Data inválida. Use o formato AAAA-MM-DD.' })
      }
    })
}

function optionalStringField(maxLength: number) {
  return z.union([z.string().max(maxLength), z.null()]).optional()
}

// Payload de rascunho — todo campo é opcional/nullable, nenhuma
// obrigatoriedade aqui (a obrigatoriedade de envio é validada à parte, em
// isWorkerCompleteForSubmission, contra o estado já persistido).
export const workerDraftSchema = z.object({
  nome: optionalStringField(200),
  dataNascimento: civilDateField(),
  sexo: z.union([z.enum(['M', 'F']), z.null()]).optional(),
  dataAdmissao: civilDateField(),
  cargo: optionalStringField(200),
  setor: optionalStringField(200),
})

export type WorkerDraftInput = z.infer<typeof workerDraftSchema>

// Converte o payload já validado pelo Zod em dados prontos para
// create/update do Prisma — strings vazias normalizadas para null, datas
// civis convertidas para Date (meia-noite UTC).
export function toWorkerWriteData(input: WorkerDraftInput) {
  const data: Record<string, string | Date | null> = {}
  if (input.nome !== undefined) data.nome = normalizeOptionalString(input.nome) ?? null
  if (input.cargo !== undefined) data.cargo = normalizeOptionalString(input.cargo) ?? null
  if (input.setor !== undefined) data.setor = normalizeOptionalString(input.setor) ?? null
  if (input.sexo !== undefined) data.sexo = input.sexo
  if (input.dataNascimento !== undefined) {
    data.dataNascimento = input.dataNascimento === null ? null : parseCivilDate(input.dataNascimento)
  }
  if (input.dataAdmissao !== undefined) {
    data.dataAdmissao = input.dataAdmissao === null ? null : parseCivilDate(input.dataAdmissao)
  }
  return data
}

// Formato de saída para o cliente — datas sempre "YYYY-MM-DD", nunca Date
// cru (evitaria reintroduzir o problema de timezone no outro sentido).
export function serializeWorker(worker: {
  id: string
  nome: string | null
  dataNascimento: Date | null
  sexo: string | null
  dataAdmissao: Date | null
  cargo: string | null
  setor: string | null
}): WorkerView {
  return {
    id: worker.id,
    nome: worker.nome,
    dataNascimento: worker.dataNascimento ? formatCivilDate(worker.dataNascimento) : null,
    sexo: worker.sexo === 'M' || worker.sexo === 'F' ? worker.sexo : null,
    dataAdmissao: worker.dataAdmissao ? formatCivilDate(worker.dataAdmissao) : null,
    cargo: worker.cargo,
    setor: worker.setor,
  }
}

export interface WorkerCompletenessInput {
  nome: string | null
  dataNascimento: Date | null
  sexo: string | null
  dataAdmissao: Date | null
  cargo: string | null
}

// Campos obrigatórios só no envio (setor fica sempre opcional). Checagem
// feita no servidor contra o estado já persistido — nunca confia em flag
// vinda do cliente.
export function isWorkerCompleteForSubmission(worker: WorkerCompletenessInput): boolean {
  return (
    !!worker.nome &&
    !!worker.dataNascimento &&
    (worker.sexo === 'M' || worker.sexo === 'F') &&
    !!worker.dataAdmissao &&
    !!worker.cargo
  )
}

// Chave de duplicidade: nome normalizado (minúsculo, espaços colapsados) +
// data de nascimento civil. Usada só para aviso — nunca para bloquear nem
// para constraint de banco.
function duplicateKey(worker: { nome: string | null; dataNascimento: Date | null }): string | null {
  if (!worker.nome || !worker.dataNascimento) return null
  const normalizedName = worker.nome.trim().toLowerCase().replace(/\s+/g, ' ')
  return `${normalizedName}|${formatDateKey(worker.dataNascimento)}`
}

function formatDateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`
}

// Retorna o conjunto de ids de trabalhadores que participam de algum grupo
// de possível duplicidade (mesmo nome normalizado + mesma data de
// nascimento). Puramente informativo.
export function findDuplicateWorkerIds<T extends { id: string; nome: string | null; dataNascimento: Date | null }>(
  workers: T[]
): Set<string> {
  const groups = new Map<string, string[]>()
  for (const worker of workers) {
    const key = duplicateKey(worker)
    if (!key) continue
    const group = groups.get(key) ?? []
    group.push(worker.id)
    groups.set(key, group)
  }

  const duplicateIds = new Set<string>()
  Array.from(groups.values()).forEach((ids) => {
    if (ids.length > 1) ids.forEach((id) => duplicateIds.add(id))
  })
  return duplicateIds
}
