import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "../../../../../lib/supabase/server";
import { getSupabaseServiceRoleEnv } from "../../../../../lib/supabase/env";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "Usuário não autenticado.",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * LOCALIZA O FUNCIONÁRIO QUE ESTÁ LOGADO
     *
     * Primeiro tenta pelo auth_user_id.
     *
     * Isso é o relacionamento correto entre:
     *
     * Supabase Auth
     *        ↓
     * funcionarios.auth_user_id
     */

    let administrador: any = null;

    const { data: adminByAuthId } =
      await supabase
        .from("funcionarios")
        .select(
          "id, nome, perfil, status, funcao, auth_user_id"
        )
        .eq("auth_user_id", user.id)
        .maybeSingle();

    administrador = adminByAuthId;

    /*
     * COMPATIBILIDADE COM O CADASTRO ANTIGO
     *
     * Seu administrador antigo possui o mesmo UUID
     * no campo id e no Auth.
     *
     * Então também verificamos o ID.
     */

    if (!administrador) {
      const { data: adminById } =
        await supabase
          .from("funcionarios")
          .select(
            "id, nome, perfil, status, funcao, auth_user_id"
          )
          .eq("id", user.id)
          .maybeSingle();

      administrador = adminById;
    }

    if (!administrador) {
      return NextResponse.json(
        {
          error:
            "Seu usuário de acesso não está vinculado a um funcionário administrador.",
        },
        {
          status: 403,
        }
      );
    }

    const perfil =
      String(
        administrador.perfil || ""
      )
        .trim()
        .toLowerCase();

    const funcao =
      String(
        administrador.funcao || ""
      )
        .trim()
        .toLowerCase();

    const status =
      String(
        administrador.status || ""
      )
        .trim()
        .toLowerCase();

    /*
     * ACEITA AS DUAS ESTRUTURAS:
     *
     * perfil = Administrador
     *
     * OU
     *
     * funcao = administrador
     *
     * Isso mantém compatibilidade com o cadastro antigo.
     */

    const isAdministrator =
      perfil === "administrador" ||
      funcao === "administrador";

    const isActive =
      status === "ativo";

    if (!isAdministrator || !isActive) {
      return NextResponse.json(
        {
          error:
            "Acesso negado. Somente administradores ativos podem configurar acesso.",
        },
        {
          status: 403,
        }
      );
    }

    const body = await request.json();

    const funcionarioId =
      String(
        body?.funcionarioId || ""
      ).trim();

    const permitirAcesso =
      body?.permitirAcesso === true;

    const emailLogin =
      String(
        body?.emailLogin || ""
      )
        .trim()
        .toLowerCase();

    const senhaInicial =
      String(
        body?.senhaInicial || ""
      );

    const perfilFuncionario =
      String(
        body?.perfil || "Tecnico"
      ).trim();

    const permissoes =
      body?.permissoes &&
      typeof body.permissoes === "object"
        ? body.permissoes
        : {};

    if (!funcionarioId) {
      return NextResponse.json(
        {
          error:
            "ID do funcionário não informado.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      permitirAcesso &&
      !emailLogin
    ) {
      return NextResponse.json(
        {
          error:
            "Informe o e-mail de login do funcionário.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      permitirAcesso &&
      senhaInicial &&
      senhaInicial.length < 6
    ) {
      return NextResponse.json(
        {
          error:
            "A senha precisa ter pelo menos 6 caracteres.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      url,
      serviceRoleKey,
    } = getSupabaseServiceRoleEnv();

    const supabaseAdmin =
      createAdminClient(
        url,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

    /*
     * BUSCA O FUNCIONÁRIO
     */

    const {
      data: funcionario,
      error: funcionarioError,
    } =
      await supabaseAdmin
        .from("funcionarios")
        .select(
          "id, nome, email, auth_user_id, codigo_acesso, pin_acesso"
        )
        .eq("id", funcionarioId)
        .single();

    if (
      funcionarioError ||
      !funcionario
    ) {
      return NextResponse.json(
        {
          error:
            "Funcionário não encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    let authUserId =
      funcionario.auth_user_id;

    /*
     * GERAR CÓDIGO CASO AINDA NÃO TENHA
     */

    let codigoAcesso =
      funcionario.codigo_acesso;

    if (!codigoAcesso) {
      const base =
        funcionario.nome
          .normalize("NFD")
          .replace(
            /[\u0300-\u036f]/g,
            ""
          )
          .replace(
            /[^a-zA-Z]/g,
            ""
          )
          .toUpperCase()
          .slice(0, 3) || "FUN";

      codigoAcesso =
        `${base}-${Math.floor(
          1000 + Math.random() * 9000
        )}`;
    }

    /*
     * GERAR PIN CASO AINDA NÃO TENHA
     */

    let pinAcesso =
      funcionario.pin_acesso;

    if (!pinAcesso) {
      pinAcesso =
        String(
          Math.floor(
            100000 +
              Math.random() *
                900000
          )
        );
    }

    /*
     * ACESSO LIBERADO
     */

    if (permitirAcesso) {
      /*
       * JÁ EXISTE USUÁRIO NO AUTH
       */

      if (authUserId) {
        const updateData: {
          email: string;
          email_confirm: boolean;
          ban_duration: string;
          password?: string;
          user_metadata?: Record<
            string,
            unknown
          >;
        } = {
          email: emailLogin,
          email_confirm: true,
          ban_duration: "none",
          user_metadata: {
            funcionario_id:
              funcionarioId,
            nome: funcionario.nome,
            perfil:
              perfilFuncionario,
          },
        };

        /*
         * Só altera a senha se uma nova
         * senha foi informada.
         */

        if (senhaInicial) {
          updateData.password =
            senhaInicial;
        }

        const {
          error: updateAuthError,
        } =
          await supabaseAdmin.auth.admin.updateUserById(
            authUserId,
            updateData
          );

        if (updateAuthError) {
          return NextResponse.json(
            {
              error:
                updateAuthError.message,
            },
            {
              status: 400,
            }
          );
        }
      } else {
        /*
         * CRIA NOVO USUÁRIO NO SUPABASE AUTH
         */

        if (!senhaInicial) {
          return NextResponse.json(
            {
              error:
                "Para criar um novo acesso, informe uma senha de pelo menos 6 caracteres.",
            },
            {
              status: 400,
            }
          );
        }

        const {
          data: authData,
          error: createAuthError,
        } =
          await supabaseAdmin.auth.admin.createUser(
            {
              email:
                emailLogin,

              password:
                senhaInicial,

              email_confirm:
                true,

              user_metadata: {
                funcionario_id:
                  funcionarioId,

                nome:
                  funcionario.nome,

                perfil:
                  perfilFuncionario,

                codigo_acesso:
                  codigoAcesso,
              },
            }
          );

        if (
          createAuthError ||
          !authData.user
        ) {
          return NextResponse.json(
            {
              error:
                createAuthError?.message ||
                "Não foi possível criar o usuário de acesso.",
            },
            {
              status: 400,
            }
          );
        }

        authUserId =
          authData.user.id;
      }
    }

    /*
     * ACESSO BLOQUEADO
     */

    if (
      !permitirAcesso &&
      authUserId
    ) {
      const {
        error: disableError,
      } =
        await supabaseAdmin.auth.admin.updateUserById(
          authUserId,
          {
            ban_duration:
              "876000h",
          }
        );

      if (disableError) {
        return NextResponse.json(
          {
            error:
              disableError.message,
          },
          {
            status: 400,
          }
        );
      }
    }

    /*
     * ATUALIZA O FUNCIONÁRIO
     */

    const {
      error: updateFuncionarioError,
    } =
      await supabaseAdmin
        .from("funcionarios")
        .update({
          permitir_acesso:
            permitirAcesso,

          email_login:
            permitirAcesso
              ? emailLogin
              : funcionario.email ||
                null,

          perfil:
            perfilFuncionario,

          permissoes:
            permissoes,

          codigo_acesso:
            codigoAcesso,

          pin_acesso:
            pinAcesso,

          auth_user_id:
            authUserId || null,

          acesso_status:
            permitirAcesso
              ? "Ativo"
              : "Bloqueado",

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          funcionarioId
        );

    if (
      updateFuncionarioError
    ) {
      return NextResponse.json(
        {
          error:
            updateFuncionarioError.message,
        },
        {
          status: 400,
        }
      );
    }

    return NextResponse.json({
      success: true,

      message:
        permitirAcesso
          ? "Acesso liberado com sucesso."
          : "Acesso bloqueado com sucesso.",

      authUserId,

      codigoAcesso,

      pinAcesso,
    });
  } catch (error) {
    console.error(
      "Erro ao configurar acesso:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Erro interno ao configurar o acesso do funcionário.",
      },
      {
        status: 500,
      }
    );
  }
}
