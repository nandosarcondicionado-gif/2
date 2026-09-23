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
} from "@/lib/monthly-plan";
import {
  getPlanoOSBadgeClass,
  getPlanoOSInfo,
} from "@/lib/plano-os-ui";

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
  cidade?: string | null;
};

type Equipment = {
  id: string;
  cliente_id?: string | null;
  clientId?: string | null;
  nome?: string | null;
  descricao?: string | null;
  marca?: string | null;
  modelo?: string | null;
  capacidade?: string | null;
  btus?: string | null;
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

type BudgetSource = {
  numero?: string | null;
  valor?: number | string | null;
  valor_final?: number | string | null;
  materiais_valor?: number | string | null;
  total_geral?: number | string | null;
};

type ServiceOrder = {
  id: string;
  number: string;
  clientId: string | null;
  client: string;
  equipment: string;
  equipmentId: string | null;
  equipmentBrand: string;
  equipmentModel: string;
  equipmentCapacity: string;
  city: string;
  serviceType: ServiceType;
  description: string;
  date: string;
  technician: string;
  technicianId: string | null;
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
  monthlyPlanStatus: string | null;
  monthlyPlanWarning: string | null;
  monthlyPlanIncludedService: string | null;
};

type FormData = {
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
  value: string;
  materialsValue: string;
  materialsDescription: string;
  status: ServiceOrderStatus;
  notes: string;
  monthlyPlanId: string;
  monthlyPlanCovered: boolean;
  monthlyPlanStatus: string;
  monthlyPlanWarning: string;
  monthlyPlanIncludedService: string;
};

const today = new Date().toISOString().slice(0, 10);

const emptyForm: FormData = {
  clientId: "",
  client: "",
  equipment: "",
  equipmentId: "",
  equipmentBrand: "",
  equipmentModel: "",
  equipmentCapacity: "",
  city: "",
  serviceType: "Preventiva",
  description: "",
  date: today,
  technician: "",
  technicianId: "",
  value: "",
  materialsValue: "",
  materialsDescription: "",
  status: "Aberta",
  notes: "",
  monthlyPlanId: "",
  monthlyPlanCovered: false,
  monthlyPlanStatus: "",
  monthlyPlanWarning: "",
  monthlyPlanIncludedService: "",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
}

function formatDate(value: string) {
  if (!value) return "-";

  const parts = value.split("-");
  if (parts.length !== 3) return value;

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
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

function escapeHtml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getEquipmentClientId(item: Equipment) {
  return item.cliente_id ?? item.clientId ?? null;
}

function getEquipmentName(item: Equipment) {
  return (
    item.nome ||
    item.descricao ||
    [item.tipo, item.marca, item.modelo].filter(Boolean).join(" ") ||
    "Equipamento"
  );
}

function getEquipmentCapacity(item: Equipment) {
  return (
    item.capacidade ||
    item.btus ||
    (item as any).capacidade_btus ||
    (item as any).capacidade_btu ||
    ""
  );
}

function statusClass(status: ServiceOrderStatus) {
  switch (status) {
    case "Concluída":
      return "bg-emerald-100 text-emerald-700";
    case "Cancelada":
      return "bg-red-100 text-red-700";
    case "Em andamento":
      return "bg-blue-100 text-blue-700";
    case "Agendada":
      return "bg-purple-100 text-purple-700";
    default:
      return "bg-amber-100 text-amber-700";
  }
}

function printServiceOrder(order: ServiceOrder) {
  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    alert("Não foi possível abrir a impressão.");
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <title>Ordem de Serviço ${escapeHtml(order.number)}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 30px;
          color: #111827;
        }

        h1 {
          margin: 0;
          font-size: 24px;
        }

        h2 {
          font-size: 16px;
          margin: 24px 0 8px;
          border-bottom: 1px solid #d1d5db;
          padding-bottom: 6px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          border-bottom: 2px solid #111827;
          padding-bottom: 12px;
        }

        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px 24px;
        }

        .item {
          padding: 6px 0;
        }

        .label {
          font-size: 11px;
          color: #6b7280;
          text-transform: uppercase;
        }

        .value {
          font-size: 14px;
          margin-top: 2px;
        }

        .total {
          font-size: 20px;
          font-weight: bold;
          margin-top: 10px;
        }

        .signature {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          margin-top: 80px;
        }

        .line {
          border-top: 1px solid #111827;
          padding-top: 6px;
          text-align: center;
        }

        @media print {
          body {
            margin: 15mm;
          }
        }
      </style>
    </head>

    <body>
      <div class="header">
        <div>
          <h1>Nando's Ar-Condicionado</h1>
          <div>Ordem de Serviço</div>
        </div>

        <div>
          <strong>${escapeHtml(order.number)}</strong><br />
          ${escapeHtml(formatDate(order.date))}
        </div>
      </div>

      <h2>Cliente</h2>

      <div class="grid">
        <div class="item">
          <div class="label">Cliente</div>
          <div class="value">${escapeHtml(order.client)}</div>
        </div>

        <div class="item">
          <div class="label">Cidade</div>
          <div class="value">${escapeHtml(order.city || "-")}</div>
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
          <div class="label">Tipo de serviço</div>
          <div class="value">${escapeHtml(order.serviceType)}</div>
        </div>

        <div class="item">
          <div class="label">Técnico</div>
          <div class="value">${escapeHtml(order.technician || "-")}</div>
        </div>
      </div>

      <div class="item">
        <div class="label">Descrição</div>
        <div class="value">${escapeHtml(order.description || "-")}</div>
      </div>

      <h2>Valores</h2>

      <div class="grid">
        <div class="item">
          <div class="label">Serviço</div>
          <div class="value">${formatCurrency(order.serviceValue)}</div>
        </div>

        <div class="item">
          <div class="label">Materiais</div>
          <div class="value">${formatCurrency(order.materialsValue)}</div>
        </div>
      </div>

      ${
        order.materialsDescription
          ? `
        <div class="item">
          <div class="label">Descrição dos materiais</div>
          <div class="value">${escapeHtml(order.materialsDescription)}</div>
        </div>
      `
          : ""
      }

      <div class="total">
        Total: ${formatCurrency(order.value)}
      </div>

      ${
        order.monthlyPlanCovered
          ? `
        <div style="margin-top:10px;">
          Serviço coberto pelo plano mensal.
        </div>
      `
          : ""
      }

      <h2>Observações</h2>

      <div class="value">
        ${escapeHtml(order.notes || "-")}
      </div>

      <div class="signature">
        <div class="line">Assinatura do cliente</div>
        <div class="line">Assinatura do técnico</div>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();

  printWindow.focus();

  setTimeout(() => {
    printWindow.print();
  }, 300);
}

function sendServiceOrderWhatsApp(order: ServiceOrder) {
  const message = `
*ORDEM DE SERVIÇO - NANDO'S AR-CONDICIONADO*

OS: ${order.number}

*Cliente:* ${order.client}
*Cidade:* ${order.city || "-"}

*Equipamento:* ${order.equipment || "-"}
*Marca:* ${order.equipmentBrand || "-"}
*Modelo:* ${order.equipmentModel || "-"}
*Capacidade:* ${order.equipmentCapacity || "-"}

*Serviço:* ${order.serviceType}
*Técnico:* ${order.technician || "-"}

*Descrição:*
${order.description || "-"}

*Valor do serviço:* ${formatCurrency(order.serviceValue)}
*Materiais:* ${formatCurrency(order.materialsValue)}
${
  order.materialsDescription
    ? `*Descrição dos materiais:* ${order.materialsDescription}`
    : ""
}

*TOTAL:* ${formatCurrency(order.value)}

*Data:* ${formatDate(order.date)}

${order.notes ? `*Observações:*\n${order.notes}` : ""}
`.trim();

  window.open(
    `https://wa.me/?text=${encodeURIComponent(message)}`,
    "_blank"
  );
}

export default function OrdensServicoPage() {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] =
    useState<ServiceOrder | null>(null);

  const [form, setForm] = useState<FormData>(emptyForm);

  const [clientEquipmentLoading, setClientEquipmentLoading] =
    useState(false);

  const [planChecking, setPlanChecking] = useState(false);

  /*
   * MAPA DOS ORÇAMENTOS
   *
   * Serve para corrigir OS antigas que foram criadas pelo orçamento
   * sem gravar separadamente valor_servicos e valor_materiais.
   */
  const [budgetMap, setBudgetMap] = useState<
    Record<string, BudgetSource>
  >({});

  const selectedClientEquipments = useMemo(() => {
    if (!form.clientId) return [];

    return equipments.filter(
      (equipment) =>
        getEquipmentClientId(equipment) === form.clientId
    );
  }, [equipments, form.clientId]);

  const serviceValueNumber = parseMoney(form.value);
  const materialsValueNumber = parseMoney(form.materialsValue);

  const totalValue = serviceValueNumber + materialsValueNumber;

  async function loadData() {
    setLoading(true);

    try {
      const [
        ordersResponse,
        clientsResponse,
        equipmentsResponse,
        techniciansResponse,
        budgetsResponse,
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
          .from("tecnicos")
          .select("id, nome")
          .order("nome", { ascending: true }),

        supabase
          .from("orcamentos")
          .select(
            "numero, valor, valor_final, materiais_valor, total_geral"
          )
          .order("created_at", { ascending: false }),
      ]);

      if (ordersResponse.error) {
        throw ordersResponse.error;
      }

      if (clientsResponse.error) {
        console.error(
          "Erro ao carregar clientes:",
          clientsResponse.error
        );
      }

      if (equipmentsResponse.error) {
        console.error(
          "Erro ao carregar equipamentos:",
          equipmentsResponse.error
        );
      }

      if (techniciansResponse.error) {
        console.error(
          "Erro ao carregar técnicos:",
          techniciansResponse.error
        );
      }

      /*
       * Cria um mapa:
       *
       * número do orçamento -> dados do orçamento
       */
      const newBudgetMap: Record<string, BudgetSource> = {};

      for (const budget of budgetsResponse.data || []) {
        if (!budget.numero) continue;

        newBudgetMap[String(budget.numero).trim()] = budget;
      }

      setBudgetMap(newBudgetMap);

      const mappedOrders: ServiceOrder[] = (
        ordersResponse.data || []
      ).map((item: any) => {
        /*
         * Valores gravados diretamente na OS.
         */
        const rawServiceValue = item.valor_servicos;
        const rawMaterialsValue = item.valor_materiais;
        const rawTotalValue = item.valor;

        const hasServiceValue =
          rawServiceValue !== null &&
          rawServiceValue !== undefined;

        const hasMaterialsValue =
          rawMaterialsValue !== null &&
          rawMaterialsValue !== undefined;

        const hasTotalValue =
          rawTotalValue !== null &&
          rawTotalValue !== undefined;

        let serviceValue = hasServiceValue
          ? Number(rawServiceValue || 0)
          : Number(rawTotalValue || 0);

        let materialsValue = hasMaterialsValue
          ? Number(rawMaterialsValue || 0)
          : 0;

        let totalValueFromDatabase = hasTotalValue
          ? Number(rawTotalValue || 0)
          : serviceValue + materialsValue;

        /*
         * CORREÇÃO PRINCIPAL
         *
         * Se a OS foi gerada automaticamente a partir de um orçamento,
         * procura o número do orçamento nas observações.
         */
        const notes = String(item.observacoes ?? "");

        const budgetMatch = notes.match(
          /orçamento\s+([A-Za-z0-9_-]+)/i
        );

        if (budgetMatch?.[1]) {
          const budgetNumber = String(budgetMatch[1]).trim();

          const sourceBudget = newBudgetMap[budgetNumber];

          if (sourceBudget) {
            const sourceService =
              sourceBudget.valor_final ??
              sourceBudget.valor ??
              0;

            const sourceMaterials =
              sourceBudget.materiais_valor ?? 0;

            const sourceTotal =
              sourceBudget.total_geral ??
              Number(sourceService || 0) +
                Number(sourceMaterials || 0);

            /*
             * Se a OS antiga não possui a divisão dos valores,
             * usa os valores do orçamento.
             */
            if (!hasServiceValue && !hasMaterialsValue) {
              serviceValue = Number(sourceService || 0);

              materialsValue = Number(sourceMaterials || 0);

              totalValueFromDatabase = Number(sourceTotal || 0);
            } else if (!hasMaterialsValue) {
              /*
               * Caso exista valor do serviço mas materiais não estejam
               * gravados, recupera apenas os materiais do orçamento.
               */
              materialsValue = Number(sourceMaterials || 0);

              if (
                hasServiceValue &&
                !hasTotalValue
              ) {
                totalValueFromDatabase =
                  serviceValue + materialsValue;
              }
            }
          }
        }

        /*
         * Segurança:
         * se o total não existir ou estiver zerado enquanto houver
         * serviço/material, calcula novamente.
         */
        if (
          (!hasTotalValue || totalValueFromDatabase === 0) &&
          (serviceValue !== 0 || materialsValue !== 0)
        ) {
          totalValueFromDatabase =
            serviceValue + materialsValue;
        }

        return {
          id: item.id,

          number: String(item.numero ?? ""),

          clientId: item.cliente_id ?? null,

          client: String(item.cliente_nome ?? ""),

          equipment: String(item.equipamento ?? ""),

          equipmentId: item.equipamento_id ?? null,

          equipmentBrand: String(
            item.equipamento_marca ?? ""
          ),

          equipmentModel: String(
            item.equipamento_modelo ?? ""
          ),

          equipmentCapacity: String(
            item.equipamento_capacidade ?? ""
          ),

          city: String(item.cidade ?? ""),

          serviceType:
            (item.tipo_servico as ServiceType) ||
            "Visita técnica",

          description: String(item.descricao ?? ""),

          date: String(item.data ?? ""),

          technician: String(item.tecnico ?? ""),

          technicianId: item.tecnico_id ?? null,

          serviceValue,

          materialsValue,

          materialsDescription: String(
            item.materiais_descricao ?? ""
          ),

          materialsPaid: Boolean(
            item.materiais_pago ?? false
          ),

          materialsPaidAt:
            item.materiais_pago_em ?? null,

          value: totalValueFromDatabase,

          status:
            (item.status as ServiceOrderStatus) ||
            "Aberta",

          notes,

          monthlyPlanId:
            item.plano_mensal_id ?? null,

          monthlyPlanCovered:
            Boolean(item.plano_mensal_coberto),

          monthlyPlanStatus:
            item.plano_mensal_status ?? null,

          monthlyPlanWarning:
            item.plano_mensal_aviso ?? null,

          monthlyPlanIncludedService:
            item.plano_mensal_servico_incluso ?? null,
        };
      });

      setOrders(mappedOrders);

      setClients(
        (clientsResponse.data || []) as Client[]
      );

      setEquipments(
        (equipmentsResponse.data || []) as Equipment[]
      );

      setTechnicians(
        (techniciansResponse.data || []) as Technician[]
      );
    } catch (error: any) {
      console.error("Erro ao carregar ordens:", error);

      alert(
        `Não foi possível carregar as ordens de serviço.\n\n${
          error?.message || "Erro desconhecido."
        }`
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function openNewOrder() {
    setEditingId(null);

    setForm({
      ...emptyForm,
      date: new Date().toISOString().slice(0, 10),
    });

    setShowForm(true);
  }

  function openEditOrder(order: ServiceOrder) {
    setEditingId(order.id);

    setForm({
      clientId: order.clientId || "",
      client: order.client || "",
      equipment: order.equipment || "",
      equipmentId: order.equipmentId || "",
      equipmentBrand: order.equipmentBrand || "",
      equipmentModel: order.equipmentModel || "",
      equipmentCapacity: order.equipmentCapacity || "",
      city: order.city || "",
      serviceType: order.serviceType,
      description: order.description || "",
      date: order.date || today,
      technician: order.technician || "",
      technicianId: order.technicianId || "",
      value: String(order.serviceValue || ""),
      materialsValue: String(
        order.materialsValue || ""
      ),
      materialsDescription:
        order.materialsDescription || "",
      status: order.status,
      notes: order.notes || "",
      monthlyPlanId:
        order.monthlyPlanId || "",
      monthlyPlanCovered:
        order.monthlyPlanCovered || false,
      monthlyPlanStatus:
        order.monthlyPlanStatus || "",
      monthlyPlanWarning:
        order.monthlyPlanWarning || "",
      monthlyPlanIncludedService:
        order.monthlyPlanIncludedService || "",
    });

    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleClientChange(
    clientId: string
  ) {
    const client = clients.find(
      (item) => item.id === clientId
    );

    setForm((current) => ({
      ...current,
      clientId,
      client: client?.nome || "",
      city: client?.cidade || "",
      equipment: "",
      equipmentId: "",
      equipmentBrand: "",
      equipmentModel: "",
      equipmentCapacity: "",
      monthlyPlanId: "",
      monthlyPlanCovered: false,
      monthlyPlanStatus: "",
      monthlyPlanWarning: "",
      monthlyPlanIncludedService: "",
    }));

    if (!clientId) return;

    setClientEquipmentLoading(true);

    try {
      const { data, error } = await supabase
        .from("equipamentos")
        .select("*")
        .eq("cliente_id", clientId)
        .order("created_at", {
          ascending: false,
        });

      if (!error && data) {
        setEquipments((current) => {
          const others = current.filter(
            (item) =>
              getEquipmentClientId(item) !==
              clientId
          );

          return [...data, ...others];
        });
      }
    } catch (error) {
      console.error(
        "Erro ao carregar equipamentos:",
        error
      );
    } finally {
      setClientEquipmentLoading(false);
    }

    await checkPlanForCurrentService(
      clientId,
      form.serviceType,
      parseMoney(form.value)
    );
  }

  function handleEquipmentChange(
    equipmentId: string
  ) {
    const equipment = equipments.find(
      (item) => item.id === equipmentId
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
      equipmentBrand:
        String(equipment.marca || ""),
      equipmentModel:
        String(equipment.modelo || ""),
      equipmentCapacity:
        String(getEquipmentCapacity(equipment)),
    }));
  }

  async function checkPlanForCurrentService(
    clientId: string,
    serviceType: ServiceType,
    normalServiceValue: number
  ) {
    if (!clientId) return;

    setPlanChecking(true);

    try {
      const result =
        await applyMonthlyPlanToServiceOrder({
          clientId,
          service: serviceType,
          normalServiceValue,
        });

      setForm((current) => ({
        ...current,
        monthlyPlanId:
          result.plano_mensal_id || "",
        monthlyPlanCovered:
          Boolean(result.plano_mensal_coberto),
        monthlyPlanStatus:
          result.plano_mensal_status || "",
        monthlyPlanWarning:
          result.plano_mensal_aviso || "",
        monthlyPlanIncludedService:
          result.plano_mensal_servico_incluso ||
          "",
        value: String(result.valor_servicos ?? 0),
      }));
    } catch (error) {
      console.error(
        "Erro ao verificar plano mensal:",
        error
      );
    } finally {
      setPlanChecking(false);
    }
  }

  async function handleServiceChange(
    serviceType: ServiceType
  ) {
    setForm((current) => ({
      ...current,
      serviceType,
    }));

    if (form.clientId) {
      await checkPlanForCurrentService(
        form.clientId,
        serviceType,
        parseMoney(form.value)
      );
    }
  }

  function handleTechnicianChange(
    technicianId: string
  ) {
    const technician = technicians.find(
      (item) => item.id === technicianId
    );

    setForm((current) => ({
      ...current,
      technicianId,
      technician: technician?.nome || "",
    }));
  }

  async function saveOrder() {
    if (!form.clientId) {
      alert("Selecione o cliente.");
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
      const normalServiceValue =
        parseMoney(form.value);

      const materialsValue =
        parseMoney(form.materialsValue);

      const monthlyPlanData =
        await applyMonthlyPlanToServiceOrder({
          clientId: form.clientId,
          service: form.serviceType,
          normalServiceValue,
        });

      const finalServiceValue =
        Number(monthlyPlanData.valor_servicos || 0);

      const finalTotal =
        finalServiceValue + materialsValue;

      const commonData = {
        cliente_id: form.clientId,
        cliente_nome: form.client,
        cidade: form.city || null,

        equipamento:
          form.equipment || null,

        equipamento_id:
          form.equipmentId || null,

        equipamento_marca:
          form.equipmentBrand || null,

        equipamento_modelo:
          form.equipmentModel || null,

        equipamento_capacidade:
          form.equipmentCapacity || null,

        tipo_servico:
          form.serviceType,

        descricao:
          form.description || null,

        data:
          form.date,

        tecnico:
          form.technician || null,

        tecnico_id:
          form.technicianId || null,

        /*
         * VALORES CORRETOS
         */
        valor_servicos:
          finalServiceValue,

        valor_materiais:
          materialsValue,

        materiais_descricao:
          form.materialsDescription || null,

        valor:
          finalTotal,

        status:
          form.status,

        observacoes:
          form.notes || null,

        plano_mensal_id:
          monthlyPlanData.plano_mensal_id ||
          null,

        plano_mensal_coberto:
          Boolean(
            monthlyPlanData.plano_mensal_coberto
          ),

        plano_mensal_status:
          monthlyPlanData.plano_mensal_status ||
          null,

        plano_mensal_aviso:
          monthlyPlanData.plano_mensal_aviso ||
          null,

        plano_mensal_servico_incluso:
          monthlyPlanData.plano_mensal_servico_incluso ||
          null,
      };

      if (editingId) {
        /*
         * Não altera o estado de pagamento dos materiais
         * durante uma edição normal.
         */
        const { error } = await supabase
          .from("ordens_servico")
          .update(commonData)
          .eq("id", editingId);

        if (error) {
          throw error;
        }

        const existingOrder = orders.find(
          (order) => order.id === editingId
        );

        if (
          existingOrder?.monthlyPlanId !==
            monthlyPlanData.plano_mensal_id &&
          monthlyPlanData.plano_mensal_id
        ) {
          await registerPlanUse({
            planoId:
              monthlyPlanData.plano_mensal_id,
            ordemServicoId: editingId,
            clienteId: form.clientId,
            servico: form.serviceType,
          });
        }
      } else {
        const numero = `OS-${Date.now()
          .toString()
          .slice(-6)}`;

        const { data, error } = await supabase
          .from("ordens_servico")
          .insert({
            numero,

            ...commonData,

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
          monthlyPlanData.plano_mensal_id
        ) {
          await registerPlanUse({
            planoId:
              monthlyPlanData.plano_mensal_id,
            ordemServicoId: data.id,
            clienteId: form.clientId,
            servico: form.serviceType,
          });
        }
      }

      alert(
        editingId
          ? "Ordem de serviço atualizada com sucesso!"
          : "Ordem de serviço criada com sucesso!"
      );

      closeForm();

      await loadData();
    } catch (error: any) {
      console.error(
        "Erro ao salvar ordem:",
        error
      );

      alert(
        `Não foi possível salvar a ordem de serviço.\n\n${
          error?.message || "Erro desconhecido."
        }`
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteOrder(order: ServiceOrder) {
    const confirmed = window.confirm(
      `Deseja realmente excluir a OS ${order.number}?`
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

      if (
        selectedOrder?.id === order.id
      ) {
        setSelectedOrder(null);
      }

      await loadData();
    } catch (error: any) {
      console.error(
        "Erro ao excluir OS:",
        error
      );

      alert(
        `Não foi possível excluir a ordem de serviço.\n\n${
          error?.message || "Erro desconhecido."
        }`
      );
    }
  }

  async function changeOrderStatus(
    order: ServiceOrder,
    status: ServiceOrderStatus
  ) {
    try {
      const { error } = await supabase
        .from("ordens_servico")
        .update({ status })
        .eq("id", order.id);

      if (error) {
        throw error;
      }

      setOrders((current) =>
        current.map((item) =>
          item.id === order.id
            ? { ...item, status }
            : item
        )
      );

      setSelectedOrder((current) =>
        current?.id === order.id
          ? { ...current, status }
          : current
      );
    } catch (error: any) {
      console.error(
        "Erro ao alterar status:",
        error
      );

      alert(
        `Não foi possível alterar o status.\n\n${
          error?.message || "Erro desconhecido."
        }`
      );
    }
  }

  async function toggleMaterialsPaid(
    order: ServiceOrder
  ) {
    const newValue = !order.materialsPaid;

    try {
      const { error } = await supabase
        .from("ordens_servico")
        .update({
          materiais_pago: newValue,
          materiais_pago_em: newValue
            ? new Date().toISOString()
            : null,
        })
        .eq("id", order.id);

      if (error) {
        throw error;
      }

      setOrders((current) =>
        current.map((item) =>
          item.id === order.id
            ? {
                ...item,
                materialsPaid: newValue,
                materialsPaidAt: newValue
                  ? new Date().toISOString()
                  : null,
              }
            : item
        )
      );

      setSelectedOrder((current) =>
        current?.id === order.id
          ? {
              ...current,
              materialsPaid: newValue,
              materialsPaidAt: newValue
                ? new Date().toISOString()
                : null,
            }
          : current
      );
    } catch (error: any) {
      console.error(
        "Erro ao alterar pagamento dos materiais:",
        error
      );

      alert(
        `Não foi possível alterar o pagamento dos materiais.\n\n${
          error?.message || "Erro desconhecido."
        }`
      );
    }
  }

  function getCurrentPlanInfo() {
    if (!form.monthlyPlanId) return null;

    return getPlanoOSInfo({
      planoId: form.monthlyPlanId,
      covered: form.monthlyPlanCovered,
      status: form.monthlyPlanStatus,
      warning: form.monthlyPlanWarning,
      includedService:
        form.monthlyPlanIncludedService,
    });
  }

  const filteredOrders = useMemo(() => {
    const normalizedSearch =
      search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          order.number,
          order.client,
          order.city,
          order.equipment,
          order.technician,
          order.serviceType,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "Todos" ||
        order.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  const totalOrders = orders.length;

  const openOrders = orders.filter(
    (order) =>
      order.status === "Aberta" ||
      order.status === "Agendada" ||
      order.status === "Em andamento"
  ).length;

  const completedOrders = orders.filter(
    (order) => order.status === "Concluída"
  ).length;

  const totalValue = orders.reduce(
    (sum, order) => sum + Number(order.value || 0),
    0
  );

  const currentPlanInfo = getCurrentPlanInfo();

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-blue-600 p-3 text-white shadow">
                <ClipboardList size={25} />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Ordens de serviço
                </h1>

                <p className="text-sm text-slate-500">
                  Controle completo dos serviços realizados.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={openNewOrder}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow transition hover:bg-blue-700"
          >
            <Plus size={20} />
            Nova ordem de serviço
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">
                Total
              </span>

              <ClipboardList
                size={20}
                className="text-blue-600"
              />
            </div>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {totalOrders}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">
                Em aberto
              </span>

              <AlertTriangle
                size={20}
                className="text-amber-500"
              />
            </div>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {openOrders}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">
                Concluídas
              </span>

              <CheckCircle2
                size={20}
                className="text-emerald-500"
              />
            </div>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {completedOrders}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">
                Valor total
              </span>

              <CreditCard
                size={20}
                className="text-purple-600"
              />
            </div>

            <p className="mt-2 text-xl font-bold text-slate-900">
              {formatCurrency(totalValue)}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search
                size={19}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Pesquisar OS, cliente, cidade, equipamento ou técnico..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500"
            >
              <option value="Todos">
                Todos os status
              </option>

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

        {loading ? (
          <div className="rounded-2xl border bg-white p-12 text-center shadow-sm">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

            <p className="mt-4 text-sm text-slate-500">
              Carregando ordens de serviço...
            </p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-2xl border bg-white p-12 text-center shadow-sm">
            <ClipboardList
              size={48}
              className="mx-auto text-slate-300"
            />

            <h2 className="mt-4 text-lg font-semibold text-slate-800">
              Nenhuma ordem encontrada
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Cadastre uma nova ordem de serviço para começar.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-bold text-slate-800">
                        {order.number}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                          order.status
                        )}`}
                      >
                        {order.status}
                      </span>

                      {order.monthlyPlanCovered && (
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getPlanoOSBadgeClass(
                            {
                              covered:
                                order.monthlyPlanCovered,
                              status:
                                order.monthlyPlanStatus,
                            }
                          )}`}
                        >
                          Plano mensal
                        </span>
                      )}
                    </div>

                    <h2 className="mt-3 text-lg font-bold text-slate-900">
                      {order.client || "Cliente não informado"}
                    </h2>

                    <div className="mt-2 grid gap-2 text-sm text-slate-600 md:grid-cols-2 lg:grid-cols-4">
                      <div className="flex items-center gap-2">
                        <Wrench size={16} />
                        <span>
                          {order.serviceType}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <CalendarDays size={16} />
                        <span>
                          {formatDate(order.date)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <User size={16} />
                        <span>
                          {order.technician || "Sem técnico"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <MapPin size={16} />
                        <span>
                          {order.city || "-"}
                        </span>
                      </div>
                    </div>

                    {order.equipment && (
                      <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                        <Package size={16} />

                        <span>
                          {order.equipment}

                          {order.equipmentBrand
                            ? ` • ${order.equipmentBrand}`
                            : ""}

                          {order.equipmentModel
                            ? ` • ${order.equipmentModel}`
                            : ""}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-start gap-2 lg:items-end">
                    <div className="text-sm text-slate-500">
                      Serviço
                    </div>

                    <div className="font-semibold text-slate-800">
                      {formatCurrency(
                        order.serviceValue
                      )}
                    </div>

                    <div className="text-sm text-slate-500">
                      Materiais
                    </div>

                    <div className="font-semibold text-slate-800">
                      {formatCurrency(
                        order.materialsValue
                      )}
                    </div>

                    <div className="text-sm text-slate-500">
                      Total
                    </div>

                    <div className="text-xl font-bold text-blue-700">
                      {formatCurrency(order.value)}
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2 border-t pt-4">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedOrder(order)
                    }
                    className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <EyeIcon />
                    Ver detalhes
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      openEditOrder(order)
                    }
                    className="flex items-center gap-2 rounded-lg border border-blue-200 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
                  >
                    <Edit size={16} />
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      printServiceOrder(order)
                    }
                    className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Printer size={16} />
                    Imprimir
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      sendServiceOrderWhatsApp(order)
                    }
                    className="flex items-center gap-2 rounded-lg border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                  >
                    <MessageCircle size={16} />
                    WhatsApp
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      toggleMaterialsPaid(order)
                    }
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${
                      order.materialsPaid
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-amber-200 bg-amber-50 text-amber-700"
                    }`}
                  >
                    <CreditCard size={16} />

                    {order.materialsPaid
                      ? "Materiais pagos"
                      : "Marcar materiais pagos"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      deleteOrder(order)
                    }
                    className="flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
          <div className="mx-auto my-8 max-w-4xl rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingId
                    ? "Editar ordem de serviço"
                    : "Nova ordem de serviço"}
                </h2>

                <p className="text-sm text-slate-500">
                  Preencha os dados da ordem.
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={22} />
              </button>
            </div>

            <div className="space-y-6 p-5">
              <section>
                <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-800">
                  <User size={18} />
                  Cliente
                </h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Cliente *
                    </label>

                    <select
                      value={form.clientId}
                      onChange={(event) =>
                        handleClientChange(
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                    >
                      <option value="">
                        Selecione o cliente
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
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Cidade
                    </label>

                    <input
                      value={form.city}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          city: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </section>

              <section>
                <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-800">
                  <Package size={18} />
                  Equipamento
                </h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Equipamento
                    </label>

                    <select
                      value={form.equipmentId}
                      onChange={(event) =>
                        handleEquipmentChange(
                          event.target.value
                        )
                      }
                      disabled={
                        !form.clientId ||
                        clientEquipmentLoading
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none disabled:bg-slate-100 focus:border-blue-500"
                    >
                      <option value="">
                        {!form.clientId
                          ? "Selecione primeiro o cliente"
                          : clientEquipmentLoading
                          ? "Carregando..."
                          : "Selecione o equipamento"}
                      </option>

                      {selectedClientEquipments.map(
                        (equipment) => (
                          <option
                            key={equipment.id}
                            value={equipment.id}
                          >
                            {getEquipmentName(
                              equipment
                            )}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Capacidade
                    </label>

                    <input
                      value={
                        form.equipmentCapacity
                      }
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          equipmentCapacity:
                            event.target.value,
                        }))
                      }
                      placeholder="Ex.: 12.000 BTUs"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Marca
                    </label>

                    <input
                      value={form.equipmentBrand}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          equipmentBrand:
                            event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Modelo
                    </label>

                    <input
                      value={form.equipmentModel}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          equipmentModel:
                            event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </section>

              <section>
                <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-800">
                  <Wrench size={18} />
                  Serviço
                </h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Tipo de serviço *
                    </label>

                    <select
                      value={form.serviceType}
                      onChange={(event) =>
                        handleServiceChange(
                          event.target
                            .value as ServiceType
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
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
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Data *
                    </label>

                    <input
                      type="date"
                      value={form.date}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          date: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Descrição do serviço
                    </label>

                    <textarea
                      value={form.description}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          description:
                            event.target.value,
                        }))
                      }
                      rows={4}
                      placeholder="Descreva o serviço a ser realizado..."
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </section>

              {currentPlanInfo && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck
                      size={22}
                      className="mt-0.5 text-blue-600"
                    />

                    <div>
                      <h3 className="font-semibold text-blue-900">
                        Plano mensal identificado
                      </h3>

                      <p className="mt-1 text-sm text-blue-800">
                        {form.monthlyPlanWarning ||
                          currentPlanInfo.description ||
                          "Este cliente possui plano mensal aplicável."}
                      </p>

                      {form.monthlyPlanCovered && (
                        <p className="mt-2 text-sm font-semibold text-blue-900">
                          O valor do serviço foi ajustado conforme o plano.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {planChecking && (
                <div className="rounded-xl bg-slate-100 p-3 text-sm text-slate-600">
                  Verificando plano mensal...
                </div>
              )}

              <section>
                <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-800">
                  <CreditCard size={18} />
                  Valores
                </h3>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Valor do serviço
                    </label>

                    <input
                      value={form.value}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          value: event.target.value,
                        }))
                      }
                      disabled={
                        form.monthlyPlanCovered
                      }
                      placeholder="0,00"
                      inputMode="decimal"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none disabled:bg-slate-100 focus:border-blue-500"
                    />

                    {form.monthlyPlanCovered && (
                      <p className="mt-1 text-xs text-blue-600">
                        Valor definido pelo plano mensal.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Valor dos materiais
                    </label>

                    <input
                      value={
                        form.materialsValue
                      }
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          materialsValue:
                            event.target.value,
                        }))
                      }
                      placeholder="0,00"
                      inputMode="decimal"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="rounded-xl bg-blue-50 p-4">
                    <div className="text-sm text-blue-700">
                      Total
                    </div>

                    <div className="mt-1 text-2xl font-bold text-blue-900">
                      {formatCurrency(totalValue)}
                    </div>

                    <div className="mt-1 text-xs text-blue-700">
                      Serviço + materiais
                    </div>
                  </div>

                  <div className="md:col-span-3">
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Descrição dos materiais
                    </label>

                    <textarea
                      value={
                        form.materialsDescription
                      }
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          materialsDescription:
                            event.target.value,
                        }))
                      }
                      rows={3}
                      placeholder="Ex.: 3 metros de tubulação, suporte, isolamento..."
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </section>

              <section>
                <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-800">
                  <User size={18} />
                  Técnico e status
                </h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Técnico
                    </label>

                    <select
                      value={form.technicianId}
                      onChange={(event) =>
                        handleTechnicianChange(
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
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
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Status
                    </label>

                    <select
                      value={form.status}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          status:
                            event.target
                              .value as ServiceOrderStatus,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
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
              </section>

              <section>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Observações
                </label>

                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Observações adicionais..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                />
              </section>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t bg-slate-50 p-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={saveOrder}
                disabled={saving}
                className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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

      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
          <div className="mx-auto my-8 max-w-3xl rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900">
                    {selectedOrder.number}
                  </h2>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                      selectedOrder.status
                    )}`}
                  >
                    {selectedOrder.status}
                  </span>
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  Detalhes da ordem de serviço
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedOrder(null)
                }
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={22} />
              </button>
            </div>

            <div className="space-y-6 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <InfoBox
                  icon={<User size={18} />}
                  label="Cliente"
                  value={
                    selectedOrder.client || "-"
                  }
                />

                <InfoBox
                  icon={<MapPin size={18} />}
                  label="Cidade"
                  value={
                    selectedOrder.city || "-"
                  }
                />

                <InfoBox
                  icon={<Wrench size={18} />}
                  label="Serviço"
                  value={
                    selectedOrder.serviceType
                  }
                />

                <InfoBox
                  icon={<CalendarDays size={18} />}
                  label="Data"
                  value={formatDate(
                    selectedOrder.date
                  )}
                />

                <InfoBox
                  icon={<Package size={18} />}
                  label="Equipamento"
                  value={
                    selectedOrder.equipment || "-"
                  }
                />

                <InfoBox
                  icon={<Wrench size={18} />}
                  label="Técnico"
                  value={
                    selectedOrder.technician ||
                    "-"
                  }
                />
              </div>

              <div>
                <h3 className="mb-2 font-semibold text-slate-800">
                  Descrição do serviço
                </h3>

                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                  {selectedOrder.description ||
                    "Nenhuma descrição informada."}
                </div>
              </div>

              <div>
                <h3 className="mb-3 font-semibold text-slate-800">
                  Valores
                </h3>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-xs text-slate-500">
                      Serviço
                    </div>

                    <div className="mt-1 text-lg font-bold text-slate-900">
                      {formatCurrency(
                        selectedOrder.serviceValue
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-xs text-slate-500">
                      Materiais
                    </div>

                    <div className="mt-1 text-lg font-bold text-slate-900">
                      {formatCurrency(
                        selectedOrder.materialsValue
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl bg-blue-50 p-4">
                    <div className="text-xs text-blue-700">
                      Total
                    </div>

                    <div className="mt-1 text-lg font-bold text-blue-900">
                      {formatCurrency(
                        selectedOrder.value
                      )}
                    </div>
                  </div>
                </div>

                {selectedOrder.materialsDescription && (
                  <div className="mt-3 rounded-xl border border-slate-200 p-4">
                    <div className="text-xs font-semibold uppercase text-slate-500">
                      Materiais
                    </div>

                    <div className="mt-1 text-sm text-slate-700">
                      {
                        selectedOrder.materialsDescription
                      }
                    </div>
                  </div>
                )}
              </div>

              {selectedOrder.monthlyPlanCovered && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                  <div className="flex gap-3">
                    <ShieldCheck
                      size={22}
                      className="text-blue-600"
                    />

                    <div>
                      <h3 className="font-semibold text-blue-900">
                        Serviço coberto pelo plano mensal
                      </h3>

                      {selectedOrder
                        .monthlyPlanIncludedService && (
                        <p className="mt-1 text-sm text-blue-800">
                          {
                            selectedOrder.monthlyPlanIncludedService
                          }
                        </p>
                      )}

                      {selectedOrder
                        .monthlyPlanWarning && (
                        <p className="mt-1 text-sm text-blue-800">
                          {
                            selectedOrder.monthlyPlanWarning
                          }
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h3 className="mb-2 font-semibold text-slate-800">
                  Observações
                </h3>

                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                  {selectedOrder.notes ||
                    "Nenhuma observação."}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">
                      Pagamento dos materiais
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                      {selectedOrder.materialsPaid
                        ? "Materiais marcados como pagos."
                        : "Materiais ainda não marcados como pagos."}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      toggleMaterialsPaid(
                        selectedOrder
                      )
                    }
                    className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                      selectedOrder.materialsPaid
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {selectedOrder.materialsPaid
                      ? "Materiais pagos"
                      : "Marcar como pagos"}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 border-t bg-slate-50 p-5">
              <button
                type="button"
                onClick={() =>
                  printServiceOrder(
                    selectedOrder
                  )
                }
                className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                <Printer size={17} />
                Imprimir
              </button>

              <button
                type="button"
                onClick={() =>
                  sendServiceOrderWhatsApp(
                    selectedOrder
                  )
                }
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                <MessageCircle size={17} />
                WhatsApp
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedOrder(null);
                  openEditOrder(
                    selectedOrder
                  );
                }}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Edit size={17} />
                Editar
              </button>

              <select
                value={selectedOrder.status}
                onChange={(event) =>
                  changeOrderStatus(
                    selectedOrder,
                    event.target
                      .value as ServiceOrderStatus
                  )
                }
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
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

              <button
                type="button"
                onClick={() =>
                  setSelectedOrder(null)
                }
                className="ml-auto rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoBox({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
        {icon}
        {label}
      </div>

      <div className="mt-2 text-sm font-semibold text-slate-800">
        {value}
      </div>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
