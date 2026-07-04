import Link from 'next/link'
import { CheckCircle, ArrowRight } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { WhatsAppButton } from '@/components/layout/WhatsAppButton'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sobre — Sublime SST',
  description: 'Conheça a Sublime SST, empresa especializada em Segurança e Saúde Ocupacional com atendimento consultivo e modelo digital para pequenas empresas.',
  alternates: { canonical: 'https://sublimesst.com/sobre' },
}

const VALUES = [
  {
    icon: '🔍',
    title: 'Rigor técnico',
    body: 'Cada empresa é avaliada com critério. Não aprovamos automaticamente perfis que exijam análise personalizada.',
  },
  {
    icon: '💬',
    title: 'Comunicação transparente',
    body: 'Nossos clientes sabem exatamente o que estão contratando, quais obrigações têm e o que está incluído.',
  },
  {
    icon: '📐',
    title: 'Adequação ao perfil',
    body: 'Não oferecemos soluções genéricas. A abordagem é ajustada ao porte, risco e necessidade de cada empresa.',
  },
  {
    icon: '⚖️',
    title: 'Responsabilidade legal',
    body: 'Trabalhamos com base nas Normas Regulamentadoras e na legislação trabalhista vigente, sem atalhos.',
  },
]

export default function SobrePage() {
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
            <span className="section-tag-dark mb-5 inline-block">Sobre</span>
            <h1 className="font-display text-4xl md:text-5xl text-white mb-5 leading-tight">
              Quem é a Sublime SST
            </h1>
            <p className="text-[17px] text-white/70 leading-relaxed max-w-lg mx-auto">
              Empresa especializada em Segurança e Saúde Ocupacional, com atendimento consultivo e
              um modelo digital para perfis de baixo risco operacional.
            </p>
          </div>
        </section>

        {/* Missão e abordagem */}
        <section className="py-20 px-6">
          <div className="max-w-[1120px] mx-auto grid md:grid-cols-2 gap-14 items-center">
            <div>
              <span className="section-tag">Missão</span>
              <h2 className="font-display text-3xl md:text-4xl text-gray-900 leading-tight mb-5">
                Conformidade em SST acessível e responsável para empresas brasileiras.
              </h2>
              <p className="text-[16px] text-gray-500 leading-relaxed mb-4">
                A Sublime SST nasceu para facilitar o acesso das pequenas e médias empresas às obrigações
                de Segurança e Saúde Ocupacional — de forma séria, transparente e adequada a cada perfil.
              </p>
              <p className="text-[16px] text-gray-500 leading-relaxed">
                Oferecemos duas frentes complementares: consultoria personalizada para empresas de qualquer
                porte e risco, e o Sublime Digital para perfis de baixo risco operacional que buscam um
                modelo mais simples e previsível.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {VALUES.map((v) => (
                <div key={v.title} className="card p-5">
                  <div className="text-2xl mb-3">{v.icon}</div>
                  <h4 className="text-[14px] font-bold text-gray-900 mb-1.5">{v.title}</h4>
                  <p className="text-[13px] text-gray-500 leading-snug">{v.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Nossa abordagem */}
        <section className="py-20 px-6 bg-gray-50">
          <div className="max-w-[900px] mx-auto">
            <div className="text-center max-w-xl mx-auto mb-12">
              <span className="section-tag">Abordagem</span>
              <h2 className="font-display text-3xl text-gray-900">Como trabalhamos</h2>
            </div>
            <div className="flex flex-col gap-5">
              {[
                {
                  n: '01',
                  title: 'Avaliamos antes de oferecer',
                  body: 'Cada empresa passa por análise antes de ser direcionada para uma solução. Não vendemos produtos inadequados ao perfil do cliente.',
                },
                {
                  n: '02',
                  title: 'Elaboramos com base nas normas',
                  body: 'PGR, PCMSO, LTCAT e todos os documentos são elaborados em conformidade com as Normas Regulamentadoras vigentes.',
                },
                {
                  n: '03',
                  title: 'Mantemos a documentação organizada',
                  body: 'Os registros de SST são mantidos de forma estruturada e acessíveis para auditorias, fiscalizações e necessidades internas.',
                },
                {
                  n: '04',
                  title: 'Comunicamos com clareza',
                  body: 'Explicamos as obrigações, os prazos e as atualizações necessárias de forma compreensível, sem jargões técnicos desnecessários.',
                },
              ].map((step) => (
                <div key={step.n} className="card p-6 flex gap-5 items-start">
                  <div
                    className="w-10 h-10 rounded-[10px] flex items-center justify-center text-[13px] font-bold shrink-0"
                    style={{ background: 'var(--teal-pale)', color: 'var(--teal)' }}
                  >
                    {step.n}
                  </div>
                  <div>
                    <h4 className="text-[15px] font-bold text-gray-900 mb-1">{step.title}</h4>
                    <p className="text-[14px] text-gray-500 leading-relaxed">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Nossas soluções */}
        <section className="py-20 px-6">
          <div className="max-w-[1120px] mx-auto">
            <div className="text-center max-w-xl mx-auto mb-12">
              <span className="section-tag">Soluções</span>
              <h2 className="font-display text-3xl text-gray-900">Duas frentes, uma equipe</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="card p-8">
                <div className="text-3xl mb-4">🏢</div>
                <h3 className="font-display text-xl text-gray-900 mb-3">Consultoria SST Personalizada</h3>
                <p className="text-[14px] text-gray-500 leading-relaxed mb-5">
                  Atendimento técnico do GR1 mais simples ao GR4 mais complexo. PGR, PCMSO, LTCAT,
                  laudos, treinamentos e gestão de riscos psicossociais.
                </p>
                <ul className="flex flex-col gap-2 mb-6">
                  {['Todos os CNAEs, do GR1 ao GR4', 'Solução sob medida', 'Orçamento personalizado'].map((i) => (
                    <li key={i} className="flex items-center gap-2 text-[13px] text-gray-600">
                      <CheckCircle size={14} className="text-teal shrink-0" />
                      {i}
                    </li>
                  ))}
                </ul>
                <Link href="/consultoria-sst" className="btn btn-petrol">
                  Solicitar Orçamento
                  <ArrowRight size={15} />
                </Link>
              </div>
              <div className="card p-8 border-2" style={{ borderColor: 'var(--teal)' }}>
                <div className="text-3xl mb-4">💻</div>
                <h3 className="font-display text-xl text-gray-900 mb-3">Sublime Digital</h3>
                <p className="text-[14px] text-gray-500 leading-relaxed mb-5">
                  Modelo simplificado para empresas GR1 com até 20 funcionários. Contratação, gestão e
                  organização documental digitais, com valor mensal fixo e previsível.
                </p>
                <ul className="flex flex-col gap-2 mb-6">
                  {['Até 20 funcionários, CNAE GR1', 'Processo inteiramente digital', 'Assinatura anual com valor fixo'].map((i) => (
                    <li key={i} className="flex items-center gap-2 text-[13px] text-gray-600">
                      <CheckCircle size={14} className="text-teal shrink-0" />
                      {i}
                    </li>
                  ))}
                </ul>
                <Link href="/elegibilidade" className="btn btn-primary">
                  Verificar Elegibilidade
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Contatos */}
        <section className="py-20 px-6 bg-gray-50">
          <div className="max-w-[640px] mx-auto text-center">
            <span className="section-tag">Contato</span>
            <h2 className="font-display text-3xl text-gray-900 mb-4">Fale com a equipe</h2>
            <p className="text-[15px] text-gray-500 leading-relaxed mb-8">
              Estamos disponíveis por WhatsApp e e-mail para esclarecer dúvidas, enviar propostas e
              orientar sobre as obrigações de SST da sua empresa.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://wa.me/5521997248630"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-lg"
              >
                💬 WhatsApp (21) 99724-8630
              </a>
              <a
                href="mailto:contato@sublimesst.com"
                className="btn btn-outline-dark btn-lg"
              >
                ✉️ contato@sublimesst.com
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  )
}
