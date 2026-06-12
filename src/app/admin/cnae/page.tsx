'use client'

import { useState, useEffect } from 'react'
import { Search, CheckCircle, XCircle, Clock } from 'lucide-react'
import cnaeCatalog from '@/lib/cnae_catalog.json'

type CnaeStatus = 'approved' | 'pending' | 'blocked'

interface CnaeRow {
  nr4_class_code: string
  description: string
  grau_risco_nr4: number
  online_catalog_status: CnaeStatus
}

const entries = (cnaeCatalog as { entries: CnaeRow[] }).entries

const STATUS_CONFIG: Record<CnaeStatus, { icon: React.ElementType; label: string; color: string; bg: string }> = {
  approved: { icon: CheckCircle, label: 'Aprovado',  color: 'text-green-700', bg: 'bg-green-100' },
  pending:  { icon: Clock,       label: 'Pendente',  color: 'text-amber-700', bg: 'bg-amber-100' },
  blocked:  { icon: XCircle,     label: 'Bloqueado', color: 'text-red-700',   bg: 'bg-red-100' },
}

export default function AdminCnaePage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<CnaeStatus | 'all'>('all')
  const [overrides, setOverrides] = useState<Record<string, CnaeStatus>>({})

  useEffect(() => {
    const saved = localStorage.getItem('sublime_cnae_overrides')
    if (saved) setOverrides(JSON.parse(saved))
  }, [])

  const setStatus = (code: string, status: CnaeStatus) => {
    const updated = { ...overrides, [code]: status }
    setOverrides(updated)
    localStorage.setItem('sublime_cnae_overrides', JSON.stringify(updated))
  }

  const getStatus = (row: CnaeRow): CnaeStatus => overrides[row.nr4_class_code] ?? row.online_catalog_status

  const filtered = entries.filter(e => {
    const q = search.toLowerCase()
    const matchSearch = !q || e.nr4_class_code.toLowerCase().includes(q) || e.description.toLowerCase().includes(q)
    const matchStatus = filter === 'all' || getStatus(e) === filter
    return matchSearch && matchStatus
  })

  const counts = {
    approved: entries.filter(e => getStatus(e) === 'approved').length,
    pending:  entries.filter(e => getStatus(e) === 'pending').length,
    blocked:  entries.filter(e => getStatus(e) === 'blocked').length,
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-[1.4rem] font-bold text-gray-900">Catálogo CNAE</h1>
        <p className="text-[13px] text-gray-500">{entries.length} CNAEs GR1 importados da NR-4</p>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {(Object.entries(STATUS_CONFIG) as [CnaeStatus, typeof STATUS_CONFIG[CnaeStatus]][]).map(([key, cfg]) => {
          const Icon = cfg.icon
          return (
            <button key={key} onClick={() => setFilter(filter === key ? 'all' : key)}
              className={`bg-white rounded-[12px] border p-4 text-left transition-all ${filter === key ? 'border-petrol ring-1 ring-petrol' : 'border-gray-200 hover:border-gray-300'}`}>
              <div className={`w-8 h-8 rounded-[8px] flex items-center justify-center mb-2 ${cfg.bg}`}>
                <Icon size={16} className={cfg.color} />
              </div>
              <div className="text-xl font-bold text-gray-900">{counts[key]}</div>
              <div className="text-[12px] text-gray-500">{cfg.label}</div>
            </button>
          )
        })}
      </div>

      {/* Warning */}
      <div className="bg-amber-50 border border-amber-200 rounded-[10px] p-4 mb-5 text-[13px] text-amber-800">
        ⚠️ <strong>Atenção:</strong> Aprovar um CNAE aqui o torna elegível para o modelo digital. Bloqueá-lo impede o fluxo online mesmo que seja GR1.
        Apenas o responsável técnico deve alterar este catálogo. As alterações desta sessão são salvas localmente — em produção, use a API.
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3.5 top-3 text-gray-400" />
        <input className="form-input pl-9" placeholder="Buscar por código ou descrição..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <div className="bg-white rounded-[12px] border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Código','Descrição','GR','Status','Ações'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600 text-[11px] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map((row) => {
                const st = getStatus(row)
                const cfg = STATUS_CONFIG[st]
                const Icon = cfg.icon
                return (
                  <tr key={row.nr4_class_code} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-bold text-teal text-[12px]">{row.nr4_class_code}</td>
                    <td className="px-4 py-3 text-gray-700 max-w-xs">{row.description}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-blue-100 text-blue-700 text-[11px] font-bold px-2 py-0.5 rounded">GR{row.grau_risco_nr4}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 w-fit px-2 py-0.5 rounded-full text-[11px] font-semibold ${cfg.bg} ${cfg.color}`}>
                        <Icon size={11} /> {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {(['approved','pending','blocked'] as CnaeStatus[]).map(s => (
                          <button key={s}
                            disabled={st === s}
                            onClick={() => setStatus(row.nr4_class_code, s)}
                            className={`text-[11px] px-2 py-1 rounded border transition-colors ${st === s ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-default' : 'bg-white border-gray-200 text-gray-600 hover:border-petrol hover:text-petrol'}`}>
                            {s === 'approved' ? '✓ Aprovar' : s === 'blocked' ? '✗ Bloquear' : '~ Pendente'}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Nenhum CNAE encontrado.</td></tr>
              )}
              {filtered.length > 100 && (
                <tr><td colSpan={5} className="px-4 py-3 text-center text-gray-400 text-[12px]">Mostrando 100 de {filtered.length}. Refine a busca.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
