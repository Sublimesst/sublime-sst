// ═══════════════════════════════════════════════════════════
// SUBLIME SST — Transações Serializable com retry curto (onboarding de
// trabalhadores)
// Protege invariantes read-modify-write que atravessam múltiplas
// requisições concorrentes (limite de 20 Workers, mutação de Worker vs.
// congelamento da declaração, dois envios finais simultâneos) usando o
// isolamento SERIALIZABLE do Postgres — a mesma técnica documentada pelo
// próprio Postgres para anomalias de "write skew" (ex.: contar linhas e
// decidir inserir com base na contagem).
// ═══════════════════════════════════════════════════════════

import { Prisma } from '@prisma/client'
import { prisma } from './prisma'

// Curto e limitado de propósito — cada tentativa é rápida (poucas
// leituras/escritas, sem I/O externo dentro da transação) e um conflito de
// serialização só acontece sob concorrência real, não sob carga normal.
const MAX_ATTEMPTS = 3

function isSerializationConflict(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034'
}

// Roda `fn` dentro de uma transação interativa Serializable, reexecutando
// (do zero, com leitura fresca) só quando o Postgres sinaliza um conflito
// de serialização (P2034) — nunca para qualquer outro erro, que sempre
// propaga imediatamente para o chamador decidir a resposta.
//
// `fn` NUNCA pode ter efeito colateral externo (e-mail, chamada de API):
// pode ser reexecutada mais de uma vez em caso de conflito.
export async function runSerializable<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  let lastError: unknown
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await prisma.$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    } catch (err) {
      lastError = err
      if (!isSerializationConflict(err)) throw err
    }
  }
  throw lastError
}
