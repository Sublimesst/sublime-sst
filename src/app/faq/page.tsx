import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { WhatsAppButton } from '@/components/layout/WhatsAppButton'
import { JsonLd } from '@/components/JsonLd'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Perguntas Frequentes sobre SST | Sublime SST',
  description: 'Respostas às dúvidas mais comuns sobre Segurança e Saúde Ocupacional: obrigações, documentos, eSocial, preços e como a Sublime SST funciona.',
  alternates: { canonical: 'https://sublimesst.com/faq' },
}

const FAQS = [
  {
    section: 'Obrigações de SST',
    items: [
      {
        q: 'Toda empresa precisa ter SST?',
        a: 'Toda empresa com pelo menos um funcionário CLT tem obrigações de SST. Não existe isenção por tamanho ou setor. A diferença entre uma empresa pequena e uma grande está na complexidade das exigências, não na existência delas.',
      },
      {
        q: 'MEI precisa de PGR e PCMSO?',
        a: 'MEI sem funcionários não tem obrigações de SST. Mas MEI que contrata um empregado passa a ser obrigado a ter PGR, PCMSO e cumprir todas as exigências trabalhistas — incluindo ASOs e envio de eventos no eSocial.',
      },
      {
        q: 'O que é PGR e para que serve?',
        a: 'PGR (Programa de Gerenciamento de Riscos) é o documento que identifica, avalia e controla os riscos no ambiente de trabalho. É exigido pela NR-1 para todas as empresas com trabalhadores CLT e deve ser revisado anualmente.',
      },
      {
        q: 'O que é PCMSO e qual a diferença para o PGR?',
        a: 'PCMSO (Programa de Controle Médico de Saúde Ocupacional) organiza os exames médicos dos funcionários. Enquanto o PGR foca no ambiente de trabalho, o PCMSO foca na saúde das pessoas. Os dois precisam estar alinhados.',
      },
      {
        q: 'Quais empresas são consideradas de baixo risco?',
        a: 'Empresas com Grau de Risco 1 (GR1) pela NR-4 são consideradas de baixo risco. Isso inclui escritórios, consultorias, empresas de tecnologia, escritórios de advocacia e contabilidade. O GR é determinado pelo CNAE principal da empresa.',
      },
    ],
  },
  {
    section: 'Sublime SST e nossos serviços',
    items: [
      {
        q: 'O que é o Sublime Digital?',
        a: 'O Sublime Digital é uma assinatura anual para empresas GR1 com até 20 funcionários que permite regularizar a SST de forma totalmente digital — sem visitas técnicas presenciais na maioria dos casos. Inclui PGR, PCMSO, gestão documental e suporte.',
      },
      {
        q: 'O que é a Consultoria SST Personalizada?',
        a: 'A Consultoria SST Personalizada é o serviço para empresas que não se enquadram no modelo digital: empresas de maior risco, mais de 20 funcionários, ou que precisam de análise técnica específica. O atendimento é feito com visitas e acompanhamento dedicado.',
      },
      {
        q: 'Qual o preço do Sublime Digital?',
        a: 'A assinatura anual do Sublime Digital começa a partir de R$ 142/mês (cobrado mensalmente) para empresas com até 5 funcionários. O valor varia conforme o número de funcionários. Consulte a página de planos para ver todas as faixas.',
      },
      {
        q: 'Como sei se minha empresa se enquadra no modelo digital?',
        a: 'Faça o teste de elegibilidade gratuito — ele considera o CNAE, o número de funcionários e os riscos da sua atividade para indicar se a empresa pode usar o modelo digital ou se precisa de consultoria personalizada.',
      },
      {
        q: 'A Sublime SST atende empresas de qualquer estado?',
        a: 'Sim. O modelo digital atende empresas em todo o Brasil de forma remota. Para a consultoria personalizada, o atendimento presencial pode ter variações por região — consulte nossa equipe.',
      },
    ],
  },
  {
    section: 'eSocial e documentação',
    items: [
      {
        q: 'O que minha empresa precisa enviar ao eSocial sobre SST?',
        a: 'Os principais eventos de SST no eSocial são: S-2220 (resultados dos exames médicos), S-2210 (comunicação de acidente de trabalho), S-2240 (condições ambientais) e S-1060 (ambientes de trabalho). Sem PGR e PCMSO, esses eventos não podem ser enviados corretamente.',
      },
      {
        q: 'O que acontece se a empresa não tiver SST em dia?',
        a: 'As consequências incluem: autuações em fiscalizações do Ministério do Trabalho, passivo trabalhista em reclamações (a ausência de documentos é frequentemente usada como argumento), pendências no eSocial e no INSS, e responsabilização em caso de acidente de trabalho.',
      },
      {
        q: 'Preciso fazer exames em todos os funcionários?',
        a: 'Sim. O PCMSO define quais exames cada funcionário precisa fazer: admissional (antes de iniciar), periódico (anual ou conforme o cargo), de retorno ao trabalho (após afastamento) e demissional. O resultado de cada exame é documentado no ASO (Atestado de Saúde Ocupacional).',
      },
      {
        q: 'O que mudou na NR-1 sobre riscos psicossociais?',
        a: 'A atualização da NR-1, vigente desde maio de 2025, tornou obrigatória a identificação e gestão de riscos psicossociais no PGR. Isso inclui sobrecarga de trabalho, assédio, conflitos interpessoais e outros fatores que afetam a saúde mental dos trabalhadores.',
      },
    ],
  },
]

export default function FaqPage() {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.flatMap((s) =>
      s.items.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      }))
    ),
  }

  return (
    <>
      <JsonLd data={faqSchema} />
      <Navbar />
      <main>
        {/* Hero */}
        <section className="py-16 px-6 bg-gray-50 border-b border-gray-200">
          <div className="max-w-[800px] mx-auto">
            <span className="section-tag mb-4 inline-block">FAQ</span>
            <h1 className="font-display text-4xl text-gray-900 mb-4">
              Perguntas frequentes
            </h1>
            <p className="text-[16px] text-gray-500 leading-relaxed max-w-xl">
              Respostas às dúvidas mais comuns sobre SST, documentos obrigatórios, eSocial e como a Sublime SST funciona.
            </p>
          </div>
        </section>

        {/* FAQ por seção */}
        <section className="py-14 px-6">
          <div className="max-w-[800px] mx-auto flex flex-col gap-14">
            {FAQS.map((section) => (
              <div key={section.section}>
                <h2 className="font-display text-xl text-gray-900 mb-6 pb-3 border-b border-gray-100">
                  {section.section}
                </h2>
                <div className="flex flex-col gap-4">
                  {section.items.map((item) => (
                    <details key={item.q} className="card group">
                      <summary className="flex items-start justify-between gap-4 p-6 cursor-pointer list-none">
                        <span className="font-medium text-gray-900 leading-snug">{item.q}</span>
                        <ChevronDown
                          size={18}
                          className="shrink-0 text-gray-400 transition-transform group-open:rotate-180 mt-0.5"
                        />
                      </summary>
                      <div className="px-6 pb-6 -mt-2">
                        <p className="text-[14px] text-gray-600 leading-relaxed">{item.a}</p>
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 px-6 bg-gray-50 border-t border-gray-200">
          <div className="max-w-[640px] mx-auto text-center">
            <h2 className="font-display text-2xl text-gray-900 mb-3">Não encontrou o que procurava?</h2>
            <p className="text-[15px] text-gray-500 mb-6">
              Fale com nossa equipe ou faça o teste de elegibilidade para descobrir o que se aplica à sua empresa.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link href="/elegibilidade" className="btn btn-primary">Verificar Elegibilidade</Link>
              <Link href="/consultoria-sst" className="btn btn-outline-dark">Falar com Especialista</Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  )
}
