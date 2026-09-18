# Auditoria — ClimaPro (base 2-main.zip)

## Base preservada

Esta versão foi construída diretamente sobre `2-main.zip`, que foi indicado como a última base funcional. As páginas e módulos existentes foram preservados.

## Pontos encontrados

1. O README original mandava copiar `.env.example`, mas esse arquivo não existia no pacote. Foi adicionado.
2. Não havia `.gitignore` protegendo `.env.local`; foi adicionado para evitar o envio acidental de segredos ao GitHub.
3. A aplicação usa duas chaves públicas do Supabase no navegador/SSR e uma chave administrativa no servidor. Foi adicionada validação explícita das variáveis para transformar configuração ausente em erro claro.
4. As rotas administrativas de funcionários usam `SUPABASE_SERVICE_ROLE_KEY`; a documentação agora deixa explícito que ela deve existir somente no ambiente do servidor.
5. Foram preservados os fluxos de cadastro/edição/exclusão existentes. Nenhuma tela funcional foi substituída por redirecionamento.
6. O código consulta diretamente as tabelas do Supabase. Por isso, a auditoria do código não pode confirmar a existência das tabelas, colunas e políticas RLS do projeto remoto sem acesso ao projeto Supabase.

## Tabelas referenciadas pelo código

- agenda
- caixa_movimentacoes
- clientes
- configuracoes_empresa
- contas_financeiras
- contas_pagar
- contas_receber
- contratos
- contratos_planos_mensais
- equipamentos
- estoque_produtos
- historico_manutencao
- lancamentos_financeiros
- manutencoes_equipamentos
- movimentacoes_estoque
- orcamentos
- ordens_servico
- pagamentos_funcionarios
- parcelas_planos
- permissoes_funcionarios
- planos_mensais
- planos_mensais_parcelas
- pro_labore
- tecnicos
- uso_planos_mensais
- funcionarios

## Limitação da validação

O ambiente desta auditoria não conseguiu concluir `npm install` dentro do tempo disponível; portanto não é correto declarar que o build de produção foi executado com sucesso aqui. A versão deve ser validada no mesmo ambiente GitHub/Vercel que será usado para produção.

## Ordem recomendada de validação

1. Conferir as três variáveis no Vercel.
2. Fazer deploy da versão.
3. Testar login.
4. Testar leitura e cadastro de funcionário.
5. Testar cliente, equipamento e ordem de serviço.
6. Testar financeiro, estoque, orçamento, contrato e planos mensais.
7. Se alguma gravação falhar, copiar a mensagem exata do Supabase exibida pela aplicação antes de alterar SQL ou RLS.
