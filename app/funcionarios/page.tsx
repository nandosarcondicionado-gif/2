"use client";

import {
  Edit,
  KeyRound,
  Lock,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type EmployeeStatus = "Ativo" | "Inativo";

type PermissionSet = {
  visualizar: boolean;
  criar: boolean;
  editar: boolean;
  excluir: boolean;
};

type Employee = {
  id: string;
  nome: string;
  cpf: string;
  rg: string;
  telefone: string;
  whatsapp: string;
  email: string;

  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  cep: string;

  cargo: string;
  tipo_vinculo: string;

  data_nascimento: string | null;
  data_admissao: string | null;

  salario: number;

  forma_pagamento: string;
  chave_pix: string;

  status: EmployeeStatus;
  observacoes: string;

  auth_user_id?: string | null;
  permitir_acesso?: boolean | null;
  email_login?: string | null;
  perfil?: string | null;
  permissoes?: Record<string, PermissionSet> | null;
  acesso_status?: string | null;

  created_at?: string;
  updated_at?: string;
};

type EmployeeForm = {
  nome: string;
  cpf: string;
  rg: string;
  telefone: string;
  whatsapp: string;
  email: string;

  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  cep: string;

  cargo: string;
  tipo_vinculo: string;

  data_nascimento: string;
  data_admissao: string;

  salario: string;

  forma_pagamento: string;
  chave_pix: string;

  status: EmployeeStatus;
  observacoes: string;

  permitir_acesso: boolean;
  email_login: string;
  senha: string;
  perfil: string;
  permissoes: Record<string, PermissionSet>;
};

const ACCESS_MODULES = [
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
  "tecnico",
] as const;

const ACCESS_MODULE_LABELS: Record<
  (typeof ACCESS_MODULES)[number],
  string
> = {
  dashboard: "Dashboard",
  clientes: "Clientes",
  equipamentos: "Equipamentos",
  orcamentos: "Orçamentos",
  "ordens-servico": "Ordens de Serviço",
  agenda: "Agenda",
  contratos: "Contratos",
  financeiro: "Financeiro",
  estoque: "Estoque",
  relatorios: "Relatórios",
  tecnico: "Técnico",
};

function emptyPermissions(): Record<string, PermissionSet> {
  return Object.fromEntries(
    ACCESS_MODULES.map((module) => [
      module,
      {
        visualizar: false,
        criar: false,
        editar: false,
        excluir: false,
      },
    ])
  );
}

const emptyForm: EmployeeForm = {
  nome: "",
  cpf: "",
  rg: "",
  telefone: "",
  whatsapp: "",
  email: "",

  endereco: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  cep: "",

  cargo: "",
  tipo_vinculo: "Funcionário",

  data_nascimento: "",
  data_admissao: "",

  salario: "",

  forma_pagamento: "",
  chave_pix: "",

  status: "Ativo",
  observacoes: "",

  permitir_acesso: false,
  email_login: "",
  senha: "",
  perfil: "Tecnico",
  permissoes: emptyPermissions(),
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
}

function parseMoney(value: string) {
  const cleaned = value
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const number = Number(cleaned);

  return Number.isFinite(number) ? number : 0;
}

function maskCpf(value: string) {
  const numbers = value.replace(/\D/g, "").slice(0, 11);

  if (numbers.length <= 3) return numbers;

  if (numbers.length <= 6) {
    return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  }

  if (numbers.length <= 9) {
    return `${numbers.slice(0, 3)}.${numbers.slice(
      3,
      6
    )}.${numbers.slice(6)}`;
  }

  return `${numbers.slice(0, 3)}.${numbers.slice(
    3,
    6
  )}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
}

function maskPhone(value: string) {
  const numbers = value.replace(/\D/g, "").slice(0, 11);

  if (numbers.length <= 2) return numbers;

  if (numbers.length <= 7) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  }

  if (numbers.length <= 10) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(
      2,
      6
    )}-${numbers.slice(6)}`;
  }

  return `(${numbers.slice(0, 2)}) ${numbers.slice(
    2,
    7
  )}-${numbers.slice(7)}`;
}

function formatDate(date: string | null) {
  if (!date) return "-";

  const parts = date.split("-");

  if (parts.length !== 3) return date;

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export default function FuncionariosPage() {
  const supabase = createClient();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "Todos" | EmployeeStatus
  >("Todos");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState<EmployeeForm>(emptyForm);

  async function loadEmployees() {
    setLoading(true);

    const { data, error } = await supabase
      .from("funcionarios")
      .select("*")
      .order("nome", {
        ascending: true,
      });

    if (error) {
      console.error("Erro ao carregar funcionários:", error);

      alert(
        `Não foi possível carregar os funcionários.\n\n${error.message}`
      );

      setEmployees([]);
      setLoading(false);
      return;
    }

    const normalized: Employee[] = (data || []).map((item) => ({
      id: item.id,
      nome: item.nome || "",
      cpf: item.cpf || "",
      rg: item.rg || "",
      telefone: item.telefone || "",
      whatsapp: item.whatsapp || "",
      email: item.email || "",

      endereco: item.endereco || "",
      numero: item.numero || "",
      complemento: item.complemento || "",
      bairro: item.bairro || "",
      cidade: item.cidade || "",
      cep: item.cep || "",

      cargo: item.cargo || "",
      tipo_vinculo: item.tipo_vinculo || "Funcionário",

      data_nascimento: item.data_nascimento || null,
      data_admissao: item.data_admissao || null,

      salario: Number(item.salario || 0),

      forma_pagamento: item.forma_pagamento || "",
      chave_pix: item.chave_pix || "",

      status:
        item.status === "Inativo"
          ? "Inativo"
          : "Ativo",

      observacoes: item.observacoes || "",

      auth_user_id: item.auth_user_id || null,
      permitir_acesso: Boolean(item.permitir_acesso),
      email_login: item.email_login || "",
      perfil: item.perfil || "Tecnico",
      permissoes:
        item.permissoes || emptyPermissions(),
      acesso_status:
        item.acesso_status || "Sem acesso",

      created_at: item.created_at,
      updated_at: item.updated_at,
    }));

    setEmployees(normalized);
    setLoading(false);
  }

  useEffect(() => {
    loadEmployees();
  }, []);

  const filteredEmployees = useMemo(() => {
    const term = search.trim().toLowerCase();

    return employees.filter((employee) => {
      const matchesSearch =
        !term ||
        employee.nome.toLowerCase().includes(term) ||
        employee.cpf.toLowerCase().includes(term) ||
        employee.telefone.toLowerCase().includes(term) ||
        employee.whatsapp.toLowerCase().includes(term) ||
        employee.cargo.toLowerCase().includes(term) ||
        employee.cidade.toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "Todos" ||
        employee.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [employees, search, statusFilter]);

  const activeCount = employees.filter(
    (employee) => employee.status === "Ativo"
  ).length;

  const inactiveCount = employees.filter(
    (employee) => employee.status === "Inativo"
  ).length;

  const totalSalaries = employees
    .filter((employee) => employee.status === "Ativo")
    .reduce(
      (total, employee) =>
        total + Number(employee.salario || 0),
      0
    );

  function openNewForm() {
    setEditingId(null);

    setForm({
      ...emptyForm,
      permissoes: emptyPermissions(),
    });

    setShowForm(true);
  }

  function openEditForm(employee: Employee) {
    setEditingId(employee.id);

    setForm({
      nome: employee.nome,
      cpf: employee.cpf,
      rg: employee.rg,
      telefone: employee.telefone,
      whatsapp: employee.whatsapp,
      email: employee.email,

      endereco: employee.endereco,
      numero: employee.numero,
      complemento: employee.complemento,
      bairro: employee.bairro,
      cidade: employee.cidade,
      cep: employee.cep,

      cargo: employee.cargo,
      tipo_vinculo: employee.tipo_vinculo,

      data_nascimento:
        employee.data_nascimento || "",
      data_admissao:
        employee.data_admissao || "",

      salario:
        employee.salario !== undefined &&
        employee.salario !== null
          ? String(employee.salario)
          : "",

      forma_pagamento:
        employee.forma_pagamento,
      chave_pix: employee.chave_pix,

      status: employee.status,
      observacoes: employee.observacoes,

      permitir_acesso:
        Boolean(employee.permitir_acesso),

      email_login:
        employee.email_login ||
        employee.email ||
        "",

      senha: "",

      perfil:
        employee.perfil || "Tecnico",

      permissoes:
        employee.permissoes ||
        emptyPermissions(),
    });

    setShowForm(true);
  }

  function updateField<K extends keyof EmployeeForm>(
    field: K,
    value: EmployeeForm[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updatePermission(
    module: string,
    action: keyof PermissionSet,
    value: boolean
  ) {
    setForm((current) => ({
      ...current,
      permissoes: {
        ...current.permissoes,
        [module]: {
          ...(current.permissoes[module] || {
            visualizar: false,
            criar: false,
            editar: false,
            excluir: false,
          }),
          [action]: value,
        },
      },
    }));
  }

  function setAllPermissions(value: boolean) {
    setForm((current) => ({
      ...current,
      permissoes: Object.fromEntries(
        ACCESS_MODULES.map((module) => [
          module,
          {
            visualizar: value,
            criar: value,
            editar: value,
            excluir: value,
          },
        ])
      ),
    }));
  }

  async function saveEmployee() {
    if (!form.nome.trim()) {
      alert("Informe o nome do funcionário.");
      return;
    }

    if (
      form.permitir_acesso &&
      !form.email_login.trim()
    ) {
      alert(
        "Informe o e-mail de login para liberar o acesso."
      );
      return;
    }

    if (
      form.permitir_acesso &&
      !editingId &&
      !form.senha.trim()
    ) {
      alert(
        "Informe uma senha para criar o acesso do funcionário."
      );
      return;
    }

    setSaving(true);

    try {
      const payload = {
        nome: form.nome.trim(),
        cpf: form.cpf.trim(),
        rg: form.rg.trim(),
        telefone: form.telefone.trim(),
        whatsapp: form.whatsapp.trim(),
        email: form.email.trim(),

        endereco: form.endereco.trim(),
        numero: form.numero.trim(),
        complemento: form.complemento.trim(),
        bairro: form.bairro.trim(),
        cidade: form.cidade.trim(),
        cep: form.cep.trim(),

        cargo: form.cargo.trim(),
        tipo_vinculo:
          form.tipo_vinculo.trim(),

        data_nascimento:
          form.data_nascimento || null,

        data_admissao:
          form.data_admissao || null,

        salario: parseMoney(form.salario),

        forma_pagamento:
          form.forma_pagamento.trim(),

        chave_pix:
          form.chave_pix.trim(),

        status: form.status,

        observacoes:
          form.observacoes.trim(),

        permitir_acesso:
          form.permitir_acesso,

        email_login:
          form.email_login.trim(),

        perfil: form.perfil,

        permissoes: form.permissoes,

        acesso_status:
          form.permitir_acesso
            ? "Ativo"
            : "Sem acesso",

        updated_at:
          new Date().toISOString(),
      };

      let funcionarioId = editingId;

      if (editingId) {
        const { error } = await supabase
          .from("funcionarios")
          .update(payload)
          .eq("id", editingId);

        if (error) {
          throw new Error(error.message);
        }
      } else {
        const { data, error } = await supabase
          .from("funcionarios")
          .insert({
            ...payload,
            created_at:
              new Date().toISOString(),
          })
          .select("id")
          .single();

        if (error) {
          throw new Error(error.message);
        }

        funcionarioId = data?.id || null;
      }

      if (!funcionarioId) {
        throw new Error(
          "Não foi possível identificar o funcionário salvo."
        );
      }

      /*
       * IMPORTANTE:
       * A criação/alteração do usuário do Supabase Auth
       * acontece SOMENTE pela API do servidor.
       *
       * Não fazemos signInWithPassword,
       * signOut ou setSession aqui.
       *
       * Isso mantém a sessão do administrador intacta.
       */

      const acessoResponse = await fetch(
        "/api/funcionarios/acesso",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            funcionario_id:
              funcionarioId,

            permitir_acesso:
              form.permitir_acesso,

            email_login:
              form.email_login.trim(),

            senha:
              form.senha.trim(),

            perfil:
              form.perfil,

            permissoes:
              form.permissoes,
          }),
        }
      );

      const acessoData =
        await acessoResponse.json().catch(
          () => ({})
        );

      if (!acessoResponse.ok) {
        throw new Error(
          acessoData?.error ||
            "O funcionário foi salvo, mas não foi possível configurar o acesso."
        );
      }

      setShowForm(false);
      setEditingId(null);

      setForm({
        ...emptyForm,
        permissoes: emptyPermissions(),
      });

      await loadEmployees();

      alert(
        form.permitir_acesso
          ? "Funcionário salvo e acesso configurado com sucesso!"
          : "Funcionário salvo e acesso bloqueado com sucesso!"
      );
    } catch (error) {
      console.error(
        "Erro ao salvar funcionário:",
        error
      );

      alert(
        `Não foi possível concluir o cadastro.\n\n${
          error instanceof Error
            ? error.message
            : "Erro desconhecido."
        }`
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteEmployee(
    employee: Employee
  ) {
    const confirmed = window.confirm(
      `Deseja realmente excluir o funcionário "${employee.nome}"?\n\n` +
        `Se ele já possuir registros relacionados, recomendamos apenas colocá-lo como Inativo.`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("funcionarios")
      .delete()
      .eq("id", employee.id);

    if (error) {
      alert(
        `Não foi possível excluir o funcionário.\n\n${error.message}`
      );
      return;
    }

    await loadEmployees();
  }

  async function toggleStatus(
    employee: Employee
  ) {
    const nextStatus =
      employee.status === "Ativo"
        ? "Inativo"
        : "Ativo";

    const { error } = await supabase
      .from("funcionarios")
      .update({
        status: nextStatus,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", employee.id);

    if (error) {
      alert(
        `Não foi possível alterar o status.\n\n${error.message}`
      );
      return;
    }

    await loadEmployees();
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Funcionários
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Cadastro, acesso, permissões e dados dos funcionários.
            </p>
          </div>

          <button
            type="button"
            onClick={openNewForm}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            <Plus size={20} />
            Novo funcionário
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Funcionários ativos
            </p>

            <p className="mt-2 text-2xl font-bold">
              {activeCount}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Funcionários inativos
            </p>

            <p className="mt-2 text-2xl font-bold">
              {inactiveCount}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Folha mensal cadastrada
            </p>

            <p className="mt-2 text-2xl font-bold">
              {formatCurrency(totalSalaries)}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search
                size={19}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Pesquisar funcionário..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as
                    | "Todos"
                    | EmployeeStatus
                )
              }
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm"
            >
              <option value="Todos">
                Todos os status
              </option>

              <option value="Ativo">
                Ativos
              </option>

              <option value="Inativo">
                Inativos
              </option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          {loading ? (
            <div className="p-10 text-center text-gray-500">
              Carregando funcionários...
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="p-10 text-center">
              <User
                size={42}
                className="mx-auto text-gray-300"
              />

              <p className="mt-3 font-semibold">
                Nenhum funcionário encontrado
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-5 py-4">
                      Funcionário
                    </th>

                    <th className="px-5 py-4">
                      Cargo
                    </th>

                    <th className="px-5 py-4">
                      Telefone
                    </th>

                    <th className="px-5 py-4">
                      Salário
                    </th>

                    <th className="px-5 py-4">
                      Acesso
                    </th>

                    <th className="px-5 py-4">
                      Status
                    </th>

                    <th className="px-5 py-4 text-right">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {filteredEmployees.map(
                    (employee) => (
                      <tr
                        key={employee.id}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                              <User size={20} />
                            </div>

                            <div>
                              <p className="font-semibold">
                                {employee.nome}
                              </p>

                              <p className="text-xs text-gray-500">
                                {employee.cpf ||
                                  "CPF não informado"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <p>
                            {employee.cargo ||
                              "Não informado"}
                          </p>

                          <p className="text-xs text-gray-500">
                            {employee.tipo_vinculo}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          {employee.whatsapp ||
                            employee.telefone ||
                            "-"}
                        </td>

                        <td className="px-5 py-4 font-semibold">
                          {formatCurrency(
                            employee.salario
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              employee.permitir_acesso
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {employee.permitir_acesso
                              ? "Liberado"
                              : "Bloqueado"}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() =>
                              toggleStatus(
                                employee
                              )
                            }
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              employee.status ===
                              "Ativo"
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {employee.status}
                          </button>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                openEditForm(
                                  employee
                                )
                              }
                              className="rounded-lg border p-2 text-gray-600 hover:bg-gray-100"
                            >
                              <Edit size={17} />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                deleteEmployee(
                                  employee
                                )
                              }
                              className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-3 md:p-6">
          <div className="mx-auto my-4 max-w-5xl rounded-2xl bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="text-xl font-bold">
                  {editingId
                    ? "Editar funcionário"
                    : "Novo funcionário"}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Cadastro completo do funcionário.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowForm(false)
                }
                className="rounded-xl p-2 text-gray-500 hover:bg-gray-100"
              >
                <X size={22} />
              </button>
            </div>

            <div className="max-h-[75vh] overflow-y-auto p-5">
              <div className="space-y-6">

                <section>
                  <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-500">
                    Dados pessoais
                  </h3>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-medium">
                        Nome completo *
                      </label>

                      <input
                        value={form.nome}
                        onChange={(event) =>
                          updateField(
                            "nome",
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border px-4 py-3"
                        placeholder="Nome completo"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        CPF
                      </label>

                      <input
                        value={form.cpf}
                        onChange={(event) =>
                          updateField(
                            "cpf",
                            maskCpf(
                              event.target.value
                            )
                          )
                        }
                        className="w-full rounded-xl border px-4 py-3"
                        placeholder="000.000.000-00"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        RG
                      </label>

                      <input
                        value={form.rg}
                        onChange={(event) =>
                          updateField(
                            "rg",
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border px-4 py-3"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        Data de nascimento
                      </label>

                      <input
                        type="date"
                        value={
                          form.data_nascimento
                        }
                        onChange={(event) =>
                          updateField(
                            "data_nascimento",
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border px-4 py-3"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        Data de admissão
                      </label>

                      <input
                        type="date"
                        value={
                          form.data_admissao
                        }
                        onChange={(event) =>
                          updateField(
                            "data_admissao",
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border px-4 py-3"
                      />
                    </div>

                  </div>
                </section>

                <section>
                  <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-500">
                    Contato
                  </h3>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        Telefone
                      </label>

                      <input
                        value={form.telefone}
                        onChange={(event) =>
                          updateField(
                            "telefone",
                            maskPhone(
                              event.target.value
                            )
                          )
                        }
                        className="w-full rounded-xl border px-4 py-3"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        WhatsApp
                      </label>

                      <input
                        value={form.whatsapp}
                        onChange={(event) =>
                          updateField(
                            "whatsapp",
                            maskPhone(
                              event.target.value
                            )
                          )
                        }
                        className="w-full rounded-xl border px-4 py-3"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-medium">
                        E-mail
                      </label>

                      <input
                        type="email"
                        value={form.email}
                        onChange={(event) =>
                          updateField(
                            "email",
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border px-4 py-3"
                      />
                    </div>

                  </div>
                </section>

                <section>
                  <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-500">
                    Endereço
                  </h3>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-6">

                    <div className="md:col-span-4">
                      <label className="mb-1 block text-sm font-medium">
                        Endereço
                      </label>

                      <input
                        value={form.endereco}
                        onChange={(event) =>
                          updateField(
                            "endereco",
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border px-4 py-3"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        Número
                      </label>

                      <input
                        value={form.numero}
                        onChange={(event) =>
                          updateField(
                            "numero",
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border px-4 py-3"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        CEP
                      </label>

                      <input
                        value={form.cep}
                        onChange={(event) =>
                          updateField(
                            "cep",
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border px-4 py-3"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-medium">
                        Bairro
                      </label>

                      <input
                        value={form.bairro}
                        onChange={(event) =>
                          updateField(
                            "bairro",
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border px-4 py-3"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-medium">
                        Cidade
                      </label>

                      <input
                        value={form.cidade}
                        onChange={(event) =>
                          updateField(
                            "cidade",
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border px-4 py-3"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-medium">
                        Complemento
                      </label>

                      <input
                        value={form.complemento}
                        onChange={(event) =>
                          updateField(
                            "complemento",
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border px-4 py-3"
                      />
                    </div>

                  </div>
                </section>

                <section>
                  <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-500">
                    Dados profissionais
                  </h3>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        Cargo
                      </label>

                      <input
                        value={form.cargo}
                        onChange={(event) =>
                          updateField(
                            "cargo",
                            event.target.value
                          )
                        }
                        placeholder="Ex.: Técnico"
                        className="w-full rounded-xl border px-4 py-3"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        Tipo de vínculo
                      </label>

                      <select
                        value={
                          form.tipo_vinculo
                        }
                        onChange={(event) =>
                          updateField(
                            "tipo_vinculo",
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border bg-white px-4 py-3"
                      >
                        <option>
                          Funcionário
                        </option>

                        <option>
                          CLT
                        </option>

                        <option>
                          Autônomo
                        </option>

                        <option>
                          Prestador de serviço
                        </option>

                        <option>
                          Temporário
                        </option>

                        <option>
                          Sócio
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        Salário / valor mensal
                      </label>

                      <input
                        value={form.salario}
                        onChange={(event) =>
                          updateField(
                            "salario",
                            event.target.value
                          )
                        }
                        placeholder="0,00"
                        className="w-full rounded-xl border px-4 py-3"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        Forma de pagamento
                      </label>

                      <select
                        value={
                          form.forma_pagamento
                        }
                        onChange={(event) =>
                          updateField(
                            "forma_pagamento",
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border bg-white px-4 py-3"
                      >
                        <option value="">
                          Selecionar
                        </option>

                        <option value="Pix">
                          Pix
                        </option>

                        <option value="Transferência">
                          Transferência
                        </option>

                        <option value="Dinheiro">
                          Dinheiro
                        </option>

                        <option value="Cheque">
                          Cheque
                        </option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-medium">
                        Chave Pix
                      </label>

                      <input
                        value={form.chave_pix}
                        onChange={(event) =>
                          updateField(
                            "chave_pix",
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border px-4 py-3"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        Status
                      </label>

                      <select
                        value={form.status}
                        onChange={(event) =>
                          updateField(
                            "status",
                            event.target.value as EmployeeStatus
                          )
                        }
                        className="w-full rounded-xl border bg-white px-4 py-3"
                      >
                        <option value="Ativo">
                          Ativo
                        </option>

                        <option value="Inativo">
                          Inativo
                        </option>
                      </select>
                    </div>

                  </div>
                </section>

                <section className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 md:p-5">

                  <div className="mb-5 flex items-start gap-3">
                    <div className="rounded-xl bg-blue-600 p-2 text-white">
                      <Lock size={20} />
                    </div>

                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wide text-blue-700">
                        Acesso ao sistema
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        O administrador controla o acesso e as permissões.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        Permitir acesso
                      </label>

                      <select
                        value={
                          form.permitir_acesso
                            ? "sim"
                            : "nao"
                        }
                        onChange={(event) =>
                          updateField(
                            "permitir_acesso",
                            event.target.value ===
                              "sim"
                          )
                        }
                        className="w-full rounded-xl border bg-white px-4 py-3"
                      >
                        <option value="nao">
                          Não — sem acesso
                        </option>

                        <option value="sim">
                          Sim — permitir acesso
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        Perfil de acesso
                      </label>

                      <select
                        value={form.perfil}
                        onChange={(event) =>
                          updateField(
                            "perfil",
                            event.target.value
                          )
                        }
                        disabled={
                          !form.permitir_acesso
                        }
                        className="w-full rounded-xl border bg-white px-4 py-3 disabled:bg-gray-100"
                      >
                        <option value="Administrador">
                          Administrador
                        </option>

                        <option value="Gerente">
                          Gerente
                        </option>

                        <option value="Encarregado">
                          Encarregado
                        </option>

                        <option value="Atendente">
                          Atendente
                        </option>

                        <option value="Tecnico">
                          Técnico
                        </option>

                        <option value="Ajudante">
                          Ajudante
                        </option>

                        <option value="Financeiro">
                          Financeiro
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        E-mail de login
                      </label>

                      <input
                        type="email"
                        value={form.email_login}
                        onChange={(event) =>
                          updateField(
                            "email_login",
                            event.target.value
                          )
                        }
                        placeholder="funcionario@empresa.com"
                        disabled={
                          !form.permitir_acesso
                        }
                        className="w-full rounded-xl border bg-white px-4 py-3 disabled:bg-gray-100"
                      />
                    </div>

                    <div>
                      <label className="mb-1 flex items-center gap-2 text-sm font-medium">
                        <KeyRound size={16} />
                        Senha
                      </label>

                      <input
                        type="password"
                        value={form.senha}
                        onChange={(event) =>
                          updateField(
                            "senha",
                            event.target.value
                          )
                        }
                        placeholder={
                          editingId
                            ? "Deixe vazio para manter a atual"
                            : "Crie uma senha"
                        }
                        disabled={
                          !form.permitir_acesso
                        }
                        className="w-full rounded-xl border bg-white px-4 py-3 disabled:bg-gray-100"
                      />
                    </div>

                  </div>

                  <div className="mt-6 rounded-xl border bg-white p-4">

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                      <div>
                        <h4 className="font-semibold">
                          Permissões por módulo
                        </h4>

                        <p className="mt-1 text-xs text-gray-500">
                          Defina exatamente o que esse usuário poderá fazer.
                        </p>
                      </div>

                      <div className="flex gap-2">

                        <button
                          type="button"
                          onClick={() =>
                            setAllPermissions(true)
                          }
                          disabled={
                            !form.permitir_acesso
                          }
                          className="rounded-lg border px-3 py-2 text-xs font-semibold text-blue-700 disabled:opacity-50"
                        >
                          Liberar tudo
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setAllPermissions(false)
                          }
                          disabled={
                            !form.permitir_acesso
                          }
                          className="rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50"
                        >
                          Bloquear tudo
                        </button>

                      </div>
                    </div>

                    <div className="mt-4 overflow-x-auto">

                      <table className="w-full min-w-[680px] text-sm">

                        <thead>
                          <tr className="border-b text-left text-gray-500">

                            <th className="px-2 py-3">
                              Módulo
                            </th>

                            <th className="px-2 py-3 text-center">
                              Visualizar
                            </th>

                            <th className="px-2 py-3 text-center">
                              Criar
                            </th>

                            <th className="px-2 py-3 text-center">
                              Editar
                            </th>

                            <th className="px-2 py-3 text-center">
                              Excluir
                            </th>

                          </tr>
                        </thead>

                        <tbody className="divide-y">

                          {ACCESS_MODULES.map(
                            (module) => {

                              const permission =
                                form.permissoes[
                                  module
                                ] || {
                                  visualizar: false,
                                  criar: false,
                                  editar: false,
                                  excluir: false,
                                };

                              return (
                                <tr key={module}>

                                  <td className="px-2 py-3 font-medium">
                                    {
                                      ACCESS_MODULE_LABELS[
                                        module
                                      ]
                                    }
                                  </td>

                                  {(
                                    [
                                      "visualizar",
                                      "criar",
                                      "editar",
                                      "excluir",
                                    ] as const
                                  ).map(
                                    (action) => (
                                      <td
                                        key={
                                          action
                                        }
                                        className="px-2 py-3 text-center"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={
                                            permission[
                                              action
                                            ]
                                          }
                                          onChange={(
                                            event
                                          ) =>
                                            updatePermission(
                                              module,
                                              action,
                                              event
                                                .target
                                                .checked
                                            )
                                          }
                                          disabled={
                                            !form.permitir_acesso
                                          }
                                          className="h-4 w-4"
                                        />
                                      </td>
                                    )
                                  )}

                                </tr>
                              );
                            }
                          )}

                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-500">
                    Observações
                  </h3>

                  <textarea
                    value={form.observacoes}
                    onChange={(event) =>
                      updateField(
                        "observacoes",
                        event.target.value
                      )
                    }
                    rows={4}
                    className="w-full resize-none rounded-xl border px-4 py-3"
                    placeholder="Observações sobre o funcionário..."
                  />
                </section>

              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t bg-gray-50 p-5 sm:flex-row sm:justify-end">

              <button
                type="button"
                onClick={() =>
                  setShowForm(false)
                }
                disabled={saving}
                className="rounded-xl border bg-white px-5 py-3 font-semibold"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={saveEmployee}
                disabled={saving}
                className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-60"
              >
                {saving
                  ? "Salvando..."
                  : editingId
                  ? "Salvar alterações"
                  : "Cadastrar funcionário"}
              </button>

            </div>

          </div>
        </div>
      )}
    </main>
  );
}
