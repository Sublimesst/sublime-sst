'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, Building2, LayoutDashboard, Settings, LogOut, ChevronRight, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/leads', label: 'Leads', icon: Users },
  { href: '/admin/partners', label: 'Parceiros', icon: Building2 },
  { href: '/admin/cnae', label: 'CNAEs', icon: Layers },
]

function AdminGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    setAuthed(sessionStorage.getItem('admin_authed') === '1')
  }, [])

  if (authed) return <>{children}</>

  const login = () => {
    // Simple secret check — server validates on each API call
    if (pw.length >= 6) {
      sessionStorage.setItem('admin_authed', '1')
      sessionStorage.setItem('admin_secret', pw)
      setAuthed(true)
    } else {
      setErr('Senha inválida.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="bg-white rounded-[20px] border border-gray-200 p-10 w-full max-w-sm text-center"
        style={{ boxShadow: '0 4px 16px rgba(0,0,0,.08)' }}>
        <div className="w-12 h-12 bg-petrol rounded-[12px] flex items-center justify-center mx-auto mb-4">
          <Settings size={22} className="text-white" />
        </div>
        <h1 className="font-display text-2xl text-gray-900 mb-1">Admin</h1>
        <p className="text-[13px] text-gray-500 mb-6">Sublime SST — Área restrita</p>
        <input
          type="password"
          className="form-input mb-3 text-center"
          placeholder="Senha de acesso"
          value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && login()}
        />
        {err && <p className="text-[12px] text-red-500 mb-3">{err}</p>}
        <button className="btn btn-petrol w-full" onClick={login}>Entrar</button>
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
