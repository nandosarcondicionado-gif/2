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
  AlertTriangle,
  ShieldCheck,
  CreditCard,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { applyMonthlyPlanToServiceOrder } from "@/lib/ordens-servico-plano";
import {
  getPlanoOSInfo,
  getPlanoOSBadgeClass,
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
  serviceValue: number;
  materialsValue: number;
  materialsDescription: string;
  materialsPaid: boolean;
  materialsPaidAt: string | null;
  status: ServiceOrderStatus;
  notes: string;
  monthlyPlanId: string | null;
  monthlyPlanCovered: boolean;
  monthlyPlanStatus: string;
  monthlyPlanWarning: string;
  monthlyPlanIncludedService: string;
};

type Client = {
  id: string;
  nome: string;
  cidade: string;
};

type FormData = {
  clientId: string;
  client: string;
  equipment: string;
  city: string;
  serviceType: ServiceType;
  description: string;
  date: string;
  technician: string;
  value: string;
  materialsValue: string;
  materialsDescription: string;
  materialsPaid: boolean;
  status: ServiceOrderStatus;
  notes: string;
};

const supabase = createClient();

const emptyForm: FormData = {
  clientId: "",
  client: "",
  equipment: "",
  city: "",
  serviceType: "Preventiva",
  description: "",
  date: new Date().toISOString().slice(0, 10),
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
  if (!value) return "—";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("pt-BR");
}

function parseMoney(value: string) {
  if (!value) return 0;

  const clean = String(value)
    .replace(/[R$\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const number = Number(clean);

  return Number.isFinite(number) ? number : 0;
}

function escapeHtml(value: string) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function statusClass(status: ServiceOrderStatus) {
  if (status === "Concluída") {
    return "bg-green-100 text-green-700 border-green-200";
  }

  if (status === "Cancelada") {
    return "bg-red-100 text-red-700 border-red-200";
  }

  if (status === "Em andamento") {
    return "bg-blue-100 text-blue-700 border-blue-200";
  }

  if (status === "Agendada") {
    return "bg-purple-100 text-purple-700 border-purple-200";
  }

  return "bg-yellow-100 text-yellow-700 border-yellow-200";
}

function printServiceOrder(order: ServiceOrder) {
  const planInfo = getPlanoOSInfo({
    plano_mensal_status: order.monthlyPlanStatus,
    plano_mensal_coberto: order.monthlyPlanCovered,
    plano_mensal_aviso: order.monthlyPlanWarning,
    plano_mensal_servico_incluso:
      order.monthlyPlanIncludedService,
  });

  const planHtml = order.monthlyPlanId
    ? `
      <div class="box">
        <h3>Plano mensal</h3>
        <p><strong>Status:</strong> ${escapeHtml(
          planInfo.status
        )}</p>
        <p><strong>Serviço:</strong> ${
          escapeHtml(planInfo.servico) || "Não informado"
        }</p>
        <p><strong>Condição:</strong> ${escapeHtml(
          planInfo.descricao
        )}</p>
        ${
          planInfo.aviso
            ? `<p class="alert">${escapeHtml(
                planInfo.aviso
              )}</p>`
            : ""
        }
      </div>
    `
    : "";

  const materialsStatus = order.materialsPaid
    ? "Materiais pagos"
    : "Materiais pendentes";

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <title>OS ${escapeHtml(order.number)}</title>

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
          margin-bottom: 20px;
        }

        .header h1 {
          margin: 0;
          font-size: 24px;
        }

        .header p {
          margin: 5px 0;
          color: #4b5563;
        }

        .title {
          font-size: 20px;
          margin-bottom: 20px;
        }

        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .box {
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 15px;
        }

        .box h3 {
          margin-top: 0;
          font-size: 15px;
        }

        .box p {
          margin: 7px 0;
        }

        .alert {
          background: #fee2e2;
          padding: 10px;
          border-radius: 6px;
          color: #991b1b;
          font-weight: bold;
        }

        .total {
          font-size: 18px;
          font-weight: bold;
        }

        .signatures {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 50px;
          margin-top: 80px;
        }

        .signature {
          text-align: center;
          border-top: 1px solid #111827;
          padding-top: 8px;
        }

        .footer {
          margin-top: 40px;
          text-align: center;
          color: #6b7280;
          font-size: 12px;
        }

        @media print {
          body {
            padding: 15px;
          }
        }
      </style>
    </head>

    <body>

      <div class="header">
        <h1>Nando's Ar-Condicionado</h1>
        <p>Qualidade e confiança em todos os detalhes.</p>
        <p>Jaú, Bauru e Região</p>
      </div>

      <div class="title">
        Ordem de Serviço ${escapeHtml(order.number)}
      </div>

      <div class="grid">

        <div class="box">
          <h3>Cliente</h3>
          <p><strong>Nome:</strong> ${escapeHtml(
            order.client
          )}</p>
          <p><strong>Cidade:</strong> ${escapeHtml(
            order.city
          )}</p>
        </div>

        <div class="box">
          <h3>Atendimento</h3>
          <p><strong>Data:</strong> ${escapeHtml(
            formatDate(order.date)
          )}</p>
          <p><strong>Status:</strong> ${escapeHtml(
            order.status
          )}</p>
          <p><strong>Técnico:</strong> ${
            escapeHtml(order.technician) ||
            "Não informado"
          }</p>
        </div>

      </div>

      <div class="box">
        <h3>Equipamento e serviço</h3>

        <p>
          <strong>Equipamento:</strong>
          ${
            escapeHtml(order.equipment) ||
            "Não informado"
          }
        </p>

        <p>
          <strong>Tipo:</strong>
          ${escapeHtml(order.serviceType)}
        </p>

        <p>
          <strong>Descrição:</strong>
          ${
            escapeHtml(order.description) ||
            "Não informado"
          }
        </p>
      </div>

      ${planHtml}

      <div class="box">
        <h3>Valores</h3>

        <p>
          <strong>Serviço:</strong>
          ${formatCurrency(order.serviceValue)}
        </p>

        <p>
          <strong>Materiais:</strong>
          ${formatCurrency(order.materialsValue)}
        </p>

        ${
          order.materialsDescription
            ? `
              <p>
                <strong>Materiais:</strong>
                ${escapeHtml(
                  order.materialsDescription
                )}
              </p>
            `
            : ""
        }

        <p>
          <strong>Status dos materiais:</strong>
          ${materialsStatus}
        </p>

        <p class="total">
          Total: ${formatCurrency(order.value)}
        </p>
      </div>

      ${
        order.notes
          ? `
            <div class="box">
              <h3>Observações</h3>
              <p>${escapeHtml(order.notes)}</p>
            </div>
          `
          : ""
      }

      <div class="signatures">
        <div class="signature">
          Responsável pelo cliente
        </div>

        <div class="signature">
          Técnico responsável
        </div>
      </div>

      <div class="footer">
        Nando's Ar-Condicionado — Qualidade e confiança em todos os detalhes.
      </div>

    </body>
    </html>
  `;

  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    alert(
      "Permita a abertura de novas janelas para imprimir."
    );
    return;
  }

  printWindow.document.write(html);
  printWindow.document.close();

  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 400);
}

function sendServiceOrderWhatsApp(
  order: ServiceOrder
) {
  const planInfo = getPlanoOSInfo({
    plano_mensal_status: order.monthlyPlanStatus,
    plano_mensal_coberto: order.monthlyPlanCovered,
    plano_mensal_aviso: order.monthlyPlanWarning,
    plano_mensal_servico_incluso:
      order.monthlyPlanIncludedService,
  });

  let message = `*Nando's Ar-Condicionado*

*ORDEM DE SERVIÇO ${order.number}*

Cliente: ${order.client}
Cidade: ${order.city}
Equipamento: ${
    order.equipment || "Não informado"
  }
Serviço: ${order.serviceType}
Data: ${formatDate(order.date)}
Técnico: ${
    order.technician || "Não informado"
  }

Descrição:
${
    order.description || "Não informado"
  }

*VALORES*
Serviço: ${formatCurrency(
    order.serviceValue
  )}
Materiais: ${formatCurrency(
    order.materialsValue
  )}
Total: ${formatCurrency(order.value)}

Status: ${order.status}`;

  if (order.materialsDescription) {
    message += `

Materiais:
${order.materialsDescription}`;
  }

  message += `

Pagamento dos materiais: ${
    order.materialsPaid ? "PAGO" : "PENDENTE"
  }`;

  if (order.monthlyPlanId) {
    message += `

*PLANO MENSAL*
Status: ${planInfo.status}
Serviço coberto: ${
      planInfo.coberto ? "SIM" : "NÃO"
    }`;

    if (planInfo.servico) {
      message += `
Serviço incluído: ${planInfo.servico}`;
    }

    if (planInfo.aviso) {
      message += `

*AVISO*
${planInfo.aviso}`;
    }
  }

  if (order.notes) {
    message += `

Observações:
${order.notes}`;
  }

  const url =
    `https://wa.me/?text=` +
    encodeURIComponent(message);

  window.open(url, "_blank");
}

export default function OrdensServicoPage() {
  const [orders, setOrders] = useState<
    ServiceOrder[]
  >([]);

  const [clients, setClients] = useState<
    Client[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("Todos");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [selectedOrder, setSelectedOrder] =
    useState<ServiceOrder | null>(null);

  const [form, setForm] =
    useState<FormData>(emptyForm);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    try {
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
            .eq("ativo", true)
            .order("nome", {
              ascending: true,
            }),
        ]);

      if (ordersResult.error) {
        console.error(ordersResult.error);

        alert(
          "Erro ao carregar as ordens de serviço: " +
            ordersResult.error.message
        );
      }

      if (clientsResult.error) {
        console.error(clientsResult.error);
      }

      const mappedOrders: ServiceOrder[] =
        (ordersResult.data || []).map(
          (item: any) => {
            const serviceValue = Number(
              item.valor_servicos ??
                item.valor ??
                0
            );

            const materialsValue = Number(
              item.valor_materiais ?? 0
            );

            const totalValue = Number(
              item.valor ??
                serviceValue + materialsValue
            );

            return {
              id: item.id,

              number:
                item.numero || "OS-0000",

              clientId:
                item.cliente_id || "",

              client:
                item.cliente_nome || "",

              equipment:
                item.equipamento || "",

              city:
                item.cidade || "",

              serviceType:
                item.tipo_servico ||
                "Preventiva",

              description:
                item.descricao || "",

              date:
                item.data || "",

              technician:
                item.tecnico || "",

              value: totalValue,

              serviceValue,

              materialsValue,

              materialsDescription:
                item.materiais_descricao ||
                "",

              materialsPaid: Boolean(
                item.materiais_pago ?? false
              ),

              materialsPaidAt:
                item.materiais_pago_em ||
                null,

              status:
                item.status || "Aberta",

              notes:
                item.observacoes || "",

              monthlyPlanId:
                item.plano_mensal_id ||
                null,

              monthlyPlanCovered:
                Boolean(
                  item.plano_mensal_coberto
                ),

              monthlyPlanStatus:
                item.plano_mensal_status ||
                "Sem plano",

              monthlyPlanWarning:
                item.plano_mensal_aviso ||
                "",

              monthlyPlanIncludedService:
                item.plano_mensal_servico_incluso ||
                "",
            };
          }
        );

      setOrders(mappedOrders);

      setClients(
        (clientsResult.data || []).map(
          (item: any) => ({
            id: item.id,
            nome: item.nome || "",
            cidade: item.cidade || "",
          })
        )
      );
    } finally {
      setLoading(false);
    }
  }

  const filteredOrders = useMemo(() => {
    const searchLower =
      search.toLowerCase().trim();

    return orders.filter((order) => {
      const matchesSearch =
        !searchLower ||
        order.number
          .toLowerCase()
          .includes(searchLower) ||
        order.client
          .toLowerCase()
          .includes(searchLower) ||
        order.city
          .toLowerCase()
          .includes(searchLower) ||
        order.equipment
          .toLowerCase()
          .includes(searchLower) ||
        order.serviceType
          .toLowerCase()
          .includes(searchLower);

      const matchesStatus =
        statusFilter === "Todos" ||
        order.status === statusFilter;

      return (
        matchesSearch &&
        matchesStatus
      );
    });
  }, [orders, search, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: orders.length,

      abertas: orders.filter(
        (item) =>
          item.status === "Aberta"
      ).length,

      andamento: orders.filter(
        (item) =>
          item.status === "Em andamento"
      ).length,

      concluidas: orders.filter(
        (item) =>
          item.status === "Concluída"
      ).length,

      materiaisPendentes:
        orders.filter(
          (item) =>
            item.materialsValue > 0 &&
            !item.materialsPaid
        ).length,
    };
  }, [orders]);

  function resetForm() {
    setForm({
      ...emptyForm,
      date: new Date()
        .toISOString()
        .slice(0, 10),
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

  function openEditOrder(
    order: ServiceOrder
  ) {
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

      value: String(
        order.serviceValue || ""
      ),

      materialsValue: String(
        order.materialsValue || ""
      ),

      materialsDescription:
        order.materialsDescription,

      materialsPaid:
        order.materialsPaid,

      status: order.status,

      notes: order.notes,
    });

    setShowForm(true);
  }

  function handleClientChange(
    clientId: string
  ) {
    const client = clients.find(
      (item) => item.id === clientId
    );

    setForm((current) => ({
      ...current,

      clientId,

      client:
        client?.nome || "",

      city:
        client?.cidade || "",
    }));
  }

  async function generateNumber() {
    const numbers = orders
      .map((order) => {
        const match =
          order.number.match(
            /(\d+)$/
          );

        return match
          ? Number(match[1])
          : 0;
      })
      .filter((number) =>
        Number.isFinite(number)
      );

    const next =
      numbers.length > 0
        ? Math.max(...numbers) + 1
        : 1;

    return `OS-${String(next).padStart(
      4,
      "0"
    )}`;
  }

  async function saveOrder() {
    if (
      !form.clientId &&
      !form.client.trim()
    ) {
      alert(
        "Selecione ou informe o cliente."
      );
      return;
    }

    if (!form.description.trim()) {
      alert(
        "Informe a descrição do serviço."
      );
      return;
    }

    setSaving(true);

    try {
      const serviceValue =
        parseMoney(form.value);

      const materialsValue =
        parseMoney(
          form.materialsValue
        );

      let monthlyPlanData = {
        plano_mensal_id:
          null as string | null,

        plano_mensal_coberto: false,

        plano_mensal_status:
          "Sem plano",

        plano_mensal_aviso: "",

        plano_mensal_servico_incluso:
          "",

        valor_servicos:
          serviceValue,
      };

      /*
       * VERIFICAÇÃO AUTOMÁTICA DO PLANO
       *
       * Importante:
       * o auxiliar espera "service".
       */
      if (form.clientId) {
        try {
          monthlyPlanData =
            await applyMonthlyPlanToServiceOrder(
              {
                clientId:
                  form.clientId,

                service:
                  form.serviceType,

                normalServiceValue:
                  serviceValue,
              }
            );
        } catch (planError) {
          console.error(
            "Erro ao verificar plano mensal:",
            planError
          );

          /*
           * Se houver problema no módulo do
           * plano, a OS continua com cobrança
           * normal do serviço.
           */
          monthlyPlanData = {
            plano_mensal_id:
              null,

            plano_mensal_coberto:
              false,

            plano_mensal_status:
              "Sem plano",

            plano_mensal_aviso:
              "",

            plano_mensal_servico_incluso:
              "",

            valor_servicos:
              serviceValue,
          };
        }
      }

      const totalValue =
        Number(
          monthlyPlanData.valor_servicos ||
            0
        ) +
        materialsValue;

      const client = clients.find(
        (item) =>
          item.id === form.clientId
      );

      let number = "OS-0001";

      if (editingId) {
        const current =
          orders.find(
            (item) =>
              item.id === editingId
          );

        number =
          current?.number ||
          "OS-0001";
      } else {
        number =
          await generateNumber();
      }

      const payload = {
        numero: number,

        cliente_id:
          form.clientId || null,

        cliente_nome:
          client?.nome ||
          form.client,

        equipamento:
          form.equipment,

        cidade:
          client?.cidade ||
          form.city,

        tipo_servico:
          form.serviceType,

        descricao:
          form.description,

        data:
          form.date || null,

        tecnico:
          form.technician || null,

        valor_servicos:
          monthlyPlanData.valor_servicos,

        valor_materiais:
          materialsValue,

        materiais_descricao:
          form.materialsDescription ||
          null,

        materiais_pago:
          editingId
            ? form.materialsPaid
            : false,

        materiais_pago_em:
          editingId
            ? form.materialsPaid
              ? new Date().toISOString()
              : null
            : null,

        valor:
          totalValue,

        status:
          form.status,

        observacoes:
          form.notes || null,

        plano_mensal_id:
          monthlyPlanData.plano_mensal_id,

        plano_mensal_coberto:
          monthlyPlanData.plano_mensal_coberto,

        plano_mensal_status:
          monthlyPlanData.plano_mensal_status,

        plano_mensal_aviso:
          monthlyPlanData.plano_mensal_aviso,

        plano_mensal_servico_incluso:
          monthlyPlanData.plano_mensal_servico_incluso,
      };

      let savedOrderId =
        editingId;

      if (editingId) {
        const { error } =
          await supabase
            .from("ordens_servico")
            .update(payload)
            .eq(
              "id",
              editingId
            );

        if (error) {
          throw error;
        }
      } else {
        const { data, error } =
          await supabase
            .from("ordens_servico")
            .insert(payload)
            .select("id")
            .single();

        if (error) {
          throw error;
        }

        savedOrderId =
          data?.id || null;
      }

      /*
       * REGISTRA O USO DO PLANO
       */
      if (
        savedOrderId &&
        monthlyPlanData.plano_mensal_id
      ) {
        try {
          const {
            error: usageError,
          } = await supabase
            .from(
              "uso_planos_mensais"
            )
            .insert({
              plano_id:
                monthlyPlanData.plano_mensal_id,

              ordem_servico_id:
                savedOrderId,

              cliente_id:
                form.clientId ||
                null,

              data_uso:
                form.date ||
                new Date()
                  .toISOString()
                  .slice(0, 10),

              servico:
                form.serviceType,

              equipamento:
                form.equipment ||
                "",

              coberto:
                monthlyPlanData.plano_mensal_coberto,

              motivo:
                monthlyPlanData.plano_mensal_coberto
                  ? "Serviço coberto pelo plano mensal."
                  : monthlyPlanData.plano_mensal_aviso ||
                    "Serviço não coberto pelo plano.",

              observacoes:
                form.notes || "",
            });

          if (usageError) {
            console.error(
              "Erro ao registrar uso do plano:",
              usageError
            );
          }
        } catch (usageError) {
          console.error(
            "Erro no registro do uso do plano:",
            usageError
          );
        }
      }

      closeForm();

      await loadData();

      alert(
        editingId
          ? "Ordem de serviço atualizada com sucesso!"
          : "Ordem de serviço criada com sucesso!"
      );
    } catch (error: any) {
      console.error(error);

      alert(
        "Não foi possível salvar a ordem de serviço.\n\n" +
          (error?.message ||
            "Erro desconhecido.")
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteOrder(
    order: ServiceOrder
  ) {
    const confirmed =
      window.confirm(
        `Deseja realmente excluir a ordem ${order.number}?`
      );

    if (!confirmed) return;

    const { error } =
      await supabase
        .from("ordens_servico")
        .delete()
        .eq("id", order.id);

    if (error) {
      alert(
        "Erro ao excluir: " +
          error.message
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
    const { error } =
      await supabase
        .from("ordens_servico")
        .update({ status })
        .eq("id", order.id);

    if (error) {
      alert(
        "Erro ao alterar status: " +
          error.message
      );
      return;
    }

    await loadData();

    if (
      selectedOrder?.id ===
      order.id
    ) {
      setSelectedOrder({
        ...selectedOrder,
        status,
      });
    }
  }

  async function toggleMaterialsPayment(
    order: ServiceOrder
  ) {
    if (
      order.materialsValue <= 0
    ) {
      alert(
        "Esta OS não possui valor de materiais."
      );
      return;
    }

    const nextPaid =
      !order.materialsPaid;

    const { error } =
      await supabase
        .from("ordens_servico")
        .update({
          materiais_pago:
            nextPaid,

          materiais_pago_em:
            nextPaid
              ? new Date().toISOString()
              : null,
        })
        .eq("id", order.id);

    if (error) {
      alert(
        "Erro ao atualizar pagamento dos materiais: " +
          error.message
      );
      return;
    }

    await loadData();

    if (
      selectedOrder?.id ===
      order.id
    ) {
      setSelectedOrder({
        ...selectedOrder,

        materialsPaid:
          nextPaid,

        materialsPaidAt:
          nextPaid
            ? new Date().toISOString()
            : null,
      });
    }
  }

  function renderPlanBadge(
    order: ServiceOrder
  ) {
    const info =
      getPlanoOSInfo({
        plano_mensal_status:
          order.monthlyPlanStatus,

        plano_mensal_coberto:
          order.monthlyPlanCovered,

        plano_mensal_aviso:
          order.monthlyPlanWarning,

        plano_mensal_servico_incluso:
          order.monthlyPlanIncludedService,
      });

    return (
      <div className="mt-2">
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold ${getPlanoOSBadgeClass(
            info.status,
            info.coberto
          )}`}
        >
          {info.coberto ? (
            <ShieldCheck size={13} />
          ) : (
            <AlertTriangle
              size={13}
            />
          )}

          {info.coberto
            ? "Plano mensal — coberto"
            : `Plano: ${info.status}`}
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
              <ClipboardList size={28} />
              Ordens de Serviço
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Controle completo dos
              atendimentos da Nando's
              Ar-Condicionado.
            </p>
          </div>

          <button
            onClick={openNewOrder}
            className="flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 font-semibold text-white shadow hover:bg-gray-800"
          >
            <Plus size={19} />
            Nova Ordem de Serviço
          </button>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">

          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">
              Total
            </p>

            <p className="mt-1 text-2xl font-bold">
              {stats.total}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">
              Abertas
            </p>

            <p className="mt-1 text-2xl font-bold text-yellow-600">
              {stats.abertas}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">
              Em andamento
            </p>

            <p className="mt-1 text-2xl font-bold text-blue-600">
              {stats.andamento}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">
              Concluídas
            </p>

            <p className="mt-1 text-2xl font-bold text-green-600">
              {stats.concluidas}
            </p>
          </div>

          <div className="col-span-2 rounded-xl border bg-white p-4 shadow-sm md:col-span-1">
            <p className="text-xs text-gray-500">
              Materiais pendentes
            </p>

            <p className="mt-1 text-2xl font-bold text-orange-600">
              {stats.materiaisPendentes}
            </p>
          </div>
        </div>

        <div className="mb-5 flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search
              size={19}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Pesquisar OS, cliente, cidade ou equipamento..."
              className="w-full rounded-xl border bg-white py-3 pl-10 pr-4 outline-none focus:border-gray-900"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
            className="rounded-xl border bg-white px-4 py-3 outline-none"
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
          </select>
        </div>

        {loading ? (
          <div className="rounded-xl border bg-white p-10 text-center text-gray-500">
            Carregando ordens de serviço...
          </div>
        ) : filteredOrders.length ===
          0 ? (
          <div className="rounded-xl border bg-white p-10 text-center">

            <ClipboardList
              size={42}
              className="mx-auto text-gray-300"
            />

            <p className="mt-3 font-semibold text-gray-700">
              Nenhuma ordem de serviço encontrada.
            </p>

            <button
              onClick={
                openNewOrder
              }
              className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Criar primeira OS
            </button>
          </div>
        ) : (
          <div className="space-y-3">

            {filteredOrders.map(
              (order) => (
                <div
                  key={order.id}
                  className="rounded-xl border bg-white p-4 shadow-sm"
                >

                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                    <div className="min-w-0">

                      <div className="flex flex-wrap items-center gap-2">

                        <span className="font-bold text-gray-900">
                          {order.number}
                        </span>

                        <span
                          className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusClass(
                            order.status
                          )}`}
                        >
                          {order.status}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-col gap-1 text-sm text-gray-600">

                        <span className="flex items-center gap-2">
                          <User size={15} />
                          {order.client}
                        </span>

                        <span className="flex items-center gap-2">
                          <MapPin size={15} />
                          {order.city ||
                            "Cidade não informada"}
                        </span>

                        <span className="flex items-center gap-2">
                          <Wrench size={15} />
                          {order.serviceType}

                          {order.equipment
                            ? ` — ${order.equipment}`
                            : ""}
                        </span>

                        <span className="flex items-center gap-2">
                          <CalendarDays
                            size={15}
                          />
                          {formatDate(
                            order.date
                          )}
                        </span>

                      </div>

                      {renderPlanBadge(
                        order
                      )}

                      {order.monthlyPlanWarning && (
                        <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs font-semibold text-red-700">
                          ⚠️{" "}
                          {
                            order.monthlyPlanWarning
                          }
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 lg:min-w-[230px]">

                      <div className="text-right">

                        <p className="text-xs text-gray-500">
                          Total da OS
                        </p>

                        <p className="text-xl font-bold text-gray-900">
                          {formatCurrency(
                            order.value
                          )}
                        </p>

                        <p className="text-xs text-gray-500">
                          Serviço:{" "}
                          {formatCurrency(
                            order.serviceValue
                          )}
                          {" • "}
                          Materiais:{" "}
                          {formatCurrency(
                            order.materialsValue
                          )}
                        </p>

                      </div>

                      <div className="flex flex-wrap justify-end gap-2">

                        <button
                          onClick={() =>
                            setSelectedOrder(
                              order
                            )
                          }
                          className="rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-gray-50"
                        >
                          Detalhes
                        </button>

                        <button
                          onClick={() =>
                            openEditOrder(
                              order
                            )
                          }
                          className="rounded-lg border p-2 hover:bg-gray-50"
                          title="Editar"
                        >
                          <Edit
                            size={17}
                          />
                        </button>

                        <button
                          onClick={() =>
                            printServiceOrder(
                              order
                            )
                          }
                          className="rounded-lg border p-2 hover:bg-gray-50"
                          title="Imprimir"
                        >
                          <Printer
                            size={17}
                          />
                        </button>

                        <button
                          onClick={() =>
                            sendServiceOrderWhatsApp(
                              order
                            )
                          }
                          className="rounded-lg border p-2 text-green-600 hover:bg-green-50"
                          title="Enviar WhatsApp"
                        >
                          <MessageCircle
                            size={17}
                          />
                        </button>

                      </div>
                    </div>

                  </div>
                </div>
              )
            )}

          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-3 md:p-6">

          <div className="mx-auto max-w-3xl rounded-2xl bg-white shadow-2xl">

            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-4">

              <div>
                <h2 className="text-xl font-bold">
                  {editingId
                    ? "Editar Ordem de Serviço"
                    : "Nova Ordem de Serviço"}
                </h2>

                <p className="text-xs text-gray-500">
                  O plano mensal será
                  verificado automaticamente.
                </p>
              </div>

              <button
                onClick={
                  closeForm
                }
                className="rounded-lg p-2 hover:bg-gray-100"
              >
                <X size={21} />
              </button>

            </div>

            <div className="space-y-5 p-4">

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Cliente
                </label>

                <select
                  value={
                    form.clientId
                  }
                  onChange={(event) =>
                    handleClientChange(
                      event.target
                        .value
                    )
                  }
                  className="w-full rounded-xl border px-3 py-3"
                >

                  <option value="">
                    Selecione o cliente
                  </option>

                  {clients.map(
                    (client) => (
                      <option
                        key={
                          client.id
                        }
                        value={
                          client.id
                        }
                      >
                        {
                          client.nome
                        }

                        {client.cidade
                          ? ` — ${client.cidade}`
                          : ""}
                      </option>
                    )
                  )}

                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">

                <div>
                  <label className="mb-1 block text-sm font-semibold">
                    Equipamento
                  </label>

                  <input
                    value={
                      form.equipment
                    }
                    onChange={(
                      event
                    ) =>
                      setForm({
                        ...form,
                        equipment:
                          event
                            .target
                            .value,
                      })
                    }
                    placeholder="Ex.: Split 12.000 BTUs"
                    className="w-full rounded-xl border px-3 py-3"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold">
                    Tipo de serviço
                  </label>

                  <select
                    value={
                      form.serviceType
                    }
                    onChange={(
                      event
                    ) =>
                      setForm({
                        ...form,
                        serviceType:
                          event
                            .target
                            .value as ServiceType,
                      })
                    }
                    className="w-full rounded-xl border px-3 py-3"
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

              </div>

              <div className="grid gap-4 md:grid-cols-2">

                <div>
                  <label className="mb-1 block text-sm font-semibold">
                    Data
                  </label>

                  <input
                    type="date"
                    value={
                      form.date
                    }
                    onChange={(
                      event
                    ) =>
                      setForm({
                        ...form,
                        date:
                          event
                            .target
                            .value,
                      })
                    }
                    className="w-full rounded-xl border px-3 py-3"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold">
                    Técnico
                  </label>

                  <input
                    value={
                      form.technician
                    }
                    onChange={(
                      event
                    ) =>
                      setForm({
                        ...form,
                        technician:
                          event
                            .target
                            .value,
                      })
                    }
                    placeholder="Nome do técnico"
                    className="w-full rounded-xl border px-3 py-3"
                  />
                </div>

              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Descrição do serviço
                </label>

                <textarea
                  value={
                    form.description
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,
                      description:
                        event
                          .target
                          .value,
                    })
                  }
                  rows={4}
                  placeholder="Descreva o serviço que será realizado..."
                  className="w-full rounded-xl border px-3 py-3"
                />
              </div>

              <div className="rounded-xl border bg-gray-50 p-4">

                <div className="mb-3 flex items-center gap-2">
                  <CreditCard
                    size={18}
                  />

                  <h3 className="font-bold">
                    Valores
                  </h3>
                </div>

                <div className="grid gap-4 md:grid-cols-2">

                  <div>
                    <label className="mb-1 block text-sm font-semibold">
                      Valor do serviço
                    </label>

                    <input
                      value={
                        form.value
                      }
                      onChange={(
                        event
                      ) =>
                        setForm({
                          ...form,
                          value:
                            event
                              .target
                              .value,
                        })
                      }
                      inputMode="decimal"
                      placeholder="0,00"
                      className="w-full rounded-xl border bg-white px-3 py-3"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold">
                      Valor dos materiais
                    </label>

                    <input
                      value={
                        form.materialsValue
                      }
                      onChange={(
                        event
                      ) =>
                        setForm({
                          ...form,
                          materialsValue:
                            event
                              .target
                              .value,
                        })
                      }
                      inputMode="decimal"
                      placeholder="0,00"
                      className="w-full rounded-xl border bg-white px-3 py-3"
                    />
                  </div>

                </div>

                <div className="mt-4">

                  <label className="mb-1 block text-sm font-semibold">
                    Descrição dos materiais
                  </label>

                  <input
                    value={
                      form.materialsDescription
                    }
                    onChange={(
                      event
                    ) =>
                      setForm({
                        ...form,
                        materialsDescription:
                          event
                            .target
                            .value,
                      })
                    }
                    placeholder="Ex.: capacitor, tubulação, suporte..."
                    className="w-full rounded-xl border bg-white px-3 py-3"
                  />

                </div>

                <div className="mt-4 rounded-xl border bg-white p-4">

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Serviço
                    </span>

                    <strong>
                      {formatCurrency(
                        parseMoney(
                          form.value
                        )
                      )}
                    </strong>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Materiais
                    </span>

                    <strong>
                      {formatCurrency(
                        parseMoney(
                          form.materialsValue
                        )
                      )}
                    </strong>
                  </div>

                  <div className="mt-3 border-t pt-3">

                    <div className="flex items-center justify-between">

                      <span className="font-bold">
                        Total
                      </span>

                      <span className="text-xl font-bold">
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

                {editingId &&
                  parseMoney(
                    form.materialsValue
                  ) > 0 && (
                    <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border bg-white p-3">

                      <input
                        type="checkbox"
                        checked={
                          form.materialsPaid
                        }
                        onChange={(
                          event
                        ) =>
                          setForm({
                            ...form,
                            materialsPaid:
                              event
                                .target
                                .checked,
                          })
                        }
                        className="h-5 w-5"
                      />

                      <span className="text-sm font-semibold">
                        Materiais já foram pagos
                      </span>

                    </label>
                  )}

              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Status
                </label>

                <select
                  value={
                    form.status
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,
                      status:
                        event
                          .target
                          .value as ServiceOrderStatus,
                    })
                  }
                  className="w-full rounded-xl border px-3 py-3"
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

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Observações
                </label>

                <textarea
                  value={
                    form.notes
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,
                      notes:
                        event
                          .target
                          .value,
                    })
                  }
                  rows={3}
                  placeholder="Observações internas..."
                  className="w-full rounded-xl border px-3 py-3"
                />
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">

                <div className="flex items-start gap-2">

                  <ShieldCheck
                    size={19}
                    className="mt-0.5 shrink-0"
                  />

                  <div>

                    <p className="font-bold">
                      Verificação automática do Plano Mensal
                    </p>

                    <p className="mt-1">
                      Ao salvar esta OS,
                      o ClimaPro verifica
                      automaticamente se
                      o cliente possui
                      plano ativo, se o
                      carnê está em dia e
                      se o serviço está
                      incluído.
                    </p>

                    <p className="mt-1">
                      O técnico não precisa
                      decidir se o atendimento
                      é coberto.
                    </p>

                  </div>

                </div>
              </div>

            </div>

            <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t bg-white p-4 sm:flex-row sm:justify-end">

              <button
                onClick={
                  closeForm
                }
                className="rounded-xl border px-5 py-3 font-semibold"
              >
                Cancelar
              </button>

              <button
                onClick={
                  saveOrder
                }
                disabled={
                  saving
                }
                className="rounded-xl bg-gray-900 px-5 py-3 font-semibold text-white disabled:opacity-50"
              >
                {saving
                  ? "Salvando..."
                  : editingId
                  ? "Salvar alterações"
                  : "Criar Ordem de Serviço"}
              </button>

            </div>

          </div>
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-3 md:p-6">

          <div className="mx-auto max-w-2xl rounded-2xl bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b p-4">

              <div>
                <h2 className="text-xl font-bold">
                  {
                    selectedOrder.number
                  }
                </h2>

                <p className="text-sm text-gray-500">
                  Detalhes da ordem de serviço
                </p>
              </div>

              <button
                onClick={() =>
                  setSelectedOrder(
                    null
                  )
                }
                className="rounded-lg p-2 hover:bg-gray-100"
              >
                <X size={21} />
              </button>

            </div>

            <div className="space-y-4 p-4">

              <div className="grid gap-3 md:grid-cols-2">

                <div className="rounded-xl border p-4">
                  <p className="text-xs text-gray-500">
                    Cliente
                  </p>

                  <p className="mt-1 font-bold">
                    {
                      selectedOrder.client
                    }
                  </p>

                  <p className="text-sm text-gray-500">
                    {
                      selectedOrder.city
                    }
                  </p>
                </div>

                <div className="rounded-xl border p-4">
                  <p className="text-xs text-gray-500">
                    Atendimento
                  </p>

                  <p className="mt-1 font-bold">
                    {
                      selectedOrder.serviceType
                    }
                  </p>

                  <p className="text-sm text-gray-500">
                    {formatDate(
                      selectedOrder.date
                    )}
                  </p>
                </div>

              </div>

              <div className="rounded-xl border p-4">

                <p className="text-xs text-gray-500">
                  Equipamento
                </p>

                <p className="mt-1 font-semibold">
                  {
                    selectedOrder.equipment ||
                    "Não informado"
                  }
                </p>

              </div>

              <div className="rounded-xl border p-4">

                <p className="text-xs text-gray-500">
                  Descrição
                </p>

                <p className="mt-1 whitespace-pre-wrap">
                  {
                    selectedOrder.description ||
                    "Não informado"
                  }
                </p>

              </div>

              {selectedOrder.monthlyPlanId && (
                <div
                  className={`rounded-xl border p-4 ${
                    selectedOrder.monthlyPlanCovered
                      ? "border-green-200 bg-green-50"
                      : selectedOrder.monthlyPlanStatus ===
                        "Em atraso"
                      ? "border-red-200 bg-red-50"
                      : "border-yellow-200 bg-yellow-50"
                  }`}
                >

                  <div className="flex items-center gap-2">

                    {selectedOrder.monthlyPlanCovered ? (
                      <ShieldCheck
                        size={20}
                        className="text-green-700"
                      />
                    ) : (
                      <AlertTriangle
                        size={20}
                        className="text-orange-600"
                      />
                    )}

                    <h3 className="font-bold">
                      Plano Mensal
                    </h3>

                  </div>

                  <p className="mt-2">
                    <strong>
                      Status:
                    </strong>{" "}
                    {
                      selectedOrder.monthlyPlanStatus
                    }
                  </p>

                  {selectedOrder.monthlyPlanIncludedService && (
                    <p className="mt-1">
                      <strong>
                        Serviço incluído:
                      </strong>{" "}
                      {
                        selectedOrder.monthlyPlanIncludedService
                      }
                    </p>
                  )}

                  {selectedOrder.monthlyPlanWarning && (
                    <p className="mt-2 rounded-lg bg-white/70 p-2 font-semibold">
                      ⚠️{" "}
                      {
                        selectedOrder.monthlyPlanWarning
                      }
                    </p>
                  )}

                  <p className="mt-2 text-sm">
                    {selectedOrder.monthlyPlanCovered
                      ? "Este serviço está coberto pelo plano. O valor do serviço foi zerado automaticamente."
                      : "Este serviço não está coberto pelo plano e permanece com cobrança normal."}
                  </p>

                </div>
              )}

              <div className="rounded-xl border p-4">

                <h3 className="font-bold">
                  Valores
                </h3>

                <div className="mt-3 space-y-2 text-sm">

                  <div className="flex justify-between">
                    <span>
                      Serviço
                    </span>

                    <strong>
                      {formatCurrency(
                        selectedOrder.serviceValue
                      )}
                    </strong>
                  </div>

                  <div className="flex justify-between">
                    <span>
                      Materiais
                    </span>

                    <strong>
                      {formatCurrency(
                        selectedOrder.materialsValue
                      )}
                    </strong>
                  </div>

                  {selectedOrder.materialsDescription && (
                    <div className="border-t pt-2">

                      <p className="text-xs text-gray-500">
                        Materiais
                      </p>

                      <p>
                        {
                          selectedOrder.materialsDescription
                        }
                      </p>

                    </div>
                  )}

                  <div className="border-t pt-3">

                    <div className="flex justify-between text-lg">

                      <span className="font-bold">
                        Total
                      </span>

                      <strong>
                        {formatCurrency(
                          selectedOrder.value
                        )}
                      </strong>

                    </div>

                  </div>

                </div>
              </div>

              {selectedOrder.materialsValue >
                0 && (
                <div
                  className={`rounded-xl border p-4 ${
                    selectedOrder.materialsPaid
                      ? "border-green-200 bg-green-50"
                      : "border-orange-200 bg-orange-50"
                  }`}
                >

                  <div className="flex items-center justify-between gap-3">

                    <div>

                      <p className="font-bold">
                        Pagamento dos materiais
                      </p>

                      <p className="text-sm">
                        {selectedOrder.materialsPaid
                          ? "Materiais pagos."
                          : "Materiais ainda não pagos."}
                      </p>

                      {selectedOrder.materialsPaidAt && (
                        <p className="mt-1 text-xs text-gray-500">
                          Pago em{" "}
                          {new Date(
                            selectedOrder.materialsPaidAt
                          ).toLocaleString(
                            "pt-BR"
                          )}
                        </p>
                      )}

                    </div>

                    <button
                      onClick={() =>
                        toggleMaterialsPayment(
                          selectedOrder
                        )
                      }
                      className={`rounded-lg px-3 py-2 text-sm font-bold ${
                        selectedOrder.materialsPaid
                          ? "bg-white text-red-600"
                          : "bg-gray-900 text-white"
                      }`}
                    >
                      {selectedOrder.materialsPaid
                        ? "Marcar como pendente"
                        : "Marcar como pago"}
                    </button>

                  </div>

                </div>
              )}

              {selectedOrder.notes && (
                <div className="rounded-xl border p-4">

                  <h3 className="font-bold">
                    Observações
                  </h3>

                  <p className="mt-2 whitespace-pre-wrap text-sm">
                    {
                      selectedOrder.notes
                    }
                  </p>

                </div>
              )}

              <div>

                <label className="mb-2 block text-sm font-bold">
                  Alterar status
                </label>

                <select
                  value={
                    selectedOrder.status
                  }
                  onChange={(
                    event
                  ) =>
                    changeStatus(
                      selectedOrder,
                      event.target
                        .value as ServiceOrderStatus
                    )
                  }
                  className="w-full rounded-xl border px-3 py-3"
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

            <div className="flex flex-wrap justify-between gap-2 border-t p-4">

              <button
                onClick={() =>
                  deleteOrder(
                    selectedOrder
                  )
                }
                className="flex items-center gap-2 rounded-xl border border-red-200 px-4 py-3 font-semibold text-red-600 hover:bg-red-50"
              >
                <Trash2 size={17} />
                Excluir
              </button>

              <div className="flex flex-wrap gap-2">

                <button
                  onClick={() =>
                    printServiceOrder(
                      selectedOrder
                    )
                  }
                  className="flex items-center gap-2 rounded-xl border px-4 py-3 font-semibold"
                >
                  <Printer size={17} />
                  Imprimir
                </button>

                <button
                  onClick={() =>
                    sendServiceOrderWhatsApp(
                      selectedOrder
                    )
                  }
                  className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-3 font-semibold text-white"
                >
                  <MessageCircle
                    size={17}
                  />
                  WhatsApp
                </button>

                <button
                  onClick={() =>
                    setSelectedOrder(
                      null
                    )
                  }
                  className="rounded-xl bg-gray-900 px-4 py-3 font-semibold text-white"
                >
                  Fechar
                </button>

              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
