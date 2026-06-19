import type { Metadata } from 'next'
import { DM_Sans, DM_Serif_Display } from 'next/font/google'
import { JsonLd } from '@/components/JsonLd'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
})

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://sublimesst.com'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Sublime SST — Segurança e Saúde Ocupacional',
    template: '%s | Sublime SST',
  },
  description:
    'Conformidade em SST com soluções adequadas ao perfil da sua empresa. Consultoria personalizada para qualquer porte e risco, ou modelo digital para empresas GR1 com até 20 funcionários.',
  keywords: [
    'SST', 'segurança do trabalho', 'saúde ocupacional', 'PCMSO', 'PGR',
    'NR-4', 'NR-1', 'conformidade', 'regularização', 'eSocial SST',
    'consultoria SST', 'LTCAT', 'Grau de Risco',
  ],
  authors: [{ name: 'Sublime SST' }],
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    title: 'Sublime SST — Conformidade em SST adequada ao perfil da sua empresa',
    description: 'Consultoria personalizada para qualquer porte e risco, ou modelo digital para empresas GR1 com até 20 funcionários.',
    url: BASE_URL,
    siteName: 'Sublime SST',
    locale: 'pt_BR',
    type: 'website',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Sublime SST — Segurança e Saúde Ocupacional',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sublime SST — Conformidade em SST',
    description: 'Consultoria personalizada ou modelo digital. Soluções adequadas ao perfil da sua empresa.',
    images: ['/og-image.jpg'],
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  robots: { index: true, follow: true },
}

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Sublime SST',
  url: BASE_URL,
  logo: `${BASE_URL}/logo.jpeg`,
  description: 'Empresa especializada em Segurança e Saúde Ocupacional com atendimento consultivo e modelo digital para empresas de baixo risco.',
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+55-21-99724-8630',
    contactType: 'customer service',
    email: 'contato@sublimesst.com',
    availableLanguage: 'Portuguese',
  },
  sameAs: [],
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'BR',
  },
}

const serviceSchema = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Conformidade em SST — Sublime SST',
  serviceType: 'Segurança e Saúde Ocupacional',
  provider: {
    '@type': 'Organization',
    name: 'Sublime SST',
    url: BASE_URL,
  },
  description: 'Serviços de SST para empresas brasileiras: consultoria personalizada (PGR, PCMSO, LTCAT, laudos, treinamentos) e modelo digital para empresas GR1 com até 20 funcionários.',
  areaServed: {
    '@type': 'Country',
    name: 'Brasil',
  },
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Soluções em SST',
    itemListElement: [
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Consultoria SST Personalizada',
          description: 'PGR, PCMSO, LTCAT, laudos técnicos, treinamentos e avaliação de riscos psicossociais para empresas de qualquer porte e risco.',
        },
      },
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Sublime Digital',
          description: 'Regularização em SST com processo digital para empresas GR1 com até 20 funcionários. PGR, PCMSO e organização documental com mensalidade fixa.',
        },
      },
    ],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${dmSans.variable} ${dmSerif.variable}`}>
      <head>
        {process.env.NEXT_PUBLIC_GA4_ID && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA4_ID}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${process.env.NEXT_PUBLIC_GA4_ID}');`,
              }}
            />
          </>
        )}
        <JsonLd data={organizationSchema} />
        <JsonLd data={serviceSchema} />
      </head>
      <body className="font-sans antialiased bg-white text-gray-900">{children}</body>
    </html>
  )
}
