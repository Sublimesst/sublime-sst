// ──────────────────────────────────────────────────────────────────────────────
// FONTE ÚNICA DE PREÇOS DO SUBLIME DIGITAL
// Atualizar aqui reflete em todo o sistema (site, checkout, PDF, banco).
// Todos os valores monetários em CENTAVOS exceto onde indicado.
// ──────────────────────────────────────────────────────────────────────────────

export const PRICING = {
  essencial: {
    name: 'Digital Essencial',
    tagline: 'Conformidade completa com o melhor custo-benefício',
    faixas: {
      '1-5':   { label: '1 a 5 funcionários',   monthly: 19900 },
      '6-10':  { label: '6 a 10 funcionários',  monthly: 32000 },
      '11-20': { label: '11 a 20 funcionários', monthly: 49000 },
    },
    implantacao: { padrao: 19900, promo: 14900 },
    ltcatIncluido: false,
  },
  premium: {
    name: 'Digital Premium',
    tagline: 'Tudo incluído — sem surpresas na fatura',
    faixas: {
      '1-5':   { label: '1 a 5 funcionários',   monthly: 29900 },
      '6-10':  { label: '6 a 10 funcionários',  monthly: 49000 },
      '11-20': { label: '11 a 20 funcionários', monthly: 69000 },
    },
    implantacao: { padrao: 29900, promo: 14900 },
    ltcatIncluido: true,
  },
} as const

export const LTCAT_ADDON_PRICE_CENTS = 45000 // R$ 450,00
export const CONTRACT_VERSION = '2026-07-04'
export const PROMO_WINDOW_MS = 24 * 60 * 60 * 1000 // 24 horas em ms

export type PlanKey = keyof typeof PRICING
export type FaixaKey = keyof (typeof PRICING)['essencial']['faixas']

export function getMonthlyPrice(plan: PlanKey, faixa: FaixaKey): number {
  return PRICING[plan].faixas[faixa].monthly
}

export function getImplantacaoPrice(plan: PlanKey, isPromo: boolean): number {
  return isPromo ? PRICING[plan].implantacao.promo : PRICING[plan].implantacao.padrao
}
