import Link from 'next/link'
import { CheckCircle, AlertTriangle, FileText, Shield, DollarSign, Phone, ArrowRight } from 'lucide-react'
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
        <section className="relative overflow-hidden py-24 px-6"
          style={{ background: 'linear-gradient(160deg, #051e26 0%, #0d4a5c 45%, #0f6e6e 100%)' }}>
          <div className="absolute inset-0 opacity-[.03]"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='30' cy='30' r='4' fill='%23fff'/%3E%3C/svg%3E\")" }}
          />
          <div className="absolute top-[-120px] right-[-80px] w-[500px] h-[500px] rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(ellipse, rgba(29,158,140,.25) 0%, transparent 70%)' }}
          />
          <div className="max-w-[1120px] mx-auto grid md:grid-cols-2 gap-16 items-center relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 mb-6 px-3.5 py-1.5 rounded-full border text-[12px] font-medium text-teal-light tracking-widest uppercase"
                style={{ background: 'rgba(255,255,255,.1)', borderColor: 'rgba(255,255,255,.2)' }}>
                <span className="w-1.5 h-1.5 bg-teal-light rounded-full animate-pulse-dot" />
                Conformidade em SST digital
              </div>
              <h1 className="font-display text-4xl md:text-5xl text-white leading-[1.15] mb-5">
                Sua empresa possui funcionários?{' '}
                <em className="text-teal-light not-italic">Verifique suas obrigações de SST.</em>
              </h1>
              <p className="text-[17px] text-white/70 leading-relaxed mb-8 max-w-lg">
                A Sublime SST ajuda pequenas empresas a organizarem sua conformidade de forma simples, profissional e segura.
                Descubra em poucos minutos se sua empresa pode aderir ao modelo digital.
              </p>
              <div className="flex flex-wrap gap-3 mb-6">
                <Link href="/elegibilidade" className="btn btn-primary btn-lg">
                  <CheckCircle size={18} />
                  Regularizar Minha Empresa
                </Link>
                <Link href="/digital" className="btn btn-outline btn-lg">
                  Conhecer a Sublime Digital
                </Link>
              </div>
              <p className="text-[13px] text-white/40 flex items-center gap-2">
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px]"
                  style={{ background: 'rgba(255,255,255,.15)' }}>👥</span>
                Para empresas de baixo risco com até 20 funcionários
              </p>
            </div>

            {/* Hero card */}
            <div className="hidden md:block">
              <div className="rounded-[20px] p-7 border"
                style={{ background: 'rgba(255,255,255,.07)', borderColor: 'rgba(255,255,255,.12)', backdropFilter: 'blur(20px)' }}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 bg-teal rounded-[10px] flex items-center justify-center">
                    <CheckCircle size={18} className="text-white" />
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold text-white">Teste de Elegibilidade</div>
                    <div className="text-[12px] text-white/50">4 etapas simples</div>
                  </div>
                </div>
                {[
                  { n: 1, text: 'Informe os dados da empresa', icon: '📋' },
                  { n: 2, text: 'Dados de contato do responsável', icon: '👤' },
                  { n: 3, text: 'Perfil operacional da empresa', icon: '🏢' },
                  { n: 4, text: 'Resultado e próximos passos', icon: '🎯' },
                ].map((s) => (
                  <div key={s.n} className="flex items-center gap-3 p-3 rounded-lg border mb-2 last:mb-0"
                    style={{ background: 'rgba(255,255,255,.06)', borderColor: 'rgba(255,255,255,.08)' }}>
                    <div className="w-7 h-7 bg-teal rounded-lg flex items-center justify-center text-[12px] font-bold text-white shrink-0">
                      {s.n}
                    </div>
                    <span className="text-[13px] text-white/80 flex-1">{s.text}</span>
                    <span className="text-[16px] opacity-60">{s.icon}</span>
                  </div>
                ))}
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
                A Segurança e Saúde no Trabalho (SST) é uma exigência legal para empresas com funcionários contratados.
                O desconhecimento dessas obrigações não elimina a responsabilidade do empregador.
              </p>
              <p className="text-[16px] text-gray-500 leading-relaxed mb-8">
                Para empresas de menor risco operacional, a organização dessas obrigações pode ser mais simples,
                previsível e acessível do que parece.
              </p>
              <Link href="/elegibilidade" className="btn btn-primary">
                Verificar Minha Situação
              </Link>
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

        {/* ── COMO FUNCIONA ── */}
        <section className="py-20 px-6">
          <div className="max-w-[1120px] mx-auto">
            <div className="text-center max-w-xl mx-auto mb-14">
              <span className="section-tag">Como funciona</span>
              <h2 className="font-display text-3xl md:text-4xl text-gray-900">Quatro etapas simples</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 relative">
              <div className="hidden md:block absolute top-7 left-[calc(12.5%+28px)] right-[calc(12.5%+28px)] h-0.5"
                style={{ background: 'linear-gradient(90deg, var(--teal-pale), var(--teal), var(--teal-pale))' }} />
              {[
                { icon: '🔍', title: 'Faça o teste', desc: 'Responda perguntas sobre sua empresa para verificar a elegibilidade ao modelo online.' },
                { icon: '📊', title: 'Resultado imediato', desc: 'Descubra se sua empresa pode usar o modelo digital ou precisará de análise personalizada.' },
                { icon: '📝', title: 'Envie seus dados', desc: 'Complete o cadastro com informações da empresa para iniciar a regularização.' },
                { icon: '🚀', title: 'Inicie a regularização', desc: 'Nossa equipe realiza a implantação e acompanha suas obrigações de SST.' },
              ].map((s, i) => (
                <div key={i} className="relative z-10 text-center">
                  <div className="w-14 h-14 bg-white border-2 border-teal rounded-full flex items-center justify-center mx-auto mb-5 text-2xl"
                    style={{ boxShadow: '0 0 0 6px var(--teal-pale)' }}>
                    {s.icon}
                  </div>
                  <h3 className="text-[15px] font-semibold text-gray-900 mb-2">{s.title}</h3>
                  <p className="text-[13px] text-gray-500 leading-snug">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── BENEFÍCIOS ── */}
        <section className="py-20 px-6 bg-gray-50">
          <div className="max-w-[1120px] mx-auto">
            <div className="text-center max-w-xl mx-auto mb-14">
              <span className="section-tag">Benefícios</span>
              <h2 className="font-display text-3xl md:text-4xl text-gray-900">Por que escolher a Sublime SST</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {[
                { icon: '💻', title: 'Processo totalmente digital', body: 'Sem burocracia presencial. Tudo organizado de forma remota, com documentação estruturada e acessível.' },
                { icon: '🎯', title: 'Atendimento diligente', body: 'Nossa equipe analisa cada caso com critério e responsabilidade. Nada é aprovado sem verificação.' },
                { icon: '💰', title: 'Custo previsível', body: 'Plano anual com mensalidade fixa, sem surpresas. Você sabe exatamente o que paga todo mês.' },
                { icon: '📁', title: 'Organização documental', body: 'Seus documentos e registros de SST mantidos de forma organizada e prontos para auditorias.' },
                { icon: '🔒', title: 'Segurança e privacidade', body: 'Seus dados tratados com responsabilidade, em conformidade com a LGPD e boas práticas de segurança.' },
                { icon: '📞', title: 'Direcionamento adequado', body: 'Casos que exigem análise personalizada são encaminhados para atendimento consultivo especializado.' },
              ].map((b) => (
                <div key={b.title} className="card card-hover p-7">
                  <div className="w-12 h-12 rounded-[12px] flex items-center justify-center text-[22px] mb-4"
                    style={{ background: 'linear-gradient(135deg, var(--teal-pale), var(--blue-light))' }}>
                    {b.icon}
                  </div>
                  <h3 className="text-[16px] font-semibold text-gray-900 mb-2">{b.title}</h3>
                  <p className="text-[14px] text-gray-500 leading-relaxed">{b.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PLANOS ── */}
        <section id="planos" className="py-20 px-6" style={{ background: '#051e26' }}>
          <div className="max-w-[1120px] mx-auto">
            <div className="text-center max-w-xl mx-auto mb-12">
              <span className="section-tag-dark">Planos</span>
              <h2 className="font-display text-3xl md:text-4xl text-white mt-2">Planos para o modelo digital</h2>
              <p className="text-white/50 mt-3">Valores exclusivos para empresas aprovadas no teste de elegibilidade.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {Object.values(PLANS).map((plan, i) => (
                <div key={plan.range}
                  className={`relative rounded-[20px] p-8 border transition-all duration-200 ${i === 1 ? 'border-teal' : 'border-white/10'}`}
                  style={{ background: i === 1 ? 'rgba(26,158,140,.15)' : 'rgba(255,255,255,.06)' }}>
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
                  <div className="text-[12px] text-white/40 mb-6">Plano anual com cobrança mensal</div>
                  <div className="h-px bg-white/10 mb-6" />
                  <ul className="space-y-2.5 mb-7">
                    {['Gestão de obrigações SST', 'Documentação estruturada', 'Acompanhamento remoto', i === 1 ? 'Suporte prioritário' : i === 2 ? 'Suporte completo e reuniões' : 'Suporte por e-mail e WhatsApp'].map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-[13px] text-white/75">
                        <CheckCircle size={15} className="text-teal-light shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/elegibilidade"
                    className={`btn w-full text-center ${i === 1 ? 'btn-primary' : 'btn-outline'}`}>
                    Verificar Elegibilidade
                  </Link>
                  <p className="text-[11px] text-white/30 text-center mt-3">
                    Implantação: R$ 190 (ou R$ 100 em 24h)
                  </p>
                </div>
              ))}
            </div>
            <p className="text-center text-[13px] text-white/30 mt-8 max-w-lg mx-auto">
              Condições válidas para empresas enquadradas no modelo digital. Casos que exijam análise personalizada receberão contato da equipe da Sublime SST.
            </p>
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
        <section className="py-16 px-6 text-center relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, var(--petrol), var(--teal))' }}>
          <h2 className="font-display text-3xl md:text-4xl text-white mb-3">
            Descubra agora se sua empresa pode usar o modelo digital
          </h2>
          <p className="text-[16px] text-white/70 mb-8">O teste leva menos de 5 minutos e não gera nenhum compromisso.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/elegibilidade" className="btn btn-white btn-lg">
              <CheckCircle size={18} />
              Regularizar Minha Empresa
            </Link>
            <a href="https://wa.me/5521997248630" target="_blank" rel="noopener noreferrer"
              className="btn btn-outline btn-lg">
              Falar com a Equipe
            </a>
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  )
}
