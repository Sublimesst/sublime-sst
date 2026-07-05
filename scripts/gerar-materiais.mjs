// Gera materiais de apoio a partir do conteúdo canônico do site:
//   1. docs/Contrato_Sublime_Digital_v2026-07-04.docx  (fonte: /termos — editável)
//   2. docs/Plano_10_Primeiros_Parceiros.pdf           (fonte: docs/plano-10-primeiros-parceiros.md)
//   3. docs/Apresentacao_Sublime_SST.pdf               (one-pager comercial)
// Uso: node scripts/gerar-materiais.mjs
import fs from 'fs'
import path from 'path'
import PDFDocument from 'pdfkit'
import * as docx from 'docx'

const OUT = 'docs'
fs.mkdirSync(OUT, { recursive: true })

// ── 1. CONTRATO EM WORD ─────────────────────────────────────
// Extrai o array CLAUSULAS direto de src/app/termos/page.tsx (fonte única)
const termosSrc = fs.readFileSync('src/app/termos/page.tsx', 'utf-8')
const clausulas = [...termosSrc.matchAll(/titulo:\s*'([^']+)',\s*conteudo:\s*`([\s\S]*?)`,\s*\}/g)]
  .map(m => ({ titulo: m[1], conteudo: m[2] }))
if (clausulas.length < 16) throw new Error(`Esperava 16 cláusulas, achei ${clausulas.length}`)

const versao = (termosSrc.match(/Versão (\d{4}-\d{2}-\d{2})/) ?? [])[1] ?? 'desconhecida'

const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, LevelFormat } = docx

const children = [
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE SST', bold: true, size: 30 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: 'Sublime Digital — Essencial e Premium', size: 22, color: '1a9e8c' })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 360 }, children: [new TextRun({ text: `Versão ${versao} · Fonte canônica: sublimesst.com/termos`, size: 18, color: '888888' })] }),
]
for (const c of clausulas) {
  children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 }, children: [new TextRun({ text: `Cláusula ${c.titulo}`, bold: true })] }))
  for (const raw of c.conteudo.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    if (line.startsWith('•')) {
      children.push(new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: line.replace(/^•\s*/, ''), size: 21 })] }))
    } else {
      children.push(new Paragraph({ spacing: { after: 100 }, alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: line, size: 21 })] }))
    }
  }
}
children.push(new Paragraph({ spacing: { before: 400 }, children: [new TextRun({ text: 'SUBLIME SEGURANCA E SAUDE OCUPACIONAL LTDA · CNPJ 65.051.167/0001-27', size: 18, color: '888888' })] }))
children.push(new Paragraph({ children: [new TextRun({ text: 'Av. Ataulfo de Paiva, 1235, Sala 303 — Leblon, Rio de Janeiro/RJ · contato@sublimesst.com', size: 18, color: '888888' })] }))

const doc = new Document({
  styles: { default: { document: { run: { font: 'Arial', size: 21 } } } },
  numbering: { config: [{ reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }] },
  sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } }, children }],
})
const buf = await Packer.toBuffer(doc)
const docxPath = path.join(OUT, `Contrato_Sublime_Digital_v${versao}.docx`)
fs.writeFileSync(docxPath, buf)
console.log('OK docx:', docxPath, buf.length, 'bytes,', clausulas.length, 'cláusulas')

// ── Helpers PDF ─────────────────────────────────────────────
const PETROL = '#0d4a5c', TEAL = '#1a9e8c', GRAY = '#555', DARK = '#1e293b'
function pdfDoc(file, tituloDoc) {
  const d = new PDFDocument({ size: 'A4', margins: { top: 64, bottom: 56, left: 56, right: 56 }, info: { Title: tituloDoc, Author: 'Sublime SST' } })
  d.pipe(fs.createWriteStream(file))
  return d
}
function header(d, titulo, sub) {
  d.rect(0, 0, d.page.width, 54).fill(PETROL)
  d.fillColor('#fff').font('Helvetica-Bold').fontSize(13).text('SUBLIME SST', 56, 14)
  d.fillColor('#a0cdd8').font('Helvetica').fontSize(9).text(sub, 56, 31)
  d.fillColor('#fff').fontSize(9).text(titulo, 0, 22, { align: 'right', width: d.page.width - 56 })
  d.y = 78
}
function h2(d, t) {
  if (d.y > d.page.height - 140) { d.addPage(); d.y = 64 }
  d.moveDown(0.6); d.fillColor(PETROL).font('Helvetica-Bold').fontSize(12).text(t, 56)
  d.moveTo(56, d.y + 2).lineTo(d.page.width - 56, d.y + 2).strokeColor('#e2e8f0').lineWidth(1).stroke(); d.moveDown(0.4)
}
function p(d, t, opts = {}) { d.fillColor(DARK).font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9.5).text(t, 56, d.y, { width: d.page.width - 112, align: 'left', lineGap: 2 }); d.moveDown(0.3) }
function bullet(d, t) {
  d.fillColor(TEAL).font('Helvetica-Bold').fontSize(9.5).text('•', 62, d.y, { continued: true, width: d.page.width - 124 })
  d.fillColor(DARK).font('Helvetica').text('  ' + t, { lineGap: 1.5 }); d.moveDown(0.15)
}
function tabela(d, headers, rows, widths) {
  const x0 = 56; let y = d.y + 4
  d.font('Helvetica-Bold').fontSize(8.5).fillColor(TEAL)
  let x = x0; headers.forEach((h, i) => { d.text(h.toUpperCase(), x, y, { width: widths[i] }); x = x + widths[i] })
  y = d.y + 3; d.moveTo(x0, y).lineTo(x0 + widths.reduce((a, b) => a + b, 0), y).strokeColor('#cbd5e1').lineWidth(0.5).stroke()
  d.font('Helvetica').fontSize(9).fillColor(DARK)
  for (const row of rows) {
    y += 6; let maxY = y; x = x0
    row.forEach((cell, i) => { d.text(String(cell), x, y, { width: widths[i] - 8 }); maxY = Math.max(maxY, d.y); x += widths[i] })
    y = maxY
  }
  d.y = y + 8
}

// ── 2. PLANO DE PARCEIROS EM PDF ────────────────────────────
{
  const d = pdfDoc(path.join(OUT, 'Plano_10_Primeiros_Parceiros.pdf'), 'Plano — 10 Primeiros Parceiros')
  header(d, 'PLANO COMERCIAL — USO INTERNO', 'Programa de Parceiros — Escritórios de Contabilidade')
  d.fillColor(PETROL).font('Helvetica-Bold').fontSize(16).text('10 primeiros parceiros contábeis', 56)
  d.fillColor(GRAY).font('Helvetica').fontSize(10).text('Objetivo: 10 escritórios ativos e indicando em até 6 semanas, abastecendo o funil do Sublime Digital.', 56); d.moveDown(0.5)

  h2(d, '1. A matemática')
  p(d, 'Premissas conservadoras: ~10 clientes elegíveis por escritório; 2–3 indicações reais no 1º mês; 30% de conversão.')
  p(d, 'Resultado esperado com 10 parceiros ativos: 6–9 clientes novos por mês.', { bold: true })
  p(d, 'Argumento para o contador: 5 clientes convertidos na faixa 6–10 funcionários = R$ 160/mês recorrentes por até 12 meses (~R$ 1.900/ano) sem executar nada.')

  h2(d, '2. Perfil ideal (ICP)')
  bullet(d, 'Escritórios de 2–15 funcionários com carteira PME de serviços/comércio — RJ primeiro')
  bullet(d, 'Escritórios que já sofreram com o eSocial SST (S-2210/2220/2240) — dor viva')
  bullet(d, 'Contadores ativos em grupos/redes (multiplicadores)')
  bullet(d, 'Evitar por ora: grandes contabilidades digitais e escritórios focados em indústria')

  h2(d, '3. Canais, em ordem')
  bullet(d, 'Semana 1 — Rede quente: contadores conhecidos e indicados por clientes atuais (meta: 5–8 conversas)')
  bullet(d, 'Contínuo — Pergunta no onboarding de cada cliente: "quem cuida da contabilidade de vocês?"')
  bullet(d, 'Semanas 2–6 — Prospecção fria via WhatsApp: lista de 50 escritórios, 10 abordagens/semana')
  bullet(d, 'Paralelo — Grupos de contadores RJ e eventos CRC/Sescon (conversa 1:1, não vender no grupo)')

  h2(d, '4. Cadência de abordagem fria')
  bullet(d, 'D0 — WhatsApp (texto pronto do kit, foco na dor do eSocial) + fechamento com pergunta de 10 min')
  bullet(d, 'D2 — Follow-up curto · D5 — E-mail com a LP /sst-para-contadores · D10 — Última tentativa com o link do teste de elegibilidade; depois pausa de 60 dias')
  p(d, 'Roteiro da reunião de 10 min: dor (eSocial cobra SST do cliente) > solução 100% digital GR1 > ganho do escritório (10% × 12 meses + dor fora da mesa) > como funciona (link exclusivo, portal, zero execução) > fechar o cadastro em /parceiros na hora.')

  h2(d, '5. Processo operacional')
  tabela(d, ['Etapa', 'Ação'], [
    ['Cadastro', 'Parceiro preenche sublimesst.com/parceiros'],
    ['Ativação em até 24h', 'Botão "Ativar parceiro" no admin'],
    ['Boas-vindas', 'WhatsApp com link do portal (magic link)'],
    ['Onboarding 15 min', 'Portal + link exclusivo + kit; meta de 2 indicações no 1º mês'],
    ['D+7 e D+21', 'Check-in ativo'],
    ['1ª comissão liberada', 'Avisar ativamente; pedir mais indicações e depoimento'],
  ], [150, 333])
  p(d, 'Regra de ouro: parceiro sem indicação em 30 dias recebe ligação, não e-mail.', { bold: true })

  h2(d, '6. Objeções e respostas')
  bullet(d, '"Não entendo de SST" — não precisa: o teste de elegibilidade responde na hora; a avaliação técnica é nossa')
  bullet(d, '"E se der problema para o cliente?" — documentos assinados por profissionais habilitados, médico coordenador, aceite auditável; perfil fora do digital cai na consultoria')
  bullet(d, '"Quanto trabalho me dá?" — mandar um link; acompanhamento pelo portal')
  bullet(d, '"Já indico para outro" — ele paga comissão recorrente e mostra o status num portal?')
  bullet(d, '"Preciso emitir NF?" — sim, CNPJ para recebimento recorrente; PIX até o dia 10 do mês seguinte à liberação')

  h2(d, '7. Metas semanais')
  tabela(d, ['Métrica', 'Meta'], [
    ['Abordagens novas', '10 / semana'],
    ['Reuniões de 10 min', '3 / semana'],
    ['Cadastros em /parceiros', '2 / semana'],
    ['Ativação de parceiro', '100% em até 24h'],
    ['Checkpoint semana 3', '5 parceiros ativos'],
    ['Checkpoint semana 6', '10 ativos · 10+ indicações acumuladas'],
  ], [240, 243])

  h2(d, '8. Pré-requisitos antes da 1ª abordagem fria')
  bullet(d, 'Testar o fluxo ponta a ponta com 1 parceiro-cobaia (cadastro > ativação > login > indicação > comissão)')
  bullet(d, 'Ativar Asaas produção')
  bullet(d, 'Definir o dono das abordagens e check-ins (número de WhatsApp)')
  d.end()
  console.log('OK pdf: Plano_10_Primeiros_Parceiros.pdf')
}

// ── 3. ONE-PAGER COMERCIAL ──────────────────────────────────
{
  const d = pdfDoc(path.join(OUT, 'Apresentacao_Sublime_SST.pdf'), 'Apresentação Sublime SST')
  header(d, 'APRESENTAÇÃO COMERCIAL', 'Segurança e Saúde Ocupacional')
  d.fillColor(PETROL).font('Helvetica-Bold').fontSize(16).text('Conformidade em SST adequada ao perfil de cada operação', 56)
  d.fillColor(GRAY).font('Helvetica').fontSize(10).text('Do GR1 mais simples ao GR4 mais complexo — consultoria especializada e um modelo 100% digital para pequenas empresas de baixo risco.', 56, d.y + 4, { width: d.page.width - 112 }); d.moveDown(0.6)

  h2(d, 'Duas frentes, uma equipe')
  p(d, 'CONSULTORIA SST PERSONALIZADA', { bold: true })
  bullet(d, 'Todos os portes e níveis de complexidade (GR1 a GR4): indústria, construção, saúde, serviços')
  bullet(d, 'PGR, PCMSO, LTCAT, laudos de insalubridade/periculosidade, treinamentos em NRs, riscos psicossociais (nova NR-1)')
  bullet(d, 'Documentação elaborada e assinada por profissionais legalmente habilitados')
  p(d, 'SUBLIME DIGITAL — para empresas GR1 com até 20 funcionários CLT', { bold: true })
  bullet(d, 'Contratação, gestão e documentos 100% online — sem visita presencial')
  bullet(d, 'PGR + PCMSO com médico coordenador na implantação; gestão eSocial SST (S-2210/2220/2240)')
  bullet(d, 'Portal do cliente com documentos, alertas de vencimento e monitoramento de exames')
  bullet(d, 'Contrato com aceite eletrônico auditável (data, IP e registro criptográfico)')

  h2(d, 'Planos do Sublime Digital (mensalidade por faixa de funcionários)')
  tabela(d, ['Faixa', 'Digital Essencial', 'Digital Premium'], [
    ['1 a 5 funcionários', 'R$ 199/mês', 'R$ 299/mês'],
    ['6 a 10 funcionários', 'R$ 320/mês', 'R$ 490/mês'],
    ['11 a 20 funcionários', 'R$ 490/mês', 'R$ 690/mês'],
  ], [161, 161, 161])
  p(d, 'Premium adiciona: PPP de novos funcionários, abertura de CAT (1/mês), relatório analítico semestral e suporte via WhatsApp em até 24h úteis. Implantação a partir de R$ 149 (condição promocional de 24h após o teste de elegibilidade).')

  h2(d, 'Por que agora')
  bullet(d, 'PGR e PCMSO são obrigatórios para toda empresa com funcionário CLT — a ausência sujeita a autuação e multa')
  bullet(d, 'Os eventos de SST do eSocial são obrigatórios e a omissão fica registrada no sistema do governo')
  bullet(d, 'Sem documentação de SST, a empresa fica sem defesa documental em ações trabalhistas')

  h2(d, 'Como contratar')
  bullet(d, 'Digital: teste de elegibilidade gratuito (2 min) em sublimesst.com/elegibilidade')
  bullet(d, 'Consultoria: orçamento em sublimesst.com/consultoria-sst — retorno em até 1 dia útil')
  bullet(d, 'Programa de parceiros para contadores e consultores: comissão de 10% × até 12 meses — sublimesst.com/parceiros')

  d.moveDown(1.2)
  const boxY = d.y
  d.rect(56, boxY, d.page.width - 112, 46).fill('#e0f5f2')
  d.fillColor(PETROL).font('Helvetica-Bold').fontSize(9.5)
    .text('SUBLIME SEGURANCA E SAUDE OCUPACIONAL LTDA · CNPJ 65.051.167/0001-27', 68, boxY + 9, { width: d.page.width - 136 })
  d.fillColor(GRAY).font('Helvetica').fontSize(8.5)
    .text('Av. Ataulfo de Paiva, 1235, Sala 303 — Leblon, Rio de Janeiro/RJ · (21) 99724-8630 · contato@sublimesst.com · sublimesst.com', 68, boxY + 25, { width: d.page.width - 136 })
  d.end()
  console.log('OK pdf: Apresentacao_Sublime_SST.pdf')
}
