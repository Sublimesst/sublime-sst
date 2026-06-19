import Link from 'next/link'
import { ArrowLeft, ArrowRight, Calendar, Clock } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { WhatsAppButton } from '@/components/layout/WhatsAppButton'
import { JsonLd } from '@/components/JsonLd'

export interface RelatedArticle {
  href: string
  title: string
  readTime: string
}

export interface ArticleProps {
  title: string
  description: string
  publishedAt: string
  updatedAt?: string
  readTime: string
  category: string
  slug: string
  children: React.ReactNode
  cta?: {
    title: string
    body: string
    href: string
    label: string
  }
  related?: RelatedArticle[]
}

const BASE_URL = 'https://sublimesst.com'

export function ArticleLayout({
  title, description, publishedAt, updatedAt, readTime, category, slug, children, cta, related,
}: ArticleProps) {
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    datePublished: publishedAt,
    dateModified: updatedAt ?? publishedAt,
    author: { '@type': 'Organization', name: 'Sublime SST', url: BASE_URL },
    publisher: {
      '@type': 'Organization',
      name: 'Sublime SST',
      url: BASE_URL,
      logo: { '@type': 'ImageObject', url: `${BASE_URL}/logo.jpeg` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${BASE_URL}/conteudos/${slug}` },
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Início', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Conteúdos', item: `${BASE_URL}/conteudos` },
      { '@type': 'ListItem', position: 3, name: title, item: `${BASE_URL}/conteudos/${slug}` },
    ],
  }

  return (
    <>
      <JsonLd data={articleSchema} />
      <JsonLd data={breadcrumbSchema} />
      <Navbar />
      <main className="min-h-screen bg-white">
        {/* Breadcrumb */}
        <div className="border-b border-gray-100 py-3 px-6">
          <div className="max-w-[800px] mx-auto flex items-center gap-2 text-[13px] text-gray-400">
            <Link href="/" className="hover:text-teal transition-colors">Início</Link>
            <span>/</span>
            <Link href="/conteudos" className="hover:text-teal transition-colors">Conteúdos</Link>
            <span>/</span>
            <span className="text-gray-700 truncate max-w-[200px]">{title}</span>
          </div>
        </div>

        <div className="max-w-[800px] mx-auto px-6 py-12">
          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="section-tag text-[11px]">{category}</span>
              <span className="text-[12px] text-gray-400 flex items-center gap-1">
                <Clock size={12} /> {readTime} de leitura
              </span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl text-gray-900 leading-tight mb-4">
              {title}
            </h1>
            <p className="text-[17px] text-gray-500 leading-relaxed mb-5">{description}</p>
            <div className="flex items-center gap-4 text-[12px] text-gray-400 pt-4 border-t border-gray-100">
              <span className="flex items-center gap-1.5">
                <Calendar size={12} />
                Publicado em {new Date(publishedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </span>
              {updatedAt && updatedAt !== publishedAt && (
                <span>· Atualizado em {new Date(updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
              )}
              <span>· Sublime SST</span>
            </div>
          </div>

          {/* Content */}
          <article className="prose prose-gray max-w-none prose-headings:font-display prose-headings:text-gray-900 prose-p:text-gray-600 prose-p:leading-relaxed prose-li:text-gray-600 prose-strong:text-gray-900">
            {children}
          </article>

          {/* CTA contextual */}
          {cta && (
            <div className="mt-12 rounded-[16px] p-7 border-2 border-teal"
              style={{ background: 'linear-gradient(135deg, var(--teal-pale), #f0fdf9)' }}>
              <h3 className="font-display text-xl text-gray-900 mb-2">{cta.title}</h3>
              <p className="text-[14px] text-gray-600 mb-5">{cta.body}</p>
              <Link href={cta.href} className="btn btn-primary">
                {cta.label} <ArrowRight size={16} />
              </Link>
            </div>
          )}

          {/* Artigos relacionados */}
          {related && related.length > 0 && (
            <div className="mt-12 pt-10 border-t border-gray-100">
              <h3 className="text-[16px] font-bold text-gray-900 mb-5">Leia também</h3>
              <div className="flex flex-col gap-3">
                {related.map((r) => (
                  <Link key={r.href} href={r.href}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-[10px] hover:bg-teal-pale transition-colors group">
                    <span className="text-[14px] font-medium text-gray-800 group-hover:text-petrol">{r.title}</span>
                    <span className="flex items-center gap-1.5 text-[12px] text-gray-400 shrink-0 ml-4">
                      <Clock size={11} /> {r.readTime}
                      <ArrowRight size={13} className="ml-1 text-gray-300 group-hover:text-teal" />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Voltar */}
          <div className="mt-10">
            <Link href="/conteudos" className="btn btn-ghost">
              <ArrowLeft size={16} /> Ver todos os conteúdos
            </Link>
          </div>
        </div>
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  )
}
