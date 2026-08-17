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
//
// Arquitetura de layout (Eixo D): o documento usa `bufferPages` para poder
// numerar as páginas só ao final, e um listener `pageAdded` que desenha o
// cabeçalho em toda página — inclusive nas criadas automaticamente pelo
// PDFKit no meio de uma cláusula longa. `ensureSpace`/`sectionBreak`
// reservam altura antes de títulos, linhas de tabela e caixas destacadas
// para nunca deixar um título órfão no fim da página nem dividir uma caixa
// ao meio; o rodapé (com numeração "Página X de Y") é aplicado numa
// segunda passagem, depois que todo o conteúdo já foi gerado, garantindo
// que ele sempre reflita o conteúdo real de cada página.
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

const HEADER_HEIGHT = 56
// Posição vertical em que o conteúdo de cada página começa a fluir, logo
// abaixo da faixa azul do cabeçalho — fixa e explícita para não depender
// da posição de cursor deixada pela última chamada `.text()` do cabeçalho.
const CONTENT_START_Y = HEADER_HEIGHT + 18

// Texto único do aviso de autenticidade do comprovante — sem ícone (a fonte
// padrão Helvetica do PDFKit não cobre o glifo de alerta Unicode U+26A0,
// fora do WinAnsi/Latin-1, o que renderizava um caractere solto incorreto
// no lugar dele) e sem mistura de negrito/normal via `continued` (a troca
// de fonte no meio da mesma "linha continuada" comia um caractere na
// junção dos trechos).
const AUTENTICIDADE_TEXT = 'Documento gerado automaticamente. Para verificar a autenticidade deste comprovante, consulte o portal do cliente em sublimesst.com/cliente/login com o e-mail cadastrado.'

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

// ── Helpers de layout — geometria da página ────────────────────

function contentWidth(doc: PDFKit.PDFDocument) {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right
}

function pageBottom(doc: PDFKit.PDFDocument) {
  return doc.page.height - doc.page.margins.bottom
}

// Garante que os próximos `height` pontos cabem na página atual antes de
// desenhar um bloco que não deve ser cortado no meio (título, linha de
// tabela, caixa destacada). Se não couber, quebra a página explicitamente
// — o listener `pageAdded` cuida de desenhar o cabeçalho da nova página.
function ensureSpace(doc: PDFKit.PDFDocument, height: number) {
  if (doc.y + height > pageBottom(doc)) {
    doc.addPage()
  }
}

// Início de uma nova seção "grande" (ex.: cláusulas, comprovante): só força
// nova página se a página atual já tiver conteúdo relevante. Sem isso, uma
// quebra automática que tenha ocorrido bem no fim da seção anterior (ex.:
// título da última cláusula empurrado para uma página nova, com pouco ou
// nenhum corpo) resultaria em mais uma página seguinte quase vazia. Reusar
// essa sobra evita a página "quase vazia sem justificativa".
function sectionBreak(doc: PDFKit.PDFDocument, minUsed = 110) {
  const used = doc.y - doc.page.margins.top
  if (used > minUsed) doc.addPage()
}

// ── Helpers de layout — blocos visuais ─────────────────────────

function drawHeader(doc: PDFKit.PDFDocument) {
  doc.rect(0, 0, doc.page.width, HEADER_HEIGHT).fill(BLUE)
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(13)
    .text('SUBLIME SST', 60, 16)
  doc.fillColor('#a0cdd8').font('Helvetica').fontSize(9)
    .text('Segurança e Saúde no Trabalho — Modalidade Digital', 60, 33)
  doc.fillColor(WHITE).font('Helvetica').fontSize(9)
    .text('CONTRATO DE PRESTAÇÃO DE SERVIÇOS', 0, 24, { align: 'right', width: doc.page.width - 60 })
  // Posição fixa e previsível para o início do conteúdo — nunca deduzida do
  // cursor deixado pela última chamada de texto acima.
  doc.x = doc.page.margins.left
  doc.y = CONTENT_START_Y
}

function sectionTitle(doc: PDFKit.PDFDocument, text: string) {
  // Reserva altura do título + regra + um mínimo de corpo abaixo dele, para
  // nunca deixar um título sozinho no fim da página (título órfão).
  ensureSpace(doc, 46)
  doc.moveDown(0.6)
  doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(10).text(text.toUpperCase())
  doc.moveTo(doc.page.margins.left, doc.y + 2).lineTo(doc.page.width - doc.page.margins.right, doc.y + 2)
    .strokeColor('#e2e8f0').lineWidth(1).stroke()
  doc.moveDown(0.4)
}

function bodyText(doc: PDFKit.PDFDocument, text: string, indent = false) {
  doc.fillColor('#1e293b').font('Helvetica').fontSize(9)
    .text(text, { indent: indent ? 14 : 0, align: 'justify', lineGap: 2 })
  doc.moveDown(0.25)
}

function labelValue(doc: PDFKit.PDFDocument, label: string, value: string) {
  ensureSpace(doc, 16)
  const x = doc.x
  const y = doc.y
  doc.fillColor(GRAY).font('Helvetica').fontSize(8.5).text(label + ':', x, y, { continued: true, width: 160 })
  doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(8.5).text('  ' + value)
  doc.moveDown(0.2)
}

function rowLine(doc: PDFKit.PDFDocument, left: string, right: string, shade: boolean) {
  // Reserva a altura da linha inteira antes de desenhar — impede que o
  // fundo sombreado fique numa página e o texto na seguinte.
  ensureSpace(doc, 20)
  const x0 = doc.page.margins.left
  const pageWidth = contentWidth(doc)
  const colW = pageWidth / 2
  const y = doc.y
  if (shade) doc.rect(x0, y - 2, pageWidth, 18).fill('#f8fafc')
  doc.fillColor(GRAY).font('Helvetica').fontSize(8.5).text(left, x0, y, { width: colW })
  doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(8.5).text(right, x0 + colW, y, { width: colW, align: 'right' })
  doc.moveDown(0.4)
}

// Marcador e texto em uma única chamada de fluxo (sem x/y explícitos, sem
// `continued`) — com dezenas de itens por cláusula, o padrão anterior de
// duas chamadas com posição absoluta fazia o PDFKit repetir quebras de
// página quase vazias em sequência (ver Eixo A: regressão corrigida antes
// da entrega). `continued` permanece seguro apenas para trechos curtos e
// pontuais, como nas caixas destacadas do comprovante.
function bullet(doc: PDFKit.PDFDocument, text: string) {
  doc.font('Helvetica').fontSize(8.5)
  const width = contentWidth(doc)
  const full = '•  ' + text
  // Reserva a altura REAL do item (que pode ter várias linhas), não uma
  // altura fixa de uma linha só — um item longo com só uma linha de
  // reserva podia começar a renderizar quando ainda havia espaço para a
  // 1ª linha, e o PDFKit quebrava o restante do mesmo item para a página
  // seguinte no meio da frase, sem marcador (quebra ruim de lista).
  const height = doc.heightOfString(full, { width, lineGap: 1.5 })
  ensureSpace(doc, height)
  doc.fillColor('#1e293b').text(full, { width, lineGap: 1.5 })
  doc.moveDown(0.15)
}

function pageFooter(doc: PDFKit.PDFDocument, version: string, pageNum: number, pageCount: number) {
  const y = doc.page.height - 40
  // O rodapé fica, por design, DENTRO da margem inferior (40pt do fim da
  // página, com margem inferior de 60pt) — abaixo do limite inferior da
  // caixa de conteúdo (`page.height - margins.bottom`). Sem isto, o PDFKit
  // interpreta esse texto como conteúdo que não coube na página e insere
  // silenciosamente uma página nova em branco só para desenhá-lo (essa era
  // a causa raiz da página "quase vazia só com rodapé" já conhecida antes
  // do Eixo D). Zera a margem inferior só durante esta chamada para que o
  // PDFKit trate a posição explícita como válida, sem paginar.
  const bottomMargin = doc.page.margins.bottom
  doc.page.margins.bottom = 0
  doc.fillColor(LGRAY).font('Helvetica').fontSize(7.5)
    .text(
      `Sublime SST · CNPJ 65.051.167/0001-27 · sublimesst.com · Versão do contrato: ${version} · Página ${pageNum} de ${pageCount}`,
      doc.page.margins.left, y, { align: 'center', width: contentWidth(doc) },
    )
  doc.page.margins.bottom = bottomMargin
}

// Renderiza os blocos (parágrafo/lista) de uma cláusula com os mesmos
// helpers usados no restante do PDF — a mesma estrutura consumida por
// /termos (src/app/termos/page.tsx), nunca um texto próprio duplicado.
function renderBlocos(doc: PDFKit.PDFDocument, blocos: ContractBlock[]) {
  for (const bloco of blocos) {
    if (bloco.type === 'paragrafo') {
      bodyText(doc, bloco.texto)
    } else {
      if (bloco.titulo) {
        // Evita um título de lista órfão, isolado no fim da página, sem
        // nenhum dos itens abaixo dele.
        ensureSpace(doc, 28)
        bodyText(doc, bloco.titulo)
      }
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
      autoFirstPage: false,
      bufferPages: true,
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
    // Desenha o cabeçalho em TODA página, inclusive nas criadas
    // automaticamente pelo PDFKit no meio do fluxo (ex.: uma cláusula longa
    // que não cabe inteira na página atual) — antes, só as páginas
    // iniciadas manualmente por doc.addPage() explícito recebiam cabeçalho.
    doc.on('pageAdded', () => drawHeader(doc))

    const content = getContractContent(data.contractVersion)

    // ── PÁGINA 1: Cabeçalho + Partes + Plano Contratado ──────

    doc.addPage()

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

    // ── PÁGINAS SEGUINTES: Contrato Integral (16 cláusulas) ──

    sectionBreak(doc, 80)
    doc.moveDown(0.8)
    doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(11)
      .text('TERMOS E CONDIÇÕES', { align: 'center' })
    doc.moveDown(0.6)

    for (const clausula of content.clausulas) {
      sectionTitle(doc, `Cláusula ${clausula.numero}ª — ${clausula.titulo}`)
      renderBlocos(doc, clausula.blocos)
    }

    // ── PÁGINA FINAL: Comprovante de Aceite Eletrônico ────────

    // Só força página nova se a página atual já tiver conteúdo relevante —
    // reaproveita uma eventual sobra quase vazia deixada pela última
    // cláusula em vez de criar mais uma página quase em branco.
    sectionBreak(doc, 110)
    doc.moveDown(1)

    // Badge — desenhado com y0 explícito e avanço manual do cursor ao
    // final, em vez do padrão anterior `doc.y - N` (que posicionava o
    // texto ACIMA da caixa, fora dela, causando sobreposição com o
    // conteúdo anterior).
    const badgeX = doc.page.margins.left
    const badgeWidth = contentWidth(doc)
    const badgeHeight = 40
    ensureSpace(doc, badgeHeight + 14)
    const badgeY = doc.y
    doc.rect(badgeX, badgeY, badgeWidth, badgeHeight).fill('#f0fdf9')
    doc.fillColor(TEAL).font('Helvetica-Bold').fontSize(11)
      .text('COMPROVANTE DE ACEITE ELETRÔNICO', badgeX, badgeY + 9, { align: 'center', width: badgeWidth })
    doc.fillColor(GRAY).font('Helvetica').fontSize(8.5)
      .text('Documento gerado automaticamente pela plataforma Sublime SST', badgeX, badgeY + 25, { align: 'center', width: badgeWidth })
    doc.x = doc.page.margins.left
    doc.y = badgeY + badgeHeight + 14

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

    // Assinatura digital da CONTRATADA + aviso de autenticidade — bloco
    // final indivisível, com altura calculada com precisão (não um chute
    // fixo) para que a decisão de quebrar página seja consequência real do
    // conteúdo: se ainda houver espaço na página do comprovante, o bloco
    // permanece nela; só avança para uma página nova quando realmente não
    // cabe. Um valor de reserva superestimado forçava uma página final
    // quase vazia mesmo quando o bloco cabia perfeitamente na página atual.
    const signatureColWidth = contentWidth(doc)
    const noteInnerWidth = signatureColWidth - 16
    const notePaddingV = 9

    doc.font('Helvetica').fontSize(8)
    const noteTextHeight = doc.heightOfString(AUTENTICIDADE_TEXT, { width: noteInnerWidth })
    const noteHeight = noteTextHeight + notePaddingV * 2

    // As linhas abaixo espelham exatamente a sequência de fontes/tamanhos e
    // `moveDown` usada na renderização real logo em seguida — é o que
    // permite medir a altura do bloco com precisão via `heightOfString`/
    // `currentLineHeight` em vez de uma constante arbitrária.
    doc.font('Helvetica').fontSize(9)
    const gapBeforeSignature = doc.currentLineHeight(true) * 1
    const gapAfterRule = doc.currentLineHeight(true) * 0.3
    doc.font('Helvetica-Bold').fontSize(8.5)
    const signatureTitleH = doc.heightOfString('CONTRATADA', { width: signatureColWidth })
    doc.font('Helvetica').fontSize(8)
    const signatureLine2H = doc.heightOfString('Sublime Seguranca e Saude Ocupacional Ltda', { width: signatureColWidth })
    const signatureLine3H = doc.heightOfString('ARIANE GUIMARAES LEITE — Sócia-Administradora', { width: signatureColWidth })
    const signatureLine4H = doc.heightOfString('CPF 141.263.667-17 · CNPJ 65.051.167/0001-27', { width: signatureColWidth })
    const gapBeforeNote = doc.currentLineHeight(true) * 1.5

    const finalBlockHeight = gapBeforeSignature + gapAfterRule + signatureTitleH
      + signatureLine2H + signatureLine3H + signatureLine4H + gapBeforeNote + noteHeight

    ensureSpace(doc, finalBlockHeight)

    doc.moveDown(1)
    doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.margins.left + 200, doc.y).strokeColor('#cbd5e1').lineWidth(0.5).stroke()
    doc.moveDown(0.3)
    doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(8.5).text('CONTRATADA')
    doc.fillColor(GRAY).font('Helvetica').fontSize(8).text('Sublime Seguranca e Saude Ocupacional Ltda')
    doc.fillColor(GRAY).font('Helvetica').fontSize(8).text('ARIANE GUIMARAES LEITE — Sócia-Administradora')
    doc.fillColor(GRAY).font('Helvetica').fontSize(8).text('CPF 141.263.667-17 · CNPJ 65.051.167/0001-27')

    doc.moveDown(1.5)

    // Aviso de autenticidade — texto único, sem mistura de negrito/normal
    // via `continued` e sem ícone. O ícone de alerta (glifo Unicode fora do
    // WinAnsi/Latin-1 suportado pela fonte padrão Helvetica do PDFKit)
    // renderizava como um caractere solto e incorreto ("&"); o texto em
    // `continued` com troca de fonte no meio também comia um caractere na
    // junção dos dois trechos. Uma única chamada com uma fonte só elimina
    // as duas causas de uma vez.
    const noteX = doc.page.margins.left
    const noteY = doc.y
    doc.rect(noteX, noteY, signatureColWidth, noteHeight).fill('#fef9c3')
    doc.fillColor('#854d0e').font('Helvetica').fontSize(8)
      .text(AUTENTICIDADE_TEXT, noteX + 8, noteY + notePaddingV, { width: noteInnerWidth })
    doc.x = doc.page.margins.left
    doc.y = noteY + noteHeight + 10

    // ── Rodapé + numeração — segunda passagem sobre TODAS as páginas ──
    //
    // Aplicado depois que todo o conteúdo já foi gerado (bufferPages),
    // garantindo rodapé em 100% das páginas — inclusive as criadas
    // automaticamente pelo PDFKit — e eliminando o padrão anterior de
    // rodapé desalinhado do conteúdo (uma quebra automática ocorrendo
    // pouco antes da chamada explícita de rodapé produzia página "quase
    // vazia só com rodapé"). Também adiciona "Página X de Y" à paginação.
    const pageRange = doc.bufferedPageRange()
    for (let i = 0; i < pageRange.count; i++) {
      doc.switchToPage(pageRange.start + i)
      pageFooter(doc, content.version, i + 1, pageRange.count)
    }

    doc.end()
  })
}
