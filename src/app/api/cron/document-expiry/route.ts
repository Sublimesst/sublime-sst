import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendDocumentExpiryAlert } from '@/lib/mailer'

// vercel.json: { "crons": [{ "path": "/api/cron/document-expiry", "schedule": "0 9 * * *" }] }

const ALERT_DAYS = [60, 30, 7]
const DOC_VALIDITY_DAYS = 365

const DOC_NAMES: Record<string, string> = {
  pgr:        'PGR — Programa de Gerenciamento de Riscos',
  pcmso:      'PCMSO — Controle Médico de Saúde Ocupacional',
  declaracao: 'Declaração técnica de ausência de insalubridade',
  os_epi:     'Ordens de Serviço + Fichas de EPI',
  ltcat:      'LTCAT — Laudo Técnico das Condições Ambientais',
}

function daysUntil(date: Date) {
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function shouldAlert(days: number) {
  return ALERT_DAYS.some(threshold => days === threshold)
}

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')
  if (token !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const loginBase = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://sublimesst.com'
  const loginUrl = `${loginBase}/cliente/login`

  const companies = await prisma.company.findMany({
    where: {
      status: 'active',
      checklist: { isNot: null },
    },
    include: { checklist: true },
  })

  let sent = 0
  let checked = 0

  for (const company of companies) {
    const cl = company.checklist
    if (!cl) continue
    checked++

    const expiringDocs: { nome: string; vencimento: Date; diasRestantes: number }[] = []

    const checks: { key: string; concludedAt: Date | null | undefined }[] = [
      { key: 'pgr',        concludedAt: cl.pgrConcluidoEm },
      { key: 'pcmso',      concludedAt: cl.pcmsoConcluidoEm },
      { key: 'declaracao', concludedAt: cl.declaracaoConcluidaEm },
      { key: 'os_epi',     concludedAt: cl.osEpiConcluidoEm },
      { key: 'ltcat',      concludedAt: cl.ltcatConcluidoEm },
    ]

    for (const { key, concludedAt } of checks) {
      if (!concludedAt) continue
      const vencimento = new Date(concludedAt.getTime() + DOC_VALIDITY_DAYS * 24 * 60 * 60 * 1000)
      const dias = daysUntil(vencimento)
      if (shouldAlert(dias)) {
        expiringDocs.push({ nome: DOC_NAMES[key] ?? key, vencimento, diasRestantes: dias })
      }
    }

    if (expiringDocs.length > 0) {
      await sendDocumentExpiryAlert({
        to: company.email,
        responsavel: company.responsavel,
        companyName: company.razaoSocial,
        documents: expiringDocs,
        loginUrl,
      })
      sent++
    }
  }

  return NextResponse.json({ ok: true, checked, sent })
}
