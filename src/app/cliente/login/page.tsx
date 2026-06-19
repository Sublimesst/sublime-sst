'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { ArrowLeft, Mail, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

function LoginForm() {
  const params = useSearchParams()
  const errorParam = params.get('error')

  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (errorParam === 'token_invalid') {
      setError('O link de acesso expirou ou já foi utilizado. Solicite um novo abaixo.')
    } else if (errorParam === 'token_missing') {
      setError('Link de acesso inválido. Solicite um novo abaixo.')
    }
  }, [errorParam])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState('loading')
    setError(null)

    try {
      const res = await fetch('/api/cliente/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setState('sent')
      } else {
        setState('error')
        setError('Erro ao enviar o e-mail. Tente novamente.')
      }
    } catch {
      setState('error')
      setError('Erro de conexão. Verifique sua internet e tente novamente.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-gray-50">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center justify-center mb-6">
            <Image src="/logo.jpeg" alt="Sublime SST" width={56} height={56} className="rounded-xl" />
          </Link>
          <h1 className="font-display text-2xl text-gray-900 mb-2">Portal do Cliente</h1>
          <p className="text-[14px] text-gray-500">
            Digite o e-mail da sua conta para receber o link de acesso.
          </p>
        </div>

        {state === 'sent' ? (
          <div className="card p-8 text-center">
            <CheckCircle2 className="mx-auto mb-4 text-teal" size={40} />
            <h2 className="font-display text-xl text-gray-900 mb-2">Link enviado!</h2>
            <p className="text-[14px] text-gray-500 mb-6">
              Se o e-mail <strong>{email}</strong> estiver cadastrado, você receberá um link de acesso em instantes.
              Verifique também a pasta de spam.
            </p>
            <p className="text-[12px] text-gray-400">O link expira em 15 minutos.</p>
            <button
              onClick={() => { setState('idle'); setEmail('') }}
              className="mt-5 text-[13px] text-teal hover:text-petrol underline"
            >
              Usar outro e-mail
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card p-7">
            {error && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-[10px] p-4 mb-5 text-[13px] text-red-700">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                {error}
              </div>
            )}
            <label className="block mb-5">
              <span className="text-[13px] font-medium text-gray-700 block mb-1.5">E-mail da conta</span>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="seu@email.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-[10px] text-[14px] focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal"
                />
              </div>
            </label>
            <button
              type="submit"
              disabled={state === 'loading'}
              className="btn btn-primary w-full justify-center"
            >
              {state === 'loading'
                ? <><Loader2 size={16} className="animate-spin" /> Enviando…</>
                : 'Enviar link de acesso'
              }
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link href="/" className="text-[13px] text-gray-500 hover:text-teal inline-flex items-center gap-1">
            <ArrowLeft size={13} /> Voltar ao site
          </Link>
        </div>

        <p className="mt-4 text-center text-[12px] text-gray-400">
          Ainda não é cliente?{' '}
          <Link href="/elegibilidade" className="text-teal hover:text-petrol underline">
            Verificar elegibilidade
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function ClienteLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
