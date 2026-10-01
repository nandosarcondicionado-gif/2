"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Edit,
  Eye,
  FileText,
  MapPin,
  Plus,
  Printer,
  Search,
  Trash2,
  User,
  X,
  Wrench,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type ServiceOrderStatus = "Aberta" | "Em andamento" | "Concluída" | "Cancelada";

type ServiceOrder = {
  id: string;
  number: string;
  client: string;
  clientId: string;
  city: string;
  equipment: string;
  serviceType: string;
  description: string;
  date: string;
  technician: string;
  helper: string;
  status: ServiceOrderStatus;
  servicesValue: number;
  materialsValue: number;
  profit: number;
  totalValue: number;
  observations: string;
};

type Client = {
  id: string;
  nome: string;
  cidade: string | null;
};

const supabase = createClient();

function money(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(value: string) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
}

function statusClass(status: ServiceOrderStatus) {
  if (status === "Concluída") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  if (status === "Cancelada") return "bg-red-500/10 text-red-400 border-red-500/20";
  if (status === "Em andamento") return "bg-blue-500/10 text-blue-400 border-blue-500/20";
  return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
}

export default function OrdensServicoPage() {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"Todos" | ServiceOrderStatus>("Todos");
  
  const [showModal, setShowModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ServiceOrder | null>(null);
  const [previewOrder, setPreviewOrder] = useState<ServiceOrder | null>(null);

  const [clientId, setClientId] = useState("");
  const [clientName, setClientName] = useState("");
  const [city, setCity] = useState("");
  const [equipment, setEquipment] = useState("");
  const [serviceType, setServiceType] = useState("Corretiva");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [technician, setTechnician] = useState("");
  const [helper, setHelper] = useState("");
  const [servicesValue, setServicesValue] = useState("0");
  const [materialsValue, setMaterialsValue] = useState("0");
  const [observations, setObservations] = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const [ordersRes, clientsRes] = await Promise.all([
        supabase.from("ordens_servico").select("*").order("created_at", { ascending: false }),
        supabase.from("clientes").select("id, nome, cidade").order("nome"),
      ]);

      if (ordersRes.error) throw ordersRes.error;
      if (clientsRes.error) throw clientsRes.error;

      const loadedOrders = (ordersRes.data ?? []).map((row: any) => ({
        id: row.id,
        number: row.numero ?? `OS-${String(row.id).slice(0, 6)}`,
        client: row.cliente_nome ?? "",
        clientId: row.cliente_id ?? "",
        city: row.cidade ?? "",
        equipment: row.equipamento ?? "",
        serviceType: row.tipo_servico ?? "Corretiva",
        description: row.descricao ?? "",
        date: row.data ?? row.created_at ?? new Date().toISOString().slice(0, 10),
        technician: row.tecnico ?? "",
        helper: row.ajudante ?? "",
        status: row.status ?? "Aberta",
        servicesValue: Number(row.valor_servicos ?? row.valor ?? 0),
        materialsValue: Number(row.valor_materiais ?? 0),
        profit: Number(row.lucro ?? 0),
        totalValue: Number(row.valor ?? 0),
        observations: row.observacoes ?? "",
      }));

      setOrders(loadedOrders);
      setClients((clientsRes.data ?? []) as Client[]);
    } catch (error) {
      console.error("Erro ao carregar Ordens de Serviço:", error);
      alert("Não foi possível carregar as ordens de serviço.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function resetForm() {
    setEditingOrder(null);
    setClientId("");
    setClientName("");
    setCity("");
    setEquipment("");
    setServiceType("Corretiva");
    setDescription("");
    setDate(new Date().toISOString().slice(0, 10));
    setTechnician("");
    setHelper("");
    setServicesValue("0");
    setMaterialsValue("0");
    setObservations("");
  }

  function openNewOrder() {
    resetForm();
    setShowModal(true);
  }

  function editOrder(order: ServiceOrder) {
    setEditingOrder(order);
    setClientId(order.clientId);
    setClientName(order.client);
    setCity(order.city);
    setEquipment(order.equipment);
    setServiceType(order.serviceType);
    setDescription(order.description);
    setDate(order.date ? order.date.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setTechnician(order.technician);
    setHelper(order.helper);
    setServicesValue(String(order.servicesValue));
    setMaterialsValue(String(order.materialsValue));
    setObservations(order.observations);
    setShowModal(true);
  }

  function handleClientChange(id: string) {
    setClientId(id);
    const client = clients.find((c) => c.id === id);
    if (client) {
      setClientName(client.nome);
      setCity(client.cidade ?? "");
    }
  }

  async function saveOrder() {
    if (!clientId) {
      alert("Selecione um cliente.");
      return;
    }

    setSaving(true);
    try {
      let number = editingOrder?.number;
      if (!number) {
        const { data } = await supabase
          .from("ordens_servico")
          .select("numero")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data?.numero) {
          const match = String(data.numero).match(/(\d+)$/);
          const next = match ? Number(match[1]) + 1 : 1;
          number = `OS-${String(next).padStart(4, "0")}`;
        } else {
          number = "OS-0001";
        }
      }

      const sVal = Number(servicesValue) || 0;
      const mVal = Number(materialsValue) || 0;
      const total = sVal + mVal;

      const payload = {
        numero: number,
        cliente_id: clientId,
        cliente_nome: clientName,
        cidade: city,
        equipamento: equipment,
        tipo_servico: serviceType,
        descricao,
        data,
        tecnico: technician,
        ajudante: helper,
        valor_servicos: sVal,
        valor_materiais: mVal,
        valor: total,
        status: editingOrder?.status ?? "Aberta",
        observacoes,
      };

      let error;
      if (editingOrder) {
        const res = await supabase.from("ordens_servico").update(payload).eq("id", editingOrder.id);
        error = res.error;
      } else {
        const res = await supabase.from("ordens_servico").insert(payload);
        error = res.error;
      }

      if (error) throw error;

      alert(editingOrder ? "Ordem de Serviço atualizada!" : "Ordem de Serviço criada com sucesso!");
      setShowModal(false);
      resetForm();
      await loadData();
    } catch (error) {
      console.error("Erro ao salvar OS:", error);
      alert("Não foi possível salvar a Ordem de Serviço.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteOrder(order: ServiceOrder) {
    const confirmed = window.confirm(`Deseja realmente excluir a Ordem de Serviço ${order.number}?`);
    if (!confirmed) return;

    try {
      const { error } = await supabase.from("ordens_servico").delete().eq("id", order.id);
      if (error) throw error;
      alert("Ordem de Serviço excluída com sucesso.");
      await loadData();
    } catch (error) {
      console.error("Erro ao excluir OS:", error);
      alert("Não foi possível excluir a Ordem de Serviço.");
    }
  }

  async function updateStatus(order: ServiceOrder, status: ServiceOrderStatus) {
    try {
      const { error } = await supabase.from("ordens_servico").update({ status }).eq("id", order.id);
      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      alert("Não foi possível atualizar o status.");
    }
  }

  function printOrder(order: ServiceOrder) {
    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>${order.number}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 30px; color: #222; }
          h1 { margin-bottom: 5px; }
          .box { border: 1px solid #ddd; padding: 15px; margin-top: 15px; border-radius: 8px; }
          .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
          .total { font-size: 18px; font-weight: bold; margin-top: 15px; border-top: 2px solid #222; padding-top: 10px; }
        </style>
      </head>
      <body>
        <h1>Ordem de Serviço: ${order.number}</h1>
        <p><strong>Cliente:</strong> ${order.client}</p>
        <p><strong>Cidade:</strong> ${order.city || "-"}</p>
        <p><strong>Equipamento:</strong> ${order.equipment || "-"}</p>
        <p><strong>Data:</strong> ${formatDate(order.date)}</p>
        <p><strong>Técnico:</strong> ${order.technician || "Não informado"} | <strong>Ajudante:</strong> ${order.helper || "Nenhum"}</p>
        
        <div class="box">
          <h3>Descrição dos Serviços</h3>
          <p style="white-space: pre-line;">${order.description || "Nenhuma descrição informada."}</p>
        </div>

        <div class="total">
          <div class="row"><span>Valor Total:</span> <span>${money(order.totalValue)}</span></div>
        </div>
        <script>window.onload = function() { window.print(); };</script>
      </body>
      </html>
    `;

    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
  }

  const filteredOrders = useMemo(() => {
    const query = search.toLowerCase().trim();
    return orders.filter((o) => {
      const matchSearch =
        !query ||
        o.number.toLowerCase().includes(query) ||
        o.client.toLowerCase().includes(query) ||
        o.equipment.toLowerCase().includes(query);
      const matchStatus = statusFilter === "Todos" || o.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [orders, search, statusFilter]);

  const statusCounts = useMemo(() => {
    return {
      total: orders.length,
      aberta: orders.filter((o) => o.status === "Aberta").length,
      andamento: orders.filter((o) => o.status === "Em andamento").length,
      concluida: orders.filter((o) => o.status === "Concluída").length,
      cancelada: orders.filter((o) => o.status === "Cancelada").length,
    };
  }, [orders]);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl text-white">Ordens de Serviço</h1>
            <p className="text-sm text-slate-400">Acompanhe e gerencie os serviços técnicos executados.</p>
          </div>
          <button
            onClick={openNewOrder}
            className="flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            <Plus size={20} /> Nova OS
          </button>
        </div>

        {/* CARDS DE STATUS */}
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <button onClick={() => setStatusFilter("Todos")} className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-left transition hover:bg-slate-800">
            <div className="text-sm text-slate-400">Total</div>
            <div className="mt-2 text-2xl font-bold text-white">{statusCounts.total}</div>
          </button>
          <button onClick={() => setStatusFilter("Aberta")} className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-left transition hover:bg-slate-800">
            <div className="text-sm text-slate-400">Abertas</div>
            <div className="mt-2 text-2xl font-bold text-yellow-400">{statusCounts.aberta}</div>
          </button>
          <button onClick={() => setStatusFilter("Em andamento")} className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-left transition hover:bg-slate-800">
            <div className="text-sm text-slate-400">Em andamento</div>
            <div className="mt-2 text-2xl font-bold text-blue-400">{statusCounts.andamento}</div>
          </button>
          <button onClick={() => setStatusFilter("Concluída")} className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-left transition hover:bg-slate-800">
            <div className="text-sm text-slate-400">Concluídas</div>
            <div className="mt-2 text-2xl font-bold text-emerald-400">{statusCounts.concluida}</div>
          </button>
          <button onClick={() => setStatusFilter("Cancelada")} className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-left transition hover:bg-slate-800">
            <div className="text-sm text-slate-400">Canceladas</div>
            <div className="mt-2 text-2xl font-bold text-red-400">{statusCounts.cancelada}</div>
          </button>
        </div>

        {/* BUSCA */}
        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por número, cliente ou equipamento..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-4 text-sm text-white outline-none focus:border-cyan-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500"
            >
              <option value="Todos">Todos os status</option>
              <option value="Aberta">Aberta</option>
              <option value="Em andamento">Em andamento</option>
              <option value="Concluída">Concluída</option>
              <option value="Cancelada">Cancelada</option>
            </select>
          </div>
        </div>

        {/* LISTA */}
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 px-5 py-4">
            <h2 className="font-semibold text-white">Lista de Ordens de Serviço</h2>
          </div>

          {loading ? (
            <div className="p-10 text-center text-slate-400">Carregando ordens de serviço...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <Wrench size={45} className="mb-4 text-slate-700" />
              <h2 className="text-lg font-semibold text-white">Nenhuma ordem de serviço encontrada</h2>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {filteredOrders.map((order) => (
                <div key={order.id} className="p-5 transition hover:bg-slate-800/30">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-white">{order.number} — {order.client}</h3>
                        <select
                          value={order.status}
                          onChange={(e) => updateStatus(order, e.target.value as ServiceOrderStatus)}
                          className={`rounded-full border px-3 py-1 text-xs font-semibold outline-none ${statusClass(order.status)} bg-slate-950`}
                        >
                          <option value="Aberta">Aberta</option>
                          <option value="Em andamento">Em andamento</option>
                          <option value="Concluída">Concluída</option>
                          <option value="Cancelada">Cancelada</option>
                        </select>
                      </div>

                      <div className="mt-3 grid gap-2 text-sm text-slate-400 sm:grid-cols-2 lg:grid-cols-3">
                        <span className="flex items-center gap-2"><MapPin size={16} className="text-cyan-400" />{order.city || "-"}</span>
                        <span className="flex items-center gap-2"><CalendarDays size={16} className="text-cyan-400" />{formatDate(order.date)}</span>
                        <span>Técnico: <strong className="text-white">{order.technician || "Não informado"}</strong> | Ajudante: <strong className="text-white">{order.helper || "Nenhum"}</strong></span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button title="Visualizar" onClick={() => { setPreviewOrder(order); setShowPreview(true); }} className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-800"><Eye size={18} /></button>
                      <button title="Editar" onClick={() => editOrder(order)} className="flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-sm text-cyan-400 hover:bg-slate-800"><Edit size={16} /> Editar</button>
                      <button title="Imprimir" onClick={() => printOrder(order)} className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-800"><Printer size={18} /></button>
                      <button title="Excluir" onClick={() => deleteOrder(order)} className="rounded-lg border border-red-500/20 p-2 text-red-400 hover:bg-red-500/10"><Trash2 size={18} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE CRIAÇÃO / EDIÇÃO */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm">
          <div className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 space-y-5 text-white">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h2 className="text-xl font-bold">{editingOrder ? "Editar Ordem de Serviço" : "Nova Ordem de Serviço"}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white"><X size={22} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Cliente</label>
                <select
                  value={clientId}
                  onChange={(e) => handleClientChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none focus:border-cyan-500"
                >
                  <option value="">Selecione o cliente</option>
                  {clients.map((c) => (<option key={c.id} value={c.id}>{c.nome}</option>))}
                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">Equipamento</label>
                  <input value={equipment} onChange={(e) => setEquipment(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none focus:border-cyan-500" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">Data</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none focus:border-cyan-500" />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">Técnico responsável</label>
                  <input value={technician} onChange={(e) => setTechnician(e.target.value)} placeholder="Ex: Anderson" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none focus:border-cyan-500" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">Ajudante</label>
                  <input value={helper} onChange={(e) => setHelper(e.target.value)} placeholder="Ex: Leticia" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none focus:border-cyan-500" />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Descrição do Serviço</label>
                <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none focus:border-cyan-500" />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
              <button onClick={() => setShowModal(false)} className="border border-slate-700 px-5 py-3 rounded-xl hover:bg-slate-800">Cancelar</button>
              <button onClick={saveOrder} disabled={saving} className="bg-cyan-500 text-slate-950 font-bold px-6 py-3 rounded-xl hover:bg-cyan-400 disabled:opacity-50">
                {saving ? "Salvando..." : "Salvar OS"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW MODAL */}
      {showPreview && previewOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm">
          <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 space-y-4 text-white">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h2 className="text-xl font-bold">{previewOrder.number}</h2>
              <button onClick={() => setShowPreview(false)} className="text-slate-400 hover:text-white"><X size={22} /></button>
            </div>
            <div>
              <p><strong>Cliente:</strong> {previewOrder.client}</p>
              <p><strong>Equipamento:</strong> {previewOrder.equipment || "-"}</p>
              <p><strong>Técnico:</strong> {previewOrder.technician || "Não informado"}</p>
              <div className="mt-4 bg-slate-950 p-4 rounded-xl border border-slate-800 whitespace-pre-line text-sm text-slate-300">
                {previewOrder.description}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => printOrder(previewOrder)} className="border border-slate-700 bg-slate-950 px-4 py-2 rounded-xl flex items-center gap-2"><Printer size={16} /> Imprimir</button>
              <button onClick={() => deleteOrder(previewOrder)} className="border border-red-500/20 text-red-400 bg-red-500/10 px-4 py-2 rounded-xl flex items-center gap-2"><Trash2 size={16} /> Excluir</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
