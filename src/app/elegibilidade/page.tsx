'use client'

import { useState, useCallback, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, ArrowRight, ArrowLeft, Search, Clock, HelpCircle, Pencil, Loader2 } from 'lucide-react'
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

// ── Motor client-side ─────────────────────────────────────────────────────────
const WHITELIST = new Set([
  '69.11-7','69.12-5','69.20-6','70.10-7','70.20-4',
  '71.11-1','71.12-0','71.19-7','73.11-4','73.12-2',
  '73.19-0','73.20-3','74.10-2','74.90-1','77.33-1',
  '78.10-8','82.11-3','66.21-5','66.22-3','68.21-8','68.22-6',
])

const PLANS: Record<string, { label: string; monthly: number; implantacao: number; implantacaoPromo: number }> = {
  '1-5':   { label: '1 a 5 funcionários',   monthly: 14200, implantacao: 19000, implantacaoPromo: 10000 },
  '6-10':  { label: '6 a 10 funcionários',  monthly: 25000, implantacao: 19000, implantacaoPromo: 10000 },
  '11-20': { label: '11 a 20 funcionários', monthly: 43000, implantacao: 19000, implantacaoPromo: 10000 },
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
  plan?: { label: string; monthly: number; implantacao: number; implantacaoPromo: number }
}

function runEngine(params: {
  cnaeCode: string; cnaeInCatalog: boolean; employees: string
  usesMachines: boolean; usesChemicals: boolean; worksAtHeight: boolean; hasExternalWork: boolean
}): EngineResult {
  const reasons: EligibilityReason[] = []
  if (params.employees === '21+') reasons.push('MAIS_DE_20_FUNCIONARIOS' as EligibilityReason)
  if (!params.cnaeInCatalog) {
    reasons.push('CNAE_NAO_GR1' as EligibilityReason)
  } else if (!WHITELIST.has(params.cnaeCode)) {
    reasons.push('CNAE_PENDENTE_VALIDACAO_RT' as EligibilityReason)
  }
  if (params.usesMachines)    reasons.push('USA_MAQUINAS_INDUSTRIAIS' as EligibilityReason)
  if (params.usesChemicals)   reasons.push('MANIPULA_QUIMICOS' as EligibilityReason)
  if (params.worksAtHeight)   reasons.push('TRABALHO_EM_ALTURA' as EligibilityReason)
  if (params.hasExternalWork) reasons.push('ATIVIDADES_EXTERNAS_FREQUENTES' as EligibilityReason)
  const eligible = reasons.length === 0
  const plan = eligible && params.employees !== '21+' ? PLANS[params.employees] : undefined
  return { eligible, reasons, plan }
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
  const utmRef = useRef<Record<string, string>>({})

  useEffect(() => {
    const keys = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term']
    keys.forEach(k => {
      const v = searchParams.get(k)
      if (v) utmRef.current[k] = v
    })
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
  const [promoEnd] = useState(() => Date.now() + 24 * 60 * 60 * 1000)
  const countdown = useCountdown(promoEnd)

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

    fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cnpj: form.cnpj, companyName: form.companyName,
        name: form.name, email: form.email, whatsapp: form.whatsapp,
      }),
    }).catch(() => {})
    track('lead_captured', utmRef.current)
    track('eligibility_step_completed', { step: 2, ...utmRef.current })

    const engineResult = runEngine({
      cnaeCode: form.cnaeCode, cnaeInCatalog: form.cnaeInCatalog,
      employees: form.employees,
      usesMachines: form.usesMachines!,   usesChemicals: form.usesChemicals!,
      worksAtHeight: form.worksAtHeight!, hasExternalWork: form.hasExternalWork!,
    })

    setResult(engineResult)

    if (engineResult.eligible) {
      track('eligibility_result_eligible', { plan: engineResult.plan?.label, ...utmRef.current })
      setStep('eligible')
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('sublime_eligibility', JSON.stringify({
          ...form, plan: engineResult.plan, promoEnd,
        }))
      }
    } else {
      track('eligibility_result_custom_quote', {
        reasons: engineResult.reasons.join(','), ...utmRef.current,
      })
      setStep('backoffice')
    }

    setLoading(false)

    fetch('/api/eligibility', {
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
      }),
    }).catch(() => {})
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

          <div className="bg-white rounded-[20px] border border-gray-200 p-7 sm:p-9"
            style={{ boxShadow: '0 4px 16px rgba(0,0,0,.08)' }}>

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
                    <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-[8px] mt-1 max-h-52 overflow-y-auto"
                      style={{ boxShadow: '0 4px 16px rgba(0,0,0,.08)' }}>
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
            {step === 'eligible' && result && (
              <div>
                <div className="bg-green-50 border border-green-200 rounded-[12px] p-6 mb-5">
                  <div className="text-3xl mb-3">✅</div>
                  <h3 className="text-[18px] font-bold text-green-800 mb-2">
                    Sua empresa tem características compatíveis com o Sublime Digital.
                  </h3>
                  <p className="text-[14px] text-green-700">
                    Com base nas informações fornecidas, sua empresa pode ser atendida pelo modelo digital da Sublime SST.
                  </p>
                </div>

                {result.plan && (
                  <>
                    {/* Timer de oferta */}
                    <div className="bg-amber-50 border border-amber-300 rounded-[12px] p-4 mb-5 flex items-center gap-3">
                      <Clock size={20} className="text-amber-600 shrink-0" />
                      <div>
                        <p className="text-[13px] font-bold text-amber-800">
                          🎁 Implantação com desconto: R$ 100 (em vez de R$ 190)
                        </p>
                        <p className="text-[12px] text-amber-700 mt-0.5">
                          Oferta válida por: <span className="font-mono font-bold">{countdown}</span>
                        </p>
                      </div>
                    </div>

                    {/* Plano indicado */}
                    <div className="border border-gray-200 rounded-[12px] p-5 mb-4">
                      <h4 className="text-[14px] font-semibold text-gray-700 mb-4">📊 Plano indicado</h4>
                      {[
                        { l: 'Faixa de funcionários', v: result.plan.label },
                        { l: 'Parcela mensal*', v: maskCurrencyBRL(result.plan.monthly), highlight: true },
                        { l: 'Modelo', v: 'Assinatura anual · cobrado mensalmente' },
                        { l: 'Implantação padrão', v: 'R$ 190,00' },
                        { l: '🎁 Implantação promocional (24h)', v: maskCurrencyBRL(result.plan.implantacaoPromo), promo: true },
                      ].map(row => (
                        <div key={row.l}
                          className={`flex justify-between items-center py-2.5 border-b border-gray-100 last:border-0 ${row.promo ? 'bg-green-50 rounded-[8px] px-3 -mx-3' : ''}`}>
                          <span className={`text-[14px] ${row.promo ? 'text-green-800 font-semibold' : 'text-gray-500'}`}>{row.l}</span>
                          <span className={`text-[14px] font-semibold ${row.highlight ? 'text-teal text-[18px]' : row.promo ? 'text-green-700' : 'text-gray-900'}`}>{row.v}</span>
                        </div>
                      ))}
                    </div>

                    {/* Nota legal */}
                    <p className="text-[11px] text-gray-400 mb-5 leading-relaxed">
                      * Assinatura anual com renovação automática, cobrada mensalmente. Cancelamento disponível antes da data de renovação anual.
                    </p>
                  </>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <Link href="/cadastro" className="btn btn-primary flex-1 text-center"
                    onClick={() => track('registration_started', utmRef.current)}>
                    <ArrowRight size={18} /> Iniciar Minha Regularização
                  </Link>
                  <a href="https://wa.me/5521997248630" target="_blank" rel="noopener noreferrer"
                    className="btn btn-outline-dark"
                    onClick={() => track('whatsapp_click', { origin: 'eligible_result', ...utmRef.current })}>
                    Falar no WhatsApp
                  </a>
                </div>
                <p className="text-[11px] text-gray-400 text-center mt-4">
                  Plano válido exclusivamente para empresas GR1 com até 20 funcionários aprovadas no teste.
                </p>
              </div>
            )}

            {/* ══ RESULTADO BACKOFFICE ══ */}
            {step === 'backoffice' && result && (
              <div>
                <div className="bg-blue-50 border border-blue-200 rounded-[12px] p-6 mb-5">
                  <div className="text-3xl mb-3">🔍</div>
                  <h3 className="text-[18px] font-bold text-petrol mb-2">
                    Sua empresa pode se beneficiar de uma solução personalizada.
                  </h3>
                  <p className="text-[14px] text-blue-700">
                    Nossa equipe entrará em contato para entender melhor sua operação e apresentar a proposta adequada ao seu perfil.
                  </p>
                </div>

                {result.reasons.length > 0 && (
                  <div className="bg-gray-50 rounded-[12px] p-4 mb-5 border border-gray-200">
                    <p className="text-[12px] font-semibold text-gray-600 uppercase tracking-wide mb-3">
                      Fatores identificados:
                    </p>
                    {result.reasons.map(r => (
                      <div key={r} className="flex items-center gap-2 text-[13px] text-amber-800 bg-amber-50 rounded-[6px] px-3 py-2 mb-1.5 last:mb-0">
                        <span>⚠️</span> {REASON_LABELS[r] ?? r}
                      </div>
                    ))}
                  </div>
                )}

                <div className="border border-gray-200 rounded-[12px] p-5 mb-6">
                  <p className="text-[14px] font-semibold text-gray-900 mb-4">O que acontece agora?</p>
                  {[
                    'Seus dados foram registrados e nossa equipe recebeu as informações da sua empresa.',
                    'Um especialista entrará em contato por WhatsApp ou e-mail em até 1 dia útil.',
                    'Apresentaremos a solução mais adequada ao perfil operacional da sua empresa.',
                  ].map((t, i) => (
                    <div key={i} className="flex gap-3 text-[14px] text-gray-600 mb-3 last:mb-0">
                      <span className="text-teal font-bold shrink-0">{i + 1}.</span>
                      <span>{t}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <a href="https://wa.me/5521997248630" target="_blank" rel="noopener noreferrer"
                    className="btn btn-primary flex-1 text-center"
                    onClick={() => track('whatsapp_click', { origin: 'backoffice_result', ...utmRef.current })}>
                    💬 Falar com a Equipe
                  </a>
                  <Link href="/consultoria-sst" className="btn btn-outline-dark"
                    onClick={() => track('cta_custom_quote_click', utmRef.current)}>
                    Solicitar Orçamento
                  </Link>
                </div>
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
