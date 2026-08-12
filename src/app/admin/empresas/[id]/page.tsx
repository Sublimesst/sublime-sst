'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ArrowLeft, Save, Upload, Ban, Download } from 'lucide-react'
import { useParams } from 'next/navigation'
import { formatDate, maskCurrencyBRL } from '@/lib/utils'
import { PRICING, faixaKeyFromCount } from '@/lib/pricing'
import { formatOptionalText, formatPossuiPgr, employeeCountDiverges, formatCivilDateBR } from './onboardingDisplay'

const DOCUMENTO_TIPOS = [
  { value: 'pgr',        label: 'PGR' },
  { value: 'pcmso',      label: 'PCMSO' },
  { value: 'declaracao', label: 'Declaração técnica' },
  { value: 'os_epi',     label: 'OS + Fichas de EPI' },
  { value: 'ltcat',      label: 'LTCAT' },
  { value: 'contrato',   label: 'Contrato' },
]

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

interface DocumentItem {
  id: string
  tipoDocumento: string
  nomeArquivo: string
  mimeType: string
  tamanhoBytes: number
  uploadedBy?: string | null
  uploadedAt: string
}

interface CancellationRequest {
  id: string
  requestedAt: string
  reason: string
  requestedBy: string
  handledBy?: string | null
  feeCents?: number | null
  pendingCents?: number | null
  notes?: string | null
  createdAt: string
}

interface EsocialLog {
  id: string
  tipoEvento: string
  protocolo?: string | null
  status: string
  descricao?: string | null
  observacoes?: string | null
  enviadoEm?: string | null
  confirmadoEm?: string | null
  createdAt: string
}

interface OnboardingDataView {
  // em_preenchimento | enviado — só tratar como concluído quando "enviado".
  status: string
  numFuncionarios: number | null
  cargos?: string | null
  turnoTrabalho?: string | null
  dataUltimoPcmso?: string | null
  possuiPgr: boolean | null
  observacoes?: string | null
  submittedAt: string | null
}

// Trabalhador do onboarding, somente leitura — datas civis já em
// "YYYY-MM-DD" (serializadas pelo backend via serializeWorker).
interface WorkerRow {
  id: string
  nome: string | null
  dataNascimento: string | null
  sexo: 'M' | 'F' | null
  dataAdmissao: string | null
  cargo: string | null
  setor: string | null
}

interface Company {
  id: string
  razaoSocial: string
  cnpj: string
  email: string
  whatsapp: string
  cep: string
  cidade: string
  estado: string
  endereco: string
  numFuncionarios: number
  status: string
  planType?: string | null
  ltcatAddon: boolean
  reviewedBy?: string | null
  reviewedAt?: string | null
  contractAcceptedAt?: string | null
  createdAt: string
  source?: string | null
  partner?: { id: string; name: string; office: string; code: string } | null
  plan?: { label: string; monthlyPrice: number } | null
  cancellationRequests?: CancellationRequest[]
  asaasCustomerId?: string | null
  asaasSubscriptionId?: string | null
  subscriptionStatus?: string | null
  onboardingData?: OnboardingDataView | null
  workers: WorkerRow[]
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
  const [esocialLogs, setEsocialLogs] = useState<EsocialLog[]>([])
  const [esocialForm, setEsocialForm] = useState({ tipoEvento: 'S-2220', protocolo: '', descricao: '', status: 'enviado' })
  const [addingEsocial, setAddingEsocial] = useState(false)
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [docTipo, setDocTipo] = useState('pgr')
  const [uploadedBy, setUploadedBy] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [savingReview, setSavingReview] = useState(false)
  const [saved, setSaved] = useState(false)
  const [cancelForm, setCancelForm] = useState({
    reason: '', requestedBy: '', requestedAt: '', handledBy: '', feeReais: '', pendingReais: '', notes: '',
  })
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const [cancelEmailStatus, setCancelEmailStatus] = useState<{ cliente: boolean; parceiro: boolean | null } | null>(null)
  const [exportingSoc, setExportingSoc] = useState(false)
  const [socExportError, setSocExportError] = useState('')

  const headers = { 'x-admin-secret': getAdminSecret(), 'Content-Type': 'application/json' }

  const fetchData = useCallback(async () => {
    const [compRes, ckRes, esRes, docRes] = await Promise.all([
      fetch(`/api/admin/empresas/${id}`, { headers }),
      fetch(`/api/admin/empresas/${id}/checklist`, { headers }),
      fetch(`/api/admin/empresas/${id}/esocial`, { headers }),
      fetch(`/api/admin/empresas/${id}/documents`, { headers }),
    ])
    const [compData, ckData, esData, docData] = await Promise.all([compRes.json(), ckRes.json(), esRes.json(), docRes.json()])
    if (compData.success) { setCompany(compData.data); setReviewedBy(compData.data.reviewedBy ?? '') }
    if (ckData.success && ckData.data) { setChecklist(ckData.data); setForm(ckData.data) }
    else if (ckData.success) { setChecklist(null); setForm({}) }
    if (esData.success) setEsocialLogs(esData.data)
    if (docData.success) setDocuments(docData.data)
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

  async function addEsocialLog() {
    setAddingEsocial(true)
    try {
      const res = await fetch(`/api/admin/empresas/${id}/esocial`, {
        method: 'POST', headers, body: JSON.stringify(esocialForm),
      })
      const data = await res.json()
      if (data.success) setEsocialLogs(logs => [data.data, ...logs])
    } finally { setAddingEsocial(false) }
  }

  async function uploadDocument() {
    const file = fileInputRef.current?.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const body = new FormData()
      body.append('file', file)
      body.append('tipoDocumento', docTipo)
      if (uploadedBy) body.append('uploadedBy', uploadedBy)

      const res = await fetch(`/api/admin/empresas/${id}/documents`, {
        method: 'POST',
        headers: { 'x-admin-secret': getAdminSecret() },
        body,
      })
      const data = await res.json()
      if (data.success) {
        setDocuments(docs => [data.data, ...docs])
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    } finally { setUploading(false) }
  }

  // Exportação read-only compatível com o Modelo I do SOC — baixa o .xls
  // gerado pela rota administrativa. Nenhum dado é enviado automaticamente
  // ao SOC; é só um download manual para importação posterior.
  async function exportSoc() {
    setExportingSoc(true)
    setSocExportError('')
    try {
      const res = await fetch(`/api/admin/empresas/${id}/export/soc`, {
        headers: { 'x-admin-secret': getAdminSecret() },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setSocExportError(data.error ?? 'Falha ao gerar a exportação SOC.')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const cnpjDigits = company?.cnpj.replace(/\D/g, '') ?? id
      const a = document.createElement('a')
      a.href = url
      a.download = `SOC-${cnpjDigits}.xls`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setExportingSoc(false)
    }
  }

  function reaisToCents(v: string): number | null {
    if (!v.trim()) return null
    const n = Number(v.replace(',', '.'))
    return Number.isFinite(n) ? Math.round(n * 100) : null
  }

  async function cancelCompany() {
    if (!cancelForm.reason.trim() || !cancelForm.requestedBy.trim()) {
      setCancelError('Motivo e responsável pelo pedido são obrigatórios.')
      return
    }
    if (!window.confirm(`Confirma o cancelamento do contrato de ${company?.razaoSocial}? Essa ação não pode ser desfeita por aqui.`)) return

    setCancelling(true)
    setCancelError('')
    try {
      const res = await fetch(`/api/admin/empresas/${id}/cancel`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          reason:       cancelForm.reason,
          requestedBy:  cancelForm.requestedBy,
          requestedAt:  cancelForm.requestedAt || undefined,
          handledBy:    cancelForm.handledBy || null,
          feeCents:     reaisToCents(cancelForm.feeReais),
          pendingCents: reaisToCents(cancelForm.pendingReais),
          notes:        cancelForm.notes || null,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setCompany(c => c ? {
          ...c, status: 'cancelled',
          cancellationRequests: [data.data.cancellationRequest, ...(c.cancellationRequests ?? [])],
        } : c)
        setCancelEmailStatus(data.data.emailSent)
      } else {
        setCancelError(data.error ?? 'Falha ao cancelar.')
      }
    } finally { setCancelling(false) }
  }

  function AsaasManualAlert() {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-[8px] p-3 mb-4 text-[12px] text-blue-800">
        <p className="font-semibold mb-1">ℹ️ Cancelamento também cancela a assinatura na Asaas</p>
        <p>
          Esta ação cancela automaticamente a assinatura recorrente na Asaas antes de aplicar o
          cancelamento local. Se a chamada à Asaas falhar, nada é alterado e o cancelamento pode
          ser tentado novamente.
        </p>
        {company!.asaasSubscriptionId ? (
          <p className="mt-1">ID da assinatura: <span className="font-mono font-semibold">{company!.asaasSubscriptionId}</span></p>
        ) : (
          <p className="mt-1">Não há assinatura registrada no sistema para esta empresa.</p>
        )}
      </div>
    )
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
          {company.status === 'cancelled' && <span className="ml-2 text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">CANCELADO</span>}
          <p className="text-[11px] text-gray-400 mt-0.5">Cadastro: {formatDate(company.createdAt)}</p>
        </div>
      </div>

      {/* Dados da empresa */}
      <div className="bg-white rounded-[12px] border border-gray-200 p-5 mb-6">
        <p className="text-[14px] font-semibold text-gray-800 mb-4">Dados da empresa</p>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-[13px]">
          <div>
            <span className="text-gray-400 block text-[11px] uppercase tracking-wide">WhatsApp</span>
            <a href={`https://wa.me/55${company.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-teal">{company.whatsapp}</a>
          </div>
          <div>
            <span className="text-gray-400 block text-[11px] uppercase tracking-wide">Funcionários</span>
            {company.numFuncionarios} · {PRICING[company.planType === 'premium' ? 'premium' : 'essencial'].faixas[faixaKeyFromCount(company.numFuncionarios)].label}
          </div>
          <div className="col-span-2">
            <span className="text-gray-400 block text-[11px] uppercase tracking-wide">Endereço</span>
            {company.endereco}, {company.cidade}/{company.estado} · CEP {company.cep}
          </div>
          <div className="col-span-2">
            <span className="text-gray-400 block text-[11px] uppercase tracking-wide">Origem</span>
            {company.partner ? (
              <span>Parceiro: <strong>{company.partner.name}</strong> · {company.partner.office} <span className="font-mono text-[11px] text-gray-400">({company.partner.code})</span></span>
            ) : (
              <span className="text-gray-600">Orgânico</span>
            )}
          </div>
        </div>
      </div>

      {/* Dados enviados pelo cliente (onboarding) */}
      <div className="bg-white rounded-[12px] border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[14px] font-semibold text-gray-800">Dados enviados pelo cliente</p>
          {company.onboardingData?.status === 'enviado' ? (
            <span className="text-[11px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✅ Preenchido</span>
          ) : company.onboardingData?.status === 'em_preenchimento' ? (
            <span className="text-[11px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">🟡 Em preenchimento</span>
          ) : (
            <span className="text-[11px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">⏳ Pendente</span>
          )}
        </div>

        {company.onboardingData?.status === 'enviado' ? (
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-[13px]">
            <div className="col-span-2">
              <span className="text-gray-400 block text-[11px] uppercase tracking-wide">Enviado em</span>
              {company.onboardingData.submittedAt ? formatDate(company.onboardingData.submittedAt) : '—'}
            </div>

            <div>
              <span className="text-gray-400 block text-[11px] uppercase tracking-wide">Funcionários informados no onboarding</span>
              {company.onboardingData.numFuncionarios ?? '—'}
              {company.onboardingData.numFuncionarios !== null &&
                employeeCountDiverges(company.numFuncionarios, company.onboardingData.numFuncionarios) && (
                <p className="text-[11px] text-amber-600 mt-1">
                  ⚠️ A quantidade informada no onboarding difere do cadastro inicial.
                  {' '}(Cadastro inicial: {company.numFuncionarios} · Onboarding: {company.onboardingData.numFuncionarios})
                </p>
              )}
            </div>
            <div>
              <span className="text-gray-400 block text-[11px] uppercase tracking-wide">Turno de trabalho</span>
              {formatOptionalText(company.onboardingData.turnoTrabalho)}
            </div>

            <div>
              <span className="text-gray-400 block text-[11px] uppercase tracking-wide">Cargos</span>
              {formatOptionalText(company.onboardingData.cargos)}
            </div>
            <div>
              <span className="text-gray-400 block text-[11px] uppercase tracking-wide">Já possui PGR?</span>
              {formatPossuiPgr(company.onboardingData.possuiPgr)}
            </div>

            <div className="col-span-2">
              <span className="text-gray-400 block text-[11px] uppercase tracking-wide">Data do último PCMSO (informado pelo cliente)</span>
              {formatOptionalText(company.onboardingData.dataUltimoPcmso)}
            </div>

            <div className="col-span-2">
              <span className="text-gray-400 block text-[11px] uppercase tracking-wide">Observações</span>
              <p className="whitespace-pre-wrap break-words">{formatOptionalText(company.onboardingData.observacoes)}</p>
            </div>
          </div>
        ) : company.onboardingData?.status === 'em_preenchimento' ? (
          <p className="text-[12px] text-gray-400 py-2">Cliente iniciou o preenchimento, mas ainda não enviou os dados.</p>
        ) : (
          <p className="text-[12px] text-gray-400 py-2">Cliente ainda não iniciou o onboarding.</p>
        )}
      </div>

      {/* Trabalhadores cadastrados (somente leitura — nenhuma mutação de Worker pelo Admin) */}
      <div className="bg-white rounded-[12px] border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[14px] font-semibold text-gray-800">Trabalhadores cadastrados</p>
          <div className="flex items-center gap-2">
            <span className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
              {company.workers.length} {company.workers.length === 1 ? 'trabalhador atual' : 'trabalhadores atuais'}
            </span>
            <button
              onClick={exportSoc}
              disabled={exportingSoc || company.workers.length === 0}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-teal border border-teal/30 rounded-[6px] px-2.5 py-1 hover:bg-teal/5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download size={13} /> {exportingSoc ? 'Gerando…' : 'Exportar para SOC'}
            </button>
          </div>
        </div>

        {socExportError && (
          <p className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-[6px] px-2.5 py-1.5 mb-3">
            {socExportError}
          </p>
        )}

        <p className="text-[10px] text-gray-400 mb-2">
          Gera um arquivo .xls para importação manual no SOC — nenhum dado é enviado automaticamente.
        </p>

        {company.onboardingData?.status === 'enviado' && (
          <p className="text-[11px] text-gray-400 mb-3">
            Quantidade atual de Workers vinculados à empresa — distinta do snapshot declarado no
            envio ({company.onboardingData.numFuncionarios ?? '—'}), que permanece fixo mesmo se a
            lista mudar depois.
          </p>
        )}

        {company.workers.length === 0 ? (
          <p className="text-[12px] text-gray-400 py-4 text-center">
            {company.onboardingData?.status === 'em_preenchimento'
              ? 'Cliente iniciou o preenchimento, mas ainda não cadastrou nenhum trabalhador.'
              : company.onboardingData?.status === 'enviado'
              ? 'Nenhum trabalhador cadastrado nesta declaração.'
              : 'Nenhum trabalhador cadastrado.'}
          </p>
        ) : (
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-gray-100">
                {['Nome', 'Nascimento', 'Sexo', 'Admissão', 'Cargo', 'Setor'].map(h => (
                  <th key={h} className="text-left py-2 font-semibold text-[10px] text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {company.workers.map(worker => (
                <tr key={worker.id} className="border-b border-gray-50">
                  <td className="py-2.5 font-medium">{worker.nome ?? '—'}</td>
                  <td className="py-2.5 text-gray-600">{formatCivilDateBR(worker.dataNascimento)}</td>
                  <td className="py-2.5 text-gray-600">{worker.sexo === 'F' ? 'Feminino' : worker.sexo === 'M' ? 'Masculino' : '—'}</td>
                  <td className="py-2.5 text-gray-600">{formatCivilDateBR(worker.dataAdmissao)}</td>
                  <td className="py-2.5 text-gray-600">{worker.cargo ?? '—'}</td>
                  <td className="py-2.5 text-gray-400">{worker.setor ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Assinatura Asaas */}
      <div className="bg-white rounded-[12px] border border-gray-200 p-4 mb-6 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] text-gray-500">
        <span className="font-semibold text-gray-700">Assinatura Asaas</span>
        <span>Customer: <span className="font-mono">{company.asaasCustomerId ?? '—'}</span></span>
        <span>Assinatura: <span className="font-mono">{company.asaasSubscriptionId ?? '—'}</span></span>
        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
          company.subscriptionStatus === 'active'  ? 'bg-green-100 text-green-700' :
          company.subscriptionStatus === 'overdue' ? 'bg-red-100 text-red-700' :
                                                       'bg-gray-100 text-gray-500'
        }`}>
          {company.subscriptionStatus ?? 'sem assinatura'}
        </span>
      </div>

      {/* Cancelamento */}
      <div className="bg-white rounded-[12px] border border-red-200 p-5 mb-6">
        <p className="text-[14px] font-semibold text-gray-800 mb-4">Cancelamento do contrato</p>

        {company.status === 'cancelled' ? (
          <div>
            <p className="text-[12px] text-red-600 font-semibold mb-3">🚫 Contrato cancelado</p>
            <AsaasManualAlert />
            {company.cancellationRequests?.[0] && (
              <div className="text-[12px] text-gray-600 space-y-1">
                <p><span className="text-gray-400">Data do pedido:</span> {formatDate(company.cancellationRequests[0].requestedAt)}</p>
                <p><span className="text-gray-400">Motivo:</span> {company.cancellationRequests[0].reason}</p>
                <p><span className="text-gray-400">Solicitado por:</span> {company.cancellationRequests[0].requestedBy}</p>
                {company.cancellationRequests[0].handledBy && (
                  <p><span className="text-gray-400">Tratado por:</span> {company.cancellationRequests[0].handledBy}</p>
                )}
                {company.cancellationRequests[0].feeCents != null && (
                  <p><span className="text-gray-400">Valor de rescisão antecipada:</span> {maskCurrencyBRL(company.cancellationRequests[0].feeCents)}</p>
                )}
                {company.cancellationRequests[0].pendingCents != null && (
                  <p><span className="text-gray-400">Débitos já vencidos/em aberto:</span> {maskCurrencyBRL(company.cancellationRequests[0].pendingCents)}</p>
                )}
                {company.cancellationRequests[0].notes && (
                  <p><span className="text-gray-400">Observações:</span> {company.cancellationRequests[0].notes}</p>
                )}
              </div>
            )}
            {cancelEmailStatus && (
              <p className="text-[11px] text-gray-500 mt-3">
                E-mail cliente: {cancelEmailStatus.cliente ? '✅ enviado' : '⚠️ falhou'} ·
                {' '}E-mail parceiro: {cancelEmailStatus.parceiro === null ? 'não aplicável' : cancelEmailStatus.parceiro ? '✅ enviado' : '⚠️ falhou'}
              </p>
            )}
          </div>
        ) : (
          <>
            <AsaasManualAlert />
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-wide mb-1 block">Motivo *</label>
                <input
                  type="text"
                  value={cancelForm.reason}
                  onChange={e => setCancelForm(f => ({ ...f, reason: e.target.value }))}
                  className="w-full text-[12px] border border-gray-200 rounded-[6px] px-2 py-1.5 focus:outline-none focus:border-teal"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-wide mb-1 block">Solicitado por *</label>
                <input
                  type="text"
                  value={cancelForm.requestedBy}
                  onChange={e => setCancelForm(f => ({ ...f, requestedBy: e.target.value }))}
                  className="w-full text-[12px] border border-gray-200 rounded-[6px] px-2 py-1.5 focus:outline-none focus:border-teal"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-wide mb-1 block">Data do pedido</label>
                <input
                  type="date"
                  value={cancelForm.requestedAt}
                  onChange={e => setCancelForm(f => ({ ...f, requestedAt: e.target.value }))}
                  className="w-full text-[12px] border border-gray-200 rounded-[6px] px-2 py-1.5 focus:outline-none focus:border-teal"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-wide mb-1 block">Tratado por</label>
                <input
                  type="text"
                  value={cancelForm.handledBy}
                  onChange={e => setCancelForm(f => ({ ...f, handledBy: e.target.value }))}
                  className="w-full text-[12px] border border-gray-200 rounded-[6px] px-2 py-1.5 focus:outline-none focus:border-teal"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-wide mb-1 block">Valor de rescisão antecipada (R$)</label>
                <input
                  type="text"
                  placeholder="0,00"
                  value={cancelForm.feeReais}
                  onChange={e => setCancelForm(f => ({ ...f, feeReais: e.target.value }))}
                  className="w-full text-[12px] border border-gray-200 rounded-[6px] px-2 py-1.5 focus:outline-none focus:border-teal"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Informe manualmente o valor devido pela quebra do prazo contratual mínimo, se aplicável.
                  Pode incluir multa, mensalidades vincendas ou valor negociado de rescisão.
                </p>
              </div>
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-wide mb-1 block">Débitos já vencidos/em aberto (R$)</label>
                <input
                  type="text"
                  placeholder="0,00"
                  value={cancelForm.pendingReais}
                  onChange={e => setCancelForm(f => ({ ...f, pendingReais: e.target.value }))}
                  className="w-full text-[12px] border border-gray-200 rounded-[6px] px-2 py-1.5 focus:outline-none focus:border-teal"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Informe mensalidades, implantação, serviços adicionais ou outros valores já vencidos
                  antes do pedido de cancelamento.
                </p>
              </div>
            </div>
            <div className="mb-3">
              <label className="text-[10px] text-gray-400 uppercase tracking-wide mb-1 block">Observações</label>
              <textarea
                rows={2}
                value={cancelForm.notes}
                onChange={e => setCancelForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full text-[13px] border border-gray-200 rounded-[8px] px-3 py-2 focus:outline-none focus:border-teal resize-none"
              />
            </div>
            {cancelError && <p className="text-[12px] text-red-600 mb-2">{cancelError}</p>}
            <button
              className="btn btn-sm bg-red-600 text-white hover:bg-red-700"
              onClick={cancelCompany}
              disabled={cancelling}
            >
              {cancelling ? 'Cancelando…' : <><Ban size={13} /> Cancelar contrato</>}
            </button>
            <p className="text-[11px] text-gray-400 mt-2">
              Ao confirmar: empresa marcada como cancelada, comissões em carência são estornadas
              (liberadas/pagas não são afetadas), e-mails enviados ao cliente e ao parceiro (se houver).
            </p>
          </>
        )}
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

      {/* Documentos */}
      <div className="bg-white rounded-[12px] border border-gray-200 p-5 mb-6">
        <p className="text-[14px] font-semibold text-gray-800 mb-4">Documentos entregues</p>

        <div className="grid grid-cols-[160px_1fr_160px_auto] gap-2 mb-4 items-end">
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wide mb-1 block">Tipo</label>
            <select
              value={docTipo}
              onChange={e => setDocTipo(e.target.value)}
              className="w-full text-[12px] border border-gray-200 rounded-[6px] px-2 py-1.5 bg-white focus:outline-none focus:border-teal"
            >
              {DOCUMENTO_TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wide mb-1 block">Arquivo</label>
            <input
              ref={fileInputRef}
              type="file"
              className="w-full text-[12px] border border-gray-200 rounded-[6px] px-2 py-1.5 bg-white focus:outline-none focus:border-teal"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wide mb-1 block">Responsável</label>
            <input
              type="text"
              placeholder="Quem anexou"
              value={uploadedBy}
              onChange={e => setUploadedBy(e.target.value)}
              className="w-full text-[12px] border border-gray-200 rounded-[6px] px-2 py-1.5 focus:outline-none focus:border-teal"
            />
          </div>
          <button className="btn btn-primary btn-sm self-end" onClick={uploadDocument} disabled={uploading}>
            {uploading ? '…' : <><Upload size={13} /> Anexar</>}
          </button>
        </div>

        {documents.length === 0 ? (
          <p className="text-[12px] text-gray-400 py-4 text-center">Nenhum documento anexado.</p>
        ) : (
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-gray-100">
                {['Tipo', 'Arquivo', 'Responsável', 'Enviado em'].map(h => (
                  <th key={h} className="text-left py-2 font-semibold text-[10px] text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {documents.map(doc => (
                <tr key={doc.id} className="border-b border-gray-50">
                  <td className="py-2.5 font-medium">{DOCUMENTO_TIPOS.find(t => t.value === doc.tipoDocumento)?.label ?? doc.tipoDocumento}</td>
                  <td className="py-2.5 text-gray-600">{doc.nomeArquivo}</td>
                  <td className="py-2.5 text-gray-400">{doc.uploadedBy ?? '—'}</td>
                  <td className="py-2.5 text-gray-400">{formatDate(doc.uploadedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* eSocial Log */}
      <div className="bg-white rounded-[12px] border border-gray-200 p-5">
        <p className="text-[14px] font-semibold text-gray-800 mb-4">Registros eSocial SST</p>

        {/* Add log form */}
        <div className="grid grid-cols-[120px_1fr_180px_auto] gap-2 mb-4 items-end">
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wide mb-1 block">Evento</label>
            <select
              value={esocialForm.tipoEvento}
              onChange={e => setEsocialForm(f => ({ ...f, tipoEvento: e.target.value }))}
              className="w-full text-[12px] border border-gray-200 rounded-[6px] px-2 py-1.5 bg-white focus:outline-none focus:border-teal"
            >
              <option value="S-2210">S-2210 (CAT)</option>
              <option value="S-2220">S-2220 (Saúde)</option>
              <option value="S-2240">S-2240 (Ambiente)</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wide mb-1 block">Descrição</label>
            <input
              type="text"
              placeholder="Ex: Exame periódico anual"
              value={esocialForm.descricao}
              onChange={e => setEsocialForm(f => ({ ...f, descricao: e.target.value }))}
              className="w-full text-[12px] border border-gray-200 rounded-[6px] px-2 py-1.5 focus:outline-none focus:border-teal"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wide mb-1 block">Status</label>
            <select
              value={esocialForm.status}
              onChange={e => setEsocialForm(f => ({ ...f, status: e.target.value }))}
              className="w-full text-[12px] border border-gray-200 rounded-[6px] px-2 py-1.5 bg-white focus:outline-none focus:border-teal"
            >
              <option value="pending">Pendente</option>
              <option value="enviado">Enviado</option>
              <option value="confirmado">Confirmado</option>
              <option value="erro">Erro</option>
            </select>
          </div>
          <button
            className="btn btn-primary btn-sm self-end"
            onClick={addEsocialLog}
            disabled={addingEsocial}
          >
            {addingEsocial ? '…' : '+ Log'}
          </button>
        </div>

        {/* Log list */}
        {esocialLogs.length === 0 ? (
          <p className="text-[12px] text-gray-400 py-4 text-center">Nenhum registro eSocial cadastrado.</p>
        ) : (
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-gray-100">
                {['Evento', 'Descrição', 'Status', 'Enviado em', 'Criado em'].map(h => (
                  <th key={h} className="text-left py-2 font-semibold text-[10px] text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {esocialLogs.map(log => {
                const statusColors: Record<string, string> = {
                  pending: 'bg-amber-100 text-amber-700',
                  enviado: 'bg-blue-100 text-blue-700',
                  confirmado: 'bg-green-100 text-green-700',
                  erro: 'bg-red-100 text-red-700',
                }
                return (
                  <tr key={log.id} className="border-b border-gray-50">
                    <td className="py-2.5 font-mono font-medium">{log.tipoEvento}</td>
                    <td className="py-2.5 text-gray-600">{log.descricao ?? '—'}</td>
                    <td className="py-2.5">
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${statusColors[log.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-gray-400">{log.enviadoEm ? formatDate(log.enviadoEm) : '—'}</td>
                    <td className="py-2.5 text-gray-400">{formatDate(log.createdAt)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
