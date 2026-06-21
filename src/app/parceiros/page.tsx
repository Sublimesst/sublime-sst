'use client'

import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { WhatsAppButton } from '@/components/layout/WhatsAppButton'
import { maskCNPJ, maskPhone } from '@/lib/utils'
import { track } from '@/lib/analytics'

const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

const REWARDS = [
  { range: '1 a 5 funcionários', monthly: 'R$ 142/mês', reward: 'R$ 142' },
  { range: '6 a 10 funcionários', monthly: 'R$ 250/mês', reward: 'R$ 250' },
  { range: '11 a 20 funcionários', monthly: 'R$ 430/mês', reward: 'R$ 430' },
]

export default function ParceirosPage() {
  const [form, setForm] = useState({
    name: '', office: '', cnpj: '', email: '', whatsapp: '',
    clientsEstimate: '', city: '', state: 'RJ', consentContact: false,
  })
  const [referral, setReferral] = useState({
    companyName: '', cnpj: '', contactName: '', phone: '', email: '', employeesEst: '', observations: '',
  })
  const [hasReferral, setHasReferral] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const set = (k: string, v: unknown) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) }
  const setRef = (k: string, v: unknown) => setReferral(r => ({ ...r, [k]: v }))

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Informe seu nome.'
    if (!form.office.trim()) e.office = 'Informe o escritório.'
    if (!form.email.includes('@')) e.email = 'E-mail inválido.'
    if (form.whatsapp.replace(/\D/g,'').length < 10) e.whatsapp = 'WhatsApp inválido.'
    if (!form.city.trim()) e.city = 'Informe a cidade.'
    if (!form.state) e.state = 'Selecione o estado.'
    if (!form.consentContact) e.consentContact = 'Autorize o contato para continuar.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    track('partner_registration_started')
    try {
      const res = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, referral: hasReferral ? referral : null }),
      })
      const data = await res.json()
      if (data.success) {
        track('partner_registration_completed')
        if (hasReferral) track('partner_referral_submitted')
        setSubmitted(true)
      } else {
        setErrors({ generic: data.error || 'Erro ao enviar. Tente novamente.' })
      }
    } catch {
      setErrors({ generic: 'Erro inesperado. Contate-nos pelo WhatsApp.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="py-20 px-6 text-center"
          style={{ background: 'linear-gradient(135deg, #082f3b, #0d4a5c)' }}>
          <div className="max-w-[680px] mx-auto">
            <span className="section-tag-dark mb-5 inline-block">Programa de parceiros</span>
            <h1 className="font-display text-4xl text-white mb-5 leading-tight">
              Ajude seus clientes a manterem suas obrigações de SST organizadas
            </h1>
            <p className="text-[17px] text-white/70 mb-8 leading-relaxed">
              Para contadores e escritórios contábeis que atendem pequenas empresas. Receba recompensas por cada cliente que contratar o plano anual.
            </p>
            <button className="btn btn-primary btn-lg"
              onClick={() => document.getElementById('partner-form')?.scrollIntoView({ behavior: 'smooth' })}>
              Quero Ser Parceiro
            </button>
          </div>
        </section>

        {/* Content */}
        <section className="py-20 px-6">
          <div className="max-w-[1120px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-14 items-start">

            {/* Info */}
            <div>
              <h3 className="text-[1.3rem] font-bold text-gray-900 mb-4">Por que fazer parceria com a Sublime SST?</h3>
              <p className="text-[15px] text-gray-500 leading-relaxed mb-4">
                Como contador, você já cuida da saúde financeira dos seus clientes. A Sublime SST cuida da conformidade em SST — uma área onde muitas pequenas empresas têm lacunas que podem gerar problemas futuros.
              </p>
              <p className="text-[15px] text-gray-500 leading-relaxed mb-8">
                Ao indicar seus clientes para a Sublime Digital, você agrega valor ao seu atendimento, fortalece a parceria e ainda recebe uma recompensa por cada adesão ao plano anual.
              </p>

              {/* Reward card */}
              <div className="rounded-[16px] p-6 mb-6 border"
                style={{ background: 'linear-gradient(135deg, var(--teal-pale), var(--blue-light))', borderColor: 'rgba(26,158,140,.25)' }}>
                <h4 className="text-[12px] font-bold text-teal uppercase tracking-widest mb-3">💰 Recompensa por indicação</h4>
                <p className="text-[14px] text-petrol leading-relaxed mb-4">
                  Parceiros cadastrados podem receber recompensa equivalente a uma parcela mensal do plano contratado por cada novo cliente elegível que aderir à assinatura anual, conforme condições do programa.
                </p>
                <table className="w-full text-[13px] border-collapse">
                  <thead>
                    <tr>
                      {['Faixa de funcionários','Parcela mensal','Recompensa potencial'].map(h => (
                        <th key={h} className="text-left py-2 px-3 text-[11px] font-bold text-teal uppercase tracking-wider"
                          style={{ background: 'rgba(26,158,140,.1)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {REWARDS.map(r => (
                      <tr key={r.range} className="border-b" style={{ borderColor: 'rgba(26,158,140,.1)' }}>
                        <td className="py-2.5 px-3 text-gray-700">{r.range}</td>
                        <td className="py-2.5 px-3 text-gray-700">{r.monthly}</td>
                        <td className="py-2.5 px-3 font-bold text-petrol">{r.reward}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-[12px] text-gray-500 mt-3">
                  ⚠️ As condições exatas, o evento que libera a recompensa e os detalhes contratuais serão tratados diretamente com a equipe da Sublime SST.
                </p>
              </div>

              {/* Who can join */}
              <div className="card p-6">
                <h4 className="text-[14px] font-bold text-gray-900 mb-3">Quem pode ser parceiro?</h4>
                {['Contadores e escritórios contábeis','Consultores empresariais','Associações e entidades de classe','Qualquer profissional que atenda PMEs'].map(i => (
                  <div key={i} className="flex items-center gap-2 text-[14px] text-gray-700 mb-2 last:mb-0">
                    <span className="text-teal font-bold">✅</span> {i}
                  </div>
                ))}
              </div>
            </div>

            {/* Form */}
            <div id="partner-form" className="card p-8">
              {submitted ? (
                <div className="text-center py-8">
                  <div className="text-5xl mb-4">🤝</div>
                  <h3 className="text-[1.2rem] font-bold text-gray-900 mb-2">Cadastro recebido!</h3>
                  <p className="text-[14px] text-gray-500">
                    Nossa equipe entrará em contato em breve para apresentar as condições do programa de parceiros.
                  </p>
                </div>
              ) : (
                <>
                  <h3 className="text-[1.1rem] font-bold text-gray-900 mb-1">Cadastro de parceiro</h3>
                  <p className="text-[14px] text-gray-500 mb-6">Preencha o formulário e nossa equipe entrará em contato.</p>

                  <div className="space-y-4">
                    <div>
                      <label className="form-label required">Nome</label>
                      <input className={`form-input ${errors.name ? 'error' : ''}`} placeholder="Seu nome completo"
                        value={form.name} onChange={e => set('name', e.target.value)} />
                      {errors.name && <p className="text-[12px] text-red-500 mt-1">{errors.name}</p>}
                    </div>
                    <div>
                      <label className="form-label required">Escritório contábil</label>
                      <input className={`form-input ${errors.office ? 'error' : ''}`} placeholder="Nome do escritório ou empresa"
                        value={form.office} onChange={e => set('office', e.target.value)} />
                      {errors.office && <p className="text-[12px] text-red-500 mt-1">{errors.office}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="form-label">CNPJ</label>
                        <input className="form-input" placeholder="00.000.000/0000-00" maxLength={18}
                          value={form.cnpj} onChange={e => set('cnpj', maskCNPJ(e.target.value))} />
                      </div>
                      <div>
                        <label className="form-label required">E-mail</label>
                        <input className={`form-input ${errors.email ? 'error' : ''}`} type="email" placeholder="seu@escritorio.com"
                          value={form.email} onChange={e => set('email', e.target.value)} />
                        {errors.email && <p className="text-[12px] text-red-500 mt-1">{errors.email}</p>}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="form-label required">WhatsApp</label>
                        <input className={`form-input ${errors.whatsapp ? 'error' : ''}`} placeholder="(21) 99999-9999" maxLength={15}
                          value={form.whatsapp} onChange={e => set('whatsapp', maskPhone(e.target.value))} />
                        {errors.whatsapp && <p className="text-[12px] text-red-500 mt-1">{errors.whatsapp}</p>}
                      </div>
                      <div>
                        <label className="form-label">Qtd. aprox. de clientes</label>
                        <input className="form-input" type="number" placeholder="Ex: 50"
                          value={form.clientsEstimate} onChange={e => set('clientsEstimate', e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="form-label required">Cidade</label>
                        <input className={`form-input ${errors.city ? 'error' : ''}`} placeholder="Cidade"
                          value={form.city} onChange={e => set('city', e.target.value)} />
                        {errors.city && <p className="text-[12px] text-red-500 mt-1">{errors.city}</p>}
                      </div>
                      <div>
                        <label className="form-label required">Estado</label>
                        <select className="form-input" value={form.state} onChange={e => set('state', e.target.value)}>
                          {ESTADOS.map(s => <option key={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className={`flex items-start gap-3 p-3.5 rounded-[8px] border ${errors.consentContact ? 'border-red-300 bg-red-50' : 'bg-gray-50 border-gray-200'}`}>
                      <input type="checkbox" id="consent" checked={form.consentContact}
                        onChange={e => set('consentContact', e.target.checked)} className="w-4 h-4 mt-0.5 accent-teal shrink-0 cursor-pointer" />
                      <label htmlFor="consent" className="text-[13px] text-gray-700 leading-snug cursor-pointer">
                        Autorizo a equipe da Sublime SST a entrar em contato para apresentar as condições do programa de parceiros.
                      </label>
                    </div>
                    {errors.consentContact && <p className="text-[12px] text-red-500">{errors.consentContact}</p>}

                    {/* Referral toggle */}
                    <div className="flex items-center gap-2.5 cursor-pointer pt-2 border-t border-gray-200"
                      onClick={() => setHasReferral(v => !v)}>
                      <input type="checkbox" checked={hasReferral} readOnly className="w-4 h-4 accent-teal" />
                      <span className="text-[14px] font-semibold text-gray-700">Tenho uma empresa para indicar agora</span>
                    </div>

                    {/* Referral fields */}
                    {hasReferral && (
                      <div className="bg-teal-pale rounded-[12px] p-5 space-y-3 border border-teal/20">
                        <p className="text-[13px] text-teal font-medium">💡 Dados da empresa que você gostaria de indicar:</p>
                        <div>
                          <label className="form-label">Nome da empresa indicada</label>
                          <input className="form-input" placeholder="Nome da empresa"
                            value={referral.companyName} onChange={e => setRef('companyName', e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="form-label">CNPJ</label>
                            <input className="form-input" placeholder="00.000.000/0000-00" maxLength={18}
                              value={referral.cnpj} onChange={e => setRef('cnpj', maskCNPJ(e.target.value))} />
                          </div>
                          <div>
                            <label className="form-label">Nº aprox. de funcionários</label>
                            <input className="form-input" type="number" placeholder="Ex: 8"
                              value={referral.employeesEst} onChange={e => setRef('employeesEst', e.target.value)} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="form-label">Nome do contato</label>
                            <input className="form-input" placeholder="Responsável"
                              value={referral.contactName} onChange={e => setRef('contactName', e.target.value)} />
                          </div>
                          <div>
                            <label className="form-label">Telefone</label>
                            <input className="form-input" placeholder="(21) 99999-9999" maxLength={15}
                              value={referral.phone} onChange={e => setRef('phone', maskPhone(e.target.value))} />
                          </div>
                        </div>
                        <div>
                          <label className="form-label">E-mail da empresa</label>
                          <input className="form-input" type="email" placeholder="contato@empresa.com"
                            value={referral.email} onChange={e => setRef('email', e.target.value)} />
                        </div>
                        <div>
                          <label className="form-label">Observações</label>
                          <textarea className="form-input" rows={2} placeholder="Informações relevantes..."
                            value={referral.observations} onChange={e => setRef('observations', e.target.value)} />
                        </div>
                      </div>
                    )}

                    {errors.generic && <p className="text-[13px] text-red-600 p-3 bg-red-50 rounded-[8px]">{errors.generic}</p>}

                    <button className="btn btn-primary w-full" onClick={handleSubmit} disabled={loading}>
                      {loading ? 'Enviando...' : <><ArrowRight size={18} /> Quero Ser Parceiro</>}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  )
}
