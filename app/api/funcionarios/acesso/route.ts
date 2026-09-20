import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceRoleEnv } from "@/lib/supabase/env";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";

type PermissionSet = {
  visualizar: boolean;
  criar: boolean;
  editar: boolean;
  excluir: boolean;
};

type RequestBody = {
  funcionario_id?: string;
  permitir_acesso?: boolean;
  email_login?: string;
  senha?: string;
  perfil?: string;
  permissoes?: Record<string, PermissionSet>;
};

function jsonError(
  message: string,
  status = 400,
  details?: unknown
) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
      details:
        process.env.NODE_ENV === "development"
          ? details
          : undefined,
    },
    { status }
  );
}

function normalizePermissions(
  permissions:
    | Record<string, PermissionSet>
    | undefined
) {
  if (!permissions) {
    return {};
  }

  return permissions;
}

export async function POST(
  request: Request
) {
  try {
    /*
     * =====================================================
     * 1. VERIFICAR A SESSÃO DO ADMINISTRADOR
     * =====================================================
     *
     * Este cliente usa a sessão normal do navegador.
     * Ele NÃO é usado para criar o Auth do funcionário.
     */

    const supabase =
      await createServerClient();

    const {
      data: {
        user,
      },
      error: userError,
    } = await supabase.auth.getUser();

    if (
      userError ||
      !user
    ) {
      return jsonError(
        "Sessão administrativa não encontrada. Faça login novamente.",
        401,
        userError
      );
    }

    /*
     * =====================================================
     * 2. VERIFICAR SE QUEM ESTÁ FAZENDO A ALTERAÇÃO
     *    É UM ADMINISTRADOR
     * =====================================================
     */

    const { data: adminByAuthId } =
      await supabase
        .from("funcionarios")
        .select(
          "id, nome, funcao, perfil, status, permitir_acesso, auth_user_id"
        )
        .eq(
          "auth_user_id",
          user.id
        )
        .maybeSingle();

    let admin = adminByAuthId;

    /*
     * Compatibilidade com estrutura antiga:
     * em alguns cadastros o auth_user_id pode não
     * estar preenchido corretamente.
     */

    if (!admin) {
      const { data: adminById } =
        await supabase
          .from("funcionarios")
          .select(
            "id, nome, funcao, perfil, status, permitir_acesso, auth_user_id"
          )
          .eq("id", user.id)
          .maybeSingle();

      admin = adminById;
    }

    if (!admin) {
      return jsonError(
        "Usuário administrativo não encontrado no cadastro de funcionários.",
        403
      );
    }

    const adminRole = String(
      admin.funcao ||
        admin.perfil ||
        ""
    ).toLowerCase();

    const isAdmin =
      adminRole === "administrador" ||
      adminRole === "admin";

    if (!isAdmin) {
      return jsonError(
        "Apenas um administrador pode configurar o acesso de funcionários.",
        403
      );
    }

    if (
      admin.status &&
      admin.status !== "Ativo"
    ) {
      return jsonError(
        "O usuário administrador está inativo.",
        403
      );
    }

    /*
     * =====================================================
     * 3. LER OS DADOS ENVIADOS PELA TELA
     * =====================================================
     */

    const body =
      (await request.json()) as RequestBody;

    const funcionarioId =
      body.funcionario_id?.trim();

    const permitirAcesso =
      Boolean(
        body.permitir_acesso
      );

    const emailLogin =
      body.email_login
        ?.trim()
        .toLowerCase() || "";

    const senha =
      body.senha?.trim() || "";

    const perfil =
      body.perfil?.trim() ||
      "Tecnico";

    const permissoes =
      normalizePermissions(
        body.permissoes
      );

    if (!funcionarioId) {
      return jsonError(
        "O funcionário não foi informado."
      );
    }

    /*
     * NUNCA permitir que a rota altere o próprio
     * administrador logado.
     */

    if (
      funcionarioId ===
      admin.id
    ) {
      return jsonError(
        "O administrador não pode configurar o próprio acesso por esta tela.",
        403
      );
    }

    /*
     * =====================================================
     * 4. BUSCAR O FUNCIONÁRIO
     * =====================================================
     */

    const {
      data: funcionario,
      error:
        funcionarioError,
    } = await supabase
      .from("funcionarios")
      .select(
        "id, nome, email, email_login, auth_user_id, permitir_acesso, acesso_status, perfil"
      )
      .eq(
        "id",
        funcionarioId
      )
      .maybeSingle();

    if (
      funcionarioError
    ) {
      return jsonError(
        "Não foi possível consultar o funcionário.",
        500,
        funcionarioError
      );
    }

    if (!funcionario) {
      return jsonError(
        "Funcionário não encontrado.",
        404
      );
    }

    /*
     * =====================================================
     * 5. CONFIGURAR O CLIENTE SERVICE ROLE
     * =====================================================
     *
     * MUITO IMPORTANTE:
     *
     * persistSession: false
     * autoRefreshToken: false
     *
     * Isso impede que o cliente administrativo do
     * Supabase altere a sessão do navegador.
     */

    let serviceEnv;

    try {
      serviceEnv =
        getSupabaseServiceRoleEnv();
    } catch (error) {
      return jsonError(
        "A chave administrativa do Supabase não está configurada no servidor.",
        500,
        error
      );
    }

    const supabaseAdmin =
      createSupabaseAdminClient(
        serviceEnv.url,
        serviceEnv.serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

    /*
     * =====================================================
     * 6. BLOQUEAR ACESSO
     * =====================================================
     *
     * Se o administrador escolheu "Não — sem acesso",
     * não apagamos o funcionário.
     *
     * Apenas bloqueamos o login Auth e atualizamos
     * os dados do funcionário.
     */

    if (!permitirAcesso) {
      if (
        funcionario.auth_user_id
      ) {
        const {
          error:
            banError,
        } =
          await supabaseAdmin.auth.admin.updateUserById(
            funcionario.auth_user_id,
            {
              ban_duration:
                "876000h",
            }
          );

        if (banError) {
          return jsonError(
            "Não foi possível bloquear o acesso do funcionário.",
            500,
            banError
          );
        }
      }

      const {
        error:
          updateError,
      } = await supabase
        .from("funcionarios")
        .update({
          permitir_acesso: false,
          acesso_status:
            "Sem acesso",
          email_login:
            emailLogin ||
            funcionario.email_login ||
            funcionario.email ||
            null,
          perfil,
          permissoes,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          funcionarioId
        );

      if (updateError) {
        return jsonError(
          "O acesso foi bloqueado no Auth, mas houve erro ao atualizar o cadastro do funcionário.",
          500,
          updateError
        );
      }

      return NextResponse.json({
        ok: true,
        message:
          "Acesso do funcionário bloqueado com sucesso.",
        permitir_acesso: false,
        auth_user_id:
          funcionario.auth_user_id ||
          null,
      });
    }

    /*
     * =====================================================
     * 7. VALIDAR DADOS PARA LIBERAR ACESSO
     * =====================================================
     */

    if (!emailLogin) {
      return jsonError(
        "Informe o e-mail de login do funcionário."
      );
    }

    if (
      !funcionario.auth_user_id &&
      !senha
    ) {
      return jsonError(
        "Informe uma senha para criar o acesso do funcionário."
      );
    }

    if (
      senha &&
      senha.length < 6
    ) {
      return jsonError(
        "A senha precisa ter pelo menos 6 caracteres."
      );
    }

    /*
     * =====================================================
     * 8. CRIAR OU ATUALIZAR USUÁRIO AUTH
     * =====================================================
     */

    let authUserId =
      funcionario.auth_user_id ||
      null;

    if (!authUserId) {
      /*
       * Criar novo usuário.
       *
       * IMPORTANTE:
       * usamos createUser no servidor.
       *
       * Não fazemos signIn.
       * Não fazemos setSession.
       * Não fazemos signOut.
       */

      const {
        data:
          createdUser,
        error:
          createUserError,
      } =
        await supabaseAdmin.auth.admin.createUser(
          {
            email: emailLogin,
            password: senha,
            email_confirm: true,
            user_metadata: {
              funcionario_id:
                funcionario.id,
              nome:
                funcionario.nome,
              perfil,
            },
          }
        );

      if (
        createUserError
      ) {
        /*
         * Caso o e-mail já exista no Auth,
         * tentar localizar o usuário pelo e-mail
         * para evitar criar duplicado.
         */

        const {
          data:
            listData,
          error:
            listError,
        } =
          await supabaseAdmin.auth.admin.listUsers(
            {
              page: 1,
              perPage: 1000,
            }
          );

        if (
          listError
        ) {
          return jsonError(
            `Não foi possível criar o acesso: ${createUserError.message}`,
            500,
            createUserError
          );
        }

        const existingUser =
          listData.users.find(
            (item) =>
              item.email?.toLowerCase() ===
              emailLogin
          );

        if (!existingUser) {
          return jsonError(
            `Não foi possível criar o acesso: ${createUserError.message}`,
            500,
            createUserError
          );
        }

        authUserId =
          existingUser.id;

        /*
         * Usuário existente:
         * atualizar senha e dados.
         */

        const {
          error:
            updateExistingError,
        } =
          await supabaseAdmin.auth.admin.updateUserById(
            authUserId,
            {
              password: senha,
              email_confirm: true,
              user_metadata: {
                funcionario_id:
                  funcionario.id,
                nome:
                  funcionario.nome,
                perfil,
              },
              ban_duration: "none",
            }
          );

        if (
          updateExistingError
        ) {
          return jsonError(
            "O usuário já existia, mas não foi possível atualizar o acesso.",
            500,
            updateExistingError
          );
        }
      } else {
        authUserId =
          createdUser.user?.id ||
          null;
      }
    } else {
      /*
       * Usuário Auth já existe.
       * Atualizar e liberar novamente.
       */

      const updateData: {
        email: string;
        email_confirm: boolean;
        user_metadata: {
          funcionario_id: string;
          nome: string;
          perfil: string;
        };
        ban_duration: string;
        password?: string;
      } = {
        email: emailLogin,
        email_confirm: true,
        user_metadata: {
          funcionario_id:
            funcionario.id,
          nome:
            funcionario.nome,
          perfil,
        },
        ban_duration: "none",
      };

      if (senha) {
        updateData.password =
          senha;
      }

      const {
        error:
          updateUserError,
      } =
        await supabaseAdmin.auth.admin.updateUserById(
          authUserId,
          updateData
        );

      if (
        updateUserError
      ) {
        return jsonError(
          "Não foi possível atualizar o usuário de acesso do funcionário.",
          500,
          updateUserError
        );
      }
    }

    if (!authUserId) {
      return jsonError(
        "O usuário foi processado, mas o ID do acesso não foi retornado.",
        500
      );
    }

    /*
     * =====================================================
     * 9. SALVAR O VÍNCULO NO FUNCIONÁRIO
     * =====================================================
     */

    const {
      error:
        finalUpdateError,
    } = await supabase
      .from("funcionarios")
      .update({
        auth_user_id:
          authUserId,

        permitir_acesso:
          true,

        email_login:
          emailLogin,

        perfil,

        permissoes,

        acesso_status:
          "Ativo",

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        funcionarioId
      );

    if (
      finalUpdateError
    ) {
      return jsonError(
        "O acesso foi criado no Supabase Auth, mas não foi possível atualizar o cadastro do funcionário.",
        500,
        finalUpdateError
      );
    }

    /*
     * =====================================================
     * 10. RESPOSTA
     * =====================================================
     */

    return NextResponse.json({
      ok: true,
      message:
        "Acesso do funcionário configurado com sucesso.",
      funcionario_id:
        funcionarioId,
      auth_user_id:
        authUserId,
      permitir_acesso:
        true,
      email_login:
        emailLogin,
      perfil,
    });
  } catch (error) {
    console.error(
      "Erro interno na API de acesso do funcionário:",
      error
    );

    return jsonError(
      "Erro interno ao configurar o acesso do funcionário.",
      500,
      error
    );
  }
}
