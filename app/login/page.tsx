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

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError("");

    const emailNormalizado = email.trim().toLowerCase();

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

    const userId = data.user.id;

    /*
     * O funcionário é vinculado ao usuário do Supabase
     * através de auth_user_id.
     */
    const { data: funcionario, error: funcionarioError } =
      await supabase
        .from("funcionarios")
        .select(
          `
            id,
            auth_user_id,
            nome,
            funcao,
            perfil,
            cargo,
            status,
            permitir_acesso,
            acesso_status,
            permissoes
          `
        )
        .eq("auth_user_id", userId)
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
     * Compatibilidade com uma conta administrativa antiga.
     */
    let funcionarioFinal = funcionario;

    if (!funcionarioFinal) {
      const { data: funcionarioAntigo } =
        await supabase
          .from("funcionarios")
          .select(
            `
              id,
              auth_user_id,
              nome,
              funcao,
              perfil,
              cargo,
              status,
              permitir_acesso,
              acesso_status,
              permissoes
            `
          )
          .eq("id", userId)
          .maybeSingle();

      funcionarioFinal = funcionarioAntigo;
    }

    if (!funcionarioFinal) {
      await supabase.auth.signOut();

      setError(
        "Usuário autenticado, mas o funcionário não está vinculado ao sistema."
      );

      setLoading(false);
      return;
    }

    /*
     * STATUS
     */
    const statusNormalizado = String(
      funcionarioFinal.status ?? ""
    )
      .trim()
      .toLowerCase();

    const funcionarioAtivo =
      statusNormalizado === "ativo" ||
      statusNormalizado === "active";

    if (!funcionarioAtivo) {
      await supabase.auth.signOut();

      setError(
        "Este funcionário está inativo e não pode acessar o sistema."
      );

      setLoading(false);
      return;
    }

    /*
     * ACESSO
     */
    const acessoStatusNormalizado = String(
      funcionarioFinal.acesso_status ?? ""
    )
      .trim()
      .toLowerCase();

    const acessoPermitido =
      funcionarioFinal.permitir_acesso === true ||
      acessoStatusNormalizado === "ativo";

    if (!acessoPermitido) {
      await supabase.auth.signOut();

      setError(
        "O acesso deste funcionário está bloqueado pelo administrador."
      );

      setLoading(false);
      return;
    }

    /*
     * A partir daqui o funcionário já está autenticado,
     * ativo e autorizado a entrar.
     *
     * NÃO vamos decidir o destino pelo perfil.
     *
     * Isso permite que Gerente, Técnico, Ajudante,
     * Atendente etc. entrem normalmente.
     *
     * O DashboardClient controla as permissões.
     */
    router.replace("/");

    router.refresh();
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
              onChange={(e) =>
                setEmail(e.target.value)
              }
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
              onChange={(e) =>
                setPassword(e.target.value)
              }
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
