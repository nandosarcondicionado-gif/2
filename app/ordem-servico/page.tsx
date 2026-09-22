"use client";

import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Edit,
  MapPin,
  MessageCircle,
  Package,
  Plus,
  Printer,
  Search,
  ShieldCheck,
  Trash2,
  User,
  Wrench,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  applyMonthlyPlanToServiceOrder,
  registerPlanUse,
} from "@/lib/ordens-servico-plano";
import {
  getPlanoOSBadgeClass,
  getPlanoOSInfo,
} from "@/lib/ordens-servico-plano-ui";

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
  nome?: string | null;
  descricao?: string | null;
  marca?: string | null;
  modelo?: string | null;
  capacidade?: string | null;
  btus?: string | number | null;
  tipo?: string | null;
  numero_serie?: string | null;
  numeroSerie?: string | null;
  localizacao?: string | null;
  ambiente?: string | null;
  [key: string]: unknown;
};

type Technician = {
  id: string;
  nome: string;
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
  monthlyPlanId: string | null;
  monthlyPlanCovered: boolean;
  monthlyPlanStatus: string;
  monthlyPlanWarning: string;
  monthlyPlanIncludedService: string;
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
  serviceValue: string;
  materialsValue: string;
  materialsDescription: string;
  materialsPaid: boolean;
  notes: string;
  status: ServiceOrderStatus;
  monthlyPlanId: string | null;
  monthlyPlanCovered: boolean;
  monthlyPlanStatus: string;
  monthlyPlanWarning: string;
  monthlyPlanIncludedService: string;
};

const supabase = createClient();

const today = new Date().toISOString().slice(0, 10);

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
  date: today,
  technicianId: "",
  technician: "",
  serviceValue: "",
  materialsValue: "",
  materialsDescription: "",
  materialsPaid: false,
  notes: "",
  status: "Aberta",
  monthlyPlanId: null,
  monthlyPlanCovered: false,
  monthlyPlanStatus: "",
  monthlyPlanWarning: "",
  monthlyPlanIncludedService: "",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value) || 0);
}

function formatDate(value: string) {
  if (!value) return "-";

  const [year, month, day] = value.slice(0, 10).split("-");

  if (!year || !month || !day) return value;

  return `${day}/${month}/${year}`;
}

function parseMoney(value: string | number | null | undefined) {
  if (typeof value === "number") return value;

  if (!value) return 0;

  const text = String(value).trim();

  if (text.includes(",")) {
    return (
      Number(
        text
          .replace(/\./g, "")
          .replace(",", ".")
          .replace(/[^\d.-]/g, ""),
      ) || 0
    );
  }

  return Number(text.replace(/[^\d.-]/g, "")) || 0;
}

function escapeHtml(value: string) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getEquipmentClientId(equipment: Equipment) {
  return equipment.cliente_id ?? equipment.clienteId ?? "";
}

function getEquipmentName(equipment: Equipment) {
  return (
    equipment.nome ??
    equipment.descricao ??
    equipment.tipo ??
    "Equipamento"
  );
}

function getEquipmentBrand(equipment: Equipment) {
  return equipment.marca ?? "";
}

function getEquipmentModel(equipment: Equipment) {
  return equipment.modelo ?? "";
}

function getEquipmentCapacity(equipment: Equipment) {
  return String(
    equipment.btus ??
      equipment.capacidade ??
      equipment.capacidade_btus ??
      equipment.btu ??
      "",
  );
}

function statusClass(status: ServiceOrderStatus) {
  switch (status) {
    case "Concluída":
      return "bg-green-100 text-green-700";
    case "Cancelada":
      return "bg-red-100 text-red-700";
    case "Em andamento":
      return "bg-blue-100 text-blue-700";
    case "Agendada":
      return "bg-yellow-100 text-yellow-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function printServiceOrder(order: ServiceOrder) {
  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Ordem de Serviço ${escapeHtml(order.number)}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 30px;
            color: #111827;
          }
          .header {
            display: flex;
            justify-content: space-between;
            border-bottom: 2px solid #111827;
            padding-bottom: 15px;
            margin-bottom: 20px;
          }
          h1 { margin: 0; font-size: 24px; }
          h2 {
            font-size: 15px;
            margin: 24px 0 8px;
            border-bottom: 1px solid #d1d5db;
            padding-bottom: 5px;
          }
          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }
          .item {
            padding: 8px;
            background: #f9fafb;
            border-radius: 5px;
          }
          .label {
            font-size: 11px;
            color: #6b7280;
            text-transform: uppercase;
          }
          .value {
            font-size: 14px;
            margin-top: 3px;
          }
          .total {
            font-size: 20px;
            font-weight: bold;
            text-align: right;
            margin-top: 25px;
          }
          .footer {
            margin-top: 50px;
            border-top: 1px solid #d1d5db;
            padding-top: 15px;
            text-align: center;
            font-size: 12px;
            color: #6b7280;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>Nando's Ar-Condicionado</h1>
            <div>qualidade e confiança em todos os detalhes</div>
          </div>
          <div>
            <strong>ORDEM DE SERVIÇO</strong><br />
            ${escapeHtml(order.number)}
          </div>
        </div>

        <h2>Cliente</h2>
        <div class="grid">
          <div class="item">
            <div class="label">Nome</div>
            <div class="value">${escapeHtml(order.client)}</div>
          </div>
          <div class="item">
            <div class="label">Cidade</div>
            <div class="value">${escapeHtml(order.city)}</div>
          </div>
        </div>

        <h2>Equipamento</h2>
        <div class="grid">
          <div class="item">
            <div class="label">Equipamento</div>
            <div class="value">${escapeHtml(order.equipment || "-")}</div>
          </div>
          <div class="item">
            <div class="label">Marca</div>
            <div class="value">${escapeHtml(order.equipmentBrand || "-")}</div>
          </div>
          <div class="item">
            <div class="label">Modelo</div>
            <div class="value">${escapeHtml(order.equipmentModel || "-")}</div>
          </div>
          <div class="item">
            <div class="label">Capacidade</div>
            <div class="value">${escapeHtml(order.equipmentCapacity || "-")}</div>
          </div>
        </div>

        <h2>Serviço</h2>
        <div class="grid">
          <div class="item">
            <div class="label">Tipo</div>
            <div class="value">${escapeHtml(order.serviceType)}</div>
          </div>
          <div class="item">
            <div class="label">Data</div>
            <div class="value">${escapeHtml(formatDate(order.date))}</div>
          </div>
          <div class="item">
            <div class="label">Técnico</div>
            <div class="value">${escapeHtml(order.technician || "-")}</div>
          </div>
          <div class="item">
            <div class="label">Status</div>
            <div class="value">${escapeHtml(order.status)}</div>
          </div>
        </div>

        <h2>Descrição</h2>
        <div class="item">${escapeHtml(order.description || "-")}</div>

        <h2>Materiais</h2>
        <div class="item">
          ${escapeHtml(order.materialsDescription || "Nenhum material informado")}
        </div>

        <h2>Observações</h2>
        <div class="item">${escapeHtml(order.notes || "-")}</div>

        <div class="total">
          Serviços: ${formatCurrency(order.serviceValue)}<br />
          Materiais: ${formatCurrency(order.materialsValue)}<br />
          Total: ${formatCurrency(order.value)}
        </div>

        <div class="footer">
          Nando's Ar-Condicionado — qualidade e confiança em todos os detalhes
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  const printWindow = window.open("", "_blank", "width=900,height=700");

  if (!printWindow) {
    alert("Não foi possível abrir a impressão.");
    return;
  }

  printWindow.document.write(html);
  printWindow.document.close();
}

function sendServiceOrderWhatsApp(order: ServiceOrder) {
  const text = [
    `*ORDEM DE SERVIÇO ${order.number}*`,
    "",
    `*Cliente:* ${order.client}`,
    `*Cidade:* ${order.city}`,
    `*Equipamento:* ${order.equipment || "Não informado"}`,
    order.equipmentBrand
      ? `*Marca:* ${order.equipmentBrand}`
      : "",
    order.equipmentModel
      ? `*Modelo:* ${order.equipmentModel}`
      : "",
    order.equipmentCapacity
      ? `*Capacidade:* ${order.equipmentCapacity}`
      : "",
    "",
    `*Serviço:* ${order.serviceType}`,
    `*Data:* ${formatDate(order.date)}`,
    `*Técnico:* ${order.technician || "Não definido"}`,
    `*Status:* ${order.status}`,
    "",
    `*Descrição:* ${order.description || "Não informada"}`,
    order.materialsDescription
      ? `*Materiais:* ${order.materialsDescription}`
      : "",
    "",
    `*Serviços:* ${formatCurrency(order.serviceValue)}`,
    `*Materiais:* ${formatCurrency(order.materialsValue)}`,
    `*Total:* ${formatCurrency(order.value)}`,
    "",
    "Nando's Ar-Condicionado",
    "qualidade e confiança em todos os detalhes",
  ]
    .filter(Boolean)
    .join("\n");

  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;

  window.open(url, "_blank");
}

export default function OrdemDeServicoPage() {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] =
    useState<ServiceOrder | null>(null);

  const [form, setForm] = useState<FormData>(emptyForm);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<"Todos" | ServiceOrderStatus>("Todos");

  async function loadData() {
    setLoading(true);

    const [
      ordersResult,
      clientsResult,
      equipmentsResult,
      techniciansResult,
    ] = await Promise.all([
      supabase
        .from("ordens_servico")
        .select("*")
        .order("created_at", { ascending: false }),

      supabase
        .from("clientes")
        .select("id, nome, cidade")
        .order("nome", { ascending: true }),

      supabase
        .from("equipamentos")
        .select("*")
        .order("created_at", { ascending: false }),

      supabase
        .from("funcionarios")
        .select("id, nome, status, cargo, perfil")
        .eq("status", "Ativo")
        .order("nome", { ascending: true }),
    ]);

    if (ordersResult.error) {
      console.error("Erro ao carregar ordens:", ordersResult.error);
    }

    if (clientsResult.error) {
      console.error("Erro ao carregar clientes:", clientsResult.error);
    }

    if (equipmentsResult.error) {
      console.error(
        "Erro ao carregar equipamentos:",
        equipmentsResult.error,
      );
    }

    if (techniciansResult.error) {
      console.error(
        "Erro ao carregar funcionários:",
        techniciansResult.error,
      );
    }

    const loadedOrders: ServiceOrder[] = (
      ordersResult.data ?? []
    ).map((row: any) => ({
      id: row.id,
      number: row.numero ?? row.number ?? "",
      clientId: row.cliente_id ?? "",
      client: row.cliente_nome ?? row.cliente ?? "",
      equipment: row.equipamento ?? "",
      equipmentId: row.equipamento_id ?? "",
      equipmentBrand: row.equipamento_marca ?? "",
      equipmentModel: row.equipamento_modelo ?? "",
      equipmentCapacity: row.equipamento_capacidade ?? "",
      city: row.cidade ?? "",
      serviceType:
        row.tipo_servico ?? "Preventiva",
      description: row.descricao ?? "",
      date: row.data ?? "",
      technician: row.tecnico ?? "",
      technicianId: row.tecnico_id ?? "",
      serviceValue: Number(row.valor_servicos ?? 0),
      materialsValue: Number(row.valor_materiais ?? 0),
      materialsDescription:
        row.materiais_descricao ?? "",
      materialsPaid:
        Boolean(row.materiais_pago),
      materialsPaidAt:
        row.materiais_pago_em ?? null,
      value: Number(row.valor ?? 0),
      status:
        row.status ?? "Aberta",
      notes:
        row.observacoes ?? "",
      monthlyPlanId:
        row.plano_mensal_id ?? null,
      monthlyPlanCovered:
        Boolean(row.plano_mensal_coberto),
      monthlyPlanStatus:
        row.plano_mensal_status ?? "",
      monthlyPlanWarning:
        row.plano_mensal_aviso ?? "",
      monthlyPlanIncludedService:
        row.plano_mensal_servico_incluso ?? "",
    }));

    const loadedTechnicians: Technician[] = (
      techniciansResult.data ?? []
    )
      .filter((row: any) => {
        const cargo = String(row.cargo ?? "")
          .trim()
          .toLowerCase();

        const perfil = String(row.perfil ?? "")
          .trim()
          .toLowerCase();

        return (
          cargo === "técnico" ||
          cargo === "tecnico" ||
          perfil === "técnico" ||
          perfil === "tecnico"
        );
      })
      .map((row: any) => ({
        id: row.id,
        nome: row.nome,
      }));

    setOrders(loadedOrders);
    setClients((clientsResult.data ?? []) as Client[]);
    setEquipments(
      (equipmentsResult.data ?? []) as Equipment[],
    );
    setTechnicians(loadedTechnicians);

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
        order.technician.toLowerCase().includes(term) ||
        order.equipment.toLowerCase().includes(term);

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
        (item) => item.status === "Aberta",
      ).length,
      andamento: orders.filter(
        (item) => item.status === "Em andamento",
      ).length,
      concluidas: orders.filter(
        (item) => item.status === "Concluída",
      ).length,
    };
  }, [orders]);

  const selectedClientEquipments = useMemo(() => {
    if (!form.clientId) return [];

    return equipments.filter(
      (equipment) =>
        String(getEquipmentClientId(equipment)) ===
        String(form.clientId),
    );
  }, [equipments, form.clientId]);

  function updateForm<K extends keyof FormData>(
    field: K,
    value: FormData[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function openNewOrder() {
    setEditingId(null);
    setSelectedOrder(null);
    setForm({
      ...emptyForm,
      date: new Date().toISOString().slice(0, 10),
    });
    setShowForm(true);
  }

  function openEditOrder(order: ServiceOrder) {
    setEditingId(order.id);
    setSelectedOrder(order);

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
      serviceValue: String(order.serviceValue || ""),
      materialsValue: String(order.materialsValue || ""),
      materialsDescription:
        order.materialsDescription,
      materialsPaid: order.materialsPaid,
      notes: order.notes,
      status: order.status,
      monthlyPlanId: order.monthlyPlanId,
      monthlyPlanCovered:
        order.monthlyPlanCovered,
      monthlyPlanStatus:
        order.monthlyPlanStatus,
      monthlyPlanWarning:
        order.monthlyPlanWarning,
      monthlyPlanIncludedService:
        order.monthlyPlanIncludedService,
    });

    setShowForm(true);
  }

  async function handleClientChange(clientId: string) {
    const client = clients.find(
      (item) => item.id === clientId,
    );

    if (!client) {
      setForm((current) => ({
        ...current,
        clientId: "",
        client: "",
        city: "",
        equipmentId: "",
        equipment: "",
        equipmentBrand: "",
        equipmentModel: "",
        equipmentCapacity: "",
      }));

      return;
    }

    setForm((current) => ({
      ...current,
      clientId: client.id,
      client: client.nome,
      city: client.cidade ?? "",
      equipmentId: "",
      equipment: "",
      equipmentBrand: "",
      equipmentModel: "",
      equipmentCapacity: "",
      monthlyPlanId: null,
      monthlyPlanCovered: false,
      monthlyPlanStatus: "",
      monthlyPlanWarning: "",
      monthlyPlanIncludedService: "",
    }));
  }

  function handleEquipmentChange(
    equipmentId: string,
  ) {
    const equipment = equipments.find(
      (item) => item.id === equipmentId,
    );

    if (!equipment) {
      setForm((current) => ({
        ...current,
        equipmentId: "",
        equipment: "",
        equipmentBrand: "",
        equipmentModel: "",
        equipmentCapacity: "",
      }));

      return;
    }

    setForm((current) => ({
      ...current,
      equipmentId: equipment.id,
      equipment: getEquipmentName(equipment),
      equipmentBrand: getEquipmentBrand(equipment),
      equipmentModel: getEquipmentModel(equipment),
      equipmentCapacity:
        getEquipmentCapacity(equipment),
    }));
  }

  async function checkPlanForCurrentService(
    clientId: string,
    serviceType: ServiceType,
    serviceValue: number,
  ) {
    if (!clientId) {
      return {
        plano_mensal_id: null,
        plano_mensal_coberto: false,
        plano_mensal_status: "",
        plano_mensal_aviso: "",
        plano_mensal_servico_incluso: "",
        valor: serviceValue,
      };
    }

    try {
      return await applyMonthlyPlanToServiceOrder({
        clientId,
        service: serviceType,
        normalServiceValue: serviceValue,
      });
    } catch (error) {
      console.error(
        "Erro ao verificar plano mensal:",
        error,
      );

      return {
        plano_mensal_id: null,
        plano_mensal_coberto: false,
        plano_mensal_status: "",
        plano_mensal_aviso: "",
        plano_mensal_servico_incluso: "",
        valor: serviceValue,
      };
    }
  }

  async function handleServiceChange(
    serviceType: ServiceType,
  ) {
    updateForm("serviceType", serviceType);

    if (!form.clientId) return;

    const result =
      await checkPlanForCurrentService(
        form.clientId,
        serviceType,
        parseMoney(form.serviceValue),
      );

    setForm((current) => ({
      ...current,
      serviceType,
      monthlyPlanId:
        result.plano_mensal_id ?? null,
      monthlyPlanCovered:
        Boolean(result.plano_mensal_coberto),
      monthlyPlanStatus:
        result.plano_mensal_status ?? "",
      monthlyPlanWarning:
        result.plano_mensal_aviso ?? "",
      monthlyPlanIncludedService:
        result.plano_mensal_servico_incluso ?? "",
      serviceValue:
        String(
          result.valor ??
            parseMoney(current.serviceValue),
        ),
    }));
  }

  function handleTechnicianChange(
    technicianId: string,
  ) {
    const technician = technicians.find(
      (item) => item.id === technicianId,
    );

    setForm((current) => ({
      ...current,
      technicianId,
      technician: technician?.nome ?? "",
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

    if (!form.date) {
      alert("Informe a data da ordem de serviço.");
      return;
    }

    setSaving(true);

    try {
      const serviceValue =
        parseMoney(form.serviceValue);

      const materialsValue =
        parseMoney(form.materialsValue);

      const planResult =
        await checkPlanForCurrentService(
          form.clientId,
          form.serviceType,
          serviceValue,
        );

      const finalServiceValue =
        Number(planResult.valor ?? serviceValue);

      const finalTotal =
        finalServiceValue + materialsValue;

      const commonData = {
        cliente_id: form.clientId,
        cliente_nome: form.client,
        cidade: form.city,

        equipamento:
          form.equipment ||
          "Não informado",

        equipamento_id:
          form.equipmentId || null,

        equipamento_marca:
          form.equipmentBrand || null,

        equipamento_modelo:
          form.equipmentModel || null,

        tipo_servico:
          form.serviceType,

        descricao:
          form.description || null,

        data: form.date,

        tecnico:
          form.technician || null,

        tecnico_id:
          form.technicianId || null,

        valor_servicos:
          finalServiceValue,

        valor_materiais:
          materialsValue,

        materiais_descricao:
          form.materialsDescription ||
          null,

        valor:
          finalTotal,

        status:
          form.status,

        observacoes:
          form.notes || null,

        plano_mensal_id:
          planResult.plano_mensal_id ??
          form.monthlyPlanId ??
          null,

        plano_mensal_coberto:
          Boolean(
            planResult.plano_mensal_coberto ??
              form.monthlyPlanCovered,
          ),

        plano_mensal_status:
          planResult.plano_mensal_status ??
          form.monthlyPlanStatus ??
          null,

        plano_mensal_aviso:
          planResult.plano_mensal_aviso ??
          form.monthlyPlanWarning ??
          null,

        plano_mensal_servico_incluso:
          planResult.plano_mensal_servico_incluso ??
          form.monthlyPlanIncludedService ??
          null,
      };

      if (editingId) {
        const existingOrder =
          orders.find(
            (item) => item.id === editingId,
          );

        const { error } = await supabase
          .from("ordens_servico")
          .update({
            ...commonData,

            materiais_pago:
              existingOrder?.materialsPaid ??
              form.materialsPaid ??
              false,

            materiais_pago_em:
              existingOrder?.materialsPaidAt ??
              null,
          })
          .eq("id", editingId);

        if (error) {
          throw error;
        }

        if (
          planResult.plano_mensal_id &&
          planResult.plano_mensal_coberto
        ) {
          try {
            await registerPlanUse({
              planoId:
                planResult.plano_mensal_id,
              clienteId: form.clientId,
              ordemServicoId: editingId,
              servico: form.serviceType,
            });
          } catch (planError) {
            console.error(
              "Erro ao registrar uso do plano:",
              planError,
            );
          }
        }

        alert(
          "Ordem de serviço atualizada com sucesso.",
        );
      } else {
        const number =
          `OS-${String(Date.now()).slice(-6)}`;

        const { data, error } = await supabase
          .from("ordens_servico")
          .insert({
            ...commonData,

            numero: number,

            materiais_pago: false,

            materiais_pago_em: null,
          })
          .select("id")
          .single();

        if (error) {
          throw error;
        }

        if (
          data?.id &&
          planResult.plano_mensal_id &&
          planResult.plano_mensal_coberto
        ) {
          try {
            await registerPlanUse({
              planoId:
                planResult.plano_mensal_id,
              clienteId: form.clientId,
              ordemServicoId: data.id,
              servico: form.serviceType,
            });
          } catch (planError) {
            console.error(
              "Erro ao registrar uso do plano:",
              planError,
            );
          }
        }

        alert(
          "Ordem de serviço criada com sucesso.",
        );
      }

      setShowForm(false);
      setEditingId(null);
      setSelectedOrder(null);
      setForm(emptyForm);

      await loadData();
    } catch (error: any) {
      console.error(
        "Erro ao salvar ordem de serviço:",
        error,
      );

      alert(
        `Não foi possível salvar a ordem de serviço.\n\n${
          error?.message ||
          "Erro desconhecido."
        }`,
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteOrder(
    order: ServiceOrder,
  ) {
    const confirmed = window.confirm(
      `Deseja realmente excluir a ordem ${order.number}?`,
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("ordens_servico")
        .delete()
        .eq("id", order.id);

      if (error) {
        throw error;
      }

      if (selectedOrder?.id === order.id) {
        setSelectedOrder(null);
        setShowDetails(false);
      }

      await loadData();

      alert("Ordem de serviço excluída.");
    } catch (error: any) {
      console.error(
        "Erro ao excluir ordem:",
        error,
      );

      alert(
        `Não foi possível excluir a ordem.\n\n${
          error?.message || "Erro desconhecido."
        }`,
      );
    }
  }

  async function changeStatus(
    order: ServiceOrder,
    status: ServiceOrderStatus,
  ) {
    try {
      const { error } = await supabase
        .from("ordens_servico")
        .update({ status })
        .eq("id", order.id);

      if (error) {
        throw error;
      }

      await loadData();

      if (selectedOrder?.id === order.id) {
        setSelectedOrder({
          ...selectedOrder,
          status,
        });
      }
    } catch (error: any) {
      console.error(
        "Erro ao alterar status:",
        error,
      );

      alert(
        `Não foi possível alterar o status.\n\n${
          error?.message || "Erro desconhecido."
        }`,
      );
    }
  }

  async function toggleMaterialsPayment(
    order: ServiceOrder,
  ) {
    const nextPaid = !order.materialsPaid;

    try {
      const { error } = await supabase
        .from("ordens_servico")
        .update({
          materiais_pago: nextPaid,
          materiais_pago_em: nextPaid
            ? new Date().toISOString()
            : null,
        })
        .eq("id", order.id);

      if (error) {
        throw error;
      }

      await loadData();

      if (selectedOrder?.id === order.id) {
        setSelectedOrder({
          ...selectedOrder,
          materialsPaid: nextPaid,
          materialsPaidAt: nextPaid
            ? new Date().toISOString()
            : null,
        });
      }
    } catch (error: any) {
      console.error(
        "Erro ao atualizar pagamento:",
        error,
      );

      alert(
        `Não foi possível atualizar o pagamento dos materiais.\n\n${
          error?.message || "Erro desconhecido."
        }`,
      );
    }
  }

  function showOrderDetails(order: ServiceOrder) {
    setSelectedOrder(order);
    setShowDetails(true);
  }

  function getPlanInfo(order: ServiceOrder) {
    try {
      return getPlanoOSInfo({
        plano_mensal_id:
          order.monthlyPlanId,
        plano_mensal_coberto:
          order.monthlyPlanCovered,
        plano_mensal_status:
          order.monthlyPlanStatus,
        plano_mensal_aviso:
          order.monthlyPlanWarning,
        plano_mensal_servico_incluso:
          order.monthlyPlanIncludedService,
      } as any);
    } catch {
      return null;
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
              <p className="text-gray-600">
                Carregando ordens de serviço...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-600 p-3 text-white">
                <ClipboardList size={26} />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Ordens de serviço
                </h1>

                <p className="text-sm text-gray-500">
                  Crie, acompanhe e gerencie suas ordens de serviço.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={openNewOrder}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus size={20} />
            Nova ordem de serviço
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="mt-1 text-2xl font-bold">
                  {stats.total}
                </p>
              </div>

              <ClipboardList className="text-blue-600" />
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Abertas</p>
                <p className="mt-1 text-2xl font-bold">
                  {stats.abertas}
                </p>
              </div>

              <AlertTriangle className="text-yellow-500" />
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  Em andamento
                </p>
                <p className="mt-1 text-2xl font-bold">
                  {stats.andamento}
                </p>
              </div>

              <Wrench className="text-blue-500" />
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  Concluídas
                </p>
                <p className="mt-1 text-2xl font-bold">
                  {stats.concluidas}
                </p>
              </div>

              <CheckCircle2 className="text-green-600" />
            </div>
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
                placeholder="Pesquisar por OS, cliente, cidade, equipamento ou técnico..."
                className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as
                    | "Todos"
                    | ServiceOrderStatus,
                )
              }
              className="rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
            >
              <option value="Todos">Todos os status</option>
              <option value="Aberta">Aberta</option>
              <option value="Agendada">Agendada</option>
              <option value="Em andamento">
                Em andamento
              </option>
              <option value="Concluída">
                Concluída
              </option>
              <option value="Cancelada">
                Cancelada
              </option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="rounded-2xl border bg-white p-12 text-center shadow-sm">
              <ClipboardList
                size={44}
                className="mx-auto text-gray-300"
              />

              <h2 className="mt-4 text-lg font-semibold text-gray-800">
                Nenhuma ordem encontrada
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Crie uma nova ordem de serviço para começar.
              </p>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const planInfo =
                getPlanInfo(order);

              return (
                <div
                  key={order.id}
                  className="rounded-2xl border bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-gray-900">
                          {order.number}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                            order.status,
                          )}`}
                        >
                          {order.status}
                        </span>

                        {order.monthlyPlanCovered && (
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              getPlanoOSBadgeClass(
                                planInfo as any,
                              )
                            }`}
                          >
                            <ShieldCheck
                              size={13}
                              className="mr-1 inline"
                            />
                            Plano mensal
                          </span>
                        )}
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="flex items-start gap-2">
                          <User
                            size={17}
                            className="mt-0.5 text-gray-400"
                          />

                          <div>
                            <p className="text-xs text-gray-400">
                              Cliente
                            </p>
                            <p className="font-medium text-gray-800">
                              {order.client || "-"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <Wrench
                            size={17}
                            className="mt-0.5 text-gray-400"
                          />

                          <div>
                            <p className="text-xs text-gray-400">
                              Equipamento
                            </p>
                            <p className="font-medium text-gray-800">
                              {order.equipment || "-"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <CalendarDays
                            size={17}
                            className="mt-0.5 text-gray-400"
                          />

                          <div>
                            <p className="text-xs text-gray-400">
                              Data
                            </p>
                            <p className="font-medium text-gray-800">
                              {formatDate(order.date)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <CreditCard
                            size={17}
                            className="mt-0.5 text-gray-400"
                          />

                          <div>
                            <p className="text-xs text-gray-400">
                              Total
                            </p>
                            <p className="font-semibold text-gray-900">
                              {formatCurrency(
                                order.value,
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 lg:max-w-xs lg:justify-end">
                      <button
                        onClick={() =>
                          showOrderDetails(order)
                        }
                        className="rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Ver
                      </button>

                      <button
                        onClick={() =>
                          openEditOrder(order)
                        }
                        className="flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <Edit size={15} />
                        Editar
                      </button>

                      <button
                        onClick={() =>
                          printServiceOrder(order)
                        }
                        className="flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <Printer size={15} />
                        Imprimir
                      </button>

                      <button
                        onClick={() =>
                          sendServiceOrderWhatsApp(
                            order,
                          )
                        }
                        className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
                      >
                        <MessageCircle size={15} />
                        WhatsApp
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          "Aberta",
                          "Agendada",
                          "Em andamento",
                          "Concluída",
                          "Cancelada",
                        ] as ServiceOrderStatus[]
                      ).map((status) => (
                        <button
                          key={status}
                          onClick={() =>
                            changeStatus(
                              order,
                              status,
                            )
                          }
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                            order.status === status
                              ? statusClass(status)
                              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() =>
                        toggleMaterialsPayment(
                          order,
                        )
                      }
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                        order.materialsPaid
                          ? "bg-green-100 text-green-700"
                          : "bg-orange-100 text-orange-700"
                      }`}
                    >
                      <Package size={16} />
                      {order.materialsPaid
                        ? "Materiais pagos"
                        : "Materiais pendentes"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-3 md:p-6">
          <div className="mx-auto my-4 max-w-4xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editingId
                    ? "Editar ordem de serviço"
                    : "Nova ordem de serviço"}
                </h2>

                <p className="text-sm text-gray-500">
                  Preencha os dados do atendimento.
                </p>
              </div>

              <button
                onClick={() =>
                  setShowForm(false)
                }
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                <X size={22} />
              </button>
            </div>

            <div className="space-y-6 p-5">
              <section>
                <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                  <User size={18} />
                  Cliente
                </h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Cliente *
                    </label>

                    <select
                      value={form.clientId}
                      onChange={(event) =>
                        handleClientChange(
                          event.target.value,
                        )
                      }
                      className="w-full rounded-xl border border-gray-300 px-3 py-3 outline-none focus:border-blue-500"
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
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Cidade
                    </label>

                    <input
                      value={form.city}
                      onChange={(event) =>
                        updateForm(
                          "city",
                          event.target.value,
                        )
                      }
                      className="w-full rounded-xl border border-gray-300 px-3 py-3 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </section>

              <section>
                <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                  <Wrench size={18} />
                  Equipamento
                </h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Equipamento
                    </label>

                    <select
                      value={form.equipmentId}
                      onChange={(event) =>
                        handleEquipmentChange(
                          event.target.value,
                        )
                      }
                      disabled={!form.clientId}
                      className="w-full rounded-xl border border-gray-300 px-3 py-3 outline-none disabled:bg-gray-100 focus:border-blue-500"
                    >
                      <option value="">
                        {form.clientId
                          ? "Selecione o equipamento"
                          : "Selecione primeiro o cliente"}
                      </option>

                      {selectedClientEquipments.map(
                        (equipment) => (
                          <option
                            key={equipment.id}
                            value={equipment.id}
                          >
                            {getEquipmentName(
                              equipment,
                            )}
                            {getEquipmentBrand(
                              equipment,
                            )
                              ? ` — ${getEquipmentBrand(
                                  equipment,
                                )}`
                              : ""}
                            {getEquipmentCapacity(
                              equipment,
                            )
                              ? ` — ${getEquipmentCapacity(
                                  equipment,
                                )}`
                              : ""}
                          </option>
                        ),
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Marca
                    </label>

                    <input
                      value={form.equipmentBrand}
                      onChange={(event) =>
                        updateForm(
                          "equipmentBrand",
                          event.target.value,
                        )
                      }
                      className="w-full rounded-xl border border-gray-300 px-3 py-3 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Modelo
                    </label>

                    <input
                      value={form.equipmentModel}
                      onChange={(event) =>
                        updateForm(
                          "equipmentModel",
                          event.target.value,
                        )
                      }
                      className="w-full rounded-xl border border-gray-300 px-3 py-3 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Capacidade / BTUs
                    </label>

                    <input
                      value={form.equipmentCapacity}
                      onChange={(event) =>
                        updateForm(
                          "equipmentCapacity",
                          event.target.value,
                        )
                      }
                      placeholder="Ex.: 12.000 BTUs"
                      className="w-full rounded-xl border border-gray-300 px-3 py-3 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Equipamento informado
                    </label>

                    <input
                      value={form.equipment}
                      onChange={(event) =>
                        updateForm(
                          "equipment",
                          event.target.value,
                        )
                      }
                      placeholder="Ex.: Split Inverter"
                      className="w-full rounded-xl border border-gray-300 px-3 py-3 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </section>

              <section>
                <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                  <ClipboardList size={18} />
                  Serviço
                </h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Tipo de serviço *
                    </label>

                    <select
                      value={form.serviceType}
                      onChange={(event) =>
                        handleServiceChange(
                          event.target
                            .value as ServiceType,
                        )
                      }
                      className="w-full rounded-xl border border-gray-300 px-3 py-3 outline-none focus:border-blue-500"
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
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Data *
                    </label>

                    <input
                      type="date"
                      value={form.date}
                      onChange={(event) =>
                        updateForm(
                          "date",
                          event.target.value,
                        )
                      }
                      className="w-full rounded-xl border border-gray-300 px-3 py-3 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Técnico
                    </label>

                    <select
                      value={form.technicianId}
                      onChange={(event) =>
                        handleTechnicianChange(
                          event.target.value,
                        )
                      }
                      className="w-full rounded-xl border border-gray-300 px-3 py-3 outline-none focus:border-blue-500"
                    >
                      <option value="">
                        Selecione o técnico
                      </option>

                      {technicians.map(
                        (technician) => (
                          <option
                            key={technician.id}
                            value={technician.id}
                          >
                            {technician.nome}
                          </option>
                        ),
                      )}
                    </select>

                    {technicians.length === 0 && (
                      <p className="mt-1 text-xs text-orange-600">
                        Nenhum funcionário com perfil/cargo de técnico foi encontrado.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Status
                    </label>

                    <select
                      value={form.status}
                      onChange={(event) =>
                        updateForm(
                          "status",
                          event.target
                            .value as ServiceOrderStatus,
                        )
                      }
                      className="w-full rounded-xl border border-gray-300 px-3 py-3 outline-none focus:border-blue-500"
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
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Descrição do serviço
                  </label>

                  <textarea
                    value={form.description}
                    onChange={(event) =>
                      updateForm(
                        "description",
                        event.target.value,
                      )
                    }
                    rows={4}
                    placeholder="Descreva o serviço que será realizado..."
                    className="w-full rounded-xl border border-gray-300 px-3 py-3 outline-none focus:border-blue-500"
                  />
                </div>
              </section>

              {(form.monthlyPlanCovered ||
                form.monthlyPlanWarning) && (
                <section className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 text-blue-600" />

                    <div>
                      <h3 className="font-semibold text-blue-900">
                        Plano mensal
                      </h3>

                      {form.monthlyPlanCovered ? (
                        <p className="mt-1 text-sm text-blue-800">
                          Este serviço está coberto pelo plano mensal.
                          {form.monthlyPlanIncludedService
                            ? ` Serviço incluso: ${form.monthlyPlanIncludedService}.`
                            : ""}
                        </p>
                      ) : (
                        <p className="mt-1 text-sm text-orange-700">
                          {form.monthlyPlanWarning}
                        </p>
                      )}
                    </div>
                  </div>
                </section>
              )}

              <section>
                <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                  <CreditCard size={18} />
                  Valores
                </h3>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Valor dos serviços
                    </label>

                    <input
                      value={form.serviceValue}
                      onChange={(event) =>
                        updateForm(
                          "serviceValue",
                          event.target.value,
                        )
                      }
                      placeholder="0,00"
                      inputMode="decimal"
                      className="w-full rounded-xl border border-gray-300 px-3 py-3 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Valor dos materiais
                    </label>

                    <input
                      value={form.materialsValue}
                      onChange={(event) =>
                        updateForm(
                          "materialsValue",
                          event.target.value,
                        )
                      }
                      placeholder="0,00"
                      inputMode="decimal"
                      className="w-full rounded-xl border border-gray-300 px-3 py-3 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Total
                    </label>

                    <div className="rounded-xl border bg-gray-50 px-3 py-3 font-bold text-gray-900">
                      {formatCurrency(
                        parseMoney(
                          form.serviceValue,
                        ) +
                          parseMoney(
                            form.materialsValue,
                          ),
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Descrição dos materiais
                  </label>

                  <textarea
                    value={
                      form.materialsDescription
                    }
                    onChange={(event) =>
                      updateForm(
                        "materialsDescription",
                        event.target.value,
                      )
                    }
                    rows={3}
                    placeholder="Informe os materiais utilizados ou previstos..."
                    className="w-full rounded-xl border border-gray-300 px-3 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <p className="mt-2 text-xs text-gray-500">
                  O pagamento dos materiais pode ser marcado depois que a OS for criada.
                </p>
              </section>

              <section>
                <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                  <MapPin size={18} />
                  Observações
                </h3>

                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    updateForm(
                      "notes",
                      event.target.value,
                    )
                  }
                  rows={4}
                  placeholder="Observações adicionais..."
                  className="w-full rounded-xl border border-gray-300 px-3 py-3 outline-none focus:border-blue-500"
                />
              </section>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t bg-gray-50 p-5 sm:flex-row sm:justify-end">
              <button
                onClick={() =>
                  setShowForm(false)
                }
                disabled={saving}
                className="rounded-xl border border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-white disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                onClick={saveOrder}
                disabled={saving}
                className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Salvando..."
                  : editingId
                    ? "Salvar alterações"
                    : "Criar ordem de serviço"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetails && selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-3 md:p-6">
          <div className="mx-auto my-4 max-w-3xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedOrder.number}
                </h2>

                <p className="text-sm text-gray-500">
                  Detalhes da ordem de serviço
                </p>
              </div>

              <button
                onClick={() =>
                  setShowDetails(false)
                }
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                <X size={22} />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div className="flex flex-wrap gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                    selectedOrder.status,
                  )}`}
                >
                  {selectedOrder.status}
                </span>

                {selectedOrder.monthlyPlanCovered && (
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                    <ShieldCheck
                      size={13}
                      className="mr-1 inline"
                    />
                    Plano mensal
                  </span>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">
                    Cliente
                  </p>
                  <p className="mt-1 font-semibold">
                    {selectedOrder.client}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">
                    Cidade
                  </p>
                  <p className="mt-1 font-semibold">
                    {selectedOrder.city || "-"}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">
                    Equipamento
                  </p>
                  <p className="mt-1 font-semibold">
                    {selectedOrder.equipment || "-"}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">
                    Marca / Modelo
                  </p>
                  <p className="mt-1 font-semibold">
                    {[
                      selectedOrder.equipmentBrand,
                      selectedOrder.equipmentModel,
                    ]
                      .filter(Boolean)
                      .join(" / ") || "-"}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">
                    Capacidade
                  </p>
                  <p className="mt-1 font-semibold">
                    {selectedOrder.equipmentCapacity ||
                      "-"}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">
                    Técnico
                  </p>
                  <p className="mt-1 font-semibold">
                    {selectedOrder.technician ||
                      "Não definido"}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">
                    Serviço
                  </p>
                  <p className="mt-1 font-semibold">
                    {selectedOrder.serviceType}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">
                    Data
                  </p>
                  <p className="mt-1 font-semibold">
                    {formatDate(
                      selectedOrder.date,
                    )}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="mb-2 font-semibold">
                  Descrição
                </h3>

                <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
                  {selectedOrder.description ||
                    "Nenhuma descrição informada."}
                </div>
              </div>

              <div>
                <h3 className="mb-2 font-semibold">
                  Materiais
                </h3>

                <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
                  {selectedOrder.materialsDescription ||
                    "Nenhum material informado."}
                </div>

                <div className="mt-3 flex items-center justify-between rounded-xl border p-4">
                  <div>
                    <p className="font-medium">
                      Pagamento dos materiais
                    </p>

                    <p className="text-sm text-gray-500">
                      {selectedOrder.materialsPaid
                        ? "Pagamento marcado como realizado."
                        : "Pagamento ainda pendente."}
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      toggleMaterialsPayment(
                        selectedOrder,
                      )
                    }
                    className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                      selectedOrder.materialsPaid
                        ? "bg-orange-100 text-orange-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {selectedOrder.materialsPaid
                      ? "Marcar pendente"
                      : "Marcar como pago"}
                  </button>
                </div>
              </div>

              <div>
                <h3 className="mb-2 font-semibold">
                  Valores
                </h3>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-gray-50 p-4">
                    <p className="text-xs text-gray-500">
                      Serviços
                    </p>
                    <p className="mt-1 font-semibold">
                      {formatCurrency(
                        selectedOrder.serviceValue,
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl bg-gray-50 p-4">
                    <p className="text-xs text-gray-500">
                      Materiais
                    </p>
                    <p className="mt-1 font-semibold">
                      {formatCurrency(
                        selectedOrder.materialsValue,
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl bg-blue-50 p-4">
                    <p className="text-xs text-blue-600">
                      Total
                    </p>
                    <p className="mt-1 text-lg font-bold text-blue-700">
                      {formatCurrency(
                        selectedOrder.value,
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-2 font-semibold">
                  Observações
                </h3>

                <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
                  {selectedOrder.notes ||
                    "Nenhuma observação informada."}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-between gap-3 border-t bg-gray-50 p-5">
              <button
                onClick={() =>
                  deleteOrder(selectedOrder)
                }
                className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-3 font-semibold text-white hover:bg-red-700"
              >
                <Trash2 size={17} />
                Excluir
              </button>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() =>
                    printServiceOrder(
                      selectedOrder,
                    )
                  }
                  className="flex items-center gap-2 rounded-xl border bg-white px-4 py-3 font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <Printer size={17} />
                  Imprimir
                </button>

                <button
                  onClick={() =>
                    sendServiceOrderWhatsApp(
                      selectedOrder,
                    )
                  }
                  className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700"
                >
                  <MessageCircle size={17} />
                  WhatsApp
                </button>

                <button
                  onClick={() => {
                    setShowDetails(false);
                    openEditOrder(
                      selectedOrder,
                    );
                  }}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"
                >
                  <Edit size={17} />
                  Editar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
