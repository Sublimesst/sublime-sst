// ═══════════════════════════════════════════════════════════
// SUBLIME SST — Estrutura do Modelo I de importação do SOC
// Título, nome da aba e os 118 cabeçalhos abaixo foram extraídos
// programaticamente do arquivo oficial fornecido pelo SOC (Modelo1.xls,
// aba "ModeloI"), célula por célula, incluindo a cor de cada cabeçalho
// (vermelho = obrigatório, ciano = obrigatório/opcional conforme a
// parametrização de eSocial usada pelo cliente no SOC, sem cor = opcional).
// O arquivo original não faz parte do repositório nem é lido em runtime —
// esta estrutura é a fonte determinística usada pela aplicação.
// Não editar esta lista sem reconferir contra o arquivo oficial do SOC.
// ═══════════════════════════════════════════════════════════

export const SOC_TITLE = 'Modelo 1'
export const SOC_SHEET_NAME = 'ModeloI'

// Ordem e grafia exatas do cabeçalho real (linha 2 do Modelo1.xls).
export const SOC_HEADERS: readonly string[] = [
  'Cod.Unid', 'Nome Unidade', 'Cod.Setor', 'Nome Setor', 'Cod.Cargo', 'Nome Cargo',
  'Matrícula', 'Cod Funcionário', 'Nome Funcionário', 'Dt.Nascimento', 'Sexo', 'Situação',
  'Dt.Admissão', 'Dt.Demissão', 'Estado Civil', 'Pis/Pasep', 'Contratação', 'Rg', 'UF-RG',
  'CPF', 'CTPS', 'Endereço', 'Bairro', 'Cidade', 'UF', 'Cep', 'Tel', 'Naturalidade', 'Cor',
  'E-mail', 'Deficiencia', 'CBO', 'GFIP', 'Endereço Unidade', 'Bairro Unidade',
  'Cidade Unidade', 'Estado Unidade', 'Cep Unidade', 'CNPJ Unidade', 'Inscrição Unidade',
  'Tel1 Unidade', 'Tel2 Unidade', 'Tel3 Unidade', 'Tel4 Unidade', 'Contato Unid', 'Cnae',
  'Número Endereço Funcionário', 'Complemento Endereço Funcionário', 'Razão Social Unid.',
  'Nome da Mae do Funcionário', 'Cod.Centro Custo', 'Dt. Ultima Movimentação',
  'Cod. Unidade contratante', 'Razão Social', 'CNPJ', 'Turno', 'Dt.Emissão.Cart.Prof',
  'Série CTPS', 'CNAE 2.0', 'CNAE Livre', 'Descrição CNAE Livre', 'CEI', 'Função', 'CNAE 7',
  'Tipo de CNAE Utilizado', 'Descrição Detalhada do Cargo', 'Nº endereço Unidade',
  'Complemento endereço Unidade', 'Regime de Revezamento', 'Orgão Expedidor do RG',
  'Campo Livre 1', 'Campo Livre 2', 'Campo Livre 3', 'Telefone SMS', 'Grau de Risco',
  'UF CTPS', 'Nome Centro Custo', 'Autoriza SMS', 'Endereço Cobrança Unidade',
  'Número Endereço Cobrança Unidade', 'Bairro Cobrança Unidade', 'Cidade Cobrança Unidade',
  'Estado Cobrança Unidade', 'Cep Cobrança Unidade', 'Complemento Endereço Cobrança Unidade',
  'Remuneração Mensal (R$)', 'Telefone Comercial', 'Telefone Celular', 'Data Emissão RG',
  'Código do País de Nascimento', 'Origem Descrição Detalhada', 'Unidade Contratante',
  'Escolaridade', 'Código Categoria (eSocial)', 'Matrícula RH', 'Gênero', 'Nome Social',
  'Tipo de Admissão', 'Grau de Instrução', 'Nome do Pai do Funcionário', 'Tipo de Vínculo',
  'Nome do Turno', 'Campo Livre 4', 'CPF Unidade', 'CAEPF Unidade', 'Tipo Sanguíneo',
  'Dt. Inicio Periodo Aquisitivo', 'Dt. Fim Periodo Aquisitivo', 'CNO Unidade',
  'Desconsiderar para o eSocial', 'Dt. Validade RG', 'Desconsiderar Unidade para o eSocial',
  'Data Final da Estabilidade', 'Observação Estabilidade', 'Função na Brigada',
  'Cód. Empresa Gestor', 'Identificação Gestor', 'Nome Gestor',
]

// Índice (0-based) dos 8 campos obrigatórios (cor vermelha no arquivo
// original) que esta tranche efetivamente preenche. Os outros 110 índices
// ficam sempre em branco — nenhum tem origem determinística sem inventar
// valor ou coletar dado pessoal não coletado hoje pelo onboarding.
export const SOC_COLUMN_INDEX = {
  nomeUnidade: 1,
  nomeSetor: 3,
  nomeCargo: 5,
  nomeFuncionario: 8,
  dtNascimento: 9,
  sexo: 10,
  situacao: 11,
  dtAdmissao: 12,
} as const
