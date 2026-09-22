import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleEnv } from "@/lib/supabase/env";

function normalizar(valor: unknown) {
  return String(valor ?? "").trim().toLowerCase();
}

async function getAdmin() {
  const supabase =
    await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: funcionario } =
    await supabase
      .from("funcionarios")
      .select(
        "id,funcao,perfil,status,permitir_acesso"
      )
      .eq("auth_user_id", user.id)
      .maybeSingle();

  if (!funcionario) {
    return null;
  }

  const status =
    normalizar(funcionario.status);

  if (
    status !== "ativo" &&
    status !== "active"
  ) {
    return null;
  }

  if (funcionario.permitir_acesso !== true) {
    return null;
  }

  const funcao =
    normalizar(funcionario.funcao);

  const perfil =
    normalizar(funcionario.perfil);

  const permitido =
    [
      "administrador",
      "admin",
      "gerente",
      "encarregado",
    ].includes(funcao) ||
    [
      "administrador",
      "admin",
      "gerente",
      "encarregado",
    ].includes(perfil);

  if (!permitido) {
    return null;
  }

  const { url, serviceRoleKey } =
    getSupabaseServiceRoleEnv();

  const admin = createAdminClient(
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
    funcionario,
    admin,
  };
}

export async function GET() {
  try {
    const ctx = await getAdmin();

    if (!ctx) {
      return NextResponse.json(
        { error: "Acesso negado." },
        { status: 403 }
      );
    }

    const [
      funcionarios,
      configs,
      horas,
      recibos,
    ] = await Promise.all([
      ctx.admin
        .from("funcionarios")
        .select(
          "id,nome,status,perfil,funcao"
        )
        .eq("status", "Ativo")
        .order("nome", {
          ascending: true,
        }),

      ctx.admin
        .from("funcionario_valor_hora")
        .select(
          "funcionario_id,valor_hora,arredondamento_minutos"
        ),

      ctx.admin
        .from("horas_funcionarios")
        .select(
          "id,funcionario_id,agenda_id,inicio,fim,minutos,valor_hora,valor_total,status,observacoes,created_at"
        )
        .order("inicio", {
          ascending: false,
        })
        .limit(300),

      ctx.admin
        .from("recibos_funcionarios")
        .select(
          "id,funcionario_id,periodo_inicio,periodo_fim,horas,valor_hora,valor_total,forma_pagamento,data_pagamento,status,assinatura_data,assinatura_nome,created_at"
        )
        .order("created_at", {
          ascending: false,
        })
        .limit(200),
    ]);

    if (
      funcionarios.error ||
      configs.error ||
      horas.error ||
      recibos.error
    ) {
      console.error(
        funcionarios.error ||
          configs.error ||
          horas.error ||
          recibos.error
      );

      return NextResponse.json(
        {
          error:
            "Não foi possível carregar o controle de horas.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      funcionarios:
        funcionarios.data || [],
      configs:
        configs.data || [],
      horas:
        horas.data || [],
      recibos:
        recibos.data || [],
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Erro interno." },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request
) {
  try {
    const ctx = await getAdmin();

    if (!ctx) {
      return NextResponse.json(
        { error: "Acesso negado." },
        { status: 403 }
      );
    }

    const body =
      await request.json();

    const funcionarioId =
      String(
        body?.funcionario_id || ""
      ).trim();

    const valorHora =
      Number(body?.valor_hora);

    const arredondamento =
      Number(
        body?.arredondamento_minutos ||
          60
      );

    if (
      !funcionarioId ||
      !Number.isFinite(
        valorHora
      ) ||
      valorHora < 0 ||
      ![1, 15, 30, 60].includes(
        arredondamento
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Dados de remuneração inválidos.",
        },
        { status: 400 }
      );
    }

    const { data: alvo } =
      await ctx.admin
        .from("funcionarios")
        .select(
          "id,perfil,funcao,status,permitir_acesso"
        )
        .eq("id", funcionarioId)
        .maybeSingle();

    if (!alvo) {
      return NextResponse.json(
        {
          error:
            "Funcionário não encontrado.",
        },
        { status: 400 }
      );
    }

    const perfil =
      normalizar(alvo.perfil);

    const funcao =
      normalizar(alvo.funcao);

    if (
      normalizar(alvo.status) !==
        "ativo" ||
      (perfil !== "ajudante" &&
        funcao !== "ajudante")
    ) {
      return NextResponse.json(
        {
          error:
            "O funcionário selecionado não é um ajudante ativo.",
        },
        { status: 400 }
      );
    }

    const { data: existente } =
      await ctx.admin
        .from("funcionario_valor_hora")
        .select("id")
        .eq(
          "funcionario_id",
          funcionarioId
        )
        .maybeSingle();

    let error;

    if (existente) {
      const resultado =
        await ctx.admin
          .from(
            "funcionario_valor_hora"
          )
          .update({
            valor_hora:
              Number(
                valorHora.toFixed(2)
              ),
            arredondamento_minutos:
              arredondamento,
            ativo: true,
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            existente.id
          );

      error = resultado.error;
    } else {
      const resultado =
        await ctx.admin
          .from(
            "funcionario_valor_hora"
          )
          .insert({
            funcionario_id:
              funcionarioId,
            valor_hora:
              Number(
                valorHora.toFixed(2)
              ),
            arredondamento_minutos:
              arredondamento,
            ativo: true,
          });

      error = resultado.error;
    }

    if (error) {
      console.error(error);

      return NextResponse.json(
        {
          error:
            "Não foi possível salvar o valor por hora.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Erro interno." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request
) {
  try {
    const ctx = await getAdmin();

    if (!ctx) {
      return NextResponse.json(
        { error: "Acesso negado." },
        { status: 403 }
      );
    }

    const body =
      await request.json();

    const funcionarioId =
      String(
        body?.funcionario_id || ""
      ).trim();

    const inicio =
      String(
        body?.periodo_inicio || ""
      ).trim();

    const fim =
      String(
        body?.periodo_fim || ""
      ).trim();

    const forma =
      String(
        body?.forma_pagamento ||
          "Pix"
      ).trim();

    if (
      !funcionarioId ||
      !inicio ||
      !fim
    ) {
      return NextResponse.json(
        {
          error:
            "Informe funcionário e período.",
        },
        { status: 400 }
      );
    }

    if (inicio > fim) {
      return NextResponse.json(
        {
          error:
            "O período informado é inválido.",
        },
        { status: 400 }
      );
    }

    const { data: alvo } =
      await ctx.admin
        .from("funcionarios")
        .select(
          "id,perfil,funcao,status"
        )
        .eq("id", funcionarioId)
        .maybeSingle();

    if (!alvo) {
      return NextResponse.json(
        {
          error:
            "Funcionário não encontrado.",
        },
        { status: 400 }
      );
    }

    const perfil =
      normalizar(alvo.perfil);

    const funcao =
      normalizar(alvo.funcao);

    if (
      normalizar(alvo.status) !==
        "ativo" ||
      (perfil !== "ajudante" &&
        funcao !== "ajudante")
    ) {
      return NextResponse.json(
        {
          error:
            "O funcionário selecionado não é um ajudante ativo.",
        },
        { status: 400 }
      );
    }

    const { data: config } =
      await ctx.admin
        .from(
          "funcionario_valor_hora"
        )
        .select("valor_hora")
        .eq(
          "funcionario_id",
          funcionarioId
        )
        .eq("ativo", true)
        .maybeSingle();

    const valorHora =
      Number(
        config?.valor_hora || 0
      );

    if (valorHora <= 0) {
      return NextResponse.json(
        {
          error:
            "Configure o valor por hora antes de pagar.",
        },
        { status: 400 }
      );
    }

    const {
      data: horas,
      error: horasError,
    } = await ctx.admin
      .from("horas_funcionarios")
      .select(
        "id,minutos,valor_hora,valor_total,inicio"
      )
      .eq(
        "funcionario_id",
        funcionarioId
      )
      .eq("status", "Fechada")
      .gte(
        "inicio",
        `${inicio}T00:00:00`
      )
      .lte(
        "inicio",
        `${fim}T23:59:59`
      );

    if (horasError) {
      console.error(horasError);

      return NextResponse.json(
        {
          error:
            "Não foi possível calcular as horas.",
        },
        { status: 500 }
      );
    }

    if (!horas?.length) {
      return NextResponse.json(
        {
          error:
            "Não existem horas fechadas para esse período.",
        },
        { status: 400 }
      );
    }

    const minutos =
      horas.reduce(
        (total, item) =>
          total +
          Number(
            item.minutos || 0
          ),
        0
      );

    const total = Number(
      (
        (minutos / 60) *
        valorHora
      ).toFixed(2)
    );

    const agora =
      new Date().toISOString();

    const {
      data: recibo,
      error: reciboError,
    } = await ctx.admin
      .from(
        "recibos_funcionarios"
      )
      .insert({
        funcionario_id:
          funcionarioId,
        periodo_inicio: inicio,
        periodo_fim: fim,
        horas: Number(
          (minutos / 60).toFixed(2)
        ),
        valor_hora: valorHora,
        valor_total: total,
        forma_pagamento: forma,
        data_pagamento: agora,
        status:
          "Pendente de assinatura",
      })
      .select()
      .single();

    if (reciboError) {
      console.error(
        reciboError
      );

      return NextResponse.json(
        {
          error:
            "Não foi possível criar o recibo.",
        },
        { status: 500 }
      );
    }

    const ids =
      horas.map(
        (item) => item.id
      );

    const {
      error: updateError,
    } = await ctx.admin
      .from(
        "horas_funcionarios"
      )
      .update({
        status: "Paga",
        recibo_id: recibo.id,
        updated_at: agora,
      })
      .in("id", ids);

    if (updateError) {
      console.error(
        updateError
      );

      return NextResponse.json(
        {
          error:
            "Recibo criado, mas não foi possível marcar as horas como pagas.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      recibo,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Erro interno." },
      { status: 500 }
    );
  }
}
