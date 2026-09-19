"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    const { data, error: loginError } =
      await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

    if (loginError || !data.user) {
      setError("E-mail ou senha inválidos.");
      setLoading(false);
      return;
    }

    // O funcionário pode estar ligado ao Auth
    // pelo campo auth_user_id.
    const { data: funcionario, error: funcionarioError } =
      await supabase
        .from("funcionarios")
        .select(
          "id, auth_user_id, nome, funcao, perfil, status, permitir_acesso, acesso_status"
        )
        .eq("auth_user_id", data.user.id)
        .maybeSingle();

    if (
      funcionarioError ||
      !funcionario ||
      funcionario.status !== "Ativo" &&
      funcionario.status !== "ativo"
    ) {
      await supabase.auth.signOut();

      setError(
        "Usuário não autorizado, sem acesso ou inativo."
      );

      setLoading(false);
      return;
    }

    if (funcionario.permitir_acesso !== true) {
      await supabase.auth.signOut();

      setError(
        "Este funcionário não possui acesso ao sistema."
      );

      setLoading(false);
      return;
    }

    if (
      funcionario.acesso_status &&
      funcionario.acesso_status !== "Ativo"
    ) {
      await supabase.auth.signOut();

      setError(
        "O acesso deste funcionário está desativado."
      );

      setLoading(false);
      return;
    }

    if (funcionario.funcao === "tecnico") {
      router.push("/tecnico");
    } else {
      router.push("/");
    }

    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
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
              onChange={(event) =>
                setEmail(event.target.value)
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
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Digite sua senha"
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
