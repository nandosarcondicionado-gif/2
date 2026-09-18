# ClimaPro — versão revisada sobre a base funcional

Esta versão preserva a estrutura e as telas da base `2-main.zip`. Foram feitas somente correções/configurações de suporte, sem substituir módulos funcionais por redirecionamentos.

## 1. Requisitos

- Node.js 20 ou superior
- Projeto Supabase já configurado
- Projeto Vercel conectado ao GitHub

## 2. Desenvolvimento local

```bash
npm install
```

Copie `.env.example` para `.env.local` e preencha as três variáveis:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Depois:

```bash
npm run dev
```

## 3. Vercel

Em **Project Settings → Environment Variables**, cadastre as mesmas três variáveis para os ambientes necessários (Production, Preview e/ou Development).

**Atenção:** `SUPABASE_SERVICE_ROLE_KEY` é segredo de servidor. Nunca coloque essa chave em código do navegador, em variável `NEXT_PUBLIC_*` ou no GitHub.

Depois de salvar as variáveis, faça um novo deploy. Se necessário, use **Redeploy** para garantir que o novo ambiente seja criado com as variáveis atualizadas.

## 4. Supabase

Não execute scripts SQL adicionais sem comparar com o banco que já está funcionando. Esta aplicação depende das tabelas, colunas, relacionamentos e políticas RLS existentes no projeto Supabase.

As rotas de administração de funcionários também usam `SUPABASE_SERVICE_ROLE_KEY` exclusivamente no servidor.

## 5. Teste mínimo após o deploy

1. Abrir `/login` e autenticar.
2. Abrir Funcionários e carregar a lista.
3. Cadastrar um funcionário de teste.
4. Editar o funcionário.
5. Alterar Ativo/Inativo.
6. Excluir somente o registro de teste, se apropriado.
7. Repetir o fluxo de adicionar/editar/excluir nos módulos principais.

Se o erro for de banco/RLS, a mensagem exibida pelo sistema deve ser usada para identificar a tabela, coluna ou política que precisa ser ajustada.
