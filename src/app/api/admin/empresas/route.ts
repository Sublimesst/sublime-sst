import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminSecret } from '@/lib/adminAuth'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret')
  if (!verifyAdminSecret(secret)) {
    return NextResponse.json({ success: false, error: 'Não autorizado.' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const search = searchParams.get('search')

  const where = {
    ...(status ? { status } : {}),
    ...(search ? {
      OR: [
        { razaoSocial: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
        { cnpj: { contains: search } },
      ],
    } : {}),
  }

  const companies = await prisma.company.findMany({
    where,
    include: {
      plan: true,
      payments: { where: { type: 'implantacao' }, orderBy: { createdAt: 'desc' }, take: 1 },
      onboardingData: { select: { submittedAt: true } },
      partner: { select: { id: true, name: true, code: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ success: true, data: companies })
}
