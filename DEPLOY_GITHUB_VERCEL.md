# ClimaPro — versão revisada

## 1. GitHub
1. Extraia este ZIP.
2. Entre no repositório do ClimaPro no GitHub.
3. Substitua os arquivos do projeto pelos arquivos desta pasta.
4. Faça o commit na branch `main`.

## 2. Supabase
1. Abra o projeto correto no Supabase.
2. Vá em SQL Editor.
3. Abra o arquivo `SUPABASE_FINAL.sql`.
4. Cole o conteúdo no SQL Editor.
5. Execute uma vez.
6. O resultado esperado é `CLIMAPRO SQL FINAL OK`.

O script não apaga tabelas nem dados.

## 3. Vercel
1. O Vercel deve detectar o novo commit do GitHub.
2. Aguarde o build.
3. O resultado esperado é `Ready`.
4. Se o Vercel não iniciar sozinho, abra o projeto e use Redeploy.

## 4. O que foi revisado
- Financeiro principal passa a abrir o Caixa novo.
- Contas a pagar e contas a receber antigas passam a redirecionar para Contas unificadas.
- A página financeira antiga continua no projeto, mas não é mais usada pela rota principal.
- Compatibilidade de `funcao` e `status` foi reforçada nas permissões/login/API.
- A tela de funcionários normaliza status para `Ativo`/`Inativo` sem quebrar registros existentes.
- Nenhuma tabela financeira antiga é apagada.
- Orçamentos e Ordens de Serviço não foram reescritos nesta revisão.
