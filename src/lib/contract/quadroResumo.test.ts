import { describe, it, expect } from 'vitest'
import { PRICING, getMonthlyPrice, getImplantacaoPrice } from '@/lib/pricing'
import {
  buildQuadroResumo,
  deriveLtcatSituacao,
  deriveFaixaHistorica,
  derivePlanoLabel,
  deriveTermosTemporais,
  QuadroResumoIndisponivelError,
  VersaoContratualDesconhecidaError,
  type QuadroResumoSource,
} from './quadroResumo'

function sourceFixture(overrides: Partial<QuadroResumoSource> = {}): QuadroResumoSource {
  return {
    razaoSocialContratante: 'EMPRESA SINTETICA DE TESTE LTDA',
    cnpjContratante: '00.000.000/0001-00',
    nomeResponsavel: 'Responsavel Sintetico',
    emailCadastrado: 'teste@example.com',
    enderecoEstabelecimento: 'Rua de Teste, 000 — Cidade Teste/RJ · CEP 00000-000',
    numFuncionarios: 4,
    planType: 'essencial',
    mensalidadeValor: 19900,
    implantacaoValor: 19900,
    implantacaoValorPadrao: 19900,
    implantacaoPromo: false,
    ltcatAddon: false,
    contractVersion: '2026-08-05',
    ...overrides,
  }
}

describe('deriveLtcatSituacao — matriz obrigatória', () => {
  it('Essencial sem adicional → não contratado', () => {
    expect(deriveLtcatSituacao('essencial', false)).toBe('nao_contratado')
  })

  it('Essencial com adicional contratado → adicional_contratado', () => {
    expect(deriveLtcatSituacao('essencial', true)).toBe('adicional_contratado')
  })

  it('Premium (com ou sem o flag de addon) → sempre incluído, nunca duplicado', () => {
    expect(deriveLtcatSituacao('premium', false)).toBe('incluido_no_premium')
    // Mesmo que ltcatAddon viesse true por engano em uma Company Premium
    // (não deveria acontecer — a UI só oferece o checkbox no Essencial), a
    // derivação nunca classifica como "adicional_contratado" nem soma dupla
    // cobrança: Premium sempre reporta "incluído", uma única vez.
    expect(deriveLtcatSituacao('premium', true)).toBe('incluido_no_premium')
  })
})

describe('buildQuadroResumo — faixas por número de funcionários (limites obrigatórios)', () => {
  it.each([
    [1, '1-5'], [5, '1-5'],
    [6, '6-10'], [10, '6-10'],
    [11, '11-20'], [20, '11-20'],
  ])('%i funcionários → faixa %s', (num, faixaEsperada) => {
    const resumo = buildQuadroResumo(sourceFixture({ numFuncionarios: num }))
    expect(resumo.faixa).toBe(faixaEsperada)
  })
})

describe('buildQuadroResumo — imutabilidade histórica (prova de alto valor, obrigatória)', () => {
  it('snapshot X + pricing corrente Y → resumo mostra X, nunca Y', () => {
    // "Pricing corrente Y": preços vigentes em pricing.ts para o mesmo
    // plano/faixa da fixture — usados só para provar que NÃO aparecem no
    // resultado, nunca para montar o resumo.
    const precoAtualMensalidade = getMonthlyPrice('essencial', '1-5')
    const precoAtualImplantacao = getImplantacaoPrice('essencial', false)

    // "Snapshot X": valores históricos deliberadamente DIFERENTES do
    // pricing atual — simula pricing.ts tendo mudado depois do aceite.
    const mensalidadeHistorica = precoAtualMensalidade + 5000
    const implantacaoHistorica = precoAtualImplantacao + 3000

    const resumo = buildQuadroResumo(sourceFixture({
      mensalidadeValor: mensalidadeHistorica,
      implantacaoValor: implantacaoHistorica,
      implantacaoValorPadrao: implantacaoHistorica,
    }))

    expect(resumo.mensalidadeCents).toBe(mensalidadeHistorica)
    expect(resumo.implantacaoAceitaCents).toBe(implantacaoHistorica)
    expect(resumo.mensalidadeCents).not.toBe(precoAtualMensalidade)
    expect(resumo.implantacaoAceitaCents).not.toBe(precoAtualImplantacao)
  })

  it('resultado não muda mesmo que PRICING seja alterado em runtime (nenhuma leitura tardia)', () => {
    // Clona e corrompe deliberadamente o objeto de preços vigente em
    // runtime — se buildQuadroResumo lesse PRICING em qualquer momento
    // (mesmo indiretamente), o resultado abaixo refletiria esse valor
    // corrompido. Restaurado no finally para não vazar para outros testes.
    const originalMonthly = PRICING.essencial.faixas['1-5'].monthly
    ;(PRICING.essencial.faixas['1-5'] as { monthly: number }).monthly = 999999
    try {
      const resumo = buildQuadroResumo(sourceFixture({ mensalidadeValor: 19900 }))
      expect(resumo.mensalidadeCents).toBe(19900)
      expect(resumo.mensalidadeCents).not.toBe(999999)
    } finally {
      ;(PRICING.essencial.faixas['1-5'] as { monthly: number }).monthly = originalMonthly
    }
  })

  it('quadroResumo.ts não importa absolutamente nada de pricing.ts (verificação estática)', async () => {
    const { readFileSync } = await import('fs')
    const { join } = await import('path')
    const source = readFileSync(join(process.cwd(), 'src/lib/contract/quadroResumo.ts'), 'utf-8')
    // Zero linhas de import apontando para pricing.ts — faixa e nome do
    // plano agora vêm de regra estrutural própria, versionada por
    // contractVersion, nunca da tabela de preços vigente.
    expect(source).not.toMatch(/from ['"]\.\.\/pricing['"]/)
  })

  it('resultado da faixa/plano não muda mesmo que PRICING seja alterado em runtime (nenhuma leitura tardia)', () => {
    const originalName = PRICING.essencial.name
    ;(PRICING.essencial as { name: string }).name = 'NOME CORROMPIDO EM RUNTIME'
    try {
      const resumo = buildQuadroResumo(sourceFixture({ planType: 'essencial', contractVersion: '2026-08-05' }))
      expect(resumo.planoLabel).toBe('Digital Essencial')
      expect(resumo.planoLabel).not.toBe('NOME CORROMPIDO EM RUNTIME')
    } finally {
      ;(PRICING.essencial as { name: string }).name = originalName
    }
  })
})

describe('deriveFaixaHistorica — regra estrutural versionada por contractVersion', () => {
  it.each([
    [1, '1-5'], [5, '1-5'],
    [6, '6-10'], [10, '6-10'],
    [11, '11-20'], [20, '11-20'],
  ])('versão 2026-08-05: %i funcionários → faixa %s', (num, faixaEsperada) => {
    expect(deriveFaixaHistorica(num, '2026-08-05')).toBe(faixaEsperada)
  })

  it('versão 2026-07-04 (histórica) preserva os mesmos limites aprovados', () => {
    expect(deriveFaixaHistorica(5, '2026-07-04')).toBe('1-5')
    expect(deriveFaixaHistorica(6, '2026-07-04')).toBe('6-10')
    expect(deriveFaixaHistorica(11, '2026-07-04')).toBe('11-20')
  })

  it('versão contratual desconhecida falha explicitamente, nunca usa a faixa vigente como fallback', () => {
    expect(() => deriveFaixaHistorica(4, '1999-01-01')).toThrow(VersaoContratualDesconhecidaError)
  })
})

describe('derivePlanoLabel — nome do plano por regra estrutural versionada', () => {
  it('Essencial produz o label contratual oficial', () => {
    expect(derivePlanoLabel('essencial', '2026-08-05')).toBe('Digital Essencial')
  })

  it('Premium produz o label contratual oficial', () => {
    expect(derivePlanoLabel('premium', '2026-08-05')).toBe('Digital Premium')
  })

  it('versão histórica 2026-07-04 também resolve os labels', () => {
    expect(derivePlanoLabel('essencial', '2026-07-04')).toBe('Digital Essencial')
    expect(derivePlanoLabel('premium', '2026-07-04')).toBe('Digital Premium')
  })

  it('versão contratual desconhecida falha explicitamente', () => {
    expect(() => derivePlanoLabel('essencial', '1999-01-01')).toThrow(VersaoContratualDesconhecidaError)
  })
})

describe('deriveTermosTemporais — vigência/renovação/aviso por versão contratual', () => {
  describe('2026-08-05 (vigente) — exato, para impedir mudança acidental nesta tranche', () => {
    it('produz exatamente os termos vigentes já publicados', () => {
      const termos = deriveTermosTemporais('2026-08-05')
      expect(termos.vigenciaInicial).toBe('12 (doze) meses, a partir da ativação')
      expect(termos.renovacao).toBe('Automática, por prazo indeterminado, após o período inicial')
      expect(termos.avisoPrevio).toBe('Durante a vigência inicial: qualquer solicitação produz efeito ao final do 12º mês (Cláusula 10ª). Após a renovação: 90 dias.')
    })
  })

  describe('2026-07-04 (histórica) — regra própria da Cláusula 5ª, nunca a regra vigente', () => {
    it('vigência reflete o pagamento da implantação, nunca "a partir da ativação"', () => {
      const termos = deriveTermosTemporais('2026-07-04')
      expect(termos.vigenciaInicial).toMatch(/confirmação do pagamento da implantação/)
      expect(termos.vigenciaInicial).not.toMatch(/a partir da ativação/)
    })

    it('renovação é automática por períodos iguais, nunca "prazo indeterminado"', () => {
      const termos = deriveTermosTemporais('2026-07-04')
      expect(termos.renovacao).toMatch(/períodos iguais/)
      expect(termos.renovacao).not.toMatch(/indeterminado/)
    })

    it('aviso/rescisão preserva as três situações históricas sem perda material', () => {
      const termos = deriveTermosTemporais('2026-07-04')
      // 1º-6º mês: obrigação de completar as mensalidades mínimas — não é
      // rotulada como "aviso prévio" para não distorcer seu significado.
      expect(termos.avisoPrevio).toMatch(/1º e o 6º mês/)
      expect(termos.avisoPrevio).toMatch(/completar as 6 \(seis\) mensalidades mínimas/)
      // 7º-12º mês: 60 dias
      expect(termos.avisoPrevio).toMatch(/7º e o 12º mês/)
      expect(termos.avisoPrevio).toMatch(/aviso prévio de 60 \(sessenta\) dias/)
      // Após a primeira renovação: 30 dias
      expect(termos.avisoPrevio).toMatch(/primeira renovação/)
      expect(termos.avisoPrevio).toMatch(/aviso prévio de 30 \(trinta\) dias/)
    })

    it('não contém nenhum termo da regra vigente de 2026-08-05', () => {
      const termos = deriveTermosTemporais('2026-07-04')
      const combinado = `${termos.vigenciaInicial} ${termos.renovacao} ${termos.avisoPrevio}`
      expect(combinado).not.toMatch(/90 \(noventa\) dias/)
      expect(combinado).not.toMatch(/90 dias/)
      expect(combinado).not.toMatch(/Cláusula 10ª/)
      expect(combinado).not.toMatch(/encerramento produz efeitos ao final do 12º mês/)
    })
  })

  it('versão contratual desconhecida falha explicitamente, nunca usa os termos vigentes como fallback', () => {
    expect(() => deriveTermosTemporais('1999-01-01')).toThrow(VersaoContratualDesconhecidaError)
  })

  it('isolamento entre versões: chamadas intercaladas não vazam termos de uma versão para outra', () => {
    const historica1 = deriveTermosTemporais('2026-07-04')
    const vigente = deriveTermosTemporais('2026-08-05')
    const historica2 = deriveTermosTemporais('2026-07-04')

    expect(historica1).toEqual(historica2)
    expect(historica1.vigenciaInicial).not.toBe(vigente.vigenciaInicial)
    expect(historica1.renovacao).not.toBe(vigente.renovacao)
    expect(historica1.avisoPrevio).not.toBe(vigente.avisoPrevio)
  })
})

describe('buildQuadroResumo — termos temporais versionados por contractVersion', () => {
  it('2026-07-04: resumo recebe os termos históricos da Cláusula 5ª, nunca os termos vigentes', () => {
    const resumo = buildQuadroResumo(sourceFixture({ contractVersion: '2026-07-04' }))
    expect(resumo.vigenciaInicial).toMatch(/confirmação do pagamento da implantação/)
    expect(resumo.renovacao).toMatch(/períodos iguais/)
    expect(resumo.avisoPrevio).toMatch(/1º e o 6º mês/)
    expect(resumo.avisoPrevio).not.toMatch(/90 dias/)
    expect(resumo.avisoPrevio).not.toMatch(/Cláusula 10ª/)
  })

  it('2026-08-05: resumo continua recebendo exatamente os termos vigentes já publicados', () => {
    const resumo = buildQuadroResumo(sourceFixture({ contractVersion: '2026-08-05' }))
    expect(resumo.vigenciaInicial).toBe('12 (doze) meses, a partir da ativação')
    expect(resumo.renovacao).toBe('Automática, por prazo indeterminado, após o período inicial')
    expect(resumo.avisoPrevio).toBe('Durante a vigência inicial: qualquer solicitação produz efeito ao final do 12º mês (Cláusula 10ª). Após a renovação: 90 dias.')
  })

  it('a ordem das chamadas não contamina uma versão com a outra (2026-07-04 → 2026-08-05 → 2026-07-04)', () => {
    const primeiraHistorica = buildQuadroResumo(sourceFixture({ contractVersion: '2026-07-04' }))
    buildQuadroResumo(sourceFixture({ contractVersion: '2026-08-05' }))
    const segundaHistorica = buildQuadroResumo(sourceFixture({ contractVersion: '2026-07-04' }))

    expect(segundaHistorica.vigenciaInicial).toBe(primeiraHistorica.vigenciaInicial)
    expect(segundaHistorica.renovacao).toBe(primeiraHistorica.renovacao)
    expect(segundaHistorica.avisoPrevio).toBe(primeiraHistorica.avisoPrevio)
  })

  it('falha explicitamente para versão contratual desconhecida, mesmo com faixa/plano válidos', () => {
    expect(() => buildQuadroResumo(sourceFixture({ contractVersion: '1999-01-01' })))
      .toThrow(VersaoContratualDesconhecidaError)
  })
})

describe('buildQuadroResumo — versão contratual desconhecida (faixa/plano)', () => {
  it('falha explicitamente ao montar o resumo com uma contractVersion sem regra estrutural conhecida', () => {
    expect(() => buildQuadroResumo(sourceFixture({ contractVersion: '1999-01-01' })))
      .toThrow(VersaoContratualDesconhecidaError)
  })
})

describe('buildQuadroResumo — implantação normal vs. efetivamente contratada', () => {
  it('promoção: normal e efetiva divergem, condição promocional é Sim', () => {
    const resumo = buildQuadroResumo(sourceFixture({
      implantacaoValorPadrao: 19900,
      implantacaoValor: 14900,
      implantacaoPromo: true,
    }))
    expect(resumo.implantacaoNormalCents).toBe(19900)
    expect(resumo.implantacaoAceitaCents).toBe(14900)
    expect(resumo.condicaoPromocional).toBe(true)
  })

  it('sem promoção: normal e efetiva coincidem, condição promocional é Não', () => {
    const resumo = buildQuadroResumo(sourceFixture({
      implantacaoValorPadrao: 19900,
      implantacaoValor: 19900,
      implantacaoPromo: false,
    }))
    expect(resumo.implantacaoNormalCents).toBe(resumo.implantacaoAceitaCents)
    expect(resumo.condicaoPromocional).toBe(false)
  })
})

describe('buildQuadroResumo — LTCAT sem dupla contagem', () => {
  it('Essencial + LTCAT: valor do adicional já está embutido em implantacaoAceitaCents, situação = adicional_contratado', () => {
    const resumo = buildQuadroResumo(sourceFixture({
      planType: 'essencial',
      ltcatAddon: true,
      implantacaoValorPadrao: 19900,
      implantacaoValor: 19900 + 45000, // base + LTCAT, cobrados juntos na mesma cobrança
    }))
    expect(resumo.ltcat).toBe('adicional_contratado')
    expect(resumo.implantacaoAceitaCents).toBe(64900)
  })

  it('Premium: LTCAT incluído, nunca soma valor extra de LTCAT à implantação', () => {
    const resumo = buildQuadroResumo(sourceFixture({
      planType: 'premium',
      ltcatAddon: false,
      implantacaoValorPadrao: 29900,
      implantacaoValor: 29900,
    }))
    expect(resumo.ltcat).toBe('incluido_no_premium')
    expect(resumo.implantacaoAceitaCents).toBe(29900)
  })
})

describe('buildQuadroResumo — legado sem snapshot de implantação normal', () => {
  it('implantacaoValorPadrao ausente (Company anterior a este campo) falha explicitamente, nunca inventa o valor', () => {
    expect(() => buildQuadroResumo(sourceFixture({ implantacaoValorPadrao: null })))
      .toThrow(QuadroResumoIndisponivelError)
  })
})

describe('buildQuadroResumo — demais campos do quadro-resumo', () => {
  it('inclui identificação fixa da CONTRATADA, nunca dado da CONTRATANTE', () => {
    const resumo = buildQuadroResumo(sourceFixture())
    expect(resumo.razaoSocialContratada).toBe('SUBLIME SEGURANCA E SAUDE OCUPACIONAL LTDA')
    expect(resumo.cnpjContratada).toBe('65.051.167/0001-27')
    expect(resumo.razaoSocialContratante).toBe('EMPRESA SINTETICA DE TESTE LTDA')
  })

  it('vigência/renovação/aviso prévio são os termos fixos aprovados (docs/DECISIONS.md)', () => {
    const resumo = buildQuadroResumo(sourceFixture())
    expect(resumo.vigenciaInicial).toMatch(/12/)
    expect(resumo.renovacao).toMatch(/indeterminado/)
    expect(resumo.avisoPrevio).toMatch(/90/)
  })

  it('versão contratual do resumo é exatamente a versão do snapshot recebido', () => {
    const resumo = buildQuadroResumo(sourceFixture({ contractVersion: '2026-07-04' }))
    expect(resumo.versaoContratual).toBe('2026-07-04')
  })

  it('planoLabel reflete o nome contratual oficial do plano, coerente com resumo.plano', () => {
    const essencial = buildQuadroResumo(sourceFixture({ planType: 'essencial' }))
    expect(essencial.plano).toBe('essencial')
    expect(essencial.planoLabel).toBe('Digital Essencial')

    const premium = buildQuadroResumo(sourceFixture({ planType: 'premium' }))
    expect(premium.plano).toBe('premium')
    expect(premium.planoLabel).toBe('Digital Premium')
  })

  it('demaisAdicionais é sempre um array (hoje vazio, sem adicional além do LTCAT no MVP) — preparado para lista futura', () => {
    const resumo = buildQuadroResumo(sourceFixture())
    expect(Array.isArray(resumo.demaisAdicionais)).toBe(true)
    expect(resumo.demaisAdicionais).toHaveLength(0)
  })
})
