import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleEnv } from "@/lib/supabase/env";

function normalizar(valor: unknown) {
  return String(valor ?? "").trim().toLowerCase();
}

async function getContext() {
  const supabase = await createServerClient();

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
        "id,nome,perfil,funcao,status,permitir_acesso"
      )
      .eq("auth_user_id", user.id)
      .maybeSingle();

  if (!funcionario) {
    return null;
  }

  const perfil = normalizar(
    funcionario.perfil
  );

  const funcao = normalizar(
    funcionario.funcao
  );

  if (
    perfil !== "ajudante" &&
    funcao !== "ajudante"
  ) {
    return null;
  }

  const status = normalizar(
    funcionario.status
  );

  if (
    status !== "ativo" &&
    status !== "active"
  ) {
    return null;
  }

  if (funcionario.permitir_acesso !== true) {
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
    const ctx = await getContext();

    if (!ctx) {
      return NextResponse.json(
        { error: "Acesso negado." },
        { status: 403 }
      );
    }

    const {
      data,
      error,
    } = await ctx.admin
      .from("recibos_funcionarios")
      .select(
        "id,periodo_inicio,periodo_fim,horas,valor_hora,valor_total,forma_pagamento,data_pagamento,status,assinatura_data,assinatura_nome,observacoes,created_at"
      )
      .eq(
        "funcionario_id",
        ctx.funcionario.id
      )
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(error);

      return NextResponse.json(
        {
          error:
            "Não foi possível carregar os recibos.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      recibos: data || [],
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
    const ctx = await getContext();

    if (!ctx) {
      return NextResponse.json(
        { error: "Acesso negado." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const id =
      String(body?.id || "").trim();

    const assinatura =
      String(
        body?.assinatura_imagem || ""
      ).trim();

    const nome =
      String(
        body?.assinatura_nome ||
          ctx.funcionario.nome ||
          ""
      ).trim();

    if (!id || !assinatura) {
      return NextResponse.json(
        {
          error:
            "Assinatura não informada.",
        },
        { status: 400 }
      );
    }

    const { data: recibo } =
      await ctx.admin
        .from("recibos_funcionarios")
        .select("id,status")
        .eq("id", id)
        .eq(
          "funcionario_id",
          ctx.funcionario.id
        )
        .maybeSingle();

    if (!recibo) {
      return NextResponse.json(
        {
          error:
            "Recibo não encontrado.",
        },
        { status: 404 }
      );
    }

    if (
      recibo.status !==
      "Pendente de assinatura"
    ) {
      return NextResponse.json(
        {
          error:
            "Este recibo não está pendente de assinatura.",
        },
        { status: 400 }
      );
    }

    const agora =
      new Date().toISOString();

    const {
      data,
      error,
    } = await ctx.admin
      .from("recibos_funcionarios")
      .update({
        status: "Assinado",
        assinatura_data: agora,
        assinatura_nome: nome,
        assinatura_imagem: assinatura,
        updated_at: agora,
      })
      .eq("id", id)
      .eq(
        "funcionario_id",
        ctx.funcionario.id
      )
      .select()
      .single();

    if (error) {
      console.error(error);

      return NextResponse.json(
        {
          error:
            "Não foi possível assinar o recibo.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      recibo: data,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Erro interno." },
      { status: 500 }
    );
  }
}
