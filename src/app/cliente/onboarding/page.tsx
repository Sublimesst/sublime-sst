'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

type FormState = {
  numFuncionarios: string
  cargos: string
  turnoTrabalho: string
  dataUltimoPcmso: string
  possuiPgr: boolean
  observacoes: string
}

export default function OnboardingPage() {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>({
    numFuncionarios: '',
    cargos: '',
    turnoTrabalho: '',
    dataUltimoPcmso: '',
    possuiPgr: false,
    observacoes: '',
  })

  function update(field: keyof FormState, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState('loading')
    setError(null)

    try {
      const res = await fetch('/api/cliente/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          numFuncionarios: Number(form.numFuncionarios),
        }),
      })
      if (res.ok) {
        setState('done')
        setTimeout(() => router.push('/cliente/dashboard'), 2500)
      } else {
        const body = await res.json().catch(() => ({}))
        setState('error')
        setError(body.error ?? 'Erro ao salvar dados. Tente novamente.')
      }
    } catch {
      setState('error')
      setError('Erro de conexão. Verifique sua internet e tente novamente.')
    }
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
        <div className="mb-8">
          <h1 className="font-display text-2xl text-gray-900 mb-2">Dados para elaboração dos documentos</h1>
          <p className="text-[14px] text-gray-500">
            Preencha as informações abaixo para que nossa equipe possa elaborar o PGR e PCMSO da sua empresa.
            Quanto mais detalhado, melhor.
          </p>
        </div>

        {state === 'done' ? (
          <div className="card p-8 text-center">
            <CheckCircle2 className="mx-auto mb-4 text-teal" size={40} />
            <h2 className="font-display text-xl text-gray-900 mb-2">Dados recebidos!</h2>
            <p className="text-[14px] text-gray-500">
              Nossa equipe vai analisar as informações e iniciar a elaboração dos documentos.
              Você será notificado por e-mail quando estiverem prontos.
            </p>
            <p className="text-[12px] text-gray-400 mt-4">Redirecionando para o painel…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {error && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-[10px] p-4 text-[13px] text-red-700">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <div className="card p-6">
              <h2 className="font-display text-[16px] text-gray-900 mb-5">Informações dos funcionários</h2>

              <label className="block mb-4">
                <span className="text-[13px] font-medium text-gray-700 block mb-1.5">
                  Número atual de funcionários CLT <span className="text-red-500">*</span>
                </span>
                <input
                  type="number"
                  required
                  min={1}
                  max={20}
                  value={form.numFuncionarios}
                  onChange={(e) => update('numFuncionarios', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-[10px] text-[14px] focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal"
                  placeholder="Ex: 5"
                />
              </label>

              <label className="block mb-4">
                <span className="text-[13px] font-medium text-gray-700 block mb-1.5">
                  Cargos / funções existentes
                </span>
                <textarea
                  value={form.cargos}
                  onChange={(e) => update('cargos', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-[10px] text-[14px] focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal resize-none"
                  placeholder="Ex: Gerente administrativo, Analista financeiro, Assistente"
                />
              </label>

              <label className="block">
                <span className="text-[13px] font-medium text-gray-700 block mb-1.5">
                  Horário de trabalho predominante
                </span>
                <select
                  value={form.turnoTrabalho}
                  onChange={(e) => update('turnoTrabalho', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-[10px] text-[14px] focus:outline-none focus:border-teal bg-white"
                >
                  <option value="">Selecione…</option>
                  <option value="comercial">Horário comercial (08h–18h)</option>
                  <option value="flexivel">Horário flexível / home office</option>
                  <option value="turnos">Turnos (informar em observações)</option>
                  <option value="outro">Outro</option>
                </select>
              </label>
            </div>

            <div className="card p-6">
              <h2 className="font-display text-[16px] text-gray-900 mb-5">Histórico de SST</h2>

              <label className="block mb-4">
                <span className="text-[13px] font-medium text-gray-700 block mb-1.5">
                  Data do último PCMSO / exames (se houver)
                </span>
                <input
                  type="text"
                  value={form.dataUltimoPcmso}
                  onChange={(e) => update('dataUltimoPcmso', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-[10px] text-[14px] focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal"
                  placeholder="Ex: 2024 ou 'Nunca fizemos'"
                />
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.possuiPgr}
                  onChange={(e) => update('possuiPgr', e.target.checked)}
                  className="w-4 h-4 accent-teal"
                />
                <span className="text-[13px] text-gray-700">A empresa já possui PGR elaborado anteriormente</span>
              </label>
            </div>

            <div className="card p-6">
              <h2 className="font-display text-[16px] text-gray-900 mb-3">Observações adicionais</h2>
              <p className="text-[12px] text-gray-500 mb-4">
                Descreva aqui qualquer informação relevante sobre o ambiente de trabalho, riscos específicos,
                situações em curso ou dúvidas que queira que a equipe considere.
              </p>
              <textarea
                value={form.observacoes}
                onChange={(e) => update('observacoes', e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-200 rounded-[10px] text-[14px] focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal resize-none"
                placeholder="Ex: Temos 2 funcionários que trabalham externamente com visitas a clientes…"
              />
            </div>

            <button
              type="submit"
              disabled={state === 'loading'}
              className="btn btn-primary w-full justify-center"
            >
              {state === 'loading'
                ? <><Loader2 size={16} className="animate-spin" /> Salvando…</>
                : 'Enviar dados para a equipe'
              }
            </button>
          </form>
        )}
      </main>
    </div>
  )
}
