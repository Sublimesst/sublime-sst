'use client'

import { useState } from 'react'
import { ArrowRight, MessageCircle } from 'lucide-react'

type FormData = {
  name: string; company: string; email: string; whatsapp: string; description: string
}
type Status = 'idle' | 'loading' | 'success' | 'error'

export function ConsultoriaForm() {
  const [form, setForm] = useState<FormData>({ name: '', company: '', email: '', whatsapp: '', description: '' })
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/consultoria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? 'Erro ao enviar')
      }
      setStatus('success')
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao enviar. Tente novamente.')
    }
  }

  if (status === 'success') {
    return (
      <div className="card p-10 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5 text-3xl">✅</div>
        <h3 className="font-display text-2xl text-gray-900 mb-3">Solicitação recebida!</h3>
        <p className="text-[15px] text-gray-500 leading-relaxed mb-6">
          Nossa equipe analisará sua necessidade e entrará em contato em breve por e-mail ou WhatsApp.
        </p>
        <a href="https://wa.me/5521997248630" target="_blank" rel="noopener noreferrer" className="btn btn-primary">
          <MessageCircle size={16} /> Falar no WhatsApp também
        </a>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="card p-8 flex flex-col gap-5">
      <div className="grid sm:grid-cols-2 gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-semibold text-gray-700">Nome *</label>
          <input type="text" name="name" value={form.name} onChange={handleChange} required placeholder="Seu nome completo" className="input" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-semibold text-gray-700">Empresa *</label>
          <input type="text" name="company" value={form.company} onChange={handleChange} required placeholder="Nome da empresa" className="input" />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-semibold text-gray-700">E-mail *</label>
          <input type="email" name="email" value={form.email} onChange={handleChange} required placeholder="seu@email.com" className="input" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-semibold text-gray-700">WhatsApp *</label>
          <input type="tel" name="whatsapp" value={form.whatsapp} onChange={handleChange} required placeholder="(21) 99999-9999" className="input" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-semibold text-gray-700">Descreva sua necessidade *</label>
        <textarea name="description" value={form.description} onChange={handleChange} required rows={4}
          placeholder="Ex: Preciso de PGR e PCMSO para uma empresa com 15 funcionários no setor de construção civil..."
          className="input resize-none" />
      </div>
      {status === 'error' && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">{errorMsg}</div>
      )}
      <button type="submit" disabled={status === 'loading'} className="btn btn-primary btn-lg self-start">
        {status === 'loading' ? 'Enviando…' : <> Enviar Solicitação <ArrowRight size={16} /></>}
      </button>
      <p className="text-[12px] text-gray-400">
        Seus dados são tratados com confidencialidade e não serão compartilhados com terceiros.
      </p>
    </form>
  )
}
