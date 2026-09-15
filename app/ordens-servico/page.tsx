"use client";

import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Edit,
  MapPin,
  Plus,
  Printer,
  Search,
  Trash2,
  User,
  Wrench,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
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

const statuses: ServiceOrderStatus[] = [
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

const statusStyles: Record<
  ServiceOrderStatus,
  string
> = {
  Aberta:
    "bg-blue-50 text-blue-700",
  Agendada:
    "bg-amber-50 text-amber-700",
  "Em andamento":
    "bg-cyan-50 text-cyan-700",
  Concluída:
    "bg-emerald-50 text-emerald-700",
  Cancelada:
    "bg-red-50 text-red-700",
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default function OrdensServicoPage() {
  const supabase = createClient();

  const [orders, setOrders] =
    useState<ServiceOrder[]>([]);

  const [clients, setClients] =
    useState<Client[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState<
      "Todos" | ServiceOrderStatus
    >("Todos");

  const [showForm, setShowForm] =
    useState(false);

  const [showDetails, setShowDetails] =
    useState(false);

  const [selectedOrder, setSelectedOrder] =
    useState<ServiceOrder | null>(
      null
    );

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [clientId, setClientId] =
    useState("");

  const [client, setClient] =
    useState("");

  const [equipment, setEquipment] =
    useState("");

  const [city, setCity] =
    useState("");

  const [serviceType, setServiceType] =
    useState<ServiceType>(
      "Preventiva"
    );

  const [description, setDescription] =
    useState("");

  const [date, setDate] =
    useState("");

  const [technician, setTechnician] =
    useState("");

  const [value, setValue] =
    useState("");

  const [status, setStatus] =
    useState<ServiceOrderStatus>(
      "Aberta"
    );

  const [notes, setNotes] =
    useState("");

  async function loadData() {
    setLoading(true);

    const [
      ordersResult,
      clientsResult,
    ] = await Promise.all([
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
        "Erro ao carregar ordens de serviço:",
        ordersResult.error
      );

      alert(
        `Não foi possível carregar as ordens de serviço.\n\n${ordersResult.error.message}`
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
      (ordersResult.data ?? []).map(
        (item) => ({
          id: item.id,
          number: item.numero,
          clientId:
            item.cliente_id ?? null,
          client:
            item.cliente_nome ?? "",
          equipment:
            item.equipamento ?? "",
          city:
            item.cidade ?? "",
          serviceType:
            item.tipo_servico as ServiceType,
          description:
            item.descricao ?? "",
          date: item.data
            ? new Date(
                `${item.data}T00:00:00`
              ).toLocaleDateString(
                "pt-BR"
              )
            : "",
          technician:
            item.tecnico ?? "",
          value: Number(
            item.valor ?? 0
          ),
          status:
            item.status as ServiceOrderStatus,
          notes:
            item.observacoes ?? "",
        })
      );

    setOrders(formattedOrders);
    setClients(
      clientsResult.data ?? []
    );

    setLoading(false);
  }

  function clearForm() {
    setEditingId(null);
    setClientId("");
    setClient("");
    setEquipment("");
    setCity("");
    setServiceType("Preventiva");
    setDescription("");
    setDate("");
    setTechnician("");
    setValue("");
    setStatus("Aberta");
    setNotes("");
  }

  useEffect(() => {
    loadData();

    const params =
      new URLSearchParams(
        window.location.search
      );

    if (
      params.get("novo") === "1"
    ) {
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

  const filteredOrders = useMemo(() => {
    const term =
      search.toLowerCase().trim();

    return orders.filter((order) => {
      const matchesSearch =
        !term ||
        order.number
          .toLowerCase()
          .includes(term) ||
        order.client
          .toLowerCase()
          .includes(term) ||
        order.city
          .toLowerCase()
          .includes(term) ||
        order.equipment
          .toLowerCase()
          .includes(term) ||
        order.description
          .toLowerCase()
          .includes(term) ||
        order.technician
          .toLowerCase()
          .includes(term);

      const matchesStatus =
        statusFilter === "Todos" ||
        order.status ===
          statusFilter;

      return (
        matchesSearch &&
        matchesStatus
      );
    });
  }, [
    orders,
    search,
    statusFilter,
  ]);

  function handleClientChange(
    id: string
  ) {
    setClientId(id);

    const selected =
      clients.find(
        (item) =>
          item.id === id
      );

    if (selected) {
      setClient(
        selected.nome
      );

      setCity(
        selected.cidade
      );
    } else {
      setClient("");
      setCity("");
    }
  }

  async function generateNumber() {
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

  function openNewOrder() {
    clearForm();

    setDate(
      new Date()
        .toISOString()
        .split("T")[0]
    );

    setShowForm(true);
  }

  function openEditOrder(
    order: ServiceOrder
  ) {
    setEditingId(order.id);
    setClientId(
      order.clientId ?? ""
    );
    setClient(order.client);
    setEquipment(
      order.equipment
    );
    setCity(order.city);
    setServiceType(
      order.serviceType
    );
    setDescription(
      order.description
    );
    setDate(
      order.date
        ? order.date
            .split("/")
            .reverse()
            .join("-")
        : ""
    );
    setTechnician(
      order.technician
    );
    setValue(
      String(order.value)
    );
    setStatus(order.status);
    setNotes(order.notes);

    setShowDetails(false);
    setShowForm(true);
  }

  function openDetails(
    order: ServiceOrder
  ) {
    setSelectedOrder(order);
    setShowDetails(true);
  }

  async function saveOrder(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!clientId) {
      alert(
        "Selecione um cliente."
      );
      return;
    }

    if (!description.trim()) {
      alert(
        "Informe a descrição do serviço."
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
        (item) =>
          item.id === clientId
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

    if (editingId) {
      const { error } =
        await supabase
          .from("ordens_servico")
          .update({
            cliente_id:
              selectedClient.id,
            cliente_nome:
              selectedClient.nome,
            equipamento:
              equipment.trim() ||
              null,
            cidade:
              city.trim(),
            tipo_servico:
              serviceType,
            descricao:
              description.trim(),
            data:
              date || null,
            tecnico:
              technician.trim() ||
              null,
            valor:
              numericValue,
            status,
            observacoes:
              notes.trim() ||
              null,
          })
          .eq(
            "id",
            editingId
          );

      if (error) {
        console.error(
          "Erro ao atualizar OS:",
          error
        );

        alert(
          `Não foi possível atualizar a Ordem de Serviço.\n\n${error.message}`
        );

        setSaving(false);
        return;
      }
    } else {
      const number =
        await generateNumber();

      const { error } =
        await supabase
          .from("ordens_servico")
          .insert({
            numero: number,
            cliente_id:
              selectedClient.id,
            cliente_nome:
              selectedClient.nome,
            equipamento:
              equipment.trim() ||
              null,
            cidade:
              city.trim(),
            tipo_servico:
              serviceType,
            descricao:
              description.trim(),
            data:
              date || null,
            tecnico:
              technician.trim() ||
              null,
            valor:
              numericValue,
            status,
            observacoes:
              notes.trim() ||
              null,
          });

      if (error) {
        console.error(
          "Erro ao criar OS:",
          error
        );

        alert(
          `Não foi possível criar a Ordem de Serviço.\n\n${error.message}`
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

  async function deleteOrder(
    order: ServiceOrder
  ) {
    const confirmed =
      window.confirm(
        `Deseja realmente excluir a Ordem de Serviço ${order.number}?\n\nEssa ação não poderá ser desfeita.`
      );

    if (!confirmed) {
      return;
    }

    const { error } =
      await supabase
        .from("ordens_servico")
        .delete()
        .eq(
          "id",
          order.id
        );

    if (error) {
      console.error(
        "Erro ao excluir OS:",
        error
      );

      alert(
        `Não foi possível excluir a Ordem de Serviço.\n\n${error.message}`
      );

      return;
    }

    setShowDetails(false);
    setSelectedOrder(null);

    await loadData();
  }

  async function changeStatus(
    order: ServiceOrder,
    newStatus: ServiceOrderStatus
  ) {
    const { error } =
      await supabase
        .from("ordens_servico")
        .update({
          status:
            newStatus,
        })
        .eq(
          "id",
          order.id
        );

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

    setOrders((current) =>
      current.map((item) =>
        item.id === order.id
          ? {
              ...item,
              status:
                newStatus,
            }
          : item
      )
    );

    if (
      selectedOrder?.id ===
      order.id
    ) {
      setSelectedOrder({
        ...selectedOrder,
        status:
          newStatus,
      });
    }
  }

  function printServiceOrder(
    order: ServiceOrder
  ) {
    const printWindow =
      window.open(
        "",
        "_blank",
        "width=900,height=700"
      );

    if (!printWindow) {
      alert(
        "O navegador bloqueou a janela de impressão. Permita pop-ups para este site e tente novamente."
      );
      return;
    }

    const valueFormatted =
      order.value.toLocaleString(
        "pt-BR",
        {
          style: "currency",
          currency: "BRL",
        }
      );

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />

<title>Ordem de Serviço ${escapeHtml(
      order.number
    )}</title>

<style>
  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    padding: 0;
    background: #ffffff;
    color: #111827;
    font-family: Arial, Helvetica, sans-serif;
  }

  .page {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    padding: 18mm;
    background: white;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 3px solid #06b6d4;
    padding-bottom: 15px;
    margin-bottom: 20px;
  }

  .brand {
    font-size: 24px;
    font-weight: 800;
    color: #0f172a;
  }

  .slogan {
    margin-top: 5px;
    font-size: 11px;
    color: #64748b;
  }

  .os-box {
    text-align: right;
  }

  .os-label {
    font-size: 11px;
    color: #64748b;
    text-transform: uppercase;
  }

  .os-number {
    margin-top: 4px;
    font-size: 22px;
    font-weight: 800;
    color: #0891b2;
  }

  .status {
    display: inline-block;
    margin-top: 6px;
    padding: 5px 10px;
    border-radius: 999px;
    background: #ecfeff;
    color: #0e7490;
    font-size: 10px;
    font-weight: 700;
  }

  .section {
    margin-top: 18px;
  }

  .section-title {
    margin-bottom: 9px;
    padding-bottom: 5px;
    border-bottom: 1px solid #e2e8f0;
    font-size: 12px;
    font-weight: 800;
    color: #334155;
    text-transform: uppercase;
  }

  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px 18px;
  }

  .field {
    min-height: 42px;
    padding: 9px 11px;
    border: 1px solid #e2e8f0;
    border-radius: 7px;
  }

  .field.full {
    grid-column: 1 / -1;
  }

  .label {
    margin-bottom: 4px;
    font-size: 9px;
    color: #64748b;
    text-transform: uppercase;
  }

  .value {
    font-size: 12px;
    font-weight: 600;
    color: #0f172a;
  }

  .description {
    min-height: 80px;
    padding: 12px;
    border: 1px solid #e2e8f0;
    border-radius: 7px;
    font-size: 12px;
    line-height: 1.5;
    white-space: pre-wrap;
  }

  .price {
    margin-top: 18px;
    padding: 14px;
    border-radius: 8px;
    background: #f0fdfa;
    border: 1px solid #99f6e4;
    text-align: right;
  }

  .price-label {
    font-size: 10px;
    color: #64748b;
  }

  .price-value {
    margin-top: 3px;
    font-size: 20px;
    font-weight: 800;
    color: #0f766e;
  }

  .signatures {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 40px;
    margin-top: 65px;
  }

  .signature {
    padding-top: 8px;
    border-top: 1px solid #334155;
    text-align: center;
    font-size: 10px;
    color: #475569;
  }

  .footer {
    margin-top: 35px;
    padding-top: 10px;
    border-top: 1px solid #e2e8f0;
    text-align: center;
    font-size: 9px;
    color: #94a3b8;
  }

  @page {
    size: A4;
    margin: 0;
  }

  @media print {
    body {
      background: white;
    }

    .page {
      margin: 0;
      width: 210mm;
      min-height: 297mm;
    }
  }
</style>
</head>

<body>
  <div class="page">

    <div class="header">
      <div>
        <div class="brand">
          Nando's Ar-Condicionado
        </div>

        <div class="slogan">
          Qualidade e confiança em todos os detalhes
        </div>
      </div>

      <div class="os-box">
        <div class="os-label">
          Ordem de Serviço
        </div>

        <div class="os-number">
          ${escapeHtml(
            order.number
          )}
        </div>

        <div class="status">
          ${escapeHtml(
            order.status
          )}
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">
        Dados do atendimento
      </div>

      <div class="grid">

        <div class="field">
          <div class="label">
            Cliente
          </div>

          <div class="value">
            ${escapeHtml(
              order.client ||
                "Não informado"
            )}
          </div>
        </div>

        <div class="field">
          <div class="label">
            Cidade
          </div>

          <div class="value">
            ${escapeHtml(
              order.city ||
                "Não informado"
            )}
          </div>
        </div>

        <div class="field">
          <div class="label">
            Equipamento
          </div>

          <div class="value">
            ${escapeHtml(
              order.equipment ||
                "Não informado"
            )}
          </div>
        </div>

        <div class="field">
          <div class="label">
            Tipo de serviço
          </div>

          <div class="value">
            ${escapeHtml(
              order.serviceType
            )}
          </div>
        </div>

        <div class="field">
          <div class="label">
            Data
          </div>

          <div class="value">
            ${escapeHtml(
              order.date ||
                "Não informada"
            )}
          </div>
        </div>

        <div class="field">
          <div class="label">
            Técnico responsável
          </div>

          <div class="value">
            ${escapeHtml(
              order.technician ||
                "Não definido"
            )}
          </div>
        </div>

      </div>
    </div>

    <div class="section">
      <div class="section-title">
        Descrição do serviço
      </div>

      <div class="description">
        ${escapeHtml(
          order.description ||
            "Nenhuma descrição informada."
        )}
      </div>
    </div>

    <div class="section">
      <div class="section-title">
        Observações
      </div>

      <div class="description">
        ${escapeHtml(
          order.notes ||
            "Nenhuma observação informada."
        )}
      </div>
    </div>

    <div class="price">
      <div class="price-label">
        Valor do serviço
      </div>

      <div class="price-value">
        ${valueFormatted}
      </div>
    </div>

    <div class="signatures">

      <div class="signature">
        Assinatura do cliente
      </div>

      <div class="signature">
        Assinatura do técnico
      </div>

    </div>

    <div class="footer">
      Nando's Ar-Condicionado — Qualidade e confiança em todos os detalhes
    </div>

  </div>
</body>
</html>
`;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  }

  const totalValue =
    orders.reduce(
      (total, order) =>
        total + order.value,
      0
    );

  const openOrders =
    orders.filter(
      (order) =>
        order.status ===
          "Aberta" ||
        order.status ===
          "Agendada" ||
        order.status ===
          "Em andamento"
    ).length;

  const completedOrders =
    orders.filter(
      (order) =>
        order.status ===
        "Concluída"
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
                Controle dos atendimentos
              </p>
            </div>
          </div>

          <button
            onClick={openNewOrder}
            className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-cyan-600"
          >
            <Plus size={18} />

            <span className="hidden sm:inline">
              Nova ordem
            </span>

            <span className="sm:hidden">
              Nova
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

            <p className="mt-2 text-2xl font-bold text-amber-600">
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
                  placeholder="Buscar OS, cliente, cidade..."
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
              Carregando ordens de serviço...
            </div>
          ) : filteredOrders.length ===
            0 ? (
            <div className="p-10 text-center">
              <ClipboardList
                size={40}
                className="mx-auto text-slate-300"
              />

              <p className="mt-3 font-semibold text-slate-700">
                Nenhuma ordem encontrada
              </p>

              <p className="mt-1 text-sm text-slate-400">
                Clique em "Nova ordem" para cadastrar.
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
                          <Wrench size={22} />
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
                            {order.description}
                          </h3>

                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <User size={14} />
                              {order.client}
                            </span>

                            <span className="flex items-center gap-1">
                              <MapPin size={14} />
                              {order.city}
                            </span>

                            <span className="flex items-center gap-1">
                              <Wrench size={14} />
                              {order.serviceType}
                            </span>

                            {order.date && (
                              <span className="flex items-center gap-1">
                                <CalendarDays size={14} />
                                {order.date}
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
                            {order.value.toLocaleString(
                              "pt-BR",
                              {
                                style: "currency",
                                currency: "BRL",
                              }
                            )}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() =>
                              openDetails(
                                order
                              )
                            }
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            Detalhes
                          </button>

                          <button
                            onClick={() =>
                              openEditOrder(
                                order
                              )
                            }
                            className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                          >
                            <Edit size={14} />
                            Editar
                          </button>

                          <button
                            onClick={() =>
                              printServiceOrder(
                                order
                              )
                            }
                            className="flex items-center gap-1.5 rounded-xl bg-cyan-500 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-600"
                          >
                            <Printer size={14} />
                            PDF / Imprimir
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
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4">
          <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-2xl">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingId
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
                    (item) => (
                      <option
                        key={item.id}
                        value={item.id}
                      >
                        {item.nome}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
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
                    required
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  />
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
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
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
                  required
                  rows={4}
                  placeholder="Descreva o serviço que será realizado..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
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
                    placeholder="Nome do técnico"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  />
                </div>

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
                    placeholder="Ex.: 450"
                    inputMode="decimal"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  />
                </div>
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
                  {statuses
                    .filter(
                      (item) =>
                        item !==
                        "Todos"
                    )
                    .map(
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
                  Observações
                </label>

                <textarea
                  value={notes}
                  onChange={(event) =>
                    setNotes(
                      event.target.value
                    )
                  }
                  rows={3}
                  placeholder="Observações adicionais..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
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
                    : editingId
                    ? "Salvar alterações"
                    : "Criar Ordem"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetails &&
        selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
              <div className="flex items-start justify-between border-b border-slate-100 p-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-900">
                      {selectedOrder.number}
                    </h2>

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[selectedOrder.status]}`}
                    >
                      {selectedOrder.status}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-slate-500">
                    Detalhes da Ordem de Serviço
                  </p>
                </div>

                <button
                  onClick={() => {
                    setShowDetails(false);
                    setSelectedOrder(
                      null
                    );
                  }}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-5 p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs text-slate-400">
                      Cliente
                    </p>

                    <p className="mt-1 font-semibold text-slate-900">
                      {selectedOrder.client}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs text-slate-400">
                      Cidade
                    </p>

                    <p className="mt-1 font-semibold text-slate-900">
                      {selectedOrder.city}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs text-slate-400">
                      Equipamento
                    </p>

                    <p className="mt-1 font-semibold text-slate-900">
                      {selectedOrder.equipment ||
                        "Não informado"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs text-slate-400">
                      Tipo de serviço
                    </p>

                    <p className="mt-1 font-semibold text-slate-900">
                      {selectedOrder.serviceType}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs text-slate-400">
                      Data
                    </p>

                    <p className="mt-1 font-semibold text-slate-900">
                      {selectedOrder.date ||
                        "Não informada"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs text-slate-400">
                      Técnico
                    </p>

                    <p className="mt-1 font-semibold text-slate-900">
                      {selectedOrder.technician ||
                        "Não definido"}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-700">
                    Descrição
                  </p>

                  <div className="rounded-xl border border-slate-200 p-4 text-sm leading-6 text-slate-600">
                    {selectedOrder.description ||
                      "Nenhuma descrição informada."}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-700">
                    Observações
                  </p>

                  <div className="rounded-xl border border-slate-200 p-4 text-sm leading-6 text-slate-600">
                    {selectedOrder.notes ||
                      "Nenhuma observação informada."}
                  </div>
                </div>

                <div className="rounded-xl bg-cyan-50 p-4">
                  <p className="text-xs text-cyan-600">
                    Valor do serviço
                  </p>

                  <p className="mt-1 text-2xl font-bold text-cyan-700">
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

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() =>
                      printServiceOrder(
                        selectedOrder
                      )
                    }
                    className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-600"
                  >
                    <Printer size={17} />
                    PDF / Imprimir
                  </button>

                  <button
                    onClick={() =>
                      openEditOrder(
                        selectedOrder
                      )
                    }
                    className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                  >
                    <Edit size={17} />
                    Editar
                  </button>

                  <button
                    onClick={() =>
                      deleteOrder(
                        selectedOrder
                      )
                    }
                    className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-100"
                  >
                    <Trash2 size={17} />
                    Excluir
                  </button>
                </div>

                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-700">
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
                          className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                            selectedOrder.status ===
                            item
                              ? "bg-cyan-500 text-white"
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
          </div>
        )}

      <div className="fixed bottom-4 right-4 hidden items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-lg sm:flex">
        <CheckCircle2 size={15} />
        Sistema conectado
      </div>
    </main>
  );
}
