'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle, ArrowRight, Phone, MessageCircle } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { WhatsAppButton } from '@/components/layout/WhatsAppButton'

const SERVICES = [
  {
    icon: '📋',
    title: 'PGR — Programa de Gerenciamento de Riscos',
    body: 'Identificação e controle dos riscos ocupacionais conforme a NR-1. Obrigatório para todas as empresas com funcionários.',
  },
  {
    icon: '🏥',
    title: 'PCMSO — Programa de Controle Médico',
    body: 'Planejamento e controle da saúde dos trabalhadores, incluindo ASOs e acompanhamento médico ocupacional.',
  },
  {
    icon: '📊',
    title: 'LTCAT — Laudo Técnico das Condições Ambientais',
    body: 'Avaliação dos agentes nocivos no ambiente de trabalho para fins previdenciários e de aposentadoria especial.',
  },
  {
    icon: '🔬',
    title: 'Laudos técnicos e periciais',
    body: 'Laudos de insalubridade, periculosidade e ergonomia elaborados por profissionais habilitados.',
  },
  {
    icon: '🎓',
    title: 'Treinamentos obrigatórios',
    body: 'Capacitações previstas nas Normas Regulamentadoras (NR-35, NR-10, CIPA, brigada, entre outras).',
  },
  {
    icon: '🧠',
    title: 'Riscos psicossociais — NR-1',
    body: 'Avaliação e gestão de riscos psicossociais conforme a atualização da NR-1, vigente a partir de 2025.',
  },
]

type FormData = {
  name: string
  company: string
  email: string
  whatsapp: string
  description: string
}

type Status = 'idle' | 'loading' | 'success' | 'error'

export default function ConsultoriaPage() {
  const [form, setForm] = useState<FormData>({ name: '', company: '', email: '', whatsapp: '', description: '' })
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/consultoria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? 'Erro ao enviar')
      }
      setStatus('success')
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao enviar. Tente novamente.')
    }
  }

  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section
          className="py-20 px-6 relative overflow-hidden"
          style={{ background: 'linear-gradient(160deg, #051e26 0%, #0d4a5c 60%, #0a7a78 100%)' }}
        >
          <div
            className="absolute inset-0 opacity-[.03]"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='30' cy='30' r='4' fill='%23fff'/%3E%3C/svg%3E\")" }}
          />
          <div className="max-w-[720px] mx-auto text-center relative z-10">
            <span className="section-tag-dark mb-5 inline-block">Consultoria</span>
            <h1 className="font-display text-4xl md:text-5xl text-white mb-5 leading-tight">
              Consultoria SST Personalizada
            </h1>
            <p className="text-[17px] text-white/70 leading-relaxed mb-8 max-w-lg mx-auto">
              Atendimento especializado para empresas de qualquer porte e grau de risco operacional.
              Nossa equipe elabora a solução adequada ao perfil da sua empresa.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <a href="#formulario" className="btn btn-primary btn-lg">
                <Phone size={17} />
                Solicitar Orçamento
              </a>
              <a
                href="https://wa.me/5521997248630"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline btn-lg"
              >
                <MessageCircle size={17} />
                Falar no WhatsApp
              </a>
            </div>
          </div>
        </section>

        {/* Serviços */}
        <section className="py-20 px-6 bg-gray-50">
          <div className="max-w-[1120px] mx-auto">
            <div className="text-center max-w-xl mx-auto mb-14">
              <span className="section-tag">Serviços</span>
              <h2 className="font-display text-3xl md:text-4xl text-gray-900">
                O que a consultoria abrange
              </h2>
              <p className="text-[15px] text-gray-500 mt-3 leading-relaxed">
                Atendemos empresas de qualquer atividade, porte e Grau de Risco com soluções técnicas completas.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {SERVICES.map((s) => (
                <div key={s.title} className="card card-hover p-7">
                  <div
                    className="w-12 h-12 rounded-[12px] flex items-center justify-center text-[22px] mb-4"
                    style={{ background: 'linear-gradient(135deg, var(--teal-pale), #bae6fd)' }}
                  >
                    {s.icon}
                  </div>
                  <h3 className="text-[15px] font-bold text-gray-900 mb-2">{s.title}</h3>
                  <p className="text-[13px] text-gray-500 leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Para quem é */}
        <section className="py-20 px-6">
          <div className="max-w-[900px] mx-auto">
            <div className="text-center max-w-xl mx-auto mb-12">
              <span className="section-tag">Para quem é</span>
              <h2 className="font-display text-3xl text-gray-900">
                A consultoria é indicada para empresas que…
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-5">
              {[
                { icon: '🏭', title: 'Atuam em atividades de maior risco', body: 'Empresas com CNAE GR2, GR3 ou GR4 que exigem laudos e documentação técnica especializada.' },
                { icon: '👥', title: 'Têm mais de 20 funcionários', body: 'Operações maiores que requerem estrutura de SST mais robusta, incluindo CIPA e programas específicos.' },
                { icon: '🔧', title: 'Precisam de laudos técnicos', body: 'LTCAT, laudos de insalubridade, periculosidade ou ergonomia que demandam visita e análise presencial.' },
                { icon: '🧠', title: 'Precisam tratar riscos psicossociais', body: 'Avaliação e gestão de riscos psicossociais conforme atualização da NR-1 (vigente a partir de 2025).' },
                { icon: '🎓', title: 'Precisam de treinamentos presenciais', body: 'Capacitações como NR-35, NR-10, CIPA ou brigada de incêndio que exigem presença de instrutor.' },
                { icon: '📌', title: 'Precisam de atendimento personalizado', body: 'Empresas com necessidades específicas que não se enquadram em modelos padronizados.' },
              ].map((c) => (
                <div key={c.title} className="card p-6 flex gap-4 items-start">
                  <span className="text-2xl shrink-0">{c.icon}</span>
                  <div>
                    <h4 className="text-[15px] font-semibold text-gray-900 mb-1">{c.title}</h4>
                    <p className="text-[13px] text-gray-500 leading-snug">{c.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-teal-50 border border-teal/30 rounded-[12px] text-[13px] text-teal-800 flex items-start gap-3">
              <CheckCircle size={16} className="shrink-0 mt-0.5 text-teal" />
              <span>
                Se sua empresa tem até 20 funcionários e CNAE GR1, pode se enquadrar no{' '}
                <Link href="/elegibilidade" className="font-semibold underline">modelo digital</Link>{' '}
                — mais simples e com mensalidade previsível.
              </span>
            </div>
          </div>
        </section>

        {/* Formulário */}
        <section id="formulario" className="py-20 px-6 bg-gray-50">
          <div className="max-w-[640px] mx-auto">
            <div className="text-center mb-10">
              <span className="section-tag">Orçamento</span>
              <h2 className="font-display text-3xl text-gray-900">Solicite um orçamento</h2>
              <p className="text-[15px] text-gray-500 mt-3">
                Preencha o formulário abaixo. Nossa equipe entrará em contato para entender sua necessidade e
                enviar uma proposta adequada ao seu perfil.
              </p>
            </div>

            {status === 'success' ? (
              <div className="card p-10 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5 text-3xl">
                  ✅
                </div>
                <h3 className="font-display text-2xl text-gray-900 mb-3">Solicitação recebida!</h3>
                <p className="text-[15px] text-gray-500 leading-relaxed mb-6">
                  Nossa equipe analisará sua necessidade e entrará em contato em breve por e-mail ou WhatsApp.
                </p>
                <a
                  href="https://wa.me/5521997248630"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                >
                  <MessageCircle size={16} />
                  Falar no WhatsApp também
                </a>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="card p-8 flex flex-col gap-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold text-gray-700">Nome *</label>
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      placeholder="Seu nome completo"
                      className="input"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold text-gray-700">Empresa *</label>
                    <input
                      type="text"
                      name="company"
                      value={form.company}
                      onChange={handleChange}
                      required
                      placeholder="Nome da empresa"
                      className="input"
                    />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold text-gray-700">E-mail *</label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                      placeholder="seu@email.com"
                      className="input"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold text-gray-700">WhatsApp *</label>
                    <input
                      type="tel"
                      name="whatsapp"
                      value={form.whatsapp}
                      onChange={handleChange}
                      required
                      placeholder="(21) 99999-9999"
                      className="input"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-gray-700">
                    Descreva sua necessidade *
                  </label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    required
                    rows={4}
                    placeholder="Ex: Preciso de PGR e PCMSO para uma empresa com 15 funcionários no setor de construção civil..."
                    className="input resize-none"
                  />
                </div>

                {status === 'error' && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="btn btn-primary btn-lg self-start"
                >
                  {status === 'loading' ? 'Enviando…' : (
                    <>
                      Enviar Solicitação
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
                <p className="text-[12px] text-gray-400">
                  Seus dados são tratados com confidencialidade e não serão compartilhados com terceiros.
                </p>
              </form>
            )}

            <div className="mt-6 text-center">
              <p className="text-[14px] text-gray-500">
                Prefere falar diretamente?{' '}
                <a
                  href="https://wa.me/5521997248630"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal font-semibold hover:underline"
                >
                  Entre em contato pelo WhatsApp
                </a>
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  )
}
