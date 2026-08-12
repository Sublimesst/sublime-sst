import { describe, it, expect } from 'vitest'
import {
  workerDraftSchema,
  toWorkerWriteData,
  isWorkerCompleteForSubmission,
  findDuplicateWorkerIds,
  serializeWorker,
  MAX_WORKERS_PER_COMPANY,
} from './onboardingWorkers'

describe('workerDraftSchema', () => {
  it('aceita objeto vazio — todo campo é opcional no rascunho', () => {
    const parsed = workerDraftSchema.safeParse({})
    expect(parsed.success).toBe(true)
  })

  it('aceita payload completo válido', () => {
    const parsed = workerDraftSchema.safeParse({
      nome: 'Maria Silva', dataNascimento: '1990-05-10', sexo: 'F',
      dataAdmissao: '2026-01-15', cargo: 'Analista', setor: 'Financeiro',
    })
    expect(parsed.success).toBe(true)
  })

  it('rejeita data de nascimento em formato inválido', () => {
    const parsed = workerDraftSchema.safeParse({ dataNascimento: '10/05/1990' })
    expect(parsed.success).toBe(false)
  })

  it('rejeita sexo fora de M/F', () => {
    const parsed = workerDraftSchema.safeParse({ sexo: 'outro' })
    expect(parsed.success).toBe(false)
  })

  it('aceita null explícito para limpar um campo', () => {
    const parsed = workerDraftSchema.safeParse({ nome: null, dataNascimento: null, sexo: null })
    expect(parsed.success).toBe(true)
  })

  it('trata string vazia de data como equivalente a null (campo limpo, não erro)', () => {
    const parsed = workerDraftSchema.safeParse({ dataNascimento: '', dataAdmissao: '' })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.dataNascimento).toBeNull()
      expect(parsed.data.dataAdmissao).toBeNull()
    }
  })
})

describe('toWorkerWriteData', () => {
  it('normaliza string em branco para null', () => {
    const data = toWorkerWriteData({ nome: '   ', cargo: undefined, setor: undefined, sexo: undefined, dataNascimento: undefined, dataAdmissao: undefined })
    expect(data.nome).toBeNull()
  })

  it('não toca em campos ausentes do payload (undefined não vira chave)', () => {
    const data = toWorkerWriteData({ nome: 'Ana', cargo: undefined, setor: undefined, sexo: undefined, dataNascimento: undefined, dataAdmissao: undefined })
    expect('cargo' in data).toBe(false)
    expect(data.nome).toBe('Ana')
  })

  it('converte data civil string para Date à meia-noite UTC do mesmo dia', () => {
    const data = toWorkerWriteData({ dataNascimento: '1990-05-10', nome: undefined, cargo: undefined, setor: undefined, sexo: undefined, dataAdmissao: undefined })
    expect(data.dataNascimento).toBeInstanceOf(Date)
    expect((data.dataNascimento as Date).getUTCFullYear()).toBe(1990)
  })
})

describe('isWorkerCompleteForSubmission', () => {
  const complete = {
    nome: 'Ana', dataNascimento: new Date('1990-01-01'), sexo: 'F', dataAdmissao: new Date('2026-01-01'),
    cargo: 'Analista', setor: 'Financeiro',
  }

  it('completo → true', () => {
    expect(isWorkerCompleteForSubmission(complete)).toBe(true)
  })

  it('sem nome → false', () => {
    expect(isWorkerCompleteForSubmission({ ...complete, nome: null })).toBe(false)
  })
  it('sem data de nascimento → false', () => {
    expect(isWorkerCompleteForSubmission({ ...complete, dataNascimento: null })).toBe(false)
  })
  it('sexo inválido → false', () => {
    expect(isWorkerCompleteForSubmission({ ...complete, sexo: 'X' })).toBe(false)
  })
  it('sexo null → false', () => {
    expect(isWorkerCompleteForSubmission({ ...complete, sexo: null })).toBe(false)
  })
  it('sem data de admissão → false', () => {
    expect(isWorkerCompleteForSubmission({ ...complete, dataAdmissao: null })).toBe(false)
  })
  it('sem cargo → false', () => {
    expect(isWorkerCompleteForSubmission({ ...complete, cargo: null })).toBe(false)
  })
  it('sem setor → false (obrigatório no envio desde a tranche de exportação SOC)', () => {
    expect(isWorkerCompleteForSubmission({ ...complete, setor: null })).toBe(false)
  })
})

describe('findDuplicateWorkerIds', () => {
  it('nome + data de nascimento iguais → ambos marcados', () => {
    const workers = [
      { id: 'a', nome: 'João Silva', dataNascimento: new Date('1990-01-01') },
      { id: 'b', nome: 'joão   silva', dataNascimento: new Date('1990-01-01') }, // maiúsc./espaços não escondem duplicidade
      { id: 'c', nome: 'Maria Souza', dataNascimento: new Date('1985-05-05') },
    ]
    const duplicates = findDuplicateWorkerIds(workers)
    expect(duplicates.has('a')).toBe(true)
    expect(duplicates.has('b')).toBe(true)
    expect(duplicates.has('c')).toBe(false)
  })

  it('nomes iguais mas datas diferentes → não é duplicidade', () => {
    const workers = [
      { id: 'a', nome: 'João Silva', dataNascimento: new Date('1990-01-01') },
      { id: 'b', nome: 'João Silva', dataNascimento: new Date('1991-01-01') },
    ]
    expect(findDuplicateWorkerIds(workers).size).toBe(0)
  })

  it('workers incompletos (nome ou data ausente) nunca contam como duplicidade', () => {
    const workers = [
      { id: 'a', nome: null, dataNascimento: null },
      { id: 'b', nome: null, dataNascimento: null },
    ]
    expect(findDuplicateWorkerIds(workers).size).toBe(0)
  })

  it('lista vazia → nenhuma duplicidade', () => {
    expect(findDuplicateWorkerIds([]).size).toBe(0)
  })
})

describe('serializeWorker', () => {
  it('formata datas para "YYYY-MM-DD" e preserva os demais campos', () => {
    const view = serializeWorker({
      id: 'w1', nome: 'Ana', dataNascimento: new Date(Date.UTC(1990, 4, 10)), sexo: 'F',
      dataAdmissao: new Date(Date.UTC(2026, 0, 15)), cargo: 'Analista', setor: null,
    })
    expect(view).toEqual({
      id: 'w1', nome: 'Ana', dataNascimento: '1990-05-10', sexo: 'F',
      dataAdmissao: '2026-01-15', cargo: 'Analista', setor: null,
    })
  })

  it('datas nulas viram null, não erro', () => {
    const view = serializeWorker({ id: 'w1', nome: null, dataNascimento: null, sexo: null, dataAdmissao: null, cargo: null, setor: null })
    expect(view.dataNascimento).toBeNull()
    expect(view.dataAdmissao).toBeNull()
  })

  it('sexo fora de M/F persistido nunca vaza — normaliza para null na saída', () => {
    const view = serializeWorker({ id: 'w1', nome: null, dataNascimento: null, sexo: 'invalido', dataAdmissao: null, cargo: null, setor: null })
    expect(view.sexo).toBeNull()
  })
})

describe('MAX_WORKERS_PER_COMPANY', () => {
  it('é 20', () => {
    expect(MAX_WORKERS_PER_COMPANY).toBe(20)
  })
})
