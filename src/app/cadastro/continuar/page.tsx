'use client'

// ═══════════════════════════════════════════════════════════
// SUBLIME SST — Página de continuação da contratação (Etapa 2A)
// Não recebe companyId nem token na URL: a identificação vem exclusivamente
// do cookie de sessão de continuação, lido pelo endpoint /api/contratacao/status.
// Nunca cria cobrança — só exibe o checkoutUrl já persistido (se validado).
// ═══════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Clock, AlertTriangle, ExternalLink } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { WhatsAppButton } from '@/components/layout/WhatsAppButton'

const POLL_INTERVAL_MS = 5000
const MAX_POLL_ATTEMPTS = 12

interface StatusData {
  // 'cancelled' nunca chega aqui: a API responde 403 company_cancelled antes
  // de derivar estado — tratado por FetchState 'cancelled' (ver CancelledCard).
  step: 'step1' | 'step2' | 'preparing' | 'completed' | 'implantacao_issue' | 'mensalidade_issue'
  financiallyComplete: boolean
  showsCommonPaymentButton: boolean
  planType: string
  mensalidadeValor: number
  implantacao: { status: string; amount: number; dueDate: string; checkoutUrl?: string } | null
  mensalidade: { status: string; amount: number; dueDate: string; checkoutUrl?: string } | null
}

type FetchState =
  | { kind: 'loading' }
  | { kind: 'session-expired' }
  | { kind: 'cancelled' }
  | { kind: 'temporary-error' }
  | { kind: 'ok'; data: StatusData }

const DEFINITIVE_STEPS = new Set(['completed', 'implantacao_issue', 'mensalidade_issue'])

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function ContinuarCadastroPage() {
  const [state, setState] = useState<FetchState>({ kind: 'loading' })
  const attemptsRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchStatus() {
      try {
        const res = await fetch('/api/contratacao/status', { cache: 'no-store' })
        if (cancelled) return

        if (res.status === 401 || res.status === 404) {
          setState({ kind: 'session-expired' })
          return
        }
        if (res.status === 403) {
          const body = await res.json().catch(() => null)
          setState(body?.code === 'company_cancelled' ? { kind: 'cancelled' } : { kind: 'session-expired' })
          return
        }
        if (!res.ok) {
          setState({ kind: 'temporary-error' })
          return
        }

        const json = await res.json()
        if (!json.success) {
          setState({ kind: 'temporary-error' })
          return
        }

        setState({ kind: 'ok', data: json.data })
        attemptsRef.current += 1

        const isDefinitive = DEFINITIVE_STEPS.has(json.data.step)
        if (!isDefinitive && attemptsRef.current < MAX_POLL_ATTEMPTS) {
          timerRef.current = setTimeout(fetchStatus, POLL_INTERVAL_MS)
        }
      } catch {
        if (!cancelled) setState({ kind: 'temporary-error' })
      }
    }

    fetchStatus()
    return () => {
      cancelled = true
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Continuar contratação</h1>
        <p className="mt-2 text-gray-600">Acompanhe o status do seu pagamento e conclua quando estiver pronto.</p>

        <div className="mt-8">
          {state.kind === 'loading' && <LoadingCard />}
          {state.kind === 'session-expired' && <SessionExpiredCard />}
          {state.kind === 'cancelled' && <CancelledCard />}
          {state.kind === 'temporary-error' && <TemporaryErrorCard />}
          {state.kind === 'ok' && <StatusCard data={state.data} />}
        </div>
      </main>
      <WhatsAppButton />
    </div>
  )
}

function LoadingCard() {
  return (
    <div className="animate-pulse rounded-xl border border-gray-200 bg-white p-6">
      <div className="h-4 w-1/3 rounded bg-gray-200" />
      <div className="mt-4 h-3 w-full rounded bg-gray-100" />
      <div className="mt-2 h-3 w-2/3 rounded bg-gray-100" />
    </div>
  )
}

function SessionExpiredCard() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div>
          <h2 className="font-semibold text-amber-900">Sessão expirada</h2>
          <p className="mt-1 text-sm text-amber-800">
            Não conseguimos identificar sua sessão de continuação. Fale com a gente pelo WhatsApp para retomar o
            atendimento.
          </p>
        </div>
      </div>
    </div>
  )
}

function CancelledCard() {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
        <div>
          <h2 className="font-semibold text-red-900">Contratação cancelada</h2>
          <p className="mt-1 text-sm text-red-800">
            Esta contratação foi cancelada e não está mais disponível para continuação. Fale com a gente pelo
            WhatsApp se acredita que isso é um engano.
          </p>
        </div>
      </div>
    </div>
  )
}

function TemporaryErrorCard() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-gray-500" />
        <div>
          <h2 className="font-semibold text-gray-900">Não foi possível carregar seus dados agora</h2>
          <p className="mt-1 text-sm text-gray-600">Tente novamente em alguns instantes.</p>
        </div>
      </div>
    </div>
  )
}

function StatusCard({ data }: { data: StatusData }) {
  return (
    <div className="space-y-4">
      <PaymentRow
        label="Implantação"
        payment={data.implantacao}
        showButton={data.showsCommonPaymentButton && data.step === 'step1'}
      />
      <PaymentRow
        label="Mensalidade"
        payment={data.mensalidade}
        showButton={data.showsCommonPaymentButton && data.step === 'step2'}
      />

      {data.step === 'preparing' && (
        <InfoBanner text="Sua implantação foi confirmada. Estamos preparando a cobrança da primeira mensalidade." />
      )}
      {data.step === 'completed' && (
        <InfoBanner
          success
          text="Tudo certo! Implantação e primeira mensalidade confirmadas."
        />
      )}
      {(data.step === 'implantacao_issue' || data.step === 'mensalidade_issue') && (
        <InfoBanner
          warning
          text="Identificamos uma pendência no seu pagamento. Fale com a gente pelo WhatsApp para regularizar."
        />
      )}
    </div>
  )
}

function PaymentRow({
  label,
  payment,
  showButton,
}: {
  label: string
  payment: StatusData['implantacao']
  showButton: boolean
}) {
  if (!payment) return null

  const isConfirmed = payment.status === 'confirmed'
  const isIssue = payment.status === 'overdue' || payment.status === 'refunded' || payment.status === 'disputed'

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {isConfirmed ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
          ) : isIssue ? (
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
          ) : (
            <Clock className="h-5 w-5 shrink-0 text-amber-500" />
          )}
          <div>
            <p className="font-medium text-gray-900">{label}</p>
            <p className="text-sm text-gray-500">{formatBRL(payment.amount)}</p>
          </div>
        </div>

        {showButton && payment.checkoutUrl && (
          <a
            href={payment.checkoutUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Pagar
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  )
}

function InfoBanner({ text, success, warning }: { text: string; success?: boolean; warning?: boolean }) {
  const colors = warning
    ? 'border-red-200 bg-red-50 text-red-800'
    : success
      ? 'border-green-200 bg-green-50 text-green-800'
      : 'border-blue-200 bg-blue-50 text-blue-800'
  return <div className={`rounded-xl border p-4 text-sm ${colors}`}>{text}</div>
}
