'use client'

import { useState, useCallback, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, ArrowRight, ArrowLeft, Search, Clock, HelpCircle, Pencil, Loader2, Shield } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { WhatsAppButton } from '@/components/layout/WhatsAppButton'
import { maskCNPJ, maskPhone, validateCNPJ, validateEmail, validatePhone, maskCurrencyBRL } from '@/lib/utils'
import { track } from '@/lib/analytics'
import type { EmployeeRange, EligibilityReason } from '@/types'

// ── CNAE loader ───────────────────────────────────────────────────────────────
async function loadCnae(q: string): Promise<{ code: string; desc: string }[]> {
  try {
    const res = await fetch(`/api/cnae?q=${encodeURIComponent(q)}`)
    const data = await res.json()
    if (data.success) return data.data.map((e: { nr4_class_code: string; description: string }) => ({
      code: e.nr4_class_code,
      desc: e.description,
    }))
  } catch { /* silently ignore */ }
  return []
}

// ── CNAE formatter (BrasilAPI retorna número, ex: 6920601 → 69.20-6/01) ──────
function formatCNAECode(raw: number | string): string {
  const d = String(raw).replace(/\D/g, '').padStart(7, '0')
  return `${d.slice(0, 2)}.${d.slice(2, 4)}-${d.slice(4, 5)}/${d.slice(5, 7)}`
}

import { PRICING, PROMO_WINDOW_MS } from '@/lib/pricing'

// ── Motor client-side ─────────────────────────────────────────────────────────
// Decisão de negócio (2026-07-05): todos os 122 CNAEs GR1 do catálogo são
// aprovados por padrão. Basta o CNAE estar no catálogo GR1 para ser elegível
// (sem whitelist restritiva) — alinhado com o motor do backend (runEligibilityEngine).
type PlanType = 'essencial' | 'premium'

interface PlanDetails { label: string; monthly: number; implantacao: number; implantacaoPromo: number }

const PLAN_TYPES: Record<PlanType, { name: string; tagline: string; plans: Record<string, PlanDetails> }> = {
  essencial: {
    name:    PRICING.essencial.name,
    tagline: PRICING.essencial.tagline,
    plans: {
      '1-5':   { label: PRICING.essencial.faixas['1-5'].label,   monthly: PRICING.essencial.faixas['1-5'].monthly,   implantacao: PRICING.essencial.implantacao.padrao, implantacaoPromo: PRICING.essencial.implantacao.promo },
      '6-10':  { label: PRICING.essencial.faixas['6-10'].label,  monthly: PRICING.essencial.faixas['6-10'].monthly,  implantacao: PRICING.essencial.implantacao.padrao, implantacaoPromo: PRICING.essencial.implantacao.promo },
      '11-20': { label: PRICING.essencial.faixas['11-20'].label, monthly: PRICING.essencial.faixas['11-20'].monthly, implantacao: PRICING.essencial.implantacao.padrao, implantacaoPromo: PRICING.essencial.implantacao.promo },
    },
  },
  premium: {
    name:    PRICING.premium.name,
    tagline: PRICING.premium.tagline,
    plans: {
      '1-5':   { label: PRICING.premium.faixas['1-5'].label,   monthly: PRICING.premium.faixas['1-5'].monthly,   implantacao: PRICING.premium.implantacao.padrao, implantacaoPromo: PRICING.premium.implantacao.promo },
      '6-10':  { label: PRICING.premium.faixas['6-10'].label,  monthly: PRICING.premium.faixas['6-10'].monthly,  implantacao: PRICING.premium.implantacao.padrao, implantacaoPromo: PRICING.premium.implantacao.promo },
      '11-20': { label: PRICING.premium.faixas['11-20'].label, monthly: PRICING.premium.faixas['11-20'].monthly, implantacao: PRICING.premium.implantacao.padrao, implantacaoPromo: PRICING.premium.implantacao.promo },
    },
  },
}

const REASON_LABELS: Record<string, string> = {
  MAIS_DE_20_FUNCIONARIOS:        'Mais de 20 funcionários',
  CNAE_NAO_GR1:                   'CNAE não classificado como GR 1 na NR-4',
  CNAE_PENDENTE_VALIDACAO_RT:     'CNAE pendente de validação pelo responsável técnico',
  USA_MAQUINAS_INDUSTRIAIS:       'Uso de máquinas industriais',
  MANIPULA_QUIMICOS:              'Manipulação de produtos químicos perigosos',
  TRABALHO_EM_ALTURA:             'Trabalho em altura',
  ATIVIDADES_EXTERNAS_FREQUENTES: 'Atividades externas frequentes',
}

interface EngineResult {
  eligible: boolean
  reasons: EligibilityReason[]
}

function runEngine(params: {
  cnaeCode: string; cnaeInCatalog: boolean; employees: string
  usesMachines: boolean; usesChemicals: boolean; worksAtHeight: boolean; hasExternalWork: boolean
}): EngineResult {
  const reasons: EligibilityReason[] = []
  if (params.employees === '21+') reasons.push('MAIS_DE_20_FUNCIONARIOS' as EligibilityReason)
  // CNAE no catálogo GR1 = aprovado. Fora do catálogo = não é GR1.
  if (!params.cnaeInCatalog) {
    reasons.push('CNAE_NAO_GR1' as EligibilityReason)
  }
  if (params.usesMachines)    reasons.push('USA_MAQUINAS_INDUSTRIAIS' as EligibilityReason)
  if (params.usesChemicals)   reasons.push('MANIPULA_QUIMICOS' as EligibilityReason)
  if (params.worksAtHeight)   reasons.push('TRABALHO_EM_ALTURA' as EligibilityReason)
  if (params.hasExternalWork) reasons.push('ATIVIDADES_EXTERNAS_FREQUENTES' as EligibilityReason)
  const eligible = reasons.length === 0
  return { eligible, reasons }
}

// ── Types ─────────────────────────────────────────────────────────────────────
type Step = 1 | 2 | 'eligible' | 'backoffice'

interface FormState {
  // Etapa 1 — empresa + perfil operacional
  cnpj: string
  companyName: string
  cnaeDisplay: string
  cnaeCode: string
  cnaeInCatalog: boolean
  employees: EmployeeRange | ''
  usesMachines: boolean | null
  usesChemicals: boolean | null
  worksAtHeight: boolean | null
  hasExternalWork: boolean | null
  declaration: boolean
  // Etapa 2 — contato
  name: string
  email: string
  whatsapp: string
}

const EMPLOYEE_OPTIONS: { value: EmployeeRange; label: string }[] = [
  { value: '1-5',   label: '1 a 5' },
  { value: '6-10',  label: '6 a 10' },
  { value: '11-20', label: '11 a 20' },
  { value: '21+',   label: 'Mais de 20' },
]

const RADIO_Q = [
  { key: 'usesMachines'    as const, label: 'Sua empresa utiliza máquinas industriais?' },
  { key: 'usesChemicals'  as const, label: 'Manipula produtos químicos perigosos?' },
  { key: 'worksAtHeight'  as const, label: 'Possui trabalho em altura?' },
  { key: 'hasExternalWork'as const, label: 'Realiza atividades externas frequentes?' },
]

// ── Countdown hook ────────────────────────────────────────────────────────────
function useCountdown(endTs: number) {
  const [remaining, setRemaining] = useState(endTs - Date.now())
  useEffect(() => {
    const id = setInterval(() => setRemaining(endTs - Date.now()), 1000)
    return () => clearInterval(id)
  }, [endTs])
  const totalSec = Math.max(0, Math.floor(remaining / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

// ── Inner component (needs useSearchParams) ───────────────────────────────────
function ElegibilidadeInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const utmRef = useRef<Record<string, string>>({})

  useEffect(() => {
    const keys = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term']
    keys.forEach(k => {
      const v = searchParams.get(k)
      if (v) utmRef.current[k] = v
    })
    // Partner tracking: ?ref=CODE
    const ref = searchParams.get('ref')
    if (ref && typeof window !== 'undefined') {
      sessionStorage.setItem('sublime_partner_ref', ref)
    }
    track('cta_digital_test_click', utmRef.current)
  }, [searchParams])

  const [step, setStep] = useState<Step>(1)
  const [form, setForm] = useState<FormState>({
    cnpj: '', companyName: '',
    cnaeDisplay: '', cnaeCode: '', cnaeInCatalog: false,
    employees: '',
    usesMachines: null, usesChemicals: null, worksAtHeight: null, hasExternalWork: null,
    declaration: false,
    name: '', email: '', whatsapp: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [cnaeResults, setCnaeResults] = useState<{ code: string; desc: string }[]>([])
  const [showCnae, setShowCnae] = useState(false)
  const [cnaeEditable, setCnaeEditable] = useState(true)
  const [showCnaeHelp, setShowCnaeHelp] = useState(false)
  const [cnpjLoading, setCnpjLoading] = useState(false)
  const [result, setResult] = useState<EngineResult | null>(null)
  const [loading, setLoading] = useState(false)
  // Persiste o fim da promo entre recarregamentos — o prazo de 24h conta a partir do primeiro resultado
  const [promoEnd] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('sublime_eligibility')
        const prev = stored ? JSON.parse(stored)?.promoEnd : null
        if (typeof prev === 'number' && prev > Date.now()) return prev
      } catch { /* ignora e cria novo prazo */ }
    }
    return Date.now() + PROMO_WINDOW_MS
  })
  const countdown = useCountdown(promoEnd)
  const [planType, setPlanType] = useState<PlanType>('essencial')
  const [ltcatAddon, setLtcatAddon] = useState(false)
  const [contractAccepted, setContractAccepted] = useState(false)
  const [contractError, setContractError] = useState('')

  const set = (k: keyof FormState, v: unknown) => {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => { const n = {...e}; delete n[k]; return n })
  }

  // ── CNPJ lookup ──────────────────────────────────────────────
  const lookupCNPJ = useCallback(async (cnpj: string) => {
    const digits = cnpj.replace(/\D/g, '')
    if (digits.length !== 14) return
    setCnpjLoading(true)
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`)
      if (!res.ok) throw new Error('not found')
      const data = await res.json()
      if (data.razao_social) {
        set('companyName', data.razao_social)
      }
      if (data.cnae_fiscal) {
        const formatted = formatCNAECode(data.cnae_fiscal)
        const results = await loadCnae(formatted)
        if (results.length > 0) {
          set('cnaeDisplay', `${results[0].code} — ${results[0].desc}`)
          set('cnaeCode', results[0].code)
          set('cnaeInCatalog', true)
          setCnaeEditable(false)
        } else {
          set('cnaeDisplay', formatted)
          set('cnaeCode', formatted)
          set('cnaeInCatalog', false)
          setCnaeEditable(true)
        }
      }
    } catch {
      // CNPJ não encontrado — usuário preenche manualmente
    } finally {
      setCnpjLoading(false)
    }
  }, [])

  // ── CNAE search ──────────────────────────────────────────────
  const handleCnaeInput = useCallback(async (val: string) => {
    set('cnaeDisplay', val)
    set('cnaeCode', '')
    set('cnaeInCatalog', false)
    if (val.length < 2) { setCnaeResults([]); setShowCnae(false); return }
    const results = await loadCnae(val)
    setCnaeResults(results)
    setShowCnae(results.length > 0)
  }, [])

  const selectCnae = (code: string, desc: string, inCatalog: boolean) => {
    set('cnaeDisplay', `${code} — ${desc}`)
    set('cnaeCode', code)
    set('cnaeInCatalog', inCatalog)
    setShowCnae(false)
    setCnaeResults([])
    setCnaeEditable(false)
  }

  // ── Validators ───────────────────────────────────────────────
  const validateStep1 = () => {
    const e: Record<string, string> = {}
    if (!validateCNPJ(form.cnpj))    e.cnpj        = 'CNPJ inválido. Verifique e tente novamente.'
    if (!form.companyName.trim())     e.companyName  = 'Informe o nome da empresa.'
    if (!form.cnaeCode)               e.cnaeDisplay  = 'Selecione o CNAE da empresa na lista.'
    if (!form.employees)              e.employees    = 'Informe o número de funcionários.'
    if (form.usesMachines === null)   e.usesMachines    = 'Responda esta pergunta.'
    if (form.usesChemicals === null)  e.usesChemicals   = 'Responda esta pergunta.'
    if (form.worksAtHeight === null)  e.worksAtHeight   = 'Responda esta pergunta.'
    if (form.hasExternalWork === null) e.hasExternalWork = 'Responda esta pergunta.'
    if (!form.declaration)            e.declaration  = 'Aceite a declaração para continuar.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const validateStep2 = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim())             e.name     = 'Informe seu nome.'
    if (!validateEmail(form.email))    e.email    = 'Informe um e-mail válido.'
    if (!validatePhone(form.whatsapp)) e.whatsapp = 'Informe um WhatsApp válido.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── Step handlers ────────────────────────────────────────────
  const handleStep1 = () => {
    if (!validateStep1()) return
    track('eligibility_started', utmRef.current)
    track('eligibility_step_completed', { step: 1, ...utmRef.current })
    setStep(2)
  }

  const handleSubmit = async () => {
    if (!validateStep2()) return
    setLoading(true)
    setErrors(e => { const n = { ...e }; delete n.generic; return n })

    // Vínculo com o parceiro indicador desde a captura (?ref=CODE → sessionStorage)
    const partnerRef = typeof window !== 'undefined'
      ? sessionStorage.getItem('sublime_partner_ref') ?? undefined
      : undefined

    try {
      // Lead e assessment precisam estar salvos ANTES de mostrar qualquer
      // resultado — se qualquer um falhar, não avança (evita cadastro
      // sem EligibilityAssessment, causa raiz do fallback de preço errado).
      const leadRes = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cnpj: form.cnpj, companyName: form.companyName,
          name: form.name, email: form.email, whatsapp: form.whatsapp,
          partnerRef,
        }),
      })
      const leadData = await leadRes.json()
      if (!leadRes.ok || !leadData.success) throw new Error('lead')

      track('lead_captured', utmRef.current)
      track('eligibility_step_completed', { step: 2, ...utmRef.current })

      const engineResult = runEngine({
        cnaeCode: form.cnaeCode, cnaeInCatalog: form.cnaeInCatalog,
        employees: form.employees,
        usesMachines: form.usesMachines!,   usesChemicals: form.usesChemicals!,
        worksAtHeight: form.worksAtHeight!, hasExternalWork: form.hasExternalWork!,
      })

      const assessRes = await fetch('/api/eligibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cnpj: form.cnpj, companyName: form.companyName,
          name: form.name, email: form.email, whatsapp: form.whatsapp,
          cnae: form.cnaeDisplay, cnaeCode: form.cnaeCode,
          employees: form.employees,
          usesMachines: form.usesMachines, usesChemicals: form.usesChemicals,
          worksAtHeight: form.worksAtHeight, hasExternalWork: form.hasExternalWork,
          declaration: form.declaration,
          partnerRef,
        }),
      })
      const assessData = await assessRes.json()
      if (!assessRes.ok || !assessData.success) throw new Error('assessment')

      setResult(engineResult)

      if (engineResult.eligible) {
        track('eligibility_result_eligible', { employees: form.employees, ...utmRef.current })
        setStep('eligible')
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('sublime_eligibility', JSON.stringify({
            ...form, promoEnd,
          }))
        }
      } else {
        track('eligibility_result_custom_quote', {
          reasons: engineResult.reasons.join(','), ...utmRef.current,
        })
        setStep('backoffice')
      }
    } catch {
      setErrors(e => ({ ...e, generic: 'Não foi possível salvar sua avaliação agora. Verifique sua conexão e tente novamente.' }))
    } finally {
      setLoading(false)
    }
  }

  const handleStartRegistration = () => {
    if (!contractAccepted) {
      setContractError('Leia e aceite o contrato de prestação de serviços para continuar.')
      return
    }
    const employees = form.employees as '1-5' | '6-10' | '11-20'
    const selectedPlan = PLAN_TYPES[planType].plans[employees]
    if (typeof window !== 'undefined') {
      const partnerRef = sessionStorage.getItem('sublime_partner_ref')
      sessionStorage.setItem('sublime_eligibility', JSON.stringify({
        ...form,
        plan: { ...selectedPlan, planType, planName: PLAN_TYPES[planType].name },
        planType,
        ltcatAddon,
        promoEnd,
        partnerRef: partnerRef ?? undefined,
        contractAccepted: true,
        contractAcceptedAt: new Date().toISOString(),
      }))
    }
    track('registration_started', { planType, employees, ltcatAddon, ...utmRef.current })
    router.push('/cadastro')
  }

  const progress = step === 1 ? 50 : 100

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6">
        <div className="max-w-[600px] mx-auto">

          {/* Progress */}
          {typeof step === 'number' && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                {[
                  { n: 1, label: 'Sua empresa' },
                  { n: 2, label: 'Seu contato' },
                ].map((s, i) => (
                  <div key={s.n} className="flex items-center gap-2 flex-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 transition-colors ${
                      (step as number) > s.n ? 'bg-teal text-white' :
                      step === s.n ? 'bg-petrol text-white' :
                      'bg-gray-200 text-gray-500'
                    }`}>
                      {(step as number) > s.n ? <CheckCircle size={14} /> : s.n}
                    </div>
                    <span className={`text-[12px] font-medium ${step === s.n ? 'text-petrol' : 'text-gray-400'}`}>
                      {s.label}
                    </span>
                    {i < 1 && <div className="flex-1 h-px bg-gray-200 mx-2" />}
                  </div>
                ))}
              </div>
              <div className="h-1 bg-gray-200 rounded-full overflow-hidden mt-2">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #1a9e8c, #4dbfb0)' }} />
              </div>
            </div>
          )}

          <div className="bg-white rounded-brand-lg border border-gray-200 p-7 sm:p-9 shadow-brand">

            {/* ══ ETAPA 1 — Empresa + perfil operacional ══ */}
            {step === 1 && (
              <div>
                <span className="section-tag text-[11px]">Etapa 1 — Sua empresa</span>
                <h2 className="font-display text-2xl text-gray-900 mb-2">Vamos identificar sua empresa</h2>
                <p className="text-[14px] text-gray-500 mb-7">
                  Informe o CNPJ e responda algumas perguntas para descobrir se sua empresa é elegível.
                </p>

                {/* CNPJ */}
                <div className="mb-4">
                  <label className="form-label required">CNPJ</label>
                  <div className="relative">
                    <input
                      className={`form-input pr-10 ${errors.cnpj ? 'error' : ''}`}
                      placeholder="00.000.000/0000-00"
                      value={form.cnpj}
                      inputMode="numeric"
                      maxLength={18}
                      onChange={e => set('cnpj', maskCNPJ(e.target.value))}
                      onBlur={e => lookupCNPJ(e.target.value)}
                    />
                    {cnpjLoading && (
                      <Loader2 size={16} className="absolute right-3 top-3.5 text-teal animate-spin" />
                    )}
                  </div>
                  {errors.cnpj && <p className="text-[12px] text-red-500 mt-1">{errors.cnpj}</p>}
                  {cnpjLoading && (
                    <p className="text-[12px] text-teal mt-1">Buscando dados na Receita Federal...</p>
                  )}
                </div>

                {/* Razão social */}
                <div className="mb-5">
                  <label className="form-label required">Nome da empresa</label>
                  <input
                    className={`form-input ${errors.companyName ? 'error' : ''}`}
                    placeholder="Preenchido automaticamente ou digite aqui"
                    value={form.companyName}
                    onChange={e => set('companyName', e.target.value)}
                  />
                  {errors.companyName && <p className="text-[12px] text-red-500 mt-1">{errors.companyName}</p>}
                </div>

                {/* CNAE */}
                <div className="mb-5 relative">
                  <div className="flex items-center gap-2 mb-1">
                    <label className="form-label required mb-0">CNAE principal</label>
                    <button
                      type="button"
                      onClick={() => setShowCnaeHelp(v => !v)}
                      className="text-gray-400 hover:text-teal transition-colors"
                      aria-label="O que é CNAE?"
                    >
                      <HelpCircle size={15} />
                    </button>
                  </div>

                  {/* Painel de ajuda CNAE */}
                  {showCnaeHelp && (
                    <div className="bg-blue-50 border border-blue-200 rounded-[10px] p-4 mb-3">
                      <p className="text-[13px] font-semibold text-blue-800 mb-1">O que é o CNAE?</p>
                      <p className="text-[13px] text-blue-700 mb-2">
                        É o código que classifica a atividade econômica da sua empresa. Você encontra:
                      </p>
                      <ul className="text-[13px] text-blue-700 space-y-1 mb-2">
                        <li>• No cartão do CNPJ (impresso ou no site da Receita Federal)</li>
                        <li>• No contrato social ou estatuto da empresa</li>
                      </ul>
                      <a
                        href="https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/Cnpjreva_Solicitacao.asp"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[13px] text-blue-600 underline"
                      >
                        Consultar meu CNPJ na Receita Federal →
                      </a>
                    </div>
                  )}

                  {/* Campo CNAE — preenchido ou editável */}
                  {form.cnaeCode && !cnaeEditable ? (
                    <div className="flex items-center justify-between p-3 bg-teal-pale border border-teal rounded-[8px]">
                      <div className="flex-1 min-w-0">
                        <span className="text-[12px] font-bold text-teal">{form.cnaeCode}</span>
                        <span className="text-[13px] text-gray-700 ml-2 leading-snug">
                          {form.cnaeDisplay.split('—')[1]?.trim() ?? ''}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setCnaeEditable(true); set('cnaeCode', ''); set('cnaeDisplay', '') }}
                        className="ml-3 flex items-center gap-1 text-[12px] text-teal hover:underline shrink-0"
                      >
                        <Pencil size={12} /> Alterar
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search size={15} className="absolute left-3.5 top-3.5 text-gray-400 pointer-events-none" />
                      <input
                        className={`form-input pl-9 ${errors.cnaeDisplay ? 'error' : ''}`}
                        placeholder="Digite o código ou nome da atividade"
                        value={form.cnaeDisplay}
                        onChange={e => handleCnaeInput(e.target.value)}
                        onFocus={() => cnaeResults.length > 0 && setShowCnae(true)}
                      />
                    </div>
                  )}

                  {showCnae && (
                    <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-[8px] mt-1 max-h-52 overflow-y-auto shadow-brand">
                      {cnaeResults.map(c => (
                        <div key={c.code}
                          className="px-4 py-2.5 cursor-pointer hover:bg-teal-pale border-b border-gray-100 last:border-0 transition-colors"
                          onClick={() => selectCnae(c.code, c.desc, true)}>
                          <div className="text-[12px] font-bold text-teal">{c.code}</div>
                          <div className="text-[13px] text-gray-700">{c.desc}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {errors.cnaeDisplay && <p className="text-[12px] text-red-500 mt-1">{errors.cnaeDisplay}</p>}
                  {!form.cnaeCode && (
                    <p className="text-[12px] text-gray-400 mt-1">
                      Digite o código CNAE ou parte da descrição da atividade e selecione na lista.
                    </p>
                  )}
                </div>

                {/* Funcionários */}
                <div className="mb-5">
                  <label className="form-label required">Número de funcionários CLT</label>
                  <div className="flex flex-wrap gap-2">
                    {EMPLOYEE_OPTIONS.map(opt => (
                      <label key={opt.value}
                        className={`flex items-center gap-2 px-4 py-2.5 border rounded-[8px] cursor-pointer transition-all flex-1 min-w-[90px] ${
                          form.employees === opt.value ? 'border-teal bg-teal-pale' : 'border-gray-200 hover:border-teal'
                        }`}>
                        <input type="radio" name="employees" value={opt.value}
                          checked={form.employees === opt.value}
                          onChange={() => set('employees', opt.value)} className="accent-teal" />
                        <span className="text-[14px] font-medium">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                  {errors.employees && <p className="text-[12px] text-red-500 mt-1">{errors.employees}</p>}
                </div>

                {/* Perguntas de risco */}
                <div className="bg-gray-50 rounded-[12px] p-5 mb-5 space-y-4">
                  <p className="text-[13px] font-semibold text-gray-700">Responda com atenção:</p>
                  {RADIO_Q.map(({ key, label }) => (
                    <div key={key}>
                      <label className="form-label">{label}</label>
                      <div className="flex gap-3">
                        {[{ v: true, l: 'Sim' }, { v: false, l: 'Não' }].map(({ v, l }) => (
                          <label key={l}
                            className={`flex items-center gap-2 px-4 py-2.5 border rounded-[8px] cursor-pointer transition-all flex-1 ${
                              form[key] === v ? 'border-teal bg-teal-pale' : 'border-gray-200 hover:border-teal'
                            }`}>
                            <input type="radio" name={key} checked={form[key] === v}
                              onChange={() => set(key, v)} className="accent-teal" />
                            <span className="text-[14px] font-medium">{l}</span>
                          </label>
                        ))}
                      </div>
                      {errors[key] && <p className="text-[12px] text-red-500 mt-1">{errors[key]}</p>}
                    </div>
                  ))}
                </div>

                {/* Declaração */}
                <div className={`flex items-start gap-3 p-4 rounded-[8px] border mb-6 ${
                  errors.declaration ? 'border-red-300 bg-red-50' : 'bg-gray-50 border-gray-200'
                }`}>
                  <input type="checkbox" id="declaration" checked={form.declaration}
                    onChange={e => set('declaration', e.target.checked)}
                    className="w-4 h-4 mt-0.5 accent-teal shrink-0 cursor-pointer" />
                  <label htmlFor="declaration" className="text-[13px] text-gray-700 leading-snug cursor-pointer">
                    Declaro que as informações prestadas são verdadeiras e compreendo que alterações nas condições da empresa devem ser comunicadas à Sublime SST.
                  </label>
                </div>
                {errors.declaration && <p className="text-[12px] text-red-500 -mt-4 mb-4">{errors.declaration}</p>}

                <button className="btn btn-primary w-full" onClick={handleStep1}>
                  Continuar <ArrowRight size={18} />
                </button>
              </div>
            )}

            {/* ══ ETAPA 2 — Contato ══ */}
            {step === 2 && (
              <div>
                <span className="section-tag text-[11px]">Etapa 2 — Seu contato</span>
                <h2 className="font-display text-2xl text-gray-900 mb-2">Quase lá! Informe seus dados</h2>
                <p className="text-[14px] text-gray-500 mb-7">
                  Usaremos seus dados apenas para enviar o resultado e, se necessário, entrar em contato.
                </p>
                <div className="mb-4">
                  <label className="form-label required">Nome completo</label>
                  <input className={`form-input ${errors.name ? 'error' : ''}`}
                    placeholder="Seu nome" value={form.name}
                    autoComplete="name"
                    onChange={e => set('name', e.target.value)} />
                  {errors.name && <p className="text-[12px] text-red-500 mt-1">{errors.name}</p>}
                </div>
                <div className="flex flex-col sm:grid sm:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="form-label required">E-mail</label>
                    <input className={`form-input ${errors.email ? 'error' : ''}`}
                      type="email" placeholder="seu@email.com" value={form.email}
                      autoComplete="email" inputMode="email"
                      onChange={e => set('email', e.target.value)} />
                    {errors.email && <p className="text-[12px] text-red-500 mt-1">{errors.email}</p>}
                  </div>
                  <div>
                    <label className="form-label required">WhatsApp</label>
                    <input className={`form-input ${errors.whatsapp ? 'error' : ''}`}
                      placeholder="(21) 99999-9999" value={form.whatsapp}
                      inputMode="tel" autoComplete="tel"
                      onChange={e => set('whatsapp', maskPhone(e.target.value))} maxLength={15} />
                    {errors.whatsapp && <p className="text-[12px] text-red-500 mt-1">{errors.whatsapp}</p>}
                  </div>
                </div>
                {errors.generic && (
                  <p className="text-[13px] text-red-600 mb-4 p-3 bg-red-50 rounded-[8px]">{errors.generic}</p>
                )}
                <div className="flex gap-3">
                  <button className="btn btn-ghost" onClick={() => setStep(1)}>
                    <ArrowLeft size={16} /> Voltar
                  </button>
                  <button className="btn btn-primary flex-1" onClick={handleSubmit} disabled={loading}>
                    {loading
                      ? <><span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />Analisando...</>
                      : <><CheckCircle size={18} /> Ver Resultado</>
                    }
                  </button>
                </div>
              </div>
            )}

            {/* ══ RESULTADO ELEGÍVEL ══ */}
            {step === 'eligible' && result && (() => {
              const employees = form.employees as '1-5' | '6-10' | '11-20'
              const currentPlan = PLAN_TYPES[planType].plans[employees]
              const implantacaoNormal = maskCurrencyBRL(currentPlan.implantacao)
              const implantacaoPromo  = maskCurrencyBRL(currentPlan.implantacaoPromo)
              const economia = maskCurrencyBRL(currentPlan.implantacao - currentPlan.implantacaoPromo)

              return (
                <div>
                  <div className="bg-green-50 border border-green-200 rounded-[12px] p-5 mb-5">
                    <div className="text-2xl mb-2">✅</div>
                    <h3 className="text-[17px] font-bold text-green-800 mb-1">
                      Sua empresa é elegível para o Sublime Digital.
                    </h3>
                    <p className="text-[13px] text-green-700">
                      Escolha o plano abaixo e inicie sua regularização agora.
                    </p>
                  </div>

                  {/* Timer promo */}
                  <div className="bg-amber-50 border border-amber-300 rounded-[12px] p-4 mb-5 flex items-center gap-3">
                    <Clock size={18} className="text-amber-600 shrink-0" />
                    <div>
                      <p className="text-[13px] font-bold text-amber-800">
                        🎁 Implantação com 50% de desconto — economize {economia}
                      </p>
                      <p className="text-[12px] text-amber-700 mt-0.5">
                        Oferta válida por: <span className="font-mono font-bold">{countdown}</span>
                      </p>
                    </div>
                  </div>

                  {/* Seletor de plano */}
                  <div className="mb-5">
                    <p className="text-[13px] font-semibold text-gray-700 mb-3">Escolha seu plano:</p>
                    <div className="grid grid-cols-2 gap-3">
                      {(['essencial', 'premium'] as PlanType[]).map(pt => {
                        const p = PLAN_TYPES[pt]
                        const pl = p.plans[employees]
                        const selected = planType === pt
                        return (
                          <button
                            key={pt}
                            type="button"
                            onClick={() => setPlanType(pt)}
                            className={`text-left p-4 rounded-[12px] border-2 transition-all ${
                              selected
                                ? pt === 'premium'
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-teal bg-teal-pale'
                                : 'border-gray-200 hover:border-gray-300 bg-white'
                            }`}
                          >
                            <div className={`text-[12px] font-bold uppercase tracking-wide mb-1 ${
                              selected ? (pt === 'premium' ? 'text-blue-600' : 'text-teal') : 'text-gray-500'
                            }`}>
                              {pt === 'premium' ? '⭐ ' : ''}{p.name}
                            </div>
                            <div className={`text-[20px] font-bold ${selected ? (pt === 'premium' ? 'text-blue-700' : 'text-petrol') : 'text-gray-700'}`}>
                              {maskCurrencyBRL(pl.monthly)}
                              <span className="text-[12px] font-normal text-gray-500">/mês</span>
                            </div>
                            <div className="text-[11px] text-gray-500 mt-1">{p.tagline}</div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Detalhe do plano selecionado */}
                  <div className="border border-gray-200 rounded-[12px] p-5 mb-1">
                    <h4 className="text-[13px] font-semibold text-gray-700 mb-3">
                      📊 {PLAN_TYPES[planType].name} — {currentPlan.label}
                    </h4>
                    {[
                      { l: 'Mensalidade', v: maskCurrencyBRL(currentPlan.monthly), highlight: true },
                      { l: 'Implantação normal', v: implantacaoNormal },
                      { l: '🎁 Implantação promo 24h', v: implantacaoPromo, promo: true },
                    ].map(r => (
                      <div key={r.l}
                        className={`flex justify-between items-center py-2.5 border-b border-gray-100 last:border-0 ${r.promo ? 'bg-green-50 rounded-[8px] px-3 -mx-3 border-0' : ''}`}>
                        <span className={`text-[13px] ${r.promo ? 'text-green-800 font-semibold' : 'text-gray-500'}`}>{r.l}</span>
                        <span className={`text-[14px] font-semibold ${r.highlight ? 'text-teal text-[17px]' : r.promo ? 'text-green-700' : 'text-gray-900'}`}>{r.v}</span>
                      </div>
                    ))}

                    {/* Inclusos resumidos */}
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <p className="text-[12px] font-semibold text-gray-600 mb-2">Incluso na implantação:</p>
                      {['PGR + LPP (modelo GR1)', 'PCMSO — documento + médico coordenador', 'Declaração técnica de ausência de insalubridade', 'Ordens de Serviço + Fichas de EPI'].map(item => (
                        <div key={item} className="flex items-center gap-2 text-[12px] text-gray-600 mb-1">
                          <CheckCircle size={12} className="text-teal shrink-0" /> {item}
                        </div>
                      ))}
                      <p className="text-[12px] font-semibold text-gray-600 mb-2 mt-3">Incluso na gestão mensal:</p>
                      {['Gestão eSocial SST (S-2210, S-2220, S-2240)', 'Monitoramento de exames periódicos', 'Portal do cliente com documentos'].map(item => (
                        <div key={item} className="flex items-center gap-2 text-[12px] text-gray-600 mb-1">
                          <CheckCircle size={12} className="text-teal shrink-0" /> {item}
                        </div>
                      ))}
                      {planType === 'premium' && (
                        <>
                          <p className="text-[12px] font-semibold text-blue-700 mb-2 mt-3">Exclusivo Premium:</p>
                          {['PPP de novos funcionários incluso', 'Abertura de CAT (até 1/mês)', 'Relatório analítico semestral', 'Suporte WhatsApp — resposta em 24h'].map(item => (
                            <div key={item} className="flex items-center gap-2 text-[12px] text-blue-700 mb-1">
                              <CheckCircle size={12} className="text-blue-500 shrink-0" /> {item}
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-gray-400 mb-5 mt-1 leading-relaxed">
                    * Assinatura anual com renovação automática. Cancelamento disponível antes da data de renovação.
                  </p>

                  {/* Add-on LTCAT — apenas Essencial, todas as empresas elegíveis qualificam */}
                  {planType === 'essencial' && (
                    <div className="p-4 rounded-[10px] border border-blue-200 bg-blue-50 mb-4">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id="ltcatAddon"
                          checked={ltcatAddon}
                          onChange={e => setLtcatAddon(e.target.checked)}
                          className="w-4 h-4 mt-0.5 accent-teal shrink-0 cursor-pointer"
                        />
                        <label htmlFor="ltcatAddon" className="text-[13px] text-blue-800 leading-snug cursor-pointer">
                          <span className="font-semibold">LTCAT disponível como serviço adicional</span>
                          {' '}— R$ 450,00 (cobrado separadamente)
                          <span className="block text-[11px] text-blue-600 mt-1">
                            Laudo Técnico das Condições Ambientais do Trabalho. Necessário para histórico previdenciário e PPP. Incluso no plano Premium.
                          </span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Aceite de contrato */}
                  <div className={`p-4 rounded-[10px] border mb-2 ${
                    contractError ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
                  }`}>
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="contractAccepted"
                        checked={contractAccepted}
                        onChange={e => {
                          setContractAccepted(e.target.checked)
                          if (e.target.checked) setContractError('')
                        }}
                        className="w-4 h-4 mt-0.5 accent-teal shrink-0 cursor-pointer"
                      />
                      <label htmlFor="contractAccepted" className="text-[13px] text-gray-700 leading-snug cursor-pointer">
                        <Shield size={13} className="inline mr-1 text-teal" />
                        Li e aceito o{' '}
                        <Link href="/termos" target="_blank" className="text-teal underline">
                          Contrato de Prestação de Serviços
                        </Link>
                        {' '}do Sublime Digital — {PLAN_TYPES[planType].name}, {currentPlan.label}.
                        Compreendo que o contrato entra em vigor após a confirmação do pagamento da implantação.
                      </label>
                    </div>
                  </div>
                  {contractError && (
                    <p className="text-[12px] text-red-500 mb-4 ml-1">{contractError}</p>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 mt-4">
                    <button
                      className="btn btn-primary flex-1"
                      onClick={handleStartRegistration}
                    >
                      <ArrowRight size={18} /> Iniciar Minha Regularização
                    </button>
                    <a href="https://wa.me/5521997248630" target="_blank" rel="noopener noreferrer"
                      className="btn btn-outline-dark"
                      onClick={() => track('whatsapp_click', { origin: 'eligible_result', ...utmRef.current })}>
                      Falar no WhatsApp
                    </a>
                  </div>
                  <p className="text-[11px] text-gray-400 text-center mt-3">
                    Exclusivo para empresas GR1 com até 20 funcionários.
                    Sua assinatura fica registrada com data, hora e IP de aceite.
                  </p>
                </div>
              )
            })()}

            {/* ══ RESULTADO BACKOFFICE — encaminhamento para Consultoria ══ */}
            {step === 'backoffice' && result && (
              <div>
                <div className="bg-blue-50 border border-blue-200 rounded-[12px] p-6 mb-5">
                  <div className="text-3xl mb-3">🎯</div>
                  <h3 className="text-[18px] font-bold text-petrol mb-2">
                    Para o perfil da sua empresa, o modelo ideal é a Consultoria SST.
                  </h3>
                  <p className="text-[14px] text-blue-700">
                    Pelo CNAE, atividade ou características operacionais informadas, sua empresa precisa
                    de um atendimento técnico além do modelo digital — com laudos, avaliações e
                    acompanhamento de especialista dedicado.
                  </p>
                </div>

                {result.reasons.length > 0 && (
                  <div className="bg-gray-50 rounded-[12px] p-4 mb-5 border border-gray-200">
                    <p className="text-[12px] font-semibold text-gray-600 uppercase tracking-wide mb-3">
                      O que identificamos no seu perfil:
                    </p>
                    {result.reasons.map(r => (
                      <div key={r} className="flex items-center gap-2 text-[13px] text-amber-800 bg-amber-50 rounded-[6px] px-3 py-2 mb-1.5 last:mb-0">
                        <span>📌</span> {REASON_LABELS[r] ?? r}
                      </div>
                    ))}
                  </div>
                )}

                {/* Vantagens do consultivo */}
                <div className="bg-teal-pale border border-teal/20 rounded-[12px] p-5 mb-5">
                  <p className="text-[13px] font-semibold text-petrol mb-3">Por que o atendimento consultivo é melhor para você:</p>
                  {[
                    'Documentação completa para o seu grau de risco — PGR, PCMSO, laudos e treinamentos',
                    'Avaliação técnica presencial quando o perfil exigir',
                    'Especialista dedicado que conhece a sua operação',
                  ].map(t => (
                    <div key={t} className="flex items-start gap-2 text-[13px] text-gray-700 mb-1.5 last:mb-0">
                      <CheckCircle size={14} className="text-teal shrink-0 mt-0.5" /> {t}
                    </div>
                  ))}
                </div>

                {/* Dados já recebidos — nada de preencher de novo */}
                <div className="border border-green-200 bg-green-50 rounded-[12px] p-4 mb-6 flex items-start gap-3">
                  <CheckCircle size={16} className="text-green-600 shrink-0 mt-0.5" />
                  <p className="text-[13px] text-green-800">
                    <strong>Seus dados já foram recebidos pela nossa equipe</strong> — não precisa
                    preencher mais nada. Um especialista entra em contato por WhatsApp ou e-mail
                    em até 1 dia útil com a proposta adequada ao seu perfil.
                  </p>
                </div>

                <a href="https://wa.me/5521997248630?text=Ol%C3%A1!%20Fiz%20o%20teste%20de%20elegibilidade%20e%20fui%20direcionado%20para%20a%20Consultoria%20SST.%20Gostaria%20de%20atendimento."
                  target="_blank" rel="noopener noreferrer"
                  className="btn btn-primary w-full text-center"
                  onClick={() => track('whatsapp_click', { origin: 'backoffice_result', ...utmRef.current })}>
                  💬 Quero atendimento agora pelo WhatsApp
                </a>
                <p className="text-center mt-3">
                  <Link href="/consultoria-sst" className="text-[13px] text-teal hover:underline"
                    onClick={() => track('cta_custom_quote_click', utmRef.current)}>
                    Conhecer a Consultoria SST em detalhes →
                  </Link>
                </p>
                <div className="mt-4 text-center text-[12px] text-gray-400">
                  📞 (21) 99724-8630 · ✉️ contato@sublimesst.com
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
      <WhatsAppButton />
    </>
  )
}

// ── Page export (Suspense needed for useSearchParams) ─────────────────────────
export default function ElegibilidadePage() {
  return (
    <Suspense fallback={null}>
      <ElegibilidadeInner />
    </Suspense>
  )
}
