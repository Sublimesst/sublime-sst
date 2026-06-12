import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { WhatsAppButton } from '@/components/layout/WhatsAppButton'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Integrações Futuras' }

const ENDPOINTS = [
  { method: 'POST', path: '/api/eligibility', desc: 'Submeter dados para avaliação de elegibilidade programática' },
  { method: 'POST', path: '/api/signup', desc: 'Cadastro de empresa elegível' },
  { method: 'GET',  path: '/api/status', desc: 'Consulta de status de conformidade' },
  { method: 'POST', path: '/api/partners/referral', desc: 'Registro de indicação de parceiro' },
]

const ENV_EXAMPLE = `# === BANCO DE DADOS ===
DATABASE_URL=postgresql://user:pass@localhost:5432/sublime_sst

# === ASAAS (Pagamentos) ===
ASAAS_API_KEY=$aact_SuaChaveAqui
ASAAS_ENV=sandbox

# === GOOGLE SHEETS ===
GOOGLE_SHEETS_SPREADSHEET_ID=seu_spreadsheet_id
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# === ANALYTICS ===
NEXT_PUBLIC_GA4_ID=G-XXXXXXXXXX
META_PIXEL_ID=000000000000000

# === EMAIL ===
SMTP_HOST=smtp.gmail.com
SMTP_USER=contato@sublimesst.com`

export default function IntegrationsPage() {
  return (
    <>
      <Navbar />
      <main className="py-16 px-6">
        <div className="max-w-[900px] mx-auto">
          <span className="section-tag mb-4 inline-block">Em desenvolvimento</span>
          <h1 className="font-display text-4xl text-gray-900 mb-4">Integrações Futuras</h1>
          <p className="text-[17px] text-gray-500 mb-12 max-w-xl leading-relaxed">
            A Sublime SST está preparando integrações para facilitar a contratação, o acompanhamento
            e a gestão de conformidade por plataformas empresariais e agentes digitais.
          </p>

          {/* Endpoints */}
          <div className="card p-8 mb-6">
            <h3 className="text-[16px] font-bold text-gray-900 mb-5">Endpoints previstos</h3>
            <div className="space-y-3">
              {ENDPOINTS.map(ep => (
                <div key={ep.path} className="flex items-center gap-3 bg-gray-50 rounded-[8px] px-4 py-3 border border-gray-200">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${ep.method === 'POST' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                    {ep.method}
                  </span>
                  <code className="text-[13px] font-mono text-gray-800 flex-shrink-0">{ep.path}</code>
                  <span className="text-[12px] text-gray-500 hidden sm:block">— {ep.desc}</span>
                </div>
              ))}
            </div>
            <p className="text-[13px] text-gray-400 mt-4">
              ⚠️ API pública não disponível no MVP. Contate contato@sublimesst.com para acesso antecipado.
            </p>
          </div>

          {/* .env.example */}
          <div className="card p-8 mb-6">
            <h3 className="text-[16px] font-bold text-gray-900 mb-4">Variáveis de ambiente (.env.example)</h3>
            <pre className="bg-gray-900 text-green-400 rounded-[10px] p-5 text-[12px] font-mono leading-relaxed overflow-x-auto whitespace-pre">
              {ENV_EXAMPLE}
            </pre>
            <p className="text-[13px] text-gray-500 mt-3">
              Arquivo completo disponível em <code className="text-teal">.env.example</code> no repositório.
            </p>
          </div>

          {/* Integrations planned */}
          <div className="card p-8 mb-6">
            <h3 className="text-[16px] font-bold text-gray-900 mb-5">Integrações planejadas</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: '💳', name: 'Asaas', desc: 'Pagamentos, cobranças e assinaturas recorrentes', status: 'Mock ativo — pronto para ativar' },
                { icon: '📊', name: 'Google Sheets', desc: 'Exportação de leads e relatórios para planilhas', status: 'Adapter implementado' },
                { icon: '📈', name: 'Google Analytics 4', desc: 'Rastreamento de eventos e funil de conversão', status: 'Variável configurada' },
                { icon: '🎯', name: 'Meta Pixel', desc: 'Rastreamento de conversão para anúncios', status: 'Variável configurada' },
                { icon: '📧', name: 'SMTP / E-mail', desc: 'Notificações de leads e confirmações', status: 'Adapter preparado' },
                { icon: '🔗', name: 'CRM (futuro)', desc: 'Integração com CRMs como HubSpot ou RD Station', status: 'Backlog' },
              ].map(int => (
                <div key={int.name} className="flex gap-3 p-4 bg-gray-50 rounded-[10px] border border-gray-200">
                  <span className="text-2xl shrink-0">{int.icon}</span>
                  <div>
                    <div className="text-[14px] font-semibold text-gray-900">{int.name}</div>
                    <div className="text-[12px] text-gray-500 mb-1">{int.desc}</div>
                    <div className="text-[11px] font-medium text-teal">{int.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="rounded-[16px] p-6 border"
            style={{ background: 'var(--teal-pale)', borderColor: 'rgba(26,158,140,.25)' }}>
            <h4 className="text-[14px] font-bold text-teal mb-2">Interesse em integração personalizada?</h4>
            <p className="text-[14px] text-petrol mb-4">
              Entre em contato para discutir integrações personalizadas ou acesso programático à plataforma.
            </p>
            <a href="mailto:contato@sublimesst.com" className="btn btn-primary btn-sm">
              ✉️ contato@sublimesst.com
            </a>
          </div>
        </div>
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  )
}
