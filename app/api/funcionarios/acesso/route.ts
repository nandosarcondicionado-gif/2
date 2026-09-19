import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      funcionarioId,
      permitirAcesso,
      emailLogin,
      senhaInicial,
      perfil,
      permissoes,
    } = body;

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
      if (authUserId) {
        const { error: updateAuthError } =
          await supabaseAdmin.auth.admin.updateUserById(
            authUserId,
            {
              email: emailLogin,
              password: senhaInicial,
              email_confirm: true,
            }
          );

        if (updateAuthError) {
          return NextResponse.json(
            { error: updateAuthError.message },
            { status: 400 }
          );
        }
      } else {
        const { data: authData, error: createAuthError } =
          await supabaseAdmin.auth.admin.createUser({
            email: emailLogin,
            password: senhaInicial,
            email_confirm: true,
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
      await supabaseAdmin.auth.admin.updateUserById(authUserId, {
        ban_duration: "876000h",
      });
    }

    const { error: updateFuncionarioError } = await supabaseAdmin
      .from("funcionarios")
      .update({
        permitir_acesso: permitirAcesso,
        email_login: permitirAcesso ? emailLogin : null,
        perfil: perfil || "Tecnico",
        permissoes: permissoes || {},
        auth_user_id: permitirAcesso ? authUserId : funcionario.auth_user_id,
        acesso_status: permitirAcesso ? "Ativo" : "Sem acesso",
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
    console.error(error);

    return NextResponse.json(
      {
        error: "Erro interno ao configurar o acesso do funcionário.",
      },
      { status: 500 }
    );
  }
}
