"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CalendarDays,
  Edit,
  Eye,
  FileText,
  MapPin,
  MessageCircle,
  Plus,
  Printer,
  Search,
  Trash2,
  User,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type BudgetStatus =
  | "Rascunho"
  | "Enviado"
  | "Aprovado"
  | "Recusado";

type BudgetItem = {
  id: string;
  description: string;
  quantity: number;
  unitValue: number;
};

type Budget = {
  id: string;
  number: string;
  client: string;
  clientId: string;
  city: string;
  service: string;
  equipment: string;
  value: number;
  date: string;
  status: BudgetStatus;

  items: BudgetItem[];

  subtotal: number;
  discountPercent: number;
  discountValue: number;
  referenceValue: number;
  finalValue: number;
  materialsValue: number;
  totalValue: number;
};

type Client = {
  id: string;
  nome: string;
  cidade: string | null;
};

const supabase = createClient();

function money(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  );
}

function formatDate(value: string) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("pt-BR");
}

function toNumber(
  value: string | number | null | undefined
) {
  if (typeof value === "number") {
    return Number.isFinite(value)
      ? value
      : 0;
  }

  if (!value) {
    return 0;
  }

  const normalized = String(value)
    .replace(/\./g, "")
    .replace(",", ".");

  const parsed = Number(normalized);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function newItem(): BudgetItem {
  return {
    id:
      typeof crypto !== "undefined" &&
      "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`,
    description: "",
    quantity: 1,
    unitValue: 0,
  };
}

function itemTotal(item: BudgetItem) {
  return (
    Number(item.quantity || 0) *
    Number(item.unitValue || 0)
  );
}

function statusBudgetClass(status: BudgetStatus) {
  if (status === "Aprovado") {
    return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  }

  if (status === "Recusado") {
    return "bg-red-500/10 text-red-400 border-red-500/20";
  }

  if (status === "Enviado") {
    return "bg-blue-500/10 text-blue-400 border-blue-500/20";
  }

  return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
}

export default function OrcamentosPage() {
  const [budgets, setBudgets] = useState<
    Budget[]
  >([]);

  const [clients, setClients] = useState<
    Client[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [
    generatingOrderId,
    setGeneratingOrderId,
  ] = useState<string | null>(null);

  const [search, setSearch] =
    useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<"Todos" | BudgetStatus>(
    "Todos"
  );

  const [
    showModal,
    setShowModal,
  ] = useState(false);

  const [
    showPreview,
    setShowPreview,
  ] = useState(false);

  const [
    editingBudget,
    setEditingBudget,
  ] = useState<Budget | null>(null);

  const [
    previewBudget,
    setPreviewBudget,
  ] = useState<Budget | null>(null);

  const [clientId, setClientId] =
    useState("");

  const [clientName, setClientName] =
    useState("");

  const [city, setCity] =
    useState("");

  const [equipment, setEquipment] =
    useState("");

  const [service, setService] =
    useState("");

  const [date, setDate] =
    useState(
      new Date()
        .toISOString()
        .slice(0, 10)
    );

  const [items, setItems] =
    useState<BudgetItem[]>([
      newItem(),
    ]);

  const [
    discountPercent,
    setDiscountPercent,
  ] = useState("0");

  const [
    desiredAmount,
    setDesiredAmount,
  ] = useState("");

  const [
    materialsValue,
    setMaterialsValue,
  ] = useState("0");

  const [
    negotiationMessage,
    setNegotiationMessage,
  ] = useState("");

  const subtotal = useMemo(() => {
    return items.reduce(
      (total, item) =>
        total + itemTotal(item),
      0
    );
  }, [items]);

  const discountNumber = Math.min(
    100,
    Math.max(
      0,
      toNumber(discountPercent)
    )
  );

  const discountValue =
    subtotal *
    (discountNumber / 100);

  const finalValue =
    subtotal - discountValue;

  const materialsNumber = Math.max(
    0,
    toNumber(materialsValue)
  );

  const grandTotal =
    finalValue + materialsNumber;

  const desiredNumber =
    toNumber(desiredAmount);

  const referenceValue =
    desiredNumber > 0 &&
    discountNumber < 100
      ? desiredNumber /
        (1 - discountNumber / 100)
      : 0;

  async function loadData() {
    setLoading(true);

    try {
      const [
        budgetsResult,
        clientsResult,
      ] = await Promise.all([
        supabase
          .from("orcamentos")
          .select("*")
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("clientes")
          .select(
            "id, nome, cidade"
          )
          .eq("status", "Ativo")
          .order("nome"),
      ]);

      if (budgetsResult.error) {
        throw budgetsResult.error;
      }

      if (clientsResult.error) {
        throw clientsResult.error;
      }

      const loadedBudgets =
        (budgetsResult.data ?? []).map(
          (row: any) => {
            let parsedItems: BudgetItem[] =
              [];

            if (
              Array.isArray(
                row.itens
              )
            ) {
              parsedItems =
                row.itens.map(
                  (item: any) => ({
                    id:
                      item.id ??
                      `${Date.now()}-${Math.random()}`,
                    description:
                      item.description ??
                      item.descricao ??
                      "",
                    quantity:
                      Number(
                        item.quantity ??
                          item.quantidade ??
                          1
                      ),
                    unitValue:
                      Number(
                        item.unitValue ??
                          item.valor_unitario ??
                          item.valor ??
                          0
                      ),
                  })
                );
            }

            if (
              parsedItems.length === 0 &&
              row.servico
            ) {
              parsedItems = [
                {
                  id:
                    `${row.id}-1`,
                  description:
                    row.servico,
                  quantity: 1,
                  unitValue:
                    Number(
                      row.valor ?? 0
                    ),
                },
              ];
            }

            const subtotalValue =
              Number(
                row.subtotal ??
                  parsedItems.reduce(
                    (
                      total,
                      item
                    ) =>
                      total +
                      itemTotal(
                        item
                      ),
                    0
                  )
              );

            const discount =
              Number(
                row.desconto_percentual ??
                  0
              );

            const discountAmount =
              Number(
                row.desconto_valor ??
                  subtotalValue *
                    (discount /
                      100)
              );

            const reference =
              Number(
                row.valor_referencia ??
                  0
              );

            const final =
              Number(
                row.valor_final ??
                  subtotalValue -
                    discountAmount
              );

            const materials =
              Number(
                row.materiais_valor ??
                  0
              );

            const total =
              Number(
                row.total_geral ??
                  final + materials
              );

            return {
              id: row.id,
              number:
                row.numero ??
                `ORC-${String(
                  row.id
                ).slice(0, 6)}`,
              client:
                row.cliente_nome ??
                "",
              clientId:
                row.cliente_id ??
                "",
              city:
                row.cidade ?? "",
              service:
                row.servico ?? "",
              equipment:
                row.equipamento ??
                "",
              value: Number(
                row.valor ??
                  final
              ),
              date:
                row.data ??
                row.created_at ??
                new Date()
                  .toISOString()
                  .slice(0, 10),
              status:
                row.status ??
                "Rascunho",
              items:
                parsedItems,
              subtotal:
                subtotalValue,
              discountPercent:
                discount,
              discountValue:
                discountAmount,
              referenceValue:
                reference,
              finalValue:
                final,
              materialsValue:
                materials,
              totalValue:
                total,
            } as Budget;
          }
        );

      setBudgets(
        loadedBudgets
      );

      setClients(
        (clientsResult.data ??
          []) as Client[]
      );
    } catch (error) {
      console.error(
        "Erro ao carregar orçamentos:",
        error
      );

      alert(
        "Não foi possível carregar os orçamentos."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function resetForm() {
    setEditingBudget(null);
    setClientId("");
    setClientName("");
    setCity("");
    setEquipment("");
    setService("");
    setDate(
      new Date()
        .toISOString()
        .slice(0, 10)
    );

    setItems([
      newItem(),
    ]);

    setDiscountPercent("0");
    setDesiredAmount("");
    setMaterialsValue("0");
    setNegotiationMessage("");
  }

  function openNewBudget() {
    resetForm();
    setShowModal(true);
  }

  function editBudget(
    budget: Budget
  ) {
    setEditingBudget(
      budget
    );

    setClientId(
      budget.clientId
    );

    setClientName(
      budget.client
    );

    setCity(
      budget.city
    );

    setEquipment(
      budget.equipment
    );

    setService(
      budget.service
    );

    setDate(
      budget.date
        ? budget.date.slice(0, 10)
        : new Date()
            .toISOString()
            .slice(0, 10)
    );

    setItems(
      budget.items.length > 0
        ? budget.items
        : [newItem()]
    );

    setDiscountPercent(
      String(
        budget.discountPercent ??
          0
      )
    );

    setDesiredAmount(
      budget.finalValue
        ? String(
            budget.finalValue
          )
        : ""
    );

    setMaterialsValue(
      String(
        budget.materialsValue ??
          0
      )
    );

    setNegotiationMessage("");

    setShowModal(true);
  }

  function updateItem(
    id: string,
    field: keyof BudgetItem,
    value: string | number
  ) {
    setItems(
      (current) =>
        current.map(
          (item) =>
            item.id === id
              ? {
                  ...item,
                  [field]:
                    value,
                }
              : item
        )
    );
  }

  function addItem() {
    setItems(
      (current) => [
        ...current,
        newItem(),
      ]
    );
  }

  function removeItem(
    id: string
  ) {
    setItems(
      (current) => {
        const filtered =
          current.filter(
            (item) =>
              item.id !== id
          );

        return filtered.length > 0
          ? filtered
          : [newItem()];
      }
    );
  }

  function handleClientChange(
    id: string
  ) {
    setClientId(id);

    const client =
      clients.find(
        (item) =>
          item.id === id
      );

    if (client) {
      setClientName(
        client.nome
      );

      setCity(
        client.cidade ?? ""
      );
    }
  }

  async function saveBudget() {
    if (!clientId) {
      alert(
        "Selecione um cliente."
      );

      return;
    }

    if (!service.trim()) {
      alert(
        "Informe o serviço."
      );

      return;
    }

    const validItems =
      items.filter(
        (item) =>
          item.description.trim() &&
          Number(item.quantity) > 0
      );

    if (
      validItems.length === 0
    ) {
      alert(
        "Adicione pelo menos um serviço ao orçamento."
      );

      return;
    }

    setSaving(true);

    try {
      let number =
        editingBudget?.number;

      if (!number) {
        const { data } =
          await supabase
            .from("orcamentos")
            .select("numero")
            .order("created_at", {
              ascending: false,
            })
            .limit(1)
            .maybeSingle();

        if (data?.numero) {
          const match =
            String(
              data.numero
            ).match(
              /(\d+)$/
            );

          const next =
            match
              ? Number(
                  match[1]
                ) + 1
              : 1;

          number = `ORC-${String(
            next
          ).padStart(
            4,
            "0"
          )}`;
        } else {
          number =
            "ORC-0001";
        }
      }

      const payload = {
        numero: number,
        cliente_id:
          clientId,
        cliente_nome:
          clientName,
        cidade: city,
        equipamento:
          equipment,
        servico:
          service,
        data: date,
        itens:
          validItems,
        subtotal,
        desconto_percentual:
          discountNumber,
        desconto_valor:
          discountValue,
        valor_referencia:
          referenceValue,
        valor_final:
          finalValue,
        materiais_valor:
          materialsNumber,
        total_geral:
          grandTotal,
        valor:
          finalValue,
        status:
          editingBudget?.status ??
          "Rascunho",
      };

      let error;

      if (editingBudget) {
        const result =
          await supabase
            .from("orcamentos")
            .update(payload)
            .eq(
              "id",
              editingBudget.id
            );

        error =
          result.error;
      } else {
        const result =
          await supabase
            .from("orcamentos")
            .insert(
              payload
            );

        error =
          result.error;
      }

      if (error) {
        throw error;
      }

      alert(
        editingBudget
          ? "Orçamento atualizado com sucesso!"
          : "Orçamento criado com sucesso!"
      );

      setShowModal(false);
      resetForm();

      await loadData();
    } catch (error) {
      console.error(
        "Erro ao salvar orçamento:",
        error
      );

      alert(
        "Não foi possível salvar o orçamento."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteBudget(
    budget: Budget
  ) {
    const confirmed =
      window.confirm(
        `Excluir o orçamento ${budget.number}?`
      );

    if (!confirmed) {
      return;
    }

    try {
      const { error } =
        await supabase
          .from("orcamentos")
          .delete()
          .eq(
            "id",
            budget.id
          );

      if (error) {
        throw error;
      }

      alert(
        "Orçamento excluído com sucesso."
      );

      await loadData();
    } catch (error) {
      console.error(
        "Erro ao excluir orçamento:",
        error
      );

      alert(
        "Não foi possível excluir o orçamento."
      );
    }
  }

  async function updateStatus(
    budget: Budget,
    status: BudgetStatus
  ) {
    try {
      const { error } =
        await supabase
          .from("orcamentos")
          .update({
            status,
          })
          .eq(
            "id",
            budget.id
          );

      if (error) {
        throw error;
      }

      await loadData();
    } catch (error) {
      console.error(
        "Erro ao atualizar status:",
        error
      );

      alert(
        "Não foi possível atualizar o status."
      );
    }
  }

  async function generateOrderNumber() {
    const { data, error } =
      await supabase
        .from("ordens_servico")
        .select("numero")
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data?.numero) {
      return "OS-0001";
    }

    const match =
      String(data.numero).match(
        /(\d+)$/
      );

    const next =
      match
        ? Number(match[1]) + 1
        : 1;

    return `OS-${String(
      next
    ).padStart(4, "0")}`;
  }

  function getServiceType(
    serviceName: string
  ) {
    const text =
      serviceName
        .toLowerCase();

    if (
      text.includes(
        "instala"
      )
    ) {
      return "Instalação";
    }

    if (
      text.includes(
        "higien"
      ) ||
      text.includes(
        "limpeza"
      )
    ) {
      return "Higienização";
    }

    if (
      text.includes(
        "corret"
      ) ||
      text.includes(
        "conserto"
      ) ||
      text.includes(
        "reparo"
      )
    ) {
      return "Corretiva";
    }

    if (
      text.includes(
        "prevent"
      )
    ) {
      return "Preventiva";
    }

    return "Visita técnica";
  }

  async function generateServiceOrder(
    budget: Budget
  ) {
    if (
      budget.status !==
      "Aprovado"
    ) {
      alert(
        "O orçamento precisa estar aprovado para gerar uma OS."
      );

      return;
    }

    if (!budget.clientId) {
      alert(
        "Este orçamento não possui cliente vinculado."
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Gerar Ordem de Serviço para ${budget.client}?\n\n` +
          `Orçamento: ${budget.number}\n` +
          `Serviços: ${budget.service}\n` +
          `Valor dos serviços: ${money(
            budget.finalValue
          )}\n` +
          `Materiais: ${money(
            budget.materialsValue
          )}\n` +
          `Desconto: ${Number(
            budget.discountPercent ??
              0
          ).toFixed(2)}%\n` +
          `Total geral: ${money(
            budget.totalValue
          )}`
      );

    if (!confirmed) {
      return;
    }

    setGeneratingOrderId(
      budget.id
    );

    try {
      const {
        data: existingOrders,
        error: existingError,
      } = await supabase
        .from("ordens_servico")
        .select(
          "id, numero, observacoes"
        )
        .eq(
          "cliente_id",
          budget.clientId
        );

      if (existingError) {
        throw existingError;
      }

      const alreadyGenerated =
        (
          existingOrders ?? []
        ).some(
          (order) =>
            String(
              order.observacoes ??
                ""
            ).includes(
              budget.number
            )
        );

      if (alreadyGenerated) {
        alert(
          "A Ordem de Serviço deste orçamento já foi gerada."
        );

        return;
      }

      const number =
        await generateOrderNumber();

      const serviceLines =
        budget.items
          .filter(
            (item) =>
              item.description.trim()
          )
          .map(
            (item) =>
              `${item.quantity}x ${item.description} - ${money(
                itemTotal(item)
              )}`
          );

      const subtotalServicos =
        Number(
          budget.subtotal ?? 0
        );

      const descontoPercentual =
        Number(
          budget.discountPercent ??
            0
        );

      const descontoValor =
        Number(
          budget.discountValue ??
            0
        );

      const valorServicos =
        Number(
          budget.finalValue ??
            0
        );

      const valorMateriais =
        Number(
          budget.materialsValue ??
            0
        );

      const totalGeral =
        Number(
          budget.totalValue ??
            0
        );

      const serviceDescription =
        [
          `Serviços aprovados no orçamento ${budget.number}:`,
          "",
          ...serviceLines,
          "",
          `Subtotal dos serviços: ${money(
            subtotalServicos
          )}`,
          `Desconto: ${descontoPercentual.toFixed(
            2
          )}% - ${money(
            descontoValor
          )}`,
          `Serviços após desconto: ${money(
            valorServicos
          )}`,
          "",
          `Materiais: ${money(
            valorMateriais
          )}`,
          "",
          `TOTAL DO ORÇAMENTO: ${money(
            totalGeral
          )}`,
        ].join("\n");

      const serviceType =
        getServiceType(
          budget.service
        );

      const materialDescription =
        valorMateriais > 0
          ? `Materiais previstos no orçamento ${budget.number}: ${money(
              valorMateriais
            )}`
          : "";

      const observations =
        [
          `Gerada automaticamente a partir do orçamento ${budget.number}.`,
          `Subtotal dos serviços: ${money(
            subtotalServicos
          )}.`,
          `Desconto: ${descontoPercentual.toFixed(
            2
          )}% (${money(
            descontoValor
          )}).`,
          `Serviços após desconto: ${money(
            valorServicos
          )}.`,
          `Materiais previstos: ${money(
            valorMateriais
          )}.`,
          `Total geral do orçamento: ${money(
            totalGeral
          )}.`,
        ].join(" ");

      const { error } =
        await supabase
          .from(
            "ordens_servico"
          )
          .insert({
            numero: number,

            cliente_id:
              budget.clientId,

            cliente_nome:
              budget.client,

            equipamento:
              budget.equipment ||
              "Não informado",

            cidade:
              budget.city,

            tipo_servico:
              serviceType,

            descricao:
              serviceDescription,

            data: new Date()
              .toISOString()
              .slice(0, 10),

            tecnico: null,

            valor_servicos:
              valorServicos,

            valor_materiais:
              valorMateriais,

            materiais_descricao:
              materialDescription ||
              null,

            valor:
              totalGeral,

            status:
              "Aberta",

            observacoes:
              observations,

            materiais_pago:
              false,

            materiais_pago_em:
              null,
          });

      if (error) {
        throw error;
      }

      alert(
        `OS ${number} criada com sucesso!\n\n` +
          `Serviços: ${money(
            valorServicos
          )}\n` +
          `Materiais: ${money(
            valorMateriais
          )}\n` +
          `Desconto: ${descontoPercentual.toFixed(
            2
          )}% (${money(
            descontoValor
          )})\n` +
          `Total: ${money(
            totalGeral
          )}`
      );

      window.location.href = `/ordens-servico?novo=1&valor_servico=${valorServicos}&materiais=${valorMateriais}&observacoes=${encodeURIComponent(observations)}`;
    } catch (error) {
      console.error(
        "Erro ao gerar Ordem de Serviço:",
        error
      );

      alert(
        "Não foi possível gerar a Ordem de Serviço."
      );
    } finally {
      setGeneratingOrderId(
        null
      );
    }
  }

  function buildWhatsAppMessage(
    budget: Budget
  ) {
    const lines =
      budget.items
        .filter(
          (item) =>
            item.description.trim()
        )
        .map(
          (item) =>
            `• ${item.quantity}x ${item.description} — ${money(
              itemTotal(item)
            )}`
        );

    return [
      `Olá, ${budget.client}!`,
      "",
      `Segue o orçamento ${budget.number}:`,
      "",
      ...lines,
      "",
      `Subtotal dos serviços: ${money(
        budget.subtotal
      )}`,
      `Desconto: ${Number(
        budget.discountPercent ?? 0
      ).toFixed(2)}%`,
      `Valor do desconto: ${money(
        budget.discountValue
      )}`,
      `Serviços após desconto: ${money(
        budget.finalValue
      )}`,
      `Materiais: ${money(
        budget.materialsValue
      )}`,
      "",
      `TOTAL: ${money(
        budget.totalValue
      )}`,
      "",
      "Ficamos à disposição.",
    ].join("\n");
  }

  function openWhatsApp(
    budget: Budget
  ) {
    const message =
      buildWhatsAppMessage(
        budget
      );

    const url =
      `https://wa.me/?text=${encodeURIComponent(
        message
      )}`;

    window.open(
      url,
      "_blank"
    );
  }

  function printBudget(
    budget: Budget
  ) {
    const lines =
      budget.items
        .filter(
          (item) =>
            item.description.trim()
        )
        .map(
          (item) =>
            `<tr>
              <td>${item.description}</td>
              <td>${item.quantity}</td>
              <td>${money(
                item.unitValue
              )}</td>
              <td>${money(
                itemTotal(item)
              )}</td>
            </tr>`
        )
        .join("");

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>${budget.number}</title>

        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 30px;
            color: #222;
          }

          h1 {
            margin-bottom: 5px;
          }

          h2 {
            margin-top: 30px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
          }

          th,
          td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
          }

          th {
            background: #f5f5f5;
          }

          .totals {
            margin-top: 25px;
            width: 100%;
          }

          .row {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
          }

          .total {
            font-size: 20px;
            font-weight: bold;
            border-top: 2px solid #222;
            padding-top: 10px;
            margin-top: 10px;
          }

          .discount {
            color: #b00020;
          }
        </style>
      </head>

      <body>
        <h1>Orçamento ${budget.number}</h1>

        <p>
          <strong>Cliente:</strong>
          ${budget.client}
        </p>

        <p>
          <strong>Cidade:</strong>
          ${budget.city || "-"}
        </p>

        <p>
          <strong>Equipamento:</strong>
          ${budget.equipment || "-"}
        </p>

        <p>
          <strong>Serviço:</strong>
          ${budget.service}
        </p>

        <table>
          <thead>
            <tr>
              <th>Serviço</th>
              <th>Qtd.</th>
              <th>Valor unitário</th>
              <th>Total</th>
            </tr>
          </thead>

          <tbody>
            ${lines}
          </tbody>
        </table>

        <div class="totals">
          <div class="row">
            <span>Subtotal dos serviços:</span>
            <strong>${money(
              budget.subtotal
            )}</strong>
          </div>

          <div class="row discount">
            <span>
              Desconto (${Number(
                budget.discountPercent ??
                  0
              ).toFixed(2)}%):
            </span>

            <strong>
              - ${money(
                budget.discountValue
              )}
            </strong>
          </div>

          <div class="row">
            <span>Serviços após desconto:</span>
            <strong>${money(
              budget.finalValue
            )}</strong>
          </div>

          <div class="row">
            <span>Materiais:</span>
            <strong>${money(
              budget.materialsValue
            )}</strong>
          </div>

          <div class="row total">
            <span>Total geral:</span>
            <strong>${money(
              budget.totalValue
            )}</strong>
          </div>
        </div>
      </body>
      </html>
    `;

    const printWindow =
      window.open(
        "",
        "_blank"
      );

    if (!printWindow) {
      alert(
        "Não foi possível abrir a impressão. Verifique o bloqueador de pop-ups."
      );

      return;
    }

    printWindow.document.write(
      html
    );

    printWindow.document.close();

    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 300);
  }

  const filteredBudgets =
    useMemo(() => {
      const normalizedSearch =
        search
          .toLowerCase()
          .trim();

      return budgets.filter(
        (budget) => {
          const matchesSearch =
            !normalizedSearch ||
            budget.number
              .toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            budget.client
              .toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            budget.service
              .toLowerCase()
              .includes(
                normalizedSearch
              );

          const matchesStatus =
            statusFilter ===
              "Todos" ||
            budget.status ===
              statusFilter;

          return (
            matchesSearch &&
            matchesStatus
          );
        }
      );
    }, [
      budgets,
      search,
      statusFilter,
    ]);

  const statusCounts =
    useMemo(() => {
      return {
        total: budgets.length,
        rascunho:
          budgets.filter(
            (item) =>
              item.status ===
              "Rascunho"
          ).length,
        enviado:
          budgets.filter(
            (item) =>
              item.status ===
              "Enviado"
          ).length,
        aprovado:
          budgets.filter(
            (item) =>
              item.status ===
              "Aprovado"
          ).length,
        recusado:
          budgets.filter(
            (item) =>
              item.status ===
              "Recusado"
          ).length,
      };
    }, [budgets]);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl text-white">
              Orçamentos
            </h1>

            <p className="text-sm text-slate-400">
              Crie, edite, envie e transforme orçamentos aprovados em Ordens de Serviço.
            </p>
          </div>

          <button
            onClick={openNewBudget}
            className="flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            <Plus size={20} />
            Novo orçamento
          </button>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <button
            onClick={() =>
              setStatusFilter("Todos")
            }
            className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-left transition hover:bg-slate-800"
          >
            <div className="text-sm text-slate-400">
              Total
            </div>
            <div className="mt-2 text-2xl font-bold text-white">
              {statusCounts.total}
            </div>
          </button>

          <button
            onClick={() =>
              setStatusFilter(
                "Rascunho"
              )
            }
            className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-left transition hover:bg-slate-800"
          >
            <div className="text-sm text-slate-400">
              Rascunhos
            </div>
            <div className="mt-2 text-2xl font-bold text-yellow-400">
              {statusCounts.rascunho}
            </div>
          </button>

          <button
            onClick={() =>
              setStatusFilter(
                "Enviado"
              )
            }
            className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-left transition hover:bg-slate-800"
          >
            <div className="text-sm text-slate-400">
              Enviados
            </div>
            <div className="mt-2 text-2xl font-bold text-blue-400">
              {statusCounts.enviado}
            </div>
          </button>

          <button
            onClick={() =>
              setStatusFilter(
                "Aprovado"
              )
            }
            className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-left transition hover:bg-slate-800"
          >
            <div className="text-sm text-slate-400">
              Aprovados
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-400">
              {statusCounts.aprovado}
            </div>
          </button>

          <button
            onClick={() =>
              setStatusFilter(
                "Recusado"
              )
            }
            className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-left transition hover:bg-slate-800"
          >
            <div className="text-sm text-slate-400">
              Recusados
            </div>
            <div className="mt-2 text-2xl font-bold text-red-400">
              {statusCounts.recusado}
            </div>
          </button>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search
                size={20}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Buscar por número, cliente ou serviço..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-4 text-sm text-white outline-none focus:border-cyan-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target
                    .value as
                    | "Todos"
                    | BudgetStatus
                )
              }
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500"
            >
              <option value="Todos">
                Todos os status
              </option>
              <option value="Rascunho">
                Rascunho
              </option>
              <option value="Enviado">
                Enviado
              </option>
              <option value="Aprovado">
                Aprovado
              </option>
              <option value="Recusado">
                Recusado
              </option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 px-5 py-4">
            <h2 className="font-semibold text-white">
              Lista de Orçamentos
            </h2>

            <p className="text-xs text-slate-400">
              {filteredBudgets.length} orçamento(s) encontrado(s)
            </p>
          </div>

          {loading ? (
            <div className="p-10 text-center text-slate-400">
              Carregando orçamentos...
            </div>
          ) : filteredBudgets.length ===
            0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <FileText
                size={45}
                className="mb-4 text-slate-700"
              />

              <h2 className="text-lg font-semibold text-white">
                Nenhum orçamento encontrado
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Crie um novo orçamento para começar.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {filteredBudgets.map(
                (budget) => (
                  <div
                    key={
                      budget.id
                    }
                    className="p-5 transition hover:bg-slate-800/30"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-white">
                            {budget.number}
                          </h3>

                          <select
                            value={
                              budget.status
                            }
                            onChange={(
                              event
                            ) =>
                              updateStatus(
                                budget,
                                event
                                  .target
                                  .value as BudgetStatus
                              )
                            }
                            className={`rounded-full border px-3 py-1 text-xs font-semibold outline-none ${statusBudgetClass(
                              budget.status
                            )} bg-slate-950`}
                          >
                            <option value="Rascunho">
                              Rascunho
                            </option>
                            <option value="Enviado">
                              Enviado
                            </option>
                            <option value="Aprovado">
                              Aprovado
                            </option>
                            <option value="Recusado">
                              Recusado
                            </option>
                          </select>
                        </div>

                        <div className="mt-3 grid gap-2 text-sm text-slate-400 sm:grid-cols-2 lg:grid-cols-3">
                          <span className="flex items-center gap-2">
                            <User size={16} className="text-cyan-400" />
                            {budget.client}
                          </span>

                          <span className="flex items-center gap-2">
                            <MapPin size={16} className="text-cyan-400" />
                            {budget.city || "-"}
                          </span>

                          <span className="flex items-center gap-2">
                            <CalendarDays size={16} className="text-cyan-400" />
                            {formatDate(budget.date)}
                          </span>
                        </div>

                        <div className="mt-2 text-sm text-slate-300">
                          Serviço: <span className="font-medium text-white">{budget.service}</span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-4 text-sm">
                          <span>
                            Desconto:{" "}
                            <strong className="text-red-400">
                              {Number(
                                budget.discountPercent ?? 0
                              ).toFixed(2)}% (-{money(budget.discountValue)})
                            </strong>
                          </span>

                          <span>
                            Total:{" "}
                            <strong className="text-cyan-400 font-bold">
                              {money(
                                budget.totalValue
                              )}
                            </strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          title="Visualizar"
                          onClick={() => {
                            setPreviewBudget(
                              budget
                            );

                            setShowPreview(
                              true
                            );
                          }}
                          className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-800"
                        >
                          <Eye
                            size={18}
                          />
                        </button>

                        <button
                          title="Editar"
                          onClick={() =>
                            editBudget(
                              budget
                            )
                          }
                          className="flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-sm text-cyan-400 hover:bg-slate-800"
                        >
                          <Edit
                            size={16}
                          />
                          Editar
                        </button>

                        <button
                          title="WhatsApp"
                          onClick={() =>
                            openWhatsApp(
                              budget
                            )
                          }
                          className="rounded-lg border border-emerald-500/20 p-2 text-emerald-400 hover:bg-emerald-500/10"
                        >
                          <MessageCircle
                            size={
                              18
                            }
                          />
                        </button>

                        <button
                          title="Imprimir"
                          onClick={() =>
                            printBudget(
                              budget
                            )
                          }
                          className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-800"
                        >
                          <Printer
                            size={
                              18
                            }
                          />
                        </button>

                        {budget.status ===
                          "Aprovado" && (
                          <button
                            title="Gerar Ordem de Serviço"
                            onClick={() =>
                              generateServiceOrder(
                                budget
                              )
                            }
                            disabled={
                              generatingOrderId ===
                              budget.id
                            }
                            className="rounded-lg bg-cyan-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
                          >
                            {generatingOrderId ===
                            budget.id
                              ? "Gerando..."
                              : "Gerar OS"}
                          </button>
                        )}

                        <button
                          title="Excluir"
                          onClick={() =>
                            deleteBudget(
                              budget
                            )
                          }
                          className="rounded-lg border border-red-500/20 p-2 text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2
                            size={
                              18
                            }
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm">
          <div className="max-h-[95vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-800 bg-slate-900 px-5 py-4">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {editingBudget
                    ? "Editar orçamento"
                    : "Novo orçamento"}
                </h2>

                <p className="text-xs text-slate-400">
                  Informe os serviços, desconto e materiais.
                </p>
              </div>

              <button
                onClick={() =>
                  setShowModal(
                    false
                  )
                }
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800"
              >
                <X size={22} />
              </button>
            </div>

            <div className="space-y-6 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">
                    Cliente
                  </label>

                  <select
                    value={clientId}
                    onChange={(event) =>
                      handleClientChange(
                        event.target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none focus:border-cyan-500"
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
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">
                    Cidade
                  </label>

                  <input
                    value={city}
                    onChange={(event) =>
                      setCity(
                        event.target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">
                    Serviço principal
                  </label>

                  <input
                    value={service}
                    onChange={(event) =>
                      setService(
                        event.target
                          .value
                      )
                    }
                    placeholder="Ex.: Instalação de ar-condicionado"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">
                    Equipamento
                  </label>

                  <input
                    value={equipment}
                    onChange={(event) =>
                      setEquipment(
                        event.target
                          .value
                      )
                    }
                    placeholder="Ex.: Split 12.000 BTUs"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">
                    Data
                  </label>

                  <input
                    type="date"
                    value={date}
                    onChange={(event) =>
                      setDate(
                        event.target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white">
                      Serviços
                    </h3>

                    <p className="text-sm text-slate-400">
                      Adicione todos os serviços do orçamento.
                    </p>
                  </div>

                  <button
                    onClick={
                      addItem
                    }
                    type="button"
                    className="flex items-center gap-2 rounded-lg bg-cyan-500/10 px-3 py-2 text-sm font-semibold text-cyan-400 hover:bg-cyan-500/20"
                  >
                    <Plus
                      size={16}
                    />
                    Adicionar serviço
                  </button>
                </div>

                <div className="space-y-3">
                  {items.map(
                    (item) => (
                      <div
                        key={
                          item.id
                        }
                        className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3 md:grid-cols-[1fr_100px_140px_140px_45px]"
                      >
                        <input
                          value={
                            item.description
                          }
                          onChange={(
                            event
                          ) =>
                            updateItem(
                              item.id,
                              "description",
                              event
                                .target
                                .value
                            )
                          }
                          placeholder="Descrição do serviço"
                          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-cyan-500"
                        />

                        <input
                          type="number"
                          min="1"
                          value={
                            item.quantity
                          }
                          onChange={(
                            event
                          ) =>
                            updateItem(
                              item.id,
                              "quantity",
                              Number(
                                event
                                  .target
                                  .value
                              )
                            )
                          }
                          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-cyan-500"
                        />

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={
                            item.unitValue
                          }
                          onChange={(
                            event
                          ) =>
                            updateItem(
                              item.id,
                              "unitValue",
                              Number(
                                event
                                  .target
                                  .value
                              )
                            )
                          }
                          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-cyan-500"
                          placeholder="Valor"
                        />

                        <div className="flex items-center justify-end rounded-lg bg-slate-900 px-3 font-semibold text-white">
                          {money(
                            itemTotal(
                              item
                            )
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            removeItem(
                              item.id
                            )
                          }
                          className="flex items-center justify-center rounded-lg text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2
                            size={
                              18
                            }
                          />
                        </button>
                      </div>
                    )
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">
                    Desconto (%)
                  </label>

                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={
                      discountPercent
                    }
                    onChange={(
                      event
                    ) =>
                      setDiscountPercent(
                        event
                          .target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">
                    Valor desejado
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      desiredAmount
                    }
                    onChange={(
                      event
                    ) =>
                      setDesiredAmount(
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="Opcional"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">
                    Materiais
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      materialsValue
                    }
                    onChange={(
                      event
                    ) =>
                      setMaterialsValue(
                        event
                          .target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {referenceValue >
                0 && (
                <div className="rounded-xl bg-cyan-500/10 border border-cyan-500/20 p-4 text-sm text-cyan-300">
                  <strong>
                    Valor de referência:
                  </strong>{" "}
                  {money(
                    referenceValue
                  )}
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">
                  Observação / negociação
                </label>

                <textarea
                  value={
                    negotiationMessage
                  }
                  onChange={(
                    event
                  ) =>
                    setNegotiationMessage(
                      event
                        .target
                        .value
                    )
                  }
                  rows={3}
                  placeholder="Observações do orçamento..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div className="rounded-2xl bg-slate-950 border border-slate-800 p-5 text-white">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">
                      Subtotal dos serviços
                    </span>

                    <strong>
                      {money(
                        subtotal
                      )}
                    </strong>
                  </div>

                  <div className="flex justify-between text-red-400">
                    <span>
                      Desconto (
                      {discountNumber.toFixed(
                        2
                      )}
                      %)
                    </span>

                    <strong>
                      -{" "}
                      {money(
                        discountValue
                      )}
                    </strong>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400">
                      Serviços após desconto
                    </span>

                    <strong>
                      {money(
                        finalValue
                      )}
                    </strong>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400">
                      Materiais
                    </span>

                    <strong>
                      {money(
                        materialsNumber
                      )}
                    </strong>
                  </div>
                </div>

                <div className="mt-4 flex justify-between border-t border-slate-800 pt-4 text-xl font-bold text-cyan-400">
                  <span>
                    TOTAL GERAL
                  </span>

                  <span>
                    {money(
                      grandTotal
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 flex flex-col-reverse gap-3 border-t border-slate-800 bg-slate-900 p-5 sm:flex-row sm:justify-end">
              <button
                onClick={() =>
                  setShowModal(
                    false
                  )
                }
                className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-white hover:bg-slate-800"
              >
                Cancelar
              </button>

              <button
                onClick={
                  saveBudget
                }
                disabled={saving}
                className="rounded-xl bg-cyan-500 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
              >
                {saving
                  ? "Salvando..."
                  : "Salvar orçamento"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPreview &&
        previewBudget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm">
            <div className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
              <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-800 bg-slate-900 px-5 py-4">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    Orçamento{" "}
                    {
                      previewBudget.number
                    }
                  </h2>

                  <p className="text-sm text-slate-400">
                    {
                      previewBudget.client
                    }
                  </p>
                </div>

                <button
                  onClick={() =>
                    setShowPreview(
                      false
                    )
                  }
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-800"
                >
                  <X size={22} />
                </button>
              </div>

              <div className="space-y-5 p-5">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl bg-slate-950 p-4 border border-slate-800">
                    <div className="text-xs text-slate-400">
                      Cliente
                    </div>

                    <div className="font-semibold text-white">
                      {
                        previewBudget.client
                      }
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-950 p-4 border border-slate-800">
                    <div className="text-xs text-slate-400">
                      Equipamento
                    </div>

                    <div className="font-semibold text-white">
                      {
                        previewBudget.equipment ||
                        "-"
                      }
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 font-bold text-white">
                    Serviços
                  </h3>

                  <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-950 text-slate-400">
                        <tr>
                          <th className="px-3 py-2 text-left">
                            Descrição
                          </th>

                          <th className="px-3 py-2 text-center">
                            Qtd.
                          </th>

                          <th className="px-3 py-2 text-right">
                            Unitário
                          </th>

                          <th className="px-3 py-2 text-right">
                            Total
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-800 text-white">
                        {previewBudget.items
                          .filter(
                            (
                              item
                            ) =>
                              item.description.trim()
                          )
                          .map(
                            (
                              item
                            ) => (
                              <tr
                                key={
                                  item.id
                                }
                              >
                                <td className="px-3 py-3">
                                  {
                                    item.description
                                  }
                                </td>

                                <td className="px-3 py-3 text-center">
                                  {
                                    item.quantity
                                  }
                                </td>

                                <td className="px-3 py-3 text-right">
                                  {money(
                                    item.unitValue
                                  )}
                                </td>

                                <td className="px-3 py-3 text-right font-semibold">
                                  {money(
                                    itemTotal(
                                      item
                                    )
                                  )}
                                </td>
                              </tr>
                            )
                          )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-950 border border-slate-800 p-5 text-white">
                  <div className="flex justify-between py-1 text-slate-300">
                    <span>
                      Subtotal dos serviços
                    </span>

                    <strong>
                      {money(
                        previewBudget.subtotal
                      )}
                    </strong>
                  </div>

                  <div className="flex justify-between py-1 text-red-400">
                    <span>
                      Desconto (
                      {Number(
                        previewBudget.discountPercent ??
                          0
                      ).toFixed(
                        2
                      )}
                      %)
                    </span>

                    <strong>
                      -{" "}
                      {money(
                        previewBudget.discountValue
                      )}
                    </strong>
                  </div>

                  <div className="flex justify-between py-1 text-slate-300">
                    <span>
                      Serviços após desconto
                    </span>

                    <strong>
                      {money(
                        previewBudget.finalValue
                      )}
                    </strong>
                  </div>

                  <div className="flex justify-between py-1 text-slate-300">
                    <span>
                      Materiais
                    </span>

                    <strong>
                      {money(
                        previewBudget.materialsValue
                      )}
                    </strong>
                  </div>

                  <div className="mt-3 flex justify-between border-t border-slate-800 pt-3 text-xl font-bold text-cyan-400">
                    <span>
                      TOTAL GERAL
                    </span>

                    <span>
                      {money(
                        previewBudget.totalValue
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={() =>
                      printBudget(
                        previewBudget
                      )
                    }
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-semibold text-white hover:bg-slate-800"
                  >
                    <Printer
                      size={18}
                    />
                    Imprimir
                  </button>

                  <button
                    onClick={() =>
                      openWhatsApp(
                        previewBudget
                      )
                    }
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-500"
                  >
                    <MessageCircle
                      size={18}
                    />
                    WhatsApp
                  </button>

                  {previewBudget.status ===
                    "Aprovado" && (
                    <button
                      onClick={() =>
                        generateServiceOrder(
                          previewBudget
                        )
                      }
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 hover:bg-cyan-400"
                    >
                      <FileText
                        size={18}
                      />
                      Gerar OS
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
    </main>
  );
}
