import {
  createClient as createServerClient,
} from "../supabase/server";

export type PermissionAction =
  | "visualizar"
  | "criar"
  | "editar"
  | "excluir";

export type PermissionModule =
  | "dashboard"
  | "clientes"
  | "equipamentos"
  | "orcamentos"
  | "ordens-servico"
  | "agenda"
  | "contratos"
  | "financeiro"
  | "estoque"
  | "relatorios"
  | "tecnicos"
  | "tecnico"
  | "area-cliente"
  | "configuracoes";

type PermissionRow = {
  visualizar?: boolean;
  criar?: boolean;
  editar?: boolean;
  excluir?: boolean;
};

type FuncionarioPermissionData = Record<
  string,
  PermissionRow
>;

function normalizeText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function normalizePermissions(
  value: unknown
): FuncionarioPermissionData {
  if (!value) {
    return {};
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (
        parsed &&
        typeof parsed === "object" &&
        !Array.isArray(parsed)
      ) {
        return parsed as FuncionarioPermissionData;
      }
    } catch {
      return {};
    }
  }

  if (
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as FuncionarioPermissionData;
  }

  return {};
}

/**
 * Verifica se o usuário autenticado possui determinada permissão.
 *
 * A tela de Funcionários salva as permissões no campo:
 *
 * funcionarios.permissoes
 *
 * Esse campo será a fonte principal de permissões.
 *
 * A tabela permissoes_funcionarios fica como fallback
 * para manter compatibilidade com registros antigos.
 */
export async function hasPermission(
  modulo: PermissionModule,
  acao: PermissionAction
): Promise<boolean> {
  const supabase =
    await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  /*
   * =====================================================
   * 1. LOCALIZAR FUNCIONÁRIO
   * =====================================================
   *
   * O vínculo correto é:
   *
   * funcionarios.auth_user_id = auth.users.id
   */

  let { data: funcionario } =
    await supabase
      .from("funcionarios")
      .select(
        `
          id,
          auth_user_id,
          funcao,
          perfil,
          status,
          permitir_acesso,
          acesso_status,
          permissoes
        `
      )
      .eq(
        "auth_user_id",
        user.id
      )
      .maybeSingle();

  /*
   * Compatibilidade com contas antigas.
   */
  if (!funcionario) {
    const fallback =
      await supabase
        .from("funcionarios")
        .select(
          `
            id,
            auth_user_id,
            funcao,
            perfil,
            status,
            permitir_acesso,
            acesso_status,
            permissoes
          `
        )
        .eq(
          "id",
          user.id
        )
        .maybeSingle();

    funcionario =
      fallback.data;
  }

  if (!funcionario) {
    return false;
  }

  /*
   * =====================================================
   * 2. VALIDAR STATUS
   * =====================================================
   */

  const statusNormalizado =
    normalizeText(
      funcionario.status
    );

  const perfilNormalizado =
    normalizeText(
      funcionario.perfil
    );

  const funcaoNormalizada =
    normalizeText(
      funcionario.funcao
    );

  const acessoStatusNormalizado =
    normalizeText(
      funcionario.acesso_status
    );

  const ativo =
    statusNormalizado === "ativo" ||
    statusNormalizado === "active";

  if (!ativo) {
    return false;
  }

  /*
   * =====================================================
   * 3. VALIDAR ACESSO
   * =====================================================
   */

  const possuiControleDeAcesso =
    funcionario.permitir_acesso !== null &&
    funcionario.permitir_acesso !== undefined;

  /*
   * Administrador pode ser identificado tanto pela função
   * quanto pelo perfil.
   */
  const isAdmin =
    funcaoNormalizada ===
      "administrador" ||
    funcaoNormalizada ===
      "admin" ||
    perfilNormalizado ===
      "administrador" ||
    perfilNormalizado ===
      "admin";

  if (
    possuiControleDeAcesso &&
    funcionario.permitir_acesso !== true &&
    acessoStatusNormalizado !== "ativo" &&
    !isAdmin
  ) {
    return false;
  }

  /*
   * =====================================================
   * 4. ADMINISTRADOR
   * =====================================================
   *
   * Administrador possui acesso total.
   */
  if (isAdmin) {
    return true;
  }

  /*
   * =====================================================
   * 5. FONTE PRINCIPAL DE PERMISSÕES
   * =====================================================
   *
   * A tela de Funcionários salva aqui:
   *
   * funcionarios.permissoes
   *
   * Antes o sistema ignorava esse campo e procurava
   * diretamente em permissoes_funcionarios.
   *
   * Esse era o motivo do gerente autenticar e depois
   * voltar para a tela de login.
   */

  const permissoes =
    normalizePermissions(
      funcionario.permissoes
    );

  const permissaoDoModulo =
    permissoes[modulo];

  if (permissaoDoModulo) {
    return (
      permissaoDoModulo[acao] === true
    );
  }

  /*
   * =====================================================
   * 6. FALLBACK PARA SISTEMA ANTIGO
   * =====================================================
   *
   * Se o módulo não existir no JSON,
   * tenta consultar a tabela antiga.
   */

  const {
    data: permission,
    error: permissionError,
  } = await supabase
    .from(
      "permissoes_funcionarios"
    )
    .select(
      "visualizar, criar, editar, excluir"
    )
    .eq(
      "funcionario_id",
      funcionario.id
    )
    .eq(
      "modulo",
      modulo
    )
    .maybeSingle();

  if (permissionError) {
    console.warn(
      "Não foi possível consultar a tabela de permissões legada:",
      permissionError.message
    );

    return false;
  }

  if (!permission) {
    return false;
  }

  return (
    permission[acao] === true
  );
}
