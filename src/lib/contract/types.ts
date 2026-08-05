// ═══════════════════════════════════════════════════════════
// SUBLIME SST — Tipos da fonte contratual única (Eixo A)
// Puros: sem React, sem PDFKit, sem Prisma, sem acesso a banco.
// ═══════════════════════════════════════════════════════════

// Um bloco de conteúdo dentro de uma cláusula — parágrafo corrido ou lista
// com marcadores. Cobre tanto o texto de `/termos` quanto o do PDF sem
// forçar nenhum dos dois a um formato de renderização específico.
export type ContractBlock =
  | { type: 'paragrafo'; texto: string }
  | { type: 'lista'; titulo?: string; itens: string[] }

export interface ContractClause {
  numero: number
  titulo: string
  blocos: ContractBlock[]
}

export interface ContractContent {
  version: string
  clausulas: ContractClause[]
}

// Plano e faixa — mesmas chaves usadas em `pricing.ts` (nunca redefinidas
// aqui, apenas referenciadas por tipo para evitar `string` solto).
export type ContractPlanKey = 'essencial' | 'premium'
export type ContractFaixaKey = '1-5' | '6-10' | '11-20'

// Situação do LTCAT na contratação (Seção 5 do MVP 1.0) — usado pelo
// quadro-resumo e, futuramente, pelo comprovante eletrônico (Eixo B).
export type ContractLtcatSituacao =
  | 'adicional_contratado'
  | 'incluido_no_premium'
  | 'nao_contratado'

// Campos obrigatórios do quadro-resumo (docs/CONTRACT_MVP_V1.md, Seção 5).
// Estrutura de tipo para a Seção 5 — o preenchimento e a persistência do
// quadro-resumo em si pertencem ao Eixo B; aqui só se define o formato.
// Nenhum valor monetário fixo: mensalidade/implantação sempre vêm de
// `pricing.ts` no momento da montagem deste objeto pelo chamador.
export interface QuadroResumo {
  razaoSocialContratada: string
  cnpjContratada: string
  razaoSocialContratante: string
  cnpjContratante: string
  nomeResponsavel: string
  emailCadastrado: string
  enderecoEstabelecimento: string
  numFuncionarios: number
  plano: ContractPlanKey
  faixa: ContractFaixaKey
  mensalidadeCents: number
  implantacaoNormalCents: number
  implantacaoAceitaCents: number
  condicaoPromocional: boolean
  ltcat: ContractLtcatSituacao
  demaisAdicionais: string[]
  versaoContratual: string
  vigenciaInicial: string
  renovacao: string
  avisoPrevio: string
}
