// ═══════════════════════════════════════════════════════════
// SUBLIME SST — Cálculo temporal da regra de vigência de 12 meses
// (docs/DECISIONS.md, docs/CONTRACT_MVP_V1.md §3)
//
// Política temporal única deste módulo: toda data de negócio é um instante
// (DateTime), manipulado exclusivamente pelos componentes UTC do Date —
// nunca pelos locais (getMonth/getDate/setHours sem UTC) — mesma convenção
// já usada pelo resto do projeto (src/lib/civilDate.ts, src/lib/asaas.ts
// isRealCalendarDate). O projeto não usa nenhuma biblioteca de timezone
// (nenhum uso de date-fns-tz nem de "America/Sao_Paulo" em cálculo — só em
// formatação de exibição, ex. src/app/api/admin/comissoes/route.ts) — este
// módulo segue a mesma convenção UTC implícita, sem introduzir fuso novo.
//
// "Mês" é sempre um deslocamento de calendário (Date.UTC), nunca uma
// aproximação de 30 dias — 12 meses a partir de uma ativação em 31/01
// termina em 31/01 do ano seguinte (ou no último dia de fevereiro, se for
// bissexto/não bissexto, quando a soma cair num mês sem dia 31). "90 dias"
// é soma literal de dias em milissegundos — dias não têm o problema de "dia
// inexistente no mês de destino" que meses têm, e o projeto não observa
// horário de verão (abolido no Brasil desde 2019) nem opera em timezone
// diferente de UTC em nenhum outro cálculo de negócio existente.
// ═══════════════════════════════════════════════════════════

export const INITIAL_TERM_MONTHS = 12
export const POST_RENEWAL_NOTICE_DAYS = 90

const MS_PER_DAY = 24 * 60 * 60 * 1000

// Soma `months` meses de calendário a `date`, em UTC, preservando hora/
// minuto/segundo/milissegundo. Quando o dia de origem não existir no mês de
// destino (ex.: 31/01 + 1 mês → fevereiro não tem dia 31), o resultado é
// fixado ("clamp") no ÚLTIMO dia do mês de destino — nunca "rola" para o mês
// seguinte. `months` pode ser negativo (não usado hoje, mas mantém a função
// genérica e testável em ambas as direções).
export function addCalendarMonthsUtc(date: Date, months: number): Date {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth()
  const day = date.getUTCDate()

  const targetMonthIndex = month + months
  const targetYear = year + Math.floor(targetMonthIndex / 12)
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12

  // Dia 0 do mês seguinte ao de destino = último dia do mês de destino.
  const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate()
  const targetDay = Math.min(day, lastDayOfTargetMonth)

  return new Date(Date.UTC(
    targetYear, targetMonth, targetDay,
    date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date.getUTCMilliseconds()
  ))
}

// Soma `days` dias a `date` por aritmética simples em milissegundos — ver
// justificativa da política temporal no cabeçalho do arquivo.
export function addCalendarDaysUtc(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY)
}

// Fim da vigência inicial: sempre INITIAL_TERM_MONTHS meses de calendário
// após a ativação, independente de quando um pedido de cancelamento for
// apresentado dentro desse período (Contrato §3, itens 2 e 5).
export function initialTermEnd(activatedAt: Date): Date {
  return addCalendarMonthsUtc(activatedAt, INITIAL_TERM_MONTHS)
}

// A vigência inicial é o intervalo semiaberto [activatedAt, initialTermEnd)
// — o instante exato de initialTermEnd já pertence à renovação por prazo
// indeterminado (mesma convenção usada para "expira em", padrão em regras de
// período: o limite superior marca o início do próximo período, não o fim
// inclusivo do atual). Um pedido apresentado exatamente nesse instante,
// portanto, já segue a regra pós-renovação (aviso de 90 dias) — não há dois
// meses-13 possíveis para o mesmo contrato.
export function isWithinInitialTerm(activatedAt: Date, at: Date): boolean {
  return at.getTime() < initialTermEnd(activatedAt).getTime()
}

export type CancellationPhase = 'initial_term' | 'post_renewal'

export interface CancellationEffectiveDateResult {
  effectiveAt: Date
  phase: CancellationPhase
}

// Calcula a data de efeito de um pedido de cancelamento (aviso de não
// renovação) a partir da ativação (imutável, já persistida em
// Company.activatedAt) e do instante do pedido. O resultado deve ser
// persistido uma única vez no momento do pedido (ver
// CancellationRequest.effectiveAt) e NUNCA recalculado depois — mesmo que
// esta função mude no futuro, pedidos já registrados preservam o valor já
// congelado.
//
// Vigência inicial (Contrato §3, itens 1-6): qualquer pedido dentro dos 12
// meses iniciais — incluindo os últimos 90 dias desse período — produz
// efeito exatamente ao final do 12º mês, nunca antes, nunca depois, e nunca
// somando 90 dias adicionais.
//
// Pós-renovação (Contrato §3, "Após a renovação automática"): pedido
// apresentado depois do fim da vigência inicial (contrato já em prazo
// indeterminado) produz efeito 90 dias corridos após o próprio pedido.
export function computeCancellationEffectiveDate(activatedAt: Date, requestedAt: Date): CancellationEffectiveDateResult {
  if (isWithinInitialTerm(activatedAt, requestedAt)) {
    return { effectiveAt: initialTermEnd(activatedAt), phase: 'initial_term' }
  }
  return { effectiveAt: addCalendarDaysUtc(requestedAt, POST_RENEWAL_NOTICE_DAYS), phase: 'post_renewal' }
}
