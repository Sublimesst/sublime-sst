'use client'

import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Save } from 'lucide-react'
import { useParams } from 'next/navigation'
import { formatDate } from '@/lib/utils'

interface Checklist {
  pgrStatus: string
  pgrConcluidoEm?: string | null
  pgrConcluidoPor?: string | null
  pcmsoStatus: string
  pcmsoMedico?: string | null
  pcmsoConcluidoEm?: string | null
  pcmsoConcluidoPor?: string | null
  declaracaoStatus: string
  declaracaoConcluidaEm?: string | null
  declaracaoConcluidaPor?: string | null
  osEpiStatus: string
  osEpiConcluidoEm?: string | null
  osEpiConcluidoPor?: string | null
  ltcatStatus?: string | null
  ltcatConcluidoEm?: string | null
  ltcatConcluidoPor?: string | null
  observacoes?: string | null
}

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
  reviewedAt?: string | null
  contractAcceptedAt?: string | null
  createdAt: string
  plan?: { label: string; monthlyPrice: number } | null
}

const ITEM_STATUSES = [
  { value: 'pending',     label: 'Pendente',    dot: 'bg-amber-400' },
  { value: 'in_progress', label: 'Em andamento', dot: 'bg-blue-400' },
  { value: 'done',        label: 'Concluído',   dot: 'bg-green-500' },
]

function StatusDot({ status }: { status: string }) {
  const s = ITEM_STATUSES.find(x => x.value === status)
  return (
    <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${s?.dot ?? 'bg-gray-300'}`} />
  )
}

function getAdminSecret() {
  return typeof window !== 'undefined' ? sessionStorage.getItem('admin_secret') ?? '' : ''
}

export default function EmpresaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [company, setCompany] = useState<Company | null>(null)
  const [checklist, setChecklist] = useState<Checklist | null>(null)
  const [form, setForm] = useState<Partial<Checklist>>({})
  const [reviewedBy, setReviewedBy] = useState('')
  const [saving, setSaving] = useState(false)
  const [savingReview, setSavingReview] = useState(false)
  const [saved, setSaved] = useState(false)

  const headers = { 'x-admin-secret': getAdminSecret(), 'Content-Type': 'application/json' }

  const fetchData = useCallback(async () => {
    const [compRes, ckRes] = await Promise.all([
      fetch(`/api/admin/empresas/${id}`, { headers }),
      fetch(`/api/admin/empresas/${id}/checklist`, { headers }),
    ])
    const [compData, ckData] = await Promise.all([compRes.json(), ckRes.json()])
    if (compData.success) { setCompany(compData.data); setReviewedBy(compData.data.reviewedBy ?? '') }
    if (ckData.success && ckData.data) { setChecklist(ckData.data); setForm(ckData.data) }
    else if (ckData.success) { setChecklist(null); setForm({}) }
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchData() }, [fetchData])

  async function saveChecklist() {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/empresas/${id}/checklist`, {
        method: 'PATCH', headers, body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) { setChecklist(data.data); setSaved(true); setTimeout(() => setSaved(false), 2000) }
    } finally { setSaving(false) }
  }

  async function saveReviewedBy() {
    setSavingReview(true)
    try {
      await fetch(`/api/admin/empresas/${id}`, {
        method: 'PATCH', headers, body: JSON.stringify({ reviewedBy }),
      })
      setCompany(c => c ? { ...c, reviewedBy } : c)
    } finally { setSavingReview(false) }
  }

  function setField<K extends keyof Checklist>(k: K, v: Checklist[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function ChecklistRow({ label, statusKey, concluidoPorKey, concluidoEmValue, show = true }:
    { label: string; statusKey: keyof Checklist; concluidoPorKey: keyof Checklist; concluidoEmValue?: string | null; show?: boolean }) {
    if (!show) return null
    const current = (form[statusKey] as string) ?? 'pending'
    const por = (form[concluidoPorKey] as string) ?? ''
    return (
      <div className="grid grid-cols-[1fr_180px_200px_180px] gap-3 items-center py-3 border-b border-gray-100">
        <div>
          <p className="text-[13px] font-medium text-gray-800">{label}</p>
          {concluidoEmValue && <p className="text-[11px] text-gray-400">Concluído em: {formatDate(concluidoEmValue)}</p>}
        </div>
        <select
          value={current}
          onChange={e => setField(statusKey, e.target.value as Checklist[typeof statusKey])}
          className="text-[12px] border border-gray-200 rounded-[6px] px-2 py-1.5 bg-white focus:outline-none focus:border-teal"
        >
          {ITEM_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <input
          type="text"
          placeholder="Responsável"
          value={por}
          onChange={e => setField(concluidoPorKey, e.target.value as Checklist[typeof concluidoPorKey])}
          className="text-[12px] border border-gray-200 rounded-[6px] px-2 py-1.5 focus:outline-none focus:border-teal"
        />
        <div className="flex items-center">
          <StatusDot status={current} />
          <span className="text-[11px] text-gray-500">{ITEM_STATUSES.find(s => s.value === current)?.label}</span>
        </div>
      </div>
    )
  }

  if (!company) return <div className="p-8 text-[13px] text-gray-400">Carregando…</div>

  return (
    <div className="p-8 max-w-[900px]">
      <a href="/admin/empresas" className="inline-flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-teal mb-6">
        <ArrowLeft size={14} /> Voltar para empresas
      </a>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[1.5rem] font-bold text-gray-900">{company.razaoSocial}</h1>
          <p className="text-[13px] text-gray-400">{company.cnpj} · {company.email}</p>
        </div>
        <div className="text-right">
          <span className="text-[12px] text-gray-500 capitalize">{company.planType ?? '—'}</span>
          {company.ltcatAddon && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">+LTCAT</span>}
          <p className="text-[11px] text-gray-400 mt-0.5">Cadastro: {formatDate(company.createdAt)}</p>
        </div>
      </div>

      {/* Reviewed by */}
      <div className="bg-white rounded-[12px] border border-gray-200 p-5 mb-6">
        <p className="text-[13px] font-semibold text-gray-700 mb-3">Técnico responsável</p>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Nome do técnico revisor"
            value={reviewedBy}
            onChange={e => setReviewedBy(e.target.value)}
            className="flex-1 text-[13px] border border-gray-200 rounded-[8px] px-3 py-2 focus:outline-none focus:border-teal"
          />
          <button
            className="btn btn-primary btn-sm"
            onClick={saveReviewedBy}
            disabled={savingReview}
          >
            {savingReview ? 'Salvando…' : <><Save size={13} /> Salvar</>}
          </button>
        </div>
        {company.reviewedBy && (
          <p className="text-[11px] text-green-600 mt-2">✅ Revisado por: {company.reviewedBy}</p>
        )}
      </div>

      {/* Checklist */}
      <div className="bg-white rounded-[12px] border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[14px] font-semibold text-gray-800">Checklist de implantação</p>
          <button className="btn btn-primary btn-sm" onClick={saveChecklist} disabled={saving}>
            {saving ? 'Salvando…' : saved ? '✅ Salvo!' : <><Save size={13} /> Salvar checklist</>}
          </button>
        </div>

        <div className="grid grid-cols-[1fr_180px_200px_180px] gap-3 pb-2 border-b border-gray-200 mb-1">
          {['Documento', 'Status', 'Responsável', ''].map(h => (
            <p key={h} className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{h}</p>
          ))}
        </div>

        <ChecklistRow
          label="PGR — Programa de Gerenciamento de Riscos"
          statusKey="pgrStatus"
          concluidoPorKey="pgrConcluidoPor"
          concluidoEmValue={checklist?.pgrConcluidoEm}
        />
        <ChecklistRow
          label="PCMSO — Programa de Controle Médico"
          statusKey="pcmsoStatus"
          concluidoPorKey="pcmsoConcluidoPor"
          concluidoEmValue={checklist?.pcmsoConcluidoEm}
        />
        <ChecklistRow
          label="Declaração técnica de ausência de insalubridade"
          statusKey="declaracaoStatus"
          concluidoPorKey="declaracaoConcluidaPor"
          concluidoEmValue={checklist?.declaracaoConcluidaEm}
        />
        <ChecklistRow
          label="Ordens de Serviço + Fichas de EPI"
          statusKey="osEpiStatus"
          concluidoPorKey="osEpiConcluidoPor"
          concluidoEmValue={checklist?.osEpiConcluidoEm}
        />
        <ChecklistRow
          label="LTCAT — Laudo Técnico (add-on)"
          statusKey="ltcatStatus"
          concluidoPorKey="ltcatConcluidoPor"
          concluidoEmValue={checklist?.ltcatConcluidoEm}
          show={company.ltcatAddon}
        />

        <div className="mt-4">
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Observações internas</label>
          <textarea
            rows={3}
            placeholder="Notas sobre a implantação…"
            value={(form.observacoes as string) ?? ''}
            onChange={e => setField('observacoes', e.target.value)}
            className="w-full text-[13px] border border-gray-200 rounded-[8px] px-3 py-2 focus:outline-none focus:border-teal resize-none"
          />
        </div>

        {/* PCMSO médico */}
        <div className="mt-4">
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Médico coordenador do PCMSO</label>
          <input
            type="text"
            placeholder="Nome do médico coordenador"
            value={(form.pcmsoMedico as string) ?? ''}
            onChange={e => setField('pcmsoMedico', e.target.value)}
            className="w-full text-[13px] border border-gray-200 rounded-[8px] px-3 py-2 focus:outline-none focus:border-teal"
          />
        </div>
      </div>
    </div>
  )
}
