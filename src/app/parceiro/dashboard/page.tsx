'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Copy, Check } from 'lucide-react'

interface PartnerData {
  partner: { id: string; name: string; code: string; email: string; tier: string }
  leads: {
    id: string; companyName: string; cnpj: string; status: string
    converted: boolean; planType: string | null; createdAt: string
  }[]
  commissions: {
    id: string; companyName: string; mensalidadeNum: number
    valorComissao: number; status: string; liberadaEm: string | null
    pagaEm: string | null; referencia: string | null
  }[]
  summary: { totalComissoes: number; liberadas: number; pagas: number }
}

function formatBRL(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('pt-BR')
}

const COMMISSION_STATUS: Record<string, { label: string; color: string }> = {
  em_carencia:  { label: 'Em carência',  color: 'bg-amber-100 text-amber-700' },
  liberada:     { label: 'Liberada',      color: 'bg-blue-100 text-blue-700' },
  paga:         { label: 'Paga',          color: 'bg-green-100 text-green-700' },
  estornada:    { label: 'Estornada',     color: 'bg-red-100 text-red-700' },
}

const LEAD_STATUS_LABEL: Record<string, string> = {
  captured:    'Capturado',
  assessed:    'Avaliado',
  eligible:    'Elegível',
  backoffice:  'Em análise',
  registered:  'Cadastrado',
  converted:   'Convertido',
}

export default function PartnerDashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<PartnerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [tab, setTab] = useState<'leads' | 'commissions'>('leads')

  useEffect(() => {
    fetch('/api/partner/dashboard')
      .then(r => {
        if (r.status === 401) { router.push('/parceiro/login'); return null }
        return r.json()
      })
      .then(d => { if (d?.success) setData(d.data) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [router])

  function copyRefLink() {
    if (!data) return
    const url = `${window.location.origin}/elegibilidade?ref=${data.partner.code}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-[14px] text-gray-400">Carregando…</p>
    </div>
  )

  if (!data) return null

  const { partner, leads, commissions, summary } = data
  const refUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/elegibilidade?ref=${partner.code}`
    : `/elegibilidade?ref=${partner.code}`

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-[900px] mx-auto px-6 h-[68px] flex items-center justify-between">
          <div>
            <p className="font-display text-[15px] text-gray-900">{partner.name}</p>
            <p className="text-[11px] text-gray-400">Portal do Parceiro · <span className="capitalize">{partner.tier}</span></p>
          </div>
          <form action="/api/partner/logout" method="POST">
            <button type="submit" className="flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-gray-800">
              <LogOut size={14} /> Sair
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-[900px] mx-auto px-6 py-8">
        {/* Ref link */}
        <div className="bg-white rounded-[12px] border border-gray-200 p-5 mb-6">
          <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Seu link de indicação</p>
          <div className="flex gap-2 items-center">
            <code className="flex-1 text-[12px] bg-gray-50 border border-gray-200 rounded-[8px] px-3 py-2 text-gray-700 font-mono break-all">
              {refUrl}
            </code>
            <button
              onClick={copyRefLink}
              className="btn btn-outline-dark btn-sm shrink-0"
            >
              {copied ? <><Check size={13} /> Copiado!</> : <><Copy size={13} /> Copiar</>}
            </button>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">Compartilhe este link. Quando a empresa se cadastrar, você será creditado automaticamente.</p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total comissões', value: formatBRL(summary.totalComissoes), sub: 'previsto' },
            { label: 'Liberadas',       value: formatBRL(summary.liberadas),      sub: 'a receber' },
            { label: 'Pagas',           value: formatBRL(summary.pagas),          sub: 'recebido' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-[12px] border border-gray-200 p-5">
              <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">{s.label}</p>
              <p className="text-[22px] font-display text-teal">{s.value}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4">
          {(['leads', 'commissions'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-[8px] text-[13px] font-medium transition-colors
                ${tab === t ? 'bg-teal text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              {t === 'leads' ? `Indicações (${leads.length})` : `Comissões (${commissions.length})`}
            </button>
          ))}
        </div>

        {tab === 'leads' && (
          <div className="bg-white rounded-[12px] border border-gray-200 overflow-hidden">
            {leads.length === 0 ? (
              <div className="p-10 text-center text-[13px] text-gray-400">
                Nenhuma indicação ainda.<br />
                <span className="text-[12px]">Compartilhe seu link para começar.</span>
              </div>
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {['Empresa', 'Status', 'Plano', 'Data'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leads.map(l => (
                    <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-gray-900">{l.companyName}</p>
                        <p className="text-[11px] text-gray-400">{l.cnpj}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${l.converted ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {l.converted ? 'Convertido' : LEAD_STATUS_LABEL[l.status] ?? l.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 capitalize">{l.planType ?? '—'}</td>
                      <td className="px-5 py-3.5 text-gray-400 text-[11px]">{formatDate(l.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'commissions' && (
          <div className="bg-white rounded-[12px] border border-gray-200 overflow-hidden">
            {commissions.length === 0 ? (
              <div className="p-10 text-center text-[13px] text-gray-400">
                Nenhuma comissão ainda.<br />
                <span className="text-[12px]">Comissões aparecem após o 1º pagamento mensal das indicações convertidas.</span>
              </div>
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {['Empresa', 'Mensalidade', 'Valor', 'Status', 'Referência'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {commissions.map(c => {
                    const st = COMMISSION_STATUS[c.status] ?? { label: c.status, color: 'bg-gray-100 text-gray-500' }
                    return (
                      <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-5 py-3.5 font-medium text-gray-900">{c.companyName}</td>
                        <td className="px-5 py-3.5 text-gray-500">#{c.mensalidadeNum}</td>
                        <td className="px-5 py-3.5 font-semibold text-teal">{formatBRL(c.valorComissao)}</td>
                        <td className="px-5 py-3.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${st.color}`}>{st.label}</span>
                          {c.liberadaEm && <p className="text-[10px] text-gray-400 mt-0.5">Liberada: {formatDate(c.liberadaEm)}</p>}
                          {c.pagaEm && <p className="text-[10px] text-gray-400 mt-0.5">Paga: {formatDate(c.pagaEm)}</p>}
                        </td>
                        <td className="px-5 py-3.5 text-gray-400 text-[11px]">{c.referencia ?? '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        <div className="mt-6 p-4 bg-gray-50 rounded-[10px] text-[12px] text-gray-500">
          <strong>Comissão:</strong> 10% sobre o valor líquido de cada mensalidade por até 12 meses.
          As comissões ficam em carência por 30 dias após o pagamento para cobrir possíveis chargeback/estorno.
          Pagamentos via PIX até o dia 10 do mês seguinte ao da liberação.
          Dúvidas: <a href="https://wa.me/5521997248630" className="text-teal hover:underline">(21) 99724-8630</a>
        </div>
      </main>
    </div>
  )
}
