import { redirect } from "next/navigation";
import { createClient } from "../lib/supabase/server";
import { hasPermission } from "../lib/permissoes";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  /*
   * Se não existe usuário autenticado,
   * vai para o login.
   */
  if (!user) {
    redirect("/login");
  }

  /*
   * Verifica se o usuário possui acesso
   * ao Dashboard.
   */
  const permitido =
    await hasPermission(
      "dashboard",
      "visualizar"
    );

  /*
   * IMPORTANTE:
   *
   * Antes o sistema fazia:
   *
   * redirect("/login")
   *
   * quando o usuário não tinha permissão.
   *
   * Isso fazia parecer que a senha estava errada
   * e criava o efeito de:
   *
   * LOGIN → DASHBOARD → LOGIN
   *
   * Agora o usuário continua autenticado e recebe
   * uma mensagem clara.
   */
  if (!permitido) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-lg rounded-2xl bg-white p-6 text-center shadow-lg">

          <h1 className="text-2xl font-bold text-slate-900">
            Acesso não liberado
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            Seu usuário foi autenticado,
            mas não possui a permissão necessária
            para visualizar o Dashboard.
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Peça ao administrador para liberar
            a permissão
            &quot;Dashboard → Visualizar&quot;
            no cadastro do funcionário.
          </p>

        </div>
      </main>
    );
  }

  return (
    <DashboardClient />
  );
}
