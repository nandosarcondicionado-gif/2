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
  cidade?: string | null;
};

type Equipment = {
  id: string;
  cliente_id?: string | null;
  descricao?: string | null;
  equipamento?: string | null;
  marca?: string | null;
  modelo?: string | null;
  btus?: number | string | null;
  capacidade?: number | string | null;
  capacidade_btus?: number | string | null;
  btu?: number | string | null;
  localizacao?: string | null;
  ambiente?: string | null;
  numero_serie?: string | null;
};

type Technician = {
  id: string;
  nome: string;
  status?: string | null;
  cargo?: string | null;
  perfil?: string | null;
};

type ServiceOrder = {
  id: string;
  numero?: number | string | null;
  cliente_id?: string | null;
  cliente_nome?: string | null;
  cliente_cidade?: string | null;
  equipamento_id?: string | null;
  equipamento_nome?: string | null;
  equipamento_capacidade?: string | null;
  tecnico_id?: string | null;
  tecnico_nome?: string | null;
  servico?: string | null;
  descricao?: string | null;
  valor?: number | string | null;
  valor_servico?: number | string | null;
  service_value?: number | string | null;
  status?: ServiceOrderStatus | string | null;
  data?: string | null;
  horario?: string | null;
  endereco?: string | null;
  observacoes?: string | null;
  materiais?: string | null;
  materiais_pago?: boolean | null;
  materiais_pago_em?: string | null;
  plano_mensal_id?: string | null;
  plano_mensal_coberto?: boolean | null;
  plano_mensal_status?: string | null;
  plano_mensal_aviso?: string | null;
  plano_mensal_servico_incluso?: string | null;
  created_at?: string | null;
};

type FormData = {
  clientId: string;
  equipmentId: string;
  technicianId: string;
  serviceType: ServiceType;
  serviceValue: string;
  date: string;
  time: string;
  address: string;
  description: string;
  materials: string;
  observations: string;
  status: ServiceOrderStatus;
  monthlyPlanId: string | null;
  monthlyPlanCovered: boolean;
  monthlyPlanStatus: string;
  monthlyPlanWarning: string;
  monthlyPlanIncludedService: string;
};

const supabase = createClient();

const emptyForm: FormData = {
  clientId: "",
  equipmentId: "",
  technicianId: "",
  serviceType: "Preventiva",
  serviceValue: "0",
  date: "",
  time: "",
  address: "",
  description: "",
  materials: "",
  observations: "",
  status: "Aberta",
  monthlyPlanId: null,
  monthlyPlanCovered: false,
  monthlyPlanStatus: "",
  monthlyPlanWarning: "",
  monthlyPlanIncludedService: "",
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

function formatCurrency(value: unknown) {
  const number = Number(value ?? 0);

  if (!Number.isFinite(number)) {
    return "R$ 0,00";
  }

  return number.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const parts = value.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  return value;
}

function parseMoney(value: string) {
  if (!value) return 0;

  const normalized = value
    .replace(/\s/g, "")
    .replace(/R\$/gi, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim();

  const result = Number(normalized);

  return Number.isFinite(result) ? result : 0;
}

function formatMoneyInput(value: string) {
  const number = parseMoney(value);

  if (!number) return "";

  return number.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function equipmentCapacity(equipment?: Equipment | null) {
  if (!equipment) return "";

  const value =
    equipment.btus ??
    equipment.capacidade ??
    equipment.capacidade_btus ??
    equipment.btu;

  if (value === null || value === undefined || value === "") {
    return "";
  }

  const numeric = Number(value);

  if (Number.isFinite(numeric)) {
    return `${numeric.toLocaleString("pt-BR")} BTUs`;
  }

  return String(value);
}

function equipmentName(equipment?: Equipment | null) {
  if (!equipment) return "Equipamento";

  return (
    equipment.descricao ||
    equipment.equipamento ||
    [equipment.marca, equipment.modelo].filter(Boolean).join(" ") ||
    "Equipamento"
  );
}

function statusClass(status?: string | null) {
  switch (status) {
    case "Concluída":
      return "bg-green-100 text-green-700";
    case "Cancelada":
      return "bg-red-100 text-red-700";
    case "Em andamento":
      return "bg-blue-100 text-blue-700";
    case "Agendada":
      return "bg-purple-100 text-purple-700";
    default:
      return "bg-yellow-100 text-yellow-700";
  }
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function printServiceOrder(order: ServiceOrder) {
  const popup = window.open("", "_blank", "width=900,height=800");

  if (!popup) {
    alert("Não foi possível abrir a impressão.");
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Ordem de Serviço</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            color: #111;
          }

          h1 {
            margin-bottom: 5px;
          }

          .subtitle {
            color: #666;
            margin-bottom: 30px;
          }

          .box {
            border: 1px solid #ddd;
            border-radius: 10px;
            padding: 18px;
            margin-bottom: 15px;
          }

          .label {
            color: #666;
            font-size: 12px;
            text-transform: uppercase;
            margin-bottom: 4px;
          }

          .value {
            font-size: 16px;
            font-weight: 600;
          }

          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
          }

          @media print {
            body {
              padding: 15px;
            }
          }
        </style>
      </head>

      <body>
        <h1>Nando's Ar-Condicionado</h1>
        <div class="subtitle">ORDEM DE SERVIÇO #${escapeHtml(
          order.numero || order.id.slice(0, 8),
        )}</div>

        <div class="grid">
          <div class="box">
            <div class="label">Cliente</div>
            <div class="value">${escapeHtml(order.cliente_nome)}</div>
          </div>

          <div class="box">
            <div class="label">Cidade</div>
            <div class="value">${escapeHtml(order.cliente_cidade)}</div>
          </div>

          <div class="box">
            <div class="label">Serviço</div>
            <div class="value">${escapeHtml(order.servico)}</div>
          </div>

          <div class="box">
            <div class="label">Status</div>
            <div class="value">${escapeHtml(order.status)}</div>
          </div>

          <div class="box">
            <div class="label">Técnico</div>
            <div class="value">${escapeHtml(order.tecnico_nome)}</div>
          </div>

          <div class="box">
            <div class="label">Data</div>
            <div class="value">${escapeHtml(
              formatDate(order.data),
            )} ${escapeHtml(order.horario)}</div>
          </div>
        </div>

        <div class="box">
          <div class="label">Equipamento</div>
          <div class="value">
            ${escapeHtml(order.equipamento_nome)}
            ${
              order.equipamento_capacidade
                ? `<br>${escapeHtml(order.equipamento_capacidade)}`
                : ""
            }
          </div>
        </div>

        <div class="box">
          <div class="label">Endereço</div>
          <div class="value">${escapeHtml(order.endereco)}</div>
        </div>

        <div class="box">
          <div class="label">Descrição</div>
          <div>${escapeHtml(order.descricao)}</div>
        </div>

        <div class="box">
          <div class="label">Materiais</div>
          <div>${escapeHtml(order.materiais)}</div>
        </div>

        <div class="box">
          <div class="label">Observações</div>
          <div>${escapeHtml(order.observacoes)}</div>
        </div>

        <div class="box">
          <div class="label">Valor do serviço</div>
          <div class="value">${formatCurrency(
            order.valor_servico ?? order.valor ?? 0,
          )}</div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  popup.document.write(html);
  popup.document.close();
}

function sendServiceOrderWhatsApp(order: ServiceOrder) {
  const text = [
    `*Nando's Ar-Condicionado*`,
    `*ORDEM DE SERVIÇO #${order.numero || order.id.slice(0, 8)}*`,
    "",
    `Cliente: ${order.cliente_nome || "—"}`,
    `Cidade: ${order.cliente_cidade || "—"}`,
    `Serviço: ${order.servico || "—"}`,
    `Técnico: ${order.tecnico_nome || "—"}`,
    `Data: ${formatDate(order.data)} ${order.horario || ""}`,
    `Equipamento: ${order.equipamento_nome || "—"}`,
    order.equipamento_capacidade
      ? `Capacidade: ${order.equipamento_capacidade}`
      : "",
    `Status: ${order.status || "—"}`,
    `Valor: ${formatCurrency(
      order.valor_servico ?? order.valor ?? 0,
    )}`,
    "",
    order.descricao ? `Descrição: ${order.descricao}` : "",
    order.observacoes ? `Observações: ${order.observacoes}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;

  window.open(url, "_blank");
}

export default function OrdemServicoPage() {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");

  const [modalOpen, setModalOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] =
    useState<ServiceOrder | null>(null);

  const [form, setForm] = useState<FormData>(emptyForm);

  async function loadData() {
    setLoading(true);

    try {
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
          .select(
            "id, nome, status, cargo, perfil",
          )
          .eq("status", "Ativo")
          .order("nome", { ascending: true }),
      ]);

      if (ordersResult.error) {
        console.error(
          "Erro ao carregar ordens:",
          ordersResult.error,
        );
      }

      if (clientsResult.error) {
        console.error(
          "Erro ao carregar clientes:",
          clientsResult.error,
        );
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

      setOrders(
        (ordersResult.data || []) as ServiceOrder[],
      );

      setClients(
        (clientsResult.data || []) as Client[],
      );

      setEquipments(
        (equipmentsResult.data || []) as Equipment[],
      );

      const employeeList =
        (techniciansResult.data || []) as Technician[];

      const technicianList = employeeList.filter(
        (employee) => {
          const cargo = String(
            employee.cargo || "",
          ).toLowerCase();

          const perfil = String(
            employee.perfil || "",
          ).toLowerCase();

          return (
            cargo === "técnico" ||
            cargo === "tecnico" ||
            cargo.includes("técnico") ||
            cargo.includes("tecnico") ||
            perfil === "técnico" ||
            perfil === "tecnico"
          );
        },
      );

      setTechnicians(technicianList);
    } catch (error) {
      console.error(
        "Erro geral ao carregar dados:",
        error,
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredOrders = useMemo(() => {
    const term = search.toLowerCase().trim();

    return orders.filter((order) => {
      const matchesStatus =
        statusFilter === "Todos" ||
        order.status === statusFilter;

      if (!matchesStatus) return false;

      if (!term) return true;

      return [
        order.numero,
        order.cliente_nome,
        order.cliente_cidade,
        order.tecnico_nome,
        order.servico,
        order.equipamento_nome,
        order.status,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLowerCase()
            .includes(term),
        );
    });
  }, [orders, search, statusFilter]);

  const counts = useMemo(
    () => ({
      total: orders.length,
      abertas: orders.filter(
        (item) => item.status === "Aberta",
      ).length,
      agendadas: orders.filter(
        (item) => item.status === "Agendada",
      ).length,
      andamento: orders.filter(
        (item) => item.status === "Em andamento",
      ).length,
      concluidas: orders.filter(
        (item) => item.status === "Concluída",
      ).length,
    }),
    [orders],
  );

  const selectedClient = clients.find(
    (client) => client.id === form.clientId,
  );

  const clientEquipments = equipments.filter(
    (equipment) =>
      !form.clientId ||
      equipment.cliente_id === form.clientId,
  );

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
        valor_servicos: serviceValue,
        servicoCoberto: false,
        avisoTecnico: "",
        mensagemPlano: "",
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
        valor_servicos: serviceValue,
        servicoCoberto: false,
        avisoTecnico: "",
        mensagemPlano: "",
      };
    }
  }

  async function updatePlanPreview(
    clientId: string,
    serviceType: ServiceType,
    serviceValue: number,
  ) {
    const result =
      await checkPlanForCurrentService(
        clientId,
        serviceType,
        serviceValue,
      );

    setForm((current) => ({
      ...current,

      monthlyPlanId:
        result.plano_mensal_id ?? null,

      monthlyPlanCovered:
        Boolean(
          result.plano_mensal_coberto,
        ),

      monthlyPlanStatus:
        result.plano_mensal_status ?? "",

      monthlyPlanWarning:
        result.plano_mensal_aviso ?? "",

      monthlyPlanIncludedService:
        result.plano_mensal_servico_incluso ??
        "",

      serviceValue: String(
        result.valor_servicos ??
          parseMoney(current.serviceValue),
      ),
    }));
  }

  function openNewModal() {
    setEditingId(null);
    setForm({
      ...emptyForm,
      date: new Date()
        .toISOString()
        .slice(0, 10),
    });
    setModalOpen(true);
  }

  function openEditModal(order: ServiceOrder) {
    setEditingId(order.id);

    setForm({
      clientId: order.cliente_id || "",
      equipmentId:
        order.equipamento_id || "",
      technicianId:
        order.tecnico_id || "",
      serviceType:
        (order.servico as ServiceType) ||
        "Preventiva",
      serviceValue: String(
        order.valor_servico ??
          order.valor ??
          "",
      ),
      date: order.data || "",
      time: order.horario || "",
      address: order.endereco || "",
      description:
        order.descricao || "",
      materials:
        order.materiais || "",
      observations:
        order.observacoes || "",
      status:
        (order.status as ServiceOrderStatus) ||
        "Aberta",

      monthlyPlanId:
        order.plano_mensal_id ?? null,

      monthlyPlanCovered:
        Boolean(
          order.plano_mensal_coberto,
        ),

      monthlyPlanStatus:
        order.plano_mensal_status || "",

      monthlyPlanWarning:
        order.plano_mensal_aviso || "",

      monthlyPlanIncludedService:
        order.plano_mensal_servico_incluso ||
        "",
    });

    setModalOpen(true);
  }

  function openDetails(order: ServiceOrder) {
    setSelectedOrder(order);
    setDetailsOpen(true);
  }

  function handleClientChange(
    clientId: string,
  ) {
    const client = clients.find(
      (item) => item.id === clientId,
    );

    setForm((current) => ({
      ...current,
      clientId,
      equipmentId: "",
      address:
        current.address ||
        client?.cidade ||
        "",
    }));

    void updatePlanPreview(
      clientId,
      form.serviceType,
      parseMoney(form.serviceValue),
    );
  }

  function handleServiceChange(
    serviceType: ServiceType,
  ) {
    setForm((current) => ({
      ...current,
      serviceType,
    }));

    void updatePlanPreview(
      form.clientId,
      serviceType,
      parseMoney(form.serviceValue),
    );
  }

  async function saveOrder() {
    if (!form.clientId) {
      alert("Selecione o cliente.");
      return;
    }

    if (!form.serviceType) {
      alert("Selecione o serviço.");
      return;
    }

    setSaving(true);

    try {
      const client = clients.find(
        (item) => item.id === form.clientId,
      );

      const equipment = equipments.find(
        (item) => item.id === form.equipmentId,
      );

      const technician = technicians.find(
        (item) => item.id === form.technicianId,
      );

      const serviceValue = parseMoney(
        form.serviceValue,
      );

      const planResult =
        await checkPlanForCurrentService(
          form.clientId,
          form.serviceType,
          serviceValue,
        );

      const finalValue =
        Number(
          planResult.valor_servicos ??
            serviceValue,
        );

      const commonData = {
        cliente_id: form.clientId,
        cliente_nome:
          client?.nome || "",
        cliente_cidade:
          client?.cidade || "",

        equipamento_id:
          form.equipmentId || null,

        equipamento_nome:
          equipmentName(equipment),

        equipamento_capacidade:
          equipmentCapacity(equipment) ||
          null,

        tecnico_id:
          form.technicianId || null,

        tecnico_nome:
          technician?.nome ||
          "",

        servico:
          form.serviceType,

        descricao:
          form.description,

        valor_servico:
          finalValue,

        status:
          form.status,

        data:
          form.date || null,

        horario:
          form.time || null,

        endereco:
          form.address,

        observacoes:
          form.observations,

        materiais:
          form.materials,

        plano_mensal_id:
          planResult.plano_mensal_id ??
          null,

        plano_mensal_coberto:
          Boolean(
            planResult.plano_mensal_coberto,
          ),

        plano_mensal_status:
          planResult.plano_mensal_status ||
          "",

        plano_mensal_aviso:
          planResult.plano_mensal_aviso ||
          "",

        plano_mensal_servico_incluso:
          planResult.plano_mensal_servico_incluso ||
          "",
      };

      if (editingId) {
        const currentOrder =
          orders.find(
            (item) =>
              item.id === editingId,
          );

        const { error } =
          await supabase
            .from("ordens_servico")
            .update({
              ...commonData,

              materiais_pago:
                currentOrder?.materiais_pago ??
                false,

              materiais_pago_em:
                currentOrder?.materiais_pago_em ??
                null,
            })
            .eq("id", editingId);

        if (error) {
          throw error;
        }

        try {
          if (
            planResult.plano_mensal_id &&
            planResult.plano_mensal_coberto
          ) {
            await registerPlanUse({
              planoId:
                planResult.plano_mensal_id,
              ordemServicoId:
                editingId,
              service:
                form.serviceType,
            });
          }
        } catch (planError) {
          console.error(
            "Erro ao registrar uso do plano:",
            planError,
          );
        }
      } else {
        const { data, error } =
          await supabase
            .from("ordens_servico")
            .insert({
              ...commonData,
              materiais_pago: false,
              materiais_pago_em: null,
            })
            .select()
            .single();

        if (error) {
          throw error;
        }

        try {
          if (
            data?.id &&
            planResult.plano_mensal_id &&
            planResult.plano_mensal_coberto
          ) {
            await registerPlanUse({
              planoId:
                planResult.plano_mensal_id,
              ordemServicoId:
                data.id,
              service:
                form.serviceType,
            });
          }
        } catch (planError) {
          console.error(
            "Erro ao registrar uso do plano:",
            planError,
          );
        }
      }

      setModalOpen(false);
      setEditingId(null);
      setForm(emptyForm);

      await loadData();
    } catch (error: any) {
      console.error(
        "Erro ao salvar ordem:",
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
      `Deseja realmente excluir a Ordem de Serviço #${
        order.numero || order.id.slice(0, 8)
      }?`,
    );

    if (!confirmed) return;

    try {
      const { error } =
        await supabase
          .from("ordens_servico")
          .delete()
          .eq("id", order.id);

      if (error) {
        throw error;
      }

      await loadData();
    } catch (error: any) {
      console.error(
        "Erro ao excluir ordem:",
        error,
      );

      alert(
        `Não foi possível excluir.\n\n${
          error?.message ||
          "Erro desconhecido."
        }`,
      );
    }
  }

  async function updateStatus(
    order: ServiceOrder,
    status: ServiceOrderStatus,
  ) {
    try {
      const { error } =
        await supabase
          .from("ordens_servico")
          .update({ status })
          .eq("id", order.id);

      if (error) {
        throw error;
      }

      await loadData();

      if (
        selectedOrder?.id === order.id
      ) {
        setSelectedOrder({
          ...order,
          status,
        });
      }
    } catch (error: any) {
      console.error(
        "Erro ao atualizar status:",
        error,
      );

      alert(
        `Não foi possível atualizar o status.\n\n${
          error?.message ||
          "Erro desconhecido."
        }`,
      );
    }
  }

  async function toggleMaterialsPaid(
    order: ServiceOrder,
  ) {
    const newValue =
      !Boolean(order.materiais_pago);

    try {
      const { error } =
        await supabase
          .from("ordens_servico")
          .update({
            materiais_pago:
              newValue,

            materiais_pago_em:
              newValue
                ? new Date().toISOString()
                : null,
          })
          .eq("id", order.id);

      if (error) {
        throw error;
      }

      await loadData();
    } catch (error: any) {
      console.error(
        "Erro ao atualizar pagamento:",
        error,
      );

      alert(
        `Não foi possível atualizar o pagamento.\n\n${
          error?.message ||
          "Erro desconhecido."
        }`,
      );
    }
  }

  function getPlanBadge(
    order: ServiceOrder,
  ) {
    try {
      return getPlanoOSInfo({
        plano_mensal_coberto:
          Boolean(
            order.plano_mensal_coberto,
          ),
        plano_mensal_status:
          order.plano_mensal_status ||
          "",
        plano_mensal_aviso:
          order.plano_mensal_aviso ||
          "",
        plano_mensal_servico_incluso:
          order.plano_mensal_servico_incluso ||
          "",
      });
    } catch {
      return null;
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-600 p-3 text-white">
                <ClipboardList size={24} />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Ordens de Serviço
                </h1>

                <p className="text-sm text-slate-500">
                  Controle de serviços,
                  técnicos e atendimentos.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={openNewModal}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus size={20} />
            Nova ordem de serviço
          </button>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">
              Total
            </p>
            <p className="mt-1 text-2xl font-bold">
              {counts.total}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">
              Abertas
            </p>
            <p className="mt-1 text-2xl font-bold text-yellow-600">
              {counts.abertas}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">
              Agendadas
            </p>
            <p className="mt-1 text-2xl font-bold text-purple-600">
              {counts.agendadas}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">
              Em andamento
            </p>
            <p className="mt-1 text-2xl font-bold text-blue-600">
              {counts.andamento}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">
              Concluídas
            </p>
            <p className="mt-1 text-2xl font-bold text-green-600">
              {counts.concluidas}
            </p>
          </div>
        </div>

        <div className="mb-5 flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search
              size={19}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Buscar por cliente, técnico, serviço..."
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value,
              )
            }
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500"
          >
            <option value="Todos">
              Todos os status
            </option>

            {statuses.map((status) => (
              <option
                key={status}
                value={status}
              >
                {status}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

            <p className="text-sm text-slate-500">
              Carregando ordens de serviço...
            </p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <ClipboardList
              size={42}
              className="mx-auto mb-3 text-slate-300"
            />

            <h2 className="font-semibold text-slate-700">
              Nenhuma ordem encontrada
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Crie uma nova ordem de serviço
              para começar.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredOrders.map(
              (order) => {
                const plan =
                  getPlanBadge(order);

                return (
                  <div
                    key={order.id}
                    className="rounded-2xl bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-900">
                            OS #
                            {order.numero ||
                              order.id.slice(
                                0,
                                8,
                              )}
                          </span>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                              order.status,
                            )}`}
                          >
                            {order.status ||
                              "Aberta"}
                          </span>

                          {plan &&
                            order.plano_mensal_coberto && (
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${getPlanoOSBadgeClass(
                                  plan,
                                )}`}
                              >
                                <ShieldCheck
                                  size={13}
                                  className="mr-1 inline"
                                />
                                Plano mensal
                              </span>
                            )}
                        </div>

                        <h2 className="text-lg font-bold text-slate-900">
                          {order.cliente_nome ||
                            "Cliente não informado"}
                        </h2>

                        <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2 lg:grid-cols-4">
                          <div className="flex items-center gap-2">
                            <Wrench
                              size={16}
                              className="text-blue-600"
                            />

                            <span>
                              {order.servico ||
                                "Serviço"}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <User
                              size={16}
                              className="text-blue-600"
                            />

                            <span>
                              {order.tecnico_nome ||
                                "Técnico não cadastrado"}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <CalendarDays
                              size={16}
                              className="text-blue-600"
                            />

                            <span>
                              {formatDate(
                                order.data,
                              )}{" "}
                              {order.horario ||
                                ""}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Package
                              size={16}
                              className="text-blue-600"
                            />

                            <span>
                              {order.equipamento_nome ||
                                "Equipamento não informado"}
                            </span>
                          </div>
                        </div>

                        {order.equipamento_capacidade && (
                          <p className="mt-2 text-xs text-slate-500">
                            Capacidade:{" "}
                            {
                              order.equipamento_capacidade
                            }
                          </p>
                        )}

                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <span className="text-lg font-bold text-slate-900">
                            {formatCurrency(
                              order.valor_servico ??
                                order.valor ??
                                0,
                            )}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              toggleMaterialsPaid(
                                order,
                              )
                            }
                            className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                              order.materiais_pago
                                ? "bg-green-100 text-green-700"
                                : "bg-orange-100 text-orange-700"
                            }`}
                          >
                            <CreditCard
                              size={13}
                            />

                            {order.materiais_pago
                              ? "Materiais pagos"
                              : "Materiais pendentes"}
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 lg:max-w-xs lg:justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            openDetails(
                              order,
                            )
                          }
                          className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                          title="Ver detalhes"
                        >
                          <Search
                            size={18}
                          />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            openEditModal(
                              order,
                            )
                          }
                          className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                          title="Editar"
                        >
                          <Edit
                            size={18}
                          />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            printServiceOrder(
                              order,
                            )
                          }
                          className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                          title="Imprimir"
                        >
                          <Printer
                            size={18}
                          />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            sendServiceOrderWhatsApp(
                              order,
                            )
                          }
                          className="rounded-lg border border-green-200 bg-green-50 p-2 text-green-600 hover:bg-green-100"
                          title="Enviar WhatsApp"
                        >
                          <MessageCircle
                            size={18}
                          />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            deleteOrder(
                              order,
                            )
                          }
                          className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 hover:bg-red-100"
                          title="Excluir"
                        >
                          <Trash2
                            size={18}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              },
            )}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
          <div className="mx-auto my-8 max-w-4xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingId
                    ? "Editar Ordem de Serviço"
                    : "Nova Ordem de Serviço"}
                </h2>

                <p className="text-sm text-slate-500">
                  Preencha os dados do atendimento.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setModalOpen(false)
                }
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={22} />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Cliente *
                </label>

                <select
                  value={form.clientId}
                  onChange={(event) =>
                    handleClientChange(
                      event.target.value,
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                >
                  <option value="">
                    Selecione o cliente
                  </option>

                  {clients.map(
                    (client) => (
                      <option
                        key={client.id}
                        value={client.id}
                      >
                        {client.nome}
                        {client.cidade
                          ? ` — ${client.cidade}`
                          : ""}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    Equipamento
                  </label>

                  <select
                    value={
                      form.equipmentId
                    }
                    onChange={(event) => {
                      const id =
                        event.target
                          .value;

                      const equipment =
                        equipments.find(
                          (item) =>
                            item.id === id,
                        );

                      setForm(
                        (current) => ({
                          ...current,
                          equipmentId:
                            id,
                          address:
                            current.address ||
                            equipment?.localizacao ||
                            equipment?.ambiente ||
                            "",
                        }),
                      );
                    }}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  >
                    <option value="">
                      Selecione o equipamento
                    </option>

                    {clientEquipments.map(
                      (equipment) => (
                        <option
                          key={
                            equipment.id
                          }
                          value={
                            equipment.id
                          }
                        >
                          {equipmentName(
                            equipment,
                          )}
                          {equipmentCapacity(
                            equipment,
                          )
                            ? ` — ${equipmentCapacity(
                                equipment,
                              )}`
                            : ""}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    Técnico
                  </label>

                  <select
                    value={
                      form.technicianId
                    }
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          technicianId:
                            event.target
                              .value,
                        }),
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
                          key={
                            technician.id
                          }
                          value={
                            technician.id
                          }
                        >
                          {technician.nome}
                        </option>
                      ),
                    )}
                  </select>

                  {technicians.length ===
                    0 && (
                    <p className="mt-1 text-xs text-orange-600">
                      Nenhum funcionário
                      cadastrado como
                      técnico foi encontrado.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    Tipo de serviço *
                  </label>

                  <select
                    value={
                      form.serviceType
                    }
                    onChange={(event) =>
                      handleServiceChange(
                        event.target
                          .value as ServiceType,
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  >
                    {serviceTypes.map(
                      (service) => (
                        <option
                          key={service}
                          value={service}
                        >
                          {service}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    Valor do serviço
                  </label>

                  <input
                    value={
                      form.serviceValue
                    }
                    onChange={(event) => {
                      setForm(
                        (current) => ({
                          ...current,
                          serviceValue:
                            event.target
                              .value,
                        }),
                      );
                    }}
                    onBlur={() => {
                      const value =
                        parseMoney(
                          form.serviceValue,
                        );

                      void updatePlanPreview(
                        form.clientId,
                        form.serviceType,
                        value,
                      );
                    }}
                    placeholder="0,00"
                    inputMode="decimal"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    Status
                  </label>

                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          status:
                            event.target
                              .value as ServiceOrderStatus,
                        }),
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  >
                    {statuses.map(
                      (status) => (
                        <option
                          key={status}
                          value={status}
                        >
                          {status}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              </div>

              {form.monthlyPlanCovered && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                  <div className="flex gap-3">
                    <ShieldCheck
                      size={22}
                      className="mt-0.5 text-green-600"
                    />

                    <div>
                      <p className="font-semibold text-green-800">
                        Serviço coberto pelo plano mensal
                      </p>

                      {form.monthlyPlanIncludedService && (
                        <p className="mt-1 text-sm text-green-700">
                          Serviço incluso:{" "}
                          {
                            form.monthlyPlanIncludedService
                          }
                        </p>
                      )}

                      {form.monthlyPlanWarning && (
                        <p className="mt-1 text-sm text-green-700">
                          {
                            form.monthlyPlanWarning
                          }
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {!form.monthlyPlanCovered &&
                form.monthlyPlanWarning && (
                  <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                    <div className="flex gap-3">
                      <AlertTriangle
                        size={22}
                        className="mt-0.5 text-orange-600"
                      />

                      <p className="text-sm text-orange-800">
                        {
                          form.monthlyPlanWarning
                        }
                      </p>
                    </div>
                  </div>
                )}

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    Data
                  </label>

                  <input
                    type="date"
                    value={form.date}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          date:
                            event.target
                              .value,
                        }),
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    Horário
                  </label>

                  <input
                    type="time"
                    value={form.time}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          time:
                            event.target
                              .value,
                        }),
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    Cidade
                  </label>

                  <input
                    value={
                      selectedClient?.cidade ||
                      ""
                    }
                    readOnly
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-600"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Endereço
                </label>

                <div className="relative">
                  <MapPin
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    value={form.address}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          address:
                            event.target
                              .value,
                        }),
                      )
                    }
                    placeholder="Endereço do atendimento"
                    className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Descrição do serviço
                </label>

                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        description:
                          event.target
                            .value,
                      }),
                    )
                  }
                  rows={4}
                  placeholder="Descreva o serviço que será realizado..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Materiais
                </label>

                <textarea
                  value={form.materials}
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        materials:
                          event.target
                            .value,
                      }),
                    )
                  }
                  rows={3}
                  placeholder="Materiais necessários..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Observações
                </label>

                <textarea
                  value={
                    form.observations
                  }
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        observations:
                          event.target
                            .value,
                      }),
                    )
                  }
                  rows={3}
                  placeholder="Observações adicionais..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 p-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() =>
                  setModalOpen(false)
                }
                className="rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={saveOrder}
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

      {detailsOpen &&
        selectedOrder && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
            <div className="mx-auto my-8 max-w-3xl rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 p-5">
                <div>
                  <h2 className="text-xl font-bold">
                    Ordem de Serviço #
                    {selectedOrder.numero ||
                      selectedOrder.id.slice(
                        0,
                        8,
                      )}
                  </h2>

                  <p className="text-sm text-slate-500">
                    Detalhes do atendimento
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setDetailsOpen(false)
                  }
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                >
                  <X size={22} />
                </button>
              </div>

              <div className="space-y-4 p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-400">
                      Cliente
                    </p>

                    <p className="mt-1 font-semibold">
                      {
                        selectedOrder.cliente_nome
                      }
                    </p>

                    <p className="text-sm text-slate-500">
                      {
                        selectedOrder.cliente_cidade
                      }
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-400">
                      Técnico
                    </p>

                    <p className="mt-1 font-semibold">
                      {selectedOrder.tecnico_nome ||
                        "Técnico não cadastrado"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-400">
                      Serviço
                    </p>

                    <p className="mt-1 font-semibold">
                      {
                        selectedOrder.servico
                      }
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-400">
                      Data e horário
                    </p>

                    <p className="mt-1 font-semibold">
                      {formatDate(
                        selectedOrder.data,
                      )}{" "}
                      {
                        selectedOrder.horario
                      }
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4 md:col-span-2">
                    <p className="text-xs font-semibold uppercase text-slate-400">
                      Equipamento
                    </p>

                    <p className="mt-1 font-semibold">
                      {
                        selectedOrder.equipamento_nome
                      }
                    </p>

                    {selectedOrder.equipamento_capacidade && (
                      <p className="text-sm text-slate-500">
                        {
                          selectedOrder.equipamento_capacidade
                        }
                      </p>
                    )}
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4 md:col-span-2">
                    <p className="text-xs font-semibold uppercase text-slate-400">
                      Endereço
                    </p>

                    <p className="mt-1">
                      {
                        selectedOrder.endereco ||
                        "Não informado"
                      }
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4 md:col-span-2">
                    <p className="text-xs font-semibold uppercase text-slate-400">
                      Descrição
                    </p>

                    <p className="mt-1 whitespace-pre-wrap">
                      {
                        selectedOrder.descricao ||
                        "Não informado"
                      }
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-400">
                      Valor
                    </p>

                    <p className="mt-1 text-xl font-bold">
                      {formatCurrency(
                        selectedOrder.valor_servico ??
                          selectedOrder.valor ??
                          0,
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-400">
                      Materiais
                    </p>

                    <p className="mt-1">
                      {selectedOrder.materiais ||
                        "Nenhum informado"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4 md:col-span-2">
                    <p className="text-xs font-semibold uppercase text-slate-400">
                      Observações
                    </p>

                    <p className="mt-1 whitespace-pre-wrap">
                      {
                        selectedOrder.observacoes ||
                        "Nenhuma"
                      }
                    </p>
                  </div>
                </div>

                {selectedOrder.plano_mensal_coberto && (
                  <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2
                        className="text-green-600"
                        size={22}
                      />

                      <div>
                        <p className="font-semibold text-green-800">
                          Serviço coberto pelo plano mensal
                        </p>

                        {selectedOrder.plano_mensal_servico_incluso && (
                          <p className="text-sm text-green-700">
                            {
                              selectedOrder.plano_mensal_servico_incluso
                            }
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-700">
                    Alterar status
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {statuses.map(
                      (status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() =>
                            updateStatus(
                              selectedOrder,
                              status,
                            )
                          }
                          className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                            selectedOrder.status ===
                            status
                              ? statusClass(
                                  status,
                                )
                              : "border border-slate-200 bg-white text-slate-600"
                          }`}
                        >
                          {status}
                        </button>
                      ),
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      printServiceOrder(
                        selectedOrder,
                      )
                    }
                    className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Printer size={18} />
                    Imprimir
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      sendServiceOrderWhatsApp(
                        selectedOrder,
                      )
                    }
                    className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700"
                  >
                    <MessageCircle
                      size={18}
                    />
                    WhatsApp
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </main>
  );
}
