"use client";

import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  Plus,
  Search,
  User,
  Wrench,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type BudgetStatus =
  | "Rascunho"
  | "Enviado"
  | "Aprovado"
  | "Recusado";

type Budget = {
  id: string;
  number: string;
  client: string;
  clientId: string | null;
  city: string;
  service: string;
  equipment: string;
  value: number;
  date: string;
  status: BudgetStatus;
};

type Client = {
  id: string;
  nome: string;
  cidade: string;
};

const statusStyles: Record<BudgetStatus, string> = {
  Rascunho: "bg-slate-100 text-slate-600",
  Enviado: "bg-blue-50 text-blue-700",
  Aprovado: "bg-emerald-50 text-emerald-700",
  Recusado: "bg-red-50 text-red-700",
};

const statuses: BudgetStatus[] = [
  "Rascunho",
  "Enviado",
  "Aprovado",
  "Recusado",
];

export default function OrcamentosPage() {
  const supabase = createClient();

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingOrderId, setGeneratingOrderId] =
    useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<"Todos" | BudgetStatus>("Todos");

  const [showForm, setShowForm] = useState(false);

  const [clientId, setClientId] = useState("");
  const [city, setCity] = useState("");
  const [service, setService] = useState("");
  const [equipment, setEquipment] = useState("");
  const [value, setValue] = useState("");
  const [date, setDate] = useState("");

  async function loadData() {
    setLoading(true);

    const [budgetsResult, clientsResult] =
      await Promise.all([
        supabase
          .from("orcamentos")
          .select("*")
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("clientes")
          .select("id, nome, cidade")
          .eq("status", "Ativo")
          .order("nome", {
            ascending: true,
          }),
      ]);

    if (budgetsResult.error) {
      console.error(
        "Erro ao carregar orçamentos:",
        budgetsResult.error
      );

      alert(
        `Não foi possível carregar os orçamentos.\n\n${budgetsResult.error.message}`
      );

      setLoading(false);
      return;
    }

    if (clientsResult.error) {
      console.error(
        "Erro ao carregar clientes:",
        clientsResult.error
      );

      alert(
        `Não foi possível carregar os clientes.\n\n${clientsResult.error.message}`
      );

      setLoading(false);
      return;
    }

    const formattedBudgets: Budget[] =
      (budgetsResult.data ?? []).map((item) => ({
        id: item.id,
        number: item.numero,
        client: item.cliente_nome,
        clientId: item.cliente_id,
        city: item.cidade ?? "",
        service: item.servico ?? "",
        equipment: item.equipamentos ?? "",
        value: Number(item.valor ?? 0),
        date: item.data
          ? new Date(
              `${item.data}T00:00:00`
            ).toLocaleDateString("pt-BR")
          : "",
        status: item.status as BudgetStatus,
      }));

    setBudgets(formattedBudgets);
    setClients(clientsResult.data ?? []);

    setLoading(false);
  }

  useEffect(() => {
    loadData();

    const params = new URLSearchParams(
      window.location.search
    );

    if (params.get("novo") === "1") {
      clearForm();

      setDate(
        new Date()
          .toISOString()
          .split("T")[0]
      );

      setShowForm(true);

      window.history.replaceState(
        {},
        "",
        window.location.pathname
      );
    }
  }, []);

  const filteredBudgets = useMemo(() => {
    const term = search
      .toLowerCase()
      .trim();

    return budgets.filter((budget) => {
      const matchesSearch =
        !term ||
        budget.number
          .toLowerCase()
          .includes(term) ||
        budget.client
          .toLowerCase()
          .includes(term) ||
        budget.city
          .toLowerCase()
          .includes(term) ||
        budget.service
          .toLowerCase()
          .includes(term) ||
        budget.equipment
          .toLowerCase()
          .includes(term);

      const matchesStatus =
        statusFilter === "Todos" ||
        budget.status === statusFilter;

      return (
        matchesSearch &&
        matchesStatus
      );
    });
  }, [
    budgets,
    search,
    statusFilter,
  ]);

  function clearForm() {
    setClientId("");
    setCity("");
    setService("");
    setEquipment("");
    setValue("");
    setDate("");
  }

  function openNewBudget() {
    clearForm();

    setDate(
      new Date()
        .toISOString()
        .split("T")[0]
    );

    setShowForm(true);
  }

  function handleClientChange(id: string) {
    setClientId(id);

    const selected = clients.find(
      (client) => client.id === id
    );

    if (selected) {
      setCity(selected.cidade);
    } else {
      setCity("");
    }
  }

  async function generateNumber() {
    const { data: lastBudget } =
      await supabase
        .from("orcamentos")
        .select("numero")
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

    let nextNumber = 1;

    if (lastBudget?.numero) {
      const match =
        lastBudget.numero.match(
          /(\d+)$/
        );

      if (match) {
        nextNumber =
          Number(match[1]) + 1;
      }
    }

    return `ORC-${String(
      nextNumber
    ).padStart(4, "0")}`;
  }

  async function generateOrderNumber() {
    const { data: lastOrder } =
      await supabase
        .from("ordens_servico")
        .select("numero")
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

    let nextNumber = 1;

    if (lastOrder?.numero) {
      const match =
        lastOrder.numero.match(
          /(\d+)$/
        );

      if (match) {
        nextNumber =
          Number(match[1]) + 1;
      }
    }

    return `OS-${String(
      nextNumber
    ).padStart(4, "0")}`;
  }

  function getServiceType(
    serviceName: string
  ):
    | "Preventiva"
    | "Corretiva"
    | "Instalação"
    | "Higienização"
    | "Visita técnica" {
    const text =
      serviceName
        .toLowerCase()
        .trim();

    if (
      text.includes("instala")
    ) {
      return "Instalação";
    }

    if (
      text.includes("higien")
    ) {
      return "Higienização";
    }

    if (
      text.includes("corret")
    ) {
      return "Corretiva";
    }

    if (
      text.includes("prevent")
    ) {
      return "Preventiva";
    }

    return "Visita técnica";
  }

  async function generateServiceOrder(
    budget: Budget
  ) {
    if (
      budget.status !==
      "Aprovado"
    ) {
      alert(
        "Somente orçamentos aprovados podem gerar uma Ordem de Serviço."
      );
      return;
    }

    if (!budget.clientId) {
      alert(
        "Este orçamento não possui um cliente vinculado."
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Deseja gerar uma Ordem de Serviço para o orçamento ${budget.number}?\n\nCliente: ${budget.client}\nServiço: ${budget.service}\nValor: ${budget.value.toLocaleString(
          "pt-BR",
          {
            style: "currency",
            currency: "BRL",
          }
        )}`
      );

    if (!confirmed) {
      return;
    }

    setGeneratingOrderId(
      budget.id
    );

    /*
     * Antes de criar, verificamos se já existe
     * uma OS originada deste orçamento.
     */
    const {
      data: existingOrders,
      error: existingError,
    } = await supabase
      .from("ordens_servico")
      .select("id, numero")
      .eq(
        "cliente_id",
        budget.clientId
      )
      .ilike(
        "observacoes",
        `%${budget.number}%`
      )
      .limit(1);

    if (existingError) {
      console.error(
        "Erro ao verificar OS existente:",
        existingError
      );

      alert(
        `Não foi possível verificar se já existe uma OS para este orçamento.\n\n${existingError.message}`
      );

      setGeneratingOrderId(null);
      return;
    }

    if (
      existingOrders &&
      existingOrders.length > 0
    ) {
      alert(
        `Este orçamento já possui uma Ordem de Serviço: ${existingOrders[0].numero}`
      );

      setGeneratingOrderId(null);
      return;
    }

    const number =
      await generateOrderNumber();

    const today =
      new Date()
        .toISOString()
        .split("T")[0];

    const serviceType =
      getServiceType(
        budget.service
      );

    const { error } =
      await supabase
        .from("ordens_servico")
        .insert({
          numero: number,

          cliente_id:
            budget.clientId,

          cliente_nome:
            budget.client,

          equipamento:
            budget.equipment ||
            "Não informado",

          cidade:
            budget.city,

          tipo_servico:
            serviceType,

          descricao:
            budget.service,

          data:
            today,

          tecnico: null,

          valor:
            budget.value,

          status:
            "Aberta",

          observacoes:
            `Gerada automaticamente a partir do orçamento ${budget.number}.`,
        });

    if (error) {
      console.error(
        "Erro ao gerar OS:",
        error
      );

      alert(
        `Não foi possível gerar a Ordem de Serviço.\n\n${error.message}`
      );

      setGeneratingOrderId(null);
      return;
    }

    alert(
      `Ordem de Serviço ${number} criada com sucesso!`
    );

    setGeneratingOrderId(null);

    window.location.href =
      "/ordens-servico";
  }

  async function saveBudget(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!clientId) {
      alert(
        "Selecione um cliente."
      );
      return;
    }

    if (!service.trim()) {
      alert(
        "Informe o serviço."
      );
      return;
    }

    if (!city.trim()) {
      alert(
        "Informe a cidade."
      );
      return;
    }

    const selectedClient =
      clients.find(
        (client) =>
          client.id === clientId
      );

    if (!selectedClient) {
      alert(
        "Cliente não encontrado."
      );
      return;
    }

    const numericValue =
      Number(
        value.replace(",", ".")
      ) || 0;

    setSaving(true);

    const number =
      await generateNumber();

    const { error } =
      await supabase
        .from("orcamentos")
        .insert({
          numero: number,
          cliente_id:
            selectedClient.id,
          cliente_nome:
            selectedClient.nome,
          cidade:
            city.trim(),
          servico:
            service.trim(),
          equipamentos:
            equipment.trim() ||
            null,
          valor:
            numericValue,
          data:
            date || null,
          status:
            "Rascunho",
        });

    if (error) {
      console.error(
        "Erro ao criar orçamento:",
        error
      );

      alert(
        `Não foi possível criar o orçamento.\n\n${error.message}`
      );

      setSaving(false);
      return;
    }

    setSaving(false);

    clearForm();
    setShowForm(false);

    await loadData();
  }

  async function changeStatus(
    budget: Budget,
    newStatus: BudgetStatus
  ) {
    const { error } =
      await supabase
        .from("orcamentos")
        .update({
          status: newStatus,
        })
        .eq("id", budget.id);

    if (error) {
      console.error(
        "Erro ao alterar status:",
        error
      );

      alert(
        `Não foi possível alterar o status.\n\n${error.message}`
      );

      return;
    }

    setBudgets((current) =>
      current.map((item) =>
        item.id === budget.id
          ? {
              ...item,
              status:
                newStatus,
            }
          : item
      )
    );
  }

  const totalValue =
    budgets.reduce(
      (total, budget) =>
        total + budget.value,
      0
    );

  const approvedBudgets =
    budgets.filter(
      (budget) =>
        budget.status ===
        "Aprovado"
    ).length;

  const pendingBudgets =
    budgets.filter(
      (budget) =>
        budget.status ===
          "Rascunho" ||
        budget.status ===
          "Enviado"
    ).length;

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-cyan-500 p-3 text-white">
              <FileText size={22} />
            </div>

            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Orçamentos
              </h1>

              <p className="text-sm text-slate-500">
                Controle de propostas e
                orçamentos
              </p>
            </div>
          </div>

          <button
            onClick={
              openNewBudget
            }
            className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-cyan-600"
          >
            <Plus size={18} />

            <span className="hidden sm:inline">
              Novo orçamento
            </span>

            <span className="sm:hidden">
              Novo
            </span>
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <section className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Total de orçamentos
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {budgets.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Aprovados
            </p>

            <p className="mt-2 text-2xl font-bold text-emerald-600">
              {approvedBudgets}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Pendentes
            </p>

            <p className="mt-2 text-2xl font-bold text-amber-600">
              {pendingBudgets}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Valor total
            </p>

            <p className="mt-2 text-2xl font-bold text-cyan-600">
              {totalValue.toLocaleString(
                "pt-BR",
                {
                  style:
                    "currency",
                  currency:
                    "BRL",
                }
              )}
            </p>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative flex-1">
                <Search
                  size={19}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Buscar orçamento, cliente, cidade..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-cyan-400 focus:bg-white focus:ring-2 focus:ring-cyan-100"
                />
              </div>

              <div className="flex gap-2 overflow-x-auto">
                {(
                  [
                    "Todos",
                    ...statuses,
                  ] as const
                ).map((item) => (
                  <button
                    key={item}
                    onClick={() =>
                      setStatusFilter(
                        item
                      )
                    }
                    className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold ${
                      statusFilter ===
                      item
                        ? "bg-cyan-500 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-sm text-slate-500">
              Carregando
              orçamentos...
            </div>
          ) : filteredBudgets.length ===
            0 ? (
            <div className="p-10 text-center">
              <FileText
                size={38}
                className="mx-auto text-slate-300"
              />

              <p className="mt-3 font-semibold text-slate-700">
                Nenhum orçamento
                encontrado
              </p>

              <p className="mt-1 text-sm text-slate-400">
                Clique em "Novo
                orçamento" para
                cadastrar.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredBudgets.map(
                (budget) => (
                  <div
                    key={budget.id}
                    className="p-5 hover:bg-slate-50"
                  >
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
                          <FileText
                            size={22}
                          />
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-cyan-600">
                              {
                                budget.number
                              }
                            </span>

                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[budget.status]}`}
                            >
                              {
                                budget.status
                              }
                            </span>
                          </div>

                          <h3 className="mt-1 font-semibold text-slate-900">
                            {
                              budget.service
                            }
                          </h3>

                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <User
                                size={
                                  14
                                }
                              />
                              {
                                budget.client
                              }
                            </span>

                            <span className="flex items-center gap-1">
                              <Building2
                                size={
                                  14
                                }
                              />
                              {
                                budget.city
                              }
                            </span>

                            <span className="flex items-center gap-1">
                              <Wrench
                                size={
                                  14
                                }
                              />
                              {budget.equipment ||
                                "Não informado"}
                            </span>

                            {budget.date && (
                              <span className="flex items-center gap-1">
                                <CalendarDays
                                  size={
                                    14
                                  }
                                />
                                {
                                  budget.date
                                }
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="sm:text-right">
                          <p className="text-xs text-slate-400">
                            Valor
                          </p>

                          <p className="text-lg font-bold text-slate-900">
                            {budget.value.toLocaleString(
                              "pt-BR",
                              {
                                style:
                                  "currency",
                                currency:
                                  "BRL",
                              }
                            )}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <select
                            value={
                              budget.status
                            }
                            onChange={(
                              event
                            ) =>
                              changeStatus(
                                budget,
                                event
                                  .target
                                  .value as BudgetStatus
                              )
                            }
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                          >
                            {statuses.map(
                              (
                                item
                              ) => (
                                <option
                                  key={
                                    item
                                  }
                                  value={
                                    item
                                  }
                                >
                                  {
                                    item
                                  }
                                </option>
                              )
                            )}
                          </select>

                          {budget.status ===
                            "Aprovado" && (
                            <button
                              onClick={() =>
                                generateServiceOrder(
                                  budget
                                )
                              }
                              disabled={
                                generatingOrderId ===
                                budget.id
                              }
                              className="flex items-center gap-2 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Wrench
                                size={
                                  15
                                }
                              />

                              {generatingOrderId ===
                              budget.id
                                ? "Gerando..."
                                : "Gerar OS"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>

        <div className="mt-6 text-xs text-slate-400">
          Valor total dos orçamentos:{" "}
          {totalValue.toLocaleString(
            "pt-BR",
            {
              style:
                "currency",
              currency:
                "BRL",
            }
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4">
          <div className="max-h-[95vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-2xl">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Novo Orçamento
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Preencha os dados da
                  proposta.
                </p>
              </div>

              <button
                onClick={() => {
                  clearForm();
                  setShowForm(false);
                }}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={saveBudget}
              className="space-y-4"
            >
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Cliente
                </label>

                <select
                  value={clientId}
                  onChange={(event) =>
                    handleClientChange(
                      event.target.value
                    )
                  }
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                >
                  <option value="">
                    Selecione um cliente
                  </option>

                  {clients.map(
                    (client) => (
                      <option
                        key={client.id}
                        value={client.id}
                      >
                        {client.nome}
                      </option>
                    )
                  )}
                </select>

                {clients.length ===
                  0 && (
                  <p className="mt-2 text-xs text-amber-600">
                    Cadastre um
                    cliente ativo
                    primeiro.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Cidade
                </label>

                <input
                  value={city}
                  onChange={(event) =>
                    setCity(
                      event.target.value
                    )
                  }
                  placeholder="Cidade do atendimento"
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Serviço
                </label>

                <input
                  value={service}
                  onChange={(event) =>
                    setService(
                      event.target.value
                    )
                  }
                  placeholder="Ex.: Instalação de Split 12.000 BTUs"
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Equipamento
                </label>

                <input
                  value={
                    equipment
                  }
                  onChange={(
                    event
                  ) =>
                    setEquipment(
                      event.target
                        .value
                    )
                  }
                  placeholder="Ex.: Split 12.000 BTUs"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Valor
                  </label>

                  <input
                    value={value}
                    onChange={(
                      event
                    ) =>
                      setValue(
                        event.target
                          .value
                      )
                    }
                    placeholder="Ex.: 450"
                    inputMode="decimal"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Data
                  </label>

                  <input
                    type="date"
                    value={date}
                    onChange={(
                      event
                    ) =>
                      setDate(
                        event.target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  />
                </div>
              </div>

              <div className="rounded-xl bg-blue-50 p-4">
                <p className="text-xs font-semibold text-blue-600">
                  Fluxo automático
                </p>

                <p className="mt-1 text-sm text-blue-800">
                  Depois que o orçamento
                  for marcado como
                  <strong>
                    {" "}
                    Aprovado
                  </strong>
                  , aparecerá o botão
                  <strong>
                    {" "}
                    Gerar OS
                  </strong>
                  para criar
                  automaticamente a Ordem
                  de Serviço.
                </p>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    clearForm();
                    setShowForm(false);
                  }}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={
                    saving
                  }
                  className="flex-1 rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Salvando..."
                    : "Salvar orçamento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="fixed bottom-4 right-4 hidden items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-lg sm:flex">
        <CheckCircle2 size={15} />
        Sistema conectado
      </div>
    </main>
  );
}
