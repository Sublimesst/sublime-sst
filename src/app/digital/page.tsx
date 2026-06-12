import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { WhatsAppButton } from '@/components/layout/WhatsAppButton'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sublime Digital — Conformidade em SST 100% online',
  description: 'Produto digital da Sublime SST para regularização de empresas de baixo risco com até 20 funcionários.',
}

const FEATURES = [
  { icon: '📋', title: 'PCMSO e PGR', body: 'Documentos obrigatórios elaborados conforme NR-7 e NR-1, adaptados ao perfil da sua empresa.' },
  { icon: '🗂️', title: 'Organização documental', body: 'Registros de SST mantidos organizados e acessíveis para auditorias e fiscalizações.' },
  { icon: '🔄', title: 'Atualizações anuais', body: 'Documentação revisada e atualizada conforme necessário ao longo do período contratado.' },
  { icon: '📱', title: 'Atendimento remoto', body: 'Comunicação ágil por WhatsApp e e-mail, sem necessidade de reuniões presenciais.' },
  { icon: '✅', title: 'Verificação de conformidade', body: 'Monitoramento das obrigações de SST aplicáveis conforme as Normas Regulamentadoras.' },
  { icon: '🎯', title: 'Análise de perfil', body: 'Cada empresa passa por análise criteriosa antes da contratação, garantindo adequação ao modelo.' },
]

const COMPARISON = [
  { feat: 'Processo de contratação', trad: 'Presencial e burocrático', digital: true, digitalText: '100% online' },
  { feat: 'Preço previsível', trad: 'Variável por projeto', digital: true, digitalText: 'Mensalidade fixa' },
  { feat: 'Tempo de implantação', trad: 'Semanas', digital: true, digitalText: 'Ágil e estruturado' },
  { feat: 'Documentação digital', trad: 'Física / e-mail avulso', digital: true, digitalText: 'Organizada digitalmente' },
  { feat: 'Para todos os perfis', trad: true, tradText: 'Sim', digital: false, digitalText: 'Baixo risco, até 20 func.' },
  { feat: 'Atendimento especializado', trad: true, tradText: 'Sim', digital: true, digitalText: 'Para perfis enquadrados' },
]

export default function DigitalPage() {
  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="py-20 px-6 text-center relative overflow-hidden"
          style={{ background: 'linear-gradient(160deg, #051e26 0%, #0d4a5c 60%, #0a7a78 100%)' }}>
          <div className="absolute inset-0 opacity-[.03]"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='30' cy='30' r='4' fill='%23fff'/%3E%3C/svg%3E\")" }} />
          <div className="max-w-[720px] mx-auto relative z-10">
            <span className="section-tag-dark mb-5 inline-block">Produto</span>
            <h1 className="font-display text-4xl md:text-5xl text-white mb-5 leading-tight">
              Sublime Digital
            </h1>
            <p className="text-[17px] text-white/70 leading-relaxed mb-8 max-w-lg mx-auto">
              Regularização e conformidade em SST com experiência simples, segura e totalmente
              digital para pequenas empresas de baixo risco operacional.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link href="/elegibilidade" className="btn btn-primary btn-lg">
                <CheckCircle size={18} />
                Verificar Elegibilidade
              </Link>
              <a href="https://wa.me/5521997248630" target="_blank" rel="noopener noreferrer"
                className="btn btn-outline btn-lg">
                Falar com a Equipe
              </a>
            </div>
          </div>
        </section>

        {/* What's included */}
        <section className="py-20 px-6 bg-gray-50">
          <div className="max-w-[1120px] mx-auto">
            <div className="text-center max-w-xl mx-auto mb-14">
              <span className="section-tag">O que está incluído</span>
              <h2 className="font-display text-3xl md:text-4xl text-gray-900">
                Tudo que sua empresa precisa para manter a conformidade
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {FEATURES.map((f) => (
                <div key={f.title} className="card card-hover p-7 text-center">
                  <div className="text-4xl mb-4">{f.icon}</div>
                  <h3 className="text-[15px] font-bold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-[13px] text-gray-500 leading-relaxed">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* For whom */}
        <section className="py-20 px-6">
          <div className="max-w-[900px] mx-auto">
            <div className="text-center max-w-xl mx-auto mb-12">
              <span className="section-tag">Para quem é</span>
              <h2 className="font-display text-3xl text-gray-900">Sublime Digital é indicado para empresas que…</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[
                { icon: '✅', title: 'Têm até 20 funcionários', body: 'O modelo digital foi desenhado para pequenas empresas com operação enxuta.' },
                { icon: '✅', title: 'Possuem CNAE de Grau de Risco 1', body: 'Atividades classificadas como GR1 na NR-4, sem riscos operacionais elevados.' },
                { icon: '✅', title: 'Não operam com riscos críticos', body: 'Sem máquinas industriais, químicos perigosos, trabalho em altura ou atividades externas de alto risco.' },
                { icon: '✅', title: 'Buscam previsibilidade financeira', body: 'Mensalidade fixa, sem surpresas — você sabe exatamente o custo da conformidade.' },
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
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-[12px] text-[13px] text-amber-800">
              ⚠️ O modelo digital é adequado exclusivamente para empresas de baixo risco operacional com até 20 funcionários.
              Outros perfis são atendidos consultivamente pela equipe da Sublime SST.
            </div>
          </div>
        </section>

        {/* Comparison */}
        <section className="py-20 px-6 bg-gray-50">
          <div className="max-w-[900px] mx-auto">
            <div className="text-center max-w-xl mx-auto mb-12">
              <span className="section-tag">Comparativo</span>
              <h2 className="font-display text-3xl text-gray-900">Digital vs. Modelo tradicional</h2>
            </div>
            <div className="card overflow-hidden">
              <table className="w-full border-collapse text-[14px]">
                <thead>
                  <tr>
                    <th className="text-left px-5 py-3.5 bg-gray-100 text-gray-700 font-semibold text-[13px] tracking-wide">Característica</th>
                    <th className="text-left px-5 py-3.5 bg-gray-100 text-gray-700 font-semibold text-[13px] tracking-wide">Modelo tradicional</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-[13px] tracking-wide"
                      style={{ background: 'var(--teal-pale)', color: 'var(--teal)' }}>Sublime Digital ✦</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map((row) => (
                    <tr key={row.feat} className="border-t border-gray-100">
                      <td className="px-5 py-3 text-gray-700">{row.feat}</td>
                      <td className="px-5 py-3 text-gray-500">
                        {typeof row.trad === 'boolean'
                          ? <span className="text-teal">✓ {row.tradText}</span>
                          : row.trad}
                      </td>
                      <td className="px-5 py-3">
                        {row.digital
                          ? <span className="text-teal font-medium">✓ {row.digitalText}</span>
                          : <span className="text-gray-400">{row.digitalText}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 px-6 text-center"
          style={{ background: 'linear-gradient(135deg, var(--petrol), var(--teal))' }}>
          <h2 className="font-display text-3xl text-white mb-3">Sua empresa pode ser elegível ao modelo digital</h2>
          <p className="text-white/70 mb-8">Faça o teste gratuito e descubra em menos de 5 minutos.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/elegibilidade" className="btn btn-white btn-lg">
              Fazer o Teste de Elegibilidade
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
