'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Menu, X, LogIn, ChevronDown, FolderOpen, Handshake } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { href: '/consultoria-sst', label: 'Consultoria SST' },
  { href: '/digital', label: 'Sublime Digital' },
  { href: '/parceiros', label: 'Parceiros' },
  { href: '/sobre', label: 'Sobre' },
]

const LOGIN_LINKS = [
  { href: '/cliente/login', label: 'Portal do Cliente', desc: 'Documentos e acompanhamento', icon: FolderOpen },
  { href: '/parceiro/login', label: 'Portal do Parceiro', desc: 'Indicações e comissões', icon: Handshake },
]

export function Navbar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <nav
      className={cn(
        'sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 transition-shadow duration-200',
        scrolled && 'shadow-brand-sm'
      )}
    >
      <div className="max-w-[1120px] mx-auto px-6 h-[88px] flex items-center justify-between gap-6">
        {/* Logo — recorte CSS do símbolo (o jpeg é o lockup completo com muito respiro interno) */}
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <div className="w-[52px] h-[52px] rounded-xl overflow-hidden relative shrink-0">
            <Image
              src="/logo.jpeg"
              alt="Sublime SST"
              fill
              sizes="52px"
              className="object-cover"
              style={{ transform: 'scale(2.2)', transformOrigin: '50% 33%' }}
              priority
            />
          </div>
          <div className="leading-tight">
            <span className="block text-[18px] font-bold text-petrol tracking-tight">SUBLIME</span>
            <span className="block text-[10px] font-medium text-gray-500 tracking-[.06em] uppercase">
              Segurança e Saúde Ocupacional
            </span>
          </div>
        </Link>

        {/* Desktop links */}
        <div className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'text-[14px] font-medium px-3.5 py-2 rounded-md transition-colors duration-150',
                pathname === link.href
                  ? 'text-teal bg-teal-pale'
                  : 'text-gray-600 hover:text-petrol hover:bg-gray-100'
              )}
            >
              {link.label}
            </Link>
          ))}
          {/* Entrar (dropdown) */}
          <div className="relative">
            <button
              onClick={() => setLoginOpen(v => !v)}
              onBlur={() => setTimeout(() => setLoginOpen(false), 150)}
              className={cn(
                'flex items-center gap-1.5 text-[14px] font-medium px-3.5 py-2 rounded-md transition-colors duration-150',
                loginOpen ? 'text-petrol bg-gray-100' : 'text-gray-600 hover:text-petrol hover:bg-gray-100'
              )}
            >
              <LogIn size={15} /> Entrar <ChevronDown size={13} className={cn('transition-transform', loginOpen && 'rotate-180')} />
            </button>
            {loginOpen && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-brand shadow-brand overflow-hidden">
                {LOGIN_LINKS.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                  >
                    <l.icon size={16} className="text-teal shrink-0 mt-0.5" />
                    <span>
                      <span className="block text-[13px] font-semibold text-gray-800">{l.label}</span>
                      <span className="block text-[11px] text-gray-400">{l.desc}</span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <Link
            href="/elegibilidade"
            className="ml-2 btn btn-petrol btn-sm"
          >
            Regularizar Empresa
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
          onClick={() => setOpen(!open)}
          aria-label="Abrir menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden border-t border-gray-200 bg-white px-6 py-4 flex flex-col gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={cn(
                'text-[15px] font-medium px-3 py-2.5 rounded-md transition-colors',
                pathname === link.href ? 'text-teal bg-teal-pale' : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              {link.label}
            </Link>
          ))}
          <div className="border-t border-gray-100 mt-2 pt-2">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-3 pt-1 pb-2">Acesso</p>
            {LOGIN_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 text-[15px] font-medium px-3 py-2.5 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <l.icon size={16} className="text-teal" /> {l.label}
              </Link>
            ))}
          </div>
          <Link
            href="/elegibilidade"
            onClick={() => setOpen(false)}
            className="mt-2 btn btn-petrol text-center"
          >
            Regularizar Minha Empresa
          </Link>
        </div>
      )}
    </nav>
  )
}
