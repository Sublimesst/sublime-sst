// ═══════════════════════════════════════════════════════════
// SUBLIME SST — Tipos da fonte contratual única (Eixo A)
// Puros: sem React, sem PDFKit, sem Prisma, sem acesso a banco.
// ═══════════════════════════════════════════════════════════

// Um bloco de conteúdo dentro de uma cláusula — parágrafo corrido ou lista
// com marcadores. Cobre tanto o texto de `/termos` quanto o do PDF sem
// forçar nenhum dos dois a um formato de renderização específico.
//
// `readonly` em todos os níveis (aqui e em ContractClause/ContractContent)
// para que o conteúdo publicado seja imutável já na tipagem — o runtime
// reforça isso com Object.freeze profundo em content.ts.
export type ContractBlock =
  | { readonly type: 'paragrafo'; readonly texto: string }
  | { readonly type: 'lista'; readonly titulo?: string; readonly itens: readonly string[] }

export interface ContractClause {
  readonly numero: number
  readonly titulo: string
  // Array em si não é tipado `readonly ContractBlock[]` de propósito: o
  // renderizador de PDF (src/lib/contractPdf.ts, fora do escopo desta
  // revisão) declara seu parâmetro como `ContractBlock[]` mutável, e
  // `readonly T[]` não é atribuível a `T[]` em TypeScript. A imutabilidade
  // real deste array é garantida em runtime por Object.freeze (ver
  // freezeContractContent em content.ts), não pela tipagem do array —
  // os elementos (ContractBlock) e o conteúdo de `itens` continuam
  // readonly em ambos os níveis.
  readonly blocos: ContractBlock[]
}

export interface ContractContent {
  readonly version: string
  readonly clausulas: readonly ContractClause[]
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
// Montado por src/lib/contract/quadroResumo.ts (Eixo B) exclusivamente a
// partir de campos já congelados no momento do cadastro (Company.*) — NUNCA
// recalculado a partir de `pricing.ts` no momento da montagem. Uma mudança
// futura em pricing.ts nunca pode alterar o conteúdo de um QuadroResumo já
// montado para uma contratação aceita anteriormente.
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
  // Nome de exibição do plano ("Digital Essencial"/"Digital Premium"),
  // resolvido por versaoContratual — nunca por PRICING[plano].name, que
  // pode mudar após o aceite (ver quadroResumo.ts).
  planoLabel: string
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
