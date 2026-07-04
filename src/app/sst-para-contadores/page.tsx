import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle, ArrowRight, Users } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { WhatsAppButton } from '@/components/layout/WhatsAppButton'
import { JsonLd } from '@/components/JsonLd'

export const metadata: Metadata = {
  title: 'SST para Contadores e Escritórios Contábeis | Sublime SST',
  description: 'Ajude seus clientes a regularizarem SST e eSocial sem aumentar sua estrutura interna. Seja parceiro da Sublime SST e amplie os serviços do seu escritório.',
}

const PAINS = [
  { icon: '📋', title: 'eSocial obrigatório e cobranças dos clientes', body: 'Clientes perguntam sobre SST e eSocial, mas isso está fora do escopo do escritório contábil.' },
  { icon: '⚖️', title: 'Responsabilidade indireta', body: 'O contador conhece a empresa e sabe dos riscos, mas não tem estrutura para resolver a conformidade de SST.' },
  { icon: '⏰', title: 'Sem tempo para resolver', body: 'A equipe já está sobrecarregada com obrigações fiscais. SST é mais um problema sem solução clara.' },
  { icon: '🔄', title: 'Oportunidade de serviço não aproveitada', body: 'Cada cliente com necessidade de SST é uma indicação que vai para outro fornecedor.' },
  { icon: '📉', title: 'Risco de perder o cliente', body: 'Se o cliente busca SST em outro lugar, pode acabar sendo abordado por concorrentes do seu escritório.' },
  { icon: '🤷', title: 'Falta de um parceiro confiável', body: 'Indicar sem conhecer o fornecedor é um risco para a reputação do escritório.' },
]

const FAQ = [
  { q: 'Como funciona a parceria?', a: 'Você indica seus clientes que precisam de SST usando seu link exclusivo. A Sublime SST cuida de todo o processo — avaliação, documentação, conformidade e acompanhamento. Você não precisa se envolver na execução.' },
  { q: 'Quanto o escritório recebe por indicação?', a: 'Comissão recorrente de 10% sobre cada mensalidade paga pelos clientes que você indicar, por até 12 meses por cliente. Uma carteira com poucas indicações convertidas já gera uma receita recorrente relevante para o escritório.' },
  { q: 'O contador precisa entender de SST para ser parceiro?', a: 'Não. Basta identificar que o cliente tem funcionários CLT e pode precisar de SST. A nossa equipe faz a avaliação técnica e orienta o cliente.' },
  { q: 'Existe algum custo para se tornar parceiro?', a: 'Não. O cadastro de parceiro é gratuito. Você indica, a Sublime cuida do resto — e paga comissão pelas conversões.' },
  { q: 'Como funciona o acompanhamento das indicações?', a: 'Pelo Portal do Parceiro você acompanha cada indicação, o status de conversão e o extrato de comissões — com transparência total para informar seus clientes com segurança.' },
]

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ.map(f => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
}

export default function SstParaContadoresPage() {
  return (
    <>
      <JsonLd data={faqSchema} />
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
              <Users size={12} />
              Para contadores e escritórios contábeis
            </div>
            <h1 className="font-display text-4xl md:text-5xl text-white leading-[1.15] mb-5">
              Ajude seus clientes a regularizarem SST e eSocial{' '}
              <em className="text-teal-light not-italic">sem aumentar sua estrutura interna.</em>
            </h1>
            <p className="text-[17px] text-white/70 leading-relaxed mb-10 max-w-2xl mx-auto">
              A Sublime SST atua como extensão especializada do seu escritório. Você indica,
              a gente cuida de tudo — e você recebe <strong className="text-white">comissão
              recorrente de 10%</strong> sobre cada mensalidade dos clientes convertidos, por até 12 meses.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link href="/parceiros?utm_source=lp-contadores&utm_campaign=nicho" className="btn btn-primary btn-lg">
                <CheckCircle size={17} />
                Quero ser parceiro
              </Link>
              <Link href="/elegibilidade?utm_source=lp-contadores&utm_campaign=nicho&utm_medium=indicacao" className="btn btn-outline btn-lg">
                Indicar um cliente agora
              </Link>
            </div>
          </div>
        </section>

        {/* Dores */}
        <section className="py-20 px-6 bg-gray-50">
          <div className="max-w-[1120px] mx-auto">
            <div className="text-center max-w-xl mx-auto mb-12">
              <span className="section-tag">O desafio</span>
              <h2 className="font-display text-3xl md:text-4xl text-gray-900">
                O que os contadores enfrentam com SST
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {PAINS.map((p) => (
                <div key={p.title} className="card p-7">
                  <div className="text-[28px] mb-4">{p.icon}</div>
                  <h3 className="text-[15px] font-bold text-gray-900 mb-2">{p.title}</h3>
                  <p className="text-[13px] text-gray-500 leading-relaxed">{p.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Como funciona */}
        <section className="py-20 px-6">
          <div className="max-w-[1120px] mx-auto grid md:grid-cols-2 gap-14 items-center">
            <div>
              <span className="section-tag">A solução</span>
              <h2 className="font-display text-3xl md:text-4xl text-gray-900 leading-tight mb-5">
                A Sublime SST como extensão do seu escritório contábil.
              </h2>
              <p className="text-[16px] text-gray-500 leading-relaxed mb-6">
                Quando um cliente seu precisar de SST, você indica para a Sublime SST. Nossa equipe
                assume a avaliação técnica, a documentação e o acompanhamento — sem que você
                precise se envolver nos detalhes.
              </p>
              <ul className="flex flex-col gap-3 mb-7">
                {[
                  'Comissão recorrente: 10% de cada mensalidade, por até 12 meses por cliente',
                  'Avaliação gratuita para os clientes indicados',
                  'PGR, PCMSO, LTCAT e outros documentos obrigatórios',
                  'Atendimento do GR1 ao GR4 — todos os portes de cliente',
                  'Portal do Parceiro: link exclusivo, indicações e extrato de comissões',
                  'Sem custo para o escritório parceiro',
                ].map((b) => (
                  <li key={b} className="flex items-start gap-3">
                    <CheckCircle size={17} className="text-teal shrink-0 mt-0.5" />
                    <span className="text-[15px] text-gray-700">{b}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/parceiros?utm_source=lp-contadores&utm_campaign=nicho"
                className="btn btn-primary"
              >
                Cadastrar meu escritório como parceiro
                <ArrowRight size={16} />
              </Link>
            </div>

            {/* Steps */}
            <div className="flex flex-col gap-4">
              {[
                { n: '01', title: 'Cadastre seu escritório', body: 'Preencha o formulário de parceiros — é gratuito e leva menos de 5 minutos.' },
                { n: '02', title: 'Identifique clientes com SST pendente', body: 'Qualquer cliente com funcionários CLT pode precisar de SST. Você já tem essa visão.' },
                { n: '03', title: 'Indique para a Sublime SST', body: 'Compartilhe o link do teste de elegibilidade ou nos passe o contato direto.' },
                { n: '04', title: 'A gente cuida do resto', body: 'Avaliação, documentação, conformidade e acompanhamento — tudo com a Sublime SST.' },
              ].map((s) => (
                <div key={s.n} className="card p-5 flex gap-4 items-start">
                  <div
                    className="w-10 h-10 rounded-[10px] flex items-center justify-center text-[13px] font-bold shrink-0"
                    style={{ background: 'var(--teal-pale)', color: 'var(--teal)' }}
                  >
                    {s.n}
                  </div>
                  <div>
                    <h4 className="text-[14px] font-bold text-gray-900 mb-1">{s.title}</h4>
                    <p className="text-[13px] text-gray-500 leading-snug">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20 px-6 bg-gray-50">
          <div className="max-w-[720px] mx-auto">
            <div className="text-center mb-12">
              <span className="section-tag">Dúvidas</span>
              <h2 className="font-display text-3xl text-gray-900">Perguntas frequentes</h2>
            </div>
            <div className="flex flex-col gap-4">
              {FAQ.map((item) => (
                <div key={item.q} className="card p-6">
                  <h4 className="text-[15px] font-bold text-gray-900 mb-2">{item.q}</h4>
                  <p className="text-[14px] text-gray-500 leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section
          className="py-16 px-6 text-center"
          style={{ background: 'linear-gradient(135deg, var(--petrol), var(--teal))' }}
        >
          <h2 className="font-display text-3xl md:text-4xl text-white mb-3">
            Pronto para ampliar os serviços do seu escritório?
          </h2>
          <p className="text-[16px] text-white/70 mb-8 max-w-lg mx-auto">
            Cadastre-se como parceiro ou indique um cliente agora — sem burocracia.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/parceiros?utm_source=lp-contadores&utm_campaign=nicho"
              className="btn btn-white btn-lg"
            >
              Quero ser parceiro
            </Link>
            <Link
              href="/elegibilidade?utm_source=lp-contadores&utm_campaign=nicho&utm_medium=indicacao"
              className="btn btn-outline btn-lg"
            >
              Indicar um cliente
            </Link>
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  )
}
