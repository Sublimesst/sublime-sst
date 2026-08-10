'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, CheckCircle2, AlertCircle, AlertTriangle, Plus } from 'lucide-react'
import { WorkerCard, WorkerCardReadOnly, type WorkerCardData } from './WorkerCard'
import { findDuplicateWorkerIds } from '@/lib/onboardingWorkers'
import { parseCivilDate } from '@/lib/civilDate'

type GeneralFields = {
  cargos: string | null
  turnoTrabalho: string | null
  dataUltimoPcmso: string | null
  possuiPgr: boolean | null
  observacoes: string | null
}

const EMPTY_GENERAL: GeneralFields = {
  cargos: null, turnoTrabalho: null, dataUltimoPcmso: null, possuiPgr: null, observacoes: null,
}

const MAX_WORKERS = 20

const inputClass =
  'w-full px-4 py-3 border border-gray-200 rounded-[10px] text-[14px] focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal'

function formatDateTimeBR(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

export function OnboardingForm() {
  const router = useRouter()

  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [status, setStatus] = useState<'em_preenchimento' | 'enviado'>('em_preenchimento')
  const [general, setGeneral] = useState<GeneralFields>(EMPTY_GENERAL)
  const generalRef = useRef<GeneralFields>(EMPTY_GENERAL)
  useEffect(() => { generalRef.current = general }, [general])
  const [numFuncionariosContratado, setNumFuncionariosContratado] = useState<number | null>(null)
  const [numFuncionariosDeclarado, setNumFuncionariosDeclarado] = useState<number | null>(null)
  const [submittedAt, setSubmittedAt] = useState<string | null>(null)
  const [workers, setWorkers] = useState<WorkerCardData[]>([])
  const workersRef = useRef<WorkerCardData[]>([])
  useEffect(() => { workersRef.current = workers }, [workers])

  const [generalSaveState, setGeneralSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [savingWorkerIds, setSavingWorkerIds] = useState<Set<string>>(new Set())
  const [removingWorkerIds, setRemovingWorkerIds] = useState<Set<string>>(new Set())
  const [addingWorker, setAddingWorker] = useState(false)

  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'mismatch_confirm' | 'done' | 'error'>('idle')
  const [confirmingMismatch, setConfirmingMismatch] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [mismatchInfo, setMismatchInfo] = useState<{ contratado: number; declarado: number } | null>(null)

  const load = useCallback(async () => {
    setLoadState('loading')
    try {
      const res = await fetch('/api/cliente/onboarding')
      const body = await res.json()
      if (!res.ok || !body.success) {
        setLoadState('error')
        return
      }
      setStatus(body.data.status)
      setGeneral(body.data.general)
      setNumFuncionariosContratado(body.data.numFuncionariosContratado)
      setNumFuncionariosDeclarado(body.data.numFuncionariosDeclarado)
      setSubmittedAt(body.data.submittedAt)
      setWorkers(body.data.workers)
      setLoadState('ready')
    } catch {
      setLoadState('error')
    }
  }, [])

  useEffect(() => { load() }, [load])

  // I/O puro, sem tocar estado de UI — usado tanto pelo autosave (blur)
  // quanto pelo flush determinístico antes do envio (ver handleSubmitClick).
  async function patchGeneral(patch: Partial<GeneralFields>): Promise<boolean> {
    try {
      const res = await fetch('/api/cliente/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const body = await res.json()
      return res.ok && !!body.success
    } catch {
      return false
    }
  }

  // Autosave no blur — indicador visual, nunca bloqueia a digitação, falha
  // é só sinalizada (não lançada). O flush de verdade antes do envio é
  // flushGeneral, abaixo.
  //
  // Guarda contra mismatch_confirm: os campos ficam `disabled` na UI (então
  // isso nunca dispara por interação real do usuário), mas o guard aqui
  // garante que nenhuma escrita de rascunho aconteça enquanto a declaração
  // precisa corresponder exatamente ao que gerou o aviso de divergência.
  async function saveGeneral(patch: Partial<GeneralFields>) {
    if (submitState === 'mismatch_confirm') return
    setGeneralSaveState('saving')
    const ok = await patchGeneral(patch)
    if (!ok) {
      setGeneralSaveState('error')
      return
    }
    setGeneralSaveState('saved')
    setTimeout(() => setGeneralSaveState((s) => (s === 'saved' ? 'idle' : s)), 2000)
  }

  // Persiste explicitamente TODO o estado atual dos campos gerais (não só o
  // último campo editado) — chamado antes do envio para fechar a corrida
  // entre o blur assíncrono do último campo e o clique em Enviar.
  async function flushGeneral(): Promise<boolean> {
    setGeneralSaveState('saving')
    const ok = await patchGeneral(generalRef.current)
    setGeneralSaveState(ok ? 'idle' : 'error')
    return ok
  }

  function updateGeneral<K extends keyof GeneralFields>(field: K, value: GeneralFields[K]) {
    if (submitState === 'mismatch_confirm') return
    setGeneral((g) => ({ ...g, [field]: value }))
  }

  async function addWorker() {
    if (workers.length >= MAX_WORKERS || submitState === 'mismatch_confirm') return
    setAddingWorker(true)
    try {
      const res = await fetch('/api/cliente/onboarding/workers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const body = await res.json()
      if (res.ok && body.success) {
        setWorkers((ws) => [...ws, body.data])
      }
    } finally {
      setAddingWorker(false)
    }
  }

  function updateWorkerLocal(id: string, patch: Partial<WorkerCardData>) {
    if (submitState === 'mismatch_confirm') return
    setWorkers((ws) => ws.map((w) => (w.id === id ? { ...w, ...patch } : w)))
  }

  // I/O puro — usado tanto pelo autosave (blur) quanto pelo flush
  // determinístico antes do envio.
  async function patchWorker(id: string, worker: WorkerCardData): Promise<boolean> {
    try {
      const res = await fetch(`/api/cliente/onboarding/workers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: worker.nome,
          dataNascimento: worker.dataNascimento,
          sexo: worker.sexo,
          dataAdmissao: worker.dataAdmissao,
          cargo: worker.cargo,
          setor: worker.setor,
        }),
      })
      return res.ok
    } catch {
      return false
    }
  }

  async function saveWorker(id: string) {
    if (submitState === 'mismatch_confirm') return
    const worker = workersRef.current.find((w) => w.id === id)
    if (!worker) return
    setSavingWorkerIds((s) => new Set(s).add(id))
    try {
      await patchWorker(id, worker)
    } finally {
      setSavingWorkerIds((s) => { const next = new Set(s); next.delete(id); return next })
    }
  }

  // Persiste explicitamente o estado local atual de UM worker — chamado
  // para todos os workers antes do envio (ver handleSubmitClick), fechando
  // a corrida entre o blur assíncrono do último campo editado e o clique
  // em Enviar. Com no máximo 20 workers, disparar todos em paralelo é mais
  // simples e determinístico do que rastrear quais estão "sujos".
  async function flushWorker(id: string): Promise<boolean> {
    const worker = workersRef.current.find((w) => w.id === id)
    if (!worker) return true
    setSavingWorkerIds((s) => new Set(s).add(id))
    try {
      return await patchWorker(id, worker)
    } finally {
      setSavingWorkerIds((s) => { const next = new Set(s); next.delete(id); return next })
    }
  }

  async function removeWorker(id: string) {
    if (submitState === 'mismatch_confirm') return
    setRemovingWorkerIds((s) => new Set(s).add(id))
    try {
      const res = await fetch(`/api/cliente/onboarding/workers/${id}`, { method: 'DELETE' })
      if (res.ok) setWorkers((ws) => ws.filter((w) => w.id !== id))
    } finally {
      setRemovingWorkerIds((s) => { const next = new Set(s); next.delete(id); return next })
    }
  }

  async function submit(confirmMismatch: boolean) {
    setSubmitState('submitting')
    setSubmitError(null)
    try {
      const res = await fetch('/api/cliente/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmMismatch }),
      })
      const body = await res.json()
      if (res.ok && body.success) {
        setSubmitState('done')
        setStatus('enviado')
        setTimeout(() => router.push('/cliente/dashboard'), 2500)
        return
      }
      if (body.code === 'quantity_mismatch') {
        setMismatchInfo(body.data)
        setSubmitState('mismatch_confirm')
        return
      }
      setSubmitError(body.error ?? 'Erro ao enviar. Tente novamente.')
      setSubmitState('error')
    } catch {
      setSubmitError('Erro de conexão. Verifique sua internet e tente novamente.')
      setSubmitState('error')
    }
  }

  // Trava síncrona contra duplo clique — não depende de re-render (o
  // atributo `disabled` do botão é só reforço visual, chega tarde demais
  // para impedir dois cliques disparados antes do 1º re-render).
  const submittingRef = useRef(false)

  // Envio inicial: faz flush determinístico de TUDO que pode ainda estar só
  // no estado local (campos gerais + cada worker) antes de chamar o POST
  // final — fecha a corrida entre o blur assíncrono do último campo editado
  // e o clique em Enviar. Se qualquer gravação de rascunho falhar, o envio
  // final nunca é chamado e os dados permanecem na tela.
  async function handleSubmitClick() {
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitState('submitting')
    setSubmitError(null)
    try {
      const [generalOk, ...workerResults] = await Promise.all([
        flushGeneral(),
        ...workersRef.current.map((w) => flushWorker(w.id)),
      ])
      if (!generalOk || workerResults.some((ok) => !ok)) {
        setSubmitError('Não foi possível salvar todas as alterações antes de enviar. Verifique sua conexão e tente novamente.')
        setSubmitState('error')
        return
      }
      await submit(false)
    } finally {
      submittingRef.current = false
    }
  }

  // Confirmação de divergência: nenhuma edição acontece entre a resposta de
  // mismatch e este clique, então não repete o flush — só a mesma trava de
  // duplo clique.
  async function handleConfirmMismatch() {
    if (submittingRef.current) return
    submittingRef.current = true
    setConfirmingMismatch(true)
    try {
      await submit(true)
    } finally {
      submittingRef.current = false
      setConfirmingMismatch(false)
    }
  }

  const duplicateIds = findDuplicateWorkerIds(
    workers.map((w) => ({ id: w.id, nome: w.nome, dataNascimento: w.dataNascimento ? parseCivilDate(w.dataNascimento) : null }))
  )
  const quantityDiverges = numFuncionariosContratado !== null && numFuncionariosContratado !== workers.length

  // Durante a confirmação de divergência, a declaração precisa corresponder
  // exatamente ao estado que gerou o aviso — nenhuma edição é permitida até
  // o cliente confirmar ou voltar a editar (o que sai de mismatch_confirm e
  // exige um novo clique em Enviar, refazendo o flush normal).
  const locked = submitState === 'mismatch_confirm'

  if (loadState === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    )
  }

  if (loadState === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="card p-8 text-center max-w-sm">
          <AlertCircle className="mx-auto mb-4 text-red-500" size={32} />
          <p className="text-[14px] text-gray-600 mb-4">Não foi possível carregar seus dados. Tente novamente.</p>
          <button onClick={load} className="btn btn-primary">Tentar novamente</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-[720px] mx-auto px-6 h-[72px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo-mark.png" alt="Sublime SST" width={36} height={36} />
            <span className="font-display text-[15px] text-gray-900">Onboarding</span>
          </Link>
          <Link href="/cliente/dashboard" className="text-[13px] text-gray-500 hover:text-gray-800 flex items-center gap-1">
            <ArrowLeft size={13} /> Voltar
          </Link>
        </div>
      </header>

      <main className="max-w-[720px] mx-auto px-6 py-10">
        {status === 'enviado' ? (
          <>
            <div className="card p-8 text-center mb-8">
              <CheckCircle2 className="mx-auto mb-4 text-teal" size={40} />
              <h1 className="font-display text-xl text-gray-900 mb-2">Informações já enviadas</h1>
              <p className="text-[14px] text-gray-500">
                {submittedAt ? `Enviadas em ${formatDateTimeBR(submittedAt)}. ` : ''}
                Essas informações não podem mais ser alteradas por aqui. Para correções, entre em contato com a equipe.
              </p>
            </div>

            <div className="card p-6 mb-6">
              <h2 className="font-display text-[16px] text-gray-900 mb-4">Dados gerais declarados</h2>
              <ReadOnlyField label="Cargos / funções existentes" value={general.cargos} />
              <ReadOnlyField label="Horário de trabalho predominante" value={general.turnoTrabalho} />
              <ReadOnlyField label="Data do último PCMSO" value={general.dataUltimoPcmso} />
              <ReadOnlyField label="Já possui PGR elaborado?" value={general.possuiPgr === null ? null : general.possuiPgr ? 'Sim' : 'Não'} />
              <ReadOnlyField label="Observações" value={general.observacoes} />
            </div>

            <h2 className="font-display text-[16px] text-gray-900 mb-4">
              Trabalhadores declarados {numFuncionariosDeclarado !== null && `(${numFuncionariosDeclarado})`}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workers.map((w, i) => <WorkerCardReadOnly key={w.id} worker={w} index={i} />)}
            </div>
          </>
        ) : (
          <>
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <h1 className="font-display text-2xl text-gray-900 mb-2">Dados para elaboração dos documentos</h1>
                <p className="text-[14px] text-gray-500">
                  Preencha as informações abaixo para que nossa equipe possa elaborar o PGR e PCMSO da sua empresa.
                  Seu progresso é salvo automaticamente — você pode sair e continuar depois.
                </p>
              </div>
              <SaveIndicator state={generalSaveState} />
            </div>

            <div className="card p-6 mb-5">
              <h2 className="font-display text-[16px] text-gray-900 mb-5">Dados gerais</h2>

              <label className="block mb-4">
                <span className="text-[13px] font-medium text-gray-700 block mb-1.5">Cargos / funções existentes</span>
                <textarea
                  value={general.cargos ?? ''}
                  onChange={(e) => updateGeneral('cargos', e.target.value)}
                  onBlur={() => saveGeneral({ cargos: general.cargos })}
                  rows={3}
                  className={`${inputClass} resize-none`}
                  placeholder="Ex: Gerente administrativo, Analista financeiro, Assistente"
                  disabled={locked}
                />
              </label>

              <label className="block mb-4">
                <span className="text-[13px] font-medium text-gray-700 block mb-1.5">Horário de trabalho predominante</span>
                <select
                  value={general.turnoTrabalho ?? ''}
                  onChange={(e) => { updateGeneral('turnoTrabalho', e.target.value || null); saveGeneral({ turnoTrabalho: e.target.value || null }) }}
                  className={`${inputClass} bg-white`}
                  disabled={locked}
                >
                  <option value="">Selecione…</option>
                  <option value="comercial">Horário comercial (08h–18h)</option>
                  <option value="flexivel">Horário flexível / home office</option>
                  <option value="turnos">Turnos (informar em observações)</option>
                  <option value="outro">Outro</option>
                </select>
              </label>

              <label className="block mb-4">
                <span className="text-[13px] font-medium text-gray-700 block mb-1.5">Data do último PCMSO / exames (se houver)</span>
                <input
                  type="text"
                  value={general.dataUltimoPcmso ?? ''}
                  onChange={(e) => updateGeneral('dataUltimoPcmso', e.target.value)}
                  onBlur={() => saveGeneral({ dataUltimoPcmso: general.dataUltimoPcmso })}
                  className={inputClass}
                  placeholder="Ex: 2024 ou 'Nunca fizemos'"
                  disabled={locked}
                />
              </label>

              <label className="block">
                <span className="text-[13px] font-medium text-gray-700 block mb-1.5">
                  A empresa já possui PGR elaborado anteriormente? <span className="text-red-500">*</span>
                </span>
                <select
                  value={general.possuiPgr === null ? '' : general.possuiPgr ? 'sim' : 'nao'}
                  onChange={(e) => {
                    const value = e.target.value === '' ? null : e.target.value === 'sim'
                    updateGeneral('possuiPgr', value)
                    saveGeneral({ possuiPgr: value })
                  }}
                  className={`${inputClass} bg-white`}
                  disabled={locked}
                >
                  <option value="">Selecione…</option>
                  <option value="sim">Sim</option>
                  <option value="nao">Não</option>
                </select>
              </label>
            </div>

            <div className="card p-6 mb-5">
              <h2 className="font-display text-[16px] text-gray-900 mb-3">Observações adicionais</h2>
              <textarea
                value={general.observacoes ?? ''}
                onChange={(e) => updateGeneral('observacoes', e.target.value)}
                onBlur={() => saveGeneral({ observacoes: general.observacoes })}
                rows={4}
                className={`${inputClass} resize-none`}
                placeholder="Ex: Temos 2 funcionários que trabalham externamente com visitas a clientes…"
                disabled={locked}
              />
            </div>

            <div className="mb-3 flex items-center justify-between flex-wrap gap-2">
              <h2 className="font-display text-[16px] text-gray-900">Trabalhadores</h2>
              <p className="text-[12px] text-gray-500">
                Contratado: <strong>{numFuncionariosContratado ?? '—'}</strong> · Cadastrado: <strong>{workers.length}</strong> / {MAX_WORKERS}
              </p>
            </div>

            {quantityDiverges && (
              <p className="text-[12px] text-amber-600 mb-4 flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-[10px] p-3">
                <AlertTriangle size={14} className="shrink-0" />
                A quantidade cadastrada é diferente da contratada. Você poderá confirmar isso ao enviar.
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {workers.map((w, i) => (
                <WorkerCard
                  key={w.id}
                  worker={w}
                  index={i}
                  isDuplicate={duplicateIds.has(w.id)}
                  saving={savingWorkerIds.has(w.id)}
                  removing={removingWorkerIds.has(w.id)}
                  locked={locked}
                  onChange={updateWorkerLocal}
                  onBlurSave={saveWorker}
                  onRemove={removeWorker}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={addWorker}
              disabled={addingWorker || workers.length >= MAX_WORKERS || locked}
              className="btn btn-outline-dark w-full justify-center mb-8 flex items-center gap-1.5"
            >
              {addingWorker ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              Adicionar trabalhador
            </button>

            {submitState === 'error' && submitError && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-[10px] p-4 text-[13px] text-red-700 mb-4">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                {submitError}
              </div>
            )}

            {submitState === 'mismatch_confirm' && mismatchInfo && (
              <div className="bg-amber-50 border border-amber-200 rounded-[10px] p-4 mb-4">
                <p className="text-[13px] text-amber-800 mb-3">
                  Você contratou <strong>{mismatchInfo.contratado}</strong> trabalhador(es), mas cadastrou{' '}
                  <strong>{mismatchInfo.declarado}</strong>. Confirma o envio mesmo assim?
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={handleConfirmMismatch} disabled={confirmingMismatch} className="btn btn-primary text-[13px]">
                    {confirmingMismatch ? <><Loader2 size={14} className="animate-spin" /> Enviando…</> : 'Confirmar e enviar'}
                  </button>
                  {/* Sai de mismatch_confirm → destrava a edição (locked volta a false).
                      Qualquer alteração feita depois exige um novo clique em "Enviar
                      dados para a equipe", que refaz o flush normal do zero. */}
                  <button type="button" onClick={() => setSubmitState('idle')} disabled={confirmingMismatch} className="btn btn-outline-dark text-[13px]">Voltar e editar</button>
                </div>
              </div>
            )}

            {submitState === 'done' ? (
              <div className="card p-8 text-center">
                <CheckCircle2 className="mx-auto mb-4 text-teal" size={40} />
                <h2 className="font-display text-xl text-gray-900 mb-2">Dados enviados!</h2>
                <p className="text-[14px] text-gray-500">
                  Nossa equipe vai analisar as informações e iniciar a elaboração dos documentos.
                </p>
                <p className="text-[12px] text-gray-400 mt-4">Redirecionando para o painel…</p>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSubmitClick}
                disabled={submitState === 'submitting' || submitState === 'mismatch_confirm'}
                className="btn btn-primary w-full justify-center"
              >
                {submitState === 'submitting'
                  ? <><Loader2 size={16} className="animate-spin" /> Enviando…</>
                  : 'Enviar dados para a equipe'}
              </button>
            )}
          </>
        )}
      </main>
    </div>
  )
}

function ReadOnlyField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="mb-3">
      <span className="text-gray-400 block text-[11px] uppercase tracking-wide">{label}</span>
      <span className="text-[13px] text-gray-700 whitespace-pre-wrap break-words">{value?.trim() ? value : 'Não informado'}</span>
    </div>
  )
}

function SaveIndicator({ state }: { state: 'idle' | 'saving' | 'saved' | 'error' }) {
  if (state === 'saving') return <span className="text-[11px] text-gray-400 flex items-center gap-1 shrink-0"><Loader2 size={11} className="animate-spin" /> Salvando…</span>
  if (state === 'saved') return <span className="text-[11px] text-teal shrink-0">Rascunho salvo</span>
  if (state === 'error') return <span className="text-[11px] text-red-500 shrink-0">Erro ao salvar</span>
  return null
}
