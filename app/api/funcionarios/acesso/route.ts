import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "../../../../../lib/supabase/server";
import { getSupabaseServiceRoleEnv } from "../../../../../lib/supabase/env";

export async function POST(request: NextRequest) {
  try {
    // Verifica quem está fazendo a alteração.
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

    // Somente administrador pode criar/alterar acessos.
    const { data: administrador, error: adminError } =
      await supabase
        .from("funcionarios")
        .select("funcao, status")
        .eq("id", user.id)
        .single();

    if (
      adminError ||
      !administrador ||
      administrador.funcao !== "administrador" ||
      administrador.status !== "ativo"
    ) {
      return NextResponse.json(
        { error: "Acesso negado. Somente administradores podem configurar acessos." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const funcionarioId = String(body?.funcionarioId || "").trim();
    const permitirAcesso = body?.permitirAcesso === true;
    const emailLogin = String(body?.emailLogin || "").trim().toLowerCase();
    const senhaInicial = String(body?.senhaInicial || "");
    const perfil = String(body?.perfil || "Tecnico").trim();
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
      if (!emailLogin || !senhaInicial) {
        return NextResponse.json(
          {
            error:
              "Para permitir acesso, informe o e-mail de login e a senha inicial.",
          },
          { status: 400 }
        );
      }

      if (senhaInicial.length < 6) {
        return NextResponse.json(
          {
            error: "A senha inicial precisa ter pelo menos 6 caracteres.",
          },
          { status: 400 }
        );
      }
    }

    const { url, serviceRoleKey } = getSupabaseServiceRoleEnv();

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
        .select("id, auth_user_id, nome")
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
      // Se já possui usuário no Auth, atualiza.
      if (authUserId) {
        const { error: updateAuthError } =
          await supabaseAdmin.auth.admin.updateUserById(
            authUserId,
            {
              email: emailLogin,
              password: senhaInicial,
              email_confirm: true,
              ban_duration: "none",
            }
          );

        if (updateAuthError) {
          return NextResponse.json(
            { error: updateAuthError.message },
            { status: 400 }
          );
        }
      } else {
        // Caso ainda não possua usuário, cria.
        const { data: authData, error: createAuthError } =
          await supabaseAdmin.auth.admin.createUser({
            email: emailLogin,
            password: senhaInicial,
            email_confirm: true,
            user_metadata: {
              funcionario_id: funcionarioId,
              nome: funcionario.nome,
              perfil,
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
      // Desativa o acesso sem apagar o funcionário.
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
          email_login: permitirAcesso ? emailLogin : null,
          perfil,
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
