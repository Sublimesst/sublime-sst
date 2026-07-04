'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Image from 'next/image'

function LoginForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const error = searchParams.get('error')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.includes('@')) { setErr('Informe um e-mail válido.'); return }
    setLoading(true); setErr('')
    try {
      await fetch('/api/partner/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setSubmitted(true)
    } catch { setErr('Erro de rede. Tente novamente.') }
    finally { setLoading(false) }
  }

  if (submitted) {
    return (
      <div className="text-center">
        <div className="text-4xl mb-4">📧</div>
        <h2 className="font-display text-xl text-gray-900 mb-2">Link enviado!</h2>
        <p className="text-[14px] text-gray-500">
          Verifique seu e-mail e clique no link de acesso.<br />
          O link expira em 15 minutos.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col items-center mb-6">
        <div className="w-14 h-14 rounded-xl overflow-hidden relative mb-3">
          <Image src="/logo.jpeg" alt="Sublime SST" fill sizes="56px" className="object-cover"
            style={{ transform: 'scale(2.2)', transformOrigin: '50% 33%' }} />
        </div>
        <h1 className="font-display text-2xl text-gray-900">Portal do Parceiro</h1>
        <p className="text-[13px] text-gray-500 mt-1">Sublime SST — Acesso restrito</p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-[8px] text-[13px] text-red-700">
          {error === 'token_invalid' ? 'Link inválido ou expirado. Solicite um novo.' : 'Erro ao autenticar. Tente novamente.'}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="form-label required">E-mail cadastrado como parceiro</label>
          <input
            type="email"
            className="form-input"
            placeholder="seu@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoFocus
          />
          {err && <p className="text-[12px] text-red-500 mt-1">{err}</p>}
        </div>
        <button type="submit" className="btn btn-primary w-full" disabled={loading}>
          {loading ? 'Enviando…' : 'Receber link de acesso'}
        </button>
      </form>

      <p className="text-[12px] text-gray-400 text-center mt-4">
        Não é parceiro ainda?{' '}
        <a href="/parceiros" className="text-teal hover:text-petrol">Saiba como se cadastrar</a>
      </p>
    </>
  )
}

export default function PartnerLoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="bg-white rounded-brand-lg border border-gray-200 p-10 w-full max-w-sm shadow-brand">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
