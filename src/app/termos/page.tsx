import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Termos de Uso' }

export default function TermosPage() {
  return (
    <>
      <Navbar />
      <main className="py-16 px-6">
        <div className="max-w-[760px] mx-auto">
          <h1 className="font-display text-4xl text-gray-900 mb-2">Termos de Uso</h1>
          <p className="text-[13px] text-gray-500 pb-6 mb-6 border-b border-gray-200">
            Última atualização: Janeiro de 2025 · Versão 1.0
          </p>

          <div className="bg-amber-50 border border-amber-300 rounded-[10px] px-5 py-4 mb-8 text-[13px] text-amber-800">
            ⚠️ Este documento é uma versão provisória para fins de operação inicial do MVP.
            O texto final deve ser revisado por assessoria jurídica antes da publicação definitiva.
          </div>

          {[
            { title: '1. Aceitação dos termos', content: 'Ao utilizar o site sublimesst.com e os serviços da Sublime SST, você concorda com estes Termos de Uso. Caso não concorde, não utilize o serviço.' },
            { title: '2. Serviços oferecidos', content: 'A Sublime SST oferece serviços de gestão de conformidade em Segurança e Saúde no Trabalho (SST) para empresas de baixo risco operacional com até 20 funcionários, mediante avaliação prévia de elegibilidade.' },
            { title: '3. Elegibilidade e limitações', content: 'O modelo digital destina-se exclusivamente a empresas aprovadas no teste de elegibilidade, com CNAE de Grau de Risco 1 conforme NR-4, até 20 funcionários e sem atividades de alto risco. A aprovação no teste não garante automaticamente a adequação definitiva.' },
            { title: '4. Responsabilidades', content: 'A Sublime SST compromete-se a prestar os serviços com diligência e profissionalismo. O contratante é responsável por fornecer informações verdadeiras e comunicar alterações nas condições da empresa.\n\nA Sublime SST não se responsabiliza por penalidades decorrentes de informações incorretas fornecidas pelo contratante ou de mudanças não comunicadas nas condições da empresa.' },
            { title: '5. Pagamentos', content: 'Os serviços são prestados mediante taxa de implantação e plano anual com cobrança mensal, conforme valores apresentados no site. Condições promocionais têm prazo definido e não são renovadas automaticamente.' },
            { title: '6. Rescisão', content: 'O contrato pode ser rescindido por qualquer das partes mediante aviso prévio de 30 dias. Valores pagos não são reembolsáveis após início da prestação de serviços, salvo disposição contrária em contrato.' },
            { title: '7. Propriedade intelectual', content: 'Todo o conteúdo do site sublimesst.com, incluindo textos, layouts, logotipos e documentos gerados pela Sublime SST, são de propriedade exclusiva da Sublime SST e protegidos por lei.' },
            { title: '8. Disposições gerais', content: 'Estes termos são regidos pelas leis brasileiras. O foro competente é o da comarca do Rio de Janeiro/RJ. A Sublime SST reserva-se o direito de atualizar estes termos, com comunicação prévia.' },
          ].map(({ title, content }) => (
            <div key={title} className="mb-8">
              <h2 className="text-[1.1rem] font-bold text-gray-900 mb-3">{title}</h2>
              {content.split('\n').map((line, i) => (
                line.trim() ? (
                  <p key={i} className="text-[14px] text-gray-600 leading-relaxed mb-2">{line}</p>
                ) : <br key={i} />
              ))}
            </div>
          ))}

          <p className="text-[13px] text-gray-400 pt-6 border-t border-gray-200">
            Dúvidas? Entre em contato: contato@sublimesst.com | (21) 99724-8630
          </p>
        </div>
      </main>
      <Footer />
    </>
  )
}
