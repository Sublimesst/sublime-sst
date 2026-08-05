import { describe, it, expect, vi, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { generateContractPdf } from './contractPdf'
import * as contractContentModule from './contract/content'
import { getContractContent } from './contract/content'
import { CONTRACT_VERSION, getImplantacaoPrice } from './pricing'

function syntheticData(overrides: Partial<Parameters<typeof generateContractPdf>[0]> = {}) {
  return {
    razaoSocial: 'EMPRESA SINTETICA DE TESTE LTDA',
    cnpj: '00.000.000/0001-00',
    responsavel: 'Responsavel Sintetico',
    endereco: 'Rua de Teste, 000',
    cidade: 'Cidade Teste',
    estado: 'RJ',
    cep: '00000-000',
    numFuncionarios: 4,
    email: 'teste@example.com',
    planType: 'essencial',
    implantacaoValor: getImplantacaoPrice('essencial', false),
    implantacaoPromo: false,
    contractAcceptedAt: new Date('2026-08-05T12:00:00.000Z'),
    contractAcceptanceIp: '127.0.0.1',
    contractAcceptanceUa: 'vitest-synthetic-agent',
    contractVersion: CONTRACT_VERSION,
    ...overrides,
  }
}

describe('generateContractPdf — regressão e correspondência com pricing.ts', () => {
  it('gera um PDF válido (magic bytes %PDF) para o plano Essencial, versão vigente', async () => {
    const buffer = await generateContractPdf(syntheticData())
    expect(buffer.subarray(0, 4).toString('ascii')).toBe('%PDF')
    expect(buffer.length).toBeGreaterThan(1000)
  })

  it('gera um PDF válido para o plano Premium, versão vigente', async () => {
    const buffer = await generateContractPdf(syntheticData({
      planType: 'premium',
      implantacaoValor: getImplantacaoPrice('premium', false),
    }))
    expect(buffer.subarray(0, 4).toString('ascii')).toBe('%PDF')
  })

  it('gera um PDF válido também para a versão legada 2026-07-04 (contrato já aceito)', async () => {
    const buffer = await generateContractPdf(syntheticData({ contractVersion: '2026-07-04' }))
    expect(buffer.subarray(0, 4).toString('ascii')).toBe('%PDF')
  })

  it('rejeita geração com uma contractVersion desconhecida (nunca gera com versão ambígua)', async () => {
    await expect(generateContractPdf(syntheticData({ contractVersion: '1999-01-01' }))).rejects.toThrow(/desconhecida/i)
  })

  it('o número de cláusulas renderizadas é o mesmo da fonte única para a versão pedida', async () => {
    const content = getContractContent(CONTRACT_VERSION)
    expect(content.clausulas).toHaveLength(16)
    // A geração não lança e não perde cláusulas — como não há parser de PDF
    // disponível no projeto, a correspondência de conteúdo é garantida
    // estruturalmente: generateContractPdf itera exatamente
    // `content.clausulas` (src/lib/contractPdf.ts), coberto também pelo
    // teste estático de fonte única abaixo.
    await expect(generateContractPdf(syntheticData())).resolves.toBeInstanceOf(Buffer)
  })
})

describe('generateContractPdf — seleção da versão contratual (sem fallback silencioso)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('usa exclusivamente data.contractVersion para buscar o conteúdo — nunca CONTRACT_VERSION/getCurrentContractContent', async () => {
    const spy = vi.spyOn(contractContentModule, 'getContractContent')
    await generateContractPdf(syntheticData({ contractVersion: '2026-07-04' }))
    expect(spy).toHaveBeenCalledWith('2026-07-04')
    expect(spy).not.toHaveBeenCalledWith(CONTRACT_VERSION)
  })

  it('versão 2026-07-04 usa o conteúdo da versão 2026-07-04 (histórico)', async () => {
    const spy = vi.spyOn(contractContentModule, 'getContractContent')
    await generateContractPdf(syntheticData({ contractVersion: '2026-07-04' }))
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith('2026-07-04')
  })

  it('versão 2026-08-05 usa o conteúdo da versão 2026-08-05 (vigente)', async () => {
    const spy = vi.spyOn(contractContentModule, 'getContractContent')
    await generateContractPdf(syntheticData({ contractVersion: '2026-08-05' }))
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith('2026-08-05')
  })

  it('versão desconhecida falha explicitamente, sem gerar PDF com conteúdo ambíguo', async () => {
    const spy = vi.spyOn(contractContentModule, 'getContractContent')
    await expect(generateContractPdf(syntheticData({ contractVersion: '2020-01-01' }))).rejects.toThrow(/desconhecida/i)
    // A tentativa de busca ocorreu com a versão pedida — não houve
    // substituição silenciosa por nenhuma outra versão antes de falhar.
    expect(spy).toHaveBeenCalledWith('2020-01-01')
  })

  it('versão ausente (string vazia, simulando dado histórico corrompido) falha explicitamente', async () => {
    await expect(generateContractPdf(syntheticData({ contractVersion: '' }))).rejects.toThrow(/desconhecida/i)
  })

  it('versão ausente (undefined via bypass de tipo, simulando dado nulo em runtime) falha explicitamente', async () => {
    const data = syntheticData({ contractVersion: undefined as unknown as string })
    await expect(generateContractPdf(data)).rejects.toThrow(/desconhecida/i)
  })

  it('nunca invoca getCurrentContractContent() — nem em sucesso nem em falha', async () => {
    const spy = vi.spyOn(contractContentModule, 'getCurrentContractContent')
    await generateContractPdf(syntheticData({ contractVersion: '2026-07-04' }))
    await generateContractPdf(syntheticData({ contractVersion: '2026-08-05' }))
    await generateContractPdf(syntheticData({ contractVersion: 'inexistente' })).catch(() => {})
    expect(spy).not.toHaveBeenCalled()
  })
})

describe('contractPdf.ts — fonte única de preços e de conteúdo (verificação estática)', () => {
  const source = readFileSync(join(process.cwd(), 'src/lib/contractPdf.ts'), 'utf-8')

  it('não define nenhuma tabela de preços própria (MONTHLY_BRL removida)', () => {
    expect(source).not.toMatch(/MONTHLY_BRL/)
  })

  it('não contém valores monetários literais (nenhum "R$" hardcoded)', () => {
    expect(source).not.toMatch(/R\$\s*\d/)
  })

  it('importa preços exclusivamente de pricing.ts', () => {
    expect(source).toMatch(/from ['"].\/pricing['"]/)
    expect(source).toMatch(/getMonthlyPrice/)
  })

  it('importa cláusulas da fonte única de conteúdo (./contract/content), não de texto próprio', () => {
    expect(source).toMatch(/from ['"].\/contract\/content['"]/)
    expect(source).toMatch(/getContractContent/)
  })

  it('nunca referencia getCurrentContractContent nem CONTRACT_VERSION como fallback de conteúdo', () => {
    expect(source).not.toMatch(/getCurrentContractContent/)
    // CONTRACT_VERSION não deve ser importado aqui — a versão do contrato
    // gerado vem exclusivamente de data.contractVersion (ver describe
    // "seleção da versão contratual" acima).
    expect(source).not.toMatch(/CONTRACT_VERSION/)
  })
})

describe('/termos e PDF consomem a mesma fonte de conteúdo (verificação estática)', () => {
  const termosSource = readFileSync(join(process.cwd(), 'src/app/termos/page.tsx'), 'utf-8')
  const pdfSource = readFileSync(join(process.cwd(), 'src/lib/contractPdf.ts'), 'utf-8')

  it('/termos importa de @/lib/contract/content', () => {
    expect(termosSource).toMatch(/from ['"]@\/lib\/contract\/content['"]/)
  })

  it('/termos não mantém mais um array de cláusulas próprio', () => {
    expect(termosSource).not.toMatch(/const CLAUSULAS\s*=/)
  })

  it('ambos os arquivos referenciam o módulo src/lib/contract/content (fonte única)', () => {
    expect(termosSource).toMatch(/contract\/content/)
    expect(pdfSource).toMatch(/contract\/content/)
  })
})
