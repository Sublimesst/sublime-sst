import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// ── CLASSNAME MERGE ───────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── MASKS ─────────────────────────────────────────────────────
export function maskCNPJ(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14)
  if (digits.length <= 2) return digits
  if (digits.length <= 5) return `${digits.slice(0,2)}.${digits.slice(2)}`
  if (digits.length <= 8) return `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5)}`
  if (digits.length <= 12) return `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5,8)}/${digits.slice(8)}`
  return `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5,8)}/${digits.slice(8,12)}-${digits.slice(12)}`
}

export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits.length ? `(${digits}` : ''
  if (digits.length <= 6) return `(${digits.slice(0,2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`
  return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`
}

export function maskCEP(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 5) return digits
  return `${digits.slice(0,5)}-${digits.slice(5)}`
}

export function maskCurrencyBRL(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100)
}

// ── VALIDATORS ───────────────────────────────────────────────
export function validateCNPJ(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, '')
  if (digits.length !== 14) return false
  if (/^(\d)\1+$/.test(digits)) return false

  const calcDigit = (length: number): number => {
    let sum = 0
    let pos = length - 7
    for (let i = length; i >= 1; i--) {
      sum += parseInt(digits.charAt(length - i)) * pos--
      if (pos < 2) pos = 9
    }
    const result = sum % 11
    return result < 2 ? 0 : 11 - result
  }

  return (
    calcDigit(12) === parseInt(digits.charAt(12)) &&
    calcDigit(13) === parseInt(digits.charAt(13))
  )
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function validatePhone(phone: string): boolean {
  return phone.replace(/\D/g, '').length >= 10
}

// ── PLANS ─────────────────────────────────────────────────────
import type { EmployeeRange, PlanConfig } from '@/types'
import { PRICING } from '@/lib/pricing'

export const PLANS: Record<Exclude<EmployeeRange, '21+'>, PlanConfig> = {
  '1-5': {
    range: '1-5',
    label: PRICING.essencial.faixas['1-5'].label,
    monthly: PRICING.essencial.faixas['1-5'].monthly,
    implantacao: PRICING.essencial.implantacao.padrao,
    implantacaoPromo: PRICING.essencial.implantacao.promo,
  },
  '6-10': {
    range: '6-10',
    label: PRICING.essencial.faixas['6-10'].label,
    monthly: PRICING.essencial.faixas['6-10'].monthly,
    implantacao: PRICING.essencial.implantacao.padrao,
    implantacaoPromo: PRICING.essencial.implantacao.promo,
  },
  '11-20': {
    range: '11-20',
    label: PRICING.essencial.faixas['11-20'].label,
    monthly: PRICING.essencial.faixas['11-20'].monthly,
    implantacao: PRICING.essencial.implantacao.padrao,
    implantacaoPromo: PRICING.essencial.implantacao.promo,
  },
}

export function getPlan(range: EmployeeRange): PlanConfig | null {
  if (range === '21+') return null
  return PLANS[range] ?? null
}

// ── DATE ──────────────────────────────────────────────────────
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function getPromoDeadline(hoursFromNow = 24): Date {
  const d = new Date()
  d.setHours(d.getHours() + hoursFromNow)
  return d
}
