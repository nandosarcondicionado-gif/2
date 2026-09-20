import { createServerClient } from "@supabase/ssr";
import {
  NextResponse,
  type NextRequest,
} from "next/server";
import { getSupabasePublicEnv } from "./lib/supabase/env";

export async function middleware(
  request: NextRequest
) {
  let response = NextResponse.next({
    request,
  });

  const { url, anonKey } =
    getSupabasePublicEnv();

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(
            ({ name, value }) => {
              request.cookies.set(
                name,
                value
              );
            }
          );

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(
            ({
              name,
              value,
              options,
            }) => {
              response.cookies.set(
                name,
                value,
                options
              );
            }
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname =
    request.nextUrl.pathname;

  /*
   * A página de login SEMPRE pode ser aberta.
   *
   * Não redirecionamos automaticamente um usuário
   * autenticado de /login para /.
   *
   * Isso é importante porque agora a própria tela
   * de login decide se o usuário é administrador,
   * técnico, ajudante ou outro funcionário.
   */
  if (pathname === "/login") {
    return response;
  }

  /*
   * Sem autenticação:
   * qualquer página protegida volta para o login.
   */
  if (!user) {
    const loginUrl =
      request.nextUrl.clone();

    loginUrl.pathname = "/login";

    loginUrl.search = "";

    return NextResponse.redirect(
      loginUrl
    );
  }

  /*
   * Usuário autenticado continua normalmente.
   *
   * A autorização de cada área é feita pelas
   * próprias páginas e pelo sistema de permissões.
   */
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
