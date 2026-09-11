import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle, ArrowRight, Users } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { WhatsAppButton } from '@/components/layout/WhatsAppButton'
import { JsonLd } from '@/components/JsonLd'

const TITLE = 'SST para Contadores e Escritórios Contábeis | Sublime SST'
const DESCRIPTION = 'Conte com apoio técnico em SST para os clientes da sua contabilidade. Conheça o atendimento da Sublime e as condições do programa de parceiros.'
const URL = 'https://www.sublimesst.com/sst-para-contadores'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: URL },
}

const WHEN_TO_REFER = [
  { icon: '📝', title: 'Cliente vai contratar um funcionário', body: 'É um bom momento para indicar a avaliação do perfil de SST da empresa.' },
  { icon: '❓', title: 'Dúvidas sobre organização de SST', body: 'PGR, PCMSO, ASO ou eSocial: o cliente pode perguntar e o escritório pode encaminhar.' },
  { icon: '🧭', title: 'Necessidade de orientação técnica', body: 'Quando o caso exige avaliação especializada, a Sublime assume a análise.' },
  { icon: '📈', title: 'Busca por acompanhamento', body: 'Clientes que já têm SST organizada também podem buscar continuidade no acompanhamento.' },
]

const FAQ = [
  { q: 'Preciso executar o trabalho técnico de SST?', a: 'A equipe da Sublime realiza o trabalho técnico incluído no serviço contratado. As responsabilidades e informações necessárias são alinhadas com a empresa e o escritório.' },
  { q: 'Todo cliente pode contratar o Digital?', a: 'Não. O perfil deve ser avaliado pelo processo de elegibilidade. Demandas que exigem presença técnica ou maior complexidade seguem para análise de Consultoria.' },
  { q: 'Como conheço as condições e comissões?', a: 'Consulte a página do programa e o Termo de Parceria. A remuneração segue as condições vigentes e não substitui a avaliação técnica de cada cliente.' },
  { q: 'Como começar?', a: 'Conheça o programa, esclareça suas dúvidas e, se as condições fizerem sentido, conclua o cadastro existente.' },
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
              Apoio técnico em SST para os clientes da sua contabilidade
            </h1>
            <p className="text-[17px] text-white/70 leading-relaxed mb-10 max-w-2xl mx-auto">
              Quando surgir uma demanda de SST, seu escritório tem para onde encaminhar o cliente.
              A Sublime avalia o perfil da empresa e conduz o atendimento contratado, com orientação
              clara e acompanhamento.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link href="/parceiros?utm_source=lp-contadores&utm_campaign=nicho" className="btn btn-primary btn-lg whitespace-normal text-center">
                <CheckCircle size={17} />
                Conhecer o programa de parceiros
              </Link>
              <Link href="/conteudos/empresa-contratou-funcionario-obrigacoes-sst" className="btn btn-outline btn-lg whitespace-normal text-center">
                Ver o guia do primeiro funcionário
              </Link>
            </div>
          </div>
        </section>

        {/* Quando encaminhar */}
        <section className="py-20 px-6 bg-gray-50">
          <div className="max-w-[1120px] mx-auto">
            <div className="text-center max-w-xl mx-auto mb-12">
              <span className="section-tag">Quando encaminhar</span>
              <h2 className="font-display text-3xl md:text-4xl text-gray-900">
                Uma referência para as dúvidas que chegam ao escritório
              </h2>
              <p className="text-[15px] text-gray-500 leading-relaxed mt-4">
                Uma admissão, uma dúvida sobre exames ou a organização de informações de SST pode exigir
                avaliação técnica. O escritório pode orientar o cliente a procurar a Sublime para entender
                o que se aplica ao caso.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {WHEN_TO_REFER.map((p) => (
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
            <div className="min-w-0">
              <span className="section-tag">A solução</span>
              <h2 className="font-display text-3xl md:text-4xl text-gray-900 leading-tight mb-5">
                A Sublime SST como referência técnica para o seu escritório contábil.
              </h2>
              <p className="text-[16px] text-gray-500 leading-relaxed mb-6">
                Quando um cliente seu precisar de SST, você encaminha para a Sublime SST. Nossa equipe
                avalia o perfil da empresa e conduz o atendimento contratado — sem que você precise se
                envolver na execução técnica.
              </p>
              <ul className="flex flex-col gap-3 mb-7">
                {[
                  'Apoio técnico: avaliação do perfil, documentação e acompanhamento',
                  'Dois caminhos de atendimento: Digital (nacional) ou Consultoria (Rio de Janeiro, casos mais complexos)',
                  'Portal do Parceiro para acompanhar os encaminhamentos',
                  'Cadastro gratuito, sem custo para o escritório',
                  <>Condições e comissões disponíveis na <Link href="/parceiros?utm_source=lp-contadores&utm_campaign=nicho" className="text-petrol underline">página do programa</Link> e no <Link href="/termos-parceria" className="text-petrol underline">Termo de Parceria</Link></>,
                ].map((b, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle size={17} className="text-teal shrink-0 mt-0.5" />
                    <span className="text-[15px] text-gray-700">{b}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/parceiros?utm_source=lp-contadores&utm_campaign=nicho"
                className="btn btn-primary whitespace-normal text-center"
              >
                Cadastrar meu escritório como parceiro
                <ArrowRight size={16} />
              </Link>
              <p className="text-[13px] text-gray-500 mt-4">
                Já sabe qual empresa quer indicar?{' '}
                <Link
                  href="/elegibilidade?utm_source=lp-contadores&utm_campaign=nicho&utm_medium=indicacao"
                  className="text-petrol underline"
                >
                  Faça o teste de elegibilidade diretamente
                </Link>.
              </p>
            </div>

            {/* Steps */}
            <div className="flex flex-col gap-4">
              {[
                { n: '01', title: 'Conheça a parceria', body: 'Consulte as condições e esclareça suas dúvidas.' },
                { n: '02', title: 'Encaminhe uma demanda', body: 'Compartilhe o canal da Sublime com o cliente; após adesão, utilize o link do parceiro conforme as regras do programa.' },
                { n: '03', title: 'A Sublime avalia o perfil', body: 'Digital para empresas compatíveis com atendimento sem visita técnica; Consultoria para demandas personalizadas.' },
                { n: '04', title: 'Acompanhe o encaminhamento', body: 'Consulte as informações disponíveis no Portal do Parceiro, respeitando o escopo do programa.' },
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

        {/* Duas formas de atendimento */}
        <section className="py-20 px-6 bg-gray-50">
          <div className="max-w-[1120px] mx-auto">
            <div className="text-center max-w-xl mx-auto mb-12">
              <span className="section-tag">Como a Sublime atende</span>
              <h2 className="font-display text-3xl md:text-4xl text-gray-900">
                Duas formas de atendimento
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card p-7">
                <h3 className="text-[16px] font-bold text-gray-900 mb-2">Sublime Digital</h3>
                <p className="text-[14px] text-gray-500 leading-relaxed">
                  Atendimento nacional para empresas compatíveis com o modelo e aprovadas na elegibilidade.
                </p>
              </div>
              <div className="card p-7">
                <h3 className="text-[16px] font-bold text-gray-900 mb-2">Sublime Consultoria</h3>
                <p className="text-[14px] text-gray-500 leading-relaxed">
                  Atendimento personalizado para demandas de maior complexidade ou que exigem visita, com
                  atuação prioritária no Rio de Janeiro.
                </p>
              </div>
            </div>
            <p className="text-[13px] text-gray-500 text-center mt-8 max-w-2xl mx-auto">
              Exames, documentos e demais entregas dependem do escopo contratado com cada cliente.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20 px-6">
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
            Tenha uma referência de SST para o próximo cliente que pedir ajuda
          </h2>
          <p className="text-[16px] text-white/70 mb-8 max-w-lg mx-auto">
            Conheça como a Sublime pode apoiar o seu escritório e qual caminho de atendimento faz sentido
            para cada empresa.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/parceiros?utm_source=lp-contadores&utm_campaign=nicho"
              className="btn btn-white btn-lg whitespace-normal text-center"
            >
              Conhecer o programa de parceiros
            </Link>
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  )
}
