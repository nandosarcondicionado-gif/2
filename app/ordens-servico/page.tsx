"use client";

import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Edit,
  MapPin,
  Plus,
  Search,
  Trash2,
  User,
  Wrench,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ServiceOrderStatus =
  | "Aberta"
  | "Agendada"
  | "Em andamento"
  | "Concluída"
  | "Cancelada";

type ServiceType =
  | "Preventiva"
  | "Corretiva"
  | "Instalação"
  | "Higienização"
  | "Visita técnica";

type ServiceOrder = {
  id: string;
  number: string;
  clientId: string | null;
  client: string;
  equipment: string;
  city: string;
  serviceType: ServiceType;
  description: string;
  date: string;
  technician: string;
  value: number;
  status: ServiceOrderStatus;
  notes: string;
};

type Client = {
  id: string;
  nome: string;
  cidade: string;
};

const statusStyles: Record<ServiceOrderStatus, string> = {
  Aberta: "bg-blue-50 text-blue-700",
  Agendada: "bg-purple-50 text-purple-700",
  "Em andamento": "bg-amber-50 text-amber-700",
  Concluída: "bg-emerald-50 text-emerald-700",
  Cancelada: "bg-red-50 text-red-700",
};

const serviceTypes: ServiceType[] = [
  "Preventiva",
  "Corretiva",
  "Instalação",
  "Higienização",
  "Visita técnica",
];

const statuses: ServiceOrderStatus[] = [
  "Aberta",
  "Agendada",
  "Em andamento",
  "Concluída",
  "Cancelada",
];

export default function OrdensServicoPage() {
  const supabase = createClient();

  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<"Todos" | ServiceOrderStatus>("Todos");

  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const [editingOrder, setEditingOrder] =
    useState<ServiceOrder | null>(null);

  const [selectedOrder, setSelectedOrder] =
    useState<ServiceOrder | null>(null);

  const [clientId, setClientId] = useState("");
  const [equipment, setEquipment] = useState("");
  const [city, setCity] = useState("");
  const [serviceType, setServiceType] =
    useState<ServiceType>("Preventiva");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [technician, setTechnician] = useState("");
  const [value, setValue] = useState("");
  const [status, setStatus] =
    useState<ServiceOrderStatus>("Aberta");
  const [notes, setNotes] = useState("");

  async function loadData() {
    setLoading(true);

    const [ordersResult, clientsResult] =
      await Promise.all([
        supabase
          .from("ordens_servico")
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

    if (ordersResult.error) {
      console.error(
        "Erro ao carregar ordens:",
        ordersResult.error
      );

      alert(
        `Não foi possível carregar as Ordens de Serviço.\n\n${ordersResult.error.message}`
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

    const formattedOrders: ServiceOrder[] =
      (ordersResult.data ?? []).map((item) => ({
        id: item.id,
        number: item.numero,
        clientId: item.cliente_id,
        client: item.cliente_nome,
        equipment: item.equipamento ?? "",
        city: item.cidade,
        serviceType:
          item.tipo_servico as ServiceType,
        description: item.descricao,
        date: item.data
          ? new Date(
              `${item.data}T00:00:00`
            ).toLocaleDateString("pt-BR")
          : "",
        technician: item.tecnico ?? "",
        value: Number(item.valor ?? 0),
        status:
          item.status as ServiceOrderStatus,
        notes: item.observacoes ?? "",
      }));

    setOrders(formattedOrders);
    setClients(clientsResult.data ?? []);

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredOrders = useMemo(() => {
    const term = search.toLowerCase().trim();

    return orders.filter((order) => {
      const matchesSearch =
        !term ||
        order.number
          .toLowerCase()
          .includes(term) ||
        order.client
          .toLowerCase()
          .includes(term) ||
        order.equipment
          .toLowerCase()
          .includes(term) ||
        order.city
          .toLowerCase()
          .includes(term) ||
        order.technician
          .toLowerCase()
          .includes(term) ||
        order.serviceType
          .toLowerCase()
          .includes(term) ||
        order.description
          .toLowerCase()
          .includes(term);

      const matchesStatus =
        statusFilter === "Todos" ||
        order.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  function clearForm() {
    setClientId("");
    setEquipment("");
    setCity("");
    setServiceType("Preventiva");
    setDescription("");
    setDate("");
    setTechnician("");
    setValue("");
    setStatus("Aberta");
    setNotes("");
    setEditingOrder(null);
  }

  function openNewOrder() {
    clearForm();

    const today = new Date()
      .toISOString()
      .split("T")[0];

    setDate(today);

    setShowForm(true);
  }

  function openEdit(order: ServiceOrder) {
    setEditingOrder(order);

    setClientId(order.clientId ?? "");
    setEquipment(order.equipment);
    setCity(order.city);
    setServiceType(order.serviceType);
    setDescription(order.description);

    if (order.date) {
      const parts = order.date.split("/");

      if (parts.length === 3) {
        setDate(
          `${parts[2]}-${parts[1]}-${parts[0]}`
        );
      }
    } else {
      setDate("");
    }

    setTechnician(order.technician);
    setValue(String(order.value));
    setStatus(order.status);
    setNotes(order.notes);

    setShowForm(true);
  }

  function openDetails(order: ServiceOrder) {
    setSelectedOrder(order);
    setShowDetails(true);
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
    const { data: lastOrder } = await supabase
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
        lastOrder.numero.match(/(\d+)$/);

      if (match) {
        nextNumber =
          Number(match[1]) + 1;
      }
    }

    return `OS-${String(nextNumber).padStart(
      4,
      "0"
    )}`;
  }

  async function saveOrder(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!clientId) {
      alert("Selecione um cliente.");
      return;
    }

    if (!equipment.trim()) {
      alert("Informe o equipamento.");
      return;
    }

    if (!description.trim()) {
      alert("Informe a descrição do serviço.");
      return;
    }

    if (!city.trim()) {
      alert("Informe a cidade.");
      return;
    }

    const selectedClient = clients.find(
      (client) => client.id === clientId
    );

    if (!selectedClient) {
      alert("Cliente não encontrado.");
      return;
    }

    const numericValue =
      Number(
        value.replace(",", ".")
      ) || 0;

    setSaving(true);

    if (editingOrder) {
      const { error } = await supabase
        .from("ordens_servico")
        .update({
          cliente_id: selectedClient.id,
          cliente_nome: selectedClient.nome,
          equipamento: equipment.trim(),
          cidade: city.trim(),
          tipo_servico: serviceType,
          descricao: description.trim(),
          data: date || null,
          tecnico: technician.trim() || null,
          valor: numericValue,
          status,
          observacoes:
            notes.trim() || null,
        })
        .eq("id", editingOrder.id);

      if (error) {
        console.error(
          "Erro ao atualizar OS:",
          error
        );

        alert(
          `Não foi possível atualizar a OS.\n\n${error.message}`
        );

        setSaving(false);
        return;
      }
    } else {
      const number =
        await generateNumber();

      const { error } = await supabase
        .from("ordens_servico")
        .insert({
          numero: number,
          cliente_id: selectedClient.id,
          cliente_nome: selectedClient.nome,
          equipamento: equipment.trim(),
          cidade: city.trim(),
          tipo_servico: serviceType,
          descricao: description.trim(),
          data: date || null,
          tecnico: technician.trim() || null,
          valor: numericValue,
          status,
          observacoes:
            notes.trim() || null,
        });

      if (error) {
        console.error(
          "Erro ao criar OS:",
          error
        );

        alert(
          `Não foi possível criar a OS.\n\n${error.message}`
        );

        setSaving(false);
        return;
      }
    }

    setSaving(false);

    clearForm();
    setShowForm(false);

    await loadData();
  }

  async function deleteOrder(id: string) {
    const order = orders.find(
      (item) => item.id === id
    );

    if (!order) return;

    const confirmed = window.confirm(
      `Deseja realmente excluir a ${order.number}?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("ordens_servico")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(
        "Erro ao excluir OS:",
        error
      );

      alert(
        `Não foi possível excluir a OS.\n\n${error.message}`
      );

      return;
    }

    setOrders((current) =>
      current.filter(
        (item) => item.id !== id
      )
    );

    if (selectedOrder?.id === id) {
      setSelectedOrder(null);
      setShowDetails(false);
    }
  }

  async function changeStatus(
    order: ServiceOrder,
    newStatus: ServiceOrderStatus
  ) {
    const { error } = await supabase
      .from("ordens_servico")
      .update({
        status: newStatus,
      })
      .eq("id", order.id);

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

    const updatedOrder = {
      ...order,
      status: newStatus,
    };

    setOrders((current) =>
      current.map((item) =>
        item.id === order.id
          ? updatedOrder
          : item
      )
    );

    if (selectedOrder?.id === order.id) {
      setSelectedOrder(updatedOrder);
    }
  }

  const totalValue = orders.reduce(
    (total, order) =>
      total + order.value,
    0
  );

  const openOrders = orders.filter(
    (order) =>
      order.status === "Aberta" ||
      order.status === "Agendada"
  ).length;

  const completedOrders =
    orders.filter(
      (order) =>
        order.status === "Concluída"
    ).length;

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-cyan-500 p-3 text-white">
              <ClipboardList size={22} />
            </div>

            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Ordens de Serviço
              </h1>

              <p className="text-sm text-slate-500">
                Controle dos serviços e atendimentos
              </p>
            </div>
          </div>

          <button
            onClick={openNewOrder}
            className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-cyan-600"
          >
            <Plus size={18} />

            <span className="hidden sm:inline">
              Nova ordem de serviço
            </span>

            <span className="sm:hidden">
              Nova OS
            </span>
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <section className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Total de OS
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {orders.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Em aberto
            </p>

            <p className="mt-2 text-2xl font-bold text-purple-600">
              {openOrders}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Concluídas
            </p>

            <p className="mt-2 text-2xl font-bold text-emerald-600">
              {completedOrders}
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
                  style: "currency",
                  currency: "BRL",
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
                  placeholder="Buscar OS, cliente, cidade, técnico..."
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
                      setStatusFilter(item)
                    }
                    className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold ${
                      statusFilter === item
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
              Carregando Ordens de Serviço...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-10 text-center">
              <ClipboardList
                size={38}
                className="mx-auto text-slate-300"
              />

              <p className="mt-3 font-semibold text-slate-700">
                Nenhuma OS encontrada
              </p>

              <p className="mt-1 text-sm text-slate-400">
                Clique em "Nova OS" para cadastrar.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredOrders.map(
                (order) => (
                  <div
                    key={order.id}
                    className="p-5 hover:bg-slate-50"
                  >
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
                          <ClipboardList
                            size={22}
                          />
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-cyan-600">
                              {order.number}
                            </span>

                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[order.status]}`}
                            >
                              {order.status}
                            </span>
                          </div>

                          <h3 className="mt-1 font-semibold text-slate-900">
                            {order.serviceType}
                          </h3>

                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <User size={14} />
                              {order.client}
                            </span>

                            <span className="flex items-center gap-1">
                              <Wrench size={14} />
                              {order.equipment}
                            </span>

                            <span className="flex items-center gap-1">
                              <MapPin size={14} />
                              {order.city}
                            </span>

                            {order.date && (
                              <span className="flex items-center gap-1">
                                <CalendarDays
                                  size={14}
                                />
                                {order.date}
                              </span>
                            )}

                            {order.technician && (
                              <span>
                                Técnico:{" "}
                                {order.technician}
                              </span>
                            )}
                          </div>

                          <p className="mt-2 max-w-2xl text-sm text-slate-600">
                            {order.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="sm:text-right">
                          <p className="text-xs text-slate-400">
                            Valor
                          </p>

                          <p className="text-lg font-bold text-slate-900">
                            {order.value.toLocaleString(
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

                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              openDetails(
                                order
                              )
                            }
                            className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                          >
                            Detalhes
                          </button>

                          <button
                            onClick={() =>
                              openEdit(order)
                            }
                            className="rounded-xl bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-700 hover:bg-cyan-100"
                          >
                            Editar
                          </button>
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
          Valor total das Ordens de Serviço:{" "}
          {totalValue.toLocaleString(
            "pt-BR",
            {
              style: "currency",
              currency: "BRL",
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
                  {editingOrder
                    ? "Editar Ordem de Serviço"
                    : "Nova Ordem de Serviço"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Preencha os dados do atendimento.
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
              onSubmit={saveOrder}
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

                {clients.length === 0 && (
                  <p className="mt-2 text-xs text-amber-600">
                    Cadastre um cliente ativo primeiro.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Equipamento
                </label>

                <input
                  value={equipment}
                  onChange={(event) =>
                    setEquipment(
                      event.target.value
                    )
                  }
                  placeholder="Ex.: Split 12.000 BTUs"
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                />
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
                  Tipo de serviço
                </label>

                <select
                  value={serviceType}
                  onChange={(event) =>
                    setServiceType(
                      event.target
                        .value as ServiceType
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                >
                  {serviceTypes.map(
                    (item) => (
                      <option
                        key={item}
                        value={item}
                      >
                        {item}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Descrição do serviço
                </label>

                <textarea
                  value={description}
                  onChange={(event) =>
                    setDescription(
                      event.target.value
                    )
                  }
                  placeholder="Descreva o serviço que será realizado..."
                  required
                  rows={3}
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Data
                  </label>

                  <input
                    type="date"
                    value={date}
                    onChange={(event) =>
                      setDate(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Técnico
                  </label>

                  <input
                    value={technician}
                    onChange={(event) =>
                      setTechnician(
                        event.target.value
                      )
                    }
                    placeholder="Ex.: Nando"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Valor
                  </label>

                  <input
                    value={value}
                    onChange={(event) =>
                      setValue(
                        event.target.value
                      )
                    }
                    placeholder="Ex.: 250"
                    inputMode="decimal"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Status
                  </label>

                  <select
                    value={status}
                    onChange={(event) =>
                      setStatus(
                        event.target
                          .value as ServiceOrderStatus
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  >
                    {statuses.map(
                      (item) => (
                        <option
                          key={item}
                          value={item}
                        >
                          {item}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Observações
                </label>

                <textarea
                  value={notes}
                  onChange={(event) =>
                    setNotes(
                      event.target.value
                    )
                  }
                  placeholder="Informações adicionais..."
                  rows={3}
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                />
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
                  disabled={saving}
                  className="flex-1 rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Salvando..."
                    : editingOrder
                    ? "Salvar alterações"
                    : "Salvar OS"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetails && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4">
          <div className="max-h-[95vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
                  <ClipboardList size={23} />
                </div>

                <div>
                  <p className="text-xs font-bold text-cyan-600">
                    {selectedOrder.number}
                  </p>

                  <h2 className="font-bold text-slate-900">
                    {selectedOrder.serviceType}
                  </h2>

                  <span
                    className={`mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[selectedOrder.status]}`}
                  >
                    {selectedOrder.status}
                  </span>
                </div>
              </div>

              <button
                onClick={() =>
                  setShowDetails(false)
                }
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-6 space-y-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-400">
                  Cliente
                </p>

                <p className="mt-1 font-semibold text-slate-800">
                  {selectedOrder.client}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-400">
                  Equipamento
                </p>

                <p className="mt-1 font-semibold text-slate-800">
                  {selectedOrder.equipment}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-400">
                    Cidade
                  </p>

                  <p className="mt-1 font-semibold text-slate-800">
                    {selectedOrder.city}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-400">
                    Data
                  </p>

                  <p className="mt-1 font-semibold text-slate-800">
                    {selectedOrder.date ||
                      "Não definida"}
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-blue-50 p-4">
                <p className="text-xs text-blue-500">
                  Descrição
                </p>

                <p className="mt-1 text-sm font-medium text-blue-800">
                  {selectedOrder.description}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-400">
                    Técnico
                  </p>

                  <p className="mt-1 font-semibold text-slate-800">
                    {selectedOrder.technician ||
                      "Não definido"}
                  </p>
                </div>

                <div className="rounded-xl bg-emerald-50 p-4">
                  <p className="text-xs text-emerald-500">
                    Valor
                  </p>

                  <p className="mt-1 font-semibold text-emerald-700">
                    {selectedOrder.value.toLocaleString(
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
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-400">
                  Observações
                </p>

                <p className="mt-1 text-sm text-slate-700">
                  {selectedOrder.notes ||
                    "Nenhuma observação."}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => {
                  setShowDetails(false);
                  openEdit(
                    selectedOrder
                  );
                }}
                className="flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-600"
              >
                <Edit size={16} />
                Editar
              </button>

              <button
                onClick={() =>
                  deleteOrder(
                    selectedOrder.id
                  )
                }
                className="flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                <Trash2 size={16} />
                Excluir
              </button>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-slate-500">
                Alterar status
              </p>

              <div className="flex flex-wrap gap-2">
                {statuses.map(
                  (item) => (
                    <button
                      key={item}
                      onClick={() =>
                        changeStatus(
                          selectedOrder,
                          item
                        )
                      }
                      className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                        selectedOrder.status ===
                        item
                          ? statusStyles[
                              item
                            ]
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {item}
                    </button>
                  )
                )}
              </div>
            </div>
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
