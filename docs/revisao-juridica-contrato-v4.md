# Revisão jurídica — Contrato v4 (Sublime Digital)

**Data:** 2026-07-04 · **Analisado por:** Claude (Fable 5) — *este relatório é uma análise técnica
preparatória e NÃO substitui parecer de advogado(a) habilitado(a). Nenhuma alteração foi aplicada
aos textos jurídicos sem aprovação.*

**Fontes analisadas:**
- `/termos` (src/app/termos/page.tsx) — texto vinculante aceito eletronicamente (v. 2026-06-28)
- PDF anexado ao e-mail de boas-vindas (src/lib/contractPdf.ts) — extrato + comprovante de aceite
- Contrato da linha tradicional (Condomínio do Bosque, 01/02/2025) — fornecido pelo usuário como base de comparação

---

## 🔴 A. CONTRADIÇÕES ENTRE O /termos E O PDF (corrigir antes de tudo)

O cliente **aceita** o texto do `/termos`, mas **recebe por e-mail** o PDF — e os dois divergem.
Em disputa, a divergência joga contra a Sublime (interpretação contra o fornecedor, CDC art. 47
quando aplicável e princípio geral de interpretação contra quem redigiu).

| # | Tema | /termos (aceito) | PDF (enviado) | Risco |
|---|------|------------------|---------------|-------|
| A1 | Limitação de responsabilidade | últimos **6 meses** | últimos **3 meses** | Contradição direta de valor |
| A2 | Numeração de cláusulas | 6ª=Obrigações; 9ª=Suporte; 12ª=Aceitação | 6ª=Pagamento; 9ª=Rescisão/Multa | O comprovante de aceite referencia cláusulas que não correspondem ao texto aceito |
| A3 | Mora (multa 2%, juros 1% a.m., suspensão 15d) | **AUSENTE** | presente (Cl. 6ª) | Cobrança de encargos sem previsão no texto aceito é juridicamente frágil |
| A4 | Reajuste anual (IPCA) | **AUSENTE** | presente | Sem cláusula no texto aceito, o preço fica congelado na renovação |
| A5 | Regras de rescisão 7º–12º mês (aviso 60 dias) | ausente (só compromisso de 6 mensalidades) | presente (Cl. 9.2) | Regra aplicável não consta do texto aceito |
| A6 | Retenção de dados (LGPD) | vigência + **5 anos**, depois exclui | "eliminados após encerramento, salvo obrigação legal" | Ver item B1 — ambos conflitam com a NR-7 |

**Recomendação:** unificar — o `/termos` deve ser a fonte única e o PDF um espelho fiel dele
(mesma numeração, mesmos valores). Hoje parecem ser versões diferentes (v3 vs v4).

## 🔴 B. CONFLITOS COM OBRIGAÇÃO LEGAL

- **B1 — Prontuários médicos e a regra dos 20 anos (NR-7).** O PCMSO gera registros médicos
  ocupacionais cuja guarda obrigatória é de **20 anos após o desligamento** do trabalhador.
  O `/termos` (Cl. 11ª) promete excluir/anonimizar dados **5 anos** após o fim do contrato —
  para dados de saúde ocupacional isso descumpre a NR-7. Corrigir a cláusula de retenção
  criando categoria específica: "registros médicos ocupacionais: prazo da NR-7 (20 anos)".
- **B2 — Transferência de prontuários na rescisão.** O contrato tradicional da Sublime já trata
  disso (transferência ao novo médico coordenador em 90 dias, guarda paga se não solicitada).
  O v4 **não diz nada** sobre o destino dos registros médicos após a rescisão. Incluir cláusula.

## 🟡 C. GAPS vs CONTRATO TRADICIONAL (avaliar inclusão no v4)

| # | Cláusula existente no tradicional | Situação no v4 | Sugestão |
|---|-----------------------------------|----------------|----------|
| C1 | Revogação formal do PGR/PCMSO na rescisão | Ausente | Incluir — evita uso dos documentos (e do nome do médico coordenador) após o fim do contrato |
| C2 | Sigilo médico específico (resultados só ao trabalhador; à empresa apenas com autorização escrita) | Só sigilo genérico | Incluir versão adaptada — protege a Sublime e o médico |
| C3 | Ausência de vínculo empregatício (CC art. 593+) | Ausente | Incluir — cláusula padrão, custo zero |
| C4 | Comunicações oficiais (canal e efeitos) | Parcial | Incluir: "comunicações via e-mail cadastrado e portal valem para todos os fins contratuais" |
| C5 | Escalonamento de inadimplência (bloqueio → negativação → rescisão) | Só no PDF (suspensão 15d) | Definir no /termos: suspensão do portal/serviços + possibilidade de negativação + rescisão por inadimplência > X dias |
| C6 | Anticorrupção | Ausente | Baixa prioridade no digital (PME); considerar apenas na linha de consultoria/contratos maiores |
| C7 | Reajuste (tradicional usa IPC-Fipe Saúde ou IGP-M, o maior) | PDF usa IPCA | Decisão comercial: IPCA é mais defensável para PME; escolher UM índice e constar no /termos |

**Pontos em que o v4 está MELHOR que o tradicional (manter):** juros de 1% a.m. no PDF
(o tradicional usa 0,33%/dia ≈ 10%/mês, vulnerável a questionamento); escopo de exclusões
explícito; cláusula de elegibilidade/migração; LGPD detalhada com papéis, base legal e prazo
de notificação de incidente; aceite eletrônico bem documentado (IP, UA, hash SHA-256).

## 🔴 D. DEFEITOS NO CONTRATO TRADICIONAL (fora do escopo v4, mas urgentes)

O documento fornecido **não é de concorrente — é contrato da própria Sublime** (mesma CNPJ),
aparentemente adaptado do template de outra empresa:

1. **Cita "NR Soluções" e "NR Saúde"** nas cláusulas de procuração eletrônica do eSocial e de
   agendamento de exames — ou seja, a procuração estaria formalmente em nome de terceiro.
   Corrigir em TODOS os contratos ativos que usem esse modelo.
2. Juros moratórios de 0,33%/dia (~10%/mês) — vulnerável juridicamente; alinhar a 1% a.m.
3. Typo "neventa" (noventa) na cláusula de transferência de prontuários.
4. Representação: o tradicional é assinado por Cláudia Regina Arêde Ferreira (Sócia Proprietária);
   o PDF digital, por Ariane Guimaraes Leite (Sócia-Administradora). Confirmar poderes de
   representação de cada instrumento no contrato social.

## E. OBSERVAÇÕES MENORES NO v4

- E1 — PDF, aviso de autenticidade: usa caractere "⚠" que pode não renderizar na fonte Helvetica
  do pdfkit (verificar saída real).
- E2 — /termos Cl. 5ª: "pagamento das mensalidades remanescentes" — remanescentes do quê
  (das 6? do ano?) — explicitar "remanescentes para completar as 6 (seis) mensalidades mínimas".
- E3 — /termos Cl. 12ª menciona "dispensando... testemunhas" — correto para validade, mas sem
  testemunhas o instrumento não é título executivo extrajudicial (CPC art. 784, III); a cobrança
  exigirá ação monitória/conhecimento. Aceitável para o modelo, mas é uma escolha consciente.
- E4 — Banner "sujeito a revisão jurídica" no /termos: manter até a validação por advogado;
  remover depois (ele enfraquece o documento perante o cliente).

## Ordem sugerida de execução

1. **A1–A6**: unificar /termos ↔ PDF (mesma versão, mesmos números) — *bloqueia tudo*
2. **B1–B2**: retenção NR-7 e destino dos prontuários
3. **C1–C5**: cláusulas novas de baixo custo
4. **D1**: correção do template tradicional (NR Soluções)
5. Revisão por advogado(a) → remover banner do /termos
