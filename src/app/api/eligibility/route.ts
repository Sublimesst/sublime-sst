import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { runEligibilityEngine } from '@/lib/eligibility'
import { notifyEligibleResult, notifyBackofficeResult } from '@/lib/mailer'
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit'

const schema = z.object({
  cnpj: z.string().min(14),
  companyName: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  whatsapp: z.string().min(10),
  cnae: z.string().min(1),
  cnaeCode: z.string().min(1),
  employees: z.enum(['1-5', '6-10', '11-20', '21+']),
  usesMachines: z.boolean(),
  usesChemicals: z.boolean(),
  worksAtHeight: z.boolean(),
  hasExternalWork: z.boolean(),
  declaration: z.boolean(),
})

export async function POST(req: NextRequest) {
  const limit = Number(process.env.RATE_LIMIT_ELIGIBILITY ?? 10)
  if (!rateLimit(req, limit)) return rateLimitResponse()

  try {
    const body = await req.json()
    const data = schema.parse(body)

    // Upsert lead
    const lead = await prisma.lead.upsert({
      where: { id: `cnpj_${data.cnpj.replace(/\D/g,'')}` },
      update: { status: 'assessed', name: data.name, email: data.email, whatsapp: data.whatsapp },
      create: {
        id: `cnpj_${data.cnpj.replace(/\D/g,'')}`,
        cnpj: data.cnpj,
        companyName: data.companyName,
        name: data.name,
        email: data.email,
        whatsapp: data.whatsapp,
        source: 'site',
        status: 'assessed',
      },
    })

    // Run engine
    const result = runEligibilityEngine({
      cnae: data.cnae,
      cnaeCode: data.cnaeCode,
      employees: data.employees,
      usesMachines: data.usesMachines,
      usesChemicals: data.usesChemicals,
      worksAtHeight: data.worksAtHeight,
      hasExternalWork: data.hasExternalWork,
      declaration: data.declaration,
    })

    // Save assessment
    await prisma.eligibilityAssessment.create({
      data: {
        leadId: lead.id,
        cnae: data.cnae,
        cnaeCode: data.cnaeCode,
        employees: data.employees,
        usesMachines: data.usesMachines,
        usesChemicals: data.usesChemicals,
        worksAtHeight: data.worksAtHeight,
        hasExternalWork: data.hasExternalWork,
        declaration: data.declaration,
        eligible: result.eligible,
        reasons: result.reasons,
        resultShownAt: new Date(),
        ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
        userAgent: req.headers.get('user-agent') ?? undefined,
      },
    })

    // Update lead status
    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: result.eligible ? 'eligible' : 'backoffice' },
    })

    // Notify team (non-blocking)
    if (result.eligible && result.plan) {
      notifyEligibleResult({
        name: data.name,
        email: data.email,
        whatsapp: data.whatsapp,
        companyName: data.companyName,
        cnpj: data.cnpj,
        cnae: data.cnae,
        employees: data.employees,
        planLabel: result.plan.label,
        planMonthly: result.plan.monthly,
      }).catch(() => {})
    } else {
      notifyBackofficeResult({
        name: data.name,
        email: data.email,
        whatsapp: data.whatsapp,
        companyName: data.companyName,
        cnpj: data.cnpj,
        cnae: data.cnae,
        employees: data.employees,
        reasons: result.reasons,
      }).catch(() => {})
    }

    return NextResponse.json({ success: true, data: result })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Dados inválidos.', details: err.errors }, { status: 400 })
    }
    console.error('[API /eligibility]', err)
    return NextResponse.json({ success: false, error: 'Erro interno. Tente novamente.' }, { status: 500 })
  }
}
