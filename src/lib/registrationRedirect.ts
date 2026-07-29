// ═══════════════════════════════════════════════════════════
// SUBLIME SST — Decisão de destino após o cadastro (Etapa 2B.2)
// Função pura, sem I/O — usa somente os campos já existentes na resposta de
// POST /api/leads/register. `continuationReady` ausente (resposta antiga/
// bundle antigo) é tratado exatamente como `false`, preservando o fluxo
// legado sem quebrar clientes desatualizados.
// ═══════════════════════════════════════════════════════════

export type RegistrationRedirectDecision =
  | { kind: 'continuation'; url: '/cadastro/continuar' }
  | { kind: 'checkout'; url: string }
  | { kind: 'unavailable' }

export function decideRegistrationRedirect(data: {
  continuationReady?: boolean
  checkoutUrl?: string | null
  isMock?: boolean
}): RegistrationRedirectDecision {
  if (data.continuationReady === true) {
    return { kind: 'continuation', url: '/cadastro/continuar' }
  }

  // Fluxo legado — mesmo comportamento de sempre: em modo mock a URL de
  // cobrança é falsa (não existe na Asaas real), então nunca redireciona.
  const checkoutUrl = data.isMock ? null : (data.checkoutUrl || null)
  if (checkoutUrl) {
    return { kind: 'checkout', url: checkoutUrl }
  }

  return { kind: 'unavailable' }
}
