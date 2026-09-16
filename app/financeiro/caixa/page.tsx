"use client";

import {
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  CalendarDays,
  CreditCard,
  Edit,
  MinusCircle,
  Plus,
  Receipt,
  Search,
  Trash2,
  User,
  Wallet,
  X,
} from "lucide-react";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type MovementType =
  | "Entrada"
  | "Despesa"
  | "Sangria"
  | "Pagamento funcionário"
  | "Pró-labore";

type Movement = {
  id: string;
  tipo: MovementType;
  descricao: string;
  valor: number;
  data_movimento: string;
  forma_pagamento: string;
  categoria: string;
  funcionario_id: string | null;
  funcionario_nome: string;
  motivo: string;
  observacoes: string;
  criado_por: string;
  created_at: string;
};

type Employee = {
  id: string;
  nome: string;
  cargo: string;
  salario: number;
  status: string;
};

type FormData = {
  tipo: MovementType;
  descricao: string;
  valor: string;
  data_movimento: string;
  forma_pagamento: string;
  categoria: string;
  funcionario_id: string;
  funcionario_nome: string;
  motivo: string;
  observacoes: string;
};

const emptyForm: FormData = {
  tipo: "Entrada",
  descricao: "",
  valor: "",
  data_movimento: new Date()
    .toISOString()
    .slice(0, 10),
  forma_pagamento: "",
  categoria: "",
  funcionario_id: "",
  funcionario_nome: "",
  motivo: "",
  observacoes: "",
};

function money(value: number) {
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

function dateBR(value: string) {
  if (!value) return "-";

  const parts = value.split("-");

  if (parts.length !== 3) return value;

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function typeClass(type: MovementType) {
  if (type === "Entrada") {
    return "bg-green-100 text-green-700 border-green-200";
  }

  if (type === "Pró-labore") {
    return "bg-purple-100 text-purple-700 border-purple-200";
  }

  if (type === "Pagamento funcionário") {
    return "bg-orange-100 text-orange-700 border-orange-200";
  }

  if (type === "Sangria") {
    return "bg-red-100 text-red-700 border-red-200";
  }

  return "bg-gray-100 text-gray-700 border-gray-200";
}

function isIncome(type: MovementType) {
  return type === "Entrada";
}

export default function CaixaPage() {
  const supabase = createClient();

  const [movements, setMovements] = useState<
    Movement[]
  >([]);

  const [employees, setEmployees] = useState<
    Employee[]
  >([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [showForm, setShowForm] =
    useState(false);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [form, setForm] =
    useState<FormData>(emptyForm);

  const [saving, setSaving] = useState(false);

  async function loadData() {
    setLoading(true);

    const [movementsResult, employeesResult] =
      await Promise.all([
        supabase
          .from("caixa_movimentacoes")
          .select("*")
          .order("data_movimento", {
            ascending: false,
          })
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("funcionarios")
          .select(
            "id, nome, cargo, salario, status"
          )
          .eq("status", "Ativo")
          .order("nome", {
            ascending: true,
          }),
      ]);

    if (movementsResult.error) {
      console.error(
        "Erro ao carregar caixa:",
        movementsResult.error
      );

      alert(
        `Erro ao carregar o caixa.\n\n${movementsResult.error.message}`
      );
    }

    if (employeesResult.error) {
      console.error(
        "Erro ao carregar funcionários:",
        employeesResult.error
      );
    }

    const movementData =
      movementsResult.data || [];

    setMovements(
      movementData.map((item) => ({
        id: item.id,
        tipo: item.tipo as MovementType,
        descricao: item.descricao || "",
        valor: Number(item.valor || 0),
        data_movimento:
          item.data_movimento || "",
        forma_pagamento:
          item.forma_pagamento || "",
        categoria: item.categoria || "",
        funcionario_id:
          item.funcionario_id || null,
        funcionario_nome:
          item.funcionario_nome || "",
        motivo: item.motivo || "",
        observacoes:
          item.observacoes || "",
        criado_por:
          item.criado_por || "",
        created_at:
          item.created_at || "",
      }))
    );

    setEmployees(
      (employeesResult.data || []).map(
        (item) => ({
          id: item.id,
          nome: item.nome || "",
          cargo: item.cargo || "",
          salario: Number(
            item.salario || 0
          ),
          status: item.status || "Ativo",
        })
      )
    );

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const totals = useMemo(() => {
    const entradas = movements
      .filter((item) =>
        isIncome(item.tipo)
      )
      .reduce(
        (sum, item) =>
          sum + Number(item.valor || 0),
        0
      );

    const saidas = movements
      .filter(
        (item) =>
          item.tipo !== "Entrada"
      )
      .reduce(
        (sum, item) =>
          sum + Number(item.valor || 0),
        0
      );

    const sangrias = movements
      .filter(
        (item) =>
          item.tipo === "Sangria"
      )
      .reduce(
        (sum, item) =>
          sum + Number(item.valor || 0),
        0
      );

    const salarios = movements
      .filter(
        (item) =>
          item.tipo ===
          "Pagamento funcionário"
      )
      .reduce(
        (sum, item) =>
          sum + Number(item.valor || 0),
        0
      );

    const proLabore = movements
      .filter(
        (item) =>
          item.tipo === "Pró-labore"
      )
      .reduce(
        (sum, item) =>
          sum + Number(item.valor || 0),
        0
      );

    return {
      entradas,
      saidas,
      sangrias,
      salarios,
      proLabore,
      saldo: entradas - saidas,
    };
  }, [movements]);

  const filteredMovements = useMemo(() => {
    const term =
      search.trim().toLowerCase();

    if (!term) return movements;

    return movements.filter((item) =>
      [
        item.tipo,
        item.descricao,
        item.funcionario_nome,
        item.motivo,
        item.categoria,
        item.forma_pagamento,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [movements, search]);

  function openNewForm(
    type: MovementType = "Entrada"
  ) {
    setEditingId(null);

    setForm({
      ...emptyForm,
      tipo: type,
    });

    setShowForm(true);
  }

  function openEditForm(
    movement: Movement
  ) {
    setEditingId(movement.id);

    setForm({
      tipo: movement.tipo,
      descricao: movement.descricao,
      valor: String(movement.valor),
      data_movimento:
        movement.data_movimento,
      forma_pagamento:
        movement.forma_pagamento,
      categoria: movement.categoria,
      funcionario_id:
        movement.funcionario_id || "",
      funcionario_nome:
        movement.funcionario_nome,
      motivo: movement.motivo,
      observacoes:
        movement.observacoes,
    });

    setShowForm(true);
  }

  function updateField<K extends keyof FormData>(
    field: K,
    value: FormData[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleTypeChange(
    type: MovementType
  ) {
    setForm((current) => ({
      ...current,
      tipo: type,
      funcionario_id: "",
      funcionario_nome: "",
      motivo: "",
      descricao:
        type === "Sangria"
          ? "Sangria de caixa"
          : type === "Pró-labore"
          ? "Pró-labore do administrador"
          : type ===
            "Pagamento funcionário"
          ? "Pagamento de funcionário"
          : current.descricao,
    }));
  }

  function handleEmployeeChange(
    employeeId: string
  ) {
    const employee =
      employees.find(
        (item) =>
          item.id === employeeId
      );

    setForm((current) => ({
      ...current,
      funcionario_id: employeeId,
      funcionario_nome:
        employee?.nome || "",
      valor:
        current.tipo ===
          "Pagamento funcionário" &&
        employee?.salario
          ? String(employee.salario)
          : current.valor,
    }));
  }

  async function saveMovement() {
    const numericValue = parseMoney(
      form.valor
    );

    if (numericValue <= 0) {
      alert(
        "Informe um valor maior que zero."
      );
      return;
    }

    if (
      form.tipo ===
        "Pagamento funcionário" &&
      !form.funcionario_id
    ) {
      alert(
        "Selecione o funcionário que receberá o pagamento."
      );
      return;
    }

    if (
      (form.tipo === "Sangria" ||
        form.tipo === "Pró-labore") &&
      !form.motivo.trim()
    ) {
      alert(
        "Informe o motivo da retirada."
      );
      return;
    }

    setSaving(true);

    const payload = {
      tipo: form.tipo,
      descricao:
        form.descricao.trim() ||
        form.tipo,
      valor: numericValue,
      data_movimento:
        form.data_movimento,
      forma_pagamento:
        form.forma_pagamento.trim(),
      categoria:
        form.categoria.trim(),
      funcionario_id:
        form.funcionario_id || null,
      funcionario_nome:
        form.funcionario_nome.trim(),
      motivo:
        form.motivo.trim(),
      observacoes:
        form.observacoes.trim(),
      criado_por: "Administrador",
      updated_at:
        new Date().toISOString(),
    };

    let error;

    if (editingId) {
      const result = await supabase
        .from("caixa_movimentacoes")
        .update(payload)
        .eq("id", editingId);

      error = result.error;
    } else {
      const result = await supabase
        .from("caixa_movimentacoes")
        .insert({
          ...payload,
          created_at:
            new Date().toISOString(),
        });

      error = result.error;
    }

    setSaving(false);

    if (error) {
      console.error(
        "Erro ao salvar movimentação:",
        error
      );

      alert(
        `Não foi possível salvar.\n\n${error.message}`
      );

      return;
    }

    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);

    await loadData();

    alert(
      editingId
        ? "Movimentação atualizada!"
        : "Movimentação registrada!"
    );
  }

  async function deleteMovement(
    movement: Movement
  ) {
    const confirmed =
      window.confirm(
        `Excluir esta movimentação?\n\n${movement.tipo}: ${money(
          movement.valor
        )}`
      );

    if (!confirmed) return;

    const { error } =
      await supabase
        .from("caixa_movimentacoes")
        .delete()
        .eq("id", movement.id);

    if (error) {
      alert(
        `Não foi possível excluir.\n\n${error.message}`
      );
      return;
    }

    await loadData();
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* CABEÇALHO */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Caixa
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Controle de entradas, despesas,
              sangrias, funcionários e
              pró-labore.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                openNewForm("Entrada")
              }
              className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700"
            >
              <Plus size={18} />
              Entrada
            </button>

            <button
              type="button"
              onClick={() =>
                openNewForm("Despesa")
              }
              className="inline-flex items-center gap-2 rounded-xl bg-gray-800 px-4 py-3 font-semibold text-white hover:bg-gray-900"
            >
              <MinusCircle size={18} />
              Despesa
            </button>
          </div>
        </div>

        {/* SALDO */}
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
              <Wallet size={25} />
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Saldo atual do caixa
              </p>

              <p className="text-3xl font-bold text-gray-900">
                {money(totals.saldo)}
              </p>
            </div>
          </div>
        </div>

        {/* RESUMO */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <ArrowUpCircle
                className="text-green-600"
                size={22}
              />

              <p className="text-sm text-gray-500">
                Entradas
              </p>
            </div>

            <p className="mt-2 text-xl font-bold text-green-600">
              {money(totals.entradas)}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <ArrowDownCircle
                className="text-red-600"
                size={22}
              />

              <p className="text-sm text-gray-500">
                Saídas
              </p>
            </div>

            <p className="mt-2 text-xl font-bold text-red-600">
              {money(totals.saidas)}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Sangrias
            </p>

            <p className="mt-2 text-xl font-bold text-red-600">
              {money(totals.sangrias)}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Funcionários
            </p>

            <p className="mt-2 text-xl font-bold text-orange-600">
              {money(totals.salarios)}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Pró-labore
            </p>

            <p className="mt-2 text-xl font-bold text-purple-600">
              {money(totals.proLabore)}
            </p>
          </div>
        </div>

        {/* AÇÕES */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">

          <button
            type="button"
            onClick={() =>
              openNewForm("Sangria")
            }
            className="flex items-center justify-center gap-3 rounded-2xl border bg-white p-5 text-left shadow-sm hover:bg-red-50"
          >
            <Banknote
              className="text-red-600"
              size={25}
            />

            <div>
              <p className="font-bold text-gray-900">
                Nova sangria
              </p>

              <p className="text-xs text-gray-500">
                Retirada de dinheiro do caixa
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              openNewForm(
                "Pagamento funcionário"
              )
            }
            className="flex items-center justify-center gap-3 rounded-2xl border bg-white p-5 text-left shadow-sm hover:bg-orange-50"
          >
            <User
              className="text-orange-600"
              size={25}
            />

            <div>
              <p className="font-bold text-gray-900">
                Pagar funcionário
              </p>

              <p className="text-xs text-gray-500">
                Registrar salário ou pagamento
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              openNewForm("Pró-labore")
            }
            className="flex items-center justify-center gap-3 rounded-2xl border bg-white p-5 text-left shadow-sm hover:bg-purple-50"
          >
            <Wallet
              className="text-purple-600"
              size={25}
            />

            <div>
              <p className="font-bold text-gray-900">
                Pró-labore
              </p>

              <p className="text-xs text-gray-500">
                Retirada do administrador
              </p>
            </div>
          </button>
        </div>

        {/* PESQUISA */}
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="relative">
            <Search
              size={19}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Pesquisar movimentações..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* MOVIMENTAÇÕES */}
        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">

          {loading ? (
            <div className="p-10 text-center text-gray-500">
              Carregando caixa...
            </div>
          ) : filteredMovements.length ===
            0 ? (
            <div className="p-10 text-center">
              <Receipt
                size={42}
                className="mx-auto text-gray-300"
              />

              <p className="mt-3 font-semibold text-gray-700">
                Nenhuma movimentação
              </p>

              <p className="mt-1 text-sm text-gray-400">
                As entradas e saídas aparecerão
                aqui.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-5 py-4">
                      Data
                    </th>

                    <th className="px-5 py-4">
                      Tipo
                    </th>

                    <th className="px-5 py-4">
                      Descrição
                    </th>

                    <th className="px-5 py-4">
                      Funcionário
                    </th>

                    <th className="px-5 py-4">
                      Forma
                    </th>

                    <th className="px-5 py-4">
                      Valor
                    </th>

                    <th className="px-5 py-4 text-right">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {filteredMovements.map(
                    (movement) => (
                      <tr
                        key={movement.id}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-5 py-4 whitespace-nowrap">
                          {dateBR(
                            movement.data_movimento
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${typeClass(
                              movement.tipo
                            )}`}
                          >
                            {movement.tipo}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-medium text-gray-900">
                            {movement.descricao}
                          </p>

                          {movement.motivo && (
                            <p className="mt-1 text-xs text-gray-500">
                              {movement.motivo}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {movement.funcionario_nome ||
                            "-"}
                        </td>

                        <td className="px-5 py-4">
                          {movement.forma_pagamento ||
                            "-"}
                        </td>

                        <td
                          className={`px-5 py-4 font-bold ${
                            isIncome(
                              movement.tipo
                            )
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {isIncome(
                            movement.tipo
                          )
                            ? "+"
                            : "-"}{" "}
                          {money(
                            movement.valor
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                openEditForm(
                                  movement
                                )
                              }
                              className="rounded-lg border p-2 text-gray-600 hover:bg-gray-100"
                            >
                              <Edit size={17} />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                deleteMovement(
                                  movement
                                )
                              }
                              className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                            >
                              <Trash2
                                size={17}
                              />
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

      {/* MODAL */}
      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-3 md:p-6">
          <div className="mx-auto my-4 max-w-2xl rounded-2xl bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editingId
                    ? "Editar movimentação"
                    : "Nova movimentação"}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Registre corretamente toda saída
                  ou entrada da empresa.
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

            <div className="max-h-[75vh] space-y-5 overflow-y-auto p-5">

              {/* TIPO */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Tipo da movimentação
                </label>

                <select
                  value={form.tipo}
                  onChange={(event) =>
                    handleTypeChange(
                      event.target
                        .value as MovementType
                    )
                  }
                  className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"
                >
                  <option value="Entrada">
                    Entrada
                  </option>

                  <option value="Despesa">
                    Despesa
                  </option>

                  <option value="Sangria">
                    Sangria
                  </option>

                  <option value="Pagamento funcionário">
                    Pagamento funcionário
                  </option>

                  <option value="Pró-labore">
                    Pró-labore
                  </option>
                </select>
              </div>

              {/* FUNCIONÁRIO */}
              {form.tipo ===
                "Pagamento funcionário" && (
                <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Funcionário
                  </label>

                  <select
                    value={
                      form.funcionario_id
                    }
                    onChange={(event) =>
                      handleEmployeeChange(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border bg-white px-4 py-3 outline-none focus:border-orange-500"
                  >
                    <option value="">
                      Selecione o funcionário
                    </option>

                    {employees.map(
                      (employee) => (
                        <option
                          key={employee.id}
                          value={employee.id}
                        >
                          {employee.nome} —{" "}
                          {money(
                            employee.salario
                          )}
                        </option>
                      )
                    )}
                  </select>

                  {form.funcionario_id && (
                    <p className="mt-2 text-xs text-orange-700">
                      O salário cadastrado foi
                      preenchido automaticamente.
                    </p>
                  )}
                </div>
              )}

              {/* VALOR */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Valor
                </label>

                <input
                  value={form.valor}
                  onChange={(event) =>
                    updateField(
                      "valor",
                      event.target.value
                    )
                  }
                  placeholder="0,00"
                  inputMode="decimal"
                  className="w-full rounded-xl border px-4 py-3 text-lg font-semibold outline-none focus:border-blue-500"
                />
              </div>

              {/* DATA + FORMA */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Data
                  </label>

                  <div className="relative">
                    <CalendarDays
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                      type="date"
                      value={
                        form.data_movimento
                      }
                      onChange={(event) =>
                        updateField(
                          "data_movimento",
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border py-3 pl-10 pr-4 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
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
                    className="w-full rounded-xl border bg-white px-4 py-3 outline-none focus:border-blue-500"
                  >
                    <option value="">
                      Selecionar
                    </option>

                    <option value="Dinheiro">
                      Dinheiro
                    </option>

                    <option value="Pix">
                      Pix
                    </option>

                    <option value="Transferência">
                      Transferência
                    </option>

                    <option value="Cartão">
                      Cartão
                    </option>

                    <option value="Boleto">
                      Boleto
                    </option>
                  </select>
                </div>
              </div>

              {/* DESCRIÇÃO */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Descrição
                </label>

                <input
                  value={form.descricao}
                  onChange={(event) =>
                    updateField(
                      "descricao",
                      event.target.value
                    )
                  }
                  placeholder="Ex.: Compra de material"
                  className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              {/* CATEGORIA */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Categoria
                </label>

                <input
                  value={form.categoria}
                  onChange={(event) =>
                    updateField(
                      "categoria",
                      event.target.value
                    )
                  }
                  placeholder="Ex.: Material, combustível, salário..."
                  className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              {/* MOTIVO */}
              {(form.tipo === "Sangria" ||
                form.tipo === "Pró-labore") && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Motivo da retirada *
                  </label>

                  <input
                    value={form.motivo}
                    onChange={(event) =>
                      updateField(
                        "motivo",
                        event.target.value
                      )
                    }
                    placeholder={
                      form.tipo === "Sangria"
                        ? "Ex.: Compra de material"
                        : "Ex.: Pró-labore referente ao mês"
                    }
                    className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>
              )}

              {/* OBSERVAÇÕES */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Observações
                </label>

                <textarea
                  value={form.observacoes}
                  onChange={(event) =>
                    updateField(
                      "observacoes",
                      event.target.value
                    )
                  }
                  rows={4}
                  placeholder="Observações..."
                  className="w-full resize-none rounded-xl border px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              {/* AVISO */}
              {form.tipo !== "Entrada" && (
                <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                  <strong>Atenção:</strong>{" "}
                  esta movimentação será registrada
                  como saída e reduzirá o saldo do
                  caixa.
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t bg-gray-50 p-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() =>
                  setShowForm(false)
                }
                className="rounded-xl border bg-white px-5 py-3 font-semibold text-gray-700 hover:bg-gray-100"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={saveMovement}
                disabled={saving}
                className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving
                  ? "Salvando..."
                  : editingId
                  ? "Salvar alterações"
                  : "Registrar movimentação"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
