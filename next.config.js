/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['sublimesst.com'],
  },
  experimental: {
    // pdfkit lê as métricas das fontes padrão (Helvetica) de arquivos .afm em
    // node_modules/pdfkit/js/data em tempo de execução, via
    // fs.readFileSync(__dirname + '/data/...'). Sem serverComponentsExternalPackages,
    // o webpack empacota o pdfkit junto do bundle da rota — e __dirname passa a
    // apontar para a pasta da rota dentro de .next/server, não para
    // node_modules/pdfkit/js. Externalizar o pacote preserva o __dirname real,
    // e outputFileTracingIncludes garante que os .afm viajem junto no deploy
    // (ver src/lib/contractPdf.ts).
    serverComponentsExternalPackages: ['pdfkit'],
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
