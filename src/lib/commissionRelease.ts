// ═══════════════════════════════════════════════════════════
// SUBLIME SST — Liberação automática de comissão (PPV2-01)
//
// Commission nasce com status='em_carencia' e liberadaEm gravado no momento
// da criação como a data-alvo (now + 30 dias, ver
// src/app/api/webhooks/asaas/route.ts). Até esta correção, nenhuma rotina
// lia esse campo para transicionar o status quando a data chegava — ver
// docs/PARTNER_PORTAL_V2_SPEC.md Seção 9.1.
//
// Único efeito desta rotina: em_carencia -> liberada, quando liberadaEm já
// passou. Um único updateMany atômico faz a condição de elegibilidade
// (status='em_carencia' AND liberadaEm <= now) participar da própria
// operação de escrita — mesmo padrão de guard já usado em
// src/app/api/admin/comissoes/route.ts (PATCH liberada->paga) e em
// src/lib/cancellationProcessor.ts. Isso garante, ao mesmo tempo:
//   - idempotência: uma Commission já 'liberada' não bate mais no filtro,
//     então reexecutar não tem efeito adicional;
//   - segurança contra concorrência: duas execuções simultâneas competem
//     pela mesma linha via lock de UPDATE do Postgres; quem "perde" a
//     corrida reavalia o WHERE após o commit da primeira e não encontra
//     mais a linha em 'em_carencia', sem duplicar a transição.
// `liberadaEm: { lte: now }` já exclui liberadaEm=null estruturalmente
// (NULL <= data é NULL/false em SQL, Prisma traduz para a mesma semântica)
// — nenhum fallback de data é inventado para o caso null.
// Nunca toca 'liberada', 'paga', 'bloqueada' ou 'estornada', e nunca
// altera mensalidadeLiq/percentual/valorComissao — o `data` do updateMany
// só contém `status`.
// ═══════════════════════════════════════════════════════════

import { prisma } from './prisma'

export interface ReleaseDueCommissionsResult {
  released: number
}

export async function releaseDueCommissions(now: Date = new Date()): Promise<ReleaseDueCommissionsResult> {
  const result = await prisma.commission.updateMany({
    where: { status: 'em_carencia', liberadaEm: { lte: now } },
    data: { status: 'liberada' },
  })

  return { released: result.count }
}
