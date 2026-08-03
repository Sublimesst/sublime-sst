'use client'

// ═══════════════════════════════════════════════════════════
// SUBLIME SST — Página de continuação da contratação (Etapa 2A)
// Não recebe companyId nem token na URL: a identificação vem exclusivamente
// do cookie de sessão de continuação, lido pelo endpoint /api/contratacao/status.
// Nunca cria cobrança — só exibe o checkoutUrl já persistido (se validado).
//
// Etapa 2B.3 (MVP de retorno/continuidade): o callback do Asaas
// (autoRedirect) é best-effort e pode falhar por configuração de ambiente —
// esta página nunca depende dele para funcionar. Três camadas independentes
// garantem que o cliente sempre consiga ver o estado atualizado mesmo sem
// nenhum redirecionamento automático: (1) polling normal de até 60s, (2)
// nova consulta ao focar a aba/voltar a ficar visível, (3) botão manual
// "Já paguei". Nenhuma delas cria registro ou chama a Asaas diretamente do
// navegador — todas usam o mesmo GET /api/contratacao/status somente leitura.
// ═══════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle2, Clock, AlertTriangle, ExternalLink, Loader2 } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { WhatsAppButton } from '@/components/layout/WhatsAppButton'
import { shouldShowPaymentButton, getPaymentStepLabel, getIntermediateStatusMessage, createSingleShotGuard } from './paymentCta'

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
  const [manualChecking, setManualChecking] = useState(false)
  const attemptsRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Guarda contra chamadas concorrentes: polling, foco/visibilidade e o botão
  // manual podem disparar ao mesmo tempo (ex.: usuário clica "Já paguei" no
  // exato momento em que a aba recupera o foco) — só uma consulta por vez.
  const isFetchingRef = useRef(false)
  const cancelledRef = useRef(false)

  const fetchStatus = useCallback(async (options: { manual?: boolean } = {}) => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true
    if (options.manual) setManualChecking(true)

    try {
      const res = await fetch('/api/contratacao/status', { cache: 'no-store' })
      if (cancelledRef.current) return

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
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => fetchStatus(), POLL_INTERVAL_MS)
      }
    } catch {
      if (!cancelledRef.current) setState({ kind: 'temporary-error' })
    } finally {
      isFetchingRef.current = false
      if (options.manual) setManualChecking(false)
    }
  }, [])

  useEffect(() => {
    cancelledRef.current = false
    fetchStatus()

    // Retomada ao voltar para a aba: cobre o caso comum de o polling inicial
    // (até 60s) já ter parado quando o cliente termina de pagar no checkout
    // em outra aba e só depois volta para esta. Nunca reinicia o polling
    // agressivo — é só uma consulta avulsa por evento, protegida pelo mesmo
    // isFetchingRef usado pelo polling e pelo botão manual.
    function onFocus() { fetchStatus() }
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') fetchStatus()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      cancelledRef.current = true
      if (timerRef.current) clearTimeout(timerRef.current)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [fetchStatus])

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
          {state.kind === 'ok' && (
            <StatusCard
              data={state.data}
              manualChecking={manualChecking}
              onManualCheck={() => fetchStatus({ manual: true })}
            />
          )}
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

function StatusCard({
  data,
  manualChecking,
  onManualCheck,
}: {
  data: StatusData
  manualChecking: boolean
  onManualCheck: () => void
}) {
  const intermediateMessage = getIntermediateStatusMessage(data.implantacao?.status, data.mensalidade?.status)

  return (
    <div className="space-y-4">
      <PaymentRow label="Implantação" payment={data.implantacao} otherStatus={data.mensalidade?.status} />
      <PaymentRow label="Mensalidade" payment={data.mensalidade} otherStatus={data.implantacao?.status} />

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
      {intermediateMessage && <InfoBanner text={intermediateMessage} />}

      {!data.financiallyComplete && (
        <button
          type="button"
          onClick={onManualCheck}
          disabled={manualChecking}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {manualChecking ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Verificando...
            </>
          ) : (
            'Já paguei — verificar status'
          )}
        </button>
      )}
    </div>
  )
}

function PaymentRow({
  label,
  payment,
  otherStatus,
}: {
  label: 'Implantação' | 'Mensalidade'
  payment: StatusData['implantacao']
  otherStatus: string | null | undefined
}) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (!payment) return null

  const showButton = shouldShowPaymentButton(payment)
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

        {showButton && (
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Pagar
            <ExternalLink className="h-4 w-4" />
          </button>
        )}
      </div>

      {confirmOpen && payment.checkoutUrl && (
        <PaymentConfirmModal
          label={label}
          amount={payment.amount}
          checkoutUrl={payment.checkoutUrl}
          stepLabel={getPaymentStepLabel(otherStatus)}
          onCancel={() => setConfirmOpen(false)}
          onContinue={() => setConfirmOpen(false)}
        />
      )}
    </div>
  )
}

function PaymentConfirmModal({
  label,
  amount,
  checkoutUrl,
  stepLabel,
  onCancel,
  onContinue,
}: {
  label: 'Implantação' | 'Mensalidade'
  amount: number
  checkoutUrl: string
  stepLabel: string
  onCancel: () => void
  onContinue: () => void
}) {
  // Guarda síncrona de disparo único: vive DENTRO do modal (não do PaymentRow)
  // para resetar sozinha a cada reabertura legítima — o modal desmonta ao
  // fechar (Cancelar ou Continuar) e remonta do zero na próxima vez que
  // "Pagar" é clicado, criando uma instância nova do guard automaticamente.
  // Inicialização preguiçosa (sem useEffect): só cria o guard uma vez, na
  // primeira renderização deste modal.
  const guardRef = useRef<ReturnType<typeof createSingleShotGuard> | null>(null)
  if (!guardRef.current) guardRef.current = createSingleShotGuard()
  const [opening, setOpening] = useState(false)

  function handleContinue() {
    if (!guardRef.current!.tryConsume()) return
    setOpening(true)
    // noopener,noreferrer no window.open é o equivalente programático do
    // rel="noopener noreferrer" de um <a> — a aba nova nunca tem acesso a
    // window.opener. A URL já veio validada pelo backend (safeCheckoutUrl);
    // nunca é construída/concatenada aqui.
    window.open(checkoutUrl, '_blank', 'noopener,noreferrer')
    onContinue()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-confirm-title"
    >
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h2 id="payment-confirm-title" className="text-lg font-semibold text-gray-900">
          Você será direcionado ao ambiente seguro do Asaas
        </h2>

        <dl className="mt-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">Pagamento</dt>
            <dd className="font-medium text-gray-900">{label}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Valor</dt>
            <dd className="font-medium text-gray-900">{formatBRL(amount)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Etapa</dt>
            <dd className="font-medium text-gray-900">{stepLabel}</dd>
          </div>
        </dl>

        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-gray-600">
          <li>O pagamento será aberto em uma nova aba.</li>
          <li>Esta página da Sublime deve permanecer aberta.</li>
          <li>Depois de pagar, volte para esta página — o status atualiza automaticamente.</li>
          <li>Se ainda existir outro pagamento pendente, ele também precisará ser concluído para liberar o onboarding.</li>
        </ul>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleContinue}
            disabled={opening}
            className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Continuar para o pagamento
          </button>
        </div>
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
