"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Edit,
  Eye,
  FileText,
  MessageCircle,
  Plus,
  Search,
  Trash2,
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

      // REDIRECIONAMENTO COM OS VALORES PASSADOS NA URL:
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
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Orçamentos
            </h1>

            <p className="text-sm text-slate-500">
              Crie, edite, envie e transforme
              orçamentos aprovados em Ordens de Serviço.
            </p>
          </div>

          <button
            onClick={openNewBudget}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow hover:bg-blue-700"
          >
            <Plus size={20} />
            Novo orçamento
          </button>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
          <button
            onClick={() =>
              setStatusFilter("Todos")
            }
            className="rounded-xl bg-white p-4 text-left shadow-sm"
          >
            <div className="text-sm text-slate-500">
              Total
            </div>
            <div className="text-2xl font-bold">
              {statusCounts.total}
            </div>
          </button>

          <button
            onClick={() =>
              setStatusFilter(
                "Rascunho"
              )
            }
            className="rounded-xl bg-white p-4 text-left shadow-sm"
          >
            <div className="text-sm text-slate-500">
              Rascunhos
            </div>
            <div className="text-2xl font-bold">
              {statusCounts.rascunho}
            </div>
          </button>

          <button
            onClick={() =>
              setStatusFilter(
                "Enviado"
              )
            }
            className="rounded-xl bg-white p-4 text-left shadow-sm"
          >
            <div className="text-sm text-slate-500">
              Enviados
            </div>
            <div className="text-2xl font-bold">
              {statusCounts.enviado}
            </div>
          </button>

          <button
            onClick={() =>
              setStatusFilter(
                "Aprovado"
              )
            }
            className="rounded-xl bg-white p-4 text-left shadow-sm"
          >
            <div className="text-sm text-slate-500">
              Aprovados
            </div>
            <div className="text-2xl font-bold">
              {statusCounts.aprovado}
            </div>
          </button>

          <button
            onClick={() =>
              setStatusFilter(
                "Recusado"
              )
            }
            className="rounded-xl bg-white p-4 text-left shadow-sm"
          >
            <div className="text-sm text-slate-500">
              Recusados
            </div>
            <div className="text-2xl font-bold">
              {statusCounts.recusado}
            </div>
          </button>
        </div>

        <div className="mb-6 flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search
              size={20}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Buscar por número, cliente ou serviço..."
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 outline-none focus:border-blue-500"
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
            className="rounded-xl border border-slate-200 bg-white px-4 py-3"
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

        {loading ? (
          <div className="rounded-xl bg-white p-10 text-center text-slate-500 shadow-sm">
            Carregando orçamentos...
          </div>
        ) : filteredBudgets.length ===
          0 ? (
          <div className="rounded-xl bg-white p-10 text-center shadow-sm">
            <FileText
              size={45}
              className="mx-auto mb-3 text-slate-300"
            />

            <h2 className="text-lg font-semibold">
              Nenhum orçamento encontrado
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Crie um novo orçamento para começar.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      Número
                    </th>

                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      Cliente
                    </th>

                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      Serviço
                    </th>

                    <th className="px-4 py-3 text-right text-sm font-semibold">
                      Desconto
                    </th>

                    <th className="px-4 py-3 text-right text-sm font-semibold">
                      Total
                    </th>

                    <th className="px-4 py-3 text-center text-sm font-semibold">
                      Status
                    </th>

                    <th className="px-4 py-3 text-center text-sm font-semibold">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredBudgets.map(
                    (budget) => (
                      <tr
                        key={
                          budget.id
                        }
                        className="border-t border-slate-100"
                      >
                        <td className="px-4 py-4 font-semibold">
                          {
                            budget.number
                          }
                        </td>

                        <td className="px-4 py-4">
                          <div className="font-medium">
                            {
                              budget.client
                            }
                          </div>

                          <div className="text-xs text-slate-500">
                            {
                              budget.city
                            }
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          {
                            budget.service
                          }
                        </td>

                        <td className="px-4 py-4 text-right">
                          <div className="font-medium">
                            {Number(
                              budget.discountPercent ??
                                0
                            ).toFixed(
                              2
                            )}
                            %
                          </div>

                          <div className="text-xs text-red-600">
                            -
                            {money(
                              budget.discountValue
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-4 text-right font-bold">
                          {money(
                            budget.totalValue
                          )}
                        </td>

                        <td className="px-4 py-4 text-center">
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
                            className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
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
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-2">
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
                              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
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
                              className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                            >
                              <Edit
                                size={18}
                              />
                            </button>

                            <button
                              title="WhatsApp"
                              onClick={() =>
                                openWhatsApp(
                                  budget
                                )
                              }
                              className="rounded-lg p-2 text-green-600 hover:bg-green-50"
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
                              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                            >
                              <FileText
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
                                className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
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
                              className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                            >
                              <Trash2
                                size={
                                  18
                                }
                              />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[95vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b bg-white px-5 py-4">
              <div>
                <h2 className="text-xl font-bold">
                  {editingBudget
                    ? "Editar orçamento"
                    : "Novo orçamento"}
                </h2>

                <p className="text-sm text-slate-500">
                  Informe os serviços, desconto e materiais.
                </p>
              </div>

              <button
                onClick={() =>
                  setShowModal(
                    false
                  )
                }
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X size={22} />
              </button>
            </div>

            <div className="space-y-6 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">
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
                    className="w-full rounded-xl border border-slate-200 px-3 py-3"
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
                  <label className="mb-1 block text-sm font-medium">
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
                    className="w-full rounded-xl border border-slate-200 px-3 py-3"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
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
                    className="w-full rounded-xl border border-slate-200 px-3 py-3"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
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
                    className="w-full rounded-xl border border-slate-200 px-3 py-3"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
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
                    className="w-full rounded-xl border border-slate-200 px-3 py-3"
                  />
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold">
                      Serviços
                    </h3>

                    <p className="text-sm text-slate-500">
                      Adicione todos os serviços do orçamento.
                    </p>
                  </div>

                  <button
                    onClick={
                      addItem
                    }
                    type="button"
                    className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700"
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
                        className="grid gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-[1fr_100px_140px_140px_45px]"
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
                          className="rounded-lg border border-slate-200 px-3 py-2"
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
                          className="rounded-lg border border-slate-200 px-3 py-2"
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
                          className="rounded-lg border border-slate-200 px-3 py-2"
                          placeholder="Valor"
                        />

                        <div className="flex items-center justify-end rounded-lg bg-slate-50 px-3 font-semibold">
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
                          className="flex items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
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
                  <label className="mb-1 block text-sm font-medium">
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
                    className="w-full rounded-xl border border-slate-200 px-3 py-3"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
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
                    className="w-full rounded-xl border border-slate-200 px-3 py-3"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
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
                    className="w-full rounded-xl border border-slate-200 px-3 py-3"
                  />
                </div>
              </div>

              {referenceValue >
                0 && (
                <div className="rounded-xl bg-blue-50 p-4 text-sm">
                  <strong>
                    Valor de referência:
                  </strong>{" "}
                  {money(
                    referenceValue
                  )}
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium">
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
                  className="w-full rounded-xl border border-slate-200 px-3 py-3"
                />
              </div>

              <div className="rounded-2xl bg-slate-900 p-5 text-white">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="flex justify-between">
                    <span>
                      Subtotal dos serviços
                    </span>

                    <strong>
                      {money(
                        subtotal
                      )}
                    </strong>
                  </div>

                  <div className="flex justify-between text-red-300">
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
                    <span>
                      Serviços após desconto
                    </span>

                    <strong>
                      {money(
                        finalValue
                      )}
                    </strong>
                  </div>

                  <div className="flex justify-between">
                    <span>
                      Materiais
                    </span>

                    <strong>
                      {money(
                        materialsNumber
                      )}
                    </strong>
                  </div>
                </div>

                <div className="mt-4 flex justify-between border-t border-white/20 pt-4 text-xl font-bold">
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

            <div className="sticky bottom-0 flex flex-col-reverse gap-3 border-t bg-white p-5 sm:flex-row sm:justify-end">
              <button
                onClick={() =>
                  setShowModal(
                    false
                  )
                }
                className="rounded-xl border border-slate-200 px-5 py-3 font-semibold"
              >
                Cancelar
              </button>

              <button
                onClick={
                  saveBudget
                }
                disabled={saving}
                className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
              <div className="sticky top-0 flex items-center justify-between border-b bg-white px-5 py-4">
                <div>
                  <h2 className="text-xl font-bold">
                    Orçamento{" "}
                    {
                      previewBudget.number
                    }
                  </h2>

                  <p className="text-sm text-slate-500">
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
                  className="rounded-lg p-2 hover:bg-slate-100"
                >
                  <X size={22} />
                </button>
              </div>

              <div className="space-y-5 p-5">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-xs text-slate-500">
                      Cliente
                    </div>

                    <div className="font-semibold">
                      {
                        previewBudget.client
                      }
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-xs text-slate-500">
                      Equipamento
                    </div>

                    <div className="font-semibold">
                      {
                        previewBudget.equipment ||
                        "-"
                      }
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 font-bold">
                    Serviços
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-slate-100">
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

                      <tbody>
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
                                className="border-t"
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

                <div className="rounded-2xl bg-slate-50 p-5">
                  <div className="flex justify-between py-1">
                    <span>
                      Subtotal dos serviços
                    </span>

                    <strong>
                      {money(
                        previewBudget.subtotal
                      )}
                    </strong>
                  </div>

                  <div className="flex justify-between py-1 text-red-600">
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

                  <div className="flex justify-between py-1">
                    <span>
                      Serviços após desconto
                    </span>

                    <strong>
                      {money(
                        previewBudget.finalValue
                      )}
                    </strong>
                  </div>

                  <div className="flex justify-between py-1">
                    <span>
                      Materiais
                    </span>

                    <strong>
                      {money(
                        previewBudget.materialsValue
                      )}
                    </strong>
                  </div>

                  <div className="mt-3 flex justify-between border-t pt-3 text-xl font-bold">
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
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 font-semibold"
                  >
                    <FileText
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
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 font-semibold text-white"
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
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white"
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
    </div>
  );
}
