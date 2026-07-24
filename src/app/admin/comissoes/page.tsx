'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDate, maskCurrencyBRL } from '@/lib/utils'

type View = 'a_pagar' | 'a_liberar' | 'pagas' | 'competencia' | 'auditoria'

const VIEWS: { value: View; label: string }[] = [
  { value: 'a_pagar',     label: 'A pagar' },
  { value: 'a_liberar',   label: 'A liberar' },
  { value: 'pagas',       label: 'Pagas' },
  { value: 'competencia', label: 'Por competência' },
  { value: 'auditoria',   label: 'Todas / Auditoria' },
]

const STATUS_ORDER = ['em_carencia', 'liberada', 'paga', 'bloqueada', 'estornada'] as const

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  em_carencia: { label: 'Em carência', color: 'bg-amber-100 text-amber-700' },
  liberada:    { label: 'Liberada',    color: 'bg-blue-100 text-blue-700' },
  paga:        { label: 'Paga',        color: 'bg-green-100 text-green-700' },
  bloqueada:   { label: 'Bloqueada',   color: 'bg-red-100 text-red-700' },
  estornada:   { label: 'Estornada',   color: 'bg-gray-100 text-gray-500' },
}

const DATE_BASE_LABELS: Record<string, string> = {
  liberadaEm: 'Data de liberação',
  pagaEm:     'Data de pagamento',
  createdAt:  'Data de criação',
  referencia: 'Competência (ano-mês)',
}

interface Commission {
  id: string
  mensalidadeNum: number
  referencia?: string | null
  valorComissao: number
  status: string
  liberadaEm?: string | null
  pagaEm?: string | null
  observacoes?: string | null
  partner: { id: string; name: string; office: string; code: string }
  company: { id: string; razaoSocial: string; cnpj: string }
  payment?: { id: string; type: string; amount: number; paidAt?: string | null; asaasId?: string | null } | null
}

interface Partner { id: string; name: string; office: string; code: string }
interface Totals { count: number; totalCentavos: number }

function getAdminSecret() {
  return typeof window !== 'undefined' ? sessionStorage.getItem('admin_secret') ?? '' : ''
}

function currentMonthRange() {
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth(), 1)
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  return { from: fmt(first), to: fmt(last) }
}
function currentMonthReference() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function ComissoesPage() {
  const [view, setView] = useState<View>('a_pagar')
  const [statusFilter, setStatusFilter] = useState('')
  const [partnerId, setPartnerId] = useState('')
  const monthRange = currentMonthRange()
  const [from, setFrom] = useState(monthRange.from)
  const [to, setTo] = useState(monthRange.to)
  const [referenceFrom, setReferenceFrom] = useState(currentMonthReference())
  const [referenceTo, setReferenceTo] = useState(currentMonthReference())
  const [dateBaseAuditoria, setDateBaseAuditoria] = useState('liberadaEm')

  const [commissions, setCommissions] = useState<Commission[]>([])
  const [totals, setTotals] = useState<Record<string, Totals>>({})
  const [partners, setPartners] = useState<Partner[]>([])
  const [appliedStatus, setAppliedStatus] = useState<string | null>(null)
  const [dateBase, setDateBase] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [confirmTarget, setConfirmTarget] = useState<Commission | null>(null)
  const [referenciaPagamento, setReferenciaPagamento] = useState('')
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState('')

  const isCompetencia = view === 'competencia'

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const secret = getAdminSecret()
    const params = new URLSearchParams({ view })
    if (statusFilter) params.set('status', statusFilter)
    if (partnerId) params.set('partnerId', partnerId)
    if (isCompetencia) {
      if (referenceFrom) params.set('referenceFrom', referenceFrom)
      if (referenceTo) params.set('referenceTo', referenceTo)
    } else {
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      if (view === 'auditoria') params.set('dateBase', dateBaseAuditoria)
    }
    try {
      const res = await fetch(`/api/admin/comissoes?${params.toString()}`, { headers: { 'x-admin-secret': secret } })
      const data = await res.json()
      if (data.success) {
        setCommissions(data.data.commissions)
        setTotals(data.data.totals)
        setPartners(data.data.partners)
        setAppliedStatus(data.data.appliedStatus)
        setDateBase(data.data.dateBase)
      } else {
        setError(data.error ?? 'Erro ao carregar comissões.')
      }
    } catch {
      setError('Erro de rede ao carregar comissões.')
    } finally {
      setLoading(false)
    }
  }, [view, statusFilter, partnerId, from, to, referenceFrom, referenceTo, dateBaseAuditoria, isCompetencia])

  useEffect(() => { load() }, [load])

  function clearPeriod() {
    if (isCompetencia) { setReferenceFrom(''); setReferenceTo('') }
    else { setFrom(''); setTo('') }
  }

  async function confirmPayment() {
    if (!confirmTarget) return
    setSaving(true)
    setActionError('')
    const secret = getAdminSecret()
    try {
      const res = await fetch('/api/admin/comissoes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
        body: JSON.stringify({ id: confirmTarget.id, referenciaPagamento }),
      })
      const data = await res.json()
      if (data.success) {
        setConfirmTarget(null)
        setReferenciaPagamento('')
        await load()
      } else {
        setActionError(data.error ?? 'Erro ao marcar como paga.')
      }
    } catch {
      setActionError('Erro de rede ao marcar como paga.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-8 max-w-[1100px]">
      <div className="mb-6">
        <h1 className="text-[1.4rem] font-bold text-gray-900">Comissões</h1>
        <p className="text-[13px] text-gray-500">Financeiro de parceiros — visão por período, parceiro e status</p>
      </div>

      {/* Tabs de visão */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {VIEWS.map(v => (
          <button
            key={v.value}
            onClick={() => { setView(v.value); setStatusFilter('') }}
            className={`px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors ${
              view === v.value ? 'border-teal text-teal' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-[12px] border border-gray-200 p-4 mb-2 flex flex-wrap items-end gap-3">
        {isCompetencia ? (
          <>
            <div>
              <label className="text-[10px] text-gray-400 uppercase tracking-wide block mb-1">Competência inicial</label>
              <input type="month" value={referenceFrom} onChange={e => setReferenceFrom(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-[8px] text-[13px]" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 uppercase tracking-wide block mb-1">Competência final</label>
              <input type="month" value={referenceTo} onChange={e => setReferenceTo(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-[8px] text-[13px]" />
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="text-[10px] text-gray-400 uppercase tracking-wide block mb-1">Data inicial</label>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-[8px] text-[13px]" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 uppercase tracking-wide block mb-1">Data final</label>
              <input type="date" value={to} onChange={e => setTo(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-[8px] text-[13px]" />
            </div>
          </>
        )}

        {view === 'auditoria' && (
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wide block mb-1">Base da data</label>
            <select value={dateBaseAuditoria} onChange={e => setDateBaseAuditoria(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-[8px] text-[13px] bg-white">
              <option value="liberadaEm">Data de liberação</option>
              <option value="pagaEm">Data de pagamento</option>
              <option value="createdAt">Data de criação</option>
            </select>
          </div>
        )}

        <div>
          <label className="text-[10px] text-gray-400 uppercase tracking-wide block mb-1">Parceiro</label>
          <select value={partnerId} onChange={e => setPartnerId(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-[8px] text-[13px] bg-white min-w-[160px]">
            <option value="">Todos os parceiros</option>
            {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div>
          <label className="text-[10px] text-gray-400 uppercase tracking-wide block mb-1">Status (filtro manual)</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-[8px] text-[13px] bg-white">
            <option value="">Padrão da visão</option>
            {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_LABELS[s].label}</option>)}
          </select>
        </div>

        <button onClick={clearPeriod} className="btn btn-ghost btn-sm text-[12px]">Limpar período</button>
        <button onClick={load} className="btn btn-outline-dark btn-sm text-[12px]">Atualizar</button>
      </div>

      {dateBase && (
        <p className="text-[11px] text-gray-400 mb-4">
          Filtrando por: <strong>{DATE_BASE_LABELS[dateBase] ?? dateBase}</strong>
          {appliedStatus && <> · Status da tabela: <strong>{STATUS_LABELS[appliedStatus]?.label ?? appliedStatus}</strong></>}
          {!appliedStatus && <> · Status da tabela: <strong>todos</strong></>}
        </p>
      )}

      {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-[8px] text-[13px] text-red-700">⚠️ {error}</div>}

      {/* Cards de totais — sempre parceiro+período+data-base da visão, nunca filtrados por status */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {STATUS_ORDER.map(s => {
          const t = totals[s] ?? { count: 0, totalCentavos: 0 }
          return (
            <div key={s} className="bg-white rounded-[12px] border border-gray-200 p-4">
              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold mb-2 ${STATUS_LABELS[s].color}`}>
                {STATUS_LABELS[s].label}
              </span>
              <div className="text-[1.1rem] font-bold text-gray-900">{maskCurrencyBRL(t.totalCentavos)}</div>
              <div className="text-[11px] text-gray-400">{t.count} {t.count === 1 ? 'comissão' : 'comissões'}</div>
            </div>
          )
        })}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-[12px] border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-[13px] text-gray-400">Carregando…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['Parceiro', 'Cliente', 'Competência', 'Valor', 'Status', 'Liberada em', 'Paga em', 'Pagamento', 'Ação'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600 text-[11px] uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {commissions.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">Nenhuma comissão encontrada para os filtros aplicados.</td></tr>
                ) : commissions.map(c => {
                  const st = STATUS_LABELS[c.status] ?? { label: c.status, color: 'bg-gray-100 text-gray-600' }
                  return (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{c.partner.name}</p>
                        <p className="text-[11px] text-gray-400">{c.partner.office}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-800">{c.company.razaoSocial}</p>
                        <p className="text-[11px] text-gray-400">{c.company.cnpj}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">#{c.mensalidadeNum}{c.referencia ? ` · ${c.referencia}` : ''}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{maskCurrencyBRL(c.valorComissao)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${st.color}`}>{st.label}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{c.liberadaEm ? formatDate(c.liberadaEm) : '—'}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{c.pagaEm ? formatDate(c.pagaEm) : '—'}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {c.payment ? (
                          <>
                            <p className="capitalize">{c.payment.type}</p>
                            <p className="text-[11px] text-gray-400">{maskCurrencyBRL(c.payment.amount)}</p>
                          </>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {c.status === 'liberada' ? (
                          <button
                            onClick={() => { setConfirmTarget(c); setReferenciaPagamento(''); setActionError('') }}
                            className="btn btn-primary btn-sm text-[11px]"
                          >
                            Marcar paga
                          </button>
                        ) : (
                          <span className="text-gray-300 text-[11px]">—</span>
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

      {/* Modal de confirmação — marcar como paga */}
      {confirmTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[12px] p-6 max-w-[420px] w-full">
            <h3 className="text-[15px] font-bold text-gray-900 mb-1">Marcar comissão como paga</h3>
            <p className="text-[12px] text-gray-500 mb-4">
              ⚠️ Esta ação <strong>não transfere dinheiro</strong> — apenas registra que um pagamento já
              realizado fora do sistema foi conferido.
            </p>
            <div className="bg-gray-50 rounded-[8px] p-3 mb-4 text-[12px] space-y-1">
              <p><span className="text-gray-400">Parceiro:</span> {confirmTarget.partner.name}</p>
              <p><span className="text-gray-400">Cliente:</span> {confirmTarget.company.razaoSocial}</p>
              <p><span className="text-gray-400">Valor:</span> <strong>{maskCurrencyBRL(confirmTarget.valorComissao)}</strong></p>
            </div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wide block mb-1">Referência do pagamento *</label>
            <input
              type="text"
              value={referenciaPagamento}
              onChange={e => setReferenciaPagamento(e.target.value)}
              placeholder="Ex: PIX 21/08, comprovante #123"
              className="w-full px-3 py-2 border border-gray-200 rounded-[8px] text-[13px] mb-4"
            />
            {actionError && <p className="text-[11px] text-red-600 mb-3">{actionError}</p>}
            <div className="flex gap-2">
              <button onClick={() => setConfirmTarget(null)} className="btn btn-outline-dark btn-sm flex-1 text-[12px]">Cancelar</button>
              <button
                onClick={confirmPayment}
                disabled={saving || !referenciaPagamento.trim()}
                className="btn btn-primary btn-sm flex-1 text-[12px]"
              >
                {saving ? 'Salvando…' : 'Confirmar pagamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
