import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import { getFinancialState } from './financialGate'
import { OnboardingForm } from './OnboardingForm'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Onboarding — Sublime SST',
  robots: 'noindex',
}

function BlockedCard() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-[720px] mx-auto px-6 h-[72px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo-mark.png" alt="Sublime SST" width={36} height={36} />
            <span className="font-display text-[15px] text-gray-900">Onboarding</span>
          </Link>
          <Link href="/cliente/dashboard" className="text-[13px] text-gray-500 hover:text-gray-800 flex items-center gap-1">
            <ArrowLeft size={13} /> Voltar
          </Link>
        </div>
      </header>
      <main className="max-w-[720px] mx-auto px-6 py-10">
        <div className="card p-8 text-center">
          <AlertCircle className="mx-auto mb-4 text-amber-600" size={40} />
          <h2 className="font-display text-xl text-gray-900 mb-2">Preenchimento ainda não disponível</h2>
          <p className="text-[14px] text-gray-500 mb-6">
            O preenchimento dos dados será liberado após a confirmação da implantação e da primeira mensalidade.
          </p>
          <Link href="/cliente/dashboard" className="btn btn-primary">Voltar ao painel</Link>
        </div>
      </main>
    </div>
  )
}

export default async function OnboardingPage() {
  const financialState = await getFinancialState()
  if (!financialState) redirect('/cliente/login')

  if (!financialState.financiallyComplete) {
    return <BlockedCard />
  }

  return <OnboardingForm />
}
