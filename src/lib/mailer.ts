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

// ── TEMPLATE BASE ─────────────────────────────────────────
function baseHtml(title: string, body: string) {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
  <style>
    body{font-family:Arial,sans-serif;background:#f4f6f8;margin:0;padding:24px}
    .card{background:#fff;border-radius:10px;padding:28px;max-width:560px;margin:0 auto;border:1px solid #e2e8f0}
    .header{background:linear-gradient(135deg,#0d4a5c,#1a9e8c);color:#fff;border-radius:8px;padding:18px 22px;margin-bottom:22px}
    .header h2{margin:0;font-size:18px} .header p{margin:4px 0 0;font-size:13px;opacity:.8}
    .row{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #f0f4f8;font-size:14px}
    .row:last-child{border-bottom:none}
    .label{color:#64748b;font-weight:500} .value{color:#1e293b;font-weight:600;text-align:right;max-width:60%}
    .badge{display:inline-block;padding:4px 12px;border-radius:100px;font-size:12px;font-weight:700}
    .badge-green{background:#dcfce7;color:#15803d} .badge-blue{background:#dbeafe;color:#1e40af}
    .badge-amber{background:#fef9c3;color:#854d0e}
    .footer{text-align:center;font-size:12px;color:#94a3b8;margin-top:16px}
    .cta{display:block;background:#1a9e8c;color:#fff;text-align:center;padding:12px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin-top:18px}
  </style></head><body>
  <div class="card">
    <div class="header"><h2>🏢 Sublime SST</h2><p>${title}</p></div>
    ${body}
    <div class="footer">Sistema automático · Sublime SST · contato@sublimesst.com</div>
  </div></body></html>`
}

// ── NOTIFICAÇÕES ──────────────────────────────────────────
export async function notifyNewLead(data: {
  name: string; email: string; whatsapp: string; cnpj: string; companyName: string
}) {
  const waLink = `https://wa.me/55${data.whatsapp.replace(/\D/g, '')}`
  await sendEmail(NOTIFY, `🆕 Novo lead: ${data.companyName}`,
    baseHtml('Novo lead capturado no teste de elegibilidade',
      `<div class="row"><span class="label">Empresa</span><span class="value">${data.companyName}</span></div>
       <div class="row"><span class="label">CNPJ</span><span class="value">${data.cnpj}</span></div>
       <div class="row"><span class="label">Responsável</span><span class="value">${data.name}</span></div>
       <div class="row"><span class="label">E-mail</span><span class="value">${data.email}</span></div>
       <div class="row"><span class="label">WhatsApp</span><span class="value">${data.whatsapp}</span></div>
       <a href="${waLink}" class="cta">💬 Falar no WhatsApp agora</a>`
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
    baseHtml('🎯 Empresa aprovada no modelo digital!',
      `<div style="margin-bottom:14px"><span class="badge badge-green">✅ ELEGÍVEL</span></div>
       <div class="row"><span class="label">Empresa</span><span class="value">${data.companyName}</span></div>
       <div class="row"><span class="label">CNPJ</span><span class="value">${data.cnpj}</span></div>
       <div class="row"><span class="label">Responsável</span><span class="value">${data.name}</span></div>
       <div class="row"><span class="label">WhatsApp</span><span class="value">${data.whatsapp}</span></div>
       <div class="row"><span class="label">CNAE</span><span class="value">${data.cnae}</span></div>
       <div class="row"><span class="label">Funcionários</span><span class="value">${data.employees}</span></div>
       <div class="row"><span class="label">Mensalidade</span><span class="value" style="color:#1a9e8c;font-size:16px">${monthly}/mês</span></div>
       <a href="${waLink}" class="cta">💬 Entrar em contato agora</a>`
    )
  ).catch(err => console.error('[MAILER] notifyEligibleResult:', err))
}

export async function notifyBackofficeResult(data: {
  name: string; email: string; whatsapp: string; companyName: string; cnpj: string
  cnae: string; employees: string; reasons: string[]
}) {
  const waLink = `https://wa.me/55${data.whatsapp.replace(/\D/g, '')}`
  const reasonsHtml = data.reasons.map(r =>
    `<div style="padding:4px 0;font-size:13px;color:#854d0e">⚠️ ${r}</div>`
  ).join('')
  await sendEmail(NOTIFY, `🔍 Análise necessária: ${data.companyName}`,
    baseHtml('Empresa encaminhada para análise personalizada',
      `<div style="margin-bottom:14px"><span class="badge badge-amber">🔍 ANÁLISE PERSONALIZADA</span></div>
       <div class="row"><span class="label">Empresa</span><span class="value">${data.companyName}</span></div>
       <div class="row"><span class="label">CNPJ</span><span class="value">${data.cnpj}</span></div>
       <div class="row"><span class="label">Responsável</span><span class="value">${data.name}</span></div>
       <div class="row"><span class="label">WhatsApp</span><span class="value">${data.whatsapp}</span></div>
       <div class="row"><span class="label">CNAE</span><span class="value">${data.cnae}</span></div>
       <div style="background:#fef9c3;border-radius:8px;padding:12px 14px;margin:12px 0">
         <div style="font-size:12px;font-weight:700;color:#854d0e;margin-bottom:6px">Motivos:</div>
         ${reasonsHtml}
       </div>
       <a href="${waLink}" class="cta">💬 Entrar em contato para análise</a>`
    )
  ).catch(err => console.error('[MAILER] notifyBackofficeResult:', err))
}

export async function notifyNewPartner(data: {
  name: string; office: string; email: string; whatsapp: string
  city: string; state: string; clientsEstimate?: number | null
  hasReferral: boolean; referralCompany?: string
}) {
  const waLink = `https://wa.me/55${data.whatsapp.replace(/\D/g, '')}`
  await sendEmail(NOTIFY, `🤝 Novo parceiro: ${data.name} — ${data.office}`,
    baseHtml('Novo parceiro cadastrado no programa',
      `<div style="margin-bottom:14px"><span class="badge badge-blue">🤝 NOVO PARCEIRO</span></div>
       <div class="row"><span class="label">Nome</span><span class="value">${data.name}</span></div>
       <div class="row"><span class="label">Escritório</span><span class="value">${data.office}</span></div>
       <div class="row"><span class="label">E-mail</span><span class="value">${data.email}</span></div>
       <div class="row"><span class="label">WhatsApp</span><span class="value">${data.whatsapp}</span></div>
       <div class="row"><span class="label">Cidade/UF</span><span class="value">${data.city}/${data.state}</span></div>
       ${data.clientsEstimate ? `<div class="row"><span class="label">Clientes aprox.</span><span class="value">${data.clientsEstimate}</span></div>` : ''}
       ${data.hasReferral ? `<div class="row"><span class="label">Indicação</span><span class="value">${data.referralCompany ?? 'Sim'}</span></div>` : ''}
       <a href="${waLink}" class="cta">💬 Contatar parceiro no WhatsApp</a>`
    )
  ).catch(err => console.error('[MAILER] notifyNewPartner:', err))
}
