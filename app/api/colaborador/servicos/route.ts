import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleEnv } from "@/lib/supabase/env";

async function getCurrentEmployee() {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      funcionario: null,
    };
  }

  const { data: funcionario } =
    await supabase
      .from("funcionarios")
      .select(
        "id,nome,perfil,funcao,status,permitir_acesso,auth_user_id"
      )
      .eq("auth_user_id", user.id)
      .maybeSingle();

  return {
    user,
    funcionario,
  };
}

export async function GET() {
  try {
    const {
      user,
      funcionario,
    } = await getCurrentEmployee();

    if (!user || !funcionario) {
      return NextResponse.json(
        {
          error: "Não autenticado.",
        },
        {
          status: 401,
        }
      );
    }

    const perfil = String(
      funcionario.perfil || ""
    )
      .trim()
      .toLowerCase();

    if (perfil !== "ajudante") {
      return NextResponse.json(
        {
          error:
            "Esta área é exclusiva para ajudantes.",
        },
        {
          status: 403,
        }
      );
    }

    if (
      String(
        funcionario.status
      ).toLowerCase() !== "ativo" ||
      funcionario.permitir_acesso !== true
    ) {
      return NextResponse.json(
        {
          error: "Acesso bloqueado.",
        },
        {
          status: 403,
        }
      );
    }

    const {
      url,
      serviceRoleKey,
    } =
      getSupabaseServiceRoleEnv();

    const admin =
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
     * IMPORTANTE:
     *
     * Só selecionamos informações necessárias
     * para o trabalho do ajudante.
     *
     * Nenhum valor financeiro é enviado.
     */

    const {
      data,
      error,
    } = await admin
      .from("agenda")
      .select(
        "id,cliente_nome,cidade,servico,tecnico,data,horario,status,ajudante_id"
      )
      .eq(
        "ajudante_id",
        funcionario.id
      )
      .order("data", {
        ascending: true,
      })
      .order("horario", {
        ascending: true,
      });

    if (error) {
      return NextResponse.json(
        {
          error:
            "Não foi possível carregar seus serviços.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      funcionario: {
        id: funcionario.id,
        nome: funcionario.nome,
      },

      servicos: data || [],
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Erro interno.",
      },
      {
        status: 500,
      }
    );
  }
}
