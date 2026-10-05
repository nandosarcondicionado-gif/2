"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  ArrowUpCircle,
  ArrowDownCircle,
  DollarSign,
  Clock,
  CheckCircle,
  FileText,
} from "lucide-react";
import { createClient } from "../../lib/supabase/client";

type TransactionType = "Entrada" | "Saída";
type TransactionStatus = "Pago" | "Pendente";
type TransactionOrigin = "Manual" | "OS";

type Transaction = {
  id: string;
  descricao: string;
  cliente: string | null;
  categoria: string;
  tipo: TransactionType;
  valor: number;
  data: string;
  status: TransactionStatus;
  observacoes: string | null;
  origem: TransactionOrigin;
  origemId?: string;
  numeroOS?: string;
  created_at?: string;
  updated_at?: string;
};

type OrdemServicoFinanceiro = {
  id: string;
  numero: string | null;
  cliente_nome: string | null;
  tipo_servico: string | null;
  data: string | null;
  valor: number | null;
  valor_servicos: number | null;
  valor_materiais: number | null;
  materiais_descricao: string | null;
  materiais_pago: boolean | null;
  materiais_pago_em: string | null;
  materiais_forma_pagamento: string | null;
  forma_pagamento: string | null;
  data_pagamento: string | null;
  status: string | null;
  financeiro_movimentacao_id: string | null;
};

const categories = [
  "Instalação",
  "Manutenção",
  "Higienização",
  "Venda de peças",
  "Materiais",
  "Combustível",
  "Ferramentas",
  "Aluguel",
  "Energia",
  "Telefone",
  "Impostos",
  "Outros",
];

const emptyForm = {
  descricao: "",
  cliente: "",
  categoria: "Instalação",
  tipo: "Entrada" as TransactionType,
  valor: "",
  data: new Date().toISOString().slice(0, 10),
  status: "Pago" as TransactionStatus,
  observacoes: "",
};

export default function FinanceiroClient() {
  const supabase = createClient();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("Todos");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [originFilter, setOriginFilter] = useState("Todos");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  function normalizeNumber(value: unknown) {
    const number = Number(value || 0);

    if (Number.isNaN(number)) {
      return 0;
    }

    return number;
  }

  function getServiceValue(os: OrdemServicoFinanceiro) {
    const valorServicos = normalizeNumber(os.valor_servicos);

    if (valorServicos > 0) {
      return valorServicos;
    }

    return normalizeNumber(os.valor);
  }

  function isServicePaid(os: OrdemServicoFinanceiro) {
    return Boolean(
      os.forma_pagamento ||
        os.data_pagamento ||
        os.financeiro_movimentacao_id
    );
  }

  function buildOSTransactions(
    ordens: OrdemServicoFinanceiro[]
  ): Transaction[] {
    const result: Transaction[] = [];

    for (const os of ordens) {
      const numeroOS = os.numero || os.id.slice(0, 8);
      const cliente = os.cliente_nome || null;

      /*
       * SERVIÇO
       *
       * O serviço entra no Financeiro quando a OS possui
       * registro de pagamento.
       */
      const valorServico = getServiceValue(os);

      if (valorServico > 0 && isServicePaid(os)) {
        result.push({
          id: `os-servico-${os.id}`,
          descricao: `OS ${numeroOS} — Serviço`,
          cliente,
          categoria:
            os.tipo_servico?.trim() || "Manutenção",
          tipo: "Entrada",
          valor: valorServico,
          data:
            os.data_pagamento ||
            os.data ||
            new Date().toISOString().slice(0, 10),
          status: "Pago",
          observacoes:
            os.forma_pagamento
              ? `Pagamento do serviço da ${numeroOS}. Forma de pagamento: ${os.forma_pagamento}.`
              : `Pagamento do serviço da ${numeroOS}.`,
          origem: "OS",
          origemId: os.id,
          numeroOS,
        });
      }

      /*
       * MATERIAIS
       *
       * Os materiais possuem pagamento separado do serviço.
       */
      const valorMateriais = normalizeNumber(
        os.valor_materiais
      );

      if (valorMateriais > 0 && os.materiais_pago) {
        result.push({
          id: `os-materiais-${os.id}`,
          descricao: `OS ${numeroOS} — Materiais`,
          cliente,
          categoria: "Materiais",
          tipo: "Entrada",
          valor: valorMateriais,
          data:
            os.materiais_pago_em ||
            os.data ||
            new Date().toISOString().slice(0, 10),
          status: "Pago",
          observacoes:
            os.materiais_descricao
              ? `Materiais: ${os.materiais_descricao}${
                  os.materiais_forma_pagamento
                    ? ` Forma de pagamento: ${os.materiais_forma_pagamento}.`
                    : ""
                }`
              : `Materiais da ${numeroOS}${
                  os.materiais_forma_pagamento
                    ? `. Forma de pagamento: ${os.materiais_forma_pagamento}.`
                    : "."
                }`,
          origem: "OS",
          origemId: os.id,
          numeroOS,
        });
      }
    }

    return result;
  }

  async function loadTransactions() {
    setLoading(true);

    try {
      const [
        lancamentosResult,
        ordensResult,
      ] = await Promise.all([
        supabase
          .from("lancamentos_financeiros")
          .select("*")
          .order("data", { ascending: false })
          .order("created_at", { ascending: false }),

        supabase
          .from("ordens_servico")
          .select(
            `
              id,
              numero,
              cliente_nome,
              tipo_servico,
              data,
              valor,
              valor_servicos,
              valor_materiais,
              materiais_descricao,
              materiais_pago,
              materiais_pago_em,
              materiais_forma_pagamento,
              forma_pagamento,
              data_pagamento,
              status,
              financeiro_movimentacao_id
            `
          )
          .order("data", { ascending: false }),
      ]);

      if (lancamentosResult.error) {
        console.error(
          "Erro ao carregar lançamentos:",
          lancamentosResult.error
        );

        alert(
          `Erro ao carregar financeiro: ${lancamentosResult.error.message}`
        );

        setTransactions([]);
        return;
      }

      if (ordensResult.error) {
        console.error(
          "Erro ao carregar ordens para o financeiro:",
          ordensResult.error
        );

        /*
         * Mesmo se a consulta das OS falhar, mantemos o
         * Financeiro manual funcionando.
         */
        const manualTransactions: Transaction[] =
          (lancamentosResult.data || []).map(
            (item: any) => ({
              ...item,
              origem: "Manual",
            })
          );

        setTransactions(manualTransactions);
        return;
      }

      const manualTransactions: Transaction[] =
        (lancamentosResult.data || []).map(
          (item: any) => ({
            ...item,
            origem: "Manual",
          })
        );

      const osTransactions = buildOSTransactions(
        (ordensResult.data ||
          []) as OrdemServicoFinanceiro[]
      );

      /*
       * Mantém os lançamentos manuais e adiciona os
       * pagamentos originados das OS.
       */
      setTransactions([
        ...osTransactions,
        ...manualTransactions,
      ]);
    } catch (error) {
      console.error(
        "Erro inesperado ao carregar financeiro:",
        error
      );

      alert(
        "Ocorreu um erro inesperado ao carregar o financeiro."
      );

      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTransactions();
  }, []);

  function openNew() {
    setEditingId(null);
    setForm({
      ...emptyForm,
      data: new Date().toISOString().slice(0, 10),
    });
    setModalOpen(true);
  }

  function openEdit(transaction: Transaction) {
    if (transaction.origem === "OS") {
      alert(
        "Este lançamento veio de uma Ordem de Serviço. Para alterar o pagamento, altere a própria OS."
      );
      return;
    }

    setEditingId(transaction.id);

    setForm({
      descricao: transaction.descricao || "",
      cliente: transaction.cliente || "",
      categoria: transaction.categoria || "Outros",
      tipo: transaction.tipo,
      valor: String(transaction.valor || ""),
      data: transaction.data || "",
      status: transaction.status,
      observacoes: transaction.observacoes || "",
    });

    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    setEditingId(null);

    setForm({
      ...emptyForm,
      data: new Date().toISOString().slice(0, 10),
    });
  }

  async function saveTransaction(
    event: React.FormEvent
  ) {
    event.preventDefault();

    if (!form.descricao.trim()) {
      alert("Informe a descrição.");
      return;
    }

    if (!form.valor || Number(form.valor) <= 0) {
      alert("Informe um valor válido.");
      return;
    }

    if (!form.data) {
      alert("Informe a data.");
      return;
    }

    setSaving(true);

    const dataToSave = {
      descricao: form.descricao.trim(),
      cliente: form.cliente.trim() || null,
      categoria: form.categoria,
      tipo: form.tipo,
      valor: Number(form.valor),
      data: form.data,
      status: form.status,
      observacoes:
        form.observacoes.trim() || null,
    };

    try {
      if (editingId) {
        const { error } = await supabase
          .from("lancamentos_financeiros")
          .update(dataToSave)
          .eq("id", editingId);

        if (error) {
          console.error(error);

          alert(
            `Erro ao atualizar lançamento: ${error.message}`
          );

          return;
        }

        alert(
          "Lançamento atualizado com sucesso."
        );
      } else {
        const { error } = await supabase
          .from("lancamentos_financeiros")
          .insert(dataToSave);

        if (error) {
          console.error(error);

          alert(
            `Erro ao criar lançamento: ${error.message}`
          );

          return;
        }

        alert(
          "Lançamento criado com sucesso."
        );
      }

      closeModal();
      await loadTransactions();
    } finally {
      setSaving(false);
    }
  }

  async function deleteTransaction(
    transaction: Transaction
  ) {
    if (transaction.origem === "OS") {
      alert(
        "Este lançamento é vinculado à Ordem de Serviço e não pode ser excluído por aqui. Altere o pagamento na própria OS."
      );
      return;
    }

    const confirmed = window.confirm(
      "Tem certeza que deseja excluir este lançamento?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("lancamentos_financeiros")
      .delete()
      .eq("id", transaction.id);

    if (error) {
      console.error(error);

      alert(
        `Erro ao excluir lançamento: ${error.message}`
      );

      return;
    }

    setTransactions((previous) =>
      previous.filter(
        (item) => item.id !== transaction.id
      )
    );

    alert("Lançamento excluído.");
  }

  async function changeStatus(
    transaction: Transaction,
    status: TransactionStatus
  ) {
    if (transaction.origem === "OS") {
      alert(
        "Este lançamento veio de uma Ordem de Serviço. Para alterar o status do pagamento, altere o pagamento na própria OS."
      );
      return;
    }

    const { error } = await supabase
      .from("lancamentos_financeiros")
      .update({ status })
      .eq("id", transaction.id);

    if (error) {
      console.error(error);

      alert(
        `Erro ao alterar status: ${error.message}`
      );

      return;
    }

    setTransactions((previous) =>
      previous.map((item) =>
        item.id === transaction.id
          ? { ...item, status }
          : item
      )
    );
  }

  const filteredTransactions = useMemo(() => {
    const term = search.trim().toLowerCase();

    return transactions.filter((transaction) => {
      const matchesSearch =
        !term ||
        transaction.descricao
          .toLowerCase()
          .includes(term) ||
        (transaction.cliente || "")
          .toLowerCase()
          .includes(term) ||
        transaction.categoria
          .toLowerCase()
          .includes(term) ||
        (transaction.numeroOS || "")
          .toLowerCase()
          .includes(term);

      const matchesType =
        typeFilter === "Todos" ||
        transaction.tipo === typeFilter;

      const matchesStatus =
        statusFilter === "Todos" ||
        transaction.status === statusFilter;

      const matchesOrigin =
        originFilter === "Todos" ||
        transaction.origem === originFilter;

      return (
        matchesSearch &&
        matchesType &&
        matchesStatus &&
        matchesOrigin
      );
    });
  }, [
    transactions,
    search,
    typeFilter,
    statusFilter,
    originFilter,
  ]);

  const totalEntradas = transactions
    .filter((item) => item.tipo === "Entrada")
    .reduce(
      (total, item) =>
        total + Number(item.valor || 0),
      0
    );

  const totalSaidas = transactions
    .filter((item) => item.tipo === "Saída")
    .reduce(
      (total, item) =>
        total + Number(item.valor || 0),
      0
    );

  const saldo = totalEntradas - totalSaidas;

  const totalPendente = transactions
    .filter((item) => item.status === "Pendente")
    .reduce(
      (total, item) =>
        total +
        (item.tipo === "Entrada"
          ? Number(item.valor || 0)
          : -Number(item.valor || 0)),
      0
    );

  const totalOS = transactions
    .filter((item) => item.origem === "OS")
    .reduce(
      (total, item) =>
        total + Number(item.valor || 0),
      0
    );

  const totalManual = transactions
    .filter((item) => item.origem === "Manual")
    .reduce(
      (total, item) =>
        total + Number(item.valor || 0),
      0
    );

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  }

  function formatDate(value: string) {
    if (!value) return "-";

    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString("pt-BR");
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Financeiro
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Controle as entradas, saídas e os pagamentos das Ordens de Serviço.
            </p>
          </div>

          <button
            onClick={openNew}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"
          >
            <Plus size={19} />
            Novo lançamento
          </button>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  Total de entradas
                </p>

                <p className="mt-1 text-2xl font-bold text-green-600">
                  {formatCurrency(totalEntradas)}
                </p>
              </div>

              <div className="rounded-lg bg-green-100 p-3 text-green-600">
                <ArrowUpCircle size={22} />
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  Total de saídas
                </p>

                <p className="mt-1 text-2xl font-bold text-red-600">
                  {formatCurrency(totalSaidas)}
                </p>
              </div>

              <div className="rounded-lg bg-red-100 p-3 text-red-600">
                <ArrowDownCircle size={22} />
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  Saldo
                </p>

                <p
                  className={`mt-1 text-2xl font-bold ${
                    saldo >= 0
                      ? "text-blue-600"
                      : "text-red-600"
                  }`}
                >
                  {formatCurrency(saldo)}
                </p>
              </div>

              <div className="rounded-lg bg-blue-100 p-3 text-blue-600">
                <DollarSign size={22} />
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  Pendente
                </p>

                <p className="mt-1 text-2xl font-bold text-yellow-600">
                  {formatCurrency(totalPendente)}
                </p>
              </div>

              <div className="rounded-lg bg-yellow-100 p-3 text-yellow-600">
                <Clock size={22} />
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-white p-2 text-blue-600 shadow-sm">
                <FileText size={20} />
              </div>

              <div>
                <p className="text-sm text-blue-700">
                  Recebimentos das OS
                </p>

                <p className="text-xl font-bold text-blue-900">
                  {formatCurrency(totalOS)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-gray-100 p-2 text-gray-600">
                <DollarSign size={20} />
              </div>

              <div>
                <p className="text-sm text-gray-600">
                  Lançamentos manuais
                </p>

                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(totalManual)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-5 rounded-xl bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row">
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
                placeholder="Buscar lançamento, cliente, categoria ou OS..."
                className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 outline-none focus:border-blue-500"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(event.target.value)
              }
              className="rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
            >
              <option value="Todos">
                Todos os tipos
              </option>

              <option value="Entrada">
                Entradas
              </option>

              <option value="Saída">
                Saídas
              </option>
            </select>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              className="rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
            >
              <option value="Todos">
                Todos os status
              </option>

              <option value="Pago">
                Pagos
              </option>

              <option value="Pendente">
                Pendentes
              </option>
            </select>

            <select
              value={originFilter}
              onChange={(event) =>
                setOriginFilter(event.target.value)
              }
              className="rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
            >
              <option value="Todos">
                Todas as origens
              </option>

              <option value="OS">
                Ordens de Serviço
              </option>

              <option value="Manual">
                Manuais
              </option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          {loading ? (
            <div className="p-10 text-center text-gray-500">
              Carregando financeiro...
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-10 text-center">
              <DollarSign
                size={45}
                className="mx-auto mb-3 text-gray-300"
              />

              <p className="font-semibold text-gray-700">
                Nenhum lançamento encontrado
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Cadastre um lançamento ou registre um pagamento em uma OS.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px]">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-gray-600">
                      Data
                    </th>

                    <th className="px-4 py-4 text-left text-sm font-semibold text-gray-600">
                      Descrição
                    </th>

                    <th className="px-4 py-4 text-left text-sm font-semibold text-gray-600">
                      Cliente
                    </th>

                    <th className="px-4 py-4 text-left text-sm font-semibold text-gray-600">
                      Categoria
                    </th>

                    <th className="px-4 py-4 text-left text-sm font-semibold text-gray-600">
                      Origem
                    </th>

                    <th className="px-4 py-4 text-left text-sm font-semibold text-gray-600">
                      Tipo
                    </th>

                    <th className="px-4 py-4 text-left text-sm font-semibold text-gray-600">
                      Valor
                    </th>

                    <th className="px-4 py-4 text-left text-sm font-semibold text-gray-600">
                      Status
                    </th>

                    <th className="px-4 py-4 text-right text-sm font-semibold text-gray-600">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {filteredTransactions.map(
                    (transaction) => (
                      <tr
                        key={transaction.id}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-4 py-4 text-gray-700">
                          {formatDate(transaction.data)}
                        </td>

                        <td className="px-4 py-4">
                          <p className="font-semibold text-gray-900">
                            {transaction.descricao}
                          </p>

                          {transaction.observacoes && (
                            <p className="mt-1 max-w-xs truncate text-xs text-gray-500">
                              {transaction.observacoes}
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-4 text-gray-700">
                          {transaction.cliente || "-"}
                        </td>

                        <td className="px-4 py-4">
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                            {transaction.categoria}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          {transaction.origem === "OS" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                              <FileText size={14} />
                              {transaction.numeroOS || "OS"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                              Manual
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          {transaction.tipo ===
                          "Entrada" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                              <ArrowUpCircle size={14} />
                              Entrada
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                              <ArrowDownCircle size={14} />
                              Saída
                            </span>
                          )}
                        </td>

                        <td
                          className={`px-4 py-4 font-bold ${
                            transaction.tipo ===
                            "Entrada"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {transaction.tipo ===
                          "Entrada"
                            ? "+"
                            : "-"}

                          {formatCurrency(
                            Number(
                              transaction.valor || 0
                            )
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <button
                            onClick={() =>
                              changeStatus(
                                transaction,
                                transaction.status ===
                                  "Pago"
                                  ? "Pendente"
                                  : "Pago"
                              )
                            }
                            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                              transaction.status ===
                              "Pago"
                                ? "bg-green-100 text-green-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {transaction.status ===
                            "Pago" ? (
                              <CheckCircle size={14} />
                            ) : (
                              <Clock size={14} />
                            )}

                            {transaction.status}
                          </button>
                        </td>

                        <td className="px-4 py-4">
                          {transaction.origem ===
                          "Manual" ? (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() =>
                                  openEdit(
                                    transaction
                                  )
                                }
                                title="Editar"
                                className="rounded-lg border border-blue-200 p-2 text-blue-600 hover:bg-blue-50"
                              >
                                <Edit size={17} />
                              </button>

                              <button
                                onClick={() =>
                                  deleteTransaction(
                                    transaction
                                  )
                                }
                                title="Excluir"
                                className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                              >
                                <Trash2 size={17} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">
                              Alterar na OS
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editingId
                    ? "Editar lançamento"
                    : "Novo lançamento"}
                </h2>

                <p className="text-sm text-gray-500">
                  Registre uma entrada ou saída manual.
                </p>
              </div>

              <button
                onClick={closeModal}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                <X size={21} />
              </button>
            </div>

            <form
              onSubmit={saveTransaction}
              className="space-y-5 p-5"
            >
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Descrição
                </label>

                <input
                  required
                  value={form.descricao}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      descricao: event.target.value,
                    })
                  }
                  placeholder="Ex.: Instalação de ar-condicionado"
                  className="w-full rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Cliente
                </label>

                <input
                  value={form.cliente}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      cliente: event.target.value,
                    })
                  }
                  placeholder="Nome do cliente (opcional)"
                  className="w-full rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">
                    Tipo
                  </label>

                  <select
                    value={form.tipo}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        tipo:
                          event.target.value as TransactionType,
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-blue-500"
                  >
                    <option value="Entrada">
                      Entrada
                    </option>

                    <option value="Saída">
                      Saída
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">
                    Categoria
                  </label>

                  <select
                    value={form.categoria}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        categoria: event.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-blue-500"
                  >
                    {categories.map((category) => (
                      <option
                        key={category}
                        value={category}
                      >
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">
                    Valor
                  </label>

                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.valor}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        valor: event.target.value,
                      })
                    }
                    placeholder="0,00"
                    className="w-full rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">
                    Data
                  </label>

                  <input
                    required
                    type="date"
                    value={form.data}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        data: event.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">
                    Status
                  </label>

                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        status:
                          event.target.value as TransactionStatus,
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-blue-500"
                  >
                    <option value="Pago">
                      Pago
                    </option>

                    <option value="Pendente">
                      Pendente
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Observações
                </label>

                <textarea
                  rows={4}
                  value={form.observacoes}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      observacoes: event.target.value,
                    })
                  }
                  placeholder="Observações..."
                  className="w-full resize-none rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-gray-300 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Salvando..."
                    : editingId
                    ? "Salvar alterações"
                    : "Criar lançamento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
