'use client'

import { useState } from 'react'
import { Search, CheckCircle, XCircle, Clock } from 'lucide-react'
import cnaeCatalog from '@/lib/cnae_catalog.json'

type CnaeStatus = 'approved' | 'pending' | 'blocked'

interface CnaeRow {
  nr4_class_code: string
  description: string
  grau_risco_nr4: number
  online_catalog_status: string // rótulo bruto do JSON (ex.: PENDING_RT_VALIDATION)
}

const entries = (cnaeCatalog as { entries: CnaeRow[] }).entries

const STATUS_CONFIG: Record<CnaeStatus, { icon: React.ElementType; label: string; color: string; bg: string }> = {
  approved: { icon: CheckCircle, label: 'Aprovado',  color: 'text-green-700', bg: 'bg-green-100' },
  pending:  { icon: Clock,       label: 'Pendente',  color: 'text-amber-700', bg: 'bg-amber-100' },
  blocked:  { icon: XCircle,     label: 'Bloqueado', color: 'text-red-700',   bg: 'bg-red-100' },
}

// O JSON usa rótulos brutos (ex.: PENDING_RT_VALIDATION) que não batem com as
// chaves acima. Normaliza para uma das 3 conhecidas, com fallback 'pending' —
// sem isso, STATUS_CONFIG[status] fica undefined e a página quebra (tela branca).
function normalizeStatus(raw: string | undefined): CnaeStatus {
  const s = (raw ?? '').toUpperCase()
  if (s === 'APPROVED' || s === 'APROVADO') return 'approved'
  if (s === 'BLOCKED' || s === 'BLOQUEADO') return 'blocked'
  return 'pending' // inclui PENDING, PENDING_RT_VALIDATION e qualquer desconhecido
}

export default function AdminCnaePage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<CnaeStatus | 'all'>('all')

  // Status informativo, direto do catálogo oficial — não há override manual
  // nesta tela. A elegibilidade real é decidida por runEligibilityEngine
  // (presença do código no catálogo), que não lê nenhum status desta página.
  const getStatus = (row: CnaeRow): CnaeStatus => normalizeStatus(row.online_catalog_status)

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

      {/* Status summary — informativo, clique só filtra a listagem abaixo */}
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

      {/* Aviso informativo */}
      <div className="bg-blue-50 border border-blue-200 rounded-[10px] p-4 mb-5 text-[13px] text-blue-900">
        A elegibilidade do Sublime Digital é definida pela presença do CNAE no catálogo oficial do sistema.
        Esta tela é apenas informativa nesta fase. Alterações de elegibilidade devem ser feitas por atualização
        controlada do catálogo, com revisão técnica, e não por botões operacionais.
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
                {['Código','Descrição','GR','Status'].map(h => (
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
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Nenhum CNAE encontrado.</td></tr>
              )}
              {filtered.length > 100 && (
                <tr><td colSpan={4} className="px-4 py-3 text-center text-gray-400 text-[12px]">Mostrando 100 de {filtered.length}. Refine a busca.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
