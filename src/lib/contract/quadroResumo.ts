// ═══════════════════════════════════════════════════════════
// SUBLIME SST — Quadro-resumo da contratação (Eixo B)
// Monta o QuadroResumo (docs/CONTRACT_MVP_V1.md, Seção 5) exclusivamente a
// partir de campos já congelados na Company no momento do cadastro. Nunca
// importa PRICING/getMonthlyPrice/getImplantacaoPrice/LTCAT_ADDON_PRICE_CENTS
// — ler o pricing vigente aqui reintroduziria exatamente o risco que este
// módulo existe para eliminar (contrato histórico passando a refletir preço
// atual). `faixaKeyFromCount` é a única importação de pricing.ts: é uma
// função estrutural (faixas de headcount fixas), não uma tabela de preço.
// ═══════════════════════════════════════════════════════════

import { faixaKeyFromCount } from '../pricing'
import type { ContractFaixaKey, ContractLtcatSituacao, ContractPlanKey, QuadroResumo } from './types'

const CONTRATADA_RAZAO_SOCIAL = 'SUBLIME SEGURANCA E SAUDE OCUPACIONAL LTDA'
const CONTRATADA_CNPJ = '65.051.167/0001-27'

const VIGENCIA_INICIAL = '12 (doze) meses, a partir da ativação'
const RENOVACAO = 'Automática, por prazo indeterminado, após o período inicial'
const AVISO_PREVIO = 'Durante a vigência inicial: qualquer solicitação produz efeito ao final do 12º mês. Após a renovação: 90 dias.'

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
    faixa: faixaKeyFromCount(source.numFuncionarios) as ContractFaixaKey,
    mensalidadeCents: source.mensalidadeValor,
    implantacaoNormalCents: source.implantacaoValorPadrao,
    implantacaoAceitaCents: source.implantacaoValor,
    condicaoPromocional: source.implantacaoPromo,
    ltcat: deriveLtcatSituacao(source.planType, source.ltcatAddon),
    demaisAdicionais: [],
    versaoContratual: source.contractVersion,
    vigenciaInicial: VIGENCIA_INICIAL,
    renovacao: RENOVACAO,
    avisoPrevio: AVISO_PREVIO,
  }
}

// Rótulos legíveis para o valor categórico de LTCAT — usados pelo PDF
// (comprovante e "Plano Contratado") para nunca duplicar essa tradução.
export const LTCAT_SITUACAO_LABEL: Record<ContractLtcatSituacao, string> = {
  adicional_contratado: 'Adicional contratado',
  incluido_no_premium: 'Incluído no plano Premium',
  nao_contratado: 'Não contratado',
}
