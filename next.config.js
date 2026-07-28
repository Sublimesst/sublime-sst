/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['sublimesst.com'],
  },
  experimental: {
    // pdfkit lê as métricas das fontes padrão (Helvetica) de arquivos .afm em
    // node_modules/pdfkit/js/data em tempo de execução (fs.readFileSync).
    // Esse acesso, dentro do bundle único do pdfkit, não é sempre capturado
    // pelo rastreador de dependências da Vercel — sem esta inclusão explícita,
    // os .afm podem faltar no pacote da função serverless e a geração do PDF
    // do contrato falha silenciosamente (ver src/lib/contractPdf.ts).
    outputFileTracingIncludes: {
      '/api/webhooks/asaas': ['./node_modules/pdfkit/js/data/*.afm'],
    },
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
