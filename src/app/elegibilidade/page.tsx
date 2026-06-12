'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { CheckCircle, ArrowRight, ArrowLeft, Search } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { WhatsAppButton } from '@/components/layout/WhatsAppButton'
import { maskCNPJ, maskPhone, validateCNPJ, validateEmail, validatePhone, maskCurrencyBRL } from '@/lib/utils'
import { track } from '@/lib/analytics'
import type { EmployeeRange, EligibilityReason } from '@/types'

// ── CNAE CATALOG (inline para funcionar no cliente sem depender do banco) ────
const CNAE_CATALOG: { code: string; desc: string }[] = []

// Carrega o catálogo via fetch para não inflar o bundle
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

// ── MOTOR DE ELEGIBILIDADE CLIENT-SIDE ───────────────────────────────────────
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
  cnaeCode: string
  cnaeInCatalog: boolean
  employees: string
  usesMachines: boolean
  usesChemicals: boolean
  worksAtHeight: boolean
  hasExternalWork: boolean
}): EngineResult {
  const reasons: EligibilityReason[] = []
  if (params.employees === '21+') reasons.push('MAIS_DE_20_FUNCIONARIOS' as EligibilityReason)
  if (!params.cnaeInCatalog) {
    reasons.push('CNAE_NAO_GR1' as EligibilityReason)
  } else if (!WHITELIST.has(params.cnaeCode)) {
    reasons.push('CNAE_PENDENTE_VALIDACAO_RT' as EligibilityReason)
  }
  if (params.usesMachines)   reasons.push('USA_MAQUINAS_INDUSTRIAIS' as EligibilityReason)
  if (params.usesChemicals)  reasons.push('MANIPULA_QUIMICOS' as EligibilityReason)
  if (params.worksAtHeight)  reasons.push('TRABALHO_EM_ALTURA' as EligibilityReason)
  if (params.hasExternalWork) reasons.push('ATIVIDADES_EXTERNAS_FREQUENTES' as EligibilityReason)
  const eligible = reasons.length === 0
  const plan = eligible && params.employees !== '21+' ? PLANS[params.employees] : undefined
  return { eligible, reasons, plan }
}

// ── TYPES ────────────────────────────────────────────────────────────────────
type Step = 1 | 2 | 3 | 'eligible' | 'backoffice'

interface FormState {
  cnpj: string; companyName: string; name: string; email: string; whatsapp: string
  cnaeDisplay: string; cnaeCode: string; cnaeInCatalog: boolean; employees: EmployeeRange | ''
  usesMachines: boolean | null; usesChemicals: boolean | null
  worksAtHeight: boolean | null; hasExternalWork: boolean | null
  declaration: boolean
}

const EMPLOYEE_OPTIONS: { value: EmployeeRange; label: string }[] = [
  { value: '1-5', label: '1 a 5' },
  { value: '6-10', label: '6 a 10' },
  { value: '11-20', label: '11 a 20' },
  { value: '21+', label: 'Mais de 20' },
]

const RADIO_Q = [
  { key: 'usesMachines' as const,  label: 'Sua empresa utiliza máquinas industriais?' },
  { key: 'usesChemicals' as const, label: 'Manipula produtos químicos perigosos?' },
  { key: 'worksAtHeight' as const, label: 'Possui trabalho em altura?' },
  { key: 'hasExternalWork' as const, label: 'Realiza atividades externas frequentes?' },
]

// ── COMPONENT ────────────────────────────────────────────────────────────────
export default function ElegibilidadePage() {
  const [step, setStep] = useState<Step>(1)
  const [form, setForm] = useState<FormState>({
    cnpj: '', companyName: '', name: '', email: '', whatsapp: '',
    cnaeDisplay: '', cnaeCode: '', cnaeInCatalog: false, employees: '',
    usesMachines: null, usesChemicals: null, worksAtHeight: null, hasExternalWork: null,
    declaration: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [cnaeResults, setCnaeResults] = useState<{ code: string; desc: string }[]>([])
  const [showCnae, setShowCnae] = useState(false)
  const [result, setResult] = useState<EngineResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [promoEnd] = useState(() => Date.now() + 24 * 60 * 60 * 1000)

  const set = (k: keyof FormState, v: unknown) => {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => { const n = {...e}; delete n[k]; return n })
  }

  // ── STEP VALIDATORS ──────────────────────────────────────
  const validateStep1 = () => {
    const e: Record<string, string> = {}
    if (!validateCNPJ(form.cnpj)) e.cnpj = 'CNPJ inválido. Verifique e tente novamente.'
    if (!form.companyName.trim()) e.companyName = 'Informe o nome da empresa.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const validateStep2 = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Informe seu nome.'
    if (!validateEmail(form.email)) e.email = 'Informe um e-mail válido.'
    if (!validatePhone(form.whatsapp)) e.whatsapp = 'Informe um WhatsApp válido.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── STEP HANDLERS ────────────────────────────────────────
  const handleStep1 = () => {
    if (!validateStep1()) return
    track('eligibility_started')
    setStep(2)
  }

  const handleStep2 = async () => {
    if (!validateStep2()) return
    // Save lead in background — não bloqueia o fluxo
    fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cnpj: form.cnpj, companyName: form.companyName,
        name: form.name, email: form.email, whatsapp: form.whatsapp,
      }),
    }).catch(() => {/* silently ignore if DB not ready */})
    track('lead_captured')
    setStep(3)
  }

  const handleSubmit = async () => {
    // Validate step 3
    const e: Record<string, string> = {}
    if (!form.cnaeCode) e.cnaeDisplay = 'Selecione o CNAE da empresa na lista.'
    if (!form.employees) e.employees = 'Informe o número de funcionários.'
    if (form.usesMachines === null) e.usesMachines = 'Responda esta pergunta.'
    if (form.usesChemicals === null) e.usesChemicals = 'Responda esta pergunta.'
    if (form.worksAtHeight === null) e.worksAtHeight = 'Responda esta pergunta.'
    if (form.hasExternalWork === null) e.hasExternalWork = 'Responda esta pergunta.'
    if (!form.declaration) e.declaration = 'Aceite a declaração para continuar.'
    setErrors(e)
    if (Object.keys(e).length > 0) return

    setLoading(true)

    // ✅ MOTOR RODA NO CLIENTE — resultado imediato, sem depender do banco
    const engineResult = runEngine({
      cnaeCode: form.cnaeCode,
      cnaeInCatalog: form.cnaeInCatalog,
      employees: form.employees,
      usesMachines: form.usesMachines!,
      usesChemicals: form.usesChemicals!,
      worksAtHeight: form.worksAtHeight!,
      hasExternalWork: form.hasExternalWork!,
    })

    setResult(engineResult)
    track('eligibility_completed')

    if (engineResult.eligible) {
      track('eligible_result_viewed')
      setStep('eligible')
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('sublime_eligibility', JSON.stringify({
          ...form, plan: engineResult.plan, promoEnd,
        }))
      }
    } else {
      track('backoffice_result_viewed')
      setStep('backoffice')
    }

    setLoading(false)

    // Salva no banco em segundo plano (não bloqueia o resultado)
    fetch('/api/eligibility', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cnpj: form.cnpj, companyName: form.companyName,
        name: form.name, email: form.email, whatsapp: form.whatsapp,
        cnae: form.cnaeDisplay, cnaeCode: form.cnaeCode,
        employees: form.employees,
        usesMachines: form.usesMachines,
        usesChemicals: form.usesChemicals,
        worksAtHeight: form.worksAtHeight,
        hasExternalWork: form.hasExternalWork,
        declaration: form.declaration,
      }),
    }).catch(() => {/* silently ignore if DB not ready */})
  }

  // ── CNAE SEARCH ──────────────────────────────────────────
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
  }

  const progress = step === 1 ? 25 : step === 2 ? 50 : step === 3 ? 75 : 100

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 py-12 px-6">
        <div className="max-w-[600px] mx-auto">

          {/* Progress bar */}
          {typeof step === 'number' && (
            <div className="mb-8">
              <div className="h-1 bg-gray-200 rounded-full overflow-hidden mb-2">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #1a9e8c, #4dbfb0)' }} />
              </div>
              <p className="text-[12px] text-gray-500">Etapa {step} de 3</p>
            </div>
          )}

          <div className="bg-white rounded-[20px] border border-gray-200 p-9"
            style={{ boxShadow: '0 4px 16px rgba(0,0,0,.08)' }}>

            {/* ══ ETAPA 1 ══ */}
            {step === 1 && (
              <div>
                <span className="section-tag text-[11px]">Etapa 1 — Identificação</span>
                <h2 className="font-display text-2xl text-gray-900 mb-2">Dados da empresa</h2>
                <p className="text-[15px] text-gray-500 mb-7">Precisamos de algumas informações básicas para iniciar o teste.</p>
                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div>
                    <label className="form-label required">CNPJ</label>
                    <input className={`form-input ${errors.cnpj ? 'error' : ''}`}
                      placeholder="00.000.000/0000-00" value={form.cnpj}
                      onChange={e => set('cnpj', maskCNPJ(e.target.value))} maxLength={18} />
                    {errors.cnpj && <p className="text-[12px] text-red-500 mt-1">{errors.cnpj}</p>}
                  </div>
                  <div>
                    <label className="form-label required">Nome da empresa</label>
                    <input className={`form-input ${errors.companyName ? 'error' : ''}`}
                      placeholder="Razão social ou fantasia" value={form.companyName}
                      onChange={e => set('companyName', e.target.value)} />
                    {errors.companyName && <p className="text-[12px] text-red-500 mt-1">{errors.companyName}</p>}
                  </div>
                </div>
                <button className="btn btn-primary w-full" onClick={handleStep1}>
                  Continuar <ArrowRight size={18} />
                </button>
              </div>
            )}

            {/* ══ ETAPA 2 ══ */}
            {step === 2 && (
              <div>
                <span className="section-tag text-[11px]">Etapa 2 — Contato</span>
                <h2 className="font-display text-2xl text-gray-900 mb-2">Dados do responsável</h2>
                <p className="text-[15px] text-gray-500 mb-7">Coletamos seus dados antes do resultado para entrar em contato se necessário.</p>
                <div className="mb-4">
                  <label className="form-label required">Nome completo</label>
                  <input className={`form-input ${errors.name ? 'error' : ''}`}
                    placeholder="Seu nome" value={form.name}
                    onChange={e => set('name', e.target.value)} />
                  {errors.name && <p className="text-[12px] text-red-500 mt-1">{errors.name}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div>
                    <label className="form-label required">E-mail</label>
                    <input className={`form-input ${errors.email ? 'error' : ''}`}
                      type="email" placeholder="seu@email.com" value={form.email}
                      onChange={e => set('email', e.target.value)} />
                    {errors.email && <p className="text-[12px] text-red-500 mt-1">{errors.email}</p>}
                  </div>
                  <div>
                    <label className="form-label required">WhatsApp</label>
                    <input className={`form-input ${errors.whatsapp ? 'error' : ''}`}
                      placeholder="(21) 99999-9999" value={form.whatsapp}
                      onChange={e => set('whatsapp', maskPhone(e.target.value))} maxLength={15} />
                    {errors.whatsapp && <p className="text-[12px] text-red-500 mt-1">{errors.whatsapp}</p>}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button className="btn btn-ghost" onClick={() => setStep(1)}><ArrowLeft size={16} /> Voltar</button>
                  <button className="btn btn-primary flex-1" onClick={handleStep2}>
                    Continuar <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* ══ ETAPA 3 ══ */}
            {step === 3 && (
              <div>
                <span className="section-tag text-[11px]">Etapa 3 — Perfil operacional</span>
                <h2 className="font-display text-2xl text-gray-900 mb-2">Sobre as atividades da empresa</h2>
                <p className="text-[15px] text-gray-500 mb-7">Responda com honestidade. As informações determinam o modelo de atendimento mais adequado.</p>

                {/* CNAE search */}
                <div className="mb-5 relative">
                  <label className="form-label required">CNAE principal</label>
                  <div className="relative">
                    <Search size={15} className="absolute left-3.5 top-3.5 text-gray-400 pointer-events-none" />
                    <input className={`form-input pl-9 ${errors.cnaeDisplay ? 'error' : ''}`}
                      placeholder="Digite o código ou nome da atividade"
                      value={form.cnaeDisplay}
                      onChange={e => handleCnaeInput(e.target.value)}
                      onFocus={() => cnaeResults.length > 0 && setShowCnae(true)}
                    />
                  </div>
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
                  <p className="text-[12px] text-gray-500 mt-1">Digite o código CNAE ou parte da descrição e selecione na lista.</p>
                </div>

                {/* Employees */}
                <div className="mb-5">
                  <label className="form-label required">Número de funcionários</label>
                  <div className="flex flex-wrap gap-2">
                    {EMPLOYEE_OPTIONS.map(opt => (
                      <label key={opt.value}
                        className={`flex items-center gap-2 px-4 py-2.5 border rounded-[8px] cursor-pointer transition-all flex-1 min-w-[90px] ${form.employees === opt.value ? 'border-teal bg-teal-pale' : 'border-gray-200 hover:border-teal'}`}>
                        <input type="radio" name="employees" value={opt.value}
                          checked={form.employees === opt.value}
                          onChange={() => set('employees', opt.value)} className="accent-teal" />
                        <span className="text-[14px] font-medium">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                  {errors.employees && <p className="text-[12px] text-red-500 mt-1">{errors.employees}</p>}
                </div>

                {/* Critical questions */}
                <div className="bg-gray-50 rounded-[12px] p-5 mb-5 space-y-4">
                  <p className="text-[13px] font-semibold text-gray-700">Responda com atenção:</p>
                  {RADIO_Q.map(({ key, label }) => (
                    <div key={key}>
                      <label className="form-label">{label}</label>
                      <div className="flex gap-3">
                        {[{ v: true, l: 'Sim' }, { v: false, l: 'Não' }].map(({ v, l }) => (
                          <label key={l}
                            className={`flex items-center gap-2 px-4 py-2.5 border rounded-[8px] cursor-pointer transition-all flex-1 ${form[key] === v ? 'border-teal bg-teal-pale' : 'border-gray-200 hover:border-teal'}`}>
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

                {/* Declaration */}
                <div className={`flex items-start gap-3 p-4 rounded-[8px] border mb-6 ${errors.declaration ? 'border-red-300 bg-red-50' : 'bg-gray-50 border-gray-200'}`}>
                  <input type="checkbox" id="declaration" checked={form.declaration}
                    onChange={e => set('declaration', e.target.checked)}
                    className="w-4 h-4 mt-0.5 accent-teal shrink-0 cursor-pointer" />
                  <label htmlFor="declaration" className="text-[13px] text-gray-700 leading-snug cursor-pointer">
                    Declaro que as informações prestadas são verdadeiras e compreendo que alterações nas condições da empresa devem ser comunicadas à Sublime SST.
                  </label>
                </div>
                {errors.declaration && <p className="text-[12px] text-red-500 -mt-4 mb-4">{errors.declaration}</p>}

                <div className="flex gap-3">
                  <button className="btn btn-ghost" onClick={() => setStep(2)}><ArrowLeft size={16} /> Voltar</button>
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
                <div className="bg-green-50 border border-green-200 rounded-[12px] p-6 mb-6">
                  <div className="text-3xl mb-3">✅</div>
                  <h3 className="text-[18px] font-bold text-green-800 mb-2">
                    Sua empresa apresenta características compatíveis com o modelo digital da Sublime SST.
                  </h3>
                  <p className="text-[14px] text-green-700">
                    Com base nas informações fornecidas, sua empresa pode ser atendida pelo Sublime Digital.
                  </p>
                </div>

                {result.plan && (
                  <>
                    <div className="bg-amber-50 border border-amber-300 rounded-[12px] p-4 mb-5 flex items-center gap-3">
                      <span className="text-xl">🎁</span>
                      <p className="text-[13px] text-amber-800">
                        Implantação com desconto: <strong>R$ 100 (em vez de R$ 190)</strong> se iniciar o cadastro em 24 horas.
                      </p>
                    </div>
                    <div className="border border-gray-200 rounded-[12px] p-5 mb-6">
                      <h4 className="text-[14px] font-semibold text-gray-700 mb-4">📊 Plano indicado</h4>
                      {[
                        { l: 'Faixa de funcionários', v: result.plan.label },
                        { l: 'Mensalidade', v: maskCurrencyBRL(result.plan.monthly), highlight: true },
                        { l: 'Modelo', v: 'Plano anual com cobrança mensal' },
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
                  </>
                )}

                <div className="flex gap-3">
                  <Link href="/cadastro" className="btn btn-primary flex-1">
                    <ArrowRight size={18} /> Iniciar Minha Regularização
                  </Link>
                  <a href="https://wa.me/5521997248630" target="_blank" rel="noopener noreferrer"
                    className="btn btn-outline-dark">Falar com a Equipe</a>
                </div>
              </div>
            )}

            {/* ══ RESULTADO BACKOFFICE ══ */}
            {step === 'backoffice' && result && (
              <div>
                <div className="bg-blue-50 border border-blue-200 rounded-[12px] p-6 mb-6">
                  <div className="text-3xl mb-3">🔍</div>
                  <h3 className="text-[18px] font-bold text-petrol mb-2">
                    Sua empresa pode exigir uma análise técnica mais personalizada.
                  </h3>
                  <p className="text-[14px] text-blue-700">
                    Nossa equipe da Sublime SST entrará em contato para entender melhor sua operação e apresentar a solução mais adequada.
                  </p>
                </div>

                {result.reasons.length > 0 && (
                  <div className="bg-gray-50 rounded-[12px] p-4 mb-5 border border-gray-200">
                    <p className="text-[12px] font-semibold text-gray-600 uppercase tracking-wide mb-3">Fatores identificados:</p>
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
                    'Seus dados foram registrados e nossa equipe receberá as informações da sua empresa.',
                    'Um especialista da Sublime SST entrará em contato por WhatsApp ou e-mail em até 1 dia útil.',
                    'Apresentaremos a solução mais adequada para o perfil operacional da sua empresa.',
                  ].map((t, i) => (
                    <div key={i} className="flex gap-3 text-[14px] text-gray-600 mb-3 last:mb-0">
                      <span className="text-teal font-bold shrink-0">{i + 1}.</span>
                      <span>{t}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <a href="https://wa.me/5521997248630" target="_blank" rel="noopener noreferrer"
                    className="btn btn-primary flex-1">Falar com a Equipe</a>
                  <Link href="/" className="btn btn-outline-dark">Voltar ao início</Link>
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
