import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://sublimesst.com'

  return [
    { url: base,                     lastModified: new Date(), changeFrequency: 'weekly',  priority: 1 },
    { url: `${base}/digital`,        lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/elegibilidade`,  lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/parceiros`,      lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/integrations`,   lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/privacidade`,    lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${base}/termos`,         lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
  ]
}
