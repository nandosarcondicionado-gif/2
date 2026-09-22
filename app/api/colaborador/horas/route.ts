import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleEnv } from "@/lib/supabase/env";

async function context() {
  const supabase =
    await createServerClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const {
    data: funcionario,
  } =
    await supabase
      .from("funcionarios")
      .select(
        "id,nome,perfil,status,permitir_acesso"
      )
      .eq(
        "auth_user_id",
        user.id
      )
      .maybeSingle();

  if (!funcionario) {
    return null;
  }

  const perfil =
    String(
      funcionario.perfil || ""
    ).toLowerCase();

  if (perfil !== "ajudante") {
    return null;
  }

  if (
    String(
      funcionario.status
    ).toLowerCase() !== "ativo" ||
    funcionario.permitir_acesso !== true
  ) {
    return null;
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

  return {
    user,
    funcionario,
    admin,
  };
}

export async function GET() {
  try {
    const ctx =
      await context();

    if (!ctx) {
      return NextResponse.json(
        {
          error:
            "Acesso negado.",
        },
        {
          status: 403,
        }
      );
    }

    const {
      data: config,
    } =
      await ctx.admin
        .from(
          "funcionario_valor_hora"
        )
        .select(
          "valor_hora,arredondamento_minutos"
        )
        .eq(
          "funcionario_id",
          ctx.funcionario.id
        )
        .maybeSingle();

    const {
      data: horas,
      error,
    } =
      await ctx.admin
        .from(
          "horas_funcionarios"
        )
        .select(
          "id,agenda_id,inicio,fim,minutos,valor_hora,valor_total,status,observacoes,created_at"
        )
        .eq(
          "funcionario_id",
          ctx.funcionario.id
        )
        .order(
          "inicio",
          {
            ascending: false,
          }
        )
        .limit(100);

    if (error) {
      return NextResponse.json(
        {
          error:
            "Não foi possível carregar as horas.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      config:
        config || {
          valor_hora: 0,
          arredondamento_minutos: 60,
        },

      horas: horas || [],
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

export async function POST(
  request: Request
) {
  try {
    const ctx =
      await context();

    if (!ctx) {
      return NextResponse.json(
        {
          error:
            "Acesso negado.",
        },
        {
          status: 403,
        }
      );
    }

    const body =
      await request.json();

    const agendaId =
      String(
        body?.agenda_id || ""
      ).trim() || null;

    const {
      data: config,
    } =
      await ctx.admin
        .from(
          "funcionario_valor_hora"
        )
        .select(
          "valor_hora"
        )
        .eq(
          "funcionario_id",
          ctx.funcionario.id
        )
        .maybeSingle();

    const valorHora =
      Number(
        config?.valor_hora || 0
      );

    const {
      data: aberta,
    } =
      await ctx.admin
        .from(
          "horas_funcionarios"
        )
        .select("id")
        .eq(
          "funcionario_id",
          ctx.funcionario.id
        )
        .eq(
          "status",
          "Aberta"
        )
        .maybeSingle();

    if (aberta) {
      return NextResponse.json(
        {
          error:
            "Você já possui uma jornada aberta.",
        },
        {
          status: 400,
        }
      );
    }

    if (valorHora <= 0) {
      return NextResponse.json(
        {
          error:
            "Seu valor por hora ainda não foi configurado pelo administrador.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: registro,
      error,
    } =
      await ctx.admin
        .from(
          "horas_funcionarios"
        )
        .insert({
          funcionario_id:
            ctx.funcionario.id,

          agenda_id:
            agendaId,

          inicio:
            new Date().toISOString(),

          valor_hora:
            valorHora,

          status:
            "Aberta",
        })
        .select()
        .single();

    if (error) {
      return NextResponse.json(
        {
          error:
            "Não foi possível iniciar o registro de horas.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      registro,
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

export async function PATCH(
  request: Request
) {
  try {
    const ctx =
      await context();

    if (!ctx) {
      return NextResponse.json(
        {
          error:
            "Acesso negado.",
        },
        {
          status: 403,
        }
      );
    }

    const body =
      await request.json();

    const id =
      String(
        body?.id || ""
      ).trim();

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Registro inválido.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: registro,
    } =
      await ctx.admin
        .from(
          "horas_funcionarios"
        )
        .select(
          "id,inicio,valor_hora,status"
        )
        .eq(
          "id",
          id
        )
        .eq(
          "funcionario_id",
          ctx.funcionario.id
        )
        .maybeSingle();

    if (!registro) {
      return NextResponse.json(
        {
          error:
            "Registro não encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      registro.status !==
      "Aberta"
    ) {
      return NextResponse.json(
        {
          error:
            "Este registro já foi encerrado.",
        },
        {
          status: 400,
        }
      );
    }

    const fim =
      new Date();

    const inicio =
      new Date(
        registro.inicio
      );

    const minutos =
      Math.max(
        0,
        Math.round(
          (
            fim.getTime() -
            inicio.getTime()
          ) / 60000
        )
      );

    const valorTotal =
      Number(
        (
          (minutos / 60) *
          Number(
            registro.valor_hora ||
              0
          )
        ).toFixed(2)
      );

    const {
      data: atualizado,
      error,
    } =
      await ctx.admin
        .from(
          "horas_funcionarios"
        )
        .update({
          fim:
            fim.toISOString(),

          minutos,

          valor_total:
            valorTotal,

          status:
            "Fechada",

          updated_at:
            fim.toISOString(),
        })
        .eq(
          "id",
          id
        )
        .eq(
          "funcionario_id",
          ctx.funcionario.id
        )
        .select()
        .single();

    if (error) {
      return NextResponse.json(
        {
          error:
            "Não foi possível encerrar as horas.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      registro: atualizado,
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
