// ═══════════════════════════════════════════════════════════
// SUBLIME SST — Adapter Google Sheets
// Para ativar: configure GOOGLE_SHEETS_SPREADSHEET_ID e
// GOOGLE_SERVICE_ACCOUNT_KEY no .env.local
// ═══════════════════════════════════════════════════════════

const IS_CONFIGURED =
  !!process.env.GOOGLE_SHEETS_SPREADSHEET_ID &&
  !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY &&
  !process.env.GOOGLE_SERVICE_ACCOUNT_KEY.includes('service_account,...')

interface SheetRow {
  [key: string]: string | number | boolean | null | undefined
}

async function getAuthToken(): Promise<string> {
  const key = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!)
  // In production, use google-auth-library or a JWT flow
  // This is a stub — replace with actual OAuth2 flow
  throw new Error('Google Sheets auth not implemented — install google-auth-library')
}

async function appendRow(sheet: string, values: (string | number | null)[]): Promise<void> {
  if (!IS_CONFIGURED) {
    console.warn('[SHEETS MOCK] appendRow:', sheet, values)
    return
  }

  const token = await getAuthToken()
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheet}:append?valueInputOption=USER_ENTERED`

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [values] }),
  })

  if (!res.ok) throw new Error(`Sheets API error: ${res.status}`)
}

// ── PUBLIC METHODS ────────────────────────────────────────────

export async function exportLeadToSheets(lead: SheetRow): Promise<void> {
  await appendRow('Leads', [
    String(lead.id ?? ''),
    String(lead.cnpj ?? ''),
    String(lead.companyName ?? ''),
    String(lead.name ?? ''),
    String(lead.email ?? ''),
    String(lead.whatsapp ?? ''),
    String(lead.status ?? ''),
    String(lead.source ?? ''),
    new Date().toISOString(),
  ])
}

export async function exportPartnerToSheets(partner: SheetRow): Promise<void> {
  await appendRow('Parceiros', [
    String(partner.id ?? ''),
    String(partner.name ?? ''),
    String(partner.office ?? ''),
    String(partner.email ?? ''),
    String(partner.whatsapp ?? ''),
    String(partner.city ?? ''),
    String(partner.state ?? ''),
    new Date().toISOString(),
  ])
}

export const isSheetsConfigured = IS_CONFIGURED
