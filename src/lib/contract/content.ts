// ═══════════════════════════════════════════════════════════
// SUBLIME SST — Fonte contratual única e versionada (Eixo A)
// Consumida por /termos (React) e pelo PDF (PDFKit) — nunca dois
// textos mantidos independentemente.
//
// Cada versão é IMUTÁVEL após publicada: uma alteração de conteúdo
// aprovada sempre cria uma nova entrada (nova CONTRACT_VERSION), nunca
// edita uma já existente — necessário para que /termos e o PDF de uma
// contratação antiga continuem exibindo o mesmo texto que estava vigente
// em `/termos` na data do aceite (ver src/lib/contractPersistence.ts,
// Eixo C, para o artefato de PDF já persistido — este arquivo não é
// esse artefato, é a fonte de texto que o alimenta).
//
// Sem preços: valores monetários vêm exclusivamente de pricing.ts,
// nunca fixados neste arquivo (docs/CONTRACT_MVP_V1.md, Seção 18).
// ═══════════════════════════════════════════════════════════

import { CONTRACT_VERSION } from '@/lib/pricing'
import type { ContractBlock, ContractClause, ContractContent } from './types'

// ── Helper de autoria ────────────────────────────────────────
// Converte um texto multi-linha (parágrafos separados por linha em
// branco, itens de lista prefixados com "•") em blocos estruturados.
// Uma linha terminada em ":" imediatamente antes de uma lista vira o
// título dessa lista. Mantém a autoria das cláusulas legível como
// texto corrido, sem exigir que cada cláusula seja escrita já como
// array de blocos.
function linesToBlocks(texto: string): ContractBlock[] {
  const linhas = texto.split('\n').map(l => l.trim())
  const blocos: ContractBlock[] = []
  let i = 0
  while (i < linhas.length) {
    const linha = linhas[i]
    if (!linha) {
      i++
      continue
    }
    if (linha.startsWith('•')) {
      const itens: string[] = []
      while (i < linhas.length && linhas[i].startsWith('•')) {
        itens.push(linhas[i].slice(1).trim())
        i++
      }
      const anterior = blocos[blocos.length - 1]
      if (anterior && anterior.type === 'paragrafo' && anterior.texto.endsWith(':')) {
        blocos.pop()
        blocos.push({ type: 'lista', titulo: anterior.texto, itens })
      } else {
        blocos.push({ type: 'lista', itens })
      }
      continue
    }
    blocos.push({ type: 'paragrafo', texto: linha })
    i++
  }
  return blocos
}

function clause(numero: number, titulo: string, texto: string): ContractClause {
  return { numero, titulo, blocos: linesToBlocks(texto) }
}

// Congela profundamente um ContractContent — o conteúdo publicado nunca
// deve poder ser mutado por um chamador (ex.: `content.clausulas.push(...)`
// ou `blocos[0].texto = '...'` silenciosamente alterando o texto que
// /termos e o PDF exibem). Congela, em ordem: cada array de itens de
// lista, cada bloco, o array de blocos de cada cláusula, cada cláusula,
// o array de cláusulas e por fim o próprio objeto de conteúdo — sem
// dependências novas, só Object.freeze nativo.
function freezeContractContent(content: ContractContent): ContractContent {
  for (const clausula of content.clausulas) {
    for (const bloco of clausula.blocos) {
      if (bloco.type === 'lista') {
        Object.freeze(bloco.itens)
      }
      Object.freeze(bloco)
    }
    Object.freeze(clausula.blocos)
    Object.freeze(clausula)
  }
  Object.freeze(content.clausulas)
  return Object.freeze(content)
}

// ═══════════════════════════════════════════════════════════
// VERSÃO 2026-07-04 (estrutura antiga: compromisso mínimo de 6
// mensalidades, avisos de 30/60 dias, vigência iniciada na entrega de
// documentos) — nunca usada para novas contratações.
//
// A versão 2026-07-04 preserva o conteúdo integral publicado em /termos
// naquela versão. Ela não reproduz o layout nem o extrato de sete
// cláusulas gerado pelo PDF histórico (o gerador anterior a este Eixo A
// só imprimia 7 das 16 cláusulas). O PDF persistido e seu hash
// (Company.contractHash, src/lib/contractPersistence.ts) permanecem
// como artefato histórico primário de qualquer contrato já aceito sob
// esta versão — este array é apenas a fonte textual, usada somente se
// esse PDF precisar ser regenerado a partir do texto de /termos.
// ═══════════════════════════════════════════════════════════

const CLAUSULAS_20260704: ContractClause[] = [
  clause(1, 'Das Partes', `CONTRATADA: SUBLIME SEGURANCA E SAUDE OCUPACIONAL LTDA, inscrita no CNPJ sob o nº 65.051.167/0001-27, com sede na Av. Ataulfo de Paiva, 1235, Sala 303, Leblon, Rio de Janeiro/RJ, CEP 22.440-034, doravante denominada CONTRATADA.

CONTRATANTE: Empresa identificada no formulário de contratação digital, com dados e CNPJ confirmados no momento da aceitação eletrônica deste contrato, doravante denominada CONTRATANTE.`),

  clause(2, 'Do Objeto', `A CONTRATADA se obriga a prestar ao CONTRATANTE serviços de gestão de conformidade em Segurança e Saúde no Trabalho (SST), conforme o plano contratado (Digital Essencial ou Digital Premium), cujo escopo está detalhado na Cláusula 3ª.

O presente contrato rege exclusivamente o produto Sublime Digital, destinado a empresas com CNAE de Grau de Risco 1 (GR1) segundo a NR-4 e até 20 funcionários CLT, aprovadas no teste de elegibilidade disponível em sublimesst.com/elegibilidade.`),

  clause(3, 'Do Escopo dos Serviços', `Serviços incluídos na Implantação (entrega única após confirmação do pagamento):
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
• Visitas técnicas presenciais regulares`),

  clause(4, 'Da Remuneração', `O CONTRATANTE pagará à CONTRATADA:
• Taxa de Implantação: valor único cobrado no momento da contratação, conforme plano e condições vigentes na data da aceitação.
• Mensalidade: valor fixo mensal, conforme a faixa de funcionários e o plano contratados.

A mensalidade é devida a partir da data de liberação do acesso ao portal do cliente, independentemente do estágio de entrega dos documentos de implantação. Os prazos de entrega estão condicionados ao envio completo e correto dos dados pelo CONTRATANTE no formulário de onboarding.

Condições promocionais (ex.: taxa de implantação reduzida) têm prazo definido e não são renovadas automaticamente na eventual rescisão e nova contratação.

Mora: o atraso no pagamento sujeita o CONTRATANTE a multa de 2% (dois por cento) sobre o valor em aberto e juros de mora de 1% (um por cento) ao mês, calculados pro rata die. O atraso superior a 15 (quinze) dias autoriza a suspensão do acesso ao portal e da prestação dos serviços até a regularização, sem prejuízo da exigibilidade dos valores. O atraso superior a 30 (trinta) dias autoriza a CONTRATADA a registrar o débito nos serviços de proteção ao crédito e a rescindir o contrato por inadimplência.

Reajuste: os valores serão reajustados anualmente, na data de aniversário do contrato, pela variação acumulada do IPCA/IBGE nos 12 meses anteriores, ou índice oficial que venha a substituí-lo.`),

  clause(5, 'Do Prazo e da Rescisão', `O contrato tem vigência de 12 meses a partir da data de confirmação do pagamento da implantação, com renovação automática por períodos iguais, salvo aviso de rescisão por qualquer das partes com antecedência mínima de 30 dias.

O CONTRATANTE poderá rescindir o contrato a qualquer momento, observadas as seguintes condições:
• Rescisão entre o 1º e o 6º mês (contados da entrega dos documentos de implantação): pagamento das mensalidades remanescentes necessárias para completar as 6 (seis) mensalidades mínimas;
• Rescisão entre o 7º e o 12º mês: aviso prévio de 60 (sessenta) dias por escrito, com pagamento das mensalidades do período de aviso, sem multa adicional;
• Rescisão após a primeira renovação: aviso prévio de 30 (trinta) dias, sem multa.

Valores de implantação pagos não são reembolsáveis após o início dos trabalhos de elaboração dos documentos.`),

  clause(6, 'Das Obrigações da CONTRATADA', `• Elaborar os documentos do escopo com diligência e conforme as normas vigentes
• Respeitar os prazos de entrega, condicionados ao onboarding completo pelo CONTRATANTE
• Manter sigilo sobre as informações do CONTRATANTE
• Comunicar qualquer impedimento técnico que possa afetar a elegibilidade ao modelo digital
• Atualizar os documentos quando houver alteração de normas aplicáveis, sem custo adicional`),

  clause(7, 'Das Obrigações do CONTRATANTE', `• Fornecer informações verdadeiras, completas e atualizadas sobre a empresa, funcionários, cargos e condições operacionais
• Comunicar à CONTRATADA, em até 5 dias úteis, qualquer alteração que possa afetar a elegibilidade ao modelo digital (mudança de atividade, aumento de quadro, aquisição de equipamentos, mudança de instalações)
• Promover revisão técnica anual das informações fornecidas, confirmando ou atualizando os dados que fundamentam os documentos SST
• Manter os dados do formulário de onboarding atualizados
• Efetuar os pagamentos nos prazos acordados`),

  clause(8, 'Da Elegibilidade e da Suspensão', `O modelo digital é exclusivo para empresas GR1 com até 20 funcionários sem riscos operacionais críticos. A aprovação no teste de elegibilidade não garante permanência indefinida.

A CONTRATADA poderá suspender a emissão de novos documentos, comunicar a perda de elegibilidade e encerrar o contrato sem ônus de rescisão nos seguintes casos:
• Ultrapassagem do limite de 20 funcionários
• Mudança de CNAE para grau de risco superior a GR1
• Identificação de riscos operacionais incompatíveis com o escopo digital
• Omissão ou falsidade nas informações prestadas

Na hipótese de crescimento até o limite de migração, a CONTRATADA poderá oferecer proposta de migração para a modalidade de Consultoria SST.`),

  clause(9, 'Do Suporte e das Limitações de Atendimento', `O suporte inclui orientações técnicas relacionadas aos documentos do escopo contratado, esclarecimento de dúvidas sobre SST no contexto GR1 e atualização de documentos decorrente de alterações normativas.

O suporte não inclui: consultoria jurídica trabalhista, defesa em processos administrativos ou judiciais, emissão de laudos periciais, atendimento a situações decorrentes de informações incorretas fornecidas pelo CONTRATANTE, ou serviços de outra natureza não expressamente previstos neste contrato.`),

  clause(10, 'Da Responsabilidade', `A CONTRATADA é responsável pela qualidade técnica dos documentos elaborados com base nas informações fornecidas pelo CONTRATANTE.

A CONTRATADA não se responsabiliza por: (a) penalidades decorrentes de informações incorretas, incompletas ou desatualizadas fornecidas pelo CONTRATANTE; (b) autuações ou embargos decorrentes de situações preexistentes não declaradas; (c) eventos ocorridos após o encerramento do contrato; (d) adequação a normas específicas do setor que extrapolem o escopo GR1 padrão.

A responsabilidade da CONTRATADA em caso de falha na prestação dos serviços limita-se ao valor das mensalidades pagas nos últimos 6 meses.`),

  clause(11, 'Da Proteção de Dados (LGPD)', `As partes reconhecem que o tratamento de dados pessoais neste contrato é regido pela Lei nº 13.709/2018 (LGPD).

Papéis: O CONTRATANTE atua como Controlador dos dados pessoais dos seus funcionários. A CONTRATADA atua como Operadora, tratando esses dados exclusivamente para fins de elaboração e gestão dos documentos SST.

Dados tratados: Dados de identificação, dados de saúde ocupacional (resultados de exames, histórico médico ocupacional) e dados profissionais dos funcionários do CONTRATANTE. Dados de saúde são classificados como dados sensíveis e tratados com medidas de segurança reforçadas.

Finalidade e base legal: Execução deste contrato (Art. 7º, V da LGPD) e cumprimento de obrigações legais de SST (Art. 7º, II da LGPD).

Compartilhamento: Os dados serão compartilhados exclusivamente com prestadores de serviços da CONTRATADA (sistemas de TI, médico coordenador do PCMSO) sob acordos de confidencialidade e nos limites da LGPD. Não há venda ou compartilhamento comercial de dados.

Retenção: Os dados cadastrais e contratuais são mantidos pelo período de vigência do contrato mais 5 anos, conforme prazo prescricional trabalhista, sendo após anonimizados ou excluídos. Os registros médicos ocupacionais (prontuários, ASOs e dados de monitoramento de saúde vinculados ao PCMSO) são conservados pelo prazo exigido pela NR-7 — no mínimo 20 (vinte) anos após o desligamento de cada trabalhador — sob responsabilidade do médico coordenador, prevalecendo esse prazo legal sobre qualquer disposição em contrário.

Incidentes: A CONTRATADA notificará a AUTORIDADE NACIONAL DE PROTEÇÃO DE DADOS (ANPD) e o CONTRATANTE em até 72 horas em caso de incidente de segurança que afete dados pessoais dos funcionários.

Direitos dos titulares: Os funcionários do CONTRATANTE podem exercer seus direitos de acesso, correção, eliminação e portabilidade de dados mediante solicitação ao CONTRATANTE, que encaminhará à CONTRATADA quando aplicável.`),

  clause(12, 'Da Aceitação Eletrônica', `Este contrato é celebrado exclusivamente de forma eletrônica. A aceitação ocorre por meio de checkbox específico no formulário digital, com registro de data, hora, endereço IP e identificação do navegador (user agent), nos termos do Art. 10 da Lei nº 12.965/2014 (Marco Civil da Internet).

O registro de aceite eletrônico, gerado automaticamente pelo sistema no momento da contratação, constitui prova suficiente da celebração deste contrato, dispensando assinaturas físicas ou testemunhas.

O CONTRATANTE declara ter lido e compreendido integralmente as condições deste contrato antes de confirmar o aceite.`),

  clause(13, 'Do Ajuste de Faixa', `O valor da mensalidade é calculado com base na faixa de funcionários declarada no momento da contratação. Caso o quadro de funcionários ultrapasse o limite superior da faixa contratada, a CONTRATADA notificará o CONTRATANTE para ajuste da mensalidade à faixa correspondente.

Empresas que ultrapassem 20 funcionários perdem a elegibilidade ao modelo digital e deverão migrar para o atendimento de Consultoria SST, conforme proposta a ser apresentada pela CONTRATADA. A CONTRATADA poderá suspender a emissão de novos documentos até a regularização.`),

  clause(14, 'Dos Registros Médicos Ocupacionais e do Encerramento', `Sigilo médico: os resultados de exames e informações clínicas dos trabalhadores são protegidos por sigilo médico. Serão comunicados individualmente a cada trabalhador e, ao CONTRATANTE, apenas nos limites permitidos pela legislação (aptidão/inaptidão e informações estritamente necessárias à gestão de SST), jamais com detalhamento clínico sem autorização expressa do titular.

Encerrado o contrato, por qualquer motivo:
• Os documentos de SST emitidos (PGR, PCMSO e correlatos) deixam de ser atualizados pela CONTRATADA a partir da data de encerramento, e a CONTRATADA poderá formalizar a revogação da responsabilidade técnica sobre eles perante os órgãos competentes;
• Os registros médicos ocupacionais serão transferidos ao novo médico coordenador do PCMSO indicado pelo CONTRATANTE, mediante solicitação formal, no prazo de até 90 (noventa) dias do recebimento da solicitação, em caráter confidencial;
• Enquanto não houver solicitação de transferência, a CONTRATADA (por meio do médico coordenador) conservará os registros pelo prazo legal da NR-7, sem que isso caracterize continuidade da prestação dos serviços.`),

  clause(15, 'Das Disposições Gerais', `Ausência de vínculo: os profissionais envolvidos na prestação dos serviços não possuem qualquer vínculo empregatício com o CONTRATANTE, sendo de responsabilidade da CONTRATADA os encargos decorrentes das suas relações de trabalho, na forma da lei.

Comunicações: as comunicações entre as partes serão realizadas por meio do e-mail cadastrado pelo CONTRATANTE e do portal do cliente, produzindo todos os efeitos contratuais. É responsabilidade do CONTRATANTE manter seu e-mail de contato atualizado.

A tolerância de qualquer das partes quanto ao descumprimento de obrigação prevista neste contrato não constitui novação ou renúncia ao direito de exigi-la.`),

  clause(16, 'Do Foro', `As partes elegem o foro da Comarca da Capital do Estado do Rio de Janeiro para dirimir quaisquer controvérsias oriundas do presente contrato, renunciando a qualquer outro, por mais privilegiado que seja.`),
]

// ═══════════════════════════════════════════════════════════
// VERSÃO 2026-08-05 — conteúdo MVP 1.0 (docs/CONTRACT_MVP_V1.md),
// estrutura de 16 cláusulas aprovada na Seção 16 do documento
// congelado. Substitui integralmente as regras de vigência,
// cancelamento e comprovante da versão anterior.
// ═══════════════════════════════════════════════════════════

const CLAUSULAS_20260805: ContractClause[] = [
  clause(1, 'Partes e Definições', `CONTRATADA: SUBLIME SEGURANCA E SAUDE OCUPACIONAL LTDA, inscrita no CNPJ sob o nº 65.051.167/0001-27, com sede na Av. Ataulfo de Paiva, 1235, Sala 303, Leblon, Rio de Janeiro/RJ, CEP 22.440-034, doravante denominada CONTRATADA.

CONTRATANTE: Empresa identificada no formulário de contratação digital, com dados e CNPJ confirmados no momento da aceitação eletrônica deste contrato, doravante denominada CONTRATANTE.

Sublime Digital: produto digital padronizado de gestão de conformidade em Segurança e Saúde no Trabalho (SST), objeto deste contrato, destinado a empresas aprovadas no teste de elegibilidade da CONTRATADA, nos termos da Cláusula 3ª.`),

  clause(2, 'Objeto', `A CONTRATADA se obriga a prestar ao CONTRATANTE serviços de gestão de conformidade em Segurança e Saúde no Trabalho (SST), conforme o plano contratado (Digital Essencial ou Digital Premium), cujo escopo está detalhado na Cláusula 5ª.

O presente contrato rege exclusivamente o produto Sublime Digital, destinado a empresas aprovadas no teste de elegibilidade disponível em sublimesst.com/elegibilidade, conforme os critérios definidos na Cláusula 3ª.`),

  clause(3, 'Elegibilidade', `O modelo digital é destinado a empresas com CNAE de Grau de Risco 1 (GR1) segundo a NR-4, com até 20 (vinte) funcionários CLT e sem riscos operacionais críticos, aprovadas no teste de elegibilidade disponível em sublimesst.com/elegibilidade.

A aprovação no teste de elegibilidade não garante permanência indefinida no modelo digital.

A CONTRATADA poderá suspender a emissão de novos documentos, comunicar a perda de elegibilidade e encerrar o contrato sem ônus de rescisão adicional para a CONTRATADA nos seguintes casos:
• Ultrapassagem do limite de 20 (vinte) funcionários
• Mudança de CNAE para grau de risco superior a GR1
• Identificação de riscos operacionais incompatíveis com o escopo digital
• Omissão ou falsidade nas informações prestadas pelo CONTRATANTE

Caso o quadro de funcionários ultrapasse o limite superior da faixa contratada sem perder a elegibilidade, a CONTRATADA notificará o CONTRATANTE para ajuste da mensalidade à faixa correspondente, conforme a tabela vigente.

Na hipótese de perda de elegibilidade, a CONTRATADA poderá oferecer proposta de migração para a modalidade de Consultoria SST, sem que isso configure contratação automática do novo serviço.`),

  clause(4, 'Aplicabilidade', `Os documentos e serviços previstos neste contrato serão entregues conforme a aplicabilidade técnica e legal ao perfil real da empresa CONTRATANTE.

A contratação de um plano não significa a emissão automática de um documento tecnicamente inaplicável ou legalmente dispensado para o perfil declarado pelo CONTRATANTE.

O enquadramento de risco, as atividades, os ambientes, as funções e as informações fornecidas pelo CONTRATANTE determinam a aplicabilidade real de cada documento.

As obrigações remanescentes do CONTRATANTE permanecem válidas mesmo quando um determinado programa ou documento for dispensado pela análise técnica da CONTRATADA.`),

  clause(5, 'Serviços do Plano', `Serviços incluídos na Implantação, quando aplicáveis ao perfil da CONTRATANTE (entrega única):
• PGR com LPP — Programa de Gerenciamento de Riscos com Levantamento Preliminar de Perigos (modelo GR1), ou documento técnico correspondente ao enquadramento
• PCMSO — Programa de Controle Médico de Saúde Ocupacional, com o profissional médico necessário à coordenação técnica
• Triagem técnica preliminar remota de exposições ocupacionais, nos termos definidos na Cláusula 13ª
• Ordens de Serviço por cargo/função
• Fichas de Controle de EPI, quando necessárias
• Organização inicial dos documentos no portal do cliente

Serviços incluídos na Gestão Mensal, durante toda a vigência do contrato:
• Gestão e transmissão dos eventos aplicáveis de SST do eSocial — S-2210, S-2220 e S-2240, ou os que vierem a substituí-los, condicionada ao envio tempestivo e completo dos dados pelo CONTRATANTE
• Acompanhamento dos retornos de processamento e comunicação de rejeições e inconsistências ao CONTRATANTE
• Monitoramento de vencimentos de exames periódicos, com alertas e orientações ao CONTRATANTE
• Portal do cliente com repositório de documentos
• Suporte pelos canais previstos no plano contratado, com resposta inicial em até 48 (quarenta e oito) horas úteis no plano Digital Essencial

Adicionalmente ao Plano Digital Premium, que inclui integralmente o escopo do plano Essencial:
• LTCAT — 1 (um) Laudo Técnico das Condições Ambientais do Trabalho inicial por estabelecimento contratado, nos termos e exclusões da Cláusula 13ª
• PPP — Perfil Profissiográfico Previdenciário de novos funcionários durante a vigência, quando aplicável
• Apoio à abertura de até 1 (uma) CAT — Comunicação de Acidente de Trabalho por mês
• 1 (um) relatório analítico de SST por ciclo de 12 (doze) meses
• Suporte via WhatsApp, com resposta inicial em até 24 (vinte e quatro) horas corridas

O LTCAT não está incluído no plano Digital Essencial; pode ser contratado separadamente como adicional, nos termos da Cláusula 6ª.

Os prazos de resposta informados nesta cláusula são de resposta inicial, não necessariamente de solução definitiva, e podem depender de análise técnica, de informações adicionais do CONTRATANTE ou de terceiros e sistemas externos.`),

  clause(6, 'Adicionais e Exclusões', `São expressamente excluídos do escopo deste contrato, salvo contratação expressa de serviço adicional:
• Visitas técnicas presenciais
• Avaliações quantitativas e medições ambientais
• Exames ocupacionais, complementares e demais procedimentos clínicos, e os custos de clínicas, laboratórios ou unidades de atendimento
• Treinamentos em Normas Regulamentadoras (NRs)
• Laudos de Insalubridade ou Periculosidade com validade pericial e perícias em geral
• Defesa administrativa ou judicial e acompanhamento de fiscalização
• Investigação aprofundada de acidentes de trabalho
• Regularização de situações anteriores à contratação
• Unidades, funções ou trabalhadores não informados pelo CONTRATANTE
• Atividades incompatíveis com a modalidade digital

As consultas médicas, os exames ocupacionais e complementares, os procedimentos clínicos e os respectivos deslocamentos não estão incluídos na mensalidade nem na implantação, ainda quando relacionados ao PCMSO, e são pagos separadamente pelo CONTRATANTE diretamente ao prestador do serviço. A indicação de clínica ou profissional, ou o auxílio no agendamento, não significa inclusão desse custo na mensalidade.

O LTCAT, quando contratado como adicional ao plano Digital Essencial, tem seu valor informado no quadro-resumo da contratação, não fixado nesta cláusula geral.

Todo serviço adicional depende de escopo, preço, prazo e aceite explícitos do CONTRATANTE antes de sua execução. A recusa do CONTRATANTE em contratar um serviço adicional necessário à emissão de determinado documento não configura descumprimento contratual por parte da CONTRATADA.`),

  clause(7, 'Obrigações da CONTRATADA', `• Elaborar os documentos do escopo contratado com diligência e conforme as normas vigentes
• Respeitar os prazos de entrega, condicionados ao envio completo das informações pelo CONTRATANTE no onboarding
• Manter sigilo sobre as informações do CONTRATANTE
• Comunicar qualquer impedimento técnico que possa afetar a elegibilidade ao modelo digital
• Atualizar os documentos emitidos quando houver alteração de normas aplicáveis, sem custo adicional para o CONTRATANTE`),

  clause(8, 'Obrigações da CONTRATANTE', `• Fornecer informações verdadeiras, completas e atualizadas sobre a empresa, funcionários, cargos e condições operacionais
• Enviar de forma completa e tempestiva as informações necessárias à gestão e transmissão dos eventos do eSocial, e comunicar imediatamente eventos relevantes (ex.: admissões, afastamentos, acidentes de trabalho)
• Fornecer as procurações, autorizações e acessos necessários à execução dos serviços, quando exigidos
• Comunicar à CONTRATADA, em até 5 (cinco) dias úteis, qualquer alteração que possa afetar a elegibilidade ao modelo digital
• Promover revisão técnica anual das informações fornecidas, confirmando ou atualizando os dados que fundamentam os documentos de SST
• Manter os dados do formulário de onboarding atualizados
• Efetuar os pagamentos nos prazos acordados`),

  clause(9, 'Valores, Promoções, Pagamento e Ativação', `O CONTRATANTE pagará à CONTRATADA a Taxa de Implantação e a Mensalidade, conforme o plano e a faixa de funcionários contratados, nos valores vigentes na data da aceitação, disponíveis em sublimesst.com e confirmados no quadro-resumo da contratação.

A implantação e a primeira mensalidade são cobranças distintas. A primeira mensalidade é cobrada no ato da contratação, e não somente após a conclusão técnica da implantação ou a liberação do portal.

O aceite eletrônico deste contrato ocorre antes da confirmação financeira da contratação. A ativação dos serviços e a liberação do onboarding dependem da confirmação da implantação e da primeira mensalidade. O uso de assinatura (subscription) em plataforma de cobrança recorrente é um detalhe operacional de cobrança e não altera a vigência contratual, a permanência mínima ou as regras de cancelamento previstas na Cláusula 10ª.

Antes da ativação, o CONTRATANTE pode desistir da contratação pelo canal oficial de atendimento. Implantação e primeira mensalidade já pagas nesse cenário serão reembolsadas, com estorno solicitado pelo mesmo meio de pagamento utilizado na contratação; o prazo de conclusão do estorno dependerá da instituição financeira ou plataforma de pagamento, fora do controle direto da CONTRATADA. Após a ativação, a taxa de implantação deixa de ser reembolsável. A ativação é o marco que inicia a vigência contratual, conforme a Cláusula 10ª.

Condições promocionais de implantação têm prazo determinado. O percentual, o prazo e o valor promocional vigentes não são fixados nesta cláusula geral — o quadro-resumo de cada contratação individual registra o valor normal e o valor efetivamente contratado, já refletindo eventual promoção. A promoção vale somente para a contratação em que foi efetivamente aceita; mudanças futuras na campanha promocional não afetam contratações já formalizadas, e o quadro-resumo já aceito é imutável. O desconto de implantação não altera mensalidade, adicionais, reajustes ou renovações, salvo indicação expressa em contrário no próprio quadro-resumo.

Reajuste: os valores serão reajustados anualmente, na data de aniversário da ativação do contrato, pela variação acumulada do IPCA/IBGE nos 12 (doze) meses anteriores, ou índice oficial que venha a substituí-lo.`),

  clause(10, 'Vigência, Renovação e Cancelamento', `O contrato tem vigência inicial mínima de 12 (doze) meses, contados a partir da ativação dos serviços. O preço do período inicial é pago em 12 (doze) cobranças mensais sucessivas — a mensalização é uma facilidade de pagamento do valor total do período inicial, e não uma contratação mês a mês sem permanência mínima.

Cancelamento durante a vigência inicial (os 12 primeiros meses):
• Qualquer solicitação de cancelamento apresentada durante a vigência inicial é tratada como aviso de não renovação
• O encerramento produz efeitos ao final do 12º mês, nunca antes, independentemente do momento em que a solicitação foi apresentada dentro do período inicial
• A solicitação não elimina as parcelas restantes necessárias para completar as 12 (doze) mensalidades do período inicial
• Os serviços permanecem disponíveis até o encerramento do período inicial, ressalvadas inadimplência, suspensão ou outra hipótese contratual aplicável
• Uma solicitação apresentada durante os últimos 90 (noventa) dias da vigência inicial também produz o encerramento exatamente ao final dos 12 (doze) meses, sem antecipação nem postergação, e sem exigir nenhum período adicional de 90 (noventa) dias após o término da vigência inicial

Após a renovação automática, a partir do 13º mês, quando não houver solicitação de cancelamento pendente:
• O contrato se renova automaticamente por prazo indeterminado
• O aviso prévio de 90 (noventa) dias aplica-se exclusivamente aos pedidos de cancelamento apresentados depois de o contrato já ter sido renovado por prazo indeterminado — nunca aos pedidos feitos durante a vigência inicial, que seguem exclusivamente as regras acima
• Durante o aviso prévio, mensalidades e prestação de serviços permanecem normalmente
• Não há multa adicional associada ao cumprimento do aviso prévio, nem novo período de fidelidade imposto a cada renovação automática — a permanência mínima de 12 (doze) meses aplica-se apenas ao período inicial

A CONTRATADA poderá rescindir o contrato imediatamente nas hipóteses e condições previstas nas Cláusulas 3ª (perda de elegibilidade) e 11ª (inadimplência).`),

  clause(11, 'Inadimplência e Suspensão', `O atraso no pagamento sujeita o CONTRATANTE a multa de 2% (dois por cento) sobre o valor em aberto e juros de mora de 1% (um por cento) ao mês, calculados pro rata die.

O atraso superior a 15 (quinze) dias autoriza a suspensão do acesso ao portal e da prestação dos serviços até a regularização, sem prejuízo da exigibilidade dos valores.

O atraso superior a 30 (trinta) dias autoriza a CONTRATADA a registrar o débito nos serviços de proteção ao crédito e a rescindir o contrato por inadimplência, sem prejuízo das mensalidades já vencidas e não pagas.`),

  clause(12, 'Responsabilidade e Limitações', `A CONTRATADA é responsável pela qualidade técnica dos documentos elaborados com base nas informações fornecidas pelo CONTRATANTE.

A CONTRATADA não se responsabiliza por: (a) penalidades decorrentes de informações incorretas, incompletas ou desatualizadas fornecidas pelo CONTRATANTE; (b) autuações ou embargos decorrentes de situações preexistentes não declaradas; (c) eventos ocorridos após o encerramento do contrato; (d) adequação a normas específicas do setor que extrapolem o escopo GR1 padrão; (e) omissão ou atraso causado por informação ausente, incorreta ou fornecida fora do prazo pelo CONTRATANTE perante o eSocial e os órgãos competentes.

A responsabilidade legal do empregador perante o eSocial e os órgãos competentes não é transferida à CONTRATADA. A ausência de comunicação do CONTRATANTE sobre um evento relevante impede a responsabilização da CONTRATADA pelas consequências desse evento específico.

A gestão mensal prevista neste contrato não constitui fiscalização permanente e independente da empresa CONTRATANTE, depende da colaboração ativa do CONTRATANTE e não garante o cumprimento de obrigações que dependam de terceiros, órgãos públicos ou sistemas externos fora do controle da CONTRATADA.

O suporte previsto neste contrato não substitui atendimento de emergência, atendimento médico ou o cumprimento de obrigações urgentes que sejam, por lei, de responsabilidade do empregador, e não inclui consultoria jurídica trabalhista, defesa em processos administrativos ou judiciais, nem emissão de laudos periciais.

A responsabilidade da CONTRATADA em caso de falha na prestação dos serviços limita-se ao valor das mensalidades pagas nos últimos 6 (seis) meses.`),

  clause(13, 'Triagem Remota, LTCAT e Insalubridade', `Triagem técnica preliminar remota de exposições ocupacionais, realizada com base nas informações, documentos e evidências fornecidos pelo CONTRATANTE.

A triagem remota não caracteriza nem descaracteriza insalubridade ou periculosidade, não substitui LTCAT, laudo técnico, avaliação quantitativa ou inspeção presencial quando esses documentos ou procedimentos forem legal ou tecnicamente necessários.

Informações insuficientes, inconsistentes ou incompatíveis com a modalidade digital podem suspender a conclusão do documento afetado. Podem ser solicitados dados adicionais ao CONTRATANTE, ou proposta avaliação presencial ou migração de modalidade (Consultoria SST) — o que não cria contratação automática de serviço adicional, exigindo aceite expresso do CONTRATANTE.

O LTCAT do plano Digital Premium é limitado a 1 (um) laudo inicial por estabelecimento contratado, somente quando tecnicamente aplicável ao perfil declarado e compatível com a modalidade digital — sem necessidade de avaliação quantitativa ou medição ambiental presencial — e limitado às atividades, funções, ambientes e condições efetivamente declaradas pelo CONTRATANTE, dependendo de documentos e evidências suficientes fornecidos por ele.

Não estão incluídos no LTCAT do plano Premium:
• Visita presencial
• Deslocamento
• Avaliação quantitativa
• Medição ambiental
• Análise laboratorial
• Estabelecimento adicional além do contratado
• Função, ambiente ou atividade não declarada pelo CONTRATANTE
• Atualização decorrente de mudança substancial posterior

Quando os elementos fornecidos forem insuficientes, a elaboração do LTCAT poderá ser suspensa, podendo ser apresentada proposta adicional (ex.: avaliação presencial, escopo maior). A contratação do plano Premium não obriga a CONTRATADA a emitir um LTCAT tecnicamente inadequado ou sem lastro técnico suficiente.`),

  clause(14, 'LGPD e Registros Médicos', `As partes reconhecem que o tratamento de dados pessoais neste contrato é regido pela Lei nº 13.709/2018 (LGPD).

Papéis: O CONTRATANTE atua como Controlador dos dados pessoais dos seus funcionários. A CONTRATADA atua como Operadora, tratando esses dados exclusivamente para fins de elaboração e gestão dos documentos SST.

Dados tratados: Dados de identificação, dados de saúde ocupacional (resultados de exames, histórico médico ocupacional) e dados profissionais dos funcionários do CONTRATANTE. Dados de saúde são classificados como dados sensíveis e tratados com medidas de segurança reforçadas.

Finalidade e base legal: Execução deste contrato (Art. 7º, V da LGPD) e cumprimento de obrigações legais de SST (Art. 7º, II da LGPD).

Compartilhamento: Os dados serão compartilhados exclusivamente com prestadores de serviços da CONTRATADA (sistemas de TI, médico coordenador do PCMSO) sob acordos de confidencialidade e nos limites da LGPD. Não há venda ou compartilhamento comercial de dados.

Retenção: Os dados cadastrais e contratuais são mantidos pelo período de vigência do contrato mais 5 anos, conforme prazo prescricional trabalhista, sendo após anonimizados ou excluídos. Os registros médicos ocupacionais (prontuários, ASOs e dados de monitoramento de saúde vinculados ao PCMSO) são conservados pelo prazo exigido pela NR-7 — no mínimo 20 (vinte) anos após o desligamento de cada trabalhador — sob responsabilidade do médico coordenador, prevalecendo esse prazo legal sobre qualquer disposição em contrário.

Incidentes: A CONTRATADA notificará a AUTORIDADE NACIONAL DE PROTEÇÃO DE DADOS (ANPD) e o CONTRATANTE em até 72 horas em caso de incidente de segurança que afete dados pessoais dos funcionários.

Direitos dos titulares: Os funcionários do CONTRATANTE podem exercer seus direitos de acesso, correção, eliminação e portabilidade de dados mediante solicitação ao CONTRATANTE, que encaminhará à CONTRATADA quando aplicável.

Sigilo médico: os resultados de exames e informações clínicas dos trabalhadores são protegidos por sigilo médico. Serão comunicados individualmente a cada trabalhador e, ao CONTRATANTE, apenas nos limites permitidos pela legislação (aptidão/inaptidão e informações estritamente necessárias à gestão de SST), jamais com detalhamento clínico sem autorização expressa do titular.

Encerrado o contrato, por qualquer motivo:
• Os documentos de SST emitidos (PGR, PCMSO e correlatos) deixam de ser atualizados pela CONTRATADA a partir da data de encerramento, e a CONTRATADA poderá formalizar a revogação da responsabilidade técnica sobre eles perante os órgãos competentes
• Os registros médicos ocupacionais serão transferidos ao novo médico coordenador do PCMSO indicado pelo CONTRATANTE, mediante solicitação formal, no prazo de até 90 (noventa) dias do recebimento da solicitação, em caráter confidencial
• Enquanto não houver solicitação de transferência, a CONTRATADA (por meio do médico coordenador) conservará os registros pelo prazo legal da NR-7, sem que isso caracterize continuidade da prestação dos serviços`),

  clause(15, 'Aceite Eletrônico, Versão e Integridade', `Este contrato é celebrado exclusivamente de forma eletrônica. A aceitação ocorre por meio de checkbox específico no formulário digital, com registro de data, hora, endereço IP e identificação do navegador (user agent), nos termos do Art. 10 da Lei nº 12.965/2014 (Marco Civil da Internet).

O aceite eletrônico foi registrado antes da confirmação financeira da contratação. A ativação dos serviços permanece condicionada à confirmação dos pagamentos aplicáveis, nos termos da Cláusula 9ª.

As partes reconhecem o aceite eletrônico e os registros de integridade mantidos pela plataforma como meios de comprovação da manifestação de vontade, sem prejuízo de outros meios de prova admitidos pela legislação.

Este contrato é identificado por uma versão contratual única, registrada no momento do aceite e vinculada de forma imutável ao registro correspondente do CONTRATANTE. O texto integral do contrato está disponível permanentemente em sublimesst.com/termos.

O CONTRATANTE declara ter lido e compreendido integralmente as condições deste contrato antes de confirmar o aceite.`),

  clause(16, 'Disposições Gerais e Foro', `Ausência de vínculo: os profissionais envolvidos na prestação dos serviços não possuem qualquer vínculo empregatício com o CONTRATANTE, sendo de responsabilidade da CONTRATADA os encargos decorrentes das suas relações de trabalho, na forma da lei.

Comunicações: as comunicações entre as partes serão realizadas por meio do e-mail cadastrado pelo CONTRATANTE e do portal do cliente, produzindo todos os efeitos contratuais. É responsabilidade do CONTRATANTE manter seu e-mail de contato atualizado.

A tolerância de qualquer das partes quanto ao descumprimento de obrigação prevista neste contrato não constitui novação ou renúncia ao direito de exigi-la.

Foro: as partes elegem o foro da Comarca da Capital do Estado do Rio de Janeiro para dirimir quaisquer controvérsias oriundas do presente contrato, renunciando a qualquer outro, por mais privilegiado que seja.`),
]

// ── Registro de versões — nunca editar uma entrada existente ──
//
// As chaves são datas LITERAIS, nunca a constante CONTRACT_VERSION — se a
// chave fosse computada a partir de CONTRACT_VERSION, um bump futuro dessa
// constante em pricing.ts (ex.: para uma nova versão ainda sem cláusulas
// escritas) reclassificaria silenciosamente o conteúdo de 2026-08-05 como
// se fosse o conteúdo da nova versão, em vez de fazer getContractContent
// falhar explicitamente por versão desconhecida (ver Eixo A, revisão).
const CONTRACT_CONTENT_BY_VERSION: Readonly<Record<string, ContractContent>> = Object.freeze({
  '2026-07-04': freezeContractContent({ version: '2026-07-04', clausulas: CLAUSULAS_20260704 }),
  '2026-08-05': freezeContractContent({ version: '2026-08-05', clausulas: CLAUSULAS_20260805 }),
})

// ── API pública ──────────────────────────────────────────────

export function getContractContent(version: string): ContractContent {
  const content = CONTRACT_CONTENT_BY_VERSION[version]
  if (!content) {
    throw new Error(`Versão de contrato desconhecida: "${version}"`)
  }
  return content
}

export function getCurrentContractContent(): ContractContent {
  return getContractContent(CONTRACT_VERSION)
}

export function listContractVersions(): string[] {
  return Object.keys(CONTRACT_CONTENT_BY_VERSION)
}
