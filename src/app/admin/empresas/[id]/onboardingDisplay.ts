// Formatação pura dos dados de onboarding exibidos em /admin/empresas/[id].
// Mantido separado do componente para permitir testes sem DOM (padrão de
// testes já usado no projeto: funções puras, sem testing-library/jsdom).

export function formatOptionalText(value: string | null | undefined): string {
  const trimmed = value?.trim()
  return trimmed ? trimmed : 'Não informado'
}

export function formatPossuiPgr(value: boolean | null | undefined): string {
  if (value === true) return 'Sim'
  if (value === false) return 'Não'
  return 'Não informado'
}

export function employeeCountDiverges(cadastroInicial: number, onboarding: number): boolean {
  return cadastroInicial !== onboarding
}

// Formata uma data civil "YYYY-MM-DD" (já serializada por serializeWorker,
// ver src/lib/onboardingWorkers.ts) para "DD/MM/AAAA" via manipulação de
// string — nunca via Date, para não reintroduzir o deslocamento de
// timezone que civilDate.ts existe para evitar.
export function formatCivilDateBR(value: string | null | undefined): string {
  const match = value ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null
  if (!match) return '—'
  return `${match[3]}/${match[2]}/${match[1]}`
}
