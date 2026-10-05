"use client";

import {
  Edit,
  Plus,
  Printer,
  X,
  PenTool,
  Eye,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type ServiceOrderStatus =
  | "Aberta"
  | "Agendada"
  | "Em andamento"
  | "Concluída"
  | "Cancelada"
  | "Assinado";

type ServiceType =
  | "Preventiva"
  | "Corretiva"
  | "Instalação"
  | "Higienização"
  | "Visita técnica";

type PaymentMethod =
  | ""
  | "Dinheiro"
  | "Pix"
  | "Cartão de débito"
  | "Cartão de crédito"
  | "Transferência"
  | "Boleto"
  | "Outro";

type Client = {
  id: string;
  nome: string;
  cidade: string;
};

type Helper = {
  id: string;
  nome: string;
  funcao?: string;
};

type Technician = {
  id: string;
  nome: string;
  cargo?: string;
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
  materialsPaymentMethod: PaymentMethod;

  value: number;
  status: ServiceOrderStatus;
  notes: string;
  signatureAdmin: string;
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
  materialsPaidAt: string;
  materialsPaymentMethod: PaymentMethod;

  status: ServiceOrderStatus;
  notes: string;
  signatureAdmin: string;
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
  materialsPaidAt: "",
  materialsPaymentMethod: "",

  status: "Aberta",
  notes: "",
  signatureAdmin: "",
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
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  let text = String(value ?? "").trim();

  if (!text) return 0;

  text = text.replace(/\s/g, "").replace(/R\$/gi, "");

  if (text.includes(",") && text.includes(".")) {
    text = text.replace(/\./g, "").replace(",", ".");
  } else if (text.includes(",")) {
    text = text.replace(",", ".");
  }

  const number = Number(text);

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

  const startDrawing = (
    e: React.TouchEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    setIsDrawing(true);

    const rect = canvas.getBoundingClientRect();

    const x =
      "touches" in e
        ? e.touches[0].clientX - rect.left
        : e.clientX - rect.left;

    const y =
      "touches" in e
        ? e.touches[0].clientY - rect.top
        : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
  };

  const draw = (
    e: React.TouchEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;

    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();

    const x =
      "touches" in e
        ? e.touches[0].clientX - rect.left
        : e.clientX - rect.left;

    const y =
      "touches" in e
        ? e.touches[0].clientY - rect.top
        : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-5 text-white shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold">{title}</h3>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-xs text-slate-400">
          Assine no espaço abaixo usando o dedo ou a caneta.
        </p>

        <div className="overflow-hidden rounded-xl border border-slate-700 bg-white">
          <canvas
            ref={canvasRef}
            width={350}
            height={200}
            className="w-full cursor-crosshair touch-none bg-white"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>

        <div className="mt-4 flex justify-between gap-2">
          <button
            onClick={clearCanvas}
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
          >
            Limpar
          </button>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
            >
              Cancelar
            </button>

            <button
              onClick={handleSave}
              className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-400"
            >
              Salvar Assinatura
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

async function printServiceOrder(order: ServiceOrder) {
  let printableOrder = order;

  try {
    const { data } = await supabase
      .from("ordens_servico")
      .select(
        "assinatura_admin,materiais_pago,materiais_pago_em,materiais_forma_pagamento"
      )
      .eq("id", order.id)
      .maybeSingle();

    if (data) {
      printableOrder = {
        ...order,
        signatureAdmin: String(data.assinatura_admin ?? ""),
        materialsPaid: Boolean(data.materiais_pago ?? false),
        materialsPaidAt: data.materiais_pago_em ?? null,
        materialsPaymentMethod:
          (data.materiais_forma_pagamento as PaymentMethod) || "",
      };
    }
  } catch (error) {
    console.error(
      "Não foi possível atualizar os dados antes da impressão:",
      error
    );
  }

  const signatureHtml = printableOrder.signatureAdmin
    ? `
      <div class="signature-image-wrap">
        <img
          id="admin-signature"
          src="${escapeHtml(printableOrder.signatureAdmin)}"
          alt="Assinatura do Administrador"
        />
      </div>
    `
    : `
      <div class="signature-placeholder">
        Assinatura Digital ADM
      </div>
    `;

  const materialsPaymentText = printableOrder.materialsPaid
    ? `PAGO${
        printableOrder.materialsPaymentMethod
          ? ` — ${escapeHtml(printableOrder.materialsPaymentMethod)}`
          : ""
      }${
        printableOrder.materialsPaidAt
          ? ` — ${escapeHtml(formatDate(printableOrder.materialsPaidAt))}`
          : ""
      }`
    : "PENDENTE";

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>OS ${escapeHtml(printableOrder.number)}</title>

<style>
  * {
    box-sizing: border-box;
  }

  body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 30px;
    color: #111827;
    background: #fff;
  }

  .header {
    border-bottom: 2px solid #111827;
    padding-bottom: 15px;
    margin-bottom: 25px;
  }

  h1 {
    margin: 0;
    font-size: 24px;
  }

  h2 {
    font-size: 17px;
    margin-top: 25px;
    border-bottom: 1px solid #ddd;
    padding-bottom: 7px;
  }

  .muted {
    color: #6b7280;
  }

  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .box {
    border: 1px solid #ddd;
    padding: 12px;
    border-radius: 8px;
  }

  .label {
    color: #6b7280;
    font-size: 12px;
  }

  .value {
    font-weight: bold;
    margin-top: 4px;
  }

  .total {
    font-size: 20px;
    font-weight: bold;
  }

  .payment-paid {
    color: #15803d;
    font-weight: bold;
  }

  .payment-pending {
    color: #b45309;
    font-weight: bold;
  }

  .signatures {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 40px;
    margin-top: 50px;
  }

  .signature-box {
    border: 1px solid #ddd;
    padding: 15px;
    border-radius: 8px;
    text-align: center;
    min-height: 130px;
  }

  .signature-image-wrap {
    height: 85px;
    margin-top: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .signature-box img {
    display: block;
    max-width: 100%;
    width: auto;
    height: auto;
    max-height: 80px;
    object-fit: contain;
  }

  .signature-placeholder {
    margin-top: 50px;
    color: #999;
    border-top: 1px dashed #ccc;
    padding-top: 5px;
  }

  footer {
    margin-top: 40px;
    text-align: center;
    font-size: 12px;
    color: #6b7280;
  }

  @media print {
    body {
      padding: 15mm;
    }

    .signature-box img {
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }
  }
</style>
</head>

<body>

<div class="header">
  <h1>Nando's Ar-Condicionado</h1>

  <div class="muted">
    Qualidade e confiança em todos os detalhes.
  </div>

  <div style="margin-top:8px">
    <strong>ORDEM DE SERVIÇO ${escapeHtml(printableOrder.number)}</strong>
  </div>
</div>

<h2>Cliente e Equipe</h2>

<div class="grid">

  <div class="box">
    <div class="label">Nome do Cliente</div>
    <div class="value">
      ${escapeHtml(printableOrder.client)}
    </div>
  </div>

  <div class="box">
    <div class="label">Cidade</div>
    <div class="value">
      ${escapeHtml(printableOrder.city)}
    </div>
  </div>

  <div class="box">
    <div class="label">Data</div>
    <div class="value">
      ${escapeHtml(formatDate(printableOrder.date))}
    </div>
  </div>

  <div class="box">
    <div class="label">Técnico / Ajudante</div>

    <div class="value">
      ${escapeHtml(printableOrder.technician || "Não definido")}

      ${
        printableOrder.helper
          ? `/ ${escapeHtml(printableOrder.helper)}`
          : ""
      }
    </div>
  </div>

</div>

<h2>Equipamento e Serviço</h2>

<div class="box">

  <div class="label">Equipamento</div>

  <div class="value">
    ${escapeHtml(printableOrder.equipment || "Não informado")}
  </div>

  <div style="margin-top:12px" class="label">
    Tipo de Serviço
  </div>

  <div class="value">
    ${escapeHtml(printableOrder.serviceType)}
  </div>

  <div style="margin-top:12px" class="label">
    Descrição
  </div>

  <div style="margin-top:4px">
    ${escapeHtml(printableOrder.description || "Não informada")}
  </div>

</div>

<h2>Valores</h2>

<div class="grid">

  <div class="box">
    <div class="label">
      Valor do Serviço
    </div>

    <div class="value">
      ${formatCurrency(printableOrder.serviceValue)}
    </div>
  </div>

  <div class="box">
    <div class="label">
      Valor dos Materiais
    </div>

    <div class="value">
      ${formatCurrency(printableOrder.materialsValue)}
    </div>
  </div>

  <div class="box">
    <div class="label">
      Materiais
    </div>

    <div class="value">
      ${
        printableOrder.materialsDescription
          ? escapeHtml(printableOrder.materialsDescription)
          : "Nenhum material informado"
      }
    </div>
  </div>

  <div class="box">
    <div class="label">
      Pagamento dos Materiais
    </div>

    <div class="${
      printableOrder.materialsPaid
        ? "payment-paid"
        : "payment-pending"
    }">
      ${materialsPaymentText}
    </div>
  </div>

</div>

<div class="box" style="margin-top:12px">
  <div class="label">
    Total Geral
  </div>

  <div class="total">
    ${formatCurrency(printableOrder.value)}
  </div>
</div>

<h2>Assinaturas e Aprovação</h2>

<div class="signatures">

  <div class="signature-box">

    <div class="label">
      Assinatura do Administrador (Nando's)
    </div>

    ${signatureHtml}

  </div>

  <div class="signature-box">

    <div class="label">
      Assinatura do Cliente (Aprovação)
    </div>

    <div class="signature-placeholder">
      Assine aqui
    </div>

  </div>

</div>

<footer>
  Nando's Ar-Condicionado
</footer>

<script>

(function () {

  function imprimir() {

    setTimeout(function () {

      window.focus();

      window.print();

    }, 300);

  }

  window.addEventListener("load", function () {

    var imagem =
      document.getElementById("admin-signature");

    if (imagem && !imagem.complete) {

      imagem.onload = imprimir;

      imagem.onerror = imprimir;

    } else {

      imprimir();

    }

  });

})();

</script>

</body>
</html>
`;

  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    alert(
      "O navegador bloqueou a janela de impressão. Permita pop-ups para o ClimaPro e tente novamente."
    );
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

export default function OrdensServicoPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [helpers, setHelpers] = useState<Helper[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState<
    "Todos" | ServiceOrderStatus
  >("Todos");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [selectedOrder, setSelectedOrder] =
    useState<ServiceOrder | null>(null);

  const [form, setForm] = useState<FormData>(emptyForm);

  const [isSigningAdmin, setIsSigningAdmin] =
    useState(false);

  async function loadData() {
    setLoading(true);

    const [
      ordersRes,
      clientsRes,
      helpersRes,
      techRes,
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
        .order("nome", {
          ascending: true,
        }),

      supabase
        .from("ajudantes")
        .select("id, nome, funcao")
        .order("nome", {
          ascending: true,
        }),

      supabase
        .from("funcionarios")
        .select("id, nome, cargo")
        .order("nome", {
          ascending: true,
        }),
    ]);

    if (ordersRes.error) {
      console.error(
        "Erro ao carregar ordens:",
        ordersRes.error
      );
    }

    if (clientsRes.error) {
      console.error(
        "Erro ao carregar clientes:",
        clientsRes.error
      );
    }

    if (helpersRes.error) {
      console.error(
        "Erro ao carregar ajudantes:",
        helpersRes.error
      );
    }

    if (techRes.error) {
      console.error(
        "Erro ao carregar técnicos:",
        techRes.error
      );
    }

    const loadedOrders: ServiceOrder[] =
      (ordersRes.data ?? []).map((item: any) => ({
        id: item.id,

        number: String(item.numero ?? ""),

        clientId: String(item.cliente_id ?? ""),

        client: String(item.cliente_nome ?? ""),

        equipment: String(item.equipamento ?? ""),

        equipmentId: String(
          item.equipamento_id ?? ""
        ),

        equipmentBrand: String(
          item.equipamento_marca ?? ""
        ),

        equipmentModel: String(
          item.equipamento_modelo ?? ""
        ),

        city: String(item.cidade ?? ""),

        serviceType:
          (item.tipo_servico as ServiceType) ||
          "Preventiva",

        description: String(
          item.descricao ?? ""
        ),

        date: String(item.data ?? ""),

        technician: String(
          item.tecnico ?? ""
        ),

        technicianId: String(
          item.tecnico_id ?? ""
        ),

        helper: String(
          item.ajudante ?? ""
        ),

        serviceValue: Number(
          item.valor_servicios ??
            item.valor ?? 0
        ),

        valorTecnico: Number(
          item.valor_tecnico ?? 0
        ),

        lucro: Number(
          item.lucro ?? 0
        ),

        materialsValue: Number(
          item.valor_materiais ?? 0
        ),

        materialsDescription: String(
          item.materiais_descricao ?? ""
        ),

        materialsPaid: Boolean(
          item.materiais_pago ?? false
        ),

        materialsPaidAt:
          item.materiais_pago_em ?? null,

        materialsPaymentMethod:
          (item.materiais_forma_pagamento as PaymentMethod) ||
          "",

        value: Number(
          item.valor ?? 0
        ),

        status:
          (item.status as ServiceOrderStatus) ||
          "Aberta",

        notes: String(
          item.observacoes ?? ""
        ),

        signatureAdmin: String(
          item.assinatura_admin ?? ""
        ),
      }));

    setOrders(loadedOrders);

    setClients(
      (clientsRes.data ?? []) as Client[]
    );

    setHelpers(
      (helpersRes.data ?? []) as Helper[]
    );

    setTechnicians(
      (techRes.data ?? []) as Technician[]
    );

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
        order.number
          .toLowerCase()
          .includes(term) ||
        order.client
          .toLowerCase()
          .includes(term) ||
        order.city
          .toLowerCase()
          .includes(term) ||
        order.technician
          .toLowerCase()
          .includes(term);

      const matchesStatus =
        statusFilter === "Todos" ||
        order.status === statusFilter;

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

  function openNewOrder() {
    setEditingId(null);

    setForm({
      ...emptyForm,
      date: new Date()
        .toISOString()
        .slice(0, 10),
    });

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

      value: String(
        order.serviceValue
      ),

      valorTecnico: String(
        order.valorTecnico || ""
      ),

      materialsValue: String(
        order.materialsValue
      ),

      materialsDescription:
        order.materialsDescription,

      materialsPaid:
        order.materialsPaid,

      materialsPaidAt:
        order.materialsPaidAt || "",

      materialsPaymentMethod:
        order.materialsPaymentMethod || "",

      status: order.status,

      notes: order.notes,

      signatureAdmin:
        order.signatureAdmin,
    });

    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);

    setEditingId(null);

    setForm(emptyForm);
  }

  async function deleteOrder(
    order: ServiceOrder
  ) {
    const confirmed = window.confirm(
      `Deseja realmente excluir a Ordem de Serviço ${order.number}?`
    );

    if (!confirmed) return;

    try {
      const { error } =
        await supabase
          .from("ordens_servico")
          .delete()
          .eq("id", order.id);

      if (error) throw error;

      alert(
        "Ordem de Serviço excluída com sucesso."
      );

      setSelectedOrder(null);

      await loadData();
    } catch (error: any) {
      alert(
        error?.message ||
          "Erro ao excluir a Ordem de Serviço."
      );
    }
  }

  async function handleClientChange(
    clientId: string
  ) {
    const client = clients.find(
      (item) => item.id === clientId
    );

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
  }

  function handleTechnicianChange(
    techId: string
  ) {
    const tech = technicians.find(
      (t) => t.id === techId
    );

    if (!tech) {
      setForm((old) => ({
        ...old,
        technicianId: "",
        technician: "",
      }));

      return;
    }

    setForm((old) => ({
      ...old,

      technicianId: tech.id,

      technician: tech.nome,
    }));
  }

  function handleMaterialsPaidChange(
    paid: boolean
  ) {
    setForm((old) => ({
      ...old,

      materialsPaid: paid,

      materialsPaidAt: paid
        ? old.materialsPaidAt ||
          new Date()
            .toISOString()
            .slice(0, 10)
        : "",

      materialsPaymentMethod: paid
        ? old.materialsPaymentMethod
        : "",
    }));
  }

  async function saveOrder() {
    if (!form.clientId) {
      alert("Selecione um cliente.");
      return;
    }

    setSaving(true);

    try {
      const serviceValue =
        parseMoney(form.value);

      const valorTecnico =
        parseMoney(form.valorTecnico);

      const materialsValue =
        parseMoney(
          form.materialsValue
        );

      const finalTotal =
        serviceValue +
        materialsValue;

      const lucroCalculado =
        serviceValue -
        valorTecnico;

      const commonData = {
        cliente_id:
          form.clientId,

        cliente_nome:
          form.client,

        cidade:
          form.city,

        equipamento:
          form.equipment ||
          "Não informado",

        equipamento_id:
          form.equipmentId ||
          null,

        equipamento_marca:
          form.equipmentBrand ||
          null,

        equipamento_modelo:
          form.equipmentModel ||
          null,

        tipo_servico:
          form.serviceType,

        descricao:
          form.description ||
          null,

        data:
          form.date,

        tecnico:
          form.technician ||
          null,

        tecnico_id:
          form.technicianId ||
          null,

        ajudante:
          form.helper ||
          null,

        valor_servicios:
          serviceValue,

        valor_tecnico:
          valorTecnico,

        lucro:
          lucroCalculado,

        valor_materiais:
          materialsValue,

        materiais_descricao:
          form.materialsDescription ||
          null,

        materiais_pago:
          form.materialsPaid,

        materiais_pago_em:
          form.materialsPaid
            ? form.materialsPaidAt ||
              new Date()
                .toISOString()
                .slice(0, 10)
            : null,

        materiais_forma_pagamento:
          form.materialsPaid
            ? form.materialsPaymentMethod ||
              null
            : null,

        valor:
          finalTotal,

        status:
          form.status,

        observacoes:
          form.notes ||
          null,

        assinatura_admin:
          form.signatureAdmin ||
          null,
      };

      if (editingId) {
        const { error } =
          await supabase
            .from("ordens_servico")
            .update(commonData)
            .eq("id", editingId);

        if (error) throw error;
      } else {
        const number =
          `OS-${String(Date.now()).slice(-6)}`;

        const { error } =
          await supabase
            .from("ordens_servico")
            .insert({
              ...commonData,
              numero: number,
            });

        if (error) throw error;
      }

      alert(
        "Ordem de serviço salva com sucesso!"
      );

      closeForm();

      await loadData();
    } catch (error: any) {
      console.error(
        "Erro ao salvar OS:",
        error
      );

      alert(
        error?.message ||
          "Erro ao salvar."
      );
    }

    setSaving(false);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-6 lg:px-8">

      <div className="mx-auto max-w-7xl">

        {/* CABEÇALHO */}

        <div className="mb-6 flex items-center justify-between">

          <div className="flex items-center gap-3">

            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>

            <h1 className="text-xl font-bold sm:text-2xl">
              Ordens de Serviço
            </h1>

          </div>

          <button
            onClick={openNewOrder}
            className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-400"
          >
            <Plus className="h-5 w-5" />
            Nova OS
          </button>

        </div>

        {/* BUSCA E FILTRO */}

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">

          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Pesquisar OS, cliente, cidade ou técnico..."
            className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white outline-none focus:border-cyan-500"
          />

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value as
                  | "Todos"
                  | ServiceOrderStatus
              )
            }
            className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white"
          >
            <option value="Todos">
              Todos os status
            </option>
            <option value="Aberta">
              Aberta
            </option>
            <option value="Agendada">
              Agendada
            </option>
            <option value="Em andamento">
              Em andamento
            </option>
            <option value="Concluída">
              Concluída
            </option>
            <option value="Cancelada">
              Cancelada
            </option>
            <option value="Assinado">
              Assinado
            </option>
          </select>

        </div>

        {/* LISTA */}

        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">

          {loading ? (
            <div className="p-8 text-center text-slate-400">
              Carregando ordens de serviço...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              Nenhuma Ordem de Serviço encontrada.
            </div>
          ) : (
            <div className="divide-y divide-slate-800">

              {filteredOrders.map(
                (order) => (
                  <div
                    key={order.id}
                    className="flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center"
                  >

                    <div>

                      <h3 className="font-bold">
                        {order.number} —{" "}
                        {order.client}
                      </h3>

                      <p className="mt-1 text-xs text-slate-400">

                        Status:

                        <span className="font-semibold text-cyan-400">
                          {" "}
                          {order.status}
                        </span>

                        {" | "}

                        Data:{" "}
                        {formatDate(
                          order.date
                        )}

                        {" | "}

                        Técnico:{" "}
                        {order.technician ||
                          "Nenhum"}

                      </p>

                      <p className="mt-1 text-xs text-slate-400">

                        Materiais:{" "}

                        <span
                          className={
                            order.materialsPaid
                              ? "font-semibold text-emerald-400"
                              : "font-semibold text-amber-400"
                          }
                        >
                          {order.materialsPaid
                            ? "PAGO"
                            : "PENDENTE"}
                        </span>

                        {order.materialsPaid &&
                        order.materialsPaymentMethod
                          ? ` — ${order.materialsPaymentMethod}`
                          : ""}

                      </p>

                    </div>

                    <div className="flex flex-wrap gap-2">

                      <button
                        onClick={() =>
                          setSelectedOrder(
                            order
                          )
                        }
                        className="flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800"
                      >
                        <Eye className="h-4 w-4" />
                        Ver
                      </button>

                      <button
                        onClick={() =>
                          openEditOrder(
                            order
                          )
                        }
                        className="flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800"
                      >
                        <Edit className="h-4 w-4" />
                        Editar
                      </button>

                      <button
                        onClick={() =>
                          printServiceOrder(
                            order
                          )
                        }
                        className="rounded-lg border border-slate-700 p-1.5 hover:bg-slate-800"
                        title="Imprimir OS"
                      >
                        <Printer className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() =>
                          deleteOrder(
                            order
                          )
                        }
                        className="rounded-lg border border-red-500/20 bg-red-500/10 p-1.5 text-red-400 hover:bg-red-500/20"
                        title="Excluir OS"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>

                    </div>

                  </div>
                )
              )}

            </div>
          )}

        </div>

      </div>

      {/* MODAL VER */}

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm">

          <div className="max-h-[95vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6 text-white shadow-2xl">

            <div className="flex items-center justify-between border-b border-slate-800 pb-3">

              <h2 className="text-lg font-bold">
                Detalhes da{" "}
                {selectedOrder.number}
              </h2>

              <button
                onClick={() =>
                  setSelectedOrder(null)
                }
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>

            </div>

            <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <span className="block text-xs text-slate-400">
                  Cliente
                </span>

                <span className="font-semibold">
                  {selectedOrder.client}
                </span>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <span className="block text-xs text-slate-400">
                  Status
                </span>

                <span className="font-semibold text-cyan-400">
                  {selectedOrder.status}
                </span>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <span className="block text-xs text-slate-400">
                  Cidade
                </span>

                <span className="font-semibold">
                  {selectedOrder.city ||
                    "-"}
                </span>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <span className="block text-xs text-slate-400">
                  Data
                </span>

                <span className="font-semibold">
                  {formatDate(
                    selectedOrder.date
                  )}
                </span>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <span className="block text-xs text-slate-400">
                  Tipo de Serviço
                </span>

                <span className="font-semibold">
                  {selectedOrder.serviceType}
                </span>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <span className="block text-xs text-slate-400">
                  Técnico / Ajudante
                </span>

                <span className="font-semibold">
                  {selectedOrder.technician ||
                    "Não"}

                  {selectedOrder.helper
                    ? ` / ${selectedOrder.helper}`
                    : ""}
                </span>
              </div>

            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm">

              <span className="mb-1 block text-xs text-slate-400">
                Equipamento e Descrição
              </span>

              <p className="font-semibold">
                {selectedOrder.equipment}
              </p>

              <p className="mt-2 whitespace-pre-wrap text-xs text-slate-300">
                {selectedOrder.description ||
                  "Sem descrição"}
              </p>

            </div>

            {/* MATERIAIS */}

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">

              <h3 className="mb-3 font-bold text-cyan-400">
                Materiais
              </h3>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                <div>
                  <span className="block text-xs text-slate-400">
                    Valor dos materiais
                  </span>

                  <span className="font-semibold">
                    {formatCurrency(
                      selectedOrder.materialsValue
                    )}
                  </span>
                </div>

                <div>
                  <span className="block text-xs text-slate-400">
                    Status do pagamento
                  </span>

                  <span
                    className={
                      selectedOrder.materialsPaid
                        ? "font-semibold text-emerald-400"
                        : "font-semibold text-amber-400"
                    }
                  >
                    {selectedOrder.materialsPaid
                      ? "PAGO"
                      : "PENDENTE"}
                  </span>
                </div>

                {selectedOrder.materialsPaid &&
                  selectedOrder.materialsPaymentMethod && (
                    <div>
                      <span className="block text-xs text-slate-400">
                        Forma de pagamento
                      </span>

                      <span className="font-semibold">
                        {
                          selectedOrder.materialsPaymentMethod
                        }
                      </span>
                    </div>
                  )}

                {selectedOrder.materialsPaidAt && (
                  <div>
                    <span className="block text-xs text-slate-400">
                      Data do pagamento
                    </span>

                    <span className="font-semibold">
                      {formatDate(
                        selectedOrder.materialsPaidAt
                      )}
                    </span>
                  </div>
                )}

              </div>

              {selectedOrder.materialsDescription && (
                <div className="mt-3 border-t border-slate-800 pt-3">

                  <span className="block text-xs text-slate-400">
                    Descrição dos materiais
                  </span>

                  <p className="mt-1 whitespace-pre-wrap text-sm">
                    {
                      selectedOrder.materialsDescription
                    }
                  </p>

                </div>
              )}

            </div>

            {/* VALORES */}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">

                <span className="block text-xs text-slate-400">
                  Serviço
                </span>

                <span className="font-bold">
                  {formatCurrency(
                    selectedOrder.serviceValue
                  )}
                </span>

              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">

                <span className="block text-xs text-slate-400">
                  Materiais
                </span>

                <span className="font-bold">
                  {formatCurrency(
                    selectedOrder.materialsValue
                  )}
                </span>

              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">

                <span className="block text-xs text-slate-400">
                  Total
                </span>

                <span className="text-lg font-bold text-cyan-400">
                  {formatCurrency(
                    selectedOrder.value
                  )}
                </span>

              </div>

            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4">

              <div>
                <span className="block text-xs text-slate-400">
                  Valor Total
                </span>

                <span className="text-lg font-bold text-cyan-400">
                  {formatCurrency(
                    selectedOrder.value
                  )}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">

                <button
                  onClick={() => {
                    const ord =
                      selectedOrder;

                    setSelectedOrder(null);

                    printServiceOrder(
                      ord
                    );
                  }}
                  className="flex items-center gap-1 rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold hover:bg-slate-800"
                >
                  <Printer className="h-4 w-4" />
                  Imprimir OS
                </button>

                <button
                  onClick={() =>
                    deleteOrder(
                      selectedOrder
                    )
                  }
                  className="flex items-center gap-1 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/20"
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </button>

              </div>

            </div>

          </div>

        </div>
      )}

      {/* FORMULÁRIO */}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm">

          <div className="max-h-[95vh] w-full max-w-3xl space-y-4 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">

            <div className="flex items-center justify-between border-b border-slate-800 pb-3">

              <h2 className="text-lg font-bold">
                {editingId
                  ? "Editar OS"
                  : "Nova OS"}
              </h2>

              <button onClick={closeForm}>
                <X className="h-5 w-5" />
              </button>

            </div>

            {/* CLIENTE E STATUS */}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

              <div>

                <label className="mb-1 block text-sm text-slate-400">
                  Cliente
                </label>

                <select
                  value={form.clientId}
                  onChange={(e) =>
                    handleClientChange(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white"
                >

                  <option value="">
                    Selecione o cliente...
                  </option>

                  {clients.map((c) => (
                    <option
                      key={c.id}
                      value={c.id}
                    >
                      {c.nome}
                    </option>
                  ))}

                </select>

              </div>

              <div>

                <label className="mb-1 block text-sm text-slate-400">
                  Status do Pedido
                </label>

                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((o) => ({
                      ...o,
                      status:
                        e.target.value as ServiceOrderStatus,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 font-semibold text-cyan-400"
                >

                  <option value="Aberta">
                    Aberta
                  </option>

                  <option value="Agendada">
                    Agendada
                  </option>

                  <option value="Em andamento">
                    Em andamento
                  </option>

                  <option value="Concluída">
                    Concluída
                  </option>

                  <option value="Cancelada">
                    Cancelada
                  </option>

                  <option value="Assinado">
                    Assinado
                  </option>

                </select>

              </div>

            </div>

            {/* SERVIÇO */}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

              <div>

                <label className="mb-1 block text-sm text-slate-400">
                  Tipo de Serviço
                </label>

                <select
                  value={form.serviceType}
                  onChange={(e) =>
                    setForm((o) => ({
                      ...o,
                      serviceType:
                        e.target.value as ServiceType,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white"
                >

                  <option value="Preventiva">
                    Preventiva
                  </option>

                  <option value="Corretiva">
                    Corretiva
                  </option>

                  <option value="Instalação">
                    Instalação
                  </option>

                  <option value="Higienização">
                    Higienização
                  </option>

                  <option value="Visita técnica">
                    Visita técnica
                  </option>

                </select>

              </div>

              <div>

                <label className="mb-1 block text-sm text-slate-400">
                  Data
                </label>

                <input
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    setForm((o) => ({
                      ...o,
                      date: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white"
                />

              </div>

              <div>

                <label className="mb-1 block text-sm text-slate-400">
                  Equipamento
                </label>

                <input
                  value={form.equipment}
                  onChange={(e) =>
                    setForm((o) => ({
                      ...o,
                      equipment:
                        e.target.value,
                    }))
                  }
                  placeholder="Ex: Ar Split 12k"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white"
                />

              </div>

            </div>

            {/* DESCRIÇÃO */}

            <div>

              <label className="mb-1 block text-sm text-slate-400">
                Descrição do Serviço Realizado
              </label>

              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((o) => ({
                    ...o,
                    description:
                      e.target.value,
                  }))
                }
                rows={3}
                placeholder="Descreva o que foi feito no equipamento..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white"
              />

            </div>

            {/* TÉCNICO E AJUDANTE */}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

              <div>

                <label className="mb-1 block text-sm text-slate-400">
                  Técnico
                </label>

                <select
                  value={form.technicianId}
                  onChange={(e) =>
                    handleTechnicianChange(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white"
                >

                  <option value="">
                    Selecione o técnico...
                  </option>

                  {technicians.map(
                    (t) => (
                      <option
                        key={t.id}
                        value={t.id}
                      >
                        {t.nome}{" "}
                        {t.cargo
                          ? `(${t.cargo})`
                          : ""}
                      </option>
                    )
                  )}

                </select>

              </div>

              <div>

                <label className="mb-1 block text-sm text-slate-400">
                  Ajudante
                </label>

                <select
                  value={form.helper}
                  onChange={(e) =>
                    setForm((o) => ({
                      ...o,
                      helper:
                        e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white"
                >

                  <option value="">
                    Selecione o ajudante...
                  </option>

                  {helpers.map(
                    (h) => (
                      <option
                        key={h.id}
                        value={h.nome}
                      >
                        {h.nome}{" "}
                        {h.funcao
                          ? `(${h.funcao})`
                          : ""}
                      </option>
                    )
                  )}

                </select>

              </div>

            </div>

            {/* VALORES DO SERVIÇO */}

            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">

              <h3 className="mb-3 font-bold text-cyan-400">
                Serviço
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                <div>

                  <label className="mb-1 block text-sm text-slate-400">
                    Valor do Serviço (R$)
                  </label>

                  <input
                    value={form.value}
                    onChange={(e) =>
                      setForm((o) => ({
                        ...o,
                        value:
                          e.target.value,
                      }))
                    }
                    placeholder="0,00"
                    inputMode="decimal"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white"
                  />

                </div>

                <div>

                  <label className="mb-1 block text-sm text-slate-400">
                    Valor do Técnico (R$)
                  </label>

                  <input
                    value={
                      form.valorTecnico
                    }
                    onChange={(e) =>
                      setForm((o) => ({
                        ...o,
                        valorTecnico:
                          e.target.value,
                      }))
                    }
                    placeholder="0,00"
                    inputMode="decimal"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white"
                  />

                </div>

              </div>

            </div>

            {/* MATERIAIS */}

            <div className="rounded-xl border border-cyan-500/20 bg-slate-950/70 p-4">

              <div className="mb-4">

                <h3 className="text-base font-bold text-cyan-400">
                  Materiais
                </h3>

                <p className="mt-1 text-xs text-slate-400">
                  Os materiais podem ser registrados e pagos separadamente do serviço.
                </p>

              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                {/* VALOR */}

                <div>

                  <label className="mb-1 block text-sm text-slate-400">
                    Valor dos Materiais (R$)
                  </label>

                  <input
                    value={
                      form.materialsValue
                    }
                    onChange={(e) =>
                      setForm((o) => ({
                        ...o,
                        materialsValue:
                          e.target.value,
                      }))
                    }
                    placeholder="0,00"
                    inputMode="decimal"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white"
                  />

                </div>

                {/* PAGO */}

                <div>

                  <label className="mb-1 block text-sm text-slate-400">
                    Pagamento dos Materiais
                  </label>

                  <button
                    type="button"
                    onClick={() =>
                      handleMaterialsPaidChange(
                        !form.materialsPaid
                      )
                    }
                    className={`flex w-full items-center justify-between rounded-xl border p-3 transition ${
                      form.materialsPaid
                        ? "border-emerald-500/40 bg-emerald-500/10"
                        : "border-amber-500/30 bg-amber-500/10"
                    }`}
                  >

                    <span
                      className={
                        form.materialsPaid
                          ? "font-semibold text-emerald-400"
                          : "font-semibold text-amber-400"
                      }
                    >
                      {form.materialsPaid
                        ? "Materiais PAGOS"
                        : "Materiais PENDENTES"}
                    </span>

                    <span
                      className={`h-5 w-10 rounded-full p-0.5 ${
                        form.materialsPaid
                          ? "bg-emerald-500"
                          : "bg-slate-700"
                      }`}
                    >

                      <span
                        className={`block h-4 w-4 rounded-full bg-white transition-transform ${
                          form.materialsPaid
                            ? "translate-x-5"
                            : "translate-x-0"
                        }`}
                      />

                    </span>

                  </button>

                </div>

                {/* DESCRIÇÃO */}

                <div className="sm:col-span-2">

                  <label className="mb-1 block text-sm text-slate-400">
                    Descrição dos Materiais
                  </label>

                  <textarea
                    value={
                      form.materialsDescription
                    }
                    onChange={(e) =>
                      setForm((o) => ({
                        ...o,
                        materialsDescription:
                          e.target.value,
                      }))
                    }
                    rows={3}
                    placeholder="Ex: Tubulação de cobre, gás R22, parafusos, borrachas..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white"
                  />

                </div>

                {/* FORMA E DATA */}

                {form.materialsPaid && (
                  <>

                    <div>

                      <label className="mb-1 block text-sm text-slate-400">
                        Forma de Pagamento dos Materiais
                      </label>

                      <select
                        value={
                          form.materialsPaymentMethod
                        }
                        onChange={(e) =>
                          setForm((o) => ({
                            ...o,
                            materialsPaymentMethod:
                              e.target.value as PaymentMethod,
                          }))
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white"
                      >

                        <option value="">
                          Selecione...
                        </option>

                        <option value="Dinheiro">
                          Dinheiro
                        </option>

                        <option value="Pix">
                          Pix
                        </option>

                        <option value="Cartão de débito">
                          Cartão de débito
                        </option>

                        <option value="Cartão de crédito">
                          Cartão de crédito
                        </option>

                        <option value="Transferência">
                          Transferência
                        </option>

                        <option value="Boleto">
                          Boleto
                        </option>

                        <option value="Outro">
                          Outro
                        </option>

                      </select>

                    </div>

                    <div>

                      <label className="mb-1 block text-sm text-slate-400">
                        Data do Pagamento
                      </label>

                      <input
                        type="date"
                        value={
                          form.materialsPaidAt
                        }
                        onChange={(e) =>
                          setForm((o) => ({
                            ...o,
                            materialsPaidAt:
                              e.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white"
                      />

                    </div>

                  </>
                )}

              </div>

              {/* RESUMO */}

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">

                <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">

                  <span className="block text-xs text-slate-400">
                    Serviço
                  </span>

                  <span className="font-bold">
                    {formatCurrency(
                      parseMoney(
                        form.value
                      )
                    )}
                  </span>

                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">

                  <span className="block text-xs text-slate-400">
                    Materiais
                  </span>

                  <span className="font-bold">
                    {formatCurrency(
                      parseMoney(
                        form.materialsValue
                      )
                    )}
                  </span>

                </div>

                <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-3">

                  <span className="block text-xs text-slate-400">
                    Total da OS
                  </span>

                  <span className="font-bold text-cyan-400">
                    {formatCurrency(
                      parseMoney(
                        form.value
                      ) +
                        parseMoney(
                          form.materialsValue
                        )
                    )}
                  </span>

                </div>

              </div>

            </div>

            {/* ASSINATURA ADM */}

            <div className="flex flex-wrap gap-4 border-t border-slate-800 pt-4">

              <button
                type="button"
                onClick={() =>
                  setIsSigningAdmin(true)
                }
                className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-sm font-semibold text-cyan-400 hover:bg-cyan-500/20"
              >
                <PenTool className="h-4 w-4" />

                {form.signatureAdmin
                  ? "Alterar Assinatura do Administrador"
                  : "Assinatura do Administrador (ADM)"}
              </button>

              {form.signatureAdmin && (
                <div className="flex items-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-400">
                  ✓ Assinatura registrada
                </div>
              )}

            </div>

            {/* BOTÕES */}

            <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">

              <button
                onClick={closeForm}
                className="rounded-xl border border-slate-700 px-4 py-2"
              >
                Cancelar
              </button>

              <button
                onClick={saveOrder}
                disabled={saving}
                className="rounded-xl bg-cyan-500 px-6 py-2 font-bold text-slate-950 disabled:opacity-50"
              >
                {saving
                  ? "Salvando..."
                  : "Salvar OS"}
              </button>

            </div>

          </div>

        </div>
      )}

      {/* ASSINATURA */}

      {isSigningAdmin && (
        <SignatureModal
          title="Assinatura do Administrador (Nando's)"
          onClose={() =>
            setIsSigningAdmin(false)
          }
          onSave={(dataUrl) => {
            setForm((o) => ({
              ...o,
              signatureAdmin:
                dataUrl,
            }));

            setIsSigningAdmin(false);
          }}
        />
      )}

    </main>
  );
}
