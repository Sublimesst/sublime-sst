import { timingSafeEqual } from 'crypto'

// Comparação de tempo constante do CRON_SECRET — mesmo idioma já usado no
// projeto para ADMIN_SECRET (src/lib/adminAuth.ts) e para o token do webhook
// Asaas (src/app/api/webhooks/asaas/route.ts): falha explicitamente quando o
// segredo esperado está ausente/vazio, em vez de comparar contra uma string
// construída a partir de `undefined` (ex.: um header literal
// `Authorization: Bearer undefined` nunca deve passar só porque
// `CRON_SECRET` não foi configurado). timingSafeEqual exige buffers do
// mesmo tamanho, por isso o length check vem antes — nunca lança exceção
// por segredo ausente ou tamanho diferente.
//
// Usado apenas pelo endpoint de encerramento efetivo de cancelamento
// (src/app/api/cron/process-cancellations) — esse é o único cron cuja
// autenticação pode acionar uma operação financeira real (cancelamento de
// assinatura na Asaas), o que torna o fail-open aqui crítico. Os crons
// pré-existentes (remind-onboarding, remind-payment, document-expiry)
// continuam com a checagem própria deles, deliberadamente fora do escopo
// desta correção — dívida técnica pré-existente registrada à parte.
export function verifyCronSecret(authorizationHeader: string | null | undefined): boolean {
  const expected = process.env.CRON_SECRET ?? ''
  if (!expected) return false

  const candidate = authorizationHeader ?? ''
  const expectedHeader = `Bearer ${expected}`
  const a = Buffer.from(candidate)
  const b = Buffer.from(expectedHeader)
  return a.length === b.length && timingSafeEqual(a, b)
}
