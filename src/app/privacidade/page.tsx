import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Política de Privacidade — Sublime SST',
  description: 'Como a Sublime SST coleta, usa e protege seus dados pessoais, conforme a Lei Geral de Proteção de Dados (LGPD).',
  alternates: { canonical: 'https://sublimesst.com/privacidade' },
}

const SECOES = [
  {
    titulo: '1. Quem somos',
    conteudo: `A SUBLIME SEGURANCA E SAUDE OCUPACIONAL LTDA, inscrita no CNPJ 65.051.167/0001-27, com sede na Av. Ataulfo de Paiva, 1235, Sala 303, Leblon, Rio de Janeiro/RJ, é a responsável pelo tratamento dos dados pessoais coletados por meio do site sublimesst.com e do produto Sublime Digital.

Encarregado de Proteção de Dados (DPO): contato@sublimesst.com | (21) 99724-8630`,
  },
  {
    titulo: '2. Papéis no tratamento de dados (LGPD)',
    conteudo: `A Sublime SST atua em dois papéis distintos conforme a Lei nº 13.709/2018 (LGPD):

Controladora — em relação aos dados dos visitantes do site, leads e responsáveis pelas empresas contratantes (nome, e-mail, WhatsApp, CNPJ). A Sublime SST determina as finalidades e os meios de tratamento desses dados.

Operadora — em relação aos dados pessoais dos funcionários das empresas contratantes (dados de saúde ocupacional, exames, cargos). Esses dados são tratados exclusivamente para prestar os serviços SST contratados, sob instrução da empresa CONTRATANTE, que é a Controladora desses dados.`,
  },
  {
    titulo: '3. Dados coletados e finalidades',
    conteudo: `Dados de visitantes e leads (Sublime SST como Controladora):
• Identificação: nome, e-mail, telefone/WhatsApp, CNPJ
• Dados operacionais: CNAE, número de funcionários, respostas ao teste de elegibilidade
• Dados de uso: interações com o site, origem do acesso (UTM), resultados do teste
Finalidade: avaliar elegibilidade ao modelo digital, contatar o interessado, melhorar o produto.

Dados dos funcionários das empresas contratantes (Sublime SST como Operadora):
• Identificação: nome, CPF, data de nascimento, cargo
• Dados sensíveis de saúde: resultados de exames periódicos, histórico médico ocupacional, afastamentos, dados para PPP
Finalidade: elaboração e manutenção dos documentos SST obrigatórios (PGR, PCMSO, eSocial, etc.).

Dados de aceitação eletrônica do contrato:
• Data e hora do aceite, endereço IP, identificação do navegador (user agent), versão do contrato aceito
Finalidade: prova da celebração do contrato, nos termos do Marco Civil da Internet (Lei 12.965/2014).`,
  },
  {
    titulo: '4. Bases legais (LGPD — Art. 7º e Art. 11)',
    conteudo: `• Execução de contrato (Art. 7º, V): dados necessários para prestar os serviços SST contratados.
• Cumprimento de obrigação legal (Art. 7º, II): dados exigidos pela legislação trabalhista e de SST (CLT, NRs, eSocial).
• Consentimento (Art. 7º, I): dados coletados no site para comunicação e melhoria do produto, quando aplicável.
• Legítimo interesse (Art. 7º, IX): dados de uso do site para melhoria de produto e segurança.

Para dados sensíveis de saúde dos funcionários das empresas contratantes:
• Execução de contrato com fins de saúde (Art. 11, II, f): dados de saúde tratados para fins de saúde ocupacional conforme exigência legal.`,
  },
  {
    titulo: '5. Compartilhamento de dados',
    conteudo: `Não vendemos dados pessoais a terceiros. Compartilhamos dados exclusivamente nas seguintes situações:

• Médico coordenador do PCMSO: recebe dados de saúde dos funcionários para elaboração e coordenação do PCMSO, sob acordo de confidencialidade e nos termos do Código de Ética Médica.
• Fornecedores de tecnologia: sistemas de e-mail (Resend), banco de dados (Supabase/PostgreSQL), hospedagem (Vercel) e pagamentos (Asaas) — todos sob contrato de tratamento de dados e medidas adequadas de segurança.
• Autoridades públicas: quando exigido por lei, ordem judicial ou obrigação regulatória.

Todos os compartilhamentos são feitos sob acordos de confidencialidade e limitados ao mínimo necessário para a finalidade específica.`,
  },
  {
    titulo: '6. Retenção e eliminação',
    conteudo: `Dados de visitantes e leads: mantidos por até 2 anos após o último contato, salvo consentimento para comunicações continuadas.

Dados de clientes ativos: mantidos durante toda a vigência do contrato e por 5 anos após o encerramento (prazo prescricional trabalhista e de SST).

Dados de aceitação eletrônica do contrato: mantidos por 10 anos (prazo prescricional civil para contratos).

Após o prazo de retenção aplicável, os dados são anonimizados ou eliminados de forma segura.`,
  },
  {
    titulo: '7. Segurança',
    conteudo: `Adotamos as seguintes medidas técnicas e organizacionais para proteger os dados:

• Criptografia em trânsito (TLS/HTTPS) e em repouso no banco de dados
• Controle de acesso por autenticação segura (magic link com token único por 15 minutos)
• Row Level Security (RLS) no banco de dados — cada cliente acessa apenas seus próprios dados
• Logs de auditoria de acesso a documentos sensíveis
• Segmentação de ambientes (produção separado de desenvolvimento)
• Backups regulares com criptografia

Em caso de incidente de segurança que afete dados pessoais, notificaremos a ANPD e os titulares afetados em até 72 horas, conforme o Art. 48 da LGPD.`,
  },
  {
    titulo: '8. Direitos dos titulares',
    conteudo: `Nos termos dos Arts. 17 a 22 da LGPD, você tem direito a:

• Acesso: confirmar se tratamos seus dados e obter cópia
• Correção: solicitar atualização de dados incorretos ou incompletos
• Eliminação: solicitar exclusão de dados tratados com base no consentimento
• Portabilidade: receber seus dados em formato estruturado
• Informação: saber com quem compartilhamos seus dados
• Revogação do consentimento: retirar o consentimento a qualquer momento
• Oposição: se opor ao tratamento em determinadas situações

Para exercer seus direitos, entre em contato: contato@sublimesst.com

Prazo de resposta: até 15 dias úteis para solicitações identificadas. Para titulares que sejam funcionários de empresas contratantes, a solicitação deve ser encaminhada à empresa empregadora (Controladora).`,
  },
  {
    titulo: '9. Cookies e rastreamento',
    conteudo: `Utilizamos Google Analytics 4 para análise de uso do site (páginas visitadas, origem do tráfego, comportamento de navegação). Os dados são anonimizados e não incluem informações pessoais identificáveis.

Não utilizamos cookies de publicidade ou rastreamento cross-site.

Você pode desativar o Google Analytics instalando o complemento de desativação disponível em tools.google.com/dlpage/gaoptout.`,
  },
  {
    titulo: '10. Atualizações desta política',
    conteudo: `Esta política pode ser atualizada para refletir mudanças nos serviços, na legislação ou nas nossas práticas de privacidade. Em caso de alterações materiais, notificaremos os clientes ativos por e-mail com antecedência mínima de 15 dias.

Versão atual: 2026-07-02 · Versão 2.0`,
  },
]

export default function PrivacidadePage() {
  return (
    <>
      <Navbar />
      <main className="py-16 px-6">
        <div className="max-w-[760px] mx-auto">
          <h1 className="font-display text-4xl text-gray-900 mb-2">Política de Privacidade</h1>
          <p className="text-[13px] text-gray-500 pb-6 mb-6 border-b border-gray-200">
            Última atualização: 02 de julho de 2026 · Versão 2.0
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-[10px] px-5 py-4 mb-8 text-[13px] text-blue-800">
            Esta política está alinhada à Lei nº 13.709/2018 (LGPD) e ao contrato de prestação de serviços versão 2026-06-28. Sujeita a revisão jurídica antes da publicação definitiva.
          </div>

          <div className="space-y-8">
            {SECOES.map(({ titulo, conteudo }) => (
              <div key={titulo}>
                <h2 className="text-[1.05rem] font-bold text-gray-900 mb-3">{titulo}</h2>
                {conteudo.split('\n').map((line, i) =>
                  line.trim() ? (
                    <p key={i} className="text-[14px] text-gray-600 leading-relaxed mb-2">{line}</p>
                  ) : <br key={i} />
                )}
              </div>
            ))}
          </div>

          <div className="mt-12 pt-6 border-t border-gray-200">
            <p className="text-[13px] text-gray-400">
              Dúvidas ou solicitações: contato@sublimesst.com | (21) 99724-8630
            </p>
            <p className="text-[13px] text-gray-400 mt-1">
              Autoridade Nacional de Proteção de Dados (ANPD): gov.br/anpd
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
