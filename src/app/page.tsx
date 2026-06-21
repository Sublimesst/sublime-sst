import Link from 'next/link'
import { CheckCircle, ArrowRight, Phone } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { WhatsAppButton } from '@/components/layout/WhatsAppButton'
import { PLANS } from '@/lib/utils'

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        {/* ── HERO ── */}
        <section
          className="relative overflow-hidden py-24 px-6"
          style={{ background: 'linear-gradient(160deg, #051e26 0%, #0d4a5c 45%, #0f6e6e 100%)' }}
        >
          <div
            className="absolute inset-0 opacity-[.03]"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='30' cy='30' r='4' fill='%23fff'/%3E%3C/svg%3E\")" }}
          />
          <div
            className="absolute top-[-120px] right-[-80px] w-[500px] h-[500px] rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(ellipse, rgba(29,158,140,.25) 0%, transparent 70%)' }}
          />
          <div className="max-w-[1120px] mx-auto text-center relative z-10">
            <div
              className="inline-flex items-center gap-2 mb-6 px-3.5 py-1.5 rounded-full border text-[12px] font-medium text-teal-light tracking-widest uppercase"
              style={{ background: 'rgba(255,255,255,.1)', borderColor: 'rgba(255,255,255,.2)' }}
            >
              <span className="w-1.5 h-1.5 bg-teal-light rounded-full animate-pulse-dot" />
              Segurança e Saúde Ocupacional
            </div>
            <h1 className="font-display text-4xl md:text-5xl text-white leading-[1.15] mb-5 max-w-3xl mx-auto">
              Conformidade em SST com soluções{' '}
              <em className="text-teal-light not-italic">adequadas ao perfil da sua operação.</em>
            </h1>
            <p className="text-[17px] text-white/70 leading-relaxed mb-10 max-w-2xl mx-auto">
              A Sublime SST atende empresas de qualquer porte e grau de risco com consultoria
              especializada, e oferece um modelo digital simplificado para perfis de baixo risco operacional.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/consultoria-sst" className="btn btn-white btn-lg">
                <Phone size={17} />
                Solicitar Orçamento Personalizado
              </Link>
              <Link href="/elegibilidade" className="btn btn-outline btn-lg">
                <CheckCircle size={17} />
                Verificar Elegibilidade Digital
              </Link>
            </div>
          </div>
        </section>

        {/* ── DUAS SOLUÇÕES ── */}
        <section className="py-20 px-6 bg-gray-50">
          <div className="max-w-[1120px] mx-auto">
            <div className="text-center max-w-xl mx-auto mb-12">
              <span className="section-tag">Nossas soluções</span>
              <h2 className="font-display text-3xl md:text-4xl text-gray-900">
                Duas frentes, uma equipe especializada
              </h2>
              <p className="text-[15px] text-gray-500 mt-3 leading-relaxed">
                Escolha a solução certa para o perfil da sua empresa.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Card Consultoria */}
              <div className="card p-8 flex flex-col">
                <div
                  className="w-12 h-12 rounded-[12px] flex items-center justify-center text-[22px] mb-5"
                  style={{ background: 'linear-gradient(135deg, #e0f2fe, #bae6fd)' }}
                >
                  🏢
                </div>
                <h3 className="font-display text-2xl text-gray-900 mb-3">Consultoria SST Personalizada</h3>
                <p className="text-[15px] text-gray-500 leading-relaxed mb-5">
                  Atendimento especializado para empresas de qualquer porte e grau de risco. PGR, PCMSO,
                  LTCAT, laudos técnicos, treinamentos e avaliação de riscos psicossociais.
                </p>
                <ul className="flex flex-col gap-2 mb-7">
                  {[
                    'Empresas de qualquer porte e atividade',
                    'Qualquer Grau de Risco (GR1 a GR4)',
                    'Atendimento por equipe técnica especializada',
                    'Orçamento sob medida para seu perfil',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-[14px] text-gray-600">
                      <CheckCircle size={15} className="text-teal shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/consultoria-sst" className="btn btn-petrol mt-auto">
                  Solicitar Orçamento Personalizado
                  <ArrowRight size={16} />
                </Link>
              </div>

              {/* Card Digital */}
              <div
                className="card p-8 flex flex-col border-teal"
                style={{ borderColor: 'var(--teal)', borderWidth: 2 }}
              >
                <div className="flex items-start justify-between mb-5">
                  <div
                    className="w-12 h-12 rounded-[12px] flex items-center justify-center text-[22px]"
                    style={{ background: 'linear-gradient(135deg, var(--teal-pale), #99f6e4)' }}
                  >
                    💻
                  </div>
                  <span className="bg-teal text-white text-[11px] font-bold px-2.5 py-1 rounded-full tracking-wider">
                    Modelo digital
                  </span>
                </div>
                <h3 className="font-display text-2xl text-gray-900 mb-3">Sublime Digital</h3>
                <p className="text-[15px] text-gray-500 leading-relaxed mb-5">
                  Regularização e conformidade em SST com contratação, gestão e organização documental
                  digitais para pequenas empresas de baixo risco operacional.
                </p>
                <ul className="flex flex-col gap-2 mb-7">
                  {[
                    'Empresas com até 20 funcionários',
                    'CNAE de Grau de Risco 1 (GR1)',
                    'Sem riscos operacionais críticos',
                    'Valor fixo e previsível',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-[14px] text-gray-600">
                      <CheckCircle size={15} className="text-teal shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/elegibilidade" className="btn btn-primary mt-auto">
                  Verificar Elegibilidade
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── PARA QUEM É CADA SOLUÇÃO ── */}
        <section className="py-20 px-6">
          <div className="max-w-[1120px] mx-auto">
            <div className="text-center max-w-xl mx-auto mb-12">
              <span className="section-tag">Qual solução é ideal para mim?</span>
              <h2 className="font-display text-3xl md:text-4xl text-gray-900">
                Critérios para escolher a solução certa
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-8 items-start">
              <div>
                <h3 className="text-[16px] font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-7 h-7 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center text-[14px]">🏢</span>
                  Consultoria SST Personalizada
                </h3>
                <div className="flex flex-col gap-3">
                  {[
                    { label: 'Porte', value: 'Qualquer número de funcionários' },
                    { label: 'Grau de Risco', value: 'GR1, GR2, GR3 ou GR4' },
                    { label: 'Atividade', value: 'Qualquer CNAE, incluindo indústria, construção, serviços de saúde' },
                    { label: 'Necessidade', value: 'LTCAT, laudos de insalubridade, treinamentos presenciais, riscos psicossociais' },
                    { label: 'Preferência', value: 'Atendimento técnico personalizado e relação direta com especialistas' },
                  ].map((row) => (
                    <div key={row.label} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                      <span className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider w-28 shrink-0 pt-0.5">{row.label}</span>
                      <span className="text-[14px] text-gray-700">{row.value}</span>
                    </div>
                  ))}
                </div>
                <Link href="/consultoria-sst" className="btn btn-petrol mt-5">
                  Solicitar Orçamento
                </Link>
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center text-[14px]" style={{ background: 'var(--teal-pale)', color: 'var(--teal)' }}>💻</span>
                  Sublime Digital
                </h3>
                <div className="flex flex-col gap-3">
                  {[
                    { label: 'Porte', value: 'Até 20 funcionários CLT' },
                    { label: 'Grau de Risco', value: 'Somente GR1 (conforme NR-4)' },
                    { label: 'Atividade', value: 'Escritórios, comércio, serviços administrativos, tecnologia, contabilidade' },
                    { label: 'Necessidade', value: 'PGR e PCMSO, organização documental, conformidade com eSocial' },
                    { label: 'Preferência', value: 'Processo digital, valor mensal fixo e previsível, sem reuniões presenciais' },
                  ].map((row) => (
                    <div key={row.label} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                      <span className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider w-28 shrink-0 pt-0.5">{row.label}</span>
                      <span className="text-[14px] text-gray-700">{row.value}</span>
                    </div>
                  ))}
                </div>
                <Link href="/elegibilidade" className="btn btn-primary mt-5">
                  Verificar Elegibilidade
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── RISCO REGULATÓRIO ── */}
        <section className="py-20 px-6 bg-gray-100">
          <div className="max-w-[1120px] mx-auto grid md:grid-cols-2 gap-12 items-start">
            <div>
              <span className="section-tag">Atenção regulatória</span>
              <h2 className="font-display text-3xl md:text-4xl text-gray-900 leading-tight mb-5">
                Empresas com funcionários têm obrigações de SST que não podem ser ignoradas.
              </h2>
              <p className="text-[16px] text-gray-500 leading-relaxed mb-4">
                A Segurança e Saúde no Trabalho (SST) é uma exigência legal para empresas com funcionários
                contratados. O desconhecimento dessas obrigações não elimina a responsabilidade do empregador.
              </p>
              <p className="text-[16px] text-gray-500 leading-relaxed mb-8">
                A Sublime SST organiza suas obrigações de forma adequada ao perfil da sua operação — seja
                por consultoria personalizada, seja pelo modelo digital para perfis de baixo risco.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/consultoria-sst" className="btn btn-petrol">
                  Falar com a Equipe
                </Link>
                <Link href="/elegibilidade" className="btn btn-outline-dark">
                  Verificar Elegibilidade Digital
                </Link>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              {[
                { icon: '⚠️', cls: 'bg-yellow-50', title: 'Exposição a multas e autuações', body: 'Empresas sem documentação de SST adequada podem ser autuadas em fiscalizações do Ministério do Trabalho.' },
                { icon: '📋', cls: 'bg-blue-50', title: 'Passivos trabalhistas', body: 'Ausência de registros pode gerar passivos em reclamações trabalhistas e aumentar a exposição em litígios.' },
                { icon: '✅', cls: 'bg-green-50', title: 'Organização e previsibilidade', body: 'A Sublime SST organiza suas obrigações e mantém sua empresa documentada de forma estruturada e diligente.' },
              ].map((c) => (
                <div key={c.title} className="card p-5 flex items-start gap-4">
                  <div className={`w-11 h-11 rounded-[10px] flex items-center justify-center text-xl shrink-0 ${c.cls}`}>
                    {c.icon}
                  </div>
                  <div>
                    <h4 className="text-[14px] font-semibold text-gray-900 mb-1">{c.title}</h4>
                    <p className="text-[13px] text-gray-500 leading-snug">{c.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PLANOS (Sublime Digital) ── */}
        <section id="planos" className="py-20 px-6" style={{ background: '#051e26' }}>
          <div className="max-w-[1120px] mx-auto">
            <div className="text-center max-w-xl mx-auto mb-12">
              <span className="section-tag-dark">Planos</span>
              <h2 className="font-display text-3xl md:text-4xl text-white mt-2">Planos do Sublime Digital</h2>
              <p className="text-white/50 mt-3">Valores exclusivos para empresas aprovadas no teste de elegibilidade.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {Object.values(PLANS).map((plan, i) => (
                <div
                  key={plan.range}
                  className={`relative rounded-[20px] p-8 border transition-all duration-200 ${i === 1 ? 'border-teal' : 'border-white/10'}`}
                  style={{ background: i === 1 ? 'rgba(26,158,140,.15)' : 'rgba(255,255,255,.06)' }}
                >
                  {i === 1 && (
                    <div className="absolute top-5 right-5 bg-teal text-white text-[11px] font-bold px-2.5 py-1 rounded-full tracking-wider">
                      Mais contratado
                    </div>
                  )}
                  <div className="text-[13px] font-medium text-white/50 mb-3">{plan.label}</div>
                  <div className="font-display text-4xl text-white mb-1">
                    R$ {(plan.monthly / 100).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                    <span className="font-sans text-[14px] font-normal text-white/40">/mês</span>
                  </div>
                  <div className="text-[12px] text-white/40 mb-6">Assinatura anual · cobrado mensalmente</div>
                  <div className="h-px bg-white/10 mb-6" />
                  <ul className="space-y-2.5 mb-7">
                    {['Gestão de obrigações SST', 'Documentação estruturada', 'Acompanhamento remoto', i === 1 ? 'Suporte prioritário' : i === 2 ? 'Suporte completo e reuniões' : 'Suporte por e-mail e WhatsApp'].map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-[13px] text-white/75">
                        <CheckCircle size={15} className="text-teal-light shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/elegibilidade" className={`btn w-full text-center ${i === 1 ? 'btn-primary' : 'btn-outline'}`}>
                    Verificar Elegibilidade
                  </Link>
                  <p className="text-[11px] text-white/30 text-center mt-3">
                    Implantação: R$ 190 (ou R$ 100 em 24h)
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-8 text-center">
              <p className="text-[13px] text-white/30 max-w-lg mx-auto">
                Condições válidas para empresas enquadradas no modelo digital. Para empresas de maior porte ou
                risco, consulte nosso atendimento de{' '}
                <Link href="/consultoria-sst" className="text-teal-light hover:underline">consultoria personalizada</Link>.
              </p>
            </div>
          </div>
        </section>

        {/* ── CONFIANÇA ── */}
        <section className="py-20 px-6 bg-gray-50">
          <div className="max-w-[1120px] mx-auto">
            <div className="text-center max-w-xl mx-auto mb-12">
              <span className="section-tag">Nosso compromisso</span>
              <h2 className="font-display text-3xl text-gray-900">Diligência e transparência em cada etapa</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
              {[
                { icon: '🔍', title: 'Análise responsável', body: 'Avaliamos cada empresa com critério. Não aprovamos automaticamente casos que exijam análise técnica.' },
                { icon: '📂', title: 'Dados organizados', body: 'Todos os registros mantidos de forma estruturada, seguros e acessíveis quando necessário.' },
                { icon: '💬', title: 'Comunicação clara', body: 'Você sabe exatamente o que está contratando, sem letras miúdas ou compromissos ocultos.' },
                { icon: '📞', title: 'Equipe acessível', body: 'Contato disponível por WhatsApp e e-mail. Casos complexos são atendidos consultivamente.' },
              ].map((t) => (
                <div key={t.title} className="card p-6 text-center">
                  <div className="text-3xl mb-3">{t.icon}</div>
                  <h4 className="text-[14px] font-semibold text-gray-900 mb-2">{t.title}</h4>
                  <p className="text-[13px] text-gray-500 leading-snug">{t.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA FINAL ── */}
        <section
          className="py-16 px-6 text-center relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, var(--petrol), var(--teal))' }}
        >
          <h2 className="font-display text-3xl md:text-4xl text-white mb-3">
            Pronto para organizar a SST da sua empresa?
          </h2>
          <p className="text-[16px] text-white/70 mb-8 max-w-lg mx-auto">
            Fale com nossa equipe para uma solução sob medida ou verifique se sua empresa se enquadra
            no modelo digital.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/consultoria-sst" className="btn btn-white btn-lg">
              <Phone size={17} />
              Solicitar Orçamento
            </Link>
            <Link href="/elegibilidade" className="btn btn-outline btn-lg">
              <CheckCircle size={17} />
              Verificar Elegibilidade Digital
            </Link>
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  )
}
