// ═══════════════════════════════════════════════════════════
// SUBLIME SST — Geração de PDF do Contrato (server-side)
// Gera o contrato integral (16 cláusulas, fonte única em
// src/lib/contract/content.ts) + comprovante de aceite com quadro-resumo
// (Eixo B).
// Nada aqui é lido de pricing.ts — nem preços, nem nome do plano, nem
// faixa. Todos os valores e rótulos comerciais chegam já congelados em
// `data` (snapshots gravados na Company no momento do cadastro) e são
// montados em `resumo` por src/lib/contract/quadroResumo.ts, a única fonte
// usada para renderizar tanto "Plano Contratado" quanto o comprovante —
// nunca duas cópias locais. Isso garante que um contrato já aceito nunca
// passe a exibir um valor ou rótulo diferente por causa de uma mudança
// posterior em pricing.ts.
// ═══════════════════════════════════════════════════════════

import PDFDocument from 'pdfkit'
import { getContractContent } from './contract/content'
import type { ContractBlock } from './contract/types'
import { buildQuadroResumo, LTCAT_SITUACAO_LABEL } from './contract/quadroResumo'

// ── Constantes ───────────────────────────────────────────────

const BLUE  = '#003366'
const TEAL  = '#1a9e8c'
const GRAY  = '#555555'
const LGRAY = '#94a3b8'
const WHITE = '#ffffff'

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
  // Plano — todos os valores monetários abaixo são snapshots já congelados
  // na Company no momento do cadastro (Eixo B) e nunca recalculados aqui a
  // partir de pricing.ts. Ver src/lib/contract/quadroResumo.ts.
  planType: string
  mensalidadeValor: number          // centavos, snapshot (Company.mensalidadeValor)
  implantacaoValor: number          // centavos, snapshot — efetivamente contratada
  implantacaoValorPadrao: number | null // centavos, snapshot — normal, sem promo/LTCAT
  implantacaoPromo: boolean
  ltcatAddon: boolean
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

// Marcador e texto em uma única chamada de fluxo (sem x/y explícitos, sem
// `continued`) — com dezenas de itens por cláusula, o padrão anterior de
// duas chamadas com posição absoluta fazia o PDFKit repetir quebras de
// página quase vazias em sequência (ver Eixo A: regressão corrigida antes
// da entrega). `continued` permanece seguro apenas para trechos curtos e
// pontuais, como em `bodyText` com aviso de autenticidade.
function bullet(doc: PDFKit.PDFDocument, text: string) {
  doc.fillColor('#1e293b').font('Helvetica').fontSize(8.5)
    .text('•  ' + text, { lineGap: 1.5 })
  doc.moveDown(0.15)
}

function pageFooter(doc: PDFKit.PDFDocument, version: string) {
  const y = doc.page.height - 40
  doc.fillColor(LGRAY).font('Helvetica').fontSize(7.5)
    .text(`Sublime SST · CNPJ 65.051.167/0001-27 · sublimesst.com · Versão do contrato: ${version}`,
      60, y, { align: 'center', width: doc.page.width - 120 })
}

// Renderiza os blocos (parágrafo/lista) de uma cláusula com os mesmos
// helpers usados no restante do PDF — a mesma estrutura consumida por
// /termos (src/app/termos/page.tsx), nunca um texto próprio duplicado.
function renderBlocos(doc: PDFKit.PDFDocument, blocos: ContractBlock[]) {
  for (const bloco of blocos) {
    if (bloco.type === 'paragrafo') {
      bodyText(doc, bloco.texto)
    } else {
      if (bloco.titulo) bodyText(doc, bloco.titulo)
      for (const item of bloco.itens) bullet(doc, item)
      doc.moveDown(0.1)
    }
  }
}

// ── GERAÇÃO PRINCIPAL ─────────────────────────────────────────

export async function generateContractPdf(data: ContractPdfData): Promise<Buffer> {
  // Fonte única dos dados comerciais desta contratação, montada ANTES de
  // qualquer escrita no stream do PDF — a mesma usada no Subject do
  // documento, na página "Plano Contratado" e no comprovante, para que
  // nenhuma delas possa divergir entre si nem refletir pricing.ts atual.
  // Por estar fora da Promise, um erro aqui (ex.: Company legada sem
  // snapshot, ou versão contratual sem regra estrutural conhecida) rejeita
  // a Promise retornada antes de qualquer byte ter sido gerado.
  const resumo = buildQuadroResumo({
    razaoSocialContratante: data.razaoSocial,
    cnpjContratante:        data.cnpj,
    nomeResponsavel:        data.responsavel,
    emailCadastrado:        data.email,
    enderecoEstabelecimento: `${data.endereco} — ${data.cidade}/${data.estado} · CEP ${data.cep}`,
    numFuncionarios:        data.numFuncionarios,
    planType:               data.planType,
    mensalidadeValor:       data.mensalidadeValor,
    implantacaoValor:       data.implantacaoValor,
    implantacaoValorPadrao: data.implantacaoValorPadrao,
    implantacaoPromo:       data.implantacaoPromo,
    ltcatAddon:             data.ltcatAddon,
    contractVersion:        data.contractVersion,
  })
  const range = resumo.faixa
  const planLabel = resumo.planoLabel
  const monthlyReais = resumo.mensalidadeCents / 100
  const implantacaoReais = resumo.implantacaoAceitaCents / 100
  const implantacaoNormalReais = resumo.implantacaoNormalCents / 100
  const condicaoPromocionalLabel = resumo.condicaoPromocional ? 'Sim' : 'Não'
  const ltcatLabel = LTCAT_SITUACAO_LABEL[resumo.ltcat]
  const demaisAdicionaisLabel = resumo.demaisAdicionais.length > 0 ? resumo.demaisAdicionais.join(', ') : 'Nenhum'

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 76, bottom: 60, left: 60, right: 60 },
      info: {
        Title: 'Contrato de Prestação de Serviços — Sublime Digital',
        Author: 'Sublime Seguranca e Saude Ocupacional Ltda',
        Subject: `Contrato ${planLabel} — ${data.razaoSocial}`,
        CreationDate: data.contractAcceptedAt,
      },
    })

    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const content = getContractContent(data.contractVersion)

    // ── PÁGINA 1: Cabeçalho + Partes + Plano Contratado ──────

    header(doc)

    doc.moveDown(1.2)
    doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(12)
      .text('CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE SST', { align: 'center' })
    doc.fillColor(TEAL).font('Helvetica').fontSize(9)
      .text('Sublime Digital — Modalidade Online', { align: 'center' })
    doc.moveDown(1)

    // ── CONTRATADA ────────────────────────────────────────────
    sectionTitle(doc, 'Contratada')
    labelValue(doc, 'Razão Social', resumo.razaoSocialContratada)
    labelValue(doc, 'CNPJ', resumo.cnpjContratada)
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
    rowLine(doc, 'Mensalidade', brlR(monthlyReais) + '/mês', false)
    rowLine(doc, 'Implantação normal', brlR(implantacaoNormalReais), true)
    rowLine(doc, data.implantacaoPromo ? 'Implantação (promocional)' : 'Implantação efetivamente contratada', brlR(implantacaoReais), false)
    rowLine(doc, 'Condição promocional', condicaoPromocionalLabel, true)
    rowLine(doc, 'LTCAT', ltcatLabel, false)
    rowLine(doc, 'Demais adicionais', demaisAdicionaisLabel, true)
    rowLine(doc, 'Vigência inicial', resumo.vigenciaInicial, false)
    rowLine(doc, 'Renovação', resumo.renovacao, true)

    pageFooter(doc, content.version)

    // ── PÁGINAS SEGUINTES: Contrato Integral (16 cláusulas) ──

    doc.addPage()
    header(doc)
    doc.moveDown(0.8)
    doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(11)
      .text('TERMOS E CONDIÇÕES', { align: 'center' })
    doc.moveDown(0.6)

    for (const clausula of content.clausulas) {
      sectionTitle(doc, `Cláusula ${clausula.numero}ª — ${clausula.titulo}`)
      renderBlocos(doc, clausula.blocos)
    }

    pageFooter(doc, content.version)

    // ── PÁGINA FINAL: Comprovante de Aceite Eletrônico ────────

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
    labelValue(doc, 'Mensalidade', brlR(monthlyReais) + '/mês')
    labelValue(doc, 'Implantação normal', brlR(implantacaoNormalReais))
    labelValue(doc, 'Implantação efetivamente contratada', brlR(implantacaoReais) + (data.implantacaoPromo ? ' (promocional)' : ''))
    labelValue(doc, 'Condição promocional', condicaoPromocionalLabel)
    labelValue(doc, 'LTCAT', ltcatLabel)
    labelValue(doc, 'Demais adicionais', demaisAdicionaisLabel)
    labelValue(doc, 'Vigência inicial', resumo.vigenciaInicial)
    labelValue(doc, 'Renovação', resumo.renovacao)
    labelValue(doc, 'Aviso prévio', resumo.avisoPrevio)

    sectionTitle(doc, 'Base Legal')
    bodyText(doc, 'O aceite eletrônico foi registrado antes da confirmação financeira da contratação. A ativação dos serviços permanece condicionada à confirmação dos pagamentos aplicáveis.')
    bodyText(doc, 'As partes reconhecem o aceite eletrônico e os registros de integridade mantidos pela plataforma como meios de comprovação da manifestação de vontade, sem prejuízo de outros meios de prova admitidos pela legislação.')
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

    pageFooter(doc, content.version)

    doc.end()
  })
}
