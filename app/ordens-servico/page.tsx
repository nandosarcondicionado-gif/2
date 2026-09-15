"use client";

import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Edit,
  MapPin,
  MessageCircle,
  Plus,
  Printer,
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
  clientId: string;
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

const statusOptions: ServiceOrderStatus[] = [
  "Aberta",
  "Agendada",
  "Em andamento",
  "Concluída",
  "Cancelada",
];

const serviceTypes: ServiceType[] = [
  "Preventiva",
  "Corretiva",
  "Instalação",
  "Higienização",
  "Visita técnica",
];

const emptyForm = {
  clientId: "",
  client: "",
  equipment: "",
  city: "",
  serviceType: "Preventiva" as ServiceType,
  description: "",
  date: "",
  technician: "",
  value: "",
  status: "Aberta" as ServiceOrderStatus,
  notes: "",
};

function formatCurrency(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(date: string) {
  if (!date) return "Não definida";

  const parts = date.split("-");

  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  return date;
}

function escapeHtml(value: string) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function printServiceOrder(order: ServiceOrder) {
  const printWindow = window.open("", "_blank", "width=900,height=1000");

  if (!printWindow) {
    alert("Não foi possível abrir a impressão. Verifique o bloqueador de pop-ups.");
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>${escapeHtml(order.number)} - Nando's Ar-Condicionado</title>

        <style>
          @page {
            size: A4;
            margin: 15mm;
          }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            font-family: Arial, Helvetica, sans-serif;
            color: #111827;
            background: #ffffff;
          }

          .page {
            width: 100%;
            max-width: 794px;
            margin: 0 auto;
          }

          .header {
            border-bottom: 3px solid #111827;
            padding-bottom: 18px;
            margin-bottom: 20px;
          }

          .brand {
            font-size: 25px;
            font-weight: 800;
            margin-bottom: 4px;
          }

          .slogan {
            font-size: 12px;
            color: #4b5563;
          }

          .title-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 20px;
            margin-bottom: 20px;
          }

          .title {
            font-size: 22px;
            font-weight: 800;
          }

          .number {
            font-size: 14px;
            font-weight: 700;
            text-align: right;
          }

          .status {
            display: inline-block;
            margin-top: 5px;
            padding: 6px 10px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 11px;
          }

          .section {
            margin-top: 18px;
          }

          .section-title {
            background: #f3f4f6;
            border: 1px solid #d1d5db;
            padding: 8px 10px;
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
          }

          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            border-left: 1px solid #d1d5db;
            border-top: 1px solid #d1d5db;
          }

          .field {
            min-height: 52px;
            padding: 9px 10px;
            border-right: 1px solid #d1d5db;
            border-bottom: 1px solid #d1d5db;
          }

          .label {
            font-size: 10px;
            color: #6b7280;
            text-transform: uppercase;
            margin-bottom: 5px;
          }

          .value {
            font-size: 12px;
            font-weight: 600;
          }

          .full {
            grid-column: 1 / -1;
          }

          .description {
            min-height: 90px;
            padding: 12px;
            border: 1px solid #d1d5db;
            white-space: pre-wrap;
            font-size: 12px;
          }

          .money {
            font-size: 17px;
            font-weight: 800;
          }

          .signature-area {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 50px;
            margin-top: 80px;
          }

          .signature {
            text-align: center;
            border-top: 1px solid #111827;
            padding-top: 8px;
            font-size: 11px;
          }

          .footer {
            margin-top: 35px;
            padding-top: 12px;
            border-top: 1px solid #d1d5db;
            text-align: center;
            color: #6b7280;
            font-size: 10px;
          }

          @media print {
            body {
              background: #ffffff;
            }

            .page {
              max-width: none;
            }
          }
        </style>
      </head>

      <body>
        <div class="page">

          <div class="header">
            <div class="brand">Nando's Ar-Condicionado</div>
            <div class="slogan">
              Qualidade e confiança em todos os detalhes.
            </div>
          </div>

          <div class="title-row">
            <div>
              <div class="title">ORDEM DE SERVIÇO</div>
            </div>

            <div class="number">
              Nº ${escapeHtml(order.number)}
              <br />
              <span class="status">${escapeHtml(order.status)}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Dados do cliente</div>

            <div class="grid">
              <div class="field">
                <div class="label">Cliente</div>
                <div class="value">
                  ${escapeHtml(order.client)}
                </div>
              </div>

              <div class="field">
                <div class="label">Cidade</div>
                <div class="value">
                  ${escapeHtml(order.city)}
                </div>
              </div>

              <div class="field">
                <div class="label">Equipamento</div>
                <div class="value">
                  ${escapeHtml(order.equipment || "Não informado")}
                </div>
              </div>

              <div class="field">
                <div class="label">Tipo de serviço</div>
                <div class="value">
                  ${escapeHtml(order.serviceType)}
                </div>
              </div>

              <div class="field">
                <div class="label">Data</div>
                <div class="value">
                  ${escapeHtml(formatDate(order.date))}
                </div>
              </div>

              <div class="field">
                <div class="label">Técnico</div>
                <div class="value">
                  ${escapeHtml(order.technician || "Não definido")}
                </div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Descrição do serviço</div>

            <div class="description">
              ${escapeHtml(order.description || "Não informado")}
            </div>
          </div>

          <div class="section">
            <div class="section-title">Observações</div>

            <div class="description">
              ${escapeHtml(order.notes || "Nenhuma observação registrada.")}
            </div>
          </div>

          <div class="section">
            <div class="section-title">Valor</div>

            <div class="grid">
              <div class="field full">
                <div class="label">Valor do serviço</div>
                <div class="money">
                  ${escapeHtml(formatCurrency(order.value))}
                </div>
              </div>
            </div>
          </div>

          <div class="signature-area">
            <div class="signature">
              Assinatura do cliente
            </div>

            <div class="signature">
              Nando's Ar-Condicionado
            </div>
          </div>

          <div class="footer">
            Nando's Ar-Condicionado — Jaú, Bauru e Região
            <br />
            Qualidade e confiança em todos os detalhes.
          </div>

        </div>

        <script>
          window.onload = function () {
            window.print();

            setTimeout(function () {
              window.close();
            }, 500);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

function sendServiceOrderWhatsApp(order: ServiceOrder) {
  const formattedValue = formatCurrency(order.value);

  const message = `Olá! 👋

Segue a Ordem de Serviço da Nando's Ar-Condicionado.

🛠️ *ORDEM DE SERVIÇO*
📋 Nº: ${order.number}

👤 Cliente: ${order.client}
📍 Cidade: ${order.city}
❄️ Equipamento: ${order.equipment || "Não informado"}
🔧 Serviço: ${order.serviceType}
📅 Data: ${formatDate(order.date)}
👨‍🔧 Técnico: ${order.technician || "Não definido"}

📝 Descrição:
${order.description || "Não informada"}

💰 Valor: ${formattedValue}

📌 Status: ${order.status}

${
  order.notes
    ? `📄 Observações:
${order.notes}

`
    : ""
}Nando's Ar-Condicionado
Qualidade e confiança em todos os detalhes.
Jaú, Bauru e Região`;

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

  window.open(whatsappUrl, "_blank");
}

export default function OrdensServicoPage() {
  const supabase = createClient();

  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState<
    "Todos" | ServiceOrderStatus
  >("Todos");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [selectedOrder, setSelectedOrder] =
    useState<ServiceOrder | null>(null);

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("novo") === "1") {
      setEditingId(null);
      setForm({
        ...emptyForm,
        date: new Date().toISOString().split("T")[0],
      });
      setShowForm(true);

      window.history.replaceState(
        {},
        "",
        window.location.pathname
      );
    }
  }, []);

  async function loadData() {
    setLoading(true);

    const [ordersResult, clientsResult] = await Promise.all([
      supabase
        .from("ordens_servico")
        .select("*")
        .order("created_at", { ascending: false }),

      supabase
        .from("clientes")
        .select("id,nome,cidade")
        .eq("status", "Ativo")
        .order("nome", { ascending: true }),
    ]);

    if (ordersResult.error) {
      console.error(
        "Erro ao carregar ordens de serviço:",
        ordersResult.error
      );
      alert("Não foi possível carregar as ordens de serviço.");
    }

    if (clientsResult.error) {
      console.error(
        "Erro ao carregar clientes:",
        clientsResult.error
      );
    }

    const formattedOrders: ServiceOrder[] = (
      ordersResult.data ?? []
    ).map((item: any) => ({
      id: item.id,
      number: item.numero ?? "",
      clientId: item.cliente_id ?? "",
      client: item.cliente_nome ?? "",
      equipment: item.equipamento ?? "",
      city: item.cidade ?? "",
      serviceType:
        item.tipo_servico ?? "Preventiva",
      description: item.descricao ?? "",
      date: item.data ?? "",
      technician: item.tecnico ?? "",
      value: Number(item.valor ?? 0),
      status:
        item.status ?? "Aberta",
      notes: item.observacoes ?? "",
    }));

    const formattedClients: Client[] = (
      clientsResult.data ?? []
    ).map((item: any) => ({
      id: item.id,
      nome: item.nome ?? "",
      cidade: item.cidade ?? "",
    }));

    setOrders(formattedOrders);
    setClients(formattedClients);
    setLoading(false);
  }

  const filteredOrders = useMemo(() => {
    const term = search.toLowerCase().trim();

    return orders.filter((order) => {
      const matchesSearch =
        !term ||
        order.number.toLowerCase().includes(term) ||
        order.client.toLowerCase().includes(term) ||
        order.city.toLowerCase().includes(term) ||
        order.equipment.toLowerCase().includes(term) ||
        order.serviceType.toLowerCase().includes(term) ||
        order.technician.toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "Todos" ||
        order.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: orders.length,
      abertas: orders.filter(
        (item) => item.status === "Aberta"
      ).length,
      andamento: orders.filter(
        (item) => item.status === "Em andamento"
      ).length,
      concluidas: orders.filter(
        (item) => item.status === "Concluída"
      ).length,
    };
  }, [orders]);

  function resetForm() {
    setForm({
      ...emptyForm,
      date: new Date().toISOString().split("T")[0],
    });

    setEditingId(null);
  }

  function closeForm() {
    setShowForm(false);
    resetForm();
  }

  function openNewOrder() {
    resetForm();
    setShowForm(true);
  }

  function openEditOrder(order: ServiceOrder) {
    setEditingId(order.id);

    setForm({
      clientId: order.clientId,
      client: order.client,
      equipment: order.equipment,
      city: order.city,
      serviceType: order.serviceType,
      description: order.description,
      date: order.date,
      technician: order.technician,
      value: String(order.value),
      status: order.status,
      notes: order.notes,
    });

    setShowForm(true);
  }

  function handleClientChange(clientId: string) {
    const client = clients.find(
      (item) => item.id === clientId
    );

    setForm((current) => ({
      ...current,
      clientId,
      client: client?.nome ?? "",
      city: client?.cidade ?? "",
    }));
  }

  async function generateNumber() {
    const { data, error } = await supabase
      .from("ordens_servico")
      .select("numero")
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error(
        "Erro ao gerar número da OS:",
        error
      );
      return `OS-${String(orders.length + 1).padStart(
        4,
        "0"
      )}`;
    }

    const lastNumber =
      data?.[0]?.numero ?? "";

    const match =
      String(lastNumber).match(/(\d+)$/);

    const nextNumber = match
      ? Number(match[1]) + 1
      : 1;

    return `OS-${String(nextNumber).padStart(4, "0")}`;
  }

  async function saveOrder() {
    if (!form.clientId) {
      alert("Selecione um cliente.");
      return;
    }

    if (!form.description.trim()) {
      alert("Informe a descrição do serviço.");
      return;
    }

    const numericValue =
      Number(
        String(form.value)
          .replace(/\./g, "")
          .replace(",", ".")
      ) || 0;

    const client = clients.find(
      (item) => item.id === form.clientId
    );

    if (editingId) {
      const { error } = await supabase
        .from("ordens_servico")
        .update({
          cliente_id: form.clientId,
          cliente_nome:
            client?.nome ?? form.client,
          equipamento: form.equipment,
          cidade:
            client?.cidade ?? form.city,
          tipo_servico: form.serviceType,
          descricao: form.description,
          data: form.date || null,
          tecnico:
            form.technician || null,
          valor: numericValue,
          status: form.status,
          observacoes:
            form.notes || null,
        })
        .eq("id", editingId);

      if (error) {
        console.error(
          "Erro ao atualizar OS:",
          error
        );
        alert(
          `Não foi possível atualizar a ordem de serviço.\n\n${error.message}`
        );
        return;
      }
    } else {
      const number = await generateNumber();

      const { error } = await supabase
        .from("ordens_servico")
        .insert({
          numero: number,
          cliente_id: form.clientId,
          cliente_nome:
            client?.nome ?? form.client,
          equipamento: form.equipment,
          cidade:
            client?.cidade ?? form.city,
          tipo_servico: form.serviceType,
          descricao: form.description,
          data: form.date || null,
          tecnico:
            form.technician || null,
          valor: numericValue,
          status: form.status,
          observacoes:
            form.notes || null,
        });

      if (error) {
        console.error(
          "Erro ao criar OS:",
          error
        );
        alert(
          `Não foi possível criar a ordem de serviço.\n\n${error.message}`
        );
        return;
      }
    }

    closeForm();
    await loadData();
  }

  async function deleteOrder(id: string) {
    const confirmed = window.confirm(
      "Tem certeza que deseja excluir esta ordem de serviço?"
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
        `Não foi possível excluir a ordem de serviço.\n\n${error.message}`
      );
      return;
    }

    setSelectedOrder(null);
    await loadData();
  }

  async function changeStatus(
    order: ServiceOrder,
    status: ServiceOrderStatus
  ) {
    const { error } = await supabase
      .from("ordens_servico")
      .update({
        status,
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

    setSelectedOrder({
      ...order,
      status,
    });

    setOrders((current) =>
      current.map((item) =>
        item.id === order.id
          ? {
              ...item,
              status,
            }
          : item
      )
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white sm:p-6">
      <div className="mx-auto max-w-7xl">

        {/* CABEÇALHO */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-cyan-500/10 p-3">
                <ClipboardList className="h-7 w-7 text-cyan-400" />
              </div>

              <div>
                <h1 className="text-2xl font-bold">
                  Ordens de serviço
                </h1>

                <p className="text-sm text-slate-400">
                  Controle completo dos serviços realizados
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={openNewOrder}
            className="flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            <Plus className="h-5 w-5" />
            Nova ordem de serviço
          </button>
        </div>

        {/* ESTATÍSTICAS */}
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">
                Total
              </p>

              <ClipboardList className="h-5 w-5 text-cyan-400" />
            </div>

            <p className="mt-2 text-2xl font-bold">
              {stats.total}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">
                Abertas
              </p>

              <Wrench className="h-5 w-5 text-yellow-400" />
            </div>

            <p className="mt-2 text-2xl font-bold">
              {stats.abertas}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">
                Em andamento
              </p>

              <CalendarDays className="h-5 w-5 text-blue-400" />
            </div>

            <p className="mt-2 text-2xl font-bold">
              {stats.andamento}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">
                Concluídas
              </p>

              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>

            <p className="mt-2 text-2xl font-bold">
              {stats.concluidas}
            </p>
          </div>

        </div>

        {/* BUSCA E FILTROS */}
        <div className="mb-5 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <div className="flex flex-col gap-3 lg:flex-row">

            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Buscar por OS, cliente, cidade, equipamento ou técnico..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-cyan-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as
                    | "Todos"
                    | ServiceOrderStatus
                )
              }
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-cyan-500"
            >
              <option value="Todos">
                Todos os status
              </option>

              {statusOptions.map((status) => (
                <option
                  key={status}
                  value={status}
                >
                  {status}
                </option>
              ))}
            </select>

          </div>
        </div>

        {/* LISTA */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900">

          <div className="border-b border-slate-800 px-5 py-4">
            <h2 className="font-semibold">
              Ordens de serviço
            </h2>

            <p className="text-xs text-slate-500">
              {filteredOrders.length} registro(s)
            </p>
          </div>

          {loading ? (
            <div className="p-10 text-center text-slate-400">
              Carregando ordens de serviço...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-10 text-center">
              <ClipboardList className="mx-auto h-12 w-12 text-slate-700" />

              <p className="mt-4 font-semibold">
                Nenhuma ordem de serviço encontrada
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Cadastre uma nova ordem de serviço para começar.
              </p>

              <button
                onClick={openNewOrder}
                className="mt-5 rounded-xl bg-cyan-500 px-5 py-2.5 font-semibold text-slate-950 hover:bg-cyan-400"
              >
                Nova ordem de serviço
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">

              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="p-5 transition hover:bg-slate-800/30"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

                    <div className="min-w-0 flex-1">

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-cyan-400">
                          {order.number}
                        </span>

                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            order.status === "Concluída"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : order.status === "Cancelada"
                              ? "bg-red-500/10 text-red-400"
                              : order.status === "Em andamento"
                              ? "bg-blue-500/10 text-blue-400"
                              : order.status === "Agendada"
                              ? "bg-purple-500/10 text-purple-400"
                              : "bg-yellow-500/10 text-yellow-400"
                          }`}
                        >
                          {order.status}
                        </span>

                        <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[11px] text-slate-300">
                          {order.serviceType}
                        </span>
                      </div>

                      <h3 className="mt-2 text-lg font-semibold">
                        {order.client}
                      </h3>

                      <div className="mt-2 flex flex-col gap-1 text-sm text-slate-400 sm:flex-row sm:flex-wrap sm:gap-x-5">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-4 w-4" />
                          {order.city || "Cidade não informada"}
                        </span>

                        <span className="flex items-center gap-1.5">
                          <Wrench className="h-4 w-4" />
                          {order.equipment || "Equipamento não informado"}
                        </span>

                        <span className="flex items-center gap-1.5">
                          <CalendarDays className="h-4 w-4" />
                          {formatDate(order.date)}
                        </span>

                        {order.technician && (
                          <span className="flex items-center gap-1.5">
                            <User className="h-4 w-4" />
                            {order.technician}
                          </span>
                        )}
                      </div>

                      <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                        {order.description}
                      </p>

                    </div>

                    <div className="flex flex-wrap gap-2">

                      <button
                        onClick={() =>
                          setSelectedOrder(order)
                        }
                        className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
                      >
                        Detalhes
                      </button>

                      <button
                        onClick={() =>
                          printServiceOrder(order)
                        }
                        className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
                      >
                        <Printer className="h-4 w-4" />
                        PDF / Imprimir
                      </button>

                      <button
                        onClick={() =>
                          sendServiceOrderWhatsApp(order)
                        }
                        className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 px-3 py-2 text-sm text-emerald-400 transition hover:bg-emerald-500/10"
                      >
                        <MessageCircle className="h-4 w-4" />
                        WhatsApp
                      </button>

                      <button
                        onClick={() =>
                          openEditOrder(order)
                        }
                        className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
                      >
                        <Edit className="h-4 w-4" />
                        Editar
                      </button>

                    </div>

                  </div>
                </div>
              ))}

            </div>
          )}

        </div>

      </div>

      {/* MODAL NOVA / EDITAR OS */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">

          <div className="max-h-[95vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">

            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-900 px-5 py-4">

              <div>
                <h2 className="text-lg font-bold">
                  {editingId
                    ? "Editar ordem de serviço"
                    : "Nova ordem de serviço"}
                </h2>

                <p className="text-xs text-slate-500">
                  Preencha os dados do serviço
                </p>
              </div>

              <button
                onClick={closeForm}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>

            </div>

            <div className="space-y-5 p-5">

              {/* CLIENTE */}
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Cliente
                </label>

                <select
                  value={form.clientId}
                  onChange={(event) =>
                    handleClientChange(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                >
                  <option value="">
                    Selecione um cliente
                  </option>

                  {clients.map((client) => (
                    <option
                      key={client.id}
                      value={client.id}
                    >
                      {client.nome}
                      {client.cidade
                        ? ` — ${client.cidade}`
                        : ""}
                    </option>
                  ))}
                </select>

                {clients.length === 0 && (
                  <p className="mt-2 text-xs text-yellow-400">
                    Nenhum cliente ativo encontrado.
                  </p>
                )}
              </div>

              <div className="grid gap-5 md:grid-cols-2">

                {/* CIDADE */}
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Cidade
                  </label>

                  <input
                    value={form.city}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        city: event.target.value,
                      })
                    }
                    placeholder="Cidade"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                  />
                </div>

                {/* EQUIPAMENTO */}
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Equipamento
                  </label>

                  <input
                    value={form.equipment}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        equipment:
                          event.target.value,
                      })
                    }
                    placeholder="Ex.: Split 12.000 BTUs"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                  />
                </div>

                {/* TIPO */}
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Tipo de serviço
                  </label>

                  <select
                    value={form.serviceType}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        serviceType:
                          event.target.value as ServiceType,
                      })
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                  >
                    {serviceTypes.map(
                      (serviceType) => (
                        <option
                          key={serviceType}
                          value={serviceType}
                        >
                          {serviceType}
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* DATA */}
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Data
                  </label>

                  <input
                    type="date"
                    value={form.date}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        date: event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                  />
                </div>

                {/* TÉCNICO */}
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Técnico
                  </label>

                  <input
                    value={form.technician}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        technician:
                          event.target.value,
                      })
                    }
                    placeholder="Nome do técnico"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                  />
                </div>

                {/* VALOR */}
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Valor
                  </label>

                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.value}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        value: event.target.value,
                      })
                    }
                    placeholder="0,00"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                  />
                </div>

                {/* STATUS */}
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Status
                  </label>

                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        status:
                          event.target.value as ServiceOrderStatus,
                      })
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                  >
                    {statusOptions.map(
                      (status) => (
                        <option
                          key={status}
                          value={status}
                        >
                          {status}
                        </option>
                      )
                    )}
                  </select>
                </div>

              </div>

              {/* DESCRIÇÃO */}
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Descrição do serviço
                </label>

                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      description:
                        event.target.value,
                    })
                  }
                  rows={4}
                  placeholder="Descreva o serviço que será realizado..."
                  className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                />
              </div>

              {/* OBSERVAÇÕES */}
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Observações
                </label>

                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      notes: event.target.value,
                    })
                  }
                  rows={3}
                  placeholder="Observações adicionais..."
                  className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                />
              </div>

              {/* BOTÕES */}
              <div className="flex flex-col-reverse gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:justify-end">

                <button
                  onClick={closeForm}
                  className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Cancelar
                </button>

                <button
                  onClick={saveOrder}
                  className="rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-400"
                >
                  {editingId
                    ? "Salvar alterações"
                    : "Criar ordem de serviço"}
                </button>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* MODAL DETALHES */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">

          <div className="max-h-[95vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">

            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">

              <div>
                <div className="flex flex-wrap items-center gap-2">

                  <h2 className="text-lg font-bold">
                    {selectedOrder.number}
                  </h2>

                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      selectedOrder.status === "Concluída"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : selectedOrder.status === "Cancelada"
                        ? "bg-red-500/10 text-red-400"
                        : selectedOrder.status === "Em andamento"
                        ? "bg-blue-500/10 text-blue-400"
                        : selectedOrder.status === "Agendada"
                        ? "bg-purple-500/10 text-purple-400"
                        : "bg-yellow-500/10 text-yellow-400"
                    }`}
                  >
                    {selectedOrder.status}
                  </span>

                </div>

                <p className="mt-1 text-xs text-slate-500">
                  Detalhes da ordem de serviço
                </p>
              </div>

              <button
                onClick={() =>
                  setSelectedOrder(null)
                }
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>

            </div>

            <div className="space-y-5 p-5">

              {/* DADOS PRINCIPAIS */}
              <div className="grid gap-4 sm:grid-cols-2">

                <div className="rounded-xl bg-slate-950 p-4">
                  <p className="text-xs text-slate-500">
                    Cliente
                  </p>

                  <p className="mt-1 font-semibold">
                    {selectedOrder.client}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-950 p-4">
                  <p className="text-xs text-slate-500">
                    Cidade
                  </p>

                  <p className="mt-1 font-semibold">
                    {selectedOrder.city ||
                      "Não informada"}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-950 p-4">
                  <p className="text-xs text-slate-500">
                    Equipamento
                  </p>

                  <p className="mt-1 font-semibold">
                    {selectedOrder.equipment ||
                      "Não informado"}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-950 p-4">
                  <p className="text-xs text-slate-500">
                    Tipo de serviço
                  </p>

                  <p className="mt-1 font-semibold">
                    {selectedOrder.serviceType}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-950 p-4">
                  <p className="text-xs text-slate-500">
                    Data
                  </p>

                  <p className="mt-1 font-semibold">
                    {formatDate(
                      selectedOrder.date
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-950 p-4">
                  <p className="text-xs text-slate-500">
                    Técnico
                  </p>

                  <p className="mt-1 font-semibold">
                    {selectedOrder.technician ||
                      "Não definido"}
                  </p>
                </div>

              </div>

              {/* DESCRIÇÃO */}
              <div className="rounded-xl bg-slate-950 p-4">
                <p className="mb-2 text-xs text-slate-500">
                  Descrição do serviço
                </p>

                <p className="whitespace-pre-wrap text-sm text-slate-300">
                  {selectedOrder.description ||
                    "Não informada"}
                </p>
              </div>

              {/* OBSERVAÇÕES */}
              <div className="rounded-xl bg-slate-950 p-4">
                <p className="mb-2 text-xs text-slate-500">
                  Observações
                </p>

                <p className="whitespace-pre-wrap text-sm text-slate-300">
                  {selectedOrder.notes ||
                    "Nenhuma observação registrada."}
                </p>
              </div>

              {/* VALOR */}
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                <p className="text-xs text-slate-500">
                  Valor
                </p>

                <p className="mt-1 text-2xl font-bold text-cyan-400">
                  {formatCurrency(
                    selectedOrder.value
                  )}
                </p>
              </div>

              {/* ALTERAR STATUS */}
              <div className="rounded-xl border border-slate-800 p-4">

                <p className="mb-3 text-sm font-semibold">
                  Alterar status
                </p>

                <div className="flex flex-wrap gap-2">

                  {statusOptions.map(
                    (status) => (
                      <button
                        key={status}
                        onClick={() =>
                          changeStatus(
                            selectedOrder,
                            status
                          )
                        }
                        className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                          selectedOrder.status ===
                          status
                            ? "bg-cyan-500 text-slate-950"
                            : "border border-slate-700 text-slate-300 hover:bg-slate-800"
                        }`}
                      >
                        {status}
                      </button>
                    )
                  )}

                </div>

              </div>

              {/* AÇÕES */}
              <div className="flex flex-wrap justify-end gap-2 border-t border-slate-800 pt-5">

                <button
                  onClick={() =>
                    printServiceOrder(
                      selectedOrder
                    )
                  }
                  className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800"
                >
                  <Printer className="h-4 w-4" />
                  PDF / Imprimir
                </button>

                <button
                  onClick={() =>
                    sendServiceOrderWhatsApp(
                      selectedOrder
                    )
                  }
                  className="flex items-center gap-2 rounded-xl border border-emerald-500/30 px-4 py-2.5 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/10"
                >
                  <MessageCircle className="h-4 w-4" />
                  Enviar pelo WhatsApp
                </button>

                <button
                  onClick={() => {
                    openEditOrder(
                      selectedOrder
                    );
                    setSelectedOrder(null);
                  }}
                  className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800"
                >
                  <Edit className="h-4 w-4" />
                  Editar
                </button>

                <button
                  onClick={() =>
                    deleteOrder(
                      selectedOrder.id
                    )
                  }
                  className="flex items-center gap-2 rounded-xl border border-red-500/30 px-4 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </button>

                <button
                  onClick={() =>
                    setSelectedOrder(null)
                  }
                  className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
                >
                  Fechar
                </button>

              </div>

            </div>

          </div>
        </div>
      )}

    </main>
  );
}
