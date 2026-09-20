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
  visualizar: boolean;
  criar: boolean;
  editar: boolean;
  excluir: boolean;
};

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
   * Primeiro procura pelo vínculo correto:
   *
   * funcionarios.auth_user_id = auth.users.id
   */
  let { data: funcionario } =
    await supabase
      .from("funcionarios")
      .select(
        "id, auth_user_id, funcao, perfil, status, permitir_acesso, acesso_status"
      )
      .eq("auth_user_id", user.id)
      .maybeSingle();

  /*
   * Compatibilidade com contas antigas.
   */
  if (!funcionario) {
    const fallback =
      await supabase
        .from("funcionarios")
        .select(
          "id, auth_user_id, funcao, perfil, status, permitir_acesso, acesso_status"
        )
        .eq("id", user.id)
        .maybeSingle();

    funcionario = fallback.data;
  }

  if (!funcionario) {
    return false;
  }

  const statusNormalizado =
    String(funcionario.status || "")
      .trim()
      .toLowerCase();

  const perfilNormalizado =
    String(funcionario.perfil || "")
      .trim()
      .toLowerCase();

  const funcaoNormalizada =
    String(funcionario.funcao || "")
      .trim()
      .toLowerCase();

  const acessoStatusNormalizado =
    String(
      funcionario.acesso_status || ""
    )
      .trim()
      .toLowerCase();

  const ativo =
    statusNormalizado === "ativo" ||
    statusNormalizado === "active";

  if (!ativo) {
    return false;
  }

  /*
   * Se o funcionário possui controle de acesso,
   * ele também precisa estar liberado.
   */
  const possuiControleDeAcesso =
    funcionario.permitir_acesso !== null &&
    funcionario.permitir_acesso !== undefined;

  if (
    possuiControleDeAcesso &&
    funcionario.permitir_acesso !== true &&
    acessoStatusNormalizado !== "ativo"
  ) {
    /*
     * Mantém compatibilidade com contas administrativas
     * antigas que ainda não passaram pelo novo controle.
     */
    const isAdmin =
      funcaoNormalizada ===
        "administrador" ||
      perfilNormalizado ===
        "administrador";

    if (!isAdmin) {
      return false;
    }
  }

  /*
   * Administrador possui acesso total.
   */
  const isAdmin =
    funcaoNormalizada ===
      "administrador" ||
    perfilNormalizado ===
      "administrador";

  if (isAdmin) {
    return true;
  }

  /*
   * Para funcionários, a permissão fica vinculada
   * ao ID REAL do funcionário.
   */
  const funcionarioId =
    funcionario.id;

  const {
    data: permission,
  } = await supabase
    .from("permissoes_funcionarios")
    .select(
      "visualizar, criar, editar, excluir"
    )
    .eq(
      "funcionario_id",
      funcionarioId
    )
    .eq("modulo", modulo)
    .maybeSingle();

  const permissionData =
    permission as PermissionRow | null;

  if (!permissionData) {
    return false;
  }

  return (
    permissionData[acao] === true
  );
}
