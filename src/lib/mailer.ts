// ═══════════════════════════════════════════════════════════
// SUBLIME SST — Notificações por e-mail
// Suporta dois provedores:
//   1. Resend (recomendado) — configure RESEND_API_KEY
//   2. SMTP/Gmail           — configure SMTP_HOST + SMTP_USER + SMTP_PASS
// ═══════════════════════════════════════════════════════════

const NOTIFY = process.env.EMAIL_NOTIFY ?? 'contato@sublimesst.com'
const FROM   = process.env.EMAIL_FROM   ?? 'Sublime SST <onboarding@resend.dev>'

// ── ENVIO (tenta Resend primeiro, depois SMTP) ────────────
async function sendEmail(to: string, subject: string, html: string) {
  // Opção 1: Resend (mais simples, recomendado)
  if (process.env.RESEND_API_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({ from: FROM, to, subject, html }),
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
    await transport.sendMail({ from: FROM, to, subject, html })
    return
  }

  console.log('[MAILER] Nenhum provedor configurado — e-mail ignorado')
  console.log('[MAILER] Configure RESEND_API_KEY ou SMTP_HOST/USER/PASS')
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
      row('Empresa', data.companyName) +
      row('CNPJ', data.cnpj) +
      row('Responsável', data.name) +
      row('E-mail', data.email) +
      row('WhatsApp', data.whatsapp) +
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
      row('Empresa', data.companyName) +
      row('CNPJ', data.cnpj) +
      row('Responsável', data.name) +
      row('WhatsApp', data.whatsapp) +
      row('CNAE', data.cnae) +
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
      row('Empresa', data.companyName) +
      row('CNPJ', data.cnpj) +
      row('Responsável', data.name) +
      row('WhatsApp', data.whatsapp) +
      row('CNAE', data.cnae) +
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
      row('Nome', data.name) +
      row('Empresa', data.company) +
      row('E-mail', data.email) +
      row('WhatsApp', data.whatsapp) +
      `<div style="background:#f1f5f9;border-radius:8px;padding:12px 14px;margin:12px 0">
        <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#334155">Descrição da necessidade:</p>
        <p style="margin:0;font-size:13px;color:#334155">${data.description}</p>
      </div>` +
      cta(waLink, '💬 Responder no WhatsApp')
    )
  ).catch(err => console.error('[MAILER] notifyConsultancyRequest:', err))
}

export async function sendMagicLink(data: {
  to: string; companyName: string; link: string
}) {
  await sendEmail(data.to, `Seu link de acesso — Sublime SST`,
    baseHtml('Acesso ao Portal do Cliente',
      `<p style="font-size:15px;color:#334155;margin:0 0 20px">
        Olá! Clique no botão abaixo para acessar o portal da <strong>${data.companyName}</strong>.<br>
        O link expira em <strong>15 minutos</strong> e é de uso único.
      </p>` +
      cta(data.link, '🔐 Acessar meu portal') +
      `<p style="font-size:12px;color:#94a3b8;margin:16px 0 0;text-align:center">
        Se você não solicitou esse acesso, ignore este e-mail.
      </p>`
    )
  ).catch(err => console.error('[MAILER] sendMagicLink:', err))
}

export async function sendWelcomeEmail(data: {
  to: string; companyName: string; responsavel: string; loginUrl: string
}) {
  await sendEmail(data.to, `Bem-vindo(a) ao Sublime Digital! 🎉`,
    baseHtml('Pagamento confirmado — próximos passos',
      `<p style="font-size:15px;color:#334155;margin:0 0 16px">
        Olá, <strong>${data.responsavel}</strong>!<br><br>
        O pagamento da implantação da <strong>${data.companyName}</strong> foi confirmado.
        Sua conta está ativa e pronta para os próximos passos.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0fdf9;border-radius:10px;margin-bottom:16px">
        <tr><td style="padding:16px 18px">
          <p style="margin:0 0 10px;font-weight:700;color:#0d4a5c;font-size:14px">📋 O que acontece agora:</p>
          <p style="margin:0;font-size:13px;color:#334155;line-height:2">
            1. Acesse seu portal e preencha o formulário de onboarding<br>
            2. Nossa equipe analisa os dados e inicia a elaboração dos documentos<br>
            3. PGR e PCMSO ficam disponíveis no portal em até 5 dias úteis<br>
            4. Você recebe notificação por e-mail quando os documentos estiverem prontos
          </p>
        </td></tr>
      </table>` +
      cta(data.loginUrl, '🏠 Acessar meu portal')
    )
  ).catch(err => console.error('[MAILER] sendWelcomeEmail:', err))
}

export async function sendOnboardingReminder(data: {
  to: string; responsavel: string; companyName: string; loginUrl: string
}) {
  await sendEmail(data.to, `Lembrete: preencha seus dados para iniciarmos o PGR`,
    baseHtml('Seus documentos SST aguardam seus dados',
      `<p style="font-size:15px;color:#334155;margin:0 0 16px">
        Olá, <strong>${data.responsavel}</strong>! Seu pagamento foi confirmado, mas ainda não recebemos
        os dados necessários para elaborar o PGR e PCMSO da <strong>${data.companyName}</strong>.
      </p>
      <p style="font-size:14px;color:#334155;margin:0 0 20px">
        Preencha o formulário de onboarding no portal para que nossa equipe possa começar.
        Leva menos de 5 minutos.
      </p>` +
      cta(data.loginUrl, '📋 Preencher dados agora')
    )
  ).catch(err => console.error('[MAILER] sendOnboardingReminder:', err))
}

export async function sendPaymentReminder(data: {
  to: string; responsavel: string; companyName: string; checkoutUrl: string; amount: number
}) {
  const value = `R$ ${(data.amount / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  await sendEmail(data.to, `Lembrete: pagamento pendente — Sublime Digital`,
    baseHtml('Pagamento da implantação ainda não confirmado',
      `<p style="font-size:15px;color:#334155;margin:0 0 16px">
        Olá, <strong>${data.responsavel}</strong>! O pagamento de implantação da <strong>${data.companyName}</strong>
        (${value}) ainda não foi confirmado.
      </p>
      <p style="font-size:14px;color:#334155;margin:0 0 20px">
        Assim que confirmado, iniciaremos imediatamente a elaboração dos seus documentos SST.
      </p>` +
      cta(data.checkoutUrl, '💳 Realizar pagamento agora')
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
      row('Nome', data.name) +
      row('Escritório', data.office) +
      row('E-mail', data.email) +
      row('WhatsApp', data.whatsapp) +
      row('Cidade/UF', `${data.city}/${data.state}`) +
      (data.clientsEstimate ? row('Clientes aprox.', String(data.clientsEstimate)) : '') +
      (data.hasReferral ? row('Indicação', data.referralCompany ?? 'Sim') : '') +
      cta(waLink, '💬 Contatar parceiro no WhatsApp')
    )
  ).catch(err => console.error('[MAILER] notifyNewPartner:', err))
}
