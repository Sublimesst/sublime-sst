import type { Metadata } from 'next'
import { DM_Sans, DM_Serif_Display } from 'next/font/google'
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

export const metadata: Metadata = {
  title: {
    default: 'Sublime SST — Segurança e Saúde Ocupacional',
    template: '%s | Sublime SST',
  },
  description:
    'Regularize sua empresa em SST de forma simples, segura e digital. Descubra se sua empresa pode usar o modelo online Sublime Digital.',
  keywords: ['SST', 'segurança do trabalho', 'saúde ocupacional', 'PCMSO', 'PGR', 'NR-4', 'conformidade', 'regularização'],
  authors: [{ name: 'Sublime SST' }],
  openGraph: {
    title: 'Sublime SST — Conformidade em SST com experiência digital',
    description: 'Pequenas empresas organizando suas obrigações de SST de forma simples, profissional e previsível.',
    url: 'https://sublimesst.com',
    siteName: 'Sublime SST',
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sublime SST — Conformidade em SST digital',
    description: 'Para empresas de baixo risco com até 20 funcionários.',
  },
  robots: { index: true, follow: true },
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL ?? 'https://sublimesst.com'),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${dmSans.variable} ${dmSerif.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
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
      </head>
      <body className="font-sans antialiased bg-white text-gray-900">{children}</body>
    </html>
  )
}
