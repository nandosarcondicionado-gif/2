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
  PenTool,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
  city: string;
  serviceType: ServiceType;
  description: string;
  date: string;
  technician: string;
  technicianId: string;
  helper: string;
  serviceValue: number;
  valorTecnico: number;
  lucro: number;
  materialsValue: number;
  materialsDescription: string;
  materialsPaid: boolean;
  materialsPaidAt: string | null;
  value: number;
  status: ServiceOrderStatus;
  notes: string;
  signatureClient: string;
  signatureHelper: string;
};

type FormData = {
  clientId: string;
  client: string;
  equipmentId: string;
  equipment: string;
  equipmentBrand: string;
  equipmentModel: string;
  city: string;
  serviceType: ServiceType;
  description: string;
  date: string;
  technicianId: string;
  technician: string;
  helper: string;
  value: string;
  valorTecnico: string;
  materialsValue: string;
  materialsDescription: string;
  materialsPaid: boolean;
  status: ServiceOrderStatus;
  notes: string;
  signatureClient: string;
  signatureHelper: string;
};

const emptyForm: FormData = {
  clientId: "",
  client: "",
  equipmentId: "",
  equipment: "",
  equipmentBrand: "",
  equipmentModel: "",
  city: "",
  serviceType: "Preventiva",
  description: "",
  date: new Date().toISOString().slice(0, 10),
  technicianId: "",
  technician: "",
  helper: "",
  value: "",
  valorTecnico: "",
  materialsValue: "",
  materialsDescription: "",
  materialsPaid: false,
  status: "Aberta",
  notes: "",
  signatureClient: "",
  signatureHelper: "",
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
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
}

function parseMoney(value: string | number | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const text = String(value ?? "").trim();
  if (!text) return 0;
  const normalized = text.replace(/\s/g, "").replace(/R\$/gi, "").replace(/\./g, "").replace(",", ".");
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
  return String(equipment.cliente_id ?? equipment.clienteId ?? equipment.client_id ?? equipment.clientId ?? "");
}

function getEquipmentName(equipment: Equipment) {
  const name = equipment.nome ?? equipment.descricao ?? equipment.equipamento ?? "";
  if (String(name).trim()) return String(name);
  const brand = String(equipment.marca ?? "").trim();
  const model = String(equipment.modelo ?? "").trim();
  if (brand || model) return [brand, model].filter(Boolean).join(" ");
  return "Equipamento";
}

function statusClass(status: ServiceOrderStatus) {
  if (status === "Concluída") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  if (status === "Cancelada") return "bg-red-500/10 text-red-400 border-red-500/20";
  if (status === "Em andamento") return "bg-blue-500/10 text-blue-400 border-blue-500/20";
  if (status === "Agendada") return "bg-purple-500/10 text-purple-400 border-purple-500/20";
  return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
}

// Componente interno para a Janela de Assinatura (Canvas)
function SignatureModal({
  title,
  onSave,
  onClose,
}: {
  title: string;
  onSave: (dataUrl: string) => void;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const startDrawing = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSave(canvas.toDataURL("image/png"));
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-5 text-white shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <p className="mb-4 text-xs text-slate-400">Assine no espaço abaixo usando o dedo ou a caneta do celular.</p>
        <div className="overflow-hidden rounded-xl border border-slate-700 bg-white">
          <canvas
            ref={canvasRef}
            width={350}
            height={200}
            className="touch-none cursor-crosshair w-full bg-white"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>
        <div className="mt-4 flex justify-between gap-2">
          <button onClick={clearCanvas} className="rounded-xl border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800">Limpar</button>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-xl border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800">Cancelar</button>
            <button onClick={handleSave} className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-400">Salvar Assinatura</button>
          </div>
        </div>
      </div>
    </div>
  );
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
  .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; }
  .signature-box { border: 1px solid #ddd; padding: 10px; border-radius: 8px; text-align: center; }
  .signature-box img { max-height: 70px; margin-top: 5px; }
  footer { margin-top: 40px; text-align: center; font-size: 12px; color: #6b7280; }
</style>
</head>
<body>
<div class="header">
  <h1>Nando's Ar-Condicionado</h1>
  <div class="muted">Qualidade e confiança em todos os detalhes.</div>
  <div style="margin-top:8px"><strong>ORDEM DE SERVIÇO ${escapeHtml(order.number)}</strong></div>
</div>
<h2>Cliente e Equipe</h2>
<div class="grid">
  <div class="box"><div class="label">Nome</div><div class="value">${escapeHtml(order.client)}</div></div>
  <div class="box"><div class="label">Cidade</div><div class="value">${escapeHtml(order.city)}</div></div>
  <div class="box"><div class="label">Data</div><div class="value">${escapeHtml(formatDate(order.date))}</div></div>
  <div class="box"><div class="label">Técnico / Ajudante</div><div class="value">${escapeHtml(order.technician || "Não definido")} ${order.helper ? `/ ${escapeHtml(order.helper)}` : ""}</div></div>
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
  <div class="box"><div class="label">Valor do Serviço</div><div class="value">${formatCurrency(order.serviceValue)}</div></div>
  <div class="box"><div class="label">Total Geral</div><div class="total">${formatCurrency(order.value)}</div></div>
</div>
<h2>Assinaturas</h2>
<div class="signatures">
  <div class="signature-box">
    <div class="label">Assinatura do Cliente</div>
    ${order.signatureClient ? `<img src="${order.signatureClient}" />` : `<div style="margin-top:30px; color:#999;">Não assinada</div>`}
  </div>
  <div class="signature-box">
    <div class="label">Recibo / Diária Ajudante (${escapeHtml(order.helper || "Nenhum")})</div>
    ${order.signatureHelper ? `<img src="${order.signatureHelper}" />` : `<div style="margin-top:30px; color:#999;">Não assinada</div>`}
  </div>
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
  const [activeSignatureType, setActiveSignatureType] = useState<"client" | "helper" | null>(null);

  const selectedClientEquipments = useMemo(() => {
    if (!form.clientId) return [];
    return equipments.filter((eq) => getEquipmentClientId(eq) === form.clientId);
  }, [equipments, form.clientId]);

  const serviceValueNumber = parseMoney(form.value);
  const valorTecnicoNumber = parseMoney(form.valorTecnico);
  const lucroEstimado = serviceValueNumber - valorTecnicoNumber;

  async function loadData() {
    setLoading(true);
    const [ordersRes, clientsRes, equipmentsRes] = await Promise.all([
      supabase.from("ordens_servico").select("*").order("created_at", { ascending: false }),
      supabase.from("clientes").select("id, nome, cidade").order("nome", { ascending: true }),
      supabase.from("equipamentos").select("*").order("created_at", { ascending: false }),
    ]);

    const loadedOrders: ServiceOrder[] = (ordersRes.data ?? []).map((item: any) => ({
      id: item.id,
      number: String(item.numero ?? ""),
      clientId: String(item.cliente_id ?? ""),
      client: String(item.cliente_nome ?? ""),
      equipment: String(item.equipamento ?? ""),
      equipmentId: String(item.equipamento_id ?? ""),
      equipmentBrand: String(item.equipamento_marca ?? ""),
      equipmentModel: String(item.equipamento_modelo ?? ""),
      city: String(item.cidade ?? ""),
      serviceType: (item.tipo_servico as ServiceType) || "Preventiva",
      description: String(item.descricao ?? ""),
      date: String(item.data ?? ""),
      technician: String(item.tecnico ?? ""),
      technicianId: String(item.tecnico_id ?? ""),
      helper: String(item.ajudante ?? ""),
      serviceValue: Number(item.valor_servicos ?? item.valor ?? 0),
      valorTecnico: Number(item.valor_tecnico ?? 0),
      lucro: Number(item.lucro ?? 0),
      materialsValue: Number(item.valor_materiais ?? 0),
      materialsDescription: String(item.materiais_descricao ?? ""),
      materialsPaid: Boolean(item.materiais_pago ?? false),
      materialsPaidAt: item.materiais_pago_em ?? null,
      value: Number(item.valor ?? 0),
      status: (item.status as ServiceOrderStatus) || "Aberta",
      notes: String(item.observacoes ?? ""),
      signatureClient: String(item.assinatura_cliente ?? ""),
      signatureHelper: String(item.assinatura_ajudante ?? ""),
    }));

    setOrders(loadedOrders);
    setClients((clientsRes.data ?? []) as Client[]);
    setEquipments((equipmentsRes.data ?? []) as Equipment[]);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesSearch =
        !term ||
        order.number.toLowerCase().includes(term) ||
        order.client.toLowerCase().includes(term) ||
        order.city.toLowerCase().includes(term) ||
        order.technician.toLowerCase().includes(term);
      const matchesStatus = statusFilter === "Todos" || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

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
      city: order.city,
      serviceType: order.serviceType,
      description: order.description,
      date: order.date,
      technicianId: order.technicianId,
      technician: order.technician,
      helper: order.helper,
      value: String(order.serviceValue),
      valorTecnico: String(order.valorTecnico || ""),
      materialsValue: String(order.materialsValue),
      materialsDescription: order.materialsDescription,
      materialsPaid: order.materialsPaid,
      status: order.status,
      notes: order.notes,
      signatureClient: order.signatureClient,
      signatureHelper: order.signatureHelper,
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
      setForm((old) => ({ ...old, clientId: "", client: "", city: "", equipmentId: "", equipment: "" }));
      return;
    }
    setForm((old) => ({ ...old, clientId: client.id, client: client.nome, city: client.cidade ?? "", equipmentId: "", equipment: "" }));
  }

  async function saveOrder() {
    if (!form.clientId) {
      alert("Selecione um cliente.");
      return;
    }

    setSaving(true);
    try {
      const serviceValue = parseMoney(form.value);
      const valorTecnico = parseMoney(form.valorTecnico);
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
        ajudante: form.helper || null,
        valor_servicos: serviceValue,
        valor_tecnico: valorTecnico,
        lucro: serviceValue - valorTecnico,
        valor_materiais: materialsValue,
        materiais_descricao: form.materialsDescription || null,
        valor: finalTotal,
        status: form.status,
        observacoes: form.notes || null,
        assinatura_cliente: form.signatureClient || null,
        assinatura_ajudante: form.signatureHelper || null,
      };

      if (editingId) {
        const { error } = await supabase.from("ordens_servico").update(commonData).eq("id", editingId);
        if (error) throw error;
      } else {
        const number = `OS-${String(Date.now()).slice(-6)}`;
        const { error } = await supabase.from("ordens_servico").insert({ ...commonData, numero: number });
        if (error) throw error;
      }

      alert("Ordem de serviço salva com sucesso!");
      closeForm();
      await loadData();
    } catch (error: any) {
      alert(error?.message || "Erro ao salvar.");
    }
    setSaving(false);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Ordens de Serviço com Assinaturas</h1>
          <button onClick={openNewOrder} className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 font-semibold text-slate-950">
            <Plus className="h-5 w-5" /> Nova OS
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="divide-y divide-slate-800">
            {filteredOrders.map((order) => (
              <div key={order.id} className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="font-bold">{order.number} - {order.client}</h3>
                  <p className="text-xs text-slate-400 mt-1">Técnico: {order.technician || "Nenhum"} | Ajudante: {order.helper || "Nenhum"}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setSelectedOrder(order)} className="border border-slate-700 px-3 py-1.5 rounded-lg text-sm">Ver</button>
                  <button onClick={() => openEditOrder(order)} className="border border-slate-700 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1"><Edit className="h-4 w-4" /> Editar</button>
                  <button onClick={() => printServiceOrder(order)} className="border border-slate-700 p-1.5 rounded-lg"><Printer className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm">
          <div className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold">{editingId ? "Editar OS" : "Nova OS"}</h2>
              <button onClick={closeForm}><X className="h-5 w-5" /></button>
            </div>

            <div>
              <label className="text-sm text-slate-400 block mb-1">Cliente</label>
              <select value={form.clientId} onChange={(e) => handleClientChange(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl">
                <option value="">Selecione o cliente...</option>
                {clients.map((c) => (<option key={c.id} value={c.id}>{c.nome}</option>))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-400 block mb-1">Técnico</label>
                <input value={form.technician} onChange={(e) => setForm((o) => ({ ...o, technician: e.target.value }))} className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl" placeholder="Nome do técnico" />
              </div>
              <div>
                <label className="text-sm text-slate-400 block mb-1">Ajudante</label>
                <input value={form.helper} onChange={(e) => setForm((o) => ({ ...o, helper: e.target.value }))} className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl" placeholder="Nome do ajudante" />
              </div>
            </div>

            {/* BOTÕES DE ASSINATURA NO FORMULÁRIO */}
            <div className="flex flex-wrap gap-4 border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setActiveSignatureType("client")}
                className="flex items-center gap-2 border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-cyan-500/20"
              >
                <PenTool className="h-4 w-4" />
                {form.signatureClient ? "Alterar Assinatura do Cliente" : "Coletar Assinatura do Cliente"}
              </button>

              {form.helper && (
                <button
                  type="button"
                  onClick={() => setActiveSignatureType("helper")}
                  className="flex items-center gap-2 border border-purple-500/30 bg-purple-500/10 text-purple-400 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-purple-500/20"
                >
                  <PenTool className="h-4 w-4" />
                  {form.signatureHelper ? "Alterar Assinatura do Ajudante" : `Assinatura Recibo (${form.helper})`}
                </button>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button onClick={closeForm} className="border border-slate-700 px-4 py-2 rounded-xl">Cancelar</button>
              <button onClick={saveOrder} disabled={saving} className="bg-cyan-500 text-slate-950 font-bold px-6 py-2 rounded-xl">{saving ? "Salvando..." : "Salvar"}</button>
            </div>
          </div>
        </div>
      )}

      {activeSignatureType && (
        <SignatureModal
          title={activeSignatureType === "client" ? "Assinatura de Conclusão do Cliente" : `Recibo de Pagamento - ${form.helper}`}
          onClose={() => setActiveSignatureType(null)}
          onSave={(dataUrl) => {
            if (activeSignatureType === "client") {
              setForm((o) => ({ ...o, signatureClient: dataUrl }));
            } else {
              setForm((o) => ({ ...o, signatureHelper: dataUrl }));
            }
            setActiveSignatureType(null);
          }}
        />
      )}
    </main>
  );
}
