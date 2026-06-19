'use client'

import { useState, useEffect } from 'react'
import { Search, ExternalLink, Download } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Company {
  id: string
  razaoSocial: string
  cnpj: string
  email: string
  whatsapp: string
  numFuncionarios: number
  status: string
  createdAt: string
  plan?: { label: string; monthlyPrice: number } | null
  payments: { type: string; status: string; checkoutUrl?: string | null }[]
  onboardingData?: { submittedAt: string } | null
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-amber-100 text-amber-700' },
  active: { label: 'Ativo', color: 'bg-green-100 text-green-700' },
  inactive: { label: 'Inativo', color: 'bg-gray-100 text-gray-600' },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-700' },
}

function formatBRL(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
}

export default function EmpresasPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => {
    const secret = sessionStorage.getItem('admin_secret') ?? ''
    fetch('/api/admin/empresas', { headers: { 'x-admin-secret': secret } })
      .then(r => r.json())
      .then(data => { if (data.success) setCompanies(data.data) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = companies.filter(c => {
    const matchSearch = !search ||
      c.razaoSocial.toLowerCase().includes(search.toLowerCase()) ||
      c.cnpj.includes(search) ||
      c.email.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !filterStatus || c.status === filterStatus
    return matchSearch && matchStatus
  })

  function exportCSV() {
    const rows = [
      ['Razão Social', 'CNPJ', 'E-mail', 'WhatsApp', 'Plano', 'Status', 'Onboarding', 'Data'],
      ...filtered.map(c => [
        c.razaoSocial,
        c.cnpj,
        c.email,
        c.whatsapp,
        c.plan?.label ?? '—',
        c.status,
        c.onboardingData ? 'Sim' : 'Não',
        formatDate(c.createdAt),
      ]),
    ]
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'empresas_sublime_sst.csv'; a.click()
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[1.6rem] font-bold text-gray-900">Empresas</h1>
          <p className="text-[14px] text-gray-500">{companies.length} empresa{companies.length !== 1 ? 's' : ''} cadastrada{companies.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-outline-dark btn-sm" onClick={exportCSV}>
          <Download size={15} /> Exportar CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar empresa, CNPJ ou e-mail…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-[10px] text-[13px] focus:outline-none focus:border-teal"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-[10px] text-[13px] bg-white focus:outline-none focus:border-teal"
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[12px] border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-[13px] text-gray-400">Carregando…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['Empresa', 'Plano', 'Status', 'Onboarding', 'Implantação', 'Cadastro'].map(h => (
                    <th key={h} className="text-left px-5 py-3 font-semibold text-gray-600 text-[11px] uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400">Nenhuma empresa encontrada.</td></tr>
                ) : filtered.map(c => {
                  const st = STATUS_LABELS[c.status] ?? { label: c.status, color: 'bg-gray-100 text-gray-600' }
                  const implantacao = c.payments.find(p => p.type === 'implantacao')
                  const waLink = `https://wa.me/55${c.whatsapp.replace(/\D/g, '')}`
                  return (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-gray-900">{c.razaoSocial}</p>
                        <a href={waLink} target="_blank" rel="noopener noreferrer" className="text-[11px] text-gray-400 hover:text-teal">{c.whatsapp}</a>
                      </td>
                      <td className="px-5 py-3.5">
                        <p>{c.plan?.label ?? '—'}</p>
                        {c.plan && <p className="text-[11px] text-teal">{formatBRL(c.plan.monthlyPrice)}/mês</p>}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${st.color}`}>{st.label}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        {c.onboardingData
                          ? <span className="text-green-600 text-[11px] font-medium">✅ Preenchido</span>
                          : <span className="text-amber-600 text-[11px] font-medium">⏳ Pendente</span>
                        }
                      </td>
                      <td className="px-5 py-3.5">
                        {implantacao ? (
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full
                              ${implantacao.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                              {implantacao.status === 'confirmed' ? '✅ Pago' : '⏳ Aguardando'}
                            </span>
                            {implantacao.checkoutUrl && implantacao.status !== 'confirmed' && (
                              <a href={implantacao.checkoutUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink size={12} className="text-gray-400 hover:text-teal" />
                              </a>
                            )}
                          </div>
                        ) : <span className="text-gray-400 text-[11px]">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap text-[11px]">{formatDate(c.createdAt)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
