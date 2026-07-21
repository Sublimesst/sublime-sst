import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { CheckCircle2, Clock, FileText, CreditCard, LogOut, AlertCircle, ChevronRight, Download } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { verifySessionCookie } from '@/lib/sessionCookie'
import type { ClientSessionPayload } from '@/lib/clientAuth'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Meu Portal — Sublime SST',
  robots: 'noindex',
}

async function getCompany() {
  const cookieStore = await cookies()
  const raw = cookieStore.get('sublime_client')?.value
  const payload = verifySessionCookie<ClientSessionPayload>(raw)
  if (!payload?.companyId) return null

  const company = await prisma.company.findUnique({
    where: { id: payload.companyId },
    include: {
      plan: true,
      payments: { orderBy: { createdAt: 'desc' } },
      onboardingData: true,
      documents: { orderBy: { uploadedAt: 'desc' } },
    },
  })

  // Empresa cancelada não deve manter acesso ao portal — mesma Company já
  // carregada acima, sem query nova.
  if (!company || company.status === 'cancelled') return null

  return company
}

const DOCUMENTO_LABELS: Record<string, string> = {
  pgr: 'PGR', pcmso: 'PCMSO', declaracao: 'Declaração técnica',
  os_epi: 'OS + Fichas de EPI', ltcat: 'LTCAT', contrato: 'Contrato',
}

type Step = { label: string; description: string; done: boolean; pending: boolean }

function getSteps(
  company: NonNullable<Awaited<ReturnType<typeof getCompany>>>
): Step[] {
  const hasPendingPayment = company.payments.some(p => p.type === 'implantacao' && p.status === 'pending')
  const hasConfirmedPayment = company.payments.some(p => p.type === 'implantacao' && p.status === 'confirmed')
  const hasOnboarding = !!company.onboardingData
  const isActive = company.status === 'active'

  return [
    {
      label: 'Contratação realizada',
      description: 'Sua empresa foi cadastrada no Sublime Digital.',
      done: true,
      pending: false,
    },
    {
      label: 'Pagamento da implantação',
      description: hasConfirmedPayment
        ? 'Pago e confirmado.'
        : hasPendingPayment
          ? 'Aguardando confirmação do pagamento.'
          : 'Realize o pagamento para prosseguir.',
      done: hasConfirmedPayment,
      pending: hasPendingPayment,
    },
    {
      label: 'Preenchimento dos dados',
      description: hasOnboarding
        ? 'Dados recebidos — em análise pela equipe.'
        : 'Preencha o formulário de onboarding para iniciar a elaboração dos documentos.',
      done: hasOnboarding,
      pending: !hasOnboarding && hasConfirmedPayment,
    },
    {
      label: 'Elaboração dos documentos',
      description: isActive && hasOnboarding
        ? 'Nossa equipe está elaborando seu PGR e PCMSO.'
        : 'Aguarda preenchimento dos dados e confirmação do pagamento.',
      done: false,
      pending: isActive && hasOnboarding,
    },
    {
      label: 'Documentos entregues',
      description: 'PGR e PCMSO disponíveis para download no portal.',
      done: false,
      pending: false,
    },
  ]
}

export default async function DashboardPage() {
  const company = await getCompany()
  if (!company) redirect('/cliente/login')

  const steps = getSteps(company)
  const pendingPayment = company.payments.find(p => p.type === 'implantacao' && p.status === 'pending')
  const needsOnboarding = company.payments.some(p => p.type === 'implantacao' && p.status === 'confirmed') && !company.onboardingData

  const monthly = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(company.mensalidadeValor / 100)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-[800px] mx-auto px-6 h-[72px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo-mark.png" alt="Sublime SST" width={36} height={36} />
            <span className="font-display text-[15px] text-gray-900">Portal do Cliente</span>
          </Link>
          <form action="/api/cliente/logout" method="POST">
            <button type="submit" className="flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-gray-800">
              <LogOut size={14} /> Sair
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-[800px] mx-auto px-6 py-10">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="font-display text-2xl text-gray-900 mb-1">
            Olá, {company.responsavel.split(' ')[0]}!
          </h1>
          <p className="text-[14px] text-gray-500">{company.razaoSocial} · CNPJ {company.cnpj}</p>
        </div>

        {/* Alert: action needed */}
        {needsOnboarding && (
          <div className="mb-6 card border-teal bg-gradient-to-r from-teal-pale to-white p-5 flex items-start gap-4">
            <AlertCircle className="text-teal shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-medium text-gray-900 text-[15px]">Ação necessária: preencha seus dados</p>
              <p className="text-[13px] text-gray-600 mb-3">
                Pagamento confirmado! Agora preencha o formulário de onboarding para iniciarmos a elaboração do PGR e PCMSO.
              </p>
              <Link href="/cliente/onboarding" className="btn btn-primary text-[13px] py-2 px-4">
                Preencher dados agora <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        )}

        {pendingPayment && pendingPayment.checkoutUrl && (
          <div className="mb-6 card border-amber-300 bg-amber-50 p-5 flex items-start gap-4">
            <CreditCard className="text-amber-600 shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-medium text-gray-900 text-[15px]">Pagamento aguardando</p>
              <p className="text-[13px] text-gray-600 mb-3">
                Realize o pagamento da taxa de implantação para ativar seus serviços.
              </p>
              <a
                href={pendingPayment.checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary text-[13px] py-2 px-4"
              >
                Pagar agora <ChevronRight size={14} />
              </a>
            </div>
          </div>
        )}

        {/* Progress */}
        <div className="card p-6 mb-6">
          <h2 className="font-display text-[17px] text-gray-900 mb-5">Status do processo</h2>
          <div className="flex flex-col gap-4">
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className={`mt-0.5 shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold
                  ${step.done ? 'bg-teal text-white' : step.pending ? 'bg-amber-100 text-amber-700 border-2 border-amber-300' : 'bg-gray-100 text-gray-400'}`}>
                  {step.done ? <CheckCircle2 size={15} /> : step.pending ? <Clock size={14} /> : i + 1}
                </div>
                <div>
                  <p className={`text-[14px] font-medium ${step.done ? 'text-gray-900' : step.pending ? 'text-gray-800' : 'text-gray-400'}`}>
                    {step.label}
                  </p>
                  <p className="text-[12px] text-gray-500 mt-0.5">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Plan info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard size={15} className="text-gray-400" />
              <span className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide">Plano</span>
            </div>
            <p className="font-display text-xl text-teal">{monthly}<span className="text-[13px] text-gray-500">/mês</span></p>
            <p className="text-[12px] text-gray-500 mt-1">{company.plan?.label ?? '—'}</p>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={15} className="text-gray-400" />
              <span className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide">Documentos</span>
            </div>
            {company.documents.length === 0 ? (
              <>
                <p className="text-[14px] text-gray-700">
                  {company.onboardingData ? 'Em elaboração' : 'Aguardando dados'}
                </p>
                <p className="text-[12px] text-gray-500 mt-1">PGR · PCMSO · ASOs</p>
              </>
            ) : (
              <ul className="space-y-2">
                {company.documents.map(doc => (
                  <li key={doc.id} className="flex items-center justify-between gap-2">
                    <span className="text-[13px] text-gray-700 truncate">
                      {DOCUMENTO_LABELS[doc.tipoDocumento] ?? doc.tipoDocumento}
                    </span>
                    <a
                      href={`/api/cliente/documents/${doc.id}/download`}
                      className="flex items-center gap-1 text-[12px] text-teal hover:text-petrol font-medium shrink-0"
                    >
                      <Download size={13} /> Baixar
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Help */}
        <div className="card p-5 bg-gray-50">
          <p className="text-[13px] text-gray-600">
            Dúvidas? Fale com a equipe:{' '}
            <a href="https://wa.me/5521997248630" className="text-teal hover:text-petrol font-medium">
              WhatsApp (21) 99724-8630
            </a>{' '}
            ou{' '}
            <a href="mailto:contato@sublimesst.com" className="text-teal hover:text-petrol font-medium">
              contato@sublimesst.com
            </a>
          </p>
        </div>
      </main>
    </div>
  )
}
