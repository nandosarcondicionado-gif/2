import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicEnv } from "./lib/supabase/env";

const routeModules: Array<[string, string]> = [
  ["/clientes", "clientes"],
  ["/equipamentos", "equipamentos"],
  ["/orcamentos", "orcamentos"],
  ["/ordens-servico", "ordens-servico"],
  ["/agenda", "agenda"],
  ["/contratos", "contratos"],
  ["/financeiro", "financeiro"],
  ["/estoque", "estoque"],
  ["/relatorios", "relatorios"],
  ["/funcionarios", "tecnicos"],
  ["/tecnico", "tecnico"],
  ["/area-cliente", "area-cliente"],
  ["/configuracoes", "configuracoes"],
];

function normalize(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const { url, anonKey } = getSupabasePublicEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },

      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({ request });

        cookiesToSet.forEach(
          ({ name, value, options }) => {
            response.cookies.set(name, value, options);
          }
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  /*
   * LOGIN
   */
  if (pathname === "/login") {
    return response;
  }

  /*
   * USUÁRIO NÃO AUTENTICADO
   */
  if (!user) {
    const login = request.nextUrl.clone();

    login.pathname = "/login";
    login.search = "";

    return NextResponse.redirect(login);
  }

  /*
   * FUNCIONÁRIO
   */
  const { data: funcionario } = await supabase
    .from("funcionarios")
    .select(
      "id,nome,status,permitir_acesso,perfil,funcao,permissoes,auth_user_id"
    )
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!funcionario) {
    const login = request.nextUrl.clone();

    login.pathname = "/login";
    login.search = "";

    return NextResponse.redirect(login);
  }

  /*
   * STATUS
   */
  const status = normalize(funcionario.status);

  if (
    status !== "ativo" &&
    status !== "active"
  ) {
    const login = request.nextUrl.clone();

    login.pathname = "/login";
    login.search = "";

    return NextResponse.redirect(login);
  }

  /*
   * PERMISSÃO DE ACESSO
   */
  if (funcionario.permitir_acesso !== true) {
    const login = request.nextUrl.clone();

    login.pathname = "/login";
    login.search = "";

    return NextResponse.redirect(login);
  }

  /*
   * PERFIL / FUNÇÃO
   */
  const perfil = normalize(funcionario.perfil);
  const funcao = normalize(funcionario.funcao);

  const admin =
    perfil === "administrador" ||
    perfil === "admin" ||
    funcao === "administrador" ||
    funcao === "admin";

  const gerente =
    perfil === "gerente" ||
    perfil === "encarregado" ||
    funcao === "gerente" ||
    funcao === "encarregado";

  const ajudante =
    perfil === "ajudante" ||
    funcao === "ajudante";

  /*
   * ÁREA DO AJUDANTE
   */
  if (ajudante) {
    if (
      pathname === "/" ||
      pathname === "/ajudante"
    ) {
      if (pathname === "/") {
        return NextResponse.redirect(
          new URL("/ajudante", request.url)
        );
      }

      return response;
    }

    /*
     * APIs precisam fazer sua própria validação.
     */
    if (pathname.startsWith("/api/")) {
      return response;
    }

    /*
     * O ajudante não pode acessar módulos administrativos.
     */
    const bloqueado = routeModules.some(
      ([route]) =>
        pathname === route ||
        pathname.startsWith(`${route}/`)
    );

    if (
      bloqueado ||
      pathname.startsWith("/pagamentos-hora") ||
      pathname.startsWith("/ajudantes")
    ) {
      return NextResponse.redirect(
        new URL("/ajudante", request.url)
      );
    }

    return response;
  }

  /*
   * NÃO AJUDANTE TENTANDO ACESSAR A ÁREA DO AJUDANTE
   */
  if (pathname === "/ajudante") {
    return NextResponse.redirect(
      new URL("/", request.url)
    );
  }

  /*
   * PAGAMENTOS POR HORA
   *
   * Somente administrador, gerente ou encarregado.
   */
  if (
    pathname === "/pagamentos-hora" ||
    pathname.startsWith("/pagamentos-hora/")
  ) {
    if (!admin && !gerente) {
      return NextResponse.redirect(
        new URL("/", request.url)
      );
    }

    return response;
  }

  /*
   * APIs ADMINISTRATIVAS
   */
  if (
    pathname.startsWith(
      "/api/funcionarios/pagamentos-hora"
    ) ||
    pathname.startsWith("/api/agenda/ajudantes")
  ) {
    if (!admin && !gerente) {
      return NextResponse.json(
        {
          error: "Acesso negado.",
        },
        {
          status: 403,
        }
      );
    }

    return response;
  }

  /*
   * PERMISSÕES DOS DEMAIS MÓDULOS
   */
  if (!admin) {
    const match = routeModules.find(
      ([route]) =>
        pathname === route ||
        pathname.startsWith(`${route}/`)
    );

    if (match) {
      const [, modulo] = match;

      const permissions =
        funcionario.permissoes &&
        typeof funcionario.permissoes === "object"
          ? (funcionario.permissoes as Record<
              string,
              {
                visualizar?: boolean;
              }
            >)
          : {};

      const permitido =
        modulo === "tecnicos"
          ? permissions.tecnicos?.visualizar === true ||
            permissions.tecnico?.visualizar === true
          : permissions[modulo]?.visualizar === true;

      if (!permitido) {
        return NextResponse.redirect(
          new URL("/", request.url)
        );
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
