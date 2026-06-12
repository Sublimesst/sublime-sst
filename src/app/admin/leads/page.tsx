'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Download, RefreshCw } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { REASON_LABELS } from '@/lib/eligibility'
import type { EligibilityReason } from '@/types'

const STATUS_OPTS = ['Todos','captured','assessed','eligible','backoffice','registered','converted']
const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  captured:   { label: 'Capturado',  color: 'bg-gray-100 text-gray-700' },
  assessed:   { label: 'Avaliado',   color: 'bg-blue-100 text-blue-700' },
  eligible:   { label: 'Elegível',   color: 'bg-green-100 text-green-700' },
  backoffice: { label: 'Backoffice', color: 'bg-amber-100 text-amber-700' },
  registered: { label: 'Cadastrado', color: 'bg-teal-100 text-teal-700' },
  converted:  { label: 'Convertido', color: 'bg-purple-100 text-purple-700' },
}

interface Lead {
  id: string; cnpj: string; companyName: string; name: string
  email: string; whatsapp: string; status: string; source: string; createdAt: string
  eligibilityAssessments: { eligible: boolean; reasons: string[]; employees: string; cnae: string; createdAt: string }[]
}

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('Todos')
  const [selected, setSelected] = useState<Lead | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const secret = sessionStorage.getItem('admin_secret') ?? ''
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (status !== 'Todos') params.set('status', status)

    const res = await fetch(`/api/leads?${params}`, { headers: { 'x-admin-secret': secret } })
    const data = await res.json()
    if (data.success) { setLeads(data.data.leads); setTotal(data.data.total) }
    setLoading(false)
  }, [search, status])

  useEffect(() => { load() }, [load])

  const exportCSV = () => {
    const rows = [
      ['ID','CNPJ','Empresa','Responsável','Email','WhatsApp','Status','Fonte','Data','CNAE','Funcionários','Elegível','Motivos'],
      ...leads.map(l => {
        const a = l.eligibilityAssessments[0]
        return [l.id, l.cnpj, l.companyName, l.name, l.email, l.whatsapp, l.status, l.source,
          formatDate(l.createdAt), a?.cnae ?? '', a?.employees ?? '', a?.eligible ?? '', (a?.reasons ?? []).join('; ')]
      }),
    ]
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'leads.csv'; a.click()
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[1.4rem] font-bold text-gray-900">Leads</h1>
          <p className="text-[13px] text-gray-500">{total} registros</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14} /></button>
          <button className="btn btn-outline-dark btn-sm" onClick={exportCSV}><Download size={14} /> Exportar</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3.5 top-3 text-gray-400" />
          <input className="form-input pl-9" placeholder="Buscar por nome, e-mail, empresa ou CNPJ..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 flex-wrap">
          {STATUS_OPTS.map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-3 py-2 rounded-[8px] text-[12px] font-medium transition-colors ${status === s ? 'bg-petrol text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-petrol'}`}>
              {s === 'Todos' ? 'Todos' : (STATUS_LABEL[s]?.label ?? s)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-5">
        {/* Table */}
        <div className="flex-1 bg-white rounded-[12px] border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['Empresa','Responsável','Status','Avaliação','Data'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600 text-[11px] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Carregando...</td></tr>
                ) : leads.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Nenhum lead encontrado.</td></tr>
                ) : leads.map(lead => {
                  const a = lead.eligibilityAssessments[0]
                  const st = STATUS_LABEL[lead.status] ?? { label: lead.status, color: 'bg-gray-100 text-gray-700' }
                  return (
                    <tr key={lead.id}
                      className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${selected?.id === lead.id ? 'bg-teal-pale' : ''}`}
                      onClick={() => setSelected(selected?.id === lead.id ? null : lead)}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{lead.companyName}</div>
                        <div className="text-[11px] text-gray-400">{lead.cnpj}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div>{lead.name}</div>
                        <div className="text-[11px] text-gray-400">{lead.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${st.color}`}>{st.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        {a ? (
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${a.eligible ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {a.eligible ? '✓ Elegível' : '→ Backoffice'}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-[12px]">{formatDate(lead.createdAt)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-72 shrink-0 bg-white rounded-[12px] border border-gray-200 p-5 self-start">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-bold text-gray-900">Detalhes</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-700 text-lg leading-none">×</button>
            </div>
            <div className="space-y-3 text-[13px]">
              <div><span className="text-gray-500 block text-[11px] uppercase tracking-wide">Empresa</span><span className="font-medium">{selected.companyName}</span></div>
              <div><span className="text-gray-500 block text-[11px] uppercase tracking-wide">CNPJ</span>{selected.cnpj}</div>
              <div><span className="text-gray-500 block text-[11px] uppercase tracking-wide">Responsável</span>{selected.name}</div>
              <div><span className="text-gray-500 block text-[11px] uppercase tracking-wide">E-mail</span><a href={`mailto:${selected.email}`} className="text-teal">{selected.email}</a></div>
              <div><span className="text-gray-500 block text-[11px] uppercase tracking-wide">WhatsApp</span><a href={`https://wa.me/${selected.whatsapp.replace(/\D/g,'')}`} target="_blank" className="text-teal">{selected.whatsapp}</a></div>
              <div><span className="text-gray-500 block text-[11px] uppercase tracking-wide">Origem</span>{selected.source}</div>

              {selected.eligibilityAssessments[0] && (
                <>
                  <div className="h-px bg-gray-200 my-3" />
                  <div><span className="text-gray-500 block text-[11px] uppercase tracking-wide">CNAE</span>{selected.eligibilityAssessments[0].cnae}</div>
                  <div><span className="text-gray-500 block text-[11px] uppercase tracking-wide">Funcionários</span>{selected.eligibilityAssessments[0].employees}</div>
                  {selected.eligibilityAssessments[0].reasons.length > 0 && (
                    <div>
                      <span className="text-gray-500 block text-[11px] uppercase tracking-wide mb-1">Motivos</span>
                      {selected.eligibilityAssessments[0].reasons.map(r => (
                        <div key={r} className="text-[11px] bg-amber-50 text-amber-800 px-2 py-1 rounded mb-1">
                          {REASON_LABELS[r as EligibilityReason] ?? r}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              <div className="pt-2">
                <a href={`https://wa.me/${selected.whatsapp.replace(/\D/g,'')}`} target="_blank"
                  className="btn btn-primary w-full btn-sm text-[12px]">
                  Contatar via WhatsApp
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
