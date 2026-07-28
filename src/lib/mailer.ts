// ═══════════════════════════════════════════════════════════
// SUBLIME SST — Notificações por e-mail
// Suporta dois provedores:
//   1. Resend (recomendado) — configure RESEND_API_KEY
//   2. SMTP/Gmail           — configure SMTP_HOST + SMTP_USER + SMTP_PASS
// ═══════════════════════════════════════════════════════════

import { PRICING, LTCAT_ADDON_PRICE_CENTS, type FaixaKey } from './pricing'

const NOTIFY = process.env.EMAIL_NOTIFY ?? 'contato@sublimesst.com'
const FROM   = process.env.EMAIL_FROM   ?? 'Sublime SST <onboarding@resend.dev>'

interface Attachment {
  filename: string
  content: Buffer   // base64 feito internamente
}

// ── ENVIO (tenta Resend primeiro, depois SMTP) ────────────
async function sendEmail(
  to: string,
  subject: string,
  html: string,
  attachments?: Attachment[],
) {
  // Opção 1: Resend
  if (process.env.RESEND_API_KEY) {
    const body: Record<string, unknown> = { from: FROM, to, subject, html }
    if (attachments?.length) {
      body.attachments = attachments.map(a => ({
        filename: a.filename,
        content: a.content.toString('base64'),
      }))
    }
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(`Resend error: ${JSON.stringify(err)}`)
    }
    return
  }

  // Opção 2: SMTP / Gmail
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const nodemailer = await import('nodemailer')
    const transport = nodemailer.default.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
    await transport.sendMail({
      from: FROM, to, subject, html,
      attachments: attachments?.map(a => ({ filename: a.filename, content: a.content })),
    })
    return
  }

  console.log('[MAILER] Nenhum provedor configurado — e-mail ignorado')
  console.log('[MAILER] Configure RESEND_API_KEY ou SMTP_HOST/USER/PASS')
}

// ── ESCAPE HTML ────────────────────────────────────────────
// Só para valores dinâmicos potencialmente digitados pelo usuário (nome,
// razão social, motivo, descrição etc.) — nunca para a estrutura fixa dos
// templates abaixo. Ordem importa: & primeiro, senão as entidades inseridas
// pelas trocas seguintes seriam escapadas de novo.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ── TEMPLATE BASE (table-based para compatibilidade com clientes de e-mail) ──
function baseHtml(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f6f8;padding:32px 16px">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:10px;border:1px solid #e2e8f0">
      <!-- Header -->
      <tr>
        <td style="background:#0d4a5c;border-radius:10px 10px 0 0;padding:20px 28px">
          <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff">🏢 Sublime SST</p>
          <p style="margin:4px 0 0;font-size:13px;color:#a0cdd8">${title}</p>
        </td>
      </tr>
      <!-- Body -->
      <tr>
        <td style="padding:28px">
          ${body}
        </td>
      </tr>
      <!-- Footer -->
      <tr>
        <td style="padding:16px 28px;border-top:1px solid #f0f4f8;text-align:center;font-size:12px;color:#94a3b8;border-radius:0 0 10px 10px">
          Sistema automático · Sublime SST · contato@sublimesst.com
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body></html>`
}

function row(label: string, value: string) {
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-bottom:1px solid #f0f4f8">
    <tr>
      <td style="padding:9px 0;font-size:14px;color:#64748b;font-weight:500">${label}</td>
      <td style="padding:9px 0;font-size:14px;color:#1e293b;font-weight:600;text-align:right">${value}</td>
    </tr>
  </table>`
}

function cta(href: string, label: string) {
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px">
    <tr>
      <td align="center">
        <a href="${href}" style="display:inline-block;background:#1a9e8c;color:#ffffff;text-align:center;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">${label}</a>
      </td>
    </tr>
  </table>`
}

function badge(text: string, bg: string, color: string) {
  return `<span style="display:inline-block;padding:4px 12px;border-radius:100px;font-size:12px;font-weight:700;background:${bg};color:${color}">${text}</span>`
}

// ── NOTIFICAÇÕES ──────────────────────────────────────────
export async function notifyNewLead(data: {
  name: string; email: string; whatsapp: string; cnpj: string; companyName: string
}) {
  const waLink = `https://wa.me/55${data.whatsapp.replace(/\D/g, '')}`
  await sendEmail(NOTIFY, `🆕 Novo lead: ${data.companyName}`,
    baseHtml('Novo lead capturado no teste de elegibilidade',
      row('Empresa', escapeHtml(data.companyName)) +
      row('CNPJ', escapeHtml(data.cnpj)) +
      row('Responsável', escapeHtml(data.name)) +
      row('E-mail', escapeHtml(data.email)) +
      row('WhatsApp', escapeHtml(data.whatsapp)) +
      cta(waLink, '💬 Falar no WhatsApp agora')
    )
  ).catch(err => console.error('[MAILER] notifyNewLead:', err))
}

export async function notifyEligibleResult(data: {
  name: string; email: string; whatsapp: string; companyName: string; cnpj: string
  cnae: string; employees: string; planLabel: string; planMonthly: number
}) {
  const waLink = `https://wa.me/55${data.whatsapp.replace(/\D/g, '')}`
  const monthly = `R$ ${(data.planMonthly / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  await sendEmail(NOTIFY, `✅ Empresa ELEGÍVEL: ${data.companyName}`,
    baseHtml('Empresa aprovada no modelo digital!',
      `<div style="margin-bottom:14px">` + badge('✅ ELEGÍVEL', '#dcfce7', '#15803d') + `</div>` +
      row('Empresa', escapeHtml(data.companyName)) +
      row('CNPJ', escapeHtml(data.cnpj)) +
      row('Responsável', escapeHtml(data.name)) +
      row('WhatsApp', escapeHtml(data.whatsapp)) +
      row('CNAE', escapeHtml(data.cnae)) +
      row('Funcionários', data.employees) +
      row('Parcela mensal', `<span style="color:#1a9e8c;font-size:16px;font-weight:700">${monthly}/mês</span>`) +
      cta(waLink, '💬 Entrar em contato agora')
    )
  ).catch(err => console.error('[MAILER] notifyEligibleResult:', err))
}

export async function notifyBackofficeResult(data: {
  name: string; email: string; whatsapp: string; companyName: string; cnpj: string
  cnae: string; employees: string; reasons: string[]
}) {
  const waLink = `https://wa.me/55${data.whatsapp.replace(/\D/g, '')}`
  const reasonsHtml = data.reasons.map(r =>
    `<p style="margin:4px 0;font-size:13px;color:#854d0e">⚠️ ${r}</p>`
  ).join('')
  await sendEmail(NOTIFY, `🔍 Análise necessária: ${data.companyName}`,
    baseHtml('Empresa encaminhada para análise personalizada',
      `<div style="margin-bottom:14px">` + badge('🔍 ANÁLISE PERSONALIZADA', '#fef9c3', '#854d0e') + `</div>` +
      row('Empresa', escapeHtml(data.companyName)) +
      row('CNPJ', escapeHtml(data.cnpj)) +
      row('Responsável', escapeHtml(data.name)) +
      row('WhatsApp', escapeHtml(data.whatsapp)) +
      row('CNAE', escapeHtml(data.cnae)) +
      `<div style="background:#fef9c3;border-radius:8px;padding:12px 14px;margin:12px 0">
        <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#854d0e">Motivos:</p>
        ${reasonsHtml}
      </div>` +
      cta(waLink, '💬 Entrar em contato para análise')
    )
  ).catch(err => console.error('[MAILER] notifyBackofficeResult:', err))
}

export async function notifyConsultancyRequest(data: {
  name: string; company: string; email: string; whatsapp: string; description: string
}) {
  const waLink = `https://wa.me/55${data.whatsapp.replace(/\D/g, '')}`
  await sendEmail(NOTIFY, `📋 Orçamento solicitado: ${data.company}`,
    baseHtml('Nova solicitação de orçamento de Consultoria SST',
      `<div style="margin-bottom:14px">` + badge('📋 CONSULTORIA SST', '#dbeafe', '#1e40af') + `</div>` +
      row('Nome', escapeHtml(data.name)) +
      row('Empresa', escapeHtml(data.company)) +
      row('E-mail', escapeHtml(data.email)) +
      row('WhatsApp', escapeHtml(data.whatsapp)) +
      `<div style="background:#f1f5f9;border-radius:8px;padding:12px 14px;margin:12px 0">
        <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#334155">Descrição da necessidade:</p>
        <p style="margin:0;font-size:13px;color:#334155">${escapeHtml(data.description)}</p>
      </div>` +
      cta(waLink, '💬 Responder no WhatsApp')
    )
  ).catch(err => console.error('[MAILER] notifyConsultancyRequest:', err))
}

export async function sendMagicLink(data: {
  to: string; companyName: string; link: string
  portal?: 'cliente' | 'parceiro'
}) {
  const isParceiro = data.portal === 'parceiro'
  const portalTitle = isParceiro ? 'Acesso ao Portal do Parceiro' : 'Acesso ao Portal do Cliente'
  const intro = isParceiro
    ? `Olá, <strong>${escapeHtml(data.companyName)}</strong>! Aqui está seu acesso ao Portal do Parceiro,
       onde você acompanha suas indicações e comissões.`
    : `Olá! Aqui está seu acesso ao portal da <strong>${escapeHtml(data.companyName)}</strong>,
       onde ficam seus documentos e o acompanhamento do seu plano.`
  await sendEmail(data.to, `Seu link de acesso — Sublime SST`,
    baseHtml(portalTitle,
      `<p style="font-size:15px;color:#334155;margin:0 0 8px">${intro}</p>
      <p style="font-size:13px;color:#64748b;margin:0 0 20px">
        Por segurança, o link vale por <strong>15 minutos</strong> e só pode ser usado uma vez.
        Se expirar, é só pedir um novo na página de login.
      </p>` +
      cta(data.link, '🔐 Acessar meu portal') +
      `<p style="font-size:12px;color:#94a3b8;margin:16px 0 0;text-align:center">
        Não foi você que pediu este acesso? Pode ignorar este e-mail com tranquilidade — ninguém entra sem ele.
      </p>`
    )
  ).catch(err => console.error('[MAILER] sendMagicLink:', err))
}

// Faixa de funcionários a partir da contagem real — mesma fonte única
// (pricing.ts) usada no cadastro, nunca a tabela Plan legada (que tinha
// preços desatualizados, ver fix do portal do cliente/admin).
function faixaKeyFromCount(n: number): FaixaKey {
  if (n <= 5) return '1-5'
  if (n <= 10) return '6-10'
  return '11-20'
}

function formatBRL(cents: number): string {
  return `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
}

export async function sendWelcomeEmail(data: {
  to: string; companyName: string; responsavel: string; loginUrl: string
  planType?: string
  numFuncionarios: number
  implantacaoValor: number   // centavos — snapshot já cobrado (Company.implantacaoValor), nunca recalculado
  mensalidadeValor: number   // centavos — snapshot já cobrado (Company.mensalidadeValor), nunca recalculado
  ltcatAddon: boolean
  contractPdf?: Buffer
}) {
  const isPremium = data.planType === 'premium'
  const planKey = isPremium ? 'premium' : 'essencial'
  const planName = isPremium ? 'Digital Premium' : 'Digital Essencial'
  const planColor = isPremium ? '#1e40af' : '#0d4a5c'
  const planBg    = isPremium ? '#dbeafe' : '#e0f2fe'
  const faixaLabel = PRICING[planKey].faixas[faixaKeyFromCount(data.numFuncionarios)].label

  // LTCAT só é tratado como adicional contratado no Essencial. No Premium o
  // LTCAT já é incluso (PRICING.premium.ltcatIncluido) — por instrução
  // explícita, preferimos NÃO mencionar LTCAT no Premium nesta etapa, para
  // não gerar comunicação ambígua (parece cobrança extra sem ser).
  const showLtcatAddon = !isPremium && data.ltcatAddon

  const implantacaoTotalFmt = formatBRL(data.implantacaoValor)
  const mensalidadeFmt = formatBRL(data.mensalidadeValor)

  const resumoHtml = showLtcatAddon
    ? (() => {
        const ltcatFmt = formatBRL(LTCAT_ADDON_PRICE_CENTS)
        const baseFmt = formatBRL(data.implantacaoValor - LTCAT_ADDON_PRICE_CENTS)
        return `
          <p style="margin:0;font-size:13px;color:#334155;line-height:1.8">
            Implantação: ${baseFmt}<br>
            LTCAT (adicional contratado): ${ltcatFmt}<br>
            <strong>Total da implantação: ${implantacaoTotalFmt}</strong>
          </p>`
      })()
    : `<p style="margin:0;font-size:13px;color:#334155">Implantação: ${implantacaoTotalFmt}</p>`

  await sendEmail(data.to, `Bem-vindo(a) ao Sublime Digital! 🎉`,
    baseHtml('Pagamento confirmado — próximos passos',
      `<p style="font-size:15px;color:#334155;margin:0 0 12px">
        Olá, <strong>${escapeHtml(data.responsavel)}</strong>!<br><br>
        Recebemos o pagamento da implantação da <strong>${escapeHtml(data.companyName)}</strong> — obrigado pela confiança!
        A partir de agora, a regularização da sua empresa em segurança do trabalho está em nossas mãos.
      </p>
      <div style="background:${planBg};border-radius:8px;padding:10px 14px;margin-bottom:16px">
        <span style="font-size:13px;font-weight:700;color:${planColor}">Plano contratado: ${planName} · ${faixaLabel}</span>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border-radius:10px;margin-bottom:16px">
        <tr><td style="padding:14px 18px">
          <p style="margin:0 0 8px;font-weight:700;color:#0d4a5c;font-size:14px">💰 Resumo do valor pago</p>
          ${resumoHtml}
          <p style="margin:8px 0 0;font-size:13px;color:#334155">Mensalidade: ${mensalidadeFmt}/mês</p>
        </td></tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0fdf9;border-radius:10px;margin-bottom:16px">
        <tr><td style="padding:16px 18px">
          <p style="margin:0 0 10px;font-weight:700;color:#0d4a5c;font-size:14px">📋 O que acontece agora — só falta 1 passo seu:</p>
          <p style="margin:0;font-size:13px;color:#334155;line-height:2">
            1. <strong>Você:</strong> preencha o formulário de dados no portal (leva menos de 5 minutos)<br>
            2. <strong>Nossa equipe:</strong> elabora os documentos obrigatórios da sua empresa —
               o PGR (mapa dos riscos do ambiente de trabalho) e o PCMSO (programa de saúde dos funcionários)<br>
            3. Em até <strong>5 dias úteis</strong> após o preenchimento, tudo fica disponível no seu portal<br>
            4. Avisamos por e-mail assim que os documentos estiverem prontos
          </p>
        </td></tr>
      </table>
      <p style="font-size:12px;color:#94a3b8;margin:0 0 16px">
        Seu contrato assinado está anexo a este e-mail e também fica disponível no portal.
        Qualquer dúvida, é só responder este e-mail ou chamar no WhatsApp
        <a href="https://wa.me/5521997248630" style="color:#1a9e8c">(21) 99724-8630</a>.
      </p>` +
      cta(data.loginUrl, '📋 Preencher meus dados agora')
    ),
    data.contractPdf
      ? [{ filename: 'Contrato_Sublime_Digital.pdf', content: data.contractPdf }]
      : undefined,
  ).catch(err => console.error('[MAILER] sendWelcomeEmail:', err))
}

export async function sendOnboardingReminder(data: {
  to: string; responsavel: string; companyName: string; loginUrl: string
}) {
  await sendEmail(data.to, `Falta pouco: precisamos dos seus dados para começar`,
    baseHtml('Seus documentos estão aguardando você',
      `<p style="font-size:15px;color:#334155;margin:0 0 16px">
        Olá, <strong>${escapeHtml(data.responsavel)}</strong>! Seu pagamento já foi confirmado e nossa equipe está
        pronta para elaborar os documentos da <strong>${escapeHtml(data.companyName)}</strong> — mas ainda falta
        um passo seu: o preenchimento dos dados da empresa e dos funcionários.
      </p>
      <p style="font-size:14px;color:#334155;margin:0 0 8px">
        Leva menos de 5 minutos, e é o que nos permite começar. O prazo de entrega
        (até 5 dias úteis) só começa a contar depois desse preenchimento.
      </p>
      <p style="font-size:13px;color:#64748b;margin:0 0 20px">
        Ficou com dúvida em algum campo? Chame a gente no WhatsApp
        <a href="https://wa.me/5521997248630" style="color:#1a9e8c">(21) 99724-8630</a> que ajudamos na hora.
      </p>` +
      cta(data.loginUrl, '📋 Preencher dados agora')
    )
  ).catch(err => console.error('[MAILER] sendOnboardingReminder:', err))
}

export async function sendPaymentReminder(data: {
  to: string; responsavel: string; companyName: string; checkoutUrl: string; amount: number
}) {
  const value = `R$ ${(data.amount / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  await sendEmail(data.to, `Seu cadastro está quase completo — Sublime Digital`,
    baseHtml('Só falta o pagamento para começarmos',
      `<p style="font-size:15px;color:#334155;margin:0 0 16px">
        Olá, <strong>${escapeHtml(data.responsavel)}</strong>! O cadastro da <strong>${escapeHtml(data.companyName)}</strong> está
        pronto — falta apenas confirmar o pagamento da implantação (${value}) para
        nossa equipe começar a elaborar seus documentos.
      </p>
      <p style="font-size:14px;color:#334155;margin:0 0 8px">
        O pagamento é feito em ambiente seguro (Asaas), com opção de PIX, boleto ou cartão.
        Assim que confirmado, damos início imediato ao trabalho.
      </p>
      <p style="font-size:13px;color:#64748b;margin:0 0 20px">
        Teve algum problema no pagamento ou ficou com dúvida sobre o plano?
        Fale com a gente no WhatsApp <a href="https://wa.me/5521997248630" style="color:#1a9e8c">(21) 99724-8630</a>.
      </p>` +
      cta(data.checkoutUrl, '💳 Concluir pagamento agora')
    )
  ).catch(err => console.error('[MAILER] sendPaymentReminder:', err))
}

export async function notifyNewPartner(data: {
  name: string; office: string; email: string; whatsapp: string
  city: string; state: string; clientsEstimate?: number | null
  hasReferral: boolean; referralCompany?: string
}) {
  const waLink = `https://wa.me/55${data.whatsapp.replace(/\D/g, '')}`
  await sendEmail(NOTIFY, `🤝 Novo parceiro: ${data.name} — ${data.office}`,
    baseHtml('Novo parceiro cadastrado no programa',
      `<div style="margin-bottom:14px">` + badge('🤝 NOVO PARCEIRO', '#dbeafe', '#1e40af') + `</div>` +
      row('Nome', escapeHtml(data.name)) +
      row('Escritório', escapeHtml(data.office)) +
      row('E-mail', escapeHtml(data.email)) +
      row('WhatsApp', escapeHtml(data.whatsapp)) +
      row('Cidade/UF', `${escapeHtml(data.city)}/${escapeHtml(data.state)}`) +
      (data.clientsEstimate ? row('Clientes aprox.', String(data.clientsEstimate)) : '') +
      (data.hasReferral ? row('Indicação', escapeHtml(data.referralCompany ?? 'Sim')) : '') +
      cta(waLink, '💬 Contatar parceiro no WhatsApp')
    )
  ).catch(err => console.error('[MAILER] notifyNewPartner:', err))
}

export async function notifyPaymentConfirmed(data: {
  companyName: string; cnpj: string; tipo: string; valorCentavos: number; planType?: string | null
}) {
  const valor = `R$ ${(data.valorCentavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  const tipoLabel = data.tipo === 'implantacao' ? 'Implantação' : 'Mensalidade'
  await sendEmail(NOTIFY, `💰 Pagamento confirmado: ${data.companyName} (${tipoLabel} ${valor})`,
    baseHtml('Pagamento confirmado',
      `<div style="margin-bottom:14px">` + badge('💰 PAGAMENTO CONFIRMADO', '#dcfce7', '#15803d') + `</div>` +
      row('Empresa', escapeHtml(data.companyName)) +
      row('CNPJ', escapeHtml(data.cnpj)) +
      row('Tipo', tipoLabel) +
      row('Valor', `<span style="color:#15803d;font-weight:700">${valor}</span>`) +
      (data.planType ? row('Plano', data.planType) : '') +
      `<p style="font-size:13px;color:#64748b;margin:14px 0 0">
        ${data.tipo === 'implantacao'
          ? 'Cliente entra em onboarding — acompanhe o preenchimento e o início da produção no admin.'
          : 'Mensalidade recorrente registrada.'}
      </p>`
    )
  ).catch(err => console.error('[MAILER] notifyPaymentConfirmed:', err))
}

export async function notifyPaymentOverdue(data: {
  companyName: string; cnpj: string; tipo: string; valorCentavos: number
}) {
  const valor = `R$ ${(data.valorCentavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  await sendEmail(NOTIFY, `🔴 Inadimplência: ${data.companyName} (${valor})`,
    baseHtml('Pagamento vencido sem confirmação',
      `<div style="margin-bottom:14px">` + badge('🔴 INADIMPLENTE', '#fee2e2', '#b91c1c') + `</div>` +
      row('Empresa', escapeHtml(data.companyName)) +
      row('CNPJ', escapeHtml(data.cnpj)) +
      row('Tipo', data.tipo === 'implantacao' ? 'Implantação' : 'Mensalidade') +
      row('Valor', `<span style="color:#b91c1c;font-weight:700">${valor}</span>`) +
      `<p style="font-size:13px;color:#64748b;margin:14px 0 0">
        ${data.tipo === 'mensalidade'
          ? 'A empresa foi marcada como inadimplente no pipeline. Comissões de parceiro não são geradas para valores não pagos.'
          : 'Implantação vencida — o cliente ainda não iniciou. O cron de lembrete de pagamento segue ativo.'}
      </p>`
    )
  ).catch(err => console.error('[MAILER] notifyPaymentOverdue:', err))
}

// ATENÇÃO: propaga erros (sem catch interno) — o chamador precisa saber se o
// aviso à equipe realmente saiu. Uma falha de assinatura já é grave; se o
// e-mail que avisa disso também falhar silenciosamente, ninguém fica sabendo
// que a assinatura precisa ser criada manualmente.
export async function notifySubscriptionFailed(data: {
  companyName: string; cnpj: string; companyId: string; error: string
}) {
  await sendEmail(NOTIFY, `🔴 Assinatura Asaas falhou: ${data.companyName}`,
    baseHtml('Assinatura recorrente não foi criada',
      `<div style="margin-bottom:14px">` + badge('🔴 AÇÃO MANUAL NECESSÁRIA', '#fee2e2', '#b91c1c') + `</div>` +
      row('Empresa', escapeHtml(data.companyName)) +
      row('CNPJ', escapeHtml(data.cnpj)) +
      row('ID interno', data.companyId) +
      `<p style="font-size:13px;color:#64748b;margin:14px 0 0">
        A cobrança de implantação foi criada normalmente, mas a assinatura recorrente
        (mensalidade) falhou:<br><code style="font-size:12px;color:#b91c1c">${escapeHtml(data.error)}</code>
        <br><br>Crie a assinatura manualmente no painel da Asaas para este cliente.
      </p>`
    )
  )
}

// Alerta interno de falha na geração do PDF do contrato — o webhook de
// pagamento segue resiliente (o e-mail de boas-vindas sai mesmo sem anexo),
// mas sem este alerta a única forma de descobrir a falha era auditar
// Company.contractHash manualmente. Não bloqueia o chamador: falhas de envio
// aqui só viram log, nunca exceção propagada.
function maskRazaoSocial(nome: string): string {
  const partes = nome.trim().split(/\s+/)
  if (partes.length <= 1) return nome.slice(0, 3) + '***'
  return partes[0] + ' ' + partes.slice(1).map(p => p[0] + '***').join(' ')
}

export async function notifyContractPdfFailed(data: {
  companyId: string; companyName: string; errorName: string; errorMessage: string
}) {
  await sendEmail(NOTIFY, `🔴 Falha ao gerar PDF do contrato: ${maskRazaoSocial(data.companyName)}`,
    baseHtml('Contrato não anexado ao e-mail de boas-vindas',
      `<div style="margin-bottom:14px">` + badge('🔴 AÇÃO MANUAL NECESSÁRIA', '#fee2e2', '#b91c1c') + `</div>` +
      row('Empresa', escapeHtml(maskRazaoSocial(data.companyName))) +
      row('ID interno', data.companyId) +
      row('Erro', escapeHtml(data.errorName)) +
      `<p style="font-size:13px;color:#64748b;margin:14px 0 0">
        O pagamento da implantação foi confirmado normalmente e o e-mail de boas-vindas
        foi enviado, mas <strong>sem o PDF do contrato anexado</strong>:<br>
        <code style="font-size:12px;color:#b91c1c">${escapeHtml(data.errorMessage.slice(0, 300))}</code>
        <br><br>Gere o contrato manualmente para este cliente e reenvie por fora do sistema.
      </p>`
    )
  ).catch(err => console.error('[MAILER] notifyContractPdfFailed:', err))
}

export async function notifyOnboardingSubmitted(data: {
  companyName: string; cnpj: string; numFuncionarios: number; cargos?: string | null
}) {
  await sendEmail(NOTIFY, `📋 Onboarding preenchido: ${data.companyName}`,
    baseHtml('Cliente preencheu o onboarding — produção pode começar',
      `<div style="margin-bottom:14px">` + badge('📋 ONBOARDING COMPLETO', '#dbeafe', '#1e40af') + `</div>` +
      row('Empresa', escapeHtml(data.companyName)) +
      row('CNPJ', escapeHtml(data.cnpj)) +
      row('Funcionários', String(data.numFuncionarios)) +
      (data.cargos ? row('Cargos', escapeHtml(data.cargos)) : '') +
      `<p style="font-size:13px;color:#64748b;margin:14px 0 0">
        Os dados para elaboração do PGR/PCMSO estão disponíveis. Inicie a produção dos documentos
        e atualize o checklist no admin.
      </p>`
    )
  ).catch(err => console.error('[MAILER] notifyOnboardingSubmitted:', err))
}

// ATENÇÃO: esta função PROPAGA erros (sem catch interno) — o chamador precisa
// de try/catch. Assim a rota de ativação sabe se o e-mail realmente saiu.
export async function sendPartnerActivated(data: {
  to: string; name: string; code: string
}) {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://sublimesst.com'
  const refUrl = `${base}/elegibilidade?ref=${data.code}`
  const loginUrl = `${base}/parceiro/login`
  const termsUrl = `${base}/termos-parceria`
  await sendEmail(data.to, `Sua parceria com a Sublime SST está ativa! 🤝`,
    baseHtml('Bem-vindo(a) ao programa de parceiros',
      `<p style="font-size:15px;color:#334155;margin:0 0 12px">
        Olá, <strong>${escapeHtml(data.name)}</strong>! Seu cadastro no programa de parceiros da Sublime SST
        foi aprovado — seja muito bem-vindo(a)! 🎉
      </p>
      <p style="font-size:14px;color:#334155;margin:0 0 16px">
        Sua parceria é importante para nós: juntos, ajudamos pequenas empresas a se regularizarem
        em segurança do trabalho — e você é remunerado de forma recorrente por cada cliente que indicar.
      </p>
      <div style="background:#f0fdf9;border-radius:10px;padding:14px 16px;margin-bottom:16px">
        <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#0d4a5c;text-transform:uppercase;letter-spacing:.5px">Seu link de indicação exclusivo</p>
        <p style="margin:0 0 8px;font-size:13px;font-family:monospace;color:#1a9e8c;word-break:break-all">${refUrl}</p>
        <p style="margin:0;font-size:12px;color:#64748b">
          <strong>Use sempre este link</strong> ao indicar clientes: é ele que garante o vínculo
          da indicação a você — e, portanto, suas comissões. Toda empresa que acessar o teste por
          ele fica registrada como indicação sua, mesmo que só contrate depois.
        </p>
      </div>
      <p style="font-size:14px;color:#334155;margin:0 0 6px"><strong>Seu primeiro acesso, em 3 passos:</strong></p>
      <p style="font-size:13px;color:#334155;margin:0 0 16px;line-height:1.9">
        1. Acesse o Portal do Parceiro pelo botão abaixo<br>
        2. Informe este e-mail (<strong>${escapeHtml(data.to)}</strong>) — sem senha: você recebe um link de entrada por e-mail a cada acesso<br>
        3. No portal: suas indicações, o extrato de comissões (10% de cada mensalidade, por até 12 meses por cliente) e textos prontos de divulgação
      </p>` +
      cta(loginUrl, '🔑 Acessar o Portal do Parceiro') +
      `<p style="font-size:12px;color:#94a3b8;margin:16px 0 0;text-align:center">
        As condições do programa estão no <a href="${termsUrl}" style="color:#1a9e8c">Termo de Parceria</a> aceito no seu cadastro.<br>
        Dúvidas? Chame a gente no WhatsApp: (21) 99724-8630
      </p>`
    )
  )
}

// ATENÇÃO: propaga erros (sem catch interno) — o chamador precisa saber se o
// e-mail realmente saiu, para reportar `emailSent` na resposta da rota.
export async function sendCancellationConfirmedClient(data: {
  to: string; responsavel: string; companyName: string; requestedAt: Date; reason: string
}) {
  const dataStr = data.requestedAt.toLocaleDateString('pt-BR')
  await sendEmail(data.to, `Cancelamento confirmado — ${data.companyName}`,
    baseHtml('Cancelamento do contrato confirmado',
      `<p style="font-size:15px;color:#334155;margin:0 0 12px">
        Olá, <strong>${escapeHtml(data.responsavel)}</strong>. Confirmamos o cancelamento do contrato da
        <strong>${escapeHtml(data.companyName)}</strong> com a Sublime SST, conforme solicitado.
      </p>` +
      row('Data do pedido', dataStr) +
      row('Motivo informado', escapeHtml(data.reason)) +
      `<p style="font-size:13px;color:#64748b;margin:16px 0 0">
        Eventuais valores pendentes seguem as condições da Cláusula 5ª do contrato aceito no cadastro.
        Qualquer dúvida, fale com a gente no WhatsApp
        <a href="https://wa.me/5521997248630" style="color:#1a9e8c">(21) 99724-8630</a>.
      </p>`
    )
  )
}

// ATENÇÃO: propaga erros (sem catch interno) — mesmo motivo da função acima.
export async function notifyPartnerCompanyCancelled(data: {
  to: string; partnerName: string; companyName: string
}) {
  await sendEmail(data.to, `Contrato cancelado: ${data.companyName}`,
    baseHtml('Cliente indicado cancelou o contrato',
      `<p style="font-size:15px;color:#334155;margin:0 0 12px">
        Olá, <strong>${escapeHtml(data.partnerName)}</strong>. A empresa <strong>${escapeHtml(data.companyName)}</strong>,
        indicada por você, cancelou o contrato com a Sublime SST.
      </p>
      <p style="font-size:13px;color:#64748b;margin:0 0 16px">
        Comissões já liberadas ou pagas referentes a essa empresa permanecem devidas.
        Não serão geradas novas comissões a partir de agora.
      </p>`
    )
  )
}

export async function sendDocumentExpiryAlert(data: {
  to: string; responsavel: string; companyName: string
  documents: { nome: string; vencimento: Date; diasRestantes: number }[]
  loginUrl: string
}) {
  const docsHtml = data.documents.map(d => {
    const urgency = d.diasRestantes <= 7 ? '#dc2626' : d.diasRestantes <= 30 ? '#d97706' : '#0d4a5c'
    const vencStr = d.vencimento.toLocaleDateString('pt-BR')
    return `<tr>
      <td style="padding:8px 0;font-size:13px;color:#334155;border-bottom:1px solid #f0f4f8">${d.nome}</td>
      <td style="padding:8px 0;font-size:13px;text-align:right;border-bottom:1px solid #f0f4f8">
        <span style="color:${urgency};font-weight:700">${vencStr} (${d.diasRestantes}d)</span>
      </td>
    </tr>`
  }).join('')

  await sendEmail(data.to, `⚠️ Documentos a vencer — ${data.companyName}`,
    baseHtml('Hora de renovar seus documentos',
      `<p style="font-size:15px;color:#334155;margin:0 0 8px">
        Olá, <strong>${escapeHtml(data.responsavel)}</strong>! Alguns documentos da <strong>${escapeHtml(data.companyName)}</strong>
        estão chegando perto do vencimento.
      </p>
      <p style="font-size:13px;color:#64748b;margin:0 0 16px">
        Documentos vencidos deixam a empresa exposta a multas em caso de fiscalização —
        por isso avisamos com antecedência para renovar sem correria.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px">
        <tr>
          <th style="text-align:left;font-size:11px;color:#94a3b8;text-transform:uppercase;padding-bottom:6px">Documento</th>
          <th style="text-align:right;font-size:11px;color:#94a3b8;text-transform:uppercase;padding-bottom:6px">Vencimento</th>
        </tr>
        ${docsHtml}
      </table>
      <p style="font-size:13px;color:#64748b;margin:0 0 20px">
        Entre em contato com nossa equipe para agendar a renovação ou acesse o portal para mais informações.
      </p>` +
      cta(data.loginUrl, '📋 Acessar portal do cliente')
    )
  ).catch(err => console.error('[MAILER] sendDocumentExpiryAlert:', err))
}
