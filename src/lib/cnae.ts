// ═══════════════════════════════════════════════════════════
// SUBLIME SST — Normalização de código CNAE
// O catálogo (cnae_catalog.json) guarda CNAE no nível de CLASSE
// (5 dígitos, formato XX.XX-X). Fontes externas (ex.: BrasilAPI)
// retornam o CNAE no nível de SUBCLASSE (7 dígitos, XX.XX-X/YY).
// Sem normalizar para o nível de classe antes de comparar, uma
// empresa com CNAE GR1 aprovado era classificada como não elegível
// só porque a subclasse (que o catálogo não guarda) não batia.
// ═══════════════════════════════════════════════════════════

export function onlyDigits(input: string): string {
  return input.replace(/\D/g, '')
}

// Converte qualquer formato de entrada (41.10-7, 41.10-7/01, 41107,
// 4110701, 4110-7...) para o nível de classe do catálogo (XX.XX-X).
// Retorna null se não houver dígitos suficientes (<5) para determinar a classe.
export function normalizeCnaeCode(input: string): string | null {
  const digits = onlyDigits(input)
  if (digits.length < 5) return null
  const d = digits.slice(0, 5)
  return `${d.slice(0, 2)}.${d.slice(2, 4)}-${d.slice(4, 5)}`
}
