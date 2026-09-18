import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Estes componentes ('use client') não têm harness de renderização no
// projeto (vitest está configurado com environment: 'node', sem
// @testing-library) e esta tarefa não pode adicionar dependência nova
// (ver CLAUDE.md/prompt PPV2-01). Em vez de simular renderização, este
// teste lê o código-fonte publicado e verifica a string literal exibida ao
// usuário — suficiente para travar uma regressão de terminologia sem
// introduzir infraestrutura de teste nova ou tocar em layout.
function readSource(relativePath: string): string {
  return readFileSync(resolve(__dirname, '../../', relativePath), 'utf8')
}

describe('(15) status técnico `liberada` → rótulo user-visible "Apta para pagamento"', () => {
  it('Portal do Parceiro: mapeamento COMMISSION_STATUS mantém a chave técnica `liberada` com o novo rótulo', () => {
    const src = readSource('src/app/parceiro/dashboard/page.tsx')
    expect(src).toMatch(/liberada:\s*{\s*label:\s*'Apta para pagamento'/)
  })

  it('Portal do Parceiro: card de resumo usa "Aptas para pagamento" (plural) para o total de liberadas', () => {
    const src = readSource('src/app/parceiro/dashboard/page.tsx')
    expect(src).toContain("label: 'Aptas para pagamento'")
  })

  it('Admin: mapeamento STATUS_LABELS mantém a chave técnica `liberada` com o novo rótulo', () => {
    const src = readSource('src/app/admin/comissoes/page.tsx')
    expect(src).toMatch(/liberada:\s*{\s*label:\s*'Apta para pagamento'/)
  })

  it('Admin: StatCard da home usa "Comissões aptas para pagamento", ainda lendo stats.commissions[\'liberada\']', () => {
    const src = readSource('src/app/admin/page.tsx')
    expect(src).toContain('label="Comissões aptas para pagamento"')
    expect(src).toContain("stats?.commissions['liberada']")
  })
})

describe('status técnico `liberada` nunca foi renomeado', () => {
  it('o identificador de banco/enum `liberada` continua literal em todos os arquivos alterados', () => {
    for (const file of ['src/app/parceiro/dashboard/page.tsx', 'src/app/admin/comissoes/page.tsx', 'src/app/admin/page.tsx']) {
      const src = readSource(file)
      expect(src).toContain('liberada')
    }
  })
})

describe('(16) "Apta para pagamento" nunca é tratado como equivalente a "Paga"', () => {
  it('Portal do Parceiro: rótulo de `paga` continua exatamente "Paga", distinto de "Apta para pagamento"', () => {
    const src = readSource('src/app/parceiro/dashboard/page.tsx')
    expect(src).toMatch(/paga:\s*{\s*label:\s*'Paga'/)
    expect(src).not.toContain("paga:         { label: 'Apta para pagamento'")
  })

  it('Admin: rótulo de `paga` continua exatamente "Paga", distinto de "Apta para pagamento"', () => {
    const src = readSource('src/app/admin/comissoes/page.tsx')
    expect(src).toMatch(/paga:\s*{\s*label:\s*'Paga'/)
    expect(src).not.toContain("paga:        { label: 'Apta para pagamento'")
  })

  it('nenhum dos dois mapeamentos usa "Apta para pagamento" como rótulo de `paga`', () => {
    for (const file of ['src/app/parceiro/dashboard/page.tsx', 'src/app/admin/comissoes/page.tsx']) {
      const src = readSource(file)
      const pagaLine = src.split('\n').find(l => /^\s*paga:\s*{/.test(l))
      expect(pagaLine).toBeDefined()
      expect(pagaLine).not.toContain('Apta para pagamento')
    }
  })
})

describe('varredura de consistência — mensagens/rótulos que descrevem o processo de liberação (não só o badge)', () => {
  it('Portal do Parceiro: rodapé de comissões não fala em "liberação" — descreve o momento de aptidão para pagamento', () => {
    const src = readSource('src/app/parceiro/dashboard/page.tsx')
    expect(src).toContain('momento em que a comissão se torna apta para pagamento')
    expect(src).not.toMatch(/mês seguinte ao da liberação/)
  })

  it('Copy pública de /parceiros não fala em "liberação" — mesma linguagem inequívoca do Portal', () => {
    const src = readSource('src/app/parceiros/page.tsx')
    expect(src).toContain('apta para pagamento')
    expect(src).not.toMatch(/mês seguinte à liberação/)
  })

  it('Admin: mensagem de erro do PATCH liberada→paga usa "aptas para pagamento", nunca "liberadas"', () => {
    const src = readSource('src/app/api/admin/comissoes/route.ts')
    expect(src).toContain('Só comissões aptas para pagamento podem ser marcadas como pagas.')
    expect(src).not.toContain('Só comissões liberadas podem ser marcadas como pagas.')
    // O guard técnico continua usando o valor real do status — nunca renomeado.
    expect(src).toContain("status: 'liberada'")
  })

  it('Admin: aba de view "a_liberar" não usa mais o rótulo "A liberar" (descreve processo de comissão)', () => {
    const src = readSource('src/app/admin/comissoes/page.tsx')
    expect(src).toContain("{ value: 'a_liberar',   label: 'Em carência' }")
    expect(src).not.toContain("label: 'A liberar'")
    // A chave técnica da view (usada por VIEW_CONFIG/appliedStatus) permanece intacta.
    expect(src).toContain("'a_liberar'")
  })

  it('Admin: rótulos de data/coluna não usam mais "Data de liberação"/"Liberada em"', () => {
    const src = readSource('src/app/admin/comissoes/page.tsx')
    expect(src).not.toContain('Data de liberação')
    expect(src).not.toContain('Liberada em')
    // O campo técnico liberadaEm (chave de dados, orderBy, dateBase) permanece intacto.
    expect(src).toContain('liberadaEm')
  })
})

describe('liberadaEm é data-alvo/fim da carência — nunca apresentado como timestamp factual da transição', () => {
  // Commission.liberadaEm é gravado no momento da CRIAÇÃO da comissão como
  // a data-alvo do fim da carência (now + 30 dias) — não como o instante em
  // que o cron efetivamente executou em_carencia -> liberada. Uma Commission
  // ainda em_carencia já tem liberadaEm no futuro, então rotular esse campo
  // como "Apta para pagamento: <data>"/"Data em que ficou apta para
  // pagamento" afirmaria falsamente que a transição já ocorreu.
  it('Admin: rótulos de data usam "Fim da carência" — nunca "Data em que ficou apta para pagamento" ou "Apta em"', () => {
    const src = readSource('src/app/admin/comissoes/page.tsx')
    expect(src).toContain("liberadaEm: 'Fim da carência'")
    expect(src).toContain('<option value="liberadaEm">Fim da carência</option>')
    expect(src).toContain("'Fim da carência'")
    expect(src).not.toContain('Data em que ficou apta para pagamento')
    expect(src).not.toContain("'Apta em'")
  })

  it('Portal do Parceiro: texto junto à data de liberadaEm usa "Fim da carência", não "Apta para pagamento"', () => {
    const src = readSource('src/app/parceiro/dashboard/page.tsx')
    expect(src).toContain('Fim da carência: {formatDate(c.liberadaEm)}')
    expect(src).not.toContain('Apta para pagamento: {formatDate(c.liberadaEm)}')
  })

  it('o rótulo do status `liberada` continua "Apta para pagamento" — só a apresentação do campo de data mudou', () => {
    const parceiro = readSource('src/app/parceiro/dashboard/page.tsx')
    const admin = readSource('src/app/admin/comissoes/page.tsx')
    expect(parceiro).toMatch(/liberada:\s*{\s*label:\s*'Apta para pagamento'/)
    expect(admin).toMatch(/liberada:\s*{\s*label:\s*'Apta para pagamento'/)
  })
})
