// ═══════════════════════════════════════════════════════════
// SUBLIME SST — Geração de PDF do Contrato (server-side)
// Gera extrato personalizado por cliente + comprovante de aceite
// ═══════════════════════════════════════════════════════════

import PDFDocument from 'pdfkit'

// ── Constantes ───────────────────────────────────────────────

const BLUE  = '#003366'
const TEAL  = '#1a9e8c'
const GRAY  = '#555555'
const LGRAY = '#94a3b8'
const RED   = '#CC0000'
const WHITE = '#ffffff'

const MONTHLY_BRL: Record<string, Record<string, number>> = {
  essencial: { '1-5': 199, '6-10': 320, '11-20': 490 },
  premium:   { '1-5': 299, '6-10': 490, '11-20': 690 },
}

const PLAN_LABELS: Record<string, string> = {
  essencial: 'Digital Essencial',
  premium:   'Digital Premium',
}

function getRange(n: number): '1-5' | '6-10' | '11-20' {
  if (n <= 5)  return '1-5'
  if (n <= 10) return '6-10'
  return '11-20'
}

function brlR(reais: number) {
  return reais.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(d: Date) {
  return d.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }) + ' (horário de Brasília)'
}

// ── Tipos ─────────────────────────────────────────────────────

export interface ContractPdfData {
  // CONTRATANTE
  razaoSocial: string
  cnpj: string
  responsavel: string
  endereco: string
  cidade: string
  estado: string
  cep: string
  numFuncionarios: number
  email: string
  // Plano
  planType: string
  implantacaoValor: number   // centavos
  implantacaoPromo: boolean
  // Aceite
  contractAcceptedAt: Date
  contractAcceptanceIp: string
  contractAcceptanceUa?: string | null
  contractVersion: string
}

// ── Helpers de layout ─────────────────────────────────────────

function header(doc: PDFKit.PDFDocument) {
  doc.rect(0, 0, doc.page.width, 56).fill(BLUE)
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(13)
    .text('SUBLIME SST', 60, 16)
  doc.fillColor('#a0cdd8').font('Helvetica').fontSize(9)
    .text('Segurança e Saúde no Trabalho — Modalidade Digital', 60, 33)
  doc.fillColor(WHITE).font('Helvetica').fontSize(9)
    .text('CONTRATO DE PRESTAÇÃO DE SERVIÇOS', 0, 24, { align: 'right', width: doc.page.width - 60 })
  doc.moveDown(0)
}

function sectionTitle(doc: PDFKit.PDFDocument, text: string) {
  doc.moveDown(0.6)
  doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(10).text(text.toUpperCase())
  doc.moveTo(60, doc.y + 2).lineTo(doc.page.width - 60, doc.y + 2).strokeColor('#e2e8f0').lineWidth(1).stroke()
  doc.moveDown(0.4)
}

function bodyText(doc: PDFKit.PDFDocument, text: string, indent = false) {
  doc.fillColor('#1e293b').font('Helvetica').fontSize(9)
    .text(text, { indent: indent ? 14 : 0, align: 'justify', lineGap: 2 })
  doc.moveDown(0.25)
}

function labelValue(doc: PDFKit.PDFDocument, label: string, value: string) {
  const x = doc.x
  const y = doc.y
  doc.fillColor(GRAY).font('Helvetica').fontSize(8.5).text(label + ':', x, y, { continued: true, width: 160 })
  doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(8.5).text('  ' + value)
  doc.moveDown(0.2)
}

function rowLine(doc: PDFKit.PDFDocument, left: string, right: string, shade: boolean) {
  const pageWidth = doc.page.width - 120
  const colW = pageWidth / 2
  const y = doc.y
  if (shade) doc.rect(60, y - 2, pageWidth, 18).fill('#f8fafc').fillColor('#f8fafc')
  doc.fillColor(GRAY).font('Helvetica').fontSize(8.5).text(left, 60, y, { width: colW })
  doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(8.5).text(right, 60 + colW, y, { width: colW, align: 'right' })
  doc.moveDown(0.4)
}

function bullet(doc: PDFKit.PDFDocument, text: string, color = '#1e293b') {
  const x = doc.x
  const y = doc.y
  doc.fillColor(TEAL).font('Helvetica-Bold').fontSize(9).text('•', x, y, { continued: true, width: 12 })
  doc.fillColor(color).font('Helvetica').fontSize(8.5).text(' ' + text, { lineGap: 1.5 })
  doc.moveDown(0.15)
}

function pageFooter(doc: PDFKit.PDFDocument, version: string) {
  const y = doc.page.height - 40
  doc.fillColor(LGRAY).font('Helvetica').fontSize(7.5)
    .text(`Sublime SST · CNPJ 65.051.167/0001-27 · sublimesst.com · Versão do contrato: ${version}`,
      60, y, { align: 'center', width: doc.page.width - 120 })
}

// ── GERAÇÃO PRINCIPAL ─────────────────────────────────────────

export async function generateContractPdf(data: ContractPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 76, bottom: 60, left: 60, right: 60 },
      info: {
        Title: 'Contrato de Prestação de Serviços — Sublime Digital',
        Author: 'Sublime Seguranca e Saude Ocupacional Ltda',
        Subject: `Contrato ${PLAN_LABELS[data.planType] ?? data.planType} — ${data.razaoSocial}`,
        CreationDate: data.contractAcceptedAt,
      },
    })

    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const range = getRange(data.numFuncionarios)
    const monthly = MONTHLY_BRL[data.planType]?.[range] ?? 0
    const planLabel = PLAN_LABELS[data.planType] ?? data.planType
    const implantacaoReais = data.implantacaoValor / 100

    // ── PÁGINA 1: Cabeçalho + Partes + Plano ─────────────────

    header(doc)

    doc.moveDown(1.2)
    doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(12)
      .text('CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE SST', { align: 'center' })
    doc.fillColor(TEAL).font('Helvetica').fontSize(9)
      .text('Sublime Digital — Modalidade Online', { align: 'center' })
    doc.moveDown(1)

    // ── CONTRATADA ────────────────────────────────────────────
    sectionTitle(doc, 'Contratada')
    labelValue(doc, 'Razão Social', 'SUBLIME SEGURANCA E SAUDE OCUPACIONAL LTDA')
    labelValue(doc, 'CNPJ', '65.051.167/0001-27')
    labelValue(doc, 'Endereço', 'Av. Ataulfo de Paiva, 1235, Sala 303 — Leblon, Rio de Janeiro/RJ · CEP 22.440-034')
    labelValue(doc, 'Representante', 'ARIANE GUIMARAES LEITE — Sócia-Administradora · CPF 141.263.667-17')

    // ── CONTRATANTE ───────────────────────────────────────────
    sectionTitle(doc, 'Contratante')
    labelValue(doc, 'Razão Social', data.razaoSocial)
    labelValue(doc, 'CNPJ', data.cnpj)
    labelValue(doc, 'Endereço', `${data.endereco} — ${data.cidade}/${data.estado} · CEP ${data.cep}`)
    labelValue(doc, 'Responsável', data.responsavel)
    labelValue(doc, 'E-mail', data.email)
    labelValue(doc, 'Funcionários', `${data.numFuncionarios} funcionário(s)`)

    // ── PLANO CONTRATADO ──────────────────────────────────────
    sectionTitle(doc, 'Plano Contratado')
    rowLine(doc, 'Plano', planLabel, false)
    rowLine(doc, 'Faixa de funcionários', `${range} funcionários`, true)
    rowLine(doc, 'Mensalidade', brlR(monthly) + '/mês', false)
    rowLine(doc, data.implantacaoPromo ? 'Implantação (promocional)' : 'Implantação', brlR(implantacaoReais), true)
    rowLine(doc, 'Vigência inicial', '12 (doze) meses — renovação automática', false)
    rowLine(doc, 'Compromisso mínimo', '6 mensalidades após entrega do primeiro documento', true)

    // ── SERVIÇOS INCLUÍDOS ────────────────────────────────────
    sectionTitle(doc, 'Serviços Incluídos na Implantação')
    bullet(doc, 'Programa de Gerenciamento de Riscos (PGR) com Levantamento Preliminar de Perigos (LPP) — modelo GR1')
    bullet(doc, 'Programa de Controle Médico de Saúde Ocupacional (PCMSO) — elaboração com médico coordenador')
    bullet(doc, 'Declaração técnica preliminar de não identificação de agentes insalubres, com base nas informações declaradas no onboarding digital, dentro do escopo GR1 (não substitui laudo técnico pericial com vistoria presencial)')
    bullet(doc, 'Ordens de Serviço por cargo (modelos padronizados)')
    bullet(doc, 'Fichas de Controle de EPI por função (modelos padronizados)')

    sectionTitle(doc, 'Serviços Incluídos na Gestão Mensal')
    bullet(doc, 'Gestão dos eventos SST do eSocial (S-2210 · S-2220 · S-2240), condicionada ao envio tempestivo e completo de informações pelo CONTRATANTE')
    bullet(doc, 'Monitoramento de vencimento de exames periódicos com notificação')
    bullet(doc, 'Portal do cliente com repositório digital de documentos')
    if (data.planType === 'premium') {
      bullet(doc, 'PPP de novos funcionários incluído', TEAL)
      bullet(doc, 'Abertura de CAT — até 1 ocorrência por mês (excedentes: R$ 100/ocorrência)', TEAL)
      bullet(doc, 'Relatório analítico semestral', TEAL)
      bullet(doc, 'Suporte via WhatsApp com resposta em até 24 horas úteis', TEAL)
    } else {
      bullet(doc, 'Suporte via e-mail com resposta em até 48 horas úteis')
    }
    bullet(doc, 'Escopo do suporte: esclarecimentos sobre documentos, portal, prazos e dúvidas de SST dentro do contrato — não inclui consultoria jurídica, defesa em fiscalização ou documentos fora do plano')

    pageFooter(doc, data.contractVersion)

    // ── PÁGINA 2: Cláusulas Principais ───────────────────────

    doc.addPage()
    header(doc)
    doc.moveDown(0.8)

    sectionTitle(doc, 'Cláusula 5ª — Prazo e Vigência')
    bodyText(doc, 'O contrato entra em vigor na data de confirmação do pagamento da taxa de implantação, com vigência inicial de 12 (doze) meses, renovando-se automaticamente por iguais períodos salvo manifestação contrária com antecedência mínima de 30 dias.')
    bodyText(doc, 'A mensalidade será devida a partir da liberação do acesso ao portal e do início da análise técnica, independentemente da data de conclusão dos documentos finais, desde que a CONTRATADA esteja apta a iniciar os serviços com base nas informações fornecidas.')
    bodyText(doc, 'O CONTRATANTE assume compromisso mínimo de 6 (seis) mensalidades, contadas a partir da entrega do primeiro documento técnico (PGR ou PCMSO). Os prazos de entrega somente começam a contar após o envio completo de todas as informações e documentos solicitados no onboarding digital.')

    sectionTitle(doc, 'Cláusula 6ª — Pagamento')
    bodyText(doc, 'A taxa de implantação é devida no ato da contratação, é condição para início dos serviços e não é reembolsável em nenhuma hipótese. A mensalidade é cobrada mensalmente via plataforma Asaas.')
    bodyText(doc, 'O atraso superior a 15 dias corridos autoriza a suspensão do acesso ao portal até regularização, com multa de 2% e juros de 1% ao mês. Os preços poderão ser reajustados anualmente pelo IPCA.')

    sectionTitle(doc, 'Cláusula 9ª — Rescisão e Multa Contratual')
    bodyText(doc, 'A taxa de implantação paga não é reembolsável em nenhuma hipótese.')
    bodyText(doc, '9.1 — Cancelamento nos meses 1 a 6: multa equivalente às mensalidades necessárias para completar 6 meses pagos.')
    bodyText(doc, '9.2 — Cancelamento nos meses 7 a 12: aviso prévio de 60 dias por escrito; pagamento das mensalidades do período de aviso; sem multa adicional.')
    bodyText(doc, '9.3 — Cancelamento após renovação: aviso prévio de 30 dias, sem multa.')
    bodyText(doc, '9.4 — A CONTRATADA pode rescindir imediatamente por: (i) inadimplência superior a 30 dias; (ii) informações falsas ou omissão relevante; (iii) perda dos critérios de elegibilidade GR1 sem regularização no prazo acordado.')

    sectionTitle(doc, 'Cláusula 10ª — Limitação de Responsabilidade')
    bodyText(doc, 'A CONTRATADA é responsável pela elaboração técnica dos documentos com base nas informações fornecidas pelo CONTRATANTE. Erros, omissões ou informações desatualizadas prestadas pelo CONTRATANTE eximem a CONTRATADA de responsabilidade por autuações, multas ou passivos trabalhistas.')
    bodyText(doc, 'A declaração técnica de não identificação de agentes insalubres não substitui laudo técnico pericial com vistoria presencial, sendo obrigatória avaliação presencial em caso de exposição identificada, dúvida técnica ou determinação regulatória aplicável.')
    bodyText(doc, 'A responsabilidade total da CONTRATADA fica limitada ao valor das mensalidades pagas nos últimos 3 (três) meses.')

    sectionTitle(doc, 'Cláusula 11ª — LGPD')
    bodyText(doc, 'O CONTRATANTE atua como Controlador e a CONTRATADA como Operadora dos dados pessoais tratados neste contrato, nos termos da Lei nº 13.709/2018 (LGPD). Os dados podem incluir dados de saúde ocupacional, classificados como dados sensíveis (art. 5º, II da LGPD).')
    bodyText(doc, 'O CONTRATANTE declara possuir base legal adequada para compartilhamento dos dados de seus empregados e responsabiliza-se pela informação aos titulares quando aplicável. A CONTRATADA poderá compartilhar dados estritamente necessários com médico coordenador, clínicas parceiras, o eSocial e órgãos públicos competentes.')
    bodyText(doc, 'Os dados serão armazenados com medidas de segurança adequadas e eliminados após o encerramento contratual, salvo obrigação legal de retenção. Em caso de incidente de segurança relevante, a CONTRATADA notificará o CONTRATANTE e a ANPD no prazo legal.')

    sectionTitle(doc, 'Cláusula 13ª — Ajuste de Faixa e Migração')
    bodyText(doc, 'Caso o CONTRATANTE ultrapasse a faixa de funcionários do plano contratado, a mensalidade será ajustada para a faixa aplicável a partir do ciclo subsequente. Caso ultrapasse 20 funcionários, deverá migrar para Consultoria SST ou proposta personalizada no prazo de 30 dias.')

    sectionTitle(doc, 'Cláusula 14ª — Foro')
    bodyText(doc, 'As partes elegem o foro da Comarca da Capital do Estado do Rio de Janeiro para dirimir quaisquer questões decorrentes deste contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.')

    pageFooter(doc, data.contractVersion)

    // ── PÁGINA 3: Comprovante de Aceite Eletrônico ─────────────

    doc.addPage()
    header(doc)
    doc.moveDown(1)

    // Badge
    doc.rect(60, doc.y, doc.page.width - 120, 38).fill('#f0fdf9')
    doc.fillColor(TEAL).font('Helvetica-Bold').fontSize(11)
      .text('COMPROVANTE DE ACEITE ELETRÔNICO', 60, doc.y - 30, { align: 'center', width: doc.page.width - 120 })
    doc.fillColor(GRAY).font('Helvetica').fontSize(8.5)
      .text('Documento gerado automaticamente pela plataforma Sublime SST', 60, doc.y - 12, { align: 'center', width: doc.page.width - 120 })
    doc.moveDown(1.2)

    sectionTitle(doc, 'Identificação do Aceite')
    labelValue(doc, 'CONTRATANTE', data.razaoSocial)
    labelValue(doc, 'CNPJ', data.cnpj)
    labelValue(doc, 'Responsável pelo aceite', data.responsavel)
    labelValue(doc, 'E-mail cadastrado', data.email)

    sectionTitle(doc, 'Dados do Registro Eletrônico')
    labelValue(doc, 'Data e hora do aceite', formatDate(data.contractAcceptedAt))
    labelValue(doc, 'Endereço IP', data.contractAcceptanceIp)
    if (data.contractAcceptanceUa) {
      labelValue(doc, 'Navegador / Dispositivo', data.contractAcceptanceUa.slice(0, 100))
    }
    labelValue(doc, 'Versão do contrato aceito', data.contractVersion)

    sectionTitle(doc, 'Objeto do Aceite')
    labelValue(doc, 'Plano', planLabel)
    labelValue(doc, 'Faixa', `${range} funcionários`)
    labelValue(doc, 'Mensalidade', brlR(monthly) + '/mês')
    labelValue(doc, 'Implantação paga', brlR(implantacaoReais) + (data.implantacaoPromo ? ' (promocional)' : ''))
    labelValue(doc, 'Vigência', '12 meses com renovação automática')
    labelValue(doc, 'Mínimo garantido', '6 mensalidades após entrega do 1º documento')

    sectionTitle(doc, 'Base Legal')
    bodyText(doc, 'Este aceite eletrônico tem força vinculante nos termos do art. 10 da MP nº 2.200-2/2001 e dos arts. 7º e 10 da Lei nº 12.965/2014 (Marco Civil da Internet). O registro de IP, data/hora, user agent e versão do contrato constitui prova suficiente do aceite para todos os fins legais.')
    bodyText(doc, 'O texto integral do contrato está disponível permanentemente em sublimesst.com/termos. A versão aceita pelo CONTRATANTE é identificada pelo campo "Versão do contrato aceito" acima.')

    // Assinatura digital da CONTRATADA
    doc.moveDown(1)
    doc.moveTo(60, doc.y).lineTo(260, doc.y).strokeColor('#cbd5e1').lineWidth(0.5).stroke()
    doc.moveDown(0.3)
    doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(8.5).text('CONTRATADA')
    doc.fillColor(GRAY).font('Helvetica').fontSize(8).text('Sublime Seguranca e Saude Ocupacional Ltda')
    doc.fillColor(GRAY).font('Helvetica').fontSize(8).text('ARIANE GUIMARAES LEITE — Sócia-Administradora')
    doc.fillColor(GRAY).font('Helvetica').fontSize(8).text('CPF 141.263.667-17 · CNPJ 65.051.167/0001-27')

    doc.moveDown(2)

    // Aviso de autenticidade
    doc.rect(60, doc.y, doc.page.width - 120, 36).fill('#fef9c3')
    doc.fillColor('#854d0e').font('Helvetica-Bold').fontSize(8)
      .text('⚠  Documento gerado automaticamente. Para verificar a autenticidade deste comprovante, ', 68, doc.y - 28, { continued: true })
    doc.font('Helvetica').text('consulte o portal do cliente em sublimesst.com/cliente/login com o e-mail cadastrado.')
    doc.moveDown(0)

    pageFooter(doc, data.contractVersion)

    doc.end()
  })
}
