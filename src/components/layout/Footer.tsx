import Link from 'next/link'

const PRODUCT_LINKS = [
  { href: '/digital', label: 'Sublime Digital' },
  { href: '/elegibilidade', label: 'Teste de Elegibilidade' },
  { href: '/#planos', label: 'Planos e Preços' },
]
const COMPANY_LINKS = [
  { href: '/parceiros', label: 'Parceiros Contadores' },
  { href: '/integrations', label: 'Integrações' },
  { href: 'mailto:contato@sublimesst.com', label: 'Contato' },
]
const LEGAL_LINKS = [
  { href: '/privacidade', label: 'Política de Privacidade' },
  { href: '/termos', label: 'Termos de Uso' },
]

export function Footer() {
  return (
    <footer className="bg-[#0d1a22] pt-12 pb-8">
      <div className="max-w-[1120px] mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-[18px] font-bold text-teal-light tracking-tight">SUBLIME</div>
              <div className="text-[11px] text-white/40 border-l border-white/15 pl-3 uppercase tracking-widest">
                SST
              </div>
            </div>
            <p className="text-[13px] text-white/40 leading-relaxed max-w-xs">
              Conformidade em SST de forma simples, segura e digital para pequenas empresas brasileiras.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <a
                href="mailto:contato@sublimesst.com"
                className="text-[13px] text-white/50 hover:text-teal-light transition-colors"
              >
                ✉️ contato@sublimesst.com
              </a>
              <a
                href="https://wa.me/5521997248630"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] text-white/50 hover:text-teal-light transition-colors"
              >
                📱 (21) 99724-8630
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h5 className="text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-4">
              Produto
            </h5>
            <ul className="flex flex-col gap-2.5">
              {PRODUCT_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-[14px] text-white/55 hover:text-teal-light transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company + Legal */}
          <div>
            <h5 className="text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-4">
              Empresa
            </h5>
            <ul className="flex flex-col gap-2.5">
              {COMPANY_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-[14px] text-white/55 hover:text-teal-light transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <h5 className="text-[11px] font-semibold text-white/40 uppercase tracking-widest mt-6 mb-4">
              Legal
            </h5>
            <ul className="flex flex-col gap-2.5">
              {LEGAL_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-[14px] text-white/55 hover:text-teal-light transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/[0.07] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[12px] text-white/25">
            © {new Date().getFullYear()} Sublime SST — Segurança e Saúde Ocupacional. Todos os direitos reservados.
          </p>
          <div className="flex gap-4">
            {LEGAL_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="text-[12px] text-white/25 hover:text-white/60 transition-colors">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
