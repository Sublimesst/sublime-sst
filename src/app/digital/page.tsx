import Link from 'next/link'
import { CheckCircle, Star } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { WhatsAppButton } from '@/components/layout/WhatsAppButton'
import { PRICING } from '@/lib/pricing'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sublime Digital — Conformidade em SST para empresas de baixo risco',
  description: 'Produto digital da Sublime SST para regularização de empresas de baixo risco com até 20 funcionários. Dois planos: Digital Essencial a partir de R$199/mês e Digital Premium a partir de R$299/mês.',
  alternates: { canonical: 'https://sublimesst.com/digital' },
}

const FEATURES = [
  { icon: '📋', title: 'PGR + PCMSO na implantação', body: 'Documentos obrigatórios elaborados por especialista, incluindo médico coordenador para o PCMSO.' },
  { icon: '🏛️', title: 'Gestão eSocial SST', body: 'Envio e monitoramento dos eventos S-2210, S-2220 e S-2240 conforme obrigatoriedade.' },
  { icon: '🗂️', title: 'Portal do cliente', body: 'Todos os documentos organizados e acessíveis digitalmente, com histórico e alertas de vencimento.' },
  { icon: '🔔', title: 'Monitoramento de exames', body: 'Notificação antecipada de vencimentos de exames periódicos para nenhum prazo ser perdido.' },
  { icon: '📄', title: 'Declaração técnica de ausência de insalubridade', body: 'Declaração técnica preliminar de não identificação de agentes insalubres, incluída na implantação para perfis GR1.' },
  { icon: '🎯', title: 'Teste de elegibilidade', body: 'Análise gratuita do CNAE e perfil operacional antes da contratação — sem surpresas.' },
]

const COMPARISON = [
  { feat: 'Processo de contratação', trad: 'Por projeto, com visitas técnicas', digital: true, digitalText: 'Contratação 100% digital' },
  { feat: 'Preço previsível', trad: 'Variável por projeto', digital: true, digitalText: 'Valor fixo mensal' },
  { feat: 'PGR + PCMSO', trad: 'Cobrado separado (R$600–2.000+)', digital: true, digitalText: 'Incluso na implantação' },
  { feat: 'Gestão eSocial SST', trad: 'Cobrado à parte', digital: true, digitalText: 'Incluso na mensalidade' },
  { feat: 'Para todos os perfis', trad: true, tradText: 'Sim', digital: false, digitalText: 'GR1 · até 20 func.' },
  { feat: 'Atendimento especializado', trad: true, tradText: 'Sim', digital: true, digitalText: 'Para perfis enquadrados' },
]

const ESSENCIAL_ITEMS = [
  'PGR + LPP (implantação)',
  'PCMSO com médico coordenador (implantação)',
  'Declaração técnica de ausência de insalubridade (implantação)',
  'Ordens de Serviço + Fichas de EPI (implantação)',
  'Gestão eSocial SST (S-2210, S-2220, S-2240)',
  'Monitoramento de exames periódicos',
  'Portal do cliente com repositório digital',
  'Suporte por e-mail — resposta em até 48h',
]

const PREMIUM_EXTRAS = [
  'PPP de novos funcionários incluso',
  'Abertura de CAT — até 1 ocorrência/mês',
  'Relatório analítico semestral',
  'Suporte via WhatsApp — resposta em até 24h',
]

const UPSELL = [
  'PPP avulso — R$ 60 por funcionário (Essencial)',
  'Abertura de CAT avulsa — R$ 100/ocorrência (Essencial)',
  'Agendamento de exames ocupacionais (parceiro clínico)',
  'LTCAT — quando aplicável ao perfil',
  'Treinamentos em NRs (NR-35, NR-10, Brigada, CIPA)',
  'Relatório analítico avulso — R$ 250',
  'Visita técnica presencial',
]

const PRICING_RANGES = [
  { range: '1–5 funcionários',   essencial: PRICING.essencial.faixas['1-5'].monthly / 100,   premium: PRICING.premium.faixas['1-5'].monthly / 100 },
  { range: '6–10 funcionários',  essencial: PRICING.essencial.faixas['6-10'].monthly / 100,  premium: PRICING.premium.faixas['6-10'].monthly / 100 },
  { range: '11–20 funcionários', essencial: PRICING.essencial.faixas['11-20'].monthly / 100, premium: PRICING.premium.faixas['11-20'].monthly / 100 },
]

const IMPL_ESSENCIAL = { padrao: PRICING.essencial.implantacao.padrao / 100, promo: PRICING.essencial.implantacao.promo / 100 }
const IMPL_PREMIUM   = { padrao: PRICING.premium.implantacao.padrao / 100,   promo: PRICING.premium.implantacao.promo / 100 }

export default function DigitalPage() {
  return (
    <>
      <Navbar />
      <main>

        {/* ── Hero ─────────────────────────────────────────── */}
        <section className="py-20 px-6 text-center relative overflow-hidden"
          style={{ background: 'linear-gradient(160deg, #051e26 0%, #0d4a5c 60%, #0a7a78 100%)' }}>
          <div className="absolute inset-0 opacity-[.03]"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='30' cy='30' r='4' fill='%23fff'/%3E%3C/svg%3E\")" }} />
          <div className="max-w-[720px] mx-auto relative z-10">
            <span className="section-tag-dark mb-5 inline-block">Produto</span>
            <h1 className="font-display text-4xl md:text-5xl text-white mb-5 leading-tight">
              Sublime Digital
            </h1>
            <p className="text-[17px] text-white/70 leading-relaxed mb-3 max-w-lg mx-auto">
              Conformidade em SST 100% online para pequenas empresas de baixo risco. PGR, PCMSO e
              gestão eSocial — sem visita presencial, sem burocracia.
            </p>
            <p className="text-[14px] text-white/50 mb-8">
              A partir de <span className="text-white font-bold text-[18px]">R$ 199/mês</span> · Implantação a partir de R$ 149
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link href="/elegibilidade" className="btn btn-primary btn-lg">
                <CheckCircle size={18} />
                Verificar Elegibilidade Grátis
              </Link>
              <a href="https://wa.me/5521997248630" target="_blank" rel="noopener noreferrer"
                className="btn btn-outline btn-lg">
                Falar com a Equipe
              </a>
            </div>
          </div>
        </section>

        {/* ── O que está incluído ───────────────────────────── */}
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

        {/* ── Planos e Preços ───────────────────────────────── */}
        <section className="py-20 px-6">
          <div className="max-w-[960px] mx-auto">
            <div className="text-center max-w-xl mx-auto mb-14">
              <span className="section-tag">Planos e Preços</span>
              <h2 className="font-display text-3xl md:text-4xl text-gray-900 mb-3">
                Escolha o plano ideal para sua empresa
              </h2>
              <p className="text-[14px] text-gray-500">
                Ambos os planos incluem implantação completa com PGR, PCMSO e documentação inicial.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* Digital Essencial */}
              <div className="card p-8 border border-gray-200">
                <p className="text-[12px] font-bold text-teal uppercase tracking-widest mb-2">Digital Essencial</p>
                <p className="text-[13px] text-gray-500 mb-5">Conformidade completa com o melhor custo-benefício</p>

                <div className="mb-6">
                  {PRICING_RANGES.map((r, i) => (
                    <div key={r.range}
                      className={`flex justify-between items-center py-3 border-b border-gray-100 last:border-0 ${i === 0 ? 'border-t border-gray-100' : ''}`}>
                      <span className="text-[13px] text-gray-500">{r.range}</span>
                      <span className="text-[18px] font-bold text-petrol">
                        R$ {r.essencial}<span className="text-[12px] font-normal text-gray-400">/mês</span>
                      </span>
                    </div>
                  ))}
                </div>

                <div className="bg-gray-50 rounded-[10px] p-4 mb-6 text-[13px]">
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-500">Implantação normal</span>
                    <span className="font-semibold text-gray-700">R$ {IMPL_ESSENCIAL.padrao}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700 font-semibold">🎁 Promo 24h</span>
                    <span className="font-bold text-green-700">R$ {IMPL_ESSENCIAL.promo} <span className="line-through font-normal text-gray-400 text-[11px]">R$ {IMPL_ESSENCIAL.padrao}</span></span>
                  </div>
                </div>

                <ul className="flex flex-col gap-2 mb-8">
                  {ESSENCIAL_ITEMS.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-[13px] text-gray-600">
                      <CheckCircle size={14} className="text-teal shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>

                <Link href="/elegibilidade" className="btn btn-outline-dark w-full text-center">
                  Verificar Elegibilidade
                </Link>
              </div>

              {/* Digital Premium */}
              <div className="card p-8 border-2 border-blue-500 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-blue-600 text-white text-[11px] font-bold px-4 py-1 rounded-full flex items-center gap-1">
                    <Star size={11} fill="white" /> Mais completo
                  </span>
                </div>
                <p className="text-[12px] font-bold text-blue-600 uppercase tracking-widest mb-2">Digital Premium</p>
                <p className="text-[13px] text-gray-500 mb-5">Tudo incluído — sem surpresas na fatura</p>

                <div className="mb-6">
                  {PRICING_RANGES.map((r, i) => (
                    <div key={r.range}
                      className={`flex justify-between items-center py-3 border-b border-gray-100 last:border-0 ${i === 0 ? 'border-t border-gray-100' : ''}`}>
                      <span className="text-[13px] text-gray-500">{r.range}</span>
                      <span className="text-[18px] font-bold text-blue-700">
                        R$ {r.premium}<span className="text-[12px] font-normal text-gray-400">/mês</span>
                      </span>
                    </div>
                  ))}
                </div>

                <div className="bg-blue-50 rounded-[10px] p-4 mb-6 text-[13px]">
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-500">Implantação normal</span>
                    <span className="font-semibold text-gray-700">R$ {IMPL_PREMIUM.padrao}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700 font-semibold">🎁 Promo 24h</span>
                    <span className="font-bold text-green-700">R$ {IMPL_PREMIUM.promo} <span className="line-through font-normal text-gray-400 text-[11px]">R$ {IMPL_PREMIUM.padrao}</span></span>
                  </div>
                </div>

                <ul className="flex flex-col gap-2 mb-6">
                  {ESSENCIAL_ITEMS.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-[13px] text-gray-600">
                      <CheckCircle size={14} className="text-teal shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="text-[12px] font-semibold text-blue-600 uppercase tracking-wide mb-2">Exclusivo Premium:</p>
                <ul className="flex flex-col gap-2 mb-8">
                  {PREMIUM_EXTRAS.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-[13px] text-blue-700">
                      <CheckCircle size={14} className="text-blue-500 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>

                <Link href="/elegibilidade" className="btn btn-primary w-full text-center">
                  <CheckCircle size={16} /> Verificar Elegibilidade
                </Link>
              </div>
            </div>

            <p className="text-[12px] text-gray-400 text-center">
              Contrato anual com pagamento mensal e renovação automática. Compromisso mínimo de 6 mensalidades após entrega dos documentos.
              Planos válidos exclusivamente para empresas GR1 com até 20 funcionários aprovadas no teste de elegibilidade.
            </p>
          </div>
        </section>

        {/* ── Para quem é ───────────────────────────────────── */}
        <section className="py-20 px-6 bg-gray-50">
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
                { icon: '✅', title: 'Buscam previsibilidade financeira', body: 'Valor fixo mensal, sem surpresas — você sabe exatamente o custo da conformidade.' },
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

        {/* ── Comparativo ───────────────────────────────────── */}
        <section className="py-20 px-6">
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

        {/* ── Escopo ────────────────────────────────────────── */}
        <section className="py-20 px-6 bg-gray-50">
          <div className="max-w-[900px] mx-auto">
            <div className="text-center max-w-xl mx-auto mb-12">
              <span className="section-tag">Escopo</span>
              <h2 className="font-display text-3xl text-gray-900">O que está incluído vs. o que é sob demanda</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="card p-7">
                <h3 className="text-[15px] font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-[12px]">✓</span>
                  Incluso em ambos os planos
                </h3>
                <ul className="flex flex-col gap-2.5">
                  {ESSENCIAL_ITEMS.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-[13px] text-gray-600">
                      <CheckCircle size={14} className="text-teal shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-5 pt-4 border-t border-gray-100">
                  <p className="text-[12px] font-semibold text-blue-600 mb-2">+ Exclusivo Digital Premium:</p>
                  <ul className="flex flex-col gap-2">
                    {PREMIUM_EXTRAS.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-[13px] text-blue-700">
                        <CheckCircle size={14} className="text-blue-500 shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="card p-7 bg-gray-50">
                <h3 className="text-[15px] font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[12px]">+</span>
                  Sob orçamento separado
                </h3>
                <ul className="flex flex-col gap-2.5">
                  {UPSELL.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-[13px] text-gray-500">
                      <span className="shrink-0 mt-0.5 text-amber-500">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="text-[12px] text-gray-400 mt-4">
                  Itens sob demanda são cotados separadamente. Quando necessários, sua empresa é orientada sobre as melhores opções.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────── */}
        <section className="py-16 px-6 text-center"
          style={{ background: 'linear-gradient(135deg, var(--petrol), var(--teal))' }}>
          <h2 className="font-display text-3xl text-white mb-3">Sua empresa pode ser elegível ao modelo digital</h2>
          <p className="text-white/70 mb-2">Faça o teste gratuito e descubra em menos de 5 minutos.</p>
          <p className="text-[13px] text-white/40 mb-8">
            Planos válidos exclusivamente para empresas GR1 com até 20 funcionários aprovadas no teste de elegibilidade.
            Para outros perfis, consulte nossa{' '}
            <Link href="/consultoria-sst" className="text-teal-light hover:underline">consultoria personalizada</Link>.
          </p>
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
