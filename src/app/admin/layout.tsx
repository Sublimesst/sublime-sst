'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, Building2, LayoutDashboard, Settings, LogOut, ChevronRight, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/leads', label: 'Leads', icon: Users },
  { href: '/admin/empresas', label: 'Empresas', icon: Building2 },
  { href: '/admin/partners', label: 'Parceiros', icon: Building2 },
  { href: '/admin/cnae', label: 'CNAEs', icon: Layers },
]

function AdminGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false)
  const [step, setStep] = useState<'password' | 'otp'>('password')
  const [pw, setPw] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSentTo, setOtpSentTo] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setAuthed(sessionStorage.getItem('admin_authed') === '1')
  }, [])

  if (authed) return <>{children}</>

  const requestOtp = async () => {
    if (pw.length < 6) { setErr('Senha inválida.'); return }
    setLoading(true); setErr('')
    try {
      const res = await fetch('/api/admin/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: pw }),
      })
      const data = await res.json()
      if (data.success) {
        setOtpSentTo(data.sentTo)
        setStep('otp')
      } else {
        setErr(data.error ?? 'Credencial inválida.')
      }
    } catch { setErr('Erro de rede.') }
    finally { setLoading(false) }
  }

  const verifyOtp = async () => {
    if (otp.length !== 6) { setErr('Digite o código de 6 dígitos.'); return }
    setLoading(true); setErr('')
    try {
      const res = await fetch('/api/admin/otp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp }),
      })
      const data = await res.json()
      if (data.success) {
        sessionStorage.setItem('admin_authed', '1')
        sessionStorage.setItem('admin_secret', pw)
        setAuthed(true)
      } else {
        setErr(data.error ?? 'Código incorreto.')
      }
    } catch { setErr('Erro de rede.') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="bg-white rounded-[20px] border border-gray-200 p-10 w-full max-w-sm text-center"
        style={{ boxShadow: '0 4px 16px rgba(0,0,0,.08)' }}>
        <div className="w-12 h-12 bg-petrol rounded-[12px] flex items-center justify-center mx-auto mb-4">
          <Settings size={22} className="text-white" />
        </div>
        <h1 className="font-display text-2xl text-gray-900 mb-1">Admin</h1>
        <p className="text-[13px] text-gray-500 mb-6">
          {step === 'password' ? 'Sublime SST — Área restrita' : `Código enviado para ${otpSentTo}`}
        </p>

        {step === 'password' ? (
          <>
            <input
              type="password"
              className="form-input mb-3 text-center"
              placeholder="Senha de acesso"
              value={pw}
              onChange={e => setPw(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && requestOtp()}
            />
            {err && <p className="text-[12px] text-red-500 mb-3">{err}</p>}
            <button className="btn btn-petrol w-full" onClick={requestOtp} disabled={loading}>
              {loading ? 'Verificando…' : 'Continuar →'}
            </button>
          </>
        ) : (
          <>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              className="form-input mb-3 text-center tracking-widest text-lg font-mono"
              placeholder="000000"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => e.key === 'Enter' && verifyOtp()}
              autoFocus
            />
            {err && <p className="text-[12px] text-red-500 mb-3">{err}</p>}
            <button className="btn btn-petrol w-full mb-2" onClick={verifyOtp} disabled={loading}>
              {loading ? 'Verificando…' : 'Entrar'}
            </button>
            <button className="text-[12px] text-gray-400 hover:text-gray-600" onClick={() => { setStep('password'); setOtp(''); setErr('') }}>
              ← Voltar
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <AdminGate>
      <div className="min-h-screen flex bg-gray-50">
        {/* Sidebar */}
        <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
          <div className="p-5 border-b border-gray-200">
            <div className="text-[14px] font-bold text-petrol">SUBLIME SST</div>
            <div className="text-[11px] text-gray-400 uppercase tracking-wider">Admin</div>
          </div>
          <nav className="flex-1 p-3 space-y-1">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2.5 rounded-[8px] text-[13px] font-medium transition-colors',
                  pathname === href ? 'bg-teal-pale text-teal' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}>
                <Icon size={16} />
                {label}
                {pathname === href && <ChevronRight size={14} className="ml-auto opacity-50" />}
              </Link>
            ))}
          </nav>
          <div className="p-3 border-t border-gray-200">
            <button className="flex items-center gap-2 px-3 py-2 text-[13px] text-gray-500 hover:text-gray-900 w-full rounded-[8px] hover:bg-gray-100"
              onClick={() => { sessionStorage.clear(); window.location.reload() }}>
              <LogOut size={15} /> Sair
            </button>
            <Link href="/" className="flex items-center gap-2 px-3 py-2 text-[13px] text-gray-500 hover:text-gray-900 rounded-[8px] hover:bg-gray-100 mt-1">
              ← Voltar ao site
            </Link>
          </div>
        </aside>
        {/* Content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </AdminGate>
  )
}
