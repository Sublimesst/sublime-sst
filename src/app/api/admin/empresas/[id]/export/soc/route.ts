import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminSecret } from '@/lib/adminAuth'
import { generateSocWorkbookBuffer, isWorkerReadyForSocExport } from '@/lib/socExport/socExport'

function auth(req: NextRequest) {
  return verifyAdminSecret(req.headers.get('x-admin-secret'))
}

// Exportação administrativa read-only, compatível com o Modelo I de
// importação do SOC (ver src/lib/socExport). Limitada à Company do id da
// rota — nenhum Worker de outra Company é lido. Nenhuma mutação de dado:
// só leitura + geração do arquivo em memória.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!auth(req)) return NextResponse.json({ success: false, error: 'Não autorizado.' }, { status: 401 })

  const company = await prisma.company.findUnique({
    where: { id: params.id },
    select: {
      razaoSocial: true,
      workers: {
        select: { id: true, nome: true, dataNascimento: true, sexo: true, dataAdmissao: true, cargo: true, setor: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
  if (!company) return NextResponse.json({ success: false, error: 'Empresa não encontrada.' }, { status: 404 })

  if (company.workers.length === 0) {
    return NextResponse.json(
      { success: false, code: 'soc_export_no_workers', error: 'Nenhum trabalhador cadastrado para exportar.' },
      { status: 422 }
    )
  }

  // Bloqueia a exportação inteira se qualquer Worker estiver sem um campo
  // obrigatório do SOC (na prática, setor — os demais 5 campos já são
  // exigidos no envio do onboarding desde antes desta tranche). Nunca gera
  // arquivo parcial nem inventa valor. Erro não expõe ids nem nomes de
  // Worker — só a contagem.
  const incompleteCount = company.workers.filter((w) => !isWorkerReadyForSocExport(w)).length
  if (incompleteCount > 0) {
    return NextResponse.json(
      {
        success: false,
        code: 'soc_export_workers_incomplete',
        error: 'Um ou mais trabalhadores estão sem setor (ou outro dado obrigatório) preenchido. Complete o cadastro antes de exportar.',
        data: { incompleteCount },
      },
      { status: 422 }
    )
  }

  const buffer = generateSocWorkbookBuffer(
    company.razaoSocial,
    company.workers.map((w) => ({
      nome: w.nome as string,
      dataNascimento: w.dataNascimento as Date,
      sexo: w.sexo as 'M' | 'F',
      dataAdmissao: w.dataAdmissao as Date,
      cargo: w.cargo as string,
      setor: w.setor as string,
    }))
  )

  const filename = 'SOC-Modelo1.xls'
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.ms-excel',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buffer.length),
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
