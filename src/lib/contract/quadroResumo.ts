// ═══════════════════════════════════════════════════════════
// SUBLIME SST — Quadro-resumo da contratação (Eixo B)
// Monta o QuadroResumo (docs/CONTRACT_MVP_V1.md, Seção 5) exclusivamente a
// partir de campos já congelados na Company no momento do cadastro. Este
// módulo NUNCA importa nada de pricing.ts — nem preços, nem faixas, nem
// nomes de plano. Ler qualquer coisa do pricing vigente aqui reintroduziria
// exatamente o risco que este módulo existe para eliminar (um contrato
// histórico passando a refletir uma condição atual em vez da aceita).
//
// Faixa e nome do plano são resolvidos por regra ESTRUTURAL CONTRATUAL,
// versionada por `contractVersion` — nunca pela tabela de preços vigente.
// Uma nova versão contratual que precise de faixas/nomes diferentes deve
// adicionar uma nova entrada nos mapas abaixo; entradas existentes nunca são
// editadas (mesma disciplina de imutabilidade de src/lib/contract/content.ts).
// Versão contratual desconhecida falha explicitamente — nunca cai no
// pricing.ts atual como fallback (docs/DECISIONS.md, "Eixo B — faixa
// histórica e plano").
// ═══════════════════════════════════════════════════════════

import type { ContractFaixaKey, ContractLtcatSituacao, ContractPlanKey, QuadroResumo } from './types'

const CONTRATADA_RAZAO_SOCIAL = 'SUBLIME SEGURANCA E SAUDE OCUPACIONAL LTDA'
const CONTRATADA_CNPJ = '65.051.167/0001-27'

// Termos temporais (vigência/renovação/aviso) por versão contratual — mesmo
// raciocínio de FAIXAS_POR_VERSAO/PLANO_LABEL_POR_VERSAO: cada versão tem sua
// própria entrada imutável, nunca reaproveitada por outra. A entrada de
// 2026-07-04 resume a Cláusula 5ª ("Do Prazo e da Rescisão"); a de
// 2026-08-05 resume a Cláusula 10ª ("Vigência, Renovação e Cancelamento") —
// ambas em src/lib/contract/content.ts. O compromisso de completar as 6
// mensalidades mínimas do 1º ao 6º mês (2026-07-04) é uma obrigação de
// pagamento, não um prazo de aviso prévio, e por isso não é rotulado como tal.
const TERMOS_TEMPORAIS_POR_VERSAO: Readonly<Record<string, Readonly<{ vigenciaInicial: string; renovacao: string; avisoPrevio: string }>>> = Object.freeze({
  '2026-07-04': Object.freeze({
    vigenciaInicial: '12 meses, a partir da confirmação do pagamento da implantação',
    renovacao: 'Automática, por períodos iguais, salvo aviso de rescisão com antecedência mínima de 30 dias',
    avisoPrevio: 'Rescisão entre o 1º e o 6º mês: pagamento das mensalidades remanescentes até completar as 6 (seis) mensalidades mínimas (Cláusula 5ª). Entre o 7º e o 12º mês: aviso prévio de 60 (sessenta) dias. Após a primeira renovação: aviso prévio de 30 (trinta) dias.',
  }),
  '2026-08-05': Object.freeze({
    vigenciaInicial: '12 (doze) meses, a partir da ativação',
    renovacao: 'Automática, por prazo indeterminado, após o período inicial',
    avisoPrevio: 'Durante a vigência inicial: qualquer solicitação produz efeito ao final do 12º mês (Cláusula 10ª). Após a renovação: 90 dias.',
  }),
})

// Falha explícita quando `contractVersion` não tem entrada conhecida nesta
// tabela — nunca cai nos termos de 2026-08-05 como substituto silencioso.
export function deriveTermosTemporais(contractVersion: string): Readonly<{ vigenciaInicial: string; renovacao: string; avisoPrevio: string }> {
  const termos = TERMOS_TEMPORAIS_POR_VERSAO[contractVersion]
  if (!termos) throw new VersaoContratualDesconhecidaError(contractVersion)
  return termos
}

// Falha explícita quando `contractVersion` não é uma das versões
// contratuais oficialmente suportadas pelas regras estruturais deste
// módulo — nunca usa a versão vigente do código como substituto silencioso.
export class VersaoContratualDesconhecidaError extends Error {
  constructor(version: string) {
    super(`versao_contratual_desconhecida_para_quadro_resumo: ${version}`)
    this.name = 'VersaoContratualDesconhecidaError'
  }
}

// Limites de faixa por versão contratual — as duas versões oficialmente
// suportadas hoje (ver src/lib/contract/content.ts) usam os mesmos limites
// aprovados (1-5 / 6-10 / 11-20), mas cada uma tem sua própria entrada:
// uma futura versão que precise de faixas diferentes soma uma nova entrada
// aqui, nunca reaproveita/edita as existentes.
const FAIXAS_POR_VERSAO: Readonly<Record<string, Readonly<{ limite1a5: number; limite6a10: number }>>> = Object.freeze({
  '2026-07-04': Object.freeze({ limite1a5: 5, limite6a10: 10 }),
  '2026-08-05': Object.freeze({ limite1a5: 5, limite6a10: 10 }),
})

// Nome de exibição do plano por versão contratual — mesmo raciocínio da
// faixa: nomes já aprovados e usados no texto das cláusulas de cada versão
// (ver src/lib/contract/content.ts), nunca lidos de PRICING[...].name.
const PLANO_LABEL_POR_VERSAO: Readonly<Record<string, Readonly<Record<ContractPlanKey, string>>>> = Object.freeze({
  '2026-07-04': Object.freeze({ essencial: 'Digital Essencial', premium: 'Digital Premium' }),
  '2026-08-05': Object.freeze({ essencial: 'Digital Essencial', premium: 'Digital Premium' }),
})

// Faixa histórica — exclusivamente de numFuncionarios (já congelado e
// imutável após o cadastro, ver docs/DECISIONS.md) e da regra estrutural da
// versão contratual aceita. Nunca lê pricing.ts.
export function deriveFaixaHistorica(numFuncionarios: number, contractVersion: string): ContractFaixaKey {
  const regra = FAIXAS_POR_VERSAO[contractVersion]
  if (!regra) throw new VersaoContratualDesconhecidaError(contractVersion)
  if (numFuncionarios <= regra.limite1a5) return '1-5'
  if (numFuncionarios <= regra.limite6a10) return '6-10'
  return '11-20'
}

// Nome de exibição do plano — resolvido pela versão contratual aceita,
// nunca por PRICING[planType]?.name (que pode mudar após o aceite). planType
// fora do mapa (nunca deveria acontecer — só 'essencial'/'premium' são
// aceitos no cadastro) cai no próprio valor bruto, mesma tolerância que já
// existia antes desta correção.
export function derivePlanoLabel(planType: string, contractVersion: string): string {
  const mapa = PLANO_LABEL_POR_VERSAO[contractVersion]
  if (!mapa) throw new VersaoContratualDesconhecidaError(contractVersion)
  return mapa[planType as ContractPlanKey] ?? planType
}

// Situação do LTCAT é uma classificação estrutural, derivada só de dois
// campos já congelados na Company (planType, ltcatAddon) — nunca de
// PRICING.premium.ltcatIncluido, para não depender do pricing.ts atual.
export function deriveLtcatSituacao(planType: string, ltcatAddon: boolean): ContractLtcatSituacao {
  if (planType === 'premium') return 'incluido_no_premium'
  if (ltcatAddon) return 'adicional_contratado'
  return 'nao_contratado'
}

// Entrada mínima exigida — cada campo já é um snapshot congelado existente
// na Company (ou um dado de identificação estático), nunca um valor lido de
// pricing.ts no momento da chamada.
export interface QuadroResumoSource {
  razaoSocialContratante: string
  cnpjContratante: string
  nomeResponsavel: string
  emailCadastrado: string
  enderecoEstabelecimento: string
  numFuncionarios: number
  planType: string
  mensalidadeValor: number
  implantacaoValor: number
  implantacaoValorPadrao: number | null
  implantacaoPromo: boolean
  ltcatAddon: boolean
  contractVersion: string
}

// Falha explícita (nunca inventa/recalcula) quando o snapshot histórico
// indispensável não existir — caso de Company legada anterior a este campo
// (ver docs/PROJECT_STATE.md, política de legado da Seção 20 do prompt de
// missão). O chamador (contractPdf.ts, dentro do try/catch já existente no
// webhook) trata isso como falha de geração, nunca como sucesso parcial.
export class QuadroResumoIndisponivelError extends Error {
  constructor(motivo: string) {
    super(`quadro_resumo_indisponivel: ${motivo}`)
    this.name = 'QuadroResumoIndisponivelError'
  }
}

export function buildQuadroResumo(source: QuadroResumoSource): QuadroResumo {
  if (source.implantacaoValorPadrao == null) {
    throw new QuadroResumoIndisponivelError('implantacaoValorPadrao ausente (Company anterior a este snapshot)')
  }

  const termosTemporais = deriveTermosTemporais(source.contractVersion)

  return {
    razaoSocialContratada: CONTRATADA_RAZAO_SOCIAL,
    cnpjContratada: CONTRATADA_CNPJ,
    razaoSocialContratante: source.razaoSocialContratante,
    cnpjContratante: source.cnpjContratante,
    nomeResponsavel: source.nomeResponsavel,
    emailCadastrado: source.emailCadastrado,
    enderecoEstabelecimento: source.enderecoEstabelecimento,
    numFuncionarios: source.numFuncionarios,
    plano: source.planType as ContractPlanKey,
    planoLabel: derivePlanoLabel(source.planType, source.contractVersion),
    faixa: deriveFaixaHistorica(source.numFuncionarios, source.contractVersion),
    mensalidadeCents: source.mensalidadeValor,
    implantacaoNormalCents: source.implantacaoValorPadrao,
    implantacaoAceitaCents: source.implantacaoValor,
    condicaoPromocional: source.implantacaoPromo,
    ltcat: deriveLtcatSituacao(source.planType, source.ltcatAddon),
    demaisAdicionais: [],
    versaoContratual: source.contractVersion,
    vigenciaInicial: termosTemporais.vigenciaInicial,
    renovacao: termosTemporais.renovacao,
    avisoPrevio: termosTemporais.avisoPrevio,
  }
}

// Rótulos legíveis para o valor categórico de LTCAT — usados pelo PDF
// (comprovante e "Plano Contratado") para nunca duplicar essa tradução.
export const LTCAT_SITUACAO_LABEL: Record<ContractLtcatSituacao, string> = {
  adicional_contratado: 'Adicional contratado',
  incluido_no_premium: 'Incluído no plano Premium',
  nao_contratado: 'Não contratado',
}
