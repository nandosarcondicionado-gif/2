import { createServerClient } from "@supabase/ssr";

import {
  NextResponse,
  type NextRequest,
} from "next/server";

import {
  getSupabasePublicEnv,
} from "./lib/supabase/env";

const routeModules: Array<
  [string, string]
> = [
  [
    "/clientes",
    "clientes",
  ],

  [
    "/equipamentos",
    "equipamentos",
  ],

  [
    "/orcamentos",
    "orcamentos",
  ],

  [
    "/ordens-servico",
    "ordens-servico",
  ],

  [
    "/agenda",
    "agenda",
  ],

  [
    "/contratos",
    "contratos",
  ],

  [
    "/financeiro",
    "financeiro",
  ],

  [
    "/estoque",
    "estoque",
  ],

  [
    "/relatorios",
    "relatorios",
  ],

  [
    "/funcionarios",
    "tecnicos",
  ],

  [
    "/tecnico",
    "tecnico",
  ],

  [
    "/area-cliente",
    "area-cliente",
  ],

  [
    "/configuracoes",
    "configuracoes",
  ],
];

function normalize(
  value: unknown
) {
  return String(
    value ?? ""
  )
    .trim()
    .toLowerCase();
}

export async function middleware(
  request: NextRequest
) {
  let response =
    NextResponse.next({
      request,
    });

  const {
    url,
    anonKey,
  } =
    getSupabasePublicEnv();

  const supabase =
    createServerClient(
      url,
      anonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },

          setAll(
            cookiesToSet
          ) {
            cookiesToSet.forEach(
              ({
                name,
                value,
              }) =>
                request.cookies.set(
                  name,
                  value
                )
            );

            response =
              NextResponse.next({
                request,
              });

            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }) =>
                response.cookies.set(
                  name,
                  value,
                  options
                )
            );
          },
        },
      }
    );

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  const pathname =
    request.nextUrl.pathname;

  if (
    pathname ===
    "/login"
  ) {
    return response;
  }

  if (!user) {
    const login =
      request.nextUrl.clone();

    login.pathname =
      "/login";

    login.search = "";

    return NextResponse.redirect(
      login
    );
  }

  const {
    data: funcionario,
  } =
    await supabase
      .from("funcionarios")
      .select(
        "id,nome,status,permitir_acesso,perfil,funcao,permissoes,auth_user_id"
      )
      .eq(
        "auth_user_id",
        user.id
      )
      .maybeSingle();

  if (!funcionario) {
    const login =
      request.nextUrl.clone();

    login.pathname =
      "/login";

    login.search = "";

    return NextResponse.redirect(
      login
    );
  }

  const status =
    normalize(
      funcionario.status
    );

  if (
    status !==
      "ativo" ||
    funcionario.permitir_acesso !==
      true
  ) {
    const login =
      request.nextUrl.clone();

    login.pathname =
      "/login";

    login.search = "";

    return NextResponse.redirect(
      login
    );
  }

  const perfil =
    normalize(
      funcionario.perfil
    );

  const funcao =
    normalize(
      funcionario.funcao
    );

  const admin =
    [
      "administrador",
      "admin",
    ].includes(
      perfil
    ) ||
    [
      "administrador",
      "admin",
    ].includes(
      funcao
    );

  const ajudante =
    perfil ===
      "ajudante" ||
    funcao ===
      "ajudante";

  /*
   * AJUDANTE
   *
   * O ajudante possui uma área própria.
   */

  if (ajudante) {
    if (
      pathname ===
        "/" ||
      pathname ===
        "/ajudante"
    ) {
      if (
        pathname ===
        "/"
      ) {
        return NextResponse.redirect(
          new URL(
            "/ajudante",
            request.url
          )
        );
      }

      return response;
    }

    /*
     * APIs possuem suas próprias
     * verificações.
     */

    if (
      pathname.startsWith(
        "/api/"
      )
    ) {
      return response;
    }

    const bloqueado =
      routeModules.some(
        ([
          route,
        ],
      ) =>
        pathname ===
          route ||
        pathname.startsWith(
          `${route}/`
        )
      );

    if (
      bloqueado ||
      pathname.startsWith(
        "/funcionarios/pagamentos-hora"
      )
    ) {
      return NextResponse.redirect(
        new URL(
          "/ajudante",
          request.url
        )
      );
    }
  }

  /*
   * Usuário que não é ajudante
   * não entra na área do ajudante.
   */

  if (
    pathname ===
      "/ajudante" &&
    !ajudante
  ) {
    return NextResponse.redirect(
      new URL(
        "/",
        request.url
      )
    );
  }

  /*
   * PAGAMENTO POR HORA
   *
   * Administrador e gerente podem acessar.
   */

  if (
    pathname.startsWith(
      "/funcionarios/pagamentos-hora"
    )
  ) {
    const gerente =
      [
        "gerente",
        "encarregado",
      ].includes(
        perfil
      ) ||
      [
        "gerente",
        "encarregado",
      ].includes(
        funcao
      );

    if (
      !admin &&
      !gerente
    ) {
      return NextResponse.redirect(
        new URL(
          "/",
          request.url
        )
      );
    }

    return response;
  }

  /*
   * DEMAIS PERFIS
   *
   * Verificação real de permissão
   * antes de permitir abrir a rota.
   */

  if (!admin) {
    const match =
      routeModules.find(
        ([
          route,
        ,
        ]) =>
          pathname ===
            route ||
          pathname.startsWith(
            `${route}/`
          )
      );

    if (match) {
      const [
        ,
        modulo,
      ] = match;

      const permissions =
        funcionario.permissoes &&
        typeof funcionario.permissoes ===
          "object"
          ? (funcionario.permissoes as Record<
              string,
              {
                visualizar?: boolean;
              }
            >)
          : {};

      const permitido =
        modulo ===
        "tecnicos"
          ? permissions
                .tecnicos
                ?.visualizar ===
              true ||
            permissions
              .tecnico
              ?.visualizar ===
              true
          : permissions[
              modulo
            ]?.visualizar ===
            true;

      if (!permitido) {
        return NextResponse.redirect(
          new URL(
            "/",
            request.url
          )
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
