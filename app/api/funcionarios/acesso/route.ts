import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceRoleEnv } from "@/lib/supabase/env";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Não autenticado." },
        { status: 401 }
      );
    }

    // Procura o administrador pelo vínculo correto com o usuário autenticado.
    let administrador = null;

    const { data: adminPorAuth } = await supabase
      .from("funcionarios")
      .select("id, funcao, status, perfil, auth_user_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (adminPorAuth) {
      administrador = adminPorAuth;
    } else {
      const { data: adminPorId } = await supabase
        .from("funcionarios")
        .select("id, funcao, status, perfil, auth_user_id")
        .eq("id", user.id)
        .maybeSingle();

      administrador = adminPorId;
    }

    const perfil = String(administrador?.perfil || "")
      .trim()
      .toLowerCase();

    const funcao = String(administrador?.funcao || "")
      .trim()
      .toLowerCase();

    const status = String(administrador?.status || "")
      .trim()
      .toLowerCase();

    const ehAdministrador =
      perfil === "administrador" || funcao === "administrador";

    if (!administrador || !ehAdministrador || status !== "ativo") {
      return NextResponse.json(
        {
          error:
            "Acesso negado. Somente administradores podem configurar acessos.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const funcionarioId = String(body?.funcionarioId || "").trim();
    const permitirAcesso = body?.permitirAcesso === true;
    const emailLogin = String(body?.emailLogin || "")
      .trim()
      .toLowerCase();
    const senhaInicial = String(body?.senhaInicial || "");
    const perfilFuncionario = String(
      body?.perfil || "Tecnico"
    ).trim();

    const permissoes =
      body?.permissoes && typeof body.permissoes === "object"
        ? body.permissoes
        : {};

    if (!funcionarioId) {
      return NextResponse.json(
        { error: "ID do funcionário não informado." },
        { status: 400 }
      );
    }

    if (permitirAcesso) {
      if (!emailLogin) {
        return NextResponse.json(
          {
            error:
              "Para permitir acesso, informe o e-mail de login.",
          },
          { status: 400 }
        );
      }

      if (senhaInicial && senhaInicial.length < 6) {
        return NextResponse.json(
          {
            error:
              "A senha precisa ter pelo menos 6 caracteres.",
          },
          { status: 400 }
        );
      }
    }

    const { url, serviceRoleKey } =
      getSupabaseServiceRoleEnv();

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

    const { data: funcionario, error: funcionarioError } =
      await supabaseAdmin
        .from("funcionarios")
        .select(
          "id, auth_user_id, nome, email, email_login"
        )
        .eq("id", funcionarioId)
        .single();

    if (funcionarioError || !funcionario) {
      return NextResponse.json(
        { error: "Funcionário não encontrado." },
        { status: 404 }
      );
    }

    let authUserId = funcionario.auth_user_id;

    if (permitirAcesso) {
      // Já existe usuário no Auth
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

        // Só troca a senha se uma nova senha foi informada.
        if (senhaInicial) {
          dadosAtualizacao.password = senhaInicial;
        }

        const { error: updateAuthError } =
          await supabaseAdmin.auth.admin.updateUserById(
            authUserId,
            dadosAtualizacao
          );

        if (updateAuthError) {
          return NextResponse.json(
            { error: updateAuthError.message },
            { status: 400 }
          );
        }
      } else {
        // Ainda não existe usuário no Auth
        if (!senhaInicial || senhaInicial.length < 6) {
          return NextResponse.json(
            {
              error:
                "Informe uma senha inicial com pelo menos 6 caracteres para criar o acesso.",
            },
            { status: 400 }
          );
        }

        const { data: authData, error: createAuthError } =
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

        if (createAuthError || !authData.user) {
          return NextResponse.json(
            {
              error:
                createAuthError?.message ||
                "Não foi possível criar o usuário de acesso.",
            },
            { status: 400 }
          );
        }

        authUserId = authData.user.id;
      }
    } else if (authUserId) {
      // Bloqueia o usuário no Supabase Auth.
      const { error: disableError } =
        await supabaseAdmin.auth.admin.updateUserById(
          authUserId,
          {
            ban_duration: "876000h",
          }
        );

      if (disableError) {
        return NextResponse.json(
          { error: disableError.message },
          { status: 400 }
        );
      }
    }

    const { error: updateFuncionarioError } =
      await supabaseAdmin
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
        { error: updateFuncionarioError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: permitirAcesso
        ? "Acesso do funcionário criado/atualizado com sucesso."
        : "Acesso do funcionário desativado.",
      authUserId,
    });
  } catch (error) {
    console.error(
      "Erro ao configurar acesso do funcionário:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Erro interno ao configurar o acesso do funcionário.",
      },
      { status: 500 }
    );
  }
}
