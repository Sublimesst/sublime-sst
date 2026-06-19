import Link from 'next/link'
import { CheckCircle, ArrowRight } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { WhatsAppButton } from '@/components/layout/WhatsAppButton'

export interface NichoPain {
  icon: string
  title: string
  body: string
}

export interface NichoFaq {
  q: string
  a: string
}

export interface NichoCnae {
  code: string
  desc: string
}

export interface NichoInclusion {
  label: string
  included: boolean
}

export interface NichoCta {
  label: string
  href: string
  variant: 'primary' | 'secondary' | 'outline'
}

export interface NichoConfig {
  badge: string
  headline: string
  subtitle: string
  pains: NichoPain[]
  solution: {
    title: string
    body: string
    bullets: string[]
  }
  cnaes: NichoCnae[]
  inclusions?: NichoInclusion[]
  faq?: NichoFaq[]
  ctas: NichoCta[]
  ctaSection: {
    title: string
    subtitle: string
  }
}

export function NichoLandingPage({ config }: { config: NichoConfig }) {
  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section
          className="relative overflow-hidden py-20 px-6"
          style={{ background: 'linear-gradient(160deg, #051e26 0%, #0d4a5c 45%, #0f6e6e 100%)' }}
        >
          <div
            className="absolute inset-0 opacity-[.03]"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='30' cy='30' r='4' fill='%23fff'/%3E%3C/svg%3E\")" }}
          />
          <div className="max-w-[800px] mx-auto text-center relative z-10">
            <div
              className="inline-flex items-center gap-2 mb-6 px-3.5 py-1.5 rounded-full border text-[12px] font-medium text-teal-light tracking-widest uppercase"
              style={{ background: 'rgba(255,255,255,.1)', borderColor: 'rgba(255,255,255,.2)' }}
            >
              <span className="w-1.5 h-1.5 bg-teal-light rounded-full" />
              {config.badge}
            </div>
            <h1 className="font-display text-4xl md:text-5xl text-white leading-[1.15] mb-5">
              {config.headline}
            </h1>
            <p className="text-[17px] text-white/70 leading-relaxed mb-10 max-w-2xl mx-auto">
              {config.subtitle}
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              {config.ctas.map((cta) => (
                <Link
                  key={cta.label}
                  href={cta.href}
                  className={`btn btn-lg ${
                    cta.variant === 'primary' ? 'btn-primary' :
                    cta.variant === 'secondary' ? 'btn-white' :
                    'btn-outline'
                  }`}
                >
                  {cta.label}
                  {cta.variant === 'primary' && <ArrowRight size={17} />}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Dores */}
        <section className="py-20 px-6 bg-gray-50">
          <div className="max-w-[1120px] mx-auto">
            <div className="text-center max-w-xl mx-auto mb-12">
              <span className="section-tag">O desafio</span>
              <h2 className="font-display text-3xl md:text-4xl text-gray-900">
                O que sua empresa enfrenta hoje
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {config.pains.map((p) => (
                <div key={p.title} className="card p-7">
                  <div
                    className="w-12 h-12 rounded-[12px] flex items-center justify-center text-[22px] mb-4"
                    style={{ background: 'linear-gradient(135deg, #fee2e2, #fecaca)' }}
                  >
                    {p.icon}
                  </div>
                  <h3 className="text-[15px] font-bold text-gray-900 mb-2">{p.title}</h3>
                  <p className="text-[13px] text-gray-500 leading-relaxed">{p.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Solução */}
        <section className="py-20 px-6">
          <div className="max-w-[1120px] mx-auto grid md:grid-cols-2 gap-14 items-center">
            <div>
              <span className="section-tag">A solução</span>
              <h2 className="font-display text-3xl md:text-4xl text-gray-900 leading-tight mb-5">
                {config.solution.title}
              </h2>
              <p className="text-[16px] text-gray-500 leading-relaxed mb-6">
                {config.solution.body}
              </p>
              <ul className="flex flex-col gap-3">
                {config.solution.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-3">
                    <CheckCircle size={17} className="text-teal shrink-0 mt-0.5" />
                    <span className="text-[15px] text-gray-700">{b}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-4">
              {/* CNAEs */}
              <div className="card p-6">
                <h4 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Exemplos de CNAEs atendidos
                </h4>
                <div className="flex flex-col gap-2">
                  {config.cnaes.map((c) => (
                    <div key={c.code} className="flex items-center gap-3 text-[13px]">
                      <span className="font-mono font-bold text-teal shrink-0">{c.code}</span>
                      <span className="text-gray-600">{c.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA card */}
              <div
                className="rounded-[16px] p-6"
                style={{ background: 'linear-gradient(135deg, var(--petrol), var(--teal))' }}
              >
                <p className="text-[15px] font-semibold text-white mb-2">
                  Verifique se sua empresa se enquadra
                </p>
                <p className="text-[13px] text-white/70 mb-4">
                  O teste leva menos de 5 minutos e não gera compromisso.
                </p>
                <Link
                  href={config.ctas[0].href}
                  className="btn btn-white btn-sm w-full text-center"
                >
                  {config.ctas[0].label}
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Incluso vs. Sob demanda (opcional) */}
        {config.inclusions && (
          <section className="py-16 px-6 bg-gray-50">
            <div className="max-w-[800px] mx-auto">
              <div className="text-center mb-10">
                <span className="section-tag">Escopo</span>
                <h2 className="font-display text-3xl text-gray-900">O que está incluso</h2>
              </div>
              <div className="card overflow-hidden">
                {config.inclusions.map((item) => (
                  <div key={item.label} className="flex items-center gap-4 px-6 py-4 border-b border-gray-100 last:border-0">
                    <span className={`text-[18px] shrink-0 ${item.included ? 'text-teal' : 'text-gray-300'}`}>
                      {item.included ? '✓' : '—'}
                    </span>
                    <span className={`text-[14px] ${item.included ? 'text-gray-800' : 'text-gray-400'}`}>
                      {item.label}
                    </span>
                    {!item.included && (
                      <span className="ml-auto text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">sob orçamento</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* FAQ (opcional) */}
        {config.faq && config.faq.length > 0 && (
          <section className="py-20 px-6">
            <div className="max-w-[720px] mx-auto">
              <div className="text-center mb-12">
                <span className="section-tag">Dúvidas frequentes</span>
                <h2 className="font-display text-3xl text-gray-900">Perguntas e respostas</h2>
              </div>
              <div className="flex flex-col gap-4">
                {config.faq.map((item) => (
                  <div key={item.q} className="card p-6">
                    <h4 className="text-[15px] font-bold text-gray-900 mb-2">{item.q}</h4>
                    <p className="text-[14px] text-gray-500 leading-relaxed">{item.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA final */}
        <section
          className="py-16 px-6 text-center relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, var(--petrol), var(--teal))' }}
        >
          <h2 className="font-display text-3xl md:text-4xl text-white mb-3">
            {config.ctaSection.title}
          </h2>
          <p className="text-[16px] text-white/70 mb-8 max-w-lg mx-auto">
            {config.ctaSection.subtitle}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {config.ctas.map((cta) => (
              <Link
                key={cta.label}
                href={cta.href}
                className={`btn btn-lg ${
                  cta.variant === 'primary' ? 'btn-white' :
                  cta.variant === 'secondary' ? 'btn-white' :
                  'btn-outline'
                }`}
              >
                {cta.label}
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  )
}
