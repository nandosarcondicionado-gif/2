import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleEnv } from "@/lib/supabase/env";

function normalizar(valor: unknown) {
  return String(valor ?? "").trim().toLowerCase();
}

async function adminContext() {
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
        "id,funcao,perfil,status,permitir_acesso"
      )
      .eq("auth_user_id", user.id)
      .maybeSingle();

  if (!funcionario) {
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

  const funcao = normalizar(
    funcionario.funcao
  );

  const perfil = normalizar(
    funcionario.perfil
  );

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
    const ctx = await adminContext();

    if (!ctx) {
      return NextResponse.json(
        { error: "Acesso negado." },
        { status: 403 }
      );
    }

    const [
      ajudantes,
      agenda,
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
        .from("agenda")
        .select(
          "id,cliente_nome,cidade,servico,tecnico,data,horario,status,ajudante_id"
        )
        .order("data", {
          ascending: true,
        })
        .order("horario", {
          ascending: true,
        })
        .limit(500),
    ]);

    if (
      ajudantes.error ||
      agenda.error
    ) {
      console.error(
        ajudantes.error ||
          agenda.error
      );

      return NextResponse.json(
        {
          error:
            "Não foi possível carregar os dados.",
        },
        { status: 500 }
      );
    }

    const listaAjudantes =
      (ajudantes.data || []).filter(
        (item) =>
          normalizar(item.perfil) ===
            "ajudante" ||
          normalizar(item.funcao) ===
            "ajudante"
      );

    return NextResponse.json({
      ajudantes: listaAjudantes,
      agenda: agenda.data || [],
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
    const ctx = await adminContext();

    if (!ctx) {
      return NextResponse.json(
        { error: "Acesso negado." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const agendaId =
      String(
        body?.agenda_id || ""
      ).trim();

    const ajudanteId =
      String(
        body?.ajudante_id || ""
      ).trim() || null;

    if (!agendaId) {
      return NextResponse.json(
        {
          error:
            "Atendimento inválido.",
        },
        { status: 400 }
      );
    }

    if (ajudanteId) {
      const { data: ajudante } =
        await ctx.admin
          .from("funcionarios")
          .select(
            "id,perfil,funcao,status,permitir_acesso"
          )
          .eq("id", ajudanteId)
          .maybeSingle();

      if (!ajudante) {
        return NextResponse.json(
          {
            error:
              "Ajudante inválido.",
          },
          { status: 400 }
        );
      }

      const perfil =
        normalizar(
          ajudante.perfil
        );

      const funcao =
        normalizar(
          ajudante.funcao
        );

      if (
        ajudante.status !==
          "Ativo" ||
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
    }

    const {
      data,
      error,
    } = await ctx.admin
      .from("agenda")
      .update({
        ajudante_id: ajudanteId,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", agendaId)
      .select(
        "id,cliente_nome,cidade,servico,tecnico,data,horario,status,ajudante_id"
      )
      .single();

    if (error) {
      console.error(error);

      return NextResponse.json(
        {
          error:
            "Não foi possível atribuir o ajudante.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      agenda: data,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Erro interno." },
      { status: 500 }
    );
  }
}
