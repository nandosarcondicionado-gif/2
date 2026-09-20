import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceRoleEnv } from "@/lib/supabase/env";

export async function POST(request: NextRequest) {
  try {
    // =========================================================
    // 1. VERIFICAR USUÁRIO LOGADO
    // =========================================================

    const supabase = await createServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json(
        {
          error: "Erro ao verificar usuário autenticado.",
          detalhe: authError.message,
          etapa: "autenticacao",
        },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json(
        {
          error: "Não autenticado.",
          etapa: "autenticacao",
        },
        { status: 401 }
      );
    }

    // =========================================================
    // 2. LOCALIZAR O ADMINISTRADOR
    // =========================================================

    let administrador = null;

    const { data: adminPorAuth, error: adminAuthError } =
      await supabase
        .from("funcionarios")
        .select(
          "id, nome, funcao, status, perfil, auth_user_id"
        )
        .eq("auth_user_id", user.id)
        .maybeSingle();

    if (adminAuthError) {
      return NextResponse.json(
        {
          error: "Erro ao localizar administrador.",
          detalhe: adminAuthError.message,
          codigo: adminAuthError.code,
          etapa: "localizar_administrador_por_auth",
          userId: user.id,
        },
        { status: 500 }
      );
    }

    if (adminPorAuth) {
      administrador = adminPorAuth;
    } else {
      const { data: adminPorId, error: adminIdError } =
        await supabase
          .from("funcionarios")
          .select(
            "id, nome, funcao, status, perfil, auth_user_id"
          )
          .eq("id", user.id)
          .maybeSingle();

      if (adminIdError) {
        return NextResponse.json(
          {
            error: "Erro ao localizar administrador pelo ID.",
            detalhe: adminIdError.message,
            codigo: adminIdError.code,
            etapa: "localizar_administrador_por_id",
            userId: user.id,
          },
          { status: 500 }
        );
      }

      administrador = adminPorId;
    }

    if (!administrador) {
      return NextResponse.json(
        {
          error:
            "Acesso negado. O usuário autenticado não está vinculado a um administrador na tabela funcionarios.",
          etapa: "validacao_administrador",
          userId: user.id,
        },
        { status: 403 }
      );
    }

    const perfilAdministrador = String(
      administrador.perfil || ""
    )
      .trim()
      .toLowerCase();

    const funcaoAdministrador = String(
      administrador.funcao || ""
    )
      .trim()
      .toLowerCase();

    const statusAdministrador = String(
      administrador.status || ""
    )
      .trim()
      .toLowerCase();

    const ehAdministrador =
      perfilAdministrador === "administrador" ||
      funcaoAdministrador === "administrador";

    if (!ehAdministrador) {
      return NextResponse.json(
        {
          error:
            "Acesso negado. O usuário autenticado não possui perfil de administrador.",
          etapa: "validacao_perfil",
          userId: user.id,
          perfil: administrador.perfil,
          funcao: administrador.funcao,
        },
        { status: 403 }
      );
    }

    if (statusAdministrador !== "ativo") {
      return NextResponse.json(
        {
          error:
            "Acesso negado. O administrador está com status diferente de Ativo.",
          etapa: "validacao_status",
          userId: user.id,
          status: administrador.status,
        },
        { status: 403 }
      );
    }

    // =========================================================
    // 3. LER DADOS ENVIADOS PELO FORMULÁRIO
    // =========================================================

    const body = await request.json();

    const funcionarioId = String(
      body?.funcionarioId || ""
    ).trim();

    const permitirAcesso =
      body?.permitirAcesso === true;

    const emailLogin = String(
      body?.emailLogin || ""
    )
      .trim()
      .toLowerCase();

    const senhaInicial = String(
      body?.senhaInicial || ""
    );

    const perfilFuncionario = String(
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
          error: "ID do funcionário não informado.",
          etapa: "validacao_dados",
        },
        { status: 400 }
      );
    }

    if (permitirAcesso && !emailLogin) {
      return NextResponse.json(
        {
          error:
            "Para permitir acesso, informe o e-mail de login.",
          etapa: "validacao_email",
        },
        { status: 400 }
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
          etapa: "validacao_senha",
        },
        { status: 400 }
      );
    }

    // =========================================================
    // 4. PEGAR CHAVES DO SUPABASE
    // =========================================================

    let url: string;
    let serviceRoleKey: string;

    try {
      const env = getSupabaseServiceRoleEnv();

      url = env.url;
      serviceRoleKey = env.serviceRoleKey;
    } catch (error) {
      return NextResponse.json(
        {
          error:
            "Não foi possível carregar as configurações administrativas do Supabase.",
          detalhe:
            error instanceof Error
              ? error.message
              : String(error),
          etapa: "configuracao_supabase",
        },
        { status: 500 }
      );
    }

    if (!url || !serviceRoleKey) {
      return NextResponse.json(
        {
          error:
            "URL ou Service Role Key do Supabase não configurada.",
          etapa: "configuracao_supabase",
        },
        { status: 500 }
      );
    }

    // =========================================================
    // 5. CRIAR CLIENT ADMINISTRATIVO
    // =========================================================

    const supabaseAdmin = createAdminClient(
      url,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // =========================================================
    // 6. LOCALIZAR FUNCIONÁRIO
    // =========================================================

    const {
      data: funcionario,
      error: funcionarioError,
    } = await supabaseAdmin
      .from("funcionarios")
      .select(
        "id, nome, email, email_login, auth_user_id, permitir_acesso"
      )
      .eq("id", funcionarioId)
      .single();

    if (funcionarioError) {
      return NextResponse.json(
        {
          error:
            "Erro ao consultar o funcionário no banco de dados.",
          detalhe: funcionarioError.message,
          codigo: funcionarioError.code,
          etapa: "buscar_funcionario",
          funcionarioId,
        },
        { status: 500 }
      );
    }

    if (!funcionario) {
      return NextResponse.json(
        {
          error: "Funcionário não encontrado.",
          etapa: "buscar_funcionario",
          funcionarioId,
        },
        { status: 404 }
      );
    }

    let authUserId = funcionario.auth_user_id;

    // =========================================================
    // 7. CRIAR OU ATUALIZAR ACESSO NO SUPABASE AUTH
    // =========================================================

    if (permitirAcesso) {
      // -------------------------------------------------------
      // FUNCIONÁRIO JÁ POSSUI USUÁRIO AUTH
      // -------------------------------------------------------

      if (authUserId) {
        const dadosAtualizacao: {
          email?: string;
          email_confirm?: boolean;
          password?: string;
          ban_duration?: string;
        } = {
          email: emailLogin,
          email_confirm: true,
          ban_duration: "none",
        };

        if (senhaInicial) {
          dadosAtualizacao.password = senhaInicial;
        }

        const {
          error: updateAuthError,
        } =
          await supabaseAdmin.auth.admin.updateUserById(
            authUserId,
            dadosAtualizacao
          );

        if (updateAuthError) {
          return NextResponse.json(
            {
              error:
                "Não foi possível atualizar o usuário no Supabase Auth.",
              detalhe: updateAuthError.message,
              etapa: "atualizar_usuario_auth",
              authUserId,
            },
            { status: 400 }
          );
        }
      }

      // -------------------------------------------------------
      // FUNCIONÁRIO AINDA NÃO POSSUI USUÁRIO AUTH
      // -------------------------------------------------------

      else {
        if (!senhaInicial) {
          return NextResponse.json(
            {
              error:
                "Informe uma senha inicial para criar o acesso.",
              etapa: "criar_usuario_auth",
            },
            { status: 400 }
          );
        }

        if (senhaInicial.length < 6) {
          return NextResponse.json(
            {
              error:
                "A senha inicial precisa ter pelo menos 6 caracteres.",
              etapa: "criar_usuario_auth",
            },
            { status: 400 }
          );
        }

        const {
          data: authData,
          error: createAuthError,
        } =
          await supabaseAdmin.auth.admin.createUser({
            email: emailLogin,
            password: senhaInicial,
            email_confirm: true,
            user_metadata: {
              funcionario_id: funcionarioId,
              nome: funcionario.nome,
              perfil: perfilFuncionario,
            },
          });

        if (createAuthError) {
          return NextResponse.json(
            {
              error:
                "Não foi possível criar o usuário de acesso no Supabase Auth.",
              detalhe: createAuthError.message,
              codigo: createAuthError.status,
              etapa: "criar_usuario_auth",
              email: emailLogin,
            },
            { status: 400 }
          );
        }

        if (!authData?.user) {
          return NextResponse.json(
            {
              error:
                "O Supabase não retornou o usuário criado.",
              etapa: "criar_usuario_auth",
            },
            { status: 500 }
          );
        }

        authUserId = authData.user.id;
      }
    }

    // =========================================================
    // 8. BLOQUEAR ACESSO
    // =========================================================

    else if (authUserId) {
      const {
        error: disableError,
      } =
        await supabaseAdmin.auth.admin.updateUserById(
          authUserId,
          {
            ban_duration: "876000h",
          }
        );

      if (disableError) {
        return NextResponse.json(
          {
            error:
              "Não foi possível bloquear o usuário no Supabase Auth.",
            detalhe: disableError.message,
            etapa: "bloquear_usuario_auth",
            authUserId,
          },
          { status: 400 }
        );
      }
    }

    // =========================================================
    // 9. ATUALIZAR FUNCIONÁRIO
    // =========================================================

    const {
      error: updateFuncionarioError,
    } = await supabaseAdmin
      .from("funcionarios")
      .update({
        permitir_acesso: permitirAcesso,

        email_login: permitirAcesso
          ? emailLogin
          : null,

        perfil: perfilFuncionario,

        permissoes,

        auth_user_id: permitirAcesso
          ? authUserId
          : funcionario.auth_user_id,

        acesso_status: permitirAcesso
          ? "Ativo"
          : "Sem acesso",

        updated_at: new Date().toISOString(),
      })
      .eq("id", funcionarioId);

    if (updateFuncionarioError) {
      return NextResponse.json(
        {
          error:
            "O usuário foi processado, mas não foi possível atualizar o funcionário.",
          detalhe: updateFuncionarioError.message,
          codigo: updateFuncionarioError.code,
          etapa: "atualizar_funcionario",
          funcionarioId,
        },
        { status: 400 }
      );
    }

    // =========================================================
    // 10. SUCESSO
    // =========================================================

    return NextResponse.json({
      success: true,

      message: permitirAcesso
        ? "Acesso do funcionário criado/atualizado com sucesso."
        : "Acesso do funcionário desativado.",

      authUserId,

      funcionarioId,

      etapa: "concluido",
    });
  } catch (error) {
    console.error(
      "ERRO DETALHADO AO CONFIGURAR ACESSO:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Erro interno ao configurar o acesso do funcionário.",

        detalhe:
          error instanceof Error
            ? error.message
            : String(error),

        etapa: "erro_inesperado",
      },
      { status: 500 }
    );
  }
}
