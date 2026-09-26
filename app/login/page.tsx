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

      const { data: funcionario, error: funcionarioError } =
        await supabase
          .from("funcionarios")
          .select(
            "id,nome,status,permitir_acesso,perfil,funcao,permissoes,auth_user_id"
          )
          .eq("auth_user_id", data.user.id)
          .maybeSingle();

      if (funcionarioError) {
        console.error("Erro ao buscar funcionário:", funcionarioError);
        await supabase.auth.signOut();
        setError("Não foi possível verificar os dados do funcionário.");
        setLoading(false);
        return;
      }

      if (!funcionario) {
        await supabase.auth.signOut();
        setError("Usuário autenticado, mas o funcionário não está vinculado ao sistema.");
        setLoading(false);
        return;
      }

      const statusNormalizado = String(funcionario.status ?? "").trim().toLowerCase();
      if (statusNormalizado !== "ativo" && statusNormalizado !== "active") {
        await supabase.auth.signOut();
        setError("Este funcionário está inativo e não pode acessar o sistema.");
        setLoading(false);
        return;
      }

      if (funcionario.permitir_acesso !== true) {
        await supabase.auth.signOut();
        setError("O acesso deste funcionário está bloqueado pelo administrador.");
        setLoading(false);
        return;
      }

      const perfilNormalizado = String(funcionario.perfil ?? "").trim().toLowerCase();
      const funcaoNormalizada = String(funcionario.funcao ?? "").trim().toLowerCase();

      if (
        perfilNormalizado === "ajudante" ||
        funcaoNormalizada === "ajudante"
      ) {
        router.replace("/ajudante");
      } else {
        router.replace("/");
      }

      router.refresh();
    } catch (err) {
      console.error("Erro inesperado no login:", err);
      await supabase.auth.signOut();
      setError("Ocorreu um erro ao entrar no sistema. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <main 
      className="relative flex min-h-screen items-center justify-center p-4 bg-cover bg-center"
      style={{
        backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.85), rgba(15, 23, 42, 0.90)), url('https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=1200&auto=format&fit=crop')`
      }}
    >
      <form
        onSubmit={handleLogin}
        className="relative z-10 w-full max-w-md rounded-3xl bg-slate-900/90 border border-slate-800 p-8 shadow-2xl backdrop-blur-md text-white"
      >
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Nando's <span className="text-cyan-400">Ar-Condicionado</span>
          </h1>

          <p className="mt-2 text-xs uppercase tracking-wider text-cyan-500/80 font-semibold">
            Qualidade e confiança em todos os detalhes
          </p>
        </div>

        <div className="mt-8 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              E-mail
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Digite seu e-mail"
              autoComplete="email"
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Senha
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Sua senha"
              autoComplete="current-password"
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-cyan-500 px-4 py-3.5 font-bold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50 shadow-lg shadow-cyan-500/20"
          >
            {loading ? "Entrando..." : "Entrar no Sistema"}
          </button>
        </div>
      </form>
    </main>
  );
}
