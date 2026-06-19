import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://sublimesst.com'

  return [
    { url: base,                                          lastModified: new Date(), changeFrequency: 'weekly',  priority: 1 },
    { url: `${base}/consultoria-sst`,                     lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/digital`,                             lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/elegibilidade`,                       lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/sobre`,                               lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/parceiros`,                           lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/sst-para-contadores`,                 lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/sst-para-empresas-de-tecnologia`,     lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/sst-para-escritorios`,                lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/faq`,                                  lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/conteudos`,                           lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${base}/conteudos/o-que-e-sst`,               lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/conteudos/pgr-e-pcmso`,               lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/conteudos/sst-para-baixo-risco`,      lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/conteudos/esocial-e-sst`,             lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/conteudos/nr1-riscos-psicossociais`,  lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/conteudos/sst-para-mei-e-microempresas`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/privacidade`,                         lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${base}/termos`,                              lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
  ]
}
