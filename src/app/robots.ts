import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://sublimesst.com'
  return {
    rules: [
      // Crawlers gerais e buscadores
      { userAgent: '*', allow: '/', disallow: ['/admin', '/api/'] },
      // Crawlers de IA — permitidos explicitamente nas páginas públicas
      { userAgent: 'GPTBot',        allow: '/', disallow: ['/admin', '/api/'] },
      { userAgent: 'OAI-SearchBot', allow: '/', disallow: ['/admin', '/api/'] },
      { userAgent: 'anthropic-ai',  allow: '/', disallow: ['/admin', '/api/'] },
      { userAgent: 'ClaudeBot',     allow: '/', disallow: ['/admin', '/api/'] },
      { userAgent: 'PerplexityBot', allow: '/', disallow: ['/admin', '/api/'] },
    ],
    sitemap: `${base}/sitemap.xml`,
  }
}
