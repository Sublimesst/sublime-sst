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
