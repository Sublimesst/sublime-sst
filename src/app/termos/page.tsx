import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import type { Metadata } from 'next'
import { getCurrentContractContent } from '@/lib/contract/content'

export const metadata: Metadata = {
  title: 'Contrato de Prestação de Serviços — Sublime Digital',
  description: 'Termos e condições do contrato de prestação de serviços do produto Sublime Digital.',
  alternates: { canonical: 'https://sublimesst.com/termos' },
}

export default function TermosPage() {
  const { version, clausulas } = getCurrentContractContent()

  return (
    <>
      <Navbar />
      <main className="py-16 px-6">
        <div className="max-w-[760px] mx-auto">
          <h1 className="font-display text-4xl text-gray-900 mb-2">Contrato de Prestação de Serviços</h1>
          <p className="text-[13px] text-gray-500 pb-6 mb-6 border-b border-gray-200">
            Versão {version} · Sublime Digital (Essencial e Premium)
          </p>

          <div className="space-y-8">
            {clausulas.map(({ numero, titulo, blocos }) => (
              <div key={numero}>
                <h2 className="text-[1rem] font-bold text-gray-900 mb-3">Cláusula {numero}ª — {titulo}</h2>
                {blocos.map((bloco, i) =>
                  bloco.type === 'paragrafo' ? (
                    <p key={i} className="text-[14px] text-gray-600 leading-relaxed mb-2">{bloco.texto}</p>
                  ) : (
                    <div key={i} className="mb-2">
                      {bloco.titulo && (
                        <p className="text-[14px] text-gray-600 leading-relaxed mb-1">{bloco.titulo}</p>
                      )}
                      <ul className="list-disc pl-5 space-y-1">
                        {bloco.itens.map((item, j) => (
                          <li key={j} className="text-[14px] text-gray-600 leading-relaxed">{item}</li>
                        ))}
                      </ul>
                    </div>
                  )
                )}
              </div>
            ))}
          </div>

          <div className="mt-12 pt-6 border-t border-gray-200 space-y-1">
            <p className="text-[13px] text-gray-500 font-semibold">SUBLIME SEGURANCA E SAUDE OCUPACIONAL LTDA</p>
            <p className="text-[13px] text-gray-400">CNPJ 65.051.167/0001-27 · Av. Ataulfo de Paiva, 1235, Sala 303 — Leblon, Rio de Janeiro/RJ</p>
            <p className="text-[13px] text-gray-400">contato@sublimesst.com · (21) 99724-8630</p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
