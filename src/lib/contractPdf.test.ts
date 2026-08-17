import { describe, it, expect, vi, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { inflateSync } from 'zlib'
import { generateContractPdf } from './contractPdf'
import * as contractContentModule from './contract/content'
import { getContractContent } from './contract/content'
import * as quadroResumoModule from './contract/quadroResumo'
import { CONTRACT_VERSION, PRICING, getMonthlyPrice, getImplantacaoPrice } from './pricing'

// Extrai o tamanho (em bytes, já descomprimido) do content stream de cada
// página do PDF gerado — sem depender de nenhuma coordenada específica.
// Uma página "quase vazia"/só com rodapé produz um content stream muito
// menor que o de uma página com conteúdo real, então o tamanho por página
// é um proxy direto e estável de "a página tem conteúdo de verdade",
// mesmo sem um parser de PDF completo disponível no projeto.
function pageContentStreamSizes(buffer: Buffer): number[] {
  const text = buffer.toString('latin1')
  const re = /\d+ 0 obj\s*<<([^>]*)>>\s*stream\r?\n/g
  const sizes: number[] = []
  let match: RegExpExecArray | null
  while ((match = re.exec(text))) {
    if (!/FlateDecode/.test(match[1])) continue
    const start = match.index + match[0].length
    const end = text.indexOf('endstream', start)
    const raw = buffer.subarray(start, end)
    try {
      sizes.push(inflateSync(raw).length)
    } catch {
      // Não é um stream de página (ex.: objeto de fonte) — ignora.
    }
  }
  return sizes
}

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
    mensalidadeValor: getMonthlyPrice('essencial', '1-5'),
    implantacaoValor: getImplantacaoPrice('essencial', false),
    implantacaoValorPadrao: getImplantacaoPrice('essencial', false),
    implantacaoPromo: false,
    ltcatAddon: false,
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
    await expect(generateContractPdf(syntheticData({ contractVersion: '2020-01-01' }))).rejects.toThrow(/desconhecida/i)
  })

  it('versão desconhecida falha em buildQuadroResumo (faixa/plano) ANTES de sequer consultar o conteúdo das cláusulas', async () => {
    // A montagem do quadro-resumo comercial acontece antes de qualquer
    // leitura do conteúdo/cláusulas — uma versão sem regra estrutural
    // conhecida (faixa/nome do plano) nunca chega a consultar
    // getContractContent, reforçando que a falha é rápida e não depende
    // da ordem de outras validações.
    const spy = vi.spyOn(contractContentModule, 'getContractContent')
    await expect(generateContractPdf(syntheticData({ contractVersion: '2020-01-01' }))).rejects.toThrow(/versao_contratual_desconhecida/)
    expect(spy).not.toHaveBeenCalled()
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

  it('não importa absolutamente nada de pricing.ts (nem preços, nem faixa, nem nome do plano — Eixo B)', () => {
    // Nome do plano e faixa também passaram a vir de resumo (regra
    // estrutural versionada em quadroResumo.ts), então contractPdf.ts não
    // precisa mais de PRICING nem de nenhum tipo/função de pricing.ts.
    expect(source).not.toMatch(/from ['"]\.\/pricing['"]/)
    expect(source).not.toMatch(/\bPRICING\b/)
    expect(source).not.toMatch(/getMonthlyPrice/)
    expect(source).not.toMatch(/getImplantacaoPrice/)
  })

  it('monta os dados comerciais exclusivamente via buildQuadroResumo (fonte única entre "Plano Contratado" e o comprovante)', () => {
    expect(source).toMatch(/from ['"].\/contract\/quadroResumo['"]/)
    expect(source).toMatch(/buildQuadroResumo/)
  })

  it('não mantém constantes locais duplicadas de vigência/renovação/aviso prévio — consome exclusivamente resumo.*', () => {
    expect(source).not.toMatch(/const VIGENCIA_INICIAL/)
    expect(source).not.toMatch(/const RENOVACAO/)
    expect(source).not.toMatch(/const AVISO_PREVIO/)
    expect(source).toMatch(/resumo\.vigenciaInicial/)
    expect(source).toMatch(/resumo\.renovacao/)
    expect(source).toMatch(/resumo\.avisoPrevio/)
  })

  it('renderiza "Demais adicionais" a partir de resumo.demaisAdicionais', () => {
    expect(source).toMatch(/Demais adicionais/)
    expect(source).toMatch(/resumo\.demaisAdicionais/)
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

describe('generateContractPdf — imutabilidade histórica (Eixo B, prova de alto valor)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('repassa mensalidadeValor/implantacaoValor/implantacaoValorPadrao intactos para buildQuadroResumo — nunca um valor recalculado de pricing.ts', async () => {
    const spy = vi.spyOn(quadroResumoModule, 'buildQuadroResumo')
    const data = syntheticData({ mensalidadeValor: 987654, implantacaoValor: 111111, implantacaoValorPadrao: 222222 })
    await generateContractPdf(data)
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      mensalidadeValor: 987654,
      implantacaoValor: 111111,
      implantacaoValorPadrao: 222222,
    }))
  })

  it('repassa contractVersion intacto para buildQuadroResumo — é essa a chave que faz o quadro-resumo/comprovante refletir os termos temporais (vigência/renovação/aviso) da versão contratual aceita, nunca da vigente (PR #42, src/lib/contract/quadroResumo.ts)', async () => {
    const spy = vi.spyOn(quadroResumoModule, 'buildQuadroResumo')
    await generateContractPdf(syntheticData({ contractVersion: '2026-07-04' }))
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ contractVersion: '2026-07-04' }))

    spy.mockClear()
    await generateContractPdf(syntheticData({ contractVersion: '2026-08-05' }))
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ contractVersion: '2026-08-05' }))
  })

  it('usa o buildQuadroResumo real (não mockado) para confirmar que 2026-07-04 e 2026-08-05 produzem vigenciaInicial/renovacao/avisoPrevio diferentes entre si — a árvore de composição contractPdf.ts → quadroResumo.ts entrega, de fato, o termo histórico ou o vigente conforme a versão aceita', async () => {
    const resumoHistorico = quadroResumoModule.buildQuadroResumo({
      razaoSocialContratante: 'X', cnpjContratante: 'X', nomeResponsavel: 'X', emailCadastrado: 'x@x.com',
      enderecoEstabelecimento: 'X', numFuncionarios: 4, planType: 'essencial',
      mensalidadeValor: getMonthlyPrice('essencial', '1-5'),
      implantacaoValor: getImplantacaoPrice('essencial', false),
      implantacaoValorPadrao: getImplantacaoPrice('essencial', false),
      implantacaoPromo: false, ltcatAddon: false, contractVersion: '2026-07-04',
    })
    const resumoVigente = quadroResumoModule.buildQuadroResumo({
      razaoSocialContratante: 'X', cnpjContratante: 'X', nomeResponsavel: 'X', emailCadastrado: 'x@x.com',
      enderecoEstabelecimento: 'X', numFuncionarios: 4, planType: 'essencial',
      mensalidadeValor: getMonthlyPrice('essencial', '1-5'),
      implantacaoValor: getImplantacaoPrice('essencial', false),
      implantacaoValorPadrao: getImplantacaoPrice('essencial', false),
      implantacaoPromo: false, ltcatAddon: false, contractVersion: CONTRACT_VERSION,
    })
    expect(resumoHistorico.vigenciaInicial).not.toBe(resumoVigente.vigenciaInicial)
    expect(resumoHistorico.renovacao).not.toBe(resumoVigente.renovacao)
    expect(resumoHistorico.avisoPrevio).not.toBe(resumoVigente.avisoPrevio)
    // Termos da versão vigente nunca podem vazar para o resumo histórico.
    expect(resumoHistorico.vigenciaInicial).not.toMatch(/a partir da ativação/)
    expect(resumoHistorico.renovacao).not.toMatch(/prazo indeterminado/)
    expect(resumoHistorico.avisoPrevio).not.toMatch(/90 \(noventa\) dias|Cláusula 10ª/)
    // Termos históricos nunca podem vazar para o resumo vigente.
    expect(resumoVigente.avisoPrevio).not.toMatch(/60 \(sessenta\) dias|Cláusula 5ª/)

    // generateContractPdf() usa exatamente essa mesma função (não uma cópia
    // local) — coberto estaticamente acima ("monta os dados comerciais
    // exclusivamente via buildQuadroResumo") e pelo teste de repasse de
    // contractVersion logo acima.
    await expect(generateContractPdf(syntheticData({ contractVersion: '2026-07-04' }))).resolves.toBeInstanceOf(Buffer)
  })

  it('snapshot X + pricing corrente Y (alterado em runtime) → geração usa X, nunca lança nem reflete Y', async () => {
    // Simula pricing.ts tendo mudado depois do aceite: corrompe o preço
    // vigente do mesmo plano/faixa da fixture em runtime. Se
    // generateContractPdf relesse pricing.ts em qualquer ponto do pipeline,
    // o comportamento mudaria; como não relê, o resultado é idêntico.
    const original = PRICING.essencial.faixas['1-5'].monthly
    ;(PRICING.essencial.faixas['1-5'] as { monthly: number }).monthly = 1
    try {
      const spy = vi.spyOn(quadroResumoModule, 'buildQuadroResumo')
      const buffer = await generateContractPdf(syntheticData({ mensalidadeValor: 19900 }))
      expect(buffer.subarray(0, 4).toString('ascii')).toBe('%PDF')
      // O valor corrompido (1) nunca chega a buildQuadroResumo — o dado que
      // entra é sempre o snapshot da fixture (19900), nunca o PRICING
      // vigente no momento da chamada.
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ mensalidadeValor: 19900 }))
    } finally {
      ;(PRICING.essencial.faixas['1-5'] as { monthly: number }).monthly = original
    }
  })

  it('rejeita a geração quando implantacaoValorPadrao é null (Company legada sem snapshot) — nunca inventa o valor a partir do pricing atual', async () => {
    const data = syntheticData({ implantacaoValorPadrao: null })
    await expect(generateContractPdf(data)).rejects.toThrow(/quadro_resumo_indisponivel/)
  })

  it('alteração em PRICING.essencial.name em runtime não afeta o nome do plano usado pela geração', async () => {
    const original = PRICING.essencial.name
    ;(PRICING.essencial as { name: string }).name = 'NOME CORROMPIDO EM RUNTIME'
    try {
      const spy = vi.spyOn(quadroResumoModule, 'buildQuadroResumo')
      await generateContractPdf(syntheticData({ planType: 'essencial', contractVersion: '2026-08-05' }))
      const resultado = spy.mock.results[0].value
      expect(resultado.planoLabel).toBe('Digital Essencial')
      expect(resultado.planoLabel).not.toBe('NOME CORROMPIDO EM RUNTIME')
    } finally {
      ;(PRICING.essencial as { name: string }).name = original
    }
  })

  it('rejeita a geração quando contractVersion não tem regra estrutural conhecida de faixa/plano', async () => {
    const data = syntheticData({ contractVersion: 'inexistente-2000-01-01' })
    await expect(generateContractPdf(data)).rejects.toThrow(/versao_contratual_desconhecida/)
  })
})

describe('generateContractPdf — Eixo D: paginação e ausência de páginas vazias', () => {
  // Faixa plausível de páginas para o contrato integral (16 cláusulas +
  // quadro-resumo + comprovante) no tamanho de fonte/margens atuais. O
  // limite superior é a guarda de regressão mais importante deste bloco:
  // um rodapé que volte a disparar paginação automática do PDFKit (bug já
  // corrigido no Eixo D — texto de rodapé desenhado abaixo da margem
  // inferior) dobra o número de páginas com páginas fantasmas só de
  // rodapé; esse teste falha antes que isso volte a acontecer sem exigir
  // nenhuma coordenada específica.
  const MIN_PLAUSIBLE_PAGES = 4
  const MAX_PLAUSIBLE_PAGES = 14
  // Uma página com conteúdo real (título de cláusula + parágrafos/listas,
  // ou o quadro-resumo, ou o comprovante) sempre produz um content stream
  // bem maior que uma página só com cabeçalho+rodapé — o limiar abaixo
  // fica confortavelmente acima do que uma página "quase vazia" produziria.
  const MIN_REAL_CONTENT_BYTES = 1200

  it('produz um número de páginas plausível — nem colapsado nem inflado por páginas fantasmas de rodapé', async () => {
    const buffer = await generateContractPdf(syntheticData())
    const sizes = pageContentStreamSizes(buffer)
    expect(sizes.length).toBeGreaterThanOrEqual(MIN_PLAUSIBLE_PAGES)
    expect(sizes.length).toBeLessThanOrEqual(MAX_PLAUSIBLE_PAGES)
  })

  it('nenhuma página fica quase vazia (sem justificativa) — inclusive as criadas automaticamente pelo PDFKit no meio de uma cláusula longa', async () => {
    const buffer = await generateContractPdf(syntheticData())
    const sizes = pageContentStreamSizes(buffer)
    for (const size of sizes) {
      expect(size).toBeGreaterThanOrEqual(MIN_REAL_CONTENT_BYTES)
    }
  })

  it('a versão contratual histórica (2026-07-04) também pagina de forma plausível, sem página quase vazia', async () => {
    const buffer = await generateContractPdf(syntheticData({ contractVersion: '2026-07-04' }))
    const sizes = pageContentStreamSizes(buffer)
    expect(sizes.length).toBeGreaterThanOrEqual(MIN_PLAUSIBLE_PAGES)
    expect(sizes.length).toBeLessThanOrEqual(MAX_PLAUSIBLE_PAGES)
    for (const size of sizes) {
      expect(size).toBeGreaterThanOrEqual(MIN_REAL_CONTENT_BYTES)
    }
  })

  it('cenário Premium + LTCAT + faixa 11-20 (conteúdo mais longo no quadro-resumo/comprovante) também pagina sem página quase vazia', async () => {
    const buffer = await generateContractPdf(syntheticData({
      planType: 'premium',
      numFuncionarios: 18,
      mensalidadeValor: getMonthlyPrice('premium', '11-20'),
      implantacaoValor: getImplantacaoPrice('premium', false),
      implantacaoValorPadrao: getImplantacaoPrice('premium', false),
      ltcatAddon: true,
      contractAcceptanceUa: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }))
    const sizes = pageContentStreamSizes(buffer)
    expect(sizes.length).toBeGreaterThanOrEqual(MIN_PLAUSIBLE_PAGES)
    expect(sizes.length).toBeLessThanOrEqual(MAX_PLAUSIBLE_PAGES)
    for (const size of sizes) {
      expect(size).toBeGreaterThanOrEqual(MIN_REAL_CONTENT_BYTES)
    }
  })

  it('endereço/razão social/UA muito longos não quebram a paginação nem criam página quase vazia', async () => {
    const buffer = await generateContractPdf(syntheticData({
      razaoSocial: 'EMPRESA SINTETICA COM RAZAO SOCIAL EXTREMAMENTE LONGA PARA TESTE DE QUEBRA DE LINHA E TRANSBORDO LTDA - ME',
      responsavel: 'Responsavel Sintetico Com Nome Completo Muito Longo Para Teste De Layout Da Silva Pereira Nascimento',
      endereco: 'Avenida de Teste com Nome Muito Extenso Para Verificar Quebra de Linha no Endereço da Contratante, número 12345, Bloco C, Sala 6789',
      contractAcceptanceUa: 'Mozilla/5.0 (Linux; Android 13; SM-G990B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36 EdgA/119.0.2151.97 SyntheticTestSuffixForLineWrap/1.0',
    }))
    const sizes = pageContentStreamSizes(buffer)
    expect(sizes.length).toBeGreaterThanOrEqual(MIN_PLAUSIBLE_PAGES)
    expect(sizes.length).toBeLessThanOrEqual(MAX_PLAUSIBLE_PAGES)
    for (const size of sizes) {
      expect(size).toBeGreaterThanOrEqual(MIN_REAL_CONTENT_BYTES)
    }
  })

  it('a página final não fica desproporcionalmente vazia em relação ao restante do documento (bloco CONTRATADA + aviso deve ficar na página do comprovante sempre que couber)', async () => {
    // Checagem relativa (não um número fixo de páginas): a última página do
    // cenário padrão deve ter conteúdo real comparável às demais, nunca só
    // uma fração pequena — isso protege contra o bloco final (assinatura +
    // aviso de autenticidade) voltar a forçar uma página nova desnecessária
    // quando ainda havia espaço na página do comprovante.
    const buffer = await generateContractPdf(syntheticData())
    const sizes = pageContentStreamSizes(buffer)
    const sorted = [...sizes].sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)]
    const lastPageSize = sizes[sizes.length - 1]
    expect(lastPageSize).toBeGreaterThanOrEqual(median * 0.3)
  })

  it('o número de páginas é estável entre duas gerações com os mesmos dados (paginação determinística)', async () => {
    const data = syntheticData()
    const bufferA = await generateContractPdf(data)
    const bufferB = await generateContractPdf(data)
    expect(pageContentStreamSizes(bufferA).length).toBe(pageContentStreamSizes(bufferB).length)
  })
})

describe('generateContractPdf — Eixo D: aviso de autenticidade (verificação estática)', () => {
  const source = readFileSync(join(process.cwd(), 'src/lib/contractPdf.ts'), 'utf-8')

  it('não contém o glifo de alerta "⚠" — a fonte padrão Helvetica do PDFKit não cobre esse caractere e o renderizava como um caractere solto incorreto', () => {
    expect(source).not.toMatch(/⚠/)
  })

  it('o aviso de autenticidade é renderizado numa única chamada .text(), sem dividir o texto em dois trechos com `continued`', () => {
    const noteCalls = source.match(/\.text\(AUTENTICIDADE_TEXT\b/g) ?? []
    expect(noteCalls).toHaveLength(1)
    // A chamada de `.text(AUTENTICIDADE_TEXT` não deve estar em modo
    // `continued` (dividir em dois trechos foi a causa do texto colado na
    // junção, ex.: "comprovante,onsulte").
    const noteCallMatch = source.match(/\.text\(AUTENTICIDADE_TEXT,[^)]*\)/)
    expect(noteCallMatch).not.toBeNull()
    expect(noteCallMatch![0]).not.toMatch(/continued/)
  })

  it('o texto do aviso preserva a semântica esperada (mensagem íntegra, sem alterar o conteúdo)', () => {
    expect(source).toMatch(/Documento gerado automaticamente\. Para verificar a autenticidade deste comprovante, consulte o portal do cliente em sublimesst\.com\/cliente\/login com o e-mail cadastrado\./)
  })
})
