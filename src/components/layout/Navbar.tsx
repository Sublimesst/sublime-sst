'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { href: '/', label: 'Início' },
  { href: '/digital', label: 'Sublime Digital' },
  { href: '/parceiros', label: 'Parceiros' },
]

export function Navbar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
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
      <div className="max-w-[1120px] mx-auto px-6 h-[68px] flex items-center justify-between gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <Image
            src="/logo.jpeg"
            alt="Sublime SST"
            width={38}
            height={38}
            className="rounded-lg object-cover"
            priority
          />
          <div className="leading-tight">
            <span className="block text-[15px] font-bold text-petrol tracking-tight">SUBLIME</span>
            <span className="block text-[10px] font-medium text-gray-500 tracking-[.06em] uppercase">
              Seg. e Saúde Ocupacional
            </span>
          </div>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
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
          <Link
            href="/elegibilidade"
            className="ml-2 btn btn-petrol btn-sm"
          >
            Regularizar Minha Empresa
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
          onClick={() => setOpen(!open)}
          aria-label="Abrir menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-gray-200 bg-white px-6 py-4 flex flex-col gap-1">
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
