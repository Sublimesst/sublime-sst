import Link from 'next/link'
import {
  CheckCircle, Phone, MessageCircle, FileText, Stethoscope, BarChart3, Microscope,
  GraduationCap, Brain, Factory, Users, Wrench, ClipboardList, Building2, ShieldCheck,
} from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { WhatsAppButton } from '@/components/layout/WhatsAppButton'
import { ConsultoriaForm } from '@/components/forms/ConsultoriaForm'
import { JsonLd } from '@/components/JsonLd'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Consultoria SST Personalizada | Sublime SST',
  description: 'Atendimento especializado em SST para empresas de qualquer porte e risco. PGR, PCMSO, LTCAT, laudos técnicos, treinamentos e avaliação de riscos psicossociais.',
  alternates: { canonical: 'https://sublimesst.com/consultoria-sst' },
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Quais serviços a consultoria SST da Sublime oferece?',
      acceptedAnswer: { '@type': 'Answer', text: 'PGR, PCMSO, LTCAT, laudos de insalubridade e periculosidade, treinamentos obrigatórios (NR-35, NR-10, CIPA, brigada) e avaliação de riscos psicossociais conforme a NR-1 atualizada.' },
    },
    {
      '@type': 'Question',
      name: 'A consultoria SST atende empresas de qualquer tamanho?',
      acceptedAnswer: { '@type': 'Answer', text: 'Sim. A consultoria personalizada atende empresas de qualquer porte e Grau de Risco (GR1 a GR4), incluindo indústria, construção, saúde e serviços.' },
    },
    {
      '@type': 'Question',
      name: 'Qual o prazo para receber o orçamento?',
      acceptedAnswer: { '@type': 'Answer', text: 'Nossa equipe entra em contato em até 1 dia útil após o recebimento da solicitação.' },
    },
  ],
}

const SERVICES = [
  { icon: FileText, title: 'PGR — Programa de Gerenciamento de Riscos', body: 'Identificação e controle dos riscos ocupacionais conforme a NR-1. Obrigatório para todas as empresas com funcionários.' },
  { icon: Stethoscope, title: 'PCMSO — Programa de Controle Médico', body: 'Planejamento e controle da saúde dos trabalhadores, incluindo ASOs e acompanhamento médico ocupacional.' },
  { icon: BarChart3, title: 'LTCAT — Laudo Técnico das Condições Ambientais', body: 'Avaliação dos agentes nocivos no ambiente de trabalho para fins previdenciários e de aposentadoria especial.' },
  { icon: Microscope, title: 'Laudos técnicos e periciais', body: 'Laudos de insalubridade, periculosidade e ergonomia elaborados por profissionais habilitados.' },
  { icon: GraduationCap, title: 'Treinamentos obrigatórios', body: 'Capacitações previstas nas Normas Regulamentadoras (NR-35, NR-10, CIPA, brigada, entre outras).' },
  { icon: Brain, title: 'Riscos psicossociais — NR-1', body: 'Avaliação e gestão de riscos psicossociais conforme a atualização da NR-1, vigente a partir de 2025.' },
]

const PROCESS_STEPS = [
  { n: '01', title: 'Diagnóstico inicial', body: 'Entendemos a operação, o CNAE, o quadro de funcionários e as obrigações aplicáveis ao seu perfil.' },
  { n: '02', title: 'Proposta sob medida', body: 'Escopo, cronograma e investimento definidos para a sua necessidade — retorno em até 1 dia útil.' },
  { n: '03', title: 'Execução técnica', body: 'Visitas, medições, avaliações e elaboração dos documentos por profissionais legalmente habilitados.' },
  { n: '04', title: 'Entrega e acompanhamento', body: 'Documentação entregue com orientação de implementação e suporte para dúvidas e fiscalizações.' },
]

export default function ConsultoriaPage() {
  return (
    <>
      <JsonLd data={faqSchema} />
      <Navbar />
      <main>
        {/* Hero */}
        <section
          className="py-24 px-6 relative overflow-hidden"
          style={{ background: 'linear-gradient(180deg, #082f3b 0%, #051e26 100%)' }}
        >
          <div className="max-w-[720px] mx-auto text-center relative z-10">
            <span className="section-tag-dark mb-5 inline-block">Consultoria técnica</span>
            <h1 className="font-display text-4xl md:text-5xl text-white mb-5 leading-tight">
              Consultoria SST Personalizada
            </h1>
            <p className="text-[17px] text-white/70 leading-relaxed mb-8 max-w-lg mx-auto">
              Atendimento especializado para empresas de qualquer porte e grau de risco operacional.
              Documentação elaborada e assinada por profissionais legalmente habilitados.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <a href="#formulario" className="btn btn-primary btn-lg">
                <Phone size={17} /> Solicitar Orçamento
              </a>
              <a href="https://wa.me/5521997248630" target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-lg">
                <MessageCircle size={17} /> Falar no WhatsApp
              </a>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-white/45">
              <span className="flex items-center gap-1.5"><Building2 size={13} /> Todos os portes e graus de risco (GR1 a GR4)</span>
              <span className="flex items-center gap-1.5"><ShieldCheck size={13} /> Resposta em até 1 dia útil</span>
            </div>
          </div>
        </section>

        {/* Faixa NR-1 psicossociais */}
        <section className="px-6 py-5 bg-amber-50 border-b border-amber-200">
          <div className="max-w-[1120px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[14px] text-amber-900 flex items-center gap-2.5 text-center sm:text-left">
              <Brain size={18} className="shrink-0 text-amber-600" />
              <span>
                <strong>Nova NR-1:</strong> a gestão de riscos psicossociais já é exigência para as empresas brasileiras.
                A sua já se adequou?
              </span>
            </p>
            <a href="#formulario" className="btn btn-outline-dark btn-sm shrink-0 !border-amber-400 !text-amber-800 hover:!bg-amber-100">
              Avaliar minha empresa
            </a>
          </div>
        </section>

        {/* Serviços */}
        <section className="py-20 px-6 bg-gray-50">
          <div className="max-w-[1120px] mx-auto">
            <div className="text-center max-w-xl mx-auto mb-14">
              <span className="section-tag">Serviços</span>
              <h2 className="font-display text-3xl md:text-4xl text-gray-900">O que a consultoria abrange</h2>
              <p className="text-[15px] text-gray-500 mt-3 leading-relaxed">
                Atendemos empresas de qualquer atividade, porte e Grau de Risco com soluções técnicas completas.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {SERVICES.map((s) => (
                <div key={s.title} className="card card-hover p-7">
                  <div className="w-12 h-12 rounded-[12px] flex items-center justify-center mb-4"
                    style={{ background: 'linear-gradient(135deg, var(--teal-pale), #bae6fd)' }}>
                    <s.icon size={22} className="text-petrol" />
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
              <h2 className="font-display text-3xl text-gray-900">A consultoria é indicada para empresas que…</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-5">
              {[
                { icon: Factory, title: 'Atuam em atividades de maior risco', body: 'Empresas com CNAE GR2, GR3 ou GR4 que exigem laudos e documentação técnica especializada.' },
                { icon: Users, title: 'Têm mais de 20 funcionários', body: 'Operações maiores que requerem estrutura de SST mais robusta, incluindo CIPA e programas específicos.' },
                { icon: Wrench, title: 'Precisam de laudos técnicos', body: 'LTCAT, laudos de insalubridade, periculosidade ou ergonomia que demandam visita e análise presencial.' },
                { icon: Brain, title: 'Precisam tratar riscos psicossociais', body: 'Avaliação e gestão de riscos psicossociais conforme atualização da NR-1 (vigente a partir de 2025).' },
                { icon: GraduationCap, title: 'Precisam de treinamentos presenciais', body: 'Capacitações como NR-35, NR-10, CIPA ou brigada de incêndio que exigem presença de instrutor.' },
                { icon: ClipboardList, title: 'Precisam de atendimento personalizado', body: 'Empresas com necessidades específicas que não se enquadram em modelos padronizados.' },
              ].map((c) => (
                <div key={c.title} className="card p-6 flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-[10px] bg-teal-pale flex items-center justify-center shrink-0">
                    <c.icon size={18} className="text-petrol" />
                  </div>
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
                — mais simples e com valor mensal previsível.
              </span>
            </div>
          </div>
        </section>

        {/* Como funciona */}
        <section className="py-20 px-6 bg-gray-50">
          <div className="max-w-[1120px] mx-auto">
            <div className="text-center max-w-xl mx-auto mb-14">
              <span className="section-tag">Como funciona</span>
              <h2 className="font-display text-3xl md:text-4xl text-gray-900">Do diagnóstico à entrega</h2>
              <p className="text-[15px] text-gray-500 mt-3 leading-relaxed">
                Processo estruturado, com escopo e cronograma definidos antes de qualquer cobrança.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {PROCESS_STEPS.map((s) => (
                <div key={s.n} className="card p-6 relative">
                  <span className="font-display text-[32px] text-teal-pale absolute top-4 right-5 select-none"
                    style={{ color: 'var(--teal-pale)', WebkitTextStroke: '1px var(--teal)' }}>
                    {s.n}
                  </span>
                  <h3 className="text-[15px] font-bold text-gray-900 mb-2 mt-1 pr-10">{s.title}</h3>
                  <p className="text-[13px] text-gray-500 leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Credenciais */}
        <section className="py-16 px-6" style={{ background: 'linear-gradient(180deg, #082f3b 0%, #051e26 100%)' }}>
          <div className="max-w-[900px] mx-auto">
            <div className="text-center mb-10">
              <span className="section-tag-dark">Quem assina</span>
              <h2 className="font-display text-3xl text-white">Responsabilidade técnica de verdade</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: ShieldCheck, title: 'Profissionais habilitados', body: 'PGR, PCMSO, laudos e treinamentos elaborados e assinados por profissionais legalmente habilitados, incluindo médico do trabalho coordenador.' },
                { icon: Building2, title: 'Empresa estabelecida', body: 'Sublime Segurança e Saúde Ocupacional LTDA · CNPJ 65.051.167/0001-27 · Av. Ataulfo de Paiva, 1235 — Leblon, Rio de Janeiro/RJ.' },
                { icon: FileText, title: 'Documentação auditável', body: 'Documentos com identificação do responsável técnico, prontos para apresentação em fiscalização, perícia ou auditoria.' },
              ].map((c) => (
                <div key={c.title} className="rounded-brand border border-white/10 bg-white/[.04] p-6">
                  <c.icon size={22} className="text-teal-light mb-3" />
                  <h3 className="text-[15px] font-bold text-white mb-2">{c.title}</h3>
                  <p className="text-[13px] text-white/55 leading-relaxed">{c.body}</p>
                </div>
              ))}
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
            <ConsultoriaForm />
            <div className="mt-6 text-center">
              <p className="text-[14px] text-gray-500">
                Prefere falar diretamente?{' '}
                <a href="https://wa.me/5521997248630" target="_blank" rel="noopener noreferrer"
                  className="text-teal font-semibold hover:underline">
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
