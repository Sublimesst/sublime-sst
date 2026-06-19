import Link from 'next/link'
import { Clock, ArrowRight } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { WhatsAppButton } from '@/components/layout/WhatsAppButton'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Conteúdos sobre SST — Guias e Explicações | Sublime SST',
  description: 'Guias práticos sobre Segurança e Saúde Ocupacional: PGR, PCMSO, NR-1, eSocial, obrigações para MEI e microempresas. Conteúdo confiável para empresários brasileiros.',
  alternates: { canonical: 'https://sublimesst.com/conteudos' },
}

const ARTICLES = [
  {
    href: '/conteudos/o-que-e-sst',
    title: 'O que é SST e por que sua empresa precisa se preocupar com isso',
    description: 'Entenda o que é Segurança e Saúde Ocupacional, quais empresas são obrigadas e quais as consequências de não estar em conformidade.',
    category: 'Fundamentos',
    readTime: '6 min',
    publishedAt: '2026-06-19',
  },
  {
    href: '/conteudos/pgr-e-pcmso',
    title: 'PGR e PCMSO: o que são, para que servem e quem precisa ter',
    description: 'Os dois documentos mais importantes da SST explicados de forma clara. Saiba quem é obrigado, o que cada um cobre e como obtê-los.',
    category: 'Documentos',
    readTime: '7 min',
    publishedAt: '2026-06-19',
  },
  {
    href: '/conteudos/sst-para-baixo-risco',
    title: 'SST para empresas de baixo risco: o que muda e o que é obrigatório',
    description: 'Empresas GR1 têm obrigações de SST mais simples — mas continuam tendo obrigações. Descubra o que se aplica ao seu caso.',
    category: 'Grau de Risco',
    readTime: '6 min',
    publishedAt: '2026-06-19',
  },
  {
    href: '/conteudos/esocial-e-sst',
    title: 'eSocial e SST: o que sua empresa precisa enviar e quais são os prazos',
    description: 'O módulo de SST do eSocial é obrigatório. Saiba quais eventos precisam ser enviados, quando e o que acontece se não enviar.',
    category: 'eSocial',
    readTime: '8 min',
    publishedAt: '2026-06-19',
  },
  {
    href: '/conteudos/nr1-riscos-psicossociais',
    title: 'NR-1 atualizada: riscos psicossociais e o que muda para sua empresa',
    description: 'A atualização da NR-1 incluiu a gestão de riscos psicossociais. Entenda o que são, por que importam e o que sua empresa precisa fazer.',
    category: 'Normas',
    readTime: '7 min',
    publishedAt: '2026-06-19',
  },
  {
    href: '/conteudos/sst-para-mei-e-microempresas',
    title: 'SST para MEI e microempresas: o que é obrigatório e o que é opcional',
    description: 'MEI precisa de PGR? E a microempresa com 3 funcionários? Esclareça as dúvidas mais comuns sobre SST para pequenos negócios.',
    category: 'MEI e ME',
    readTime: '5 min',
    publishedAt: '2026-06-19',
  },
]

export default function ConteudosPage() {
  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="py-16 px-6 bg-gray-50 border-b border-gray-200">
          <div className="max-w-[800px] mx-auto">
            <span className="section-tag mb-4 inline-block">Conteúdos</span>
            <h1 className="font-display text-4xl text-gray-900 mb-4">
              Guias práticos sobre SST
            </h1>
            <p className="text-[16px] text-gray-500 leading-relaxed max-w-xl">
              Explicações diretas sobre Segurança e Saúde Ocupacional para gestores e empresários que precisam
              entender o que é obrigatório — sem enrolação.
            </p>
          </div>
        </section>

        {/* Lista */}
        <section className="py-14 px-6">
          <div className="max-w-[800px] mx-auto flex flex-col gap-5">
            {ARTICLES.map((a) => (
              <Link key={a.href} href={a.href}
                className="card card-hover p-7 flex flex-col sm:flex-row sm:items-start gap-5 group">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="section-tag text-[11px]">{a.category}</span>
                    <span className="text-[12px] text-gray-400 flex items-center gap-1">
                      <Clock size={12} /> {a.readTime}
                    </span>
                  </div>
                  <h2 className="font-display text-xl text-gray-900 mb-2 group-hover:text-petrol transition-colors">
                    {a.title}
                  </h2>
                  <p className="text-[14px] text-gray-500 leading-relaxed">{a.description}</p>
                </div>
                <ArrowRight size={20} className="text-gray-300 group-hover:text-teal transition-colors shrink-0 mt-1" />
              </Link>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 px-6 bg-gray-50 border-t border-gray-200">
          <div className="max-w-[640px] mx-auto text-center">
            <h2 className="font-display text-2xl text-gray-900 mb-3">Dúvida sobre a sua empresa especificamente?</h2>
            <p className="text-[15px] text-gray-500 mb-6">
              Faça o teste de elegibilidade ou fale com nossa equipe — respondemos sobre o perfil da sua operação.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link href="/elegibilidade" className="btn btn-primary">Verificar Elegibilidade</Link>
              <Link href="/consultoria-sst" className="btn btn-outline-dark">Solicitar Orçamento</Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  )
}
