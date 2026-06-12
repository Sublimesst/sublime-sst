// ═══════════════════════════════════════════════════════════
// SUBLIME SST — Tipos Centrais
// ═══════════════════════════════════════════════════════════

export type EmployeeRange = '1-5' | '6-10' | '11-20' | '21+'

export type EligibilityReason =
  | 'MAIS_DE_20_FUNCIONARIOS'
  | 'CNAE_NAO_GR1'
  | 'CNAE_PENDENTE_VALIDACAO_RT'
  | 'CNAE_BLOQUEADO'
  | 'USA_MAQUINAS_INDUSTRIAIS'
  | 'MANIPULA_QUIMICOS'
  | 'TRABALHO_EM_ALTURA'
  | 'ATIVIDADES_EXTERNAS_FREQUENTES'

export type LeadStatus =
  | 'captured'
  | 'assessed'
  | 'eligible'
  | 'backoffice'
  | 'registered'
  | 'converted'

export type PaymentStatus = 'pending' | 'confirmed' | 'failed' | 'refunded'
export type CompanyStatus = 'pending' | 'active' | 'inactive' | 'cancelled'
export type PartnerStatus = 'pending' | 'active' | 'inactive'
export type CnaeStatus = 'approved' | 'pending' | 'blocked'

// ── FORMS ────────────────────────────────────────────────────

export interface LeadCaptureData {
  cnpj: string
  companyName: string
  name: string
  email: string
  whatsapp: string
}

export interface EligibilityData {
  cnae: string
  cnaeCode: string
  employees: EmployeeRange
  usesMachines: boolean
  usesChemicals: boolean
  worksAtHeight: boolean
  hasExternalWork: boolean
  declaration: boolean
}

export interface RegistrationData {
  razaoSocial: string
  nomeFantasia?: string
  responsavel: string
  email: string
  whatsapp: string
  cep: string
  cidade: string
  estado: string
  endereco: string
  numFuncionarios: number
  cargos?: string
  observations?: string
  consentDataUsage: boolean
  consentDeclaration: boolean
  consentTerms: boolean
}

export interface PartnerFormData {
  name: string
  office: string
  cnpj?: string
  email: string
  whatsapp: string
  clientsEstimate?: number
  city: string
  state: string
  consentContact: boolean
  referral?: {
    companyName: string
    cnpj?: string
    contactName?: string
    phone?: string
    email?: string
    employeesEst?: number
    observations?: string
  }
}

// ── ELIGIBILITY ENGINE ───────────────────────────────────────

export interface EligibilityResult {
  eligible: boolean
  reasons: EligibilityReason[]
  plan?: PlanConfig
}

export interface PlanConfig {
  range: EmployeeRange
  label: string
  monthly: number     // centavos
  implantacao: number // centavos
  implantacaoPromo: number
}

// ── API RESPONSES ────────────────────────────────────────────

export interface ApiSuccess<T = unknown> {
  success: true
  data: T
}

export interface ApiError {
  success: false
  error: string
  field?: string
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError

// ── ADMIN ────────────────────────────────────────────────────

export interface AdminLead {
  id: string
  cnpj: string
  companyName: string
  name: string
  email: string
  whatsapp: string
  status: LeadStatus
  source: string
  createdAt: string
  eligible?: boolean | null
  reasons?: string[]
  employees?: string
  cnae?: string
}

export interface AdminStats {
  totalLeads: number
  eligibleLeads: number
  backofficeLeads: number
  registrations: number
  partners: number
  referrals: number
  conversionRate: number
}

export interface CnaeRow {
  id: string
  code: string
  description: string
  grauRiscoNr4: number
  onlineCatalogStatus: CnaeStatus
  eligivelOnline: boolean
  approvedBy?: string | null
  approvedAt?: string | null
}
