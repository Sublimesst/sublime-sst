// ═══════════════════════════════════════════════════════════
// SUBLIME SST — Timeline do Portal Cliente (etapas de status)
// Função pura (sem JSX), extraída para fora de page.tsx pela mesma razão de
// paymentPresentationView.ts: Next.js App Router só permite exports
// específicos (default/metadata/config/...) em arquivos page.tsx — qualquer
// outro export quebra a checagem de tipos gerada pelo build. Também facilita
// testar sem infraestrutura de teste de componente.
// ═══════════════════════════════════════════════════════════

export type Step = { label: string; description: string; done: boolean; pending: boolean }

export interface StepsCompany {
  status: string
  documentsDeliveredAt: Date | null
  onboardingData: { status: string } | null
  payments: { type: string; status: string }[]
}

// "in_production"/"in_review" pertencem à mesma macroetapa de elaboração e
// revisão dos documentos técnicos — nenhuma ação do cliente é exigida em
// nenhum dos dois. A entrega formal é evidenciada exclusivamente por
// `documentsDeliveredAt != null`, nunca pelo status atual: uma vez entregue,
// a etapa continua reconhecida mesmo que o status evolua depois (active,
// overdue, suspended, migrating, ...).
export function getSteps(company: StepsCompany, financiallyComplete: boolean): Step[] {
  const hasPendingPayment = company.payments.some(p => p.type === 'implantacao' && p.status === 'pending')
  const hasConfirmedPayment = company.payments.some(p => p.type === 'implantacao' && p.status === 'confirmed')
  // Um rascunho em andamento (status "em_preenchimento") ainda não conta
  // como etapa concluída — só o envio final ("enviado") avança o passo.
  const hasOnboarding = company.onboardingData?.status === 'enviado'
  const isElaborating = company.status === 'in_production' || company.status === 'in_review'
  const documentsDelivered = company.documentsDeliveredAt != null

  return [
    {
      label: 'Contratação realizada',
      description: 'Sua empresa foi cadastrada no Sublime Digital.',
      done: true,
      pending: false,
    },
    {
      label: 'Pagamento da implantação',
      description: hasConfirmedPayment
        ? 'Pago e confirmado.'
        : hasPendingPayment
          ? 'Aguardando confirmação do pagamento.'
          : 'Realize o pagamento para prosseguir.',
      done: hasConfirmedPayment,
      pending: hasPendingPayment,
    },
    {
      label: 'Preenchimento dos dados',
      description: hasOnboarding
        ? 'Dados recebidos — em análise pela equipe.'
        : financiallyComplete
          ? 'Preencha o formulário de onboarding para iniciar a elaboração dos documentos.'
          : 'Libera após a confirmação da implantação e da primeira mensalidade.',
      done: hasOnboarding,
      pending: !hasOnboarding && financiallyComplete,
    },
    {
      label: 'Elaboração dos documentos',
      description: documentsDelivered
        ? 'Documentos elaborados e entregues.'
        : isElaborating && hasOnboarding
          ? 'Seus dados foram recebidos e a Sublime está elaborando/revisando os documentos da sua empresa.'
          : 'Aguarda preenchimento dos dados e confirmação do pagamento.',
      done: documentsDelivered,
      pending: !documentsDelivered && isElaborating && hasOnboarding,
    },
    {
      label: 'Documentos entregues',
      description: 'PGR e PCMSO disponíveis para download no portal.',
      done: documentsDelivered,
      pending: false,
    },
  ]
}
