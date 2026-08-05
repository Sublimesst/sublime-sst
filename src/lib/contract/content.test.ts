import { describe, it, expect } from 'vitest'
import { CONTRACT_VERSION } from '@/lib/pricing'
import { getContractContent, getCurrentContractContent, listContractVersions } from './content'
import type { ContractBlock } from './types'

// Frases expressamente proibidas pelo conteúdo congelado
// (docs/CONTRACT_MVP_V1.md, Seção 15) — nunca devem aparecer na versão
// vigente do contrato.
const FRASES_PROIBIDAS = [
  'implantação paga',
  'prova suficiente para todos os fins legais',
]

// Regras comerciais antigas, expressamente superadas (docs/DECISIONS.md) —
// nunca devem aparecer na versão vigente.
const REGRAS_ANTIGAS = [
  '6 (seis) mensalidades',
  '6 mensalidades mínimas',
  'entrega dos documentos de implantação',
  'aviso prévio de 60',
  '60 (sessenta) dias',
]

function textoDaClausula(blocos: readonly ContractBlock[]): string {
  return blocos
    .map(b => (b.type === 'paragrafo' ? b.texto : [b.titulo, ...b.itens].filter(Boolean).join(' ')))
    .join(' ')
    .toLowerCase()
}

function textoCompleto(clausulas: ReturnType<typeof getCurrentContractContent>['clausulas']): string {
  return clausulas.map(c => `${c.titulo} ${textoDaClausula(c.blocos)}`).join(' ').toLowerCase()
}

describe('fonte contratual única — versão vigente', () => {
  it('CONTRACT_VERSION atual é 2026-08-05', () => {
    expect(CONTRACT_VERSION).toBe('2026-08-05')
  })

  it('possui exatamente 16 cláusulas', () => {
    const { clausulas } = getCurrentContractContent()
    expect(clausulas).toHaveLength(16)
  })

  it('números das cláusulas são 1 a 16, em ordem, sem lacunas', () => {
    const { clausulas } = getCurrentContractContent()
    expect(clausulas.map(c => c.numero)).toEqual(Array.from({ length: 16 }, (_, i) => i + 1))
  })

  it('nenhuma cláusula está vazia (título e ao menos um bloco com conteúdo)', () => {
    const { clausulas } = getCurrentContractContent()
    for (const c of clausulas) {
      expect(c.titulo.trim().length).toBeGreaterThan(0)
      expect(c.blocos.length).toBeGreaterThan(0)
      const texto = textoDaClausula(c.blocos)
      expect(texto.trim().length).toBeGreaterThan(0)
    }
  })

  it('getCurrentContractContent() retorna a versão apontada por CONTRACT_VERSION', () => {
    const atual = getCurrentContractContent()
    expect(atual.version).toBe(CONTRACT_VERSION)
    expect(atual).toEqual(getContractContent(CONTRACT_VERSION))
  })

  it('não contém nenhuma das frases proibidas pelo MVP 1.0 (Seção 15)', () => {
    const { clausulas } = getCurrentContractContent()
    const texto = textoCompleto(clausulas)
    for (const frase of FRASES_PROIBIDAS) {
      expect(texto).not.toContain(frase.toLowerCase())
    }
  })

  it('não contém nenhuma das regras comerciais antigas superadas (docs/DECISIONS.md)', () => {
    const { clausulas } = getCurrentContractContent()
    const texto = textoCompleto(clausulas)
    for (const regra of REGRAS_ANTIGAS) {
      expect(texto).not.toContain(regra.toLowerCase())
    }
  })

  it('reproduz fielmente a definição obrigatória de triagem remota (Seção 10 do MVP)', () => {
    const { clausulas } = getCurrentContractContent()
    const texto = textoCompleto(clausulas)
    expect(texto).toContain(
      'triagem técnica preliminar remota de exposições ocupacionais, realizada com base nas informações, documentos e evidências fornecidos pelo contratante'.toLowerCase()
    )
    expect(texto).toContain(
      'a triagem remota não caracteriza nem descaracteriza insalubridade ou periculosidade'.toLowerCase()
    )
  })

  it('não contém valores monetários fixos (nenhum "R$" no conteúdo)', () => {
    const { clausulas } = getCurrentContractContent()
    const texto = textoCompleto(clausulas)
    expect(texto).not.toContain('r$')
  })

  it('reflete a vigência de 12 meses e o aviso prévio único de 90 dias (Seção 3 do MVP)', () => {
    const { clausulas } = getCurrentContractContent()
    const texto = textoCompleto(clausulas)
    expect(texto).toContain('vigência inicial mínima de 12 (doze) meses')
    expect(texto).toContain('aviso prévio de 90 (noventa) dias')
  })
})

describe('fonte contratual única — versionamento e histórico', () => {
  it('rejeita explicitamente uma versão desconhecida', () => {
    expect(() => getContractContent('1999-01-01')).toThrow(/desconhecida/i)
  })

  it('preserva o conteúdo da versão anterior (2026-07-04) sem substituição silenciosa', () => {
    const legado = getContractContent('2026-07-04')
    expect(legado.version).toBe('2026-07-04')
    expect(legado.clausulas).toHaveLength(16)
    const texto = textoCompleto(legado.clausulas)
    // A versão legada preserva o texto que /termos publicava naquela data
    // — não é uma réplica bit a bit do PDF histórico (que só imprimia um
    // extrato de 7 das 16 cláusulas; o artefato histórico primário é o
    // PDF já persistido, com hash, em Company.contractHash). Aqui só se
    // confirma que a regra antiga permanece, nunca reescrita com o texto
    // da versão vigente.
    expect(texto).toContain('6 (seis) mensalidades mínimas')
  })

  it('versão legada e versão vigente são objetos de conteúdo distintos', () => {
    const legado = getContractContent('2026-07-04')
    const atual = getCurrentContractContent()
    expect(legado.version).not.toBe(atual.version)
    expect(legado.clausulas).not.toBe(atual.clausulas)
  })

  it('lista pelo menos as duas versões conhecidas', () => {
    const versoes = listContractVersions()
    expect(versoes).toContain('2026-07-04')
    expect(versoes).toContain(CONTRACT_VERSION)
  })
})

describe('fonte contratual única — imutabilidade em runtime (Object.freeze profundo)', () => {
  it('o objeto ContractContent retornado está congelado', () => {
    const content = getCurrentContractContent()
    expect(Object.isFrozen(content)).toBe(true)
  })

  it('o array de cláusulas está congelado', () => {
    const { clausulas } = getCurrentContractContent()
    expect(Object.isFrozen(clausulas)).toBe(true)
  })

  it('a primeira cláusula está congelada', () => {
    const { clausulas } = getCurrentContractContent()
    expect(Object.isFrozen(clausulas[0])).toBe(true)
  })

  it('o array de blocos da primeira cláusula está congelado', () => {
    const { clausulas } = getCurrentContractContent()
    expect(Object.isFrozen(clausulas[0].blocos)).toBe(true)
  })

  it('cada bloco de cada cláusula está congelado', () => {
    const { clausulas } = getCurrentContractContent()
    for (const clausula of clausulas) {
      for (const bloco of clausula.blocos) {
        expect(Object.isFrozen(bloco)).toBe(true)
      }
    }
  })

  it('o array de itens de ao menos uma lista está congelado', () => {
    const { clausulas } = getCurrentContractContent()
    const clausulaComLista = clausulas.find(c => c.blocos.some(b => b.type === 'lista'))
    expect(clausulaComLista).toBeDefined()
    const listaBloco = clausulaComLista?.blocos.find(b => b.type === 'lista')
    expect(listaBloco?.type).toBe('lista')
    if (listaBloco?.type === 'lista') {
      expect(Object.isFrozen(listaBloco.itens)).toBe(true)
    }
  })

  it('a versão legada (2026-07-04) também está profundamente congelada', () => {
    const legado = getContractContent('2026-07-04')
    expect(Object.isFrozen(legado)).toBe(true)
    expect(Object.isFrozen(legado.clausulas)).toBe(true)
    expect(Object.isFrozen(legado.clausulas[0])).toBe(true)
    expect(Object.isFrozen(legado.clausulas[0].blocos)).toBe(true)
  })
})
