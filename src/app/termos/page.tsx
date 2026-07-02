import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contrato de Prestação de Serviços — Sublime Digital',
  description: 'Termos e condições do contrato de prestação de serviços do produto Sublime Digital.',
  alternates: { canonical: 'https://sublimesst.com/termos' },
}

const CLAUSULAS = [
  {
    titulo: '1ª — Das Partes',
    conteudo: `CONTRATADA: SUBLIME SEGURANCA E SAUDE OCUPACIONAL LTDA, inscrita no CNPJ sob o nº 65.051.167/0001-27, com sede na Av. Ataulfo de Paiva, 1235, Sala 303, Leblon, Rio de Janeiro/RJ, CEP 22.440-034, doravante denominada CONTRATADA.

CONTRATANTE: Empresa identificada no formulário de contratação digital, com dados e CNPJ confirmados no momento da aceitação eletrônica deste contrato, doravante denominada CONTRATANTE.`,
  },
  {
    titulo: '2ª — Do Objeto',
    conteudo: `A CONTRATADA se obriga a prestar ao CONTRATANTE serviços de gestão de conformidade em Segurança e Saúde no Trabalho (SST), conforme o plano contratado (Digital Essencial ou Digital Premium), cujo escopo está detalhado na Cláusula 3ª.

O presente contrato rege exclusivamente o produto Sublime Digital, destinado a empresas com CNAE de Grau de Risco 1 (GR1) segundo a NR-4 e até 20 funcionários CLT, aprovadas no teste de elegibilidade disponível em sublimesst.com/elegibilidade.`,
  },
  {
    titulo: '3ª — Do Escopo dos Serviços',
    conteudo: `Serviços incluídos na Implantação (entrega única após confirmação do pagamento):
• PGR — Programa de Gerenciamento de Riscos (modelo GR1/LPP)
• PCMSO — Programa de Controle Médico de Saúde Ocupacional com médico coordenador
• Declaração técnica preliminar de não identificação de agentes insalubres, elaborada com base nas informações fornecidas pelo CONTRATANTE e nas características do CNAE declarado. Esta declaração não substitui laudo pericial nos termos da NR-15, e é emitida com a ressalva expressa de que não houve avaliação ambiental in loco.
• Ordens de Serviço por cargo/função
• Fichas de EPI

Serviços incluídos na Gestão Mensal (durante toda a vigência do contrato):
• Gestão dos eventos eSocial SST: S-2210 (Comunicação de Acidente de Trabalho), S-2220 (Monitoramento da Saúde do Trabalhador) e S-2240 (Condições Ambientais do Trabalho), condicionada ao envio tempestivo pelo CONTRATANTE dos dados necessários. O evento S-2221 (Resultado de Exame Toxicológico) não está incluído no escopo.
• Monitoramento de vencimentos de exames periódicos e alertas ao CONTRATANTE
• Acesso ao portal digital do cliente para consulta e download de documentos

Adicionalmente ao Plano Digital Premium:
• PPP — Perfil Profissiográfico Previdenciário de novos funcionários
• Abertura de CAT — Comunicação de Acidente de Trabalho (até 1 ocorrência por mês)
• Relatório analítico semestral de SST
• Suporte via WhatsApp com resposta em até 24 horas úteis

Serviços expressamente excluídos do escopo (todos os planos):
• Laudo de Insalubridade ou Periculosidade com validade pericial (NR-15/NR-16)
• LTCAT — Laudo Técnico das Condições Ambientais do Trabalho (disponível como serviço adicional)
• Atendimento a empresas com múltiplos estabelecimentos/filiais
• Defesa administrativa, arbitral ou judicial
• Consultoria jurídica trabalhista ou previdenciária
• Treinamentos presenciais em NRs
• Visitas técnicas presenciais regulares`,
  },
  {
    titulo: '4ª — Da Remuneração',
    conteudo: `O CONTRATANTE pagará à CONTRATADA:
• Taxa de Implantação: valor único cobrado no momento da contratação, conforme plano e condições vigentes na data da aceitação.
• Mensalidade: valor fixo mensal, conforme a faixa de funcionários e o plano contratados.

A mensalidade é devida a partir da data de liberação do acesso ao portal do cliente, independentemente do estágio de entrega dos documentos de implantação. Os prazos de entrega estão condicionados ao envio completo e correto dos dados pelo CONTRATANTE no formulário de onboarding.

Condições promocionais (ex.: taxa de implantação reduzida) têm prazo definido e não são renovadas automaticamente na eventual rescisão e nova contratação.`,
  },
  {
    titulo: '5ª — Do Prazo e da Rescisão',
    conteudo: `O contrato tem vigência de 12 meses a partir da data de confirmação do pagamento da implantação, com renovação automática por períodos iguais, salvo aviso de rescisão por qualquer das partes com antecedência mínima de 30 dias.

O CONTRATANTE poderá rescindir o contrato a qualquer momento, mas o compromisso mínimo é de 6 mensalidades contadas da data de entrega dos documentos de implantação. Rescisão antes do cumprimento deste prazo mínimo implicará o pagamento das mensalidades remanescentes.

Valores de implantação pagos não são reembolsáveis após o início dos trabalhos de elaboração dos documentos.`,
  },
  {
    titulo: '6ª — Das Obrigações da CONTRATADA',
    conteudo: `• Elaborar os documentos do escopo com diligência e conforme as normas vigentes
• Respeitar os prazos de entrega, condicionados ao onboarding completo pelo CONTRATANTE
• Manter sigilo sobre as informações do CONTRATANTE
• Comunicar qualquer impedimento técnico que possa afetar a elegibilidade ao modelo digital
• Atualizar os documentos quando houver alteração de normas aplicáveis, sem custo adicional`,
  },
  {
    titulo: '7ª — Das Obrigações do CONTRATANTE',
    conteudo: `• Fornecer informações verdadeiras, completas e atualizadas sobre a empresa, funcionários, cargos e condições operacionais
• Comunicar à CONTRATADA, em até 5 dias úteis, qualquer alteração que possa afetar a elegibilidade ao modelo digital (mudança de atividade, aumento de quadro, aquisição de equipamentos, mudança de instalações)
• Promover revisão técnica anual das informações fornecidas, confirmando ou atualizando os dados que fundamentam os documentos SST
• Manter os dados do formulário de onboarding atualizados
• Efetuar os pagamentos nos prazos acordados`,
  },
  {
    titulo: '8ª — Da Elegibilidade e da Suspensão',
    conteudo: `O modelo digital é exclusivo para empresas GR1 com até 20 funcionários sem riscos operacionais críticos. A aprovação no teste de elegibilidade não garante permanência indefinida.

A CONTRATADA poderá suspender a emissão de novos documentos, comunicar a perda de elegibilidade e encerrar o contrato sem ônus de rescisão nos seguintes casos:
• Ultrapassagem do limite de 20 funcionários
• Mudança de CNAE para grau de risco superior a GR1
• Identificação de riscos operacionais incompatíveis com o escopo digital
• Omissão ou falsidade nas informações prestadas

Na hipótese de crescimento até o limite de migração, a CONTRATADA poderá oferecer proposta de migração para a modalidade de Consultoria SST.`,
  },
  {
    titulo: '9ª — Do Suporte e das Limitações de Atendimento',
    conteudo: `O suporte inclui orientações técnicas relacionadas aos documentos do escopo contratado, esclarecimento de dúvidas sobre SST no contexto GR1 e atualização de documentos decorrente de alterações normativas.

O suporte não inclui: consultoria jurídica trabalhista, defesa em processos administrativos ou judiciais, emissão de laudos periciais, atendimento a situações decorrentes de informações incorretas fornecidas pelo CONTRATANTE, ou serviços de outra natureza não expressamente previstos neste contrato.`,
  },
  {
    titulo: '10ª — Da Responsabilidade',
    conteudo: `A CONTRATADA é responsável pela qualidade técnica dos documentos elaborados com base nas informações fornecidas pelo CONTRATANTE.

A CONTRATADA não se responsabiliza por: (a) penalidades decorrentes de informações incorretas, incompletas ou desatualizadas fornecidas pelo CONTRATANTE; (b) autuações ou embargos decorrentes de situações preexistentes não declaradas; (c) eventos ocorridos após o encerramento do contrato; (d) adequação a normas específicas do setor que extrapolem o escopo GR1 padrão.

A responsabilidade da CONTRATADA em caso de falha na prestação dos serviços limita-se ao valor das mensalidades pagas nos últimos 6 meses.`,
  },
  {
    titulo: '11ª — Da Proteção de Dados (LGPD)',
    conteudo: `As partes reconhecem que o tratamento de dados pessoais neste contrato é regido pela Lei nº 13.709/2018 (LGPD).

Papéis: O CONTRATANTE atua como Controlador dos dados pessoais dos seus funcionários. A CONTRATADA atua como Operadora, tratando esses dados exclusivamente para fins de elaboração e gestão dos documentos SST.

Dados tratados: Dados de identificação, dados de saúde ocupacional (resultados de exames, histórico médico ocupacional) e dados profissionais dos funcionários do CONTRATANTE. Dados de saúde são classificados como dados sensíveis e tratados com medidas de segurança reforçadas.

Finalidade e base legal: Execução deste contrato (Art. 7º, V da LGPD) e cumprimento de obrigações legais de SST (Art. 7º, II da LGPD).

Compartilhamento: Os dados serão compartilhados exclusivamente com prestadores de serviços da CONTRATADA (sistemas de TI, médico coordenador do PCMSO) sob acordos de confidencialidade e nos limites da LGPD. Não há venda ou compartilhamento comercial de dados.

Retenção: Os dados são mantidos pelo período de vigência do contrato mais 5 anos, conforme prazo prescricional trabalhista. Após, são anonimizados ou excluídos.

Incidentes: A CONTRATADA notificará a AUTORIDADE NACIONAL DE PROTEÇÃO DE DADOS (ANPD) e o CONTRATANTE em até 72 horas em caso de incidente de segurança que afete dados pessoais dos funcionários.

Direitos dos titulares: Os funcionários do CONTRATANTE podem exercer seus direitos de acesso, correção, eliminação e portabilidade de dados mediante solicitação ao CONTRATANTE, que encaminhará à CONTRATADA quando aplicável.`,
  },
  {
    titulo: '12ª — Da Aceitação Eletrônica',
    conteudo: `Este contrato é celebrado exclusivamente de forma eletrônica. A aceitação ocorre por meio de checkbox específico no formulário digital, com registro de data, hora, endereço IP e identificação do navegador (user agent), nos termos do Art. 10 da Lei nº 12.965/2014 (Marco Civil da Internet).

O registro de aceite eletrônico, gerado automaticamente pelo sistema no momento da contratação, constitui prova suficiente da celebração deste contrato, dispensando assinaturas físicas ou testemunhas.

O CONTRATANTE declara ter lido e compreendido integralmente as condições deste contrato antes de confirmar o aceite.`,
  },
  {
    titulo: '13ª — Do Ajuste de Faixa',
    conteudo: `O valor da mensalidade é calculado com base na faixa de funcionários declarada no momento da contratação. Caso o quadro de funcionários ultrapasse o limite superior da faixa contratada, a CONTRATADA notificará o CONTRATANTE para ajuste da mensalidade à faixa correspondente.

Empresas que ultrapassem 20 funcionários perdem a elegibilidade ao modelo digital e deverão migrar para o atendimento de Consultoria SST, conforme proposta a ser apresentada pela CONTRATADA. A CONTRATADA poderá suspender a emissão de novos documentos até a regularização.`,
  },
  {
    titulo: '14ª — Do Foro',
    conteudo: `As partes elegem o foro da Comarca da Capital do Estado do Rio de Janeiro para dirimir quaisquer controvérsias oriundas do presente contrato, renunciando a qualquer outro, por mais privilegiado que seja.`,
  },
]

export default function TermosPage() {
  return (
    <>
      <Navbar />
      <main className="py-16 px-6">
        <div className="max-w-[760px] mx-auto">
          <h1 className="font-display text-4xl text-gray-900 mb-2">Contrato de Prestação de Serviços</h1>
          <p className="text-[13px] text-gray-500 pb-6 mb-6 border-b border-gray-200">
            Versão 2026-06-28 · Sublime Digital (Essencial e Premium)
          </p>

          <div className="bg-amber-50 border border-amber-300 rounded-[10px] px-5 py-4 mb-8 text-[13px] text-amber-800">
            ⚠️ Este documento está sujeito a revisão jurídica antes do uso comercial em escala. As condições aqui descritas são vinculantes para as partes que celebraram o contrato eletronicamente.
          </div>

          <div className="space-y-8">
            {CLAUSULAS.map(({ titulo, conteudo }) => (
              <div key={titulo}>
                <h2 className="text-[1rem] font-bold text-gray-900 mb-3">Cláusula {titulo}</h2>
                {conteudo.split('\n').map((line, i) =>
                  line.trim() ? (
                    <p key={i} className="text-[14px] text-gray-600 leading-relaxed mb-2">{line}</p>
                  ) : <br key={i} />
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
