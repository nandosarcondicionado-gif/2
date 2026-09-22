import { NextResponse } from "next/server";
import {
  createClient as createServerClient,
} from "../../../../../lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import {
  getSupabaseServiceRoleEnv,
} from "../../../../../lib/supabase/env";

const allowedModules = [
  "dashboard",
  "clientes",
  "equipamentos",
  "orcamentos",
  "ordens-servico",
  "agenda",
  "contratos",
  "financeiro",
  "estoque",
  "relatorios",
  "tecnicos",
  "tecnico",
  "area-cliente",
  "configuracoes",
] as const;

type PermissionInput = {
  modulo: string;
  visualizar?: boolean;
  criar?: boolean;
  editar?: boolean;
  excluir?: boolean;
};

async function checkAdmin() {
  const supabase =
    await createServerClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    return {
      authorized: false,
      status: 401,
      error: "Não autenticado.",
    };
  }

  const {
    data: funcionario,
    error,
  } =
    await supabase
      .from("funcionarios")
      .select(
        "funcao, perfil, status"
      )
      .eq(
        "id",
        user.id
      )
      .maybeSingle();

  /*
   * Aceita administrador tanto pela função
   * quanto pelo perfil.
   *
   * Isso deixa essa rota compatível com a estrutura
   * atual da tela de Funcionários.
   */
  const funcaoNormalizada =
    String(
      funcionario?.funcao ?? ""
    )
      .trim()
      .toLowerCase();

  const perfilNormalizado =
    String(
      funcionario?.perfil ?? ""
    )
      .trim()
      .toLowerCase();

  const statusNormalizado =
    String(
      funcionario?.status ?? ""
    )
      .trim()
      .toLowerCase();

  const isAdmin =
    funcaoNormalizada ===
      "administrador" ||
    funcaoNormalizada ===
      "admin" ||
    perfilNormalizado ===
      "administrador" ||
    perfilNormalizado ===
      "admin";

  const ativo =
    statusNormalizado ===
      "ativo" ||
    statusNormalizado ===
      "active";

  if (
    error ||
    !funcionario ||
    !isAdmin ||
    !ativo
  ) {
    return {
      authorized: false,
      status: 403,
      error: "Acesso negado.",
    };
  }

  return {
    authorized: true,
    user,
  };
}

function getAdminClient() {
  const {
    url,
    serviceRoleKey,
  } =
    getSupabaseServiceRoleEnv();

  return createClient(
    url,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken:
          false,
        persistSession:
          false,
      },
    }
  );
}

export async function GET(
  _request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const adminCheck =
      await checkAdmin();

    if (
      !adminCheck.authorized
    ) {
      return NextResponse.json(
        {
          error:
            adminCheck.error,
        },
        {
          status:
            adminCheck.status,
        }
      );
    }

    const { id } =
      await context.params;

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Funcionário inválido.",
        },
        {
          status: 400,
        }
      );
    }

    const adminSupabase =
      getAdminClient();

    const {
      data: permissions,
      error,
    } =
      await adminSupabase
        .from(
          "permissoes_funcionarios"
        )
        .select(
          "funcionario_id, modulo, visualizar, criar, editar, excluir"
        )
        .eq(
          "funcionario_id",
          id
        )
        .order(
          "modulo",
          {
            ascending:
              true,
          }
        );

    if (error) {
      return NextResponse.json(
        {
          error:
            "Não foi possível carregar as permissões.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      permissions:
        permissions || [],
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Erro interno do servidor.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PUT(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const adminCheck =
      await checkAdmin();

    if (
      !adminCheck.authorized
    ) {
      return NextResponse.json(
        {
          error:
            adminCheck.error,
        },
        {
          status:
            adminCheck.status,
        }
      );
    }

    const { id } =
      await context.params;

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Funcionário inválido.",
        },
        {
          status: 400,
        }
      );
    }

    const body =
      await request.json();

    const permissions =
      Array.isArray(
        body?.permissions
      )
        ? (body.permissions as PermissionInput[])
        : [];

    const adminSupabase =
      getAdminClient();

    /*
     * =====================================================
     * 1. REMOVER PERMISSÕES ANTIGAS
     * =====================================================
     */

    const {
      error: deleteError,
    } =
      await adminSupabase
        .from(
          "permissoes_funcionarios"
        )
        .delete()
        .eq(
          "funcionario_id",
          id
        );

    if (deleteError) {
      return NextResponse.json(
        {
          error:
            "Não foi possível atualizar as permissões.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * =====================================================
     * 2. NORMALIZAR PERMISSÕES
     * =====================================================
     */

    const rows =
      permissions
        .filter(
          (permission) =>
            permission.visualizar ===
              true ||
            permission.criar ===
              true ||
            permission.editar ===
              true ||
            permission.excluir ===
              true
        )
        .map(
          (permission) => ({
            funcionario_id:
              id,

            modulo:
              String(
                permission.modulo
              )
                .trim()
                .toLowerCase(),

            visualizar:
              permission.visualizar ===
              true,

            criar:
              permission.criar ===
              true,

            editar:
              permission.editar ===
              true,

            excluir:
              permission.excluir ===
              true,
          })
        )
        .filter(
          (permission) =>
            allowedModules.includes(
              permission.modulo as
                (typeof allowedModules)[number]
            )
        );

    /*
     * =====================================================
     * 3. SALVAR NA TABELA LEGADA
     * =====================================================
     */

    if (
      rows.length > 0
    ) {
      const {
        error:
          insertError,
      } =
        await adminSupabase
          .from(
            "permissoes_funcionarios"
          )
          .insert(rows);

      if (insertError) {
        return NextResponse.json(
          {
            error:
              "As permissões foram removidas, mas não foi possível salvar as novas permissões.",
          },
          {
            status: 500,
          }
        );
      }
    }

    /*
     * =====================================================
     * 4. MONTAR O JSON DE PERMISSÕES
     * =====================================================
     *
     * A aplicação atual utiliza:
     *
     * funcionarios.permissoes
     *
     * Então mantemos as duas estruturas sincronizadas.
     */

    const permissoesJson =
      Object.fromEntries(
        allowedModules.map(
          (modulo) => {
            const row =
              rows.find(
                (item) =>
                  item.modulo ===
                  modulo
              );

            return [
              modulo,
              {
                visualizar:
                  row?.visualizar ===
                  true,

                criar:
                  row?.criar ===
                  true,

                editar:
                  row?.editar ===
                  true,

                excluir:
                  row?.excluir ===
                  true,
              },
            ];
          }
        )
      );

    /*
     * =====================================================
     * 5. SALVAR NO FUNCIONÁRIO
     * =====================================================
     */

    const {
      error:
        funcionarioUpdateError,
    } =
      await adminSupabase
        .from(
          "funcionarios"
        )
        .update({
          permissoes:
            permissoesJson,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          id
        );

    if (
      funcionarioUpdateError
    ) {
      return NextResponse.json(
        {
          error:
            "As permissões foram salvas na tabela de permissões, mas não foi possível sincronizar funcionarios.permissoes.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * =====================================================
     * 6. RETORNO
     * =====================================================
     */

    return NextResponse.json({
      success: true,

      permissions:
        rows,

      permissoes:
        permissoesJson,
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Erro interno do servidor.",
      },
      {
        status: 500,
      }
    );
  }
}
