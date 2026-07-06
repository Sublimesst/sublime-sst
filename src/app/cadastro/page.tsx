'use client'

import { useState, useEffect } from 'react'
import { ArrowRight, ArrowLeft } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { WhatsAppButton } from '@/components/layout/WhatsAppButton'
import { maskPhone, maskCEP, maskCurrencyBRL } from '@/lib/utils'
import { track } from '@/lib/analytics'

const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

export default function CadastroPage() {
  const [form, setForm] = useState({
    razaoSocial: '', nomeFantasia: '', responsavel: '', email: '', whatsapp: '',
    cep: '', cidade: '', estado: 'RJ', endereco: '',
    numFuncionarios: '', cargos: '', observations: '',
    consentDataUsage: false, consentDeclaration: false, consentTerms: false,
  })
  const [plan, setPlan] = useState<{ monthly: number; implantacaoPromo: number; label: string; planType?: string; planName?: string } | null>(null)
  const [planType, setPlanType] = useState<'essencial' | 'premium'>('essencial')
  const [faixa, setFaixa] = useState<'1-5' | '6-10' | '11-20' | null>(null)
  const [ltcatAddon, setLtcatAddon] = useState(false)
  const [partnerRef, setPartnerRef] = useState<string | undefined>()
  const [contractAccepted, setContractAccepted] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [asaasUrl, setAsaasUrl] = useState<string | null>(null)

  useEffect(() => {
    track('registration_page_viewed')
    const stored = typeof window !== 'undefined' ? sessionStorage.getItem('sublime_eligibility') : null
    if (stored) {
      const data = JSON.parse(stored)
      setForm(f => ({
        ...f,
        razaoSocial: data.companyName || '',
        responsavel: data.name || '',
        email: data.email || '',
        whatsapp: data.whatsapp || '',
      }))
      if (data.plan) setPlan(data.plan)
      if (data.planType) setPlanType(data.planType)
      if (data.employees === '1-5' || data.employees === '6-10' || data.employees === '11-20') setFaixa(data.employees)
      if (data.ltcatAddon) setLtcatAddon(true)
      if (data.partnerRef) setPartnerRef(data.partnerRef)
      if (data.contractAccepted) setContractAccepted(true)
    }
  }, [])

  const set = (k: string, v: unknown) => {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => ({ ...e, [k]: '' }))
  }

  // Preenche cidade/estado/endereço automaticamente a partir do CEP (ViaCEP)
  const lookupCEP = async (cep: string) => {
    const digits = cep.replace(/\D/g, '')
    if (digits.length !== 8) return
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setForm(f => ({
          ...f,
          cidade: data.localidade || f.cidade,
          estado: data.uf || f.estado,
          // não sobrescreve endereço já digitado; usuário completa o número
          endereco: f.endereco || [data.logradouro, data.bairro].filter(Boolean).join(', '),
        }))
        setErrors(e => ({ ...e, cidade: '', estado: '', endereco: '' }))
      }
    } catch { /* offline/erro do ViaCEP — usuário preenche manualmente */ }
  }

  // Opções de nº de funcionários limitadas à faixa escolhida na elegibilidade
  const FAIXA_RANGE: Record<string, [number, number]> = { '1-5': [1, 5], '6-10': [6, 10], '11-20': [11, 20] }
  const [minFunc, maxFunc] = faixa ? FAIXA_RANGE[faixa] : [1, 20]
  const funcOptions = Array.from({ length: maxFunc - minFunc + 1 }, (_, i) => minFunc + i)

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.razaoSocial.trim()) e.razaoSocial = 'Informe a razão social.'
    if (!form.responsavel.trim()) e.responsavel = 'Informe o responsável.'
    if (!form.email.includes('@')) e.email = 'Informe um e-mail válido.'
    if (form.whatsapp.replace(/\D/g,'').length < 10) e.whatsapp = 'Informe um WhatsApp válido.'
    if (!form.cep.trim()) e.cep = 'Informe o CEP.'
    if (!form.cidade.trim()) e.cidade = 'Informe a cidade.'
    if (!form.estado) e.estado = 'Selecione o estado.'
    if (!form.endereco.trim()) e.endereco = 'Informe o endereço.'
    const numFunc = Number(form.numFuncionarios)
    if (!form.numFuncionarios || isNaN(numFunc)) e.numFuncionarios = 'Informe o número de funcionários.'
    else if (numFunc < 1 || numFunc > 20) e.numFuncionarios = 'O modelo digital atende empresas de 1 a 20 funcionários.'
    if (!form.consentDataUsage) e.consentDataUsage = 'Aceite o uso dos dados.'
    if (!form.consentDeclaration) e.consentDeclaration = 'Aceite a declaração.'
    if (!form.consentTerms) e.consentTerms = 'Aceite os termos de uso.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      const res = await fetch('/api/leads/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, planType, ltcatAddon, partnerRef, contractAccepted }),
      })
      const data = await res.json()
      if (data.success) {
        track('registration_completed')
        // Em modo mock (ASAAS_API_KEY não configurada) a URL de cobrança é falsa —
        // redirecionar levava a "cobrança não existe" no Asaas real. Não redireciona.
        const checkoutUrl = data.data?.isMock ? null : (data.data?.checkoutUrl || null)
        setAsaasUrl(checkoutUrl)
        setSubmitted(true)
        if (checkoutUrl) {
          track('asaas_checkout_clicked')
          setTimeout(() => { window.location.href = checkoutUrl }, 1500)
        }
      }
    } catch {
      setErrors({ generic: 'Erro ao enviar. Tente novamente ou fale conosco pelo WhatsApp.' })
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 py-16 px-6 flex items-center justify-center">
          <div className="max-w-md w-full bg-white rounded-brand-lg border border-gray-200 p-10 text-center shadow-brand">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="font-display text-2xl text-gray-900 mb-3">Cadastro enviado!</h2>
            <p className="text-[15px] text-gray-500 mb-6">
              {asaasUrl
                ? 'Você será redirecionado para o pagamento seguro da taxa de implantação.'
                : 'Seus dados foram registrados. Nossa equipe entrará em contato em breve.'}
            </p>
            <div className="bg-gray-50 rounded-[12px] p-4 mb-6 text-[13px] text-gray-500">
              📧 contato@sublimesst.com<br />
              📱 (21) 99724-8630
            </div>
            {!asaasUrl && (
              <p className="text-[12px] text-amber-700 bg-amber-50 p-3 rounded-[8px]">
                O link de pagamento não está disponível neste momento. Seu cadastro foi registrado
                e nossa equipe entrará em contato pelo WhatsApp para concluir o pagamento da implantação.
              </p>
            )}
          </div>
        </div>
        <WhatsAppButton />
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 py-12 px-6">
        <div className="max-w-[700px] mx-auto">
          <div className="mb-6">
            <a href="/elegibilidade" className="btn btn-ghost btn-sm mb-3 inline-flex">
              <ArrowLeft size={15} /> Voltar
            </a>
            <span className="section-tag">Cadastro complementar</span>
            <h1 className="font-display text-3xl text-gray-900 mt-3 mb-2">Complete seu cadastro</h1>
            <p className="text-[15px] text-gray-500">Preencha os dados para finalizar sua adesão ao modelo digital.</p>
          </div>

          {plan && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-300 rounded-[12px] p-4 mb-6">
              <span className="text-xl">⏱️</span>
              <p className="text-[13px] text-amber-800">
                Finalize agora e garanta a implantação por <strong>{maskCurrencyBRL(plan.implantacaoPromo)}</strong> (oferta válida por 24h após o teste).
              </p>
            </div>
          )}

          <div className="bg-white rounded-brand-lg border border-gray-200 p-9 shadow-brand">

            {/* Dados empresa */}
            <h3 className="text-[16px] font-semibold text-gray-900 mb-5">🏢 Dados da empresa</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div><label className="form-label required">Razão social</label>
                <input className={`form-input ${errors.razaoSocial ? 'error' : ''}`} placeholder="Nome conforme CNPJ"
                  value={form.razaoSocial} onChange={e => set('razaoSocial', e.target.value)} />
                {errors.razaoSocial && <p className="text-[12px] text-red-500 mt-1">{errors.razaoSocial}</p>}</div>
              <div><label className="form-label">Nome fantasia</label>
                <input className="form-input" placeholder="Nome comercial"
                  value={form.nomeFantasia} onChange={e => set('nomeFantasia', e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div><label className="form-label required">Responsável</label>
                <input className={`form-input ${errors.responsavel ? 'error' : ''}`} placeholder="Nome completo"
                  value={form.responsavel} onChange={e => set('responsavel', e.target.value)} />
                {errors.responsavel && <p className="text-[12px] text-red-500 mt-1">{errors.responsavel}</p>}</div>
              <div><label className="form-label required">E-mail</label>
                <input className={`form-input ${errors.email ? 'error' : ''}`} type="email" placeholder="email@empresa.com"
                  value={form.email} onChange={e => set('email', e.target.value)} />
                {errors.email && <p className="text-[12px] text-red-500 mt-1">{errors.email}</p>}</div>
            </div>
            <div className="mb-4"><label className="form-label required">WhatsApp</label>
              <input className={`form-input ${errors.whatsapp ? 'error' : ''}`} placeholder="(21) 99999-9999"
                value={form.whatsapp} onChange={e => set('whatsapp', maskPhone(e.target.value))} maxLength={15} />
              {errors.whatsapp && <p className="text-[12px] text-red-500 mt-1">{errors.whatsapp}</p>}</div>

            <div className="h-px bg-gray-200 my-7" />
            <h3 className="text-[16px] font-semibold text-gray-900 mb-5">📍 Endereço</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div><label className="form-label required">CEP</label>
                <input className={`form-input ${errors.cep ? 'error' : ''}`} placeholder="00000-000"
                  value={form.cep} onChange={e => set('cep', maskCEP(e.target.value))}
                  onBlur={e => lookupCEP(e.target.value)} maxLength={9} />
                {errors.cep && <p className="text-[12px] text-red-500 mt-1">{errors.cep}</p>}</div>
              <div><label className="form-label required">Cidade</label>
                <input className={`form-input ${errors.cidade ? 'error' : ''}`} placeholder="Cidade"
                  value={form.cidade} onChange={e => set('cidade', e.target.value)} />
                {errors.cidade && <p className="text-[12px] text-red-500 mt-1">{errors.cidade}</p>}</div>
              <div><label className="form-label required">Estado</label>
                <select className={`form-input ${errors.estado ? 'error' : ''}`}
                  value={form.estado} onChange={e => set('estado', e.target.value)}>
                  {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
                </select></div>
            </div>
            <div className="mb-4"><label className="form-label required">Endereço completo</label>
              <input className={`form-input ${errors.endereco ? 'error' : ''}`} placeholder="Rua, número, complemento, bairro"
                value={form.endereco} onChange={e => set('endereco', e.target.value)} />
              {errors.endereco && <p className="text-[12px] text-red-500 mt-1">{errors.endereco}</p>}</div>

            <div className="h-px bg-gray-200 my-7" />
            <h3 className="text-[16px] font-semibold text-gray-900 mb-5">👥 Funcionários</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div><label className="form-label required">Nº total de funcionários</label>
                <select className={`form-input ${errors.numFuncionarios ? 'error' : ''}`}
                  value={form.numFuncionarios} onChange={e => set('numFuncionarios', e.target.value)}>
                  <option value="">Selecione…</option>
                  {funcOptions.map(n => <option key={n} value={n}>{n} funcionário{n > 1 ? 's' : ''}</option>)}
                </select>
                {faixa && <p className="text-[11px] text-gray-400 mt-1">Faixa {faixa} selecionada no teste de elegibilidade.</p>}
                {errors.numFuncionarios && <p className="text-[12px] text-red-500 mt-1">{errors.numFuncionarios}</p>}</div>
              <div><label className="form-label">Cargos existentes</label>
                <input className="form-input" placeholder="Ex: Analista, Assistente"
                  value={form.cargos} onChange={e => set('cargos', e.target.value)} /></div>
            </div>
            <div className="mb-4"><label className="form-label">Observações</label>
              <textarea className="form-input" rows={3} placeholder="Informações adicionais..."
                value={form.observations} onChange={e => set('observations', e.target.value)} /></div>

            <div className="h-px bg-gray-200 my-7" />
            <h3 className="text-[16px] font-semibold text-gray-900 mb-5">✅ Consentimentos</h3>
            {[
              { k: 'consentDataUsage', t: 'Autorizo a Sublime SST a utilizar os dados fornecidos para prestação dos serviços contratados, conforme a política de privacidade.' },
              { k: 'consentDeclaration', t: 'Declaro que as informações prestadas são verdadeiras e estou ciente de que o modelo digital é indicado para empresas de baixo risco com até 20 funcionários.' },
              { k: 'consentTerms', t: 'Li e aceito os Termos de Uso e a Política de Privacidade da Sublime SST.' },
            ].map(({ k, t }) => (
              <div key={k} className={`flex items-start gap-3 p-4 rounded-[8px] border mb-3 ${errors[k] ? 'border-red-300 bg-red-50' : 'bg-gray-50 border-gray-200'}`}>
                <input type="checkbox" id={k} checked={(form as unknown as Record<string, boolean>)[k]}
                  onChange={e => set(k, e.target.checked)} className="w-4 h-4 mt-0.5 accent-teal shrink-0 cursor-pointer" />
                <label htmlFor={k} className="text-[13px] text-gray-700 leading-snug cursor-pointer">{t}</label>
              </div>
            ))}

            {/* Plan summary */}
            {plan && (
              <div className="mt-6 p-5 bg-teal-pale rounded-[12px] border border-teal/20">
                <p className="text-[14px] font-semibold text-petrol mb-3">Resumo do plano</p>
                <div className="flex justify-between mb-2">
                  <span className="text-[14px] text-gray-600">Parcela mensal ({plan.label})</span>
                  <span className="text-[16px] font-bold text-teal">{maskCurrencyBRL(plan.monthly)}/mês</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[13px] text-gray-500">Implantação promocional (24h)</span>
                  <span className="text-[14px] font-semibold">{maskCurrencyBRL(plan.implantacaoPromo)}</span>
                </div>
              </div>
            )}

            {errors.generic && <p className="text-[13px] text-red-600 mt-4 p-3 bg-red-50 rounded-[8px]">{errors.generic}</p>}

            <button className="btn btn-primary w-full mt-7 btn-lg" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Enviando...' : <><ArrowRight size={18} /> Prosseguir para Pagamento</>}
            </button>
            <p className="text-center text-[12px] text-gray-400 mt-3">
              Você será direcionado ao pagamento seguro via Asaas.
            </p>
          </div>
        </div>
      </div>
      <WhatsAppButton />
    </>
  )
}
