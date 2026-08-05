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

function textoDaClausula(blocos: ContractBlock[]): string {
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
    // A versão legada é o registro fiel do que foi de fato aceito por
    // clientes sob ela — deve manter a regra antiga, nunca ser reescrita
    // com o texto da versão vigente.
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
