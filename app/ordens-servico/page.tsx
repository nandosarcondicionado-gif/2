"use client";

import {
  CalendarDays,
  ClipboardList,
  CreditCard,
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

const supabase = createClient();

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

type Client = {
  id: string;
  nome: string;
  cidade: string;
};

type Equipment = {
  id: string;
  cliente_id?: string | null;
  clienteId?: string | null;
  client_id?: string | null;
  clientId?: string | null;
  nome?: string | null;
  descricao?: string | null;
  equipamento?: string | null;
  marca?: string | null;
  modelo?: string | null;
  capacidade?: string | null;
  btus?: string | number | null;
  [key: string]: unknown;
};

type ServiceOrder = {
  id: string;
  number: string;
  clientId: string;
  client: string;
  equipment: string;
  equipmentId: string;
  equipmentBrand: string;
  equipmentModel: string;
  equipmentCapacity: string;
  city: string;
  serviceType: ServiceType;
  description: string;
  date: string;
  technician: string;
  technicianId: string;
  serviceValue: number;
  materialsValue: number;
  materialsDescription: string;
  materialsPaid: boolean;
  materialsPaidAt: string | null;
  value: number;
  status: ServiceOrderStatus;
  notes: string;
};

type FormData = {
  clientId: string;
  client: string;
  equipmentId: string;
  equipment: string;
  equipmentBrand: string;
  equipmentModel: string;
  equipmentCapacity: string;
  city: string;
  serviceType: ServiceType;
  description: string;
  date: string;
  technicianId: string;
  technician: string;
  value: string;
  materialsValue: string;
  materialsDescription: string;
  materialsPaid: boolean;
  status: ServiceOrderStatus;
  notes: string;
};

const emptyForm: FormData = {
  clientId: "",
  client: "",
  equipmentId: "",
  equipment: "",
  equipmentBrand: "",
  equipmentModel: "",
  equipmentCapacity: "",
  city: "",
  serviceType: "Preventiva",
  description: "",
  date: new Date().toISOString().slice(0, 10),
  technicianId: "",
  technician: "",
  value: "",
  materialsValue: "",
  materialsDescription: "",
  materialsPaid: false,
  status: "Aberta",
  notes: "",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
}

function formatDate(value: string) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("pt-BR");
}

function parseMoney(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  const text = String(value ?? "").trim();
  if (!text) return 0;
  const normalized = text
    .replace(/\s/g, "")
    .replace(/R\$/gi, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getEquipmentClientId(equipment: Equipment) {
  return String(
    equipment.cliente_id ??
      equipment.clienteId ??
      equipment.client_id ??
      equipment.clientId ??
      ""
  );
}

function getEquipmentName(equipment: Equipment) {
  const name =
    equipment.nome ??
    equipment.descricao ??
    equipment.equipamento ??
    "";
  if (String(name).trim()) {
    return String(name);
  }
  const brand = String(equipment.marca ?? "").trim();
  const model = String(equipment.modelo ?? "").trim();
  if (brand || model) {
    return [brand, model].filter(Boolean).join(" ");
  }
  return "Equipamento";
}

function statusClass(status: ServiceOrderStatus) {
  if (status === "Concluída") {
    return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  }
  if (status === "Cancelada") {
    return "bg-red-500/10 text-red-400 border-red-500/20";
  }
  if (status === "Em andamento") {
    return "bg-blue-500/10 text-blue-400 border-blue-500/20";
  }
  if (status === "Agendada") {
    return "bg-purple-500/10 text-purple-400 border-purple-500/20";
  }
  return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
}

function printServiceOrder(order: ServiceOrder) {
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>OS ${escapeHtml(order.number)}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 0; padding: 30px; color: #111827; }
  .header { border-bottom: 2px solid #111827; padding-bottom: 15px; margin-bottom: 25px; }
  h1 { margin: 0; font-size: 24px; }
  h2 { font-size: 17px; margin-top: 25px; border-bottom: 1px solid #ddd; padding-bottom: 7px; }
  .muted { color: #6b7280; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .box { border: 1px solid #ddd; padding: 12px; border-radius: 8px; }
  .label { color: #6b7280; font-size: 12px; }
  .value { font-weight: bold; margin-top: 4px; }
  .total { font-size: 20px; font-weight: bold; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; margin-top: 70px; }
  .signature { border-top: 1px solid #111; padding-top: 8px; text-align: center; }
  footer { margin-top: 60px; text-align: center; font-size: 12px; color: #6b7280; }
</style>
</head>
<body>
<div class="header">
  <h1>Nando's Ar-Condicionado</h1>
  <div class="muted">Qualidade e confiança em todos os detalhes.</div>
  <div style="margin-top:8px"><strong>ORDEM DE SERVIÇO ${escapeHtml(order.number)}</strong></div>
</div>
<h2>Cliente</h2>
<div class="grid">
  <div class="box"><div class="label">Nome</div><div class="value">${escapeHtml(order.client)}</div></div>
  <div class="box"><div class="label">Cidade</div><div class="value">${escapeHtml(order.city)}</div></div>
  <div class="box"><div class="label">Data</div><div class="value">${escapeHtml(formatDate(order.date))}</div></div>
  <div class="box"><div class="label">Técnico</div><div class="value">${escapeHtml(order.technician || "Não definido")}</div></div>
</div>
<h2>Equipamento e Serviço</h2>
<div class="box">
  <div class="label">Equipamento</div>
  <div class="value">${escapeHtml(order.equipment || "Não informado")}</div>
  <div style="margin-top:12px" class="label">Tipo de Serviço</div>
  <div class="value">${escapeHtml(order.serviceType)}</div>
  <div style="margin-top:12px" class="label">Descrição</div>
  <div style="margin-top:4px">${escapeHtml(order.description || "Não informada")}</div>
</div>
<h2>Valores</h2>
<div class="grid">
  <div class="box"><div class="label">Serviço</div><div class="value">${formatCurrency(order.serviceValue)}</div></div>
  <div class="box"><div class="label">Materiais</div><div class="value">${formatCurrency(order.materialsValue)}</div></div>
  <div class="box"><div class="label">Status dos Materiais</div><div class="value">${order.materialsPaid ? "Pago" : "Pendente"}</div></div>
  <div class="box"><div class="label">Total Geral</div><div class="total">${formatCurrency(order.value)}</div></div>
</div>
<h2>Observações</h2>
<div class="box">${escapeHtml(order.notes || "Nenhuma observação.")}</div>
<div class="signatures">
  <div class="signature">Cliente</div>
  <div class="signature">Técnico</div>
</div>
<footer>Nando's Ar-Condicionado</footer>
<script>window.onload = function() { window.print(); };</script>
</body>
</html>
`;
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
}

function sendServiceOrderWhatsApp(order: ServiceOrder) {
  const message = [
    `*NANDO'S AR-CONDICIONADO*`,
    `*ORDEM DE SERVIÇO ${order.number}*`,
    ``,
    `Cliente: ${order.client}`,
    `Cidade: ${order.city}`,
    `Data: ${formatDate(order.date)}`,
    `Serviço: ${order.serviceType}`,
    `Equipamento: ${order.equipment || "Não informado"}`,
    ``,
    `Serviço: ${formatCurrency(order.serviceValue)}`,
    `Materiais: ${formatCurrency(order.materialsValue)}`,
    `*Total: ${formatCurrency(order.value)}*`,
    ``,
    `Status: ${order.status}`,
    order.notes ? `Observações: ${order.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
}

export default function OrdensServicoPage() {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"Todos" | ServiceOrderStatus>("Todos");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [clientEquipmentLoading, setClientEquipmentLoading] = useState(false);

  const selectedClientEquipments = useMemo(() => {
    if (!form.clientId) return [];
    return equipments.filter(
      (equipment) => getEquipmentClientId(equipment) === form.clientId
    );
  }, [equipments, form.clientId]);

  const serviceValueNumber = parseMoney(form.value);
  const materialsValueNumber = parseMoney(form.materialsValue);
  const totalValue = serviceValueNumber + materialsValueNumber;

  async function loadData() {
    setLoading(true);
    const [ordersResult, clientsResult, equipmentsResult] = await Promise.all([
      supabase.from("ordens_servico").select("*").order("created_at", { ascending: false }),
      supabase.from("clientes").select("id, nome, cidade").order("nome", { ascending: true }),
      supabase.from("equipamentos").select("*").order("created_at", { ascending: false }),
    ]);

    const loadedOrders: ServiceOrder[] = (ordersResult.data ?? []).map((item: any) => ({
      id: item.id,
      number: String(item.numero ?? ""),
      clientId: String(item.cliente_id ?? ""),
      client: String(item.cliente_nome ?? ""),
      equipment: String(item.equipamento ?? ""),
      equipmentId: String(item.equipamento_id ?? ""),
      equipmentBrand: String(item.equipamento_marca ?? ""),
      equipmentModel: String(item.equipamento_modelo ?? ""),
      equipmentCapacity: "",
      city: String(item.cidade ?? ""),
      serviceType: (item.tipo_servico as ServiceType) || "Preventiva",
      description: String(item.descricao ?? ""),
      date: String(item.data ?? ""),
      technician: String(item.tecnico ?? ""),
      technicianId: String(item.tecnico_id ?? ""),
      serviceValue: Number(item.valor_servicos ?? item.valor ?? 0),
      materialsValue: Number(item.valor_materiais ?? 0),
      materialsDescription: String(item.materiais_descricao ?? ""),
      materialsPaid: Boolean(item.materiais_pago ?? false),
      materialsPaidAt: item.materiais_pago_em ?? null,
      value: Number(item.valor ?? Number(item.valor_servicos ?? 0) + Number(item.valor_materiais ?? 0)),
      status: (item.status as ServiceOrderStatus) || "Aberta",
      notes: String(item.observacoes ?? ""),
    }));

    setOrders(loadedOrders);
    setClients((clientsResult.data ?? []) as Client[]);
    setEquipments((equipmentsResult.data ?? []) as Equipment[]);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("novo") === "1") {
        setForm((old) => ({
          ...old,
          value: params.get("valor_servico") ? String(params.get("valor_servico")) : old.value,
          materialsValue: params.get("materiais") ? String(params.get("materiais")) : old.materialsValue,
          notes: params.get("observacoes") ? decodeURIComponent(params.get("observacoes")!) : old.notes,
        }));
        setShowForm(true);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesSearch =
        !term ||
        order.number.toLowerCase().includes(term) ||
        order.client.toLowerCase().includes(term) ||
        order.city.toLowerCase().includes(term) ||
        order.equipment.toLowerCase().includes(term);

      const matchesStatus = statusFilter === "Todos" || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: orders.length,
      open: orders.filter((item) => item.status === "Aberta").length,
      scheduled: orders.filter((item) => item.status === "Agendada").length,
      progress: orders.filter((item) => item.status === "Em andamento").length,
      completed: orders.filter((item) => item.status === "Concluída").length,
    };
  }, [orders]);

  function openNewOrder() {
    setEditingId(null);
    setForm({ ...emptyForm, date: new Date().toISOString().slice(0, 10) });
    setShowForm(true);
  }

  function openEditOrder(order: ServiceOrder) {
    setEditingId(order.id);
    setForm({
      clientId: order.clientId,
      client: order.client,
      equipmentId: order.equipmentId,
      equipment: order.equipment,
      equipmentBrand: order.equipmentBrand,
      equipmentModel: order.equipmentModel,
      equipmentCapacity: order.equipmentCapacity,
      city: order.city,
      serviceType: order.serviceType,
      description: order.description,
      date: order.date,
      technicianId: order.technicianId,
      technician: order.technician,
      value: String(order.serviceValue),
      materialsValue: String(order.materialsValue),
      materialsDescription: order.materialsDescription,
      materialsPaid: order.materialsPaid,
      status: order.status,
      notes: order.notes,
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleClientChange(clientId: string) {
    const client = clients.find((item) => item.id === clientId);
    if (!client) {
      setForm((old) => ({
        ...old,
        clientId: "",
        client: "",
        city: "",
        equipmentId: "",
        equipment: "",
      }));
      return;
    }

    setForm((old) => ({
      ...old,
      clientId: client.id,
      client: client.nome,
      city: client.cidade ?? "",
      equipmentId: "",
      equipment: "",
    }));

    setClientEquipmentLoading(true);
    try {
      const { data } = await supabase.from("equipamentos").select("*");
      if (data) setEquipments(data as Equipment[]);
    } catch (error) {
      console.error(error);
    }
    setClientEquipmentLoading(false);
  }

  function handleEquipmentChange(equipmentId: string) {
    const equipment = equipments.find((item) => item.id === equipmentId);
    if (!equipment) {
      setForm((old) => ({ ...old, equipmentId: "", equipment: "" }));
      return;
    }
    setForm((old) => ({
      ...old,
      equipmentId: equipment.id,
      equipment: getEquipmentName(equipment),
      equipmentBrand: String(equipment.marca ?? ""),
      equipmentModel: String(equipment.modelo ?? ""),
    }));
  }

  async function saveOrder() {
    if (!form.clientId) {
      alert("Selecione um cliente.");
      return;
    }
    if (!form.serviceType) {
      alert("Selecione o tipo de serviço.");
      return;
    }

    setSaving(true);
    try {
      const serviceValue = parseMoney(form.value);
      const materialsValue = parseMoney(form.materialsValue);
      const finalTotal = serviceValue + materialsValue;

      const commonData = {
        cliente_id: form.clientId,
        cliente_nome: form.client,
        cidade: form.city,
        equipamento: form.equipment || "Não informado",
        equipamento_id: form.equipmentId || null,
        tipo_servico: form.serviceType,
        descricao: form.description || null,
        data: form.date,
        tecnico: form.technician || null,
        tecnico_id: form.technicianId || null,
        valor_servicos: serviceValue,
        valor_materiais: materialsValue,
        materiais_descricao: form.materialsDescription || null,
        valor: finalTotal,
        status: form.status,
        observacoes: form.notes || null,
      };

      if (editingId) {
        const existingOrder = orders.find((item) => item.id === editingId);
        const { error } = await supabase
          .from("ordens_servico")
          .update({
            ...commonData,
            materiais_pago: existingOrder?.materialsPaid ?? form.materialsPaid ?? false,
          })
          .eq("id", editingId);

        if (error) throw error;
      } else {
        const number = `OS-${String(Date.now()).slice(-6)}`;
        const { error } = await supabase.from("ordens_servico").insert({
          ...commonData,
          numero: number,
          materiais_pago: false,
        });

        if (error) throw error;
      }

      alert(editingId ? "Ordem de serviço atualizada com sucesso." : "Ordem de serviço criada com sucesso.");
      closeForm();
      await loadData();
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Não foi possível salvar a ordem de serviço.");
    }
    setSaving(false);
  }

  async function deleteOrder(order: ServiceOrder) {
    if (!window.confirm(`Deseja excluir a ordem de serviço ${order.number}?`)) return;
    const { error } = await supabase.from("ordens_servico").delete().eq("id", order.id);
    if (error) {
      alert("Não foi possível excluir.");
      return;
    }
    if (selectedOrder?.id === order.id) setSelectedOrder(null);
    await loadData();
  }

  async function toggleMaterialsPayment(order: ServiceOrder) {
    const nextPaid = !order.materialsPaid;
    const { error } = await supabase
      .from("ordens_servico")
      .update({
        materiais_pago: nextPaid,
        materiais_pago_em: nextPaid ? new Date().toISOString() : null,
      })
      .eq("id", order.id);

    if (error) {
      alert("Erro ao atualizar pagamento dos materiais.");
      return;
    }

    if (nextPaid && order.materialsValue > 0) {
      try {
        await supabase.from("lancamentos_financeiros").insert({
          descricao: `Materiais OS ${order.number} - ${order.client}`,
          cliente: order.client,
          tipo: "Entrada",
          categoria: "Materiais",
          valor: order.materialsValue,
          data: new Date().toISOString().slice(0, 10),
          status: "Pago",
          observacoes: order.materialsDescription || `Pagamento de materiais referente à OS ${order.number}`,
        });
      } catch (finError) {
        console.error(finError);
      }
    }

    const updated = {
      ...order,
      materialsPaid: nextPaid,
      materialsPaidAt: nextPaid ? new Date().toISOString() : null,
    };
    setSelectedOrder(updated);
    setOrders((old) => old.map((item) => (item.id === order.id ? updated : item)));
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-cyan-500/10 p-3">
              <ClipboardList className="h-7 w-7 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">Nando's Ar-Condicionado</h1>
              <p className="text-sm text-slate-400">Controle completo das ordens de serviço</p>
            </div>
          </div>
          <button
            onClick={openNewOrder}
            className="flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            <Plus className="h-5 w-5" />
            Nova Ordem de Serviço
          </button>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-sm text-slate-400">Total</p>
            <p className="mt-2 text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-sm text-slate-400">Abertas</p>
            <p className="mt-2 text-2xl font-bold text-yellow-400">{stats.open}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-sm text-slate-400">Agendadas</p>
            <p className="mt-2 text-2xl font-bold text-purple-400">{stats.scheduled}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-sm text-slate-400">Em andamento</p>
            <p className="mt-2 text-2xl font-bold text-blue-400">{stats.progress}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-sm text-slate-400">Concluídas</p>
            <p className="mt-2 text-2xl font-bold text-emerald-400">{stats.completed}</p>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar OS, cliente, cidade ou equipamento..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-4 text-sm outline-none focus:border-cyan-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "Todos" | ServiceOrderStatus)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-cyan-500"
            >
              <option value="Todos">Todos os status</option>
              <option value="Aberta">Abertas</option>
              <option value="Agendada">Agendadas</option>
              <option value="Em andamento">Em andamento</option>
              <option value="Concluída">Concluídas</option>
              <option value="Cancelada">Canceladas</option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 px-5 py-4">
            <h2 className="font-semibold">Ordens de Serviço</h2>
            <p className="text-xs text-slate-500">{filteredOrders.length} ordem(ns) encontrada(s)</p>
          </div>

          {loading ? (
            <div className="p-10 text-center text-slate-400">Carregando ordens de serviço...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <ClipboardList className="mb-4 h-12 w-12 text-slate-700" />
              <h3 className="font-semibold">Nenhuma ordem encontrada</h3>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {filteredOrders.map((order) => (
                <div key={order.id} className="p-5 transition hover:bg-slate-800/30">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold">{order.number}</h3>
                        <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${statusClass(order.status)}`}>
                          {order.status}
                        </span>
                      </div>

                      <div className="mt-3 grid gap-2 text-sm text-slate-400 sm:grid-cols-2 lg:grid-cols-4">
                        <span className="flex items-center gap-2">
                          <User className="h-4 w-4 text-cyan-400" />
                          {order.client}
                        </span>
                        <span className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-cyan-400" />
                          {order.city || "-"}
                        </span>
                        <span className="flex items-center gap-2">
                          <Wrench className="h-4 w-4 text-cyan-400" />
                          {order.equipment || "-"}
                        </span>
                        <span className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-cyan-400" />
                          {formatDate(order.date)}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-4 text-sm">
                        <span>Serviço: <strong>{formatCurrency(order.serviceValue)}</strong></span>
                        <span>Materiais: <strong>{formatCurrency(order.materialsValue)}</strong></span>
                        <span>Total: <strong className="text-cyan-400">{formatCurrency(order.value)}</strong></span>
                        <span className={order.materialsPaid ? "text-emerald-400" : "text-yellow-400"}>
                          Materiais: {order.materialsPaid ? "Pago" : "Pendente"}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
                      >
                        Ver
                      </button>
                      <button
                        onClick={() => openEditOrder(order)}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
                      >
                        <Edit className="h-4 w-4" />
                        Editar
                      </button>
                      <button
                        onClick={() => printServiceOrder(order)}
                        className="rounded-lg border border-slate-700 p-2 hover:bg-slate-800"
                        title="Imprimir"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => sendServiceOrderWhatsApp(order)}
                        className="rounded-lg border border-emerald-500/20 p-2 text-emerald-400 hover:bg-emerald-500/10"
                        title="WhatsApp"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteOrder(order)}
                        className="rounded-lg border border-red-500/20 p-2 text-red-400 hover:bg-red-500/10"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm">
          <div className="max-h-[95vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-800 bg-slate-900 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold">
                  {editingId ? "Editar Ordem de Serviço" : "Nova Ordem de Serviço"}
                </h2>
              </div>
              <button onClick={closeForm} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 p-5">
              <section className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <div className="mb-4 flex items-center gap-2">
                  <User className="h-5 w-5 text-cyan-400" />
                  <h3 className="font-semibold">Cliente</h3>
                </div>
                <select
                  value={form.clientId}
                  onChange={(e) => handleClientChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-cyan-500"
                >
                  <option value="">Selecione o cliente...</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.nome} {client.cidade ? ` — ${client.cidade}` : ""}
                    </option>
                  ))}
                </select>
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <div className="mb-4 flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-cyan-400" />
                  <h3 className="font-semibold">Equipamento</h3>
                </div>
                {!form.clientId ? (
                  <div className="text-sm text-slate-500">Primeiro selecione um cliente.</div>
                ) : clientEquipmentLoading ? (
                  <div className="text-sm text-cyan-300">Buscando equipamentos...</div>
                ) : selectedClientEquipments.length === 0 ? (
                  <div className="text-sm text-yellow-300">Nenhum equipamento cadastrado.</div>
                ) : (
                  <select
                    value={form.equipmentId}
                    onChange={(e) => handleEquipmentChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-cyan-500"
                  >
                    <option value="">Selecione o equipamento...</option>
                    {selectedClientEquipments.map((eq) => (
                      <option key={eq.id} value={eq.id}>
                        {getEquipmentName(eq)}
                      </option>
                    ))}
                  </select>
                )}
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm text-slate-400">Tipo de serviço</label>
                    <select
                      value={form.serviceType}
                      onChange={(e) => setForm((old) => ({ ...old, serviceType: e.target.value as ServiceType }))}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-cyan-500"
                    >
                      <option value="Preventiva">Preventiva</option>
                      <option value="Corretiva">Corretiva</option>
                      <option value="Instalação">Instalação</option>
                      <option value="Higienização">Higienização</option>
                      <option value="Visita técnica">Visita técnica</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm text-slate-400">Data</label>
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm((old) => ({ ...old, date: e.target.value }))}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm text-slate-400">Descrição</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm((old) => ({ ...old, description: e.target.value }))}
                      rows={3}
                      className="w-full resize-none rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <div className="mb-4 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-cyan-400" />
                  <h3 className="font-semibold">Valores</h3>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm text-slate-400">Valor do serviço</label>
                    <input
                      value={form.value}
                      onChange={(e) => setForm((old) => ({ ...old, value: e.target.value }))}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm text-slate-400">Materiais</label>
                    <input
                      value={form.materialsValue}
                      onChange={(e) => setForm((old) => ({ ...old, materialsValue: e.target.value }))}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm text-slate-400">Total</label>
                    <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 px-4 py-3 text-lg font-bold text-cyan-400">
                      {formatCurrency(totalValue)}
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-800 bg-slate-900 p-5">
              <button onClick={closeForm} disabled={saving} className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold hover:bg-slate-800">
                Cancelar
              </button>
              <button onClick={saveOrder} disabled={saving} className="rounded-xl bg-cyan-500 px-6 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-400">
                {saving ? "Salvando..." : "Salvar Ordem de Serviço"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm">
          <div className="max-h-[95vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
            <div className="sticky top-0 z-25 flex items-center justify-between border-b border-slate-800 bg-slate-900 px-5 py-4">
              <h2 className="text-xl font-bold">{selectedOrder.number}</h2>
              <button onClick={() => setSelectedOrder(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 p-5 pb-28">
              <div className="rounded-xl bg-slate-950 p-4">
                <h3 className="font-semibold">{selectedOrder.client}</h3>
                <p className="text-sm text-slate-400">{selectedOrder.city}</p>
              </div>

              <div className="rounded-xl bg-slate-950 p-4">
                <h3 className="font-semibold">Serviço: {formatCurrency(selectedOrder.serviceValue)}</h3>
                <p className="text-sm text-slate-300 mt-2">{selectedOrder.description}</p>
              </div>

              <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">Pagamento dos materiais</p>
                  <p className={selectedOrder.materialsPaid ? "text-sm text-emerald-400" : "text-sm text-yellow-400"}>
                    {selectedOrder.materialsPaid ? "Materiais pagos" : "Materiais pendentes"}
                  </p>
                </div>
                <button
                  onClick={() => toggleMaterialsPayment(selectedOrder)}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${selectedOrder.materialsPaid ? "border border-yellow-500/30 text-yellow-400" : "bg-emerald-500 text-slate-950"}`}
                >
                  {selectedOrder.materialsPaid ? "Marcar como pendente" : "Marcar materiais como pagos"}
                </button>
              </div>
            </div>

            <div className="sticky bottom-0 flex flex-wrap justify-end gap-3 border-t border-slate-800 bg-slate-900 p-5">
              <button onClick={() => printServiceOrder(selectedOrder)} className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm hover:bg-slate-800">
                <Printer className="h-4 w-4" /> Imprimir
              </button>
              <button onClick={() => sendServiceOrderWhatsApp(selectedOrder)} className="flex items-center gap-2 rounded-xl border border-emerald-500/20 px-4 py-2.5 text-sm text-emerald-400">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </button>
              <button onClick={() => { setSelectedOrder(null); openEditOrder(selectedOrder); }} className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm hover:bg-slate-800">
                <Edit className="h-4 w-4" /> Editar
              </button>
              <button onClick={() => setSelectedOrder(null)} className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
