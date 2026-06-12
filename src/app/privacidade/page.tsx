import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Política de Privacidade' }

export default function PrivacidadePage() {
  return (
    <>
      <Navbar />
      <main className="py-16 px-6">
        <div className="max-w-[760px] mx-auto">
          <h1 className="font-display text-4xl text-gray-900 mb-2">Política de Privacidade</h1>
          <p className="text-[13px] text-gray-500 pb-6 mb-6 border-b border-gray-200">
            Última atualização: Janeiro de 2025 · Versão 1.0
          </p>

          <div className="bg-amber-50 border border-amber-300 rounded-[10px] px-5 py-4 mb-8 text-[13px] text-amber-800">
            ⚠️ Este documento é uma versão provisória para fins de operação inicial do MVP.
            O texto final deve ser revisado por assessoria jurídica antes da publicação definitiva.
          </div>

          {[
            { title: '1. Quem somos', content: `A Sublime SST — Segurança e Saúde Ocupacional é responsável pelo tratamento dos dados pessoais coletados por meio do site sublimesst.com e do produto Sublime Digital.\n\nContato: contato@sublimesst.com | (21) 99724-8630` },
            { title: '2. Dados coletados', content: `Coletamos os seguintes dados para as finalidades descritas nesta política:\n\n• Dados de identificação: nome, e-mail, telefone/WhatsApp, CNPJ\n• Dados operacionais: CNAE, número de funcionários, respostas ao questionário de elegibilidade\n• Dados de cadastro: endereço, cargos, informações da empresa\n• Dados de uso: interações com o site, origem do acesso, resultados do teste` },
            { title: '3. Finalidade do tratamento', content: `Os dados são coletados e tratados para:\n\n• Avaliar a elegibilidade da empresa ao modelo digital\n• Prestar os serviços contratados de gestão de conformidade em SST\n• Comunicar sobre o andamento dos serviços\n• Melhorar a experiência do usuário e o produto\n• Cumprir obrigações legais e regulatórias` },
            { title: '4. Base legal (LGPD)', content: `O tratamento dos dados se baseia no consentimento do titular (Art. 7º, I), na execução de contrato (Art. 7º, V) e no legítimo interesse (Art. 7º, IX) da Sublime SST para melhoria dos serviços.` },
            { title: '5. Compartilhamento de dados', content: `Não vendemos dados pessoais a terceiros. Podemos compartilhar dados com prestadores de serviços tecnológicos (ex: processador de pagamentos, serviços de e-mail) sob contratos de confidencialidade e em conformidade com a LGPD.` },
            { title: '6. Direitos do titular', content: `Você tem direito a: acesso, correção, eliminação, portabilidade, revogação do consentimento e informações sobre o tratamento dos seus dados.\n\nSolicitações: contato@sublimesst.com` },
            { title: '7. Retenção e exclusão', content: `Os dados são mantidos pelo período necessário à prestação dos serviços e cumprimento de obrigações legais. Após, são eliminados ou anonimizados conforme a LGPD.` },
            { title: '8. Segurança', content: `Adotamos medidas técnicas e organizacionais para proteger os dados contra acesso não autorizado, perda ou divulgação indevida, incluindo criptografia em trânsito, controle de acesso e logs de auditoria.` },
          ].map(({ title, content }) => (
            <div key={title} className="mb-8">
              <h2 className="text-[1.1rem] font-bold text-gray-900 mb-3">{title}</h2>
              {content.split('\n').map((line, i) => (
                line.trim() ? (
                  <p key={i} className="text-[14px] text-gray-600 leading-relaxed mb-2">
                    {line}
                  </p>
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
