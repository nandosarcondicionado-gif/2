"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setError("");

    const emailNormalizado = email.trim().toLowerCase();

    try {
      /*
       * 1. Faz o login no Supabase Auth.
       */
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: emailNormalizado,
          password,
        });

      if (loginError || !data.user) {
        setError("E-mail ou senha inválidos.");
        setLoading(false);
        return;
      }

      /*
       * 2. Localiza o funcionário pelo ID do usuário autenticado.
       *
       * Usamos somente colunas que fazem parte da estrutura
       * utilizada pelo middleware do sistema.
       */
      const { data: funcionario, error: funcionarioError } =
        await supabase
          .from("funcionarios")
          .select(
            "id,nome,status,permitir_acesso,perfil,funcao,permissoes,auth_user_id"
          )
          .eq("auth_user_id", data.user.id)
          .maybeSingle();

      if (funcionarioError) {
        console.error(
          "Erro ao buscar funcionário:",
          funcionarioError
        );

        await supabase.auth.signOut();

        setError(
          "Não foi possível verificar os dados do funcionário."
        );

        setLoading(false);
        return;
      }

      /*
       * 3. O usuário do Supabase precisa estar vinculado
       * ao cadastro correspondente na tabela funcionarios.
       */
      if (!funcionario) {
        await supabase.auth.signOut();

        setError(
          "Usuário autenticado, mas o funcionário não está vinculado ao sistema."
        );

        setLoading(false);
        return;
      }

      /*
       * 4. Verifica se o funcionário está ativo.
       */
      const statusNormalizado = String(
        funcionario.status ?? ""
      )
        .trim()
        .toLowerCase();

      if (
        statusNormalizado !== "ativo" &&
        statusNormalizado !== "active"
      ) {
        await supabase.auth.signOut();

        setError(
          "Este funcionário está inativo e não pode acessar o sistema."
        );

        setLoading(false);
        return;
      }

      /*
       * 5. Verifica se o administrador permitiu o acesso.
       */
      if (funcionario.permitir_acesso !== true) {
        await supabase.auth.signOut();

        setError(
          "O acesso deste funcionário está bloqueado pelo administrador."
        );

        setLoading(false);
        return;
      }

      /*
       * 6. Normaliza o perfil/função.
       */
      const perfilNormalizado = String(
        funcionario.perfil ?? ""
      )
        .trim()
        .toLowerCase();

      const funcaoNormalizada = String(
        funcionario.funcao ?? ""
      )
        .trim()
        .toLowerCase();

      /*
       * 7. Ajudante possui área própria.
       *
       * Gerente, administrador, técnico etc. entram no
       * dashboard principal e o middleware decide o que
       * cada perfil pode acessar.
       */
      if (
        perfilNormalizado === "ajudante" ||
        funcaoNormalizada === "ajudante"
      ) {
        router.replace("/ajudante");
      } else {
        router.replace("/");
      }

      /*
       * Atualiza a sessão/cookies antes da navegação.
       */
      router.refresh();
    } catch (err) {
      console.error("Erro inesperado no login:", err);

      await supabase.auth.signOut();

      setError(
        "Ocorreu um erro ao entrar no sistema. Tente novamente."
      );

      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg"
      >
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900">
            ClimaPro
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Sistema de gestão para empresas de climatização
          </p>
        </div>

        <div className="mt-8 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              E-mail
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Digite seu e-mail"
              autoComplete="email"
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Senha
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Sua senha"
              autoComplete="current-password"
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </div>
      </form>
    </main>
  );
}
