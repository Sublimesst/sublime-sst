'use client'

import { useState, useEffect } from 'react'
import { Users, CheckCircle, Clock, Building2, TrendingUp, Download } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Stats {
  leads: { total: number; novos7d: number; indicados: number; eligible: number; backoffice: number; registered: number; converted: number }
  companies: Record<string, number>
  pagamentosImplantacaoPendentes: number
  partners: { pending: number; active: number; referrals: number }
  commissions: Record<string, { count: number; totalCentavos: number }>
}

const brl = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

interface RecentLead {
  id: string
  companyName: string
  name: string
  status: string
  createdAt: string
  eligibilityAssessments: { eligible: boolean }[]
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number | string; color: string }) {
  return (
    <div className="bg-white rounded-[12px] border border-gray-200 p-5">
      <div className={`w-9 h-9 rounded-[8px] flex items-center justify-center mb-3 ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-0.5">{value}</div>
      <div className="text-[13px] text-gray-500">{label}</div>
    </div>
  )
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  captured: { label: 'Capturado', color: 'bg-gray-100 text-gray-700' },
  assessed: { label: 'Avaliado', color: 'bg-blue-100 text-blue-700' },
  eligible: { label: 'Elegível', color: 'bg-green-100 text-green-700' },
  backoffice: { label: 'Backoffice', color: 'bg-amber-100 text-amber-700' },
  registered: { label: 'Cadastrado', color: 'bg-teal-100 text-teal-700' },
  converted: { label: 'Convertido', color: 'bg-purple-100 text-purple-700' },
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const secret = sessionStorage.getItem('admin_secret') ?? ''
    const headers = { 'x-admin-secret': secret }

    Promise.all([
      fetch('/api/admin/stats', { headers }).then(r => r.json()),
      fetch('/api/leads', { headers }).then(r => r.json()),
    ]).then(([statsRes, leadsRes]) => {
      if (statsRes.success) setStats(statsRes.data)
      if (leadsRes.success) setRecentLeads(leadsRes.data.leads.slice(0, 8))
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  const exportCSV = async () => {
    const secret = sessionStorage.getItem('admin_secret') ?? ''
    const res = await fetch('/api/leads?limit=1000', { headers: { 'x-admin-secret': secret } })
    const data = await res.json()
    if (!data.success) return

    const leads: RecentLead[] = data.data.leads
    const rows = [
      ['ID','Empresa','Responsável','Status','Data'],
      ...leads.map((l) => [l.id, l.companyName, l.name, l.status, formatDate(l.createdAt)]),
    ]
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'leads_sublime_sst.csv'; a.click()
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-gray-500 text-[14px]">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[1.6rem] font-bold text-gray-900">Dashboard</h1>
          <p className="text-[14px] text-gray-500">Visão geral da plataforma Sublime SST</p>
        </div>
        <button className="btn btn-outline-dark btn-sm" onClick={exportCSV}>
          <Download size={15} /> Exportar CSV
        </button>
      </div>

      {/* Funil */}
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Funil</p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <StatCard icon={Users} label="Total de leads" value={stats?.leads.total ?? 0} color="bg-petrol" />
        <StatCard icon={Users} label="Novos (7 dias)" value={stats?.leads.novos7d ?? 0} color="bg-blue-500" />
        <StatCard icon={TrendingUp} label="Indicados por parceiros" value={stats?.leads.indicados ?? 0} color="bg-purple-500" />
        <StatCard icon={CheckCircle} label="Elegíveis" value={stats?.leads.eligible ?? 0} color="bg-teal" />
        <StatCard icon={Clock} label="P/ Consultoria" value={stats?.leads.backoffice ?? 0} color="bg-amber-500" />
        <StatCard icon={Building2} label="Convertidos" value={stats?.leads.converted ?? 0} color="bg-green-600" />
      </div>

      {/* Operação */}
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Operação</p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <StatCard icon={Clock} label="Pagamento pendente" value={stats?.pagamentosImplantacaoPendentes ?? 0} color="bg-amber-500" />
        <StatCard icon={Clock} label="Aguardando onboarding" value={stats?.companies['onboarding_pending'] ?? 0} color="bg-blue-500" />
        <StatCard icon={Building2} label="Em produção" value={(stats?.companies['in_production'] ?? 0) + (stats?.companies['in_review'] ?? 0)} color="bg-petrol" />
        <StatCard icon={CheckCircle} label="Ativos" value={(stats?.companies['active'] ?? 0) + (stats?.companies['documents_delivered'] ?? 0)} color="bg-green-600" />
        <StatCard icon={Clock} label="Inadimplentes" value={stats?.companies['overdue'] ?? 0} color="bg-red-500" />
        <StatCard icon={TrendingUp} label="Migração p/ Consultoria" value={stats?.companies['migrating'] ?? 0} color="bg-purple-500" />
      </div>

      {/* Parceiros e comissões */}
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Parceiros e comissões</p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard icon={Users} label="Parceiros ativos" value={stats?.partners.active ?? 0} color="bg-teal" />
        <StatCard icon={Clock} label="Parceiros pendentes" value={stats?.partners.pending ?? 0} color="bg-amber-500" />
        <StatCard icon={TrendingUp} label="Indicações manuais" value={stats?.partners.referrals ?? 0} color="bg-blue-500" />
        <StatCard icon={Clock} label="Comissões em carência" value={brl(stats?.commissions['em_carencia']?.totalCentavos ?? 0)} color="bg-amber-500" />
        <StatCard icon={CheckCircle} label="Comissões liberadas" value={brl(stats?.commissions['liberada']?.totalCentavos ?? 0)} color="bg-green-600" />
        <StatCard icon={CheckCircle} label="Comissões pagas" value={brl(stats?.commissions['paga']?.totalCentavos ?? 0)} color="bg-petrol" />
      </div>

      {/* Recent leads */}
      <div className="bg-white rounded-[12px] border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-gray-900">Leads recentes</h2>
          <a href="/admin/leads" className="text-[13px] text-teal hover:underline">Ver todos →</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Empresa','Responsável','Status','Data'].map(h => (
                  <th key={h} className="text-left px-5 py-3 font-semibold text-gray-600 text-[12px] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentLeads.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400">Nenhum lead registrado ainda.</td></tr>
              ) : recentLeads.map((lead) => {
                const st = STATUS_LABEL[lead.status] ?? { label: lead.status, color: 'bg-gray-100 text-gray-700' }
                return (
                  <tr key={lead.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-900">{lead.companyName}</td>
                    <td className="px-5 py-3 text-gray-600">{lead.name}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${st.color}`}>{st.label}</span>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{formatDate(lead.createdAt)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
