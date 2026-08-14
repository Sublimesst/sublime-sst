// Fonte única de verdade para visibilidade de Document no Portal Cliente.
// "contrato" tem fluxo próprio de geração/persistência/hash
// (src/lib/contractPersistence.ts) e nunca depende de entrega operacional —
// permanece sempre acessível ao cliente. Qualquer outro tipoDocumento
// (hoje sempre um dos técnicos em ALLOWED_ADMIN_TIPOS — pgr, pcmso,
// declaracao, os_epi, ltcat — mas a regra não depende dessa lista) só fica
// visível depois da entrega formal, evidenciada exclusivamente por
// `Company.documentsDeliveredAt != null` — nunca pelo status atual da
// Company. Fail-closed por construção: um tipoDocumento desconhecido ou
// inesperado nunca é liberado antes da entrega, pois só "contrato" tem
// tratamento explícito de exceção. Usado em defesa em profundidade:
// dashboard, listagem da API e download direto aplicam esta mesma regra.
export function isDocumentVisibleToClient(
  tipoDocumento: string,
  documentsDeliveredAt: Date | null
): boolean {
  if (tipoDocumento === 'contrato') return true
  return documentsDeliveredAt != null
}
