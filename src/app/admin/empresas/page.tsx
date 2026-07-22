'use client'

import { useState, useEffect, useCallback } from 'react'
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
  planType?: string | null
  ltcatAddon: boolean
  reviewedBy?: string | null
  createdAt: string
  mensalidadeValor: number
  plan?: { label: string; monthlyPrice: number } | null
  payments: { type: string; status: string; checkoutUrl?: string | null }[]
  onboardingData?: { submittedAt: string } | null
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:             { label: 'Pendente',           color: 'bg-amber-100 text-amber-700' },
  onboarding_pending:  { label: 'Onboarding',         color: 'bg-blue-100 text-blue-700' },
  in_production:       { label: 'Em produção',        color: 'bg-purple-100 text-purple-700' },
  in_review:           { label: 'Em revisão',         color: 'bg-indigo-100 text-indigo-700' },
  documents_delivered: { label: 'Docs entregues',     color: 'bg-teal-100 text-teal-700' },
  active:              { label: 'Ativo',              color: 'bg-green-100 text-green-700' },
  overdue:             { label: 'Inadimplente',       color: 'bg-red-100 text-red-700' },
  suspended:           { label: 'Suspenso',           color: 'bg-orange-100 text-orange-700' },
  migrating:           { label: 'Migrando',           color: 'bg-sky-100 text-sky-700' },
  cancelled:           { label: 'Cancelado',          color: 'bg-gray-100 text-gray-500' },
}

// Cancelamento é excluído das opções editáveis do dropdown genérico de propósito:
// só pode acontecer pelo bloco dedicado em /admin/empresas/[id], que registra
// motivo, estorna comissão em_carencia e envia e-mails. A API também rejeita
// essa transição por aqui (ver PATCH /api/admin/empresas/[id]).
const EDITABLE_STATUSES = Object.entries(STATUS_LABELS).filter(([k]) => k !== 'cancelled')

function formatBRL(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
}

function getAdminSecret() {
  return typeof window !== 'undefined' ? sessionStorage.getItem('admin_secret') ?? '' : ''
}

export default function EmpresasPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)

  const fetchCompanies = useCallback(() => {
    setLoading(true)
    fetch('/api/admin/empresas', { headers: { 'x-admin-secret': getAdminSecret() } })
      .then(r => r.json())
      .then(data => { if (data.success) setCompanies(data.data) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchCompanies() }, [fetchCompanies])

  async function updateStatus(companyId: string, status: string) {
    setUpdatingId(companyId)
    setStatusError(null)
    try {
      const res = await fetch(`/api/admin/empresas/${companyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': getAdminSecret() },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (data.success) {
        setCompanies(cs => cs.map(c => c.id === companyId ? { ...c, status: data.data.status } : c))
      } else {
        setStatusError(data.error ?? 'Erro ao atualizar status.')
      }
    } catch (e) {
      console.error(e)
      setStatusError('Erro de rede.')
    } finally {
      setUpdatingId(null)
    }
  }

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
      ['Razão Social', 'CNPJ', 'E-mail', 'WhatsApp', 'Plano', 'Tipo', 'LTCAT', 'Status', 'Revisado por', 'Onboarding', 'Data'],
      ...filtered.map(c => [
        c.razaoSocial,
        c.cnpj,
        c.email,
        c.whatsapp,
        c.plan?.label ?? '—',
        c.planType ?? '—',
        c.ltcatAddon ? 'Sim' : 'Não',
        STATUS_LABELS[c.status]?.label ?? c.status,
        c.reviewedBy ?? '—',
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

      {statusError && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-[8px] text-[13px] text-red-700 flex items-center justify-between">
          <span>⚠️ {statusError}</span>
          <button onClick={() => setStatusError(null)} className="text-red-400 hover:text-red-600 text-[11px] ml-4">Fechar</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-[12px] border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-[13px] text-gray-400">Carregando…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['Empresa', 'Plano', 'Status', 'Onboarding', 'Implantação', 'Cadastro', 'Ações'].map(h => (
                    <th key={h} className="text-left px-5 py-3 font-semibold text-gray-600 text-[11px] uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400">Nenhuma empresa encontrada.</td></tr>
                ) : filtered.map(c => {
                  const st = STATUS_LABELS[c.status] ?? { label: c.status, color: 'bg-gray-100 text-gray-600' }
                  const implantacao = c.payments.find(p => p.type === 'implantacao')
                  const waLink = `https://wa.me/55${c.whatsapp.replace(/\D/g, '')}`
                  const isUpdating = updatingId === c.id
                  return (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <a href={`/admin/empresas/${c.id}`} className="font-medium text-gray-900 hover:text-teal">{c.razaoSocial}</a>
                        <a href={waLink} target="_blank" rel="noopener noreferrer" className="block text-[11px] text-gray-400 hover:text-teal">{c.whatsapp}</a>
                        {c.ltcatAddon && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">+LTCAT</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <p>{c.plan?.label ?? '—'}</p>
                        <p className="text-[11px] text-teal">{formatBRL(c.mensalidadeValor)}/mês</p>
                        {c.planType && <p className="text-[10px] text-gray-400 capitalize">{c.planType}</p>}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${st.color}`}>{st.label}</span>
                        {c.reviewedBy && <p className="text-[10px] text-gray-400 mt-0.5">↳ {c.reviewedBy}</p>}
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
                      <td className="px-5 py-3.5">
                        {c.status === 'cancelled' ? (
                          <>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${st.color}`}>{st.label}</span>
                            <p className="text-[10px] text-gray-400 mt-0.5">Gerencie na página da empresa</p>
                          </>
                        ) : (
                          <>
                            <select
                              value={c.status}
                              disabled={isUpdating}
                              onChange={e => updateStatus(c.id, e.target.value)}
                              className="text-[11px] border border-gray-200 rounded-[6px] px-2 py-1 bg-white focus:outline-none focus:border-teal disabled:opacity-50 cursor-pointer"
                            >
                              {EDITABLE_STATUSES.map(([k, v]) => (
                                <option key={k} value={k}>{v.label}</option>
                              ))}
                            </select>
                            {isUpdating && <p className="text-[10px] text-gray-400 mt-0.5">Salvando…</p>}
                          </>
                        )}
                      </td>
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
