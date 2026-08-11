// ═══════════════════════════════════════════════════════════
// SUBLIME SST — Datas civis (onboarding de trabalhadores)
// dataNascimento/dataAdmissao são datas civis (dia calendário), não
// instantes. Parse e formatação usam SEMPRE os componentes UTC do Date —
// nunca os locais (getDate/getMonth/toISOString com hora) — para que o dia
// gravado e devolvido ao cliente seja sempre exatamente o dia digitado,
// independente do timezone do processo Node (servidor) ou do navegador.
// ═══════════════════════════════════════════════════════════

const CIVIL_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

// Converte "YYYY-MM-DD" num Date à meia-noite UTC daquele dia civil. Rejeita
// (retorna null) formato inválido e datas inexistentes (ex.: "2024-02-30",
// que o construtor de Date normalmente "rolaria" para março).
export function parseCivilDate(value: string): Date | null {
  const match = CIVIL_DATE_RE.exec(value.trim())
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  const date = new Date(Date.UTC(year, month - 1, day))
  const rolledOver =
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  if (rolledOver) return null

  return date
}

// Formata um Date (armazenado como @db.Date, meia-noite UTC) de volta para
// "YYYY-MM-DD" usando os componentes UTC — nunca os locais.
export function formatCivilDate(date: Date): string {
  const year = String(date.getUTCFullYear()).padStart(4, '0')
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
