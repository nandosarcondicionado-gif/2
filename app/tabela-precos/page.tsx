"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Save,
  RefreshCw,
  Percent,
  DollarSign,
  CheckCircle,
  Power,
} from "lucide-react";
import { createClient } from "../../lib/supabase/client";

type PriceRow = {
  id: string;
  servico: string;
  tipo_equipamento: string;
  btu: number | null;
  marca: string | null;
  valor_padrao: number;
  valor_minimo: number | null;
  valor_contrato: number | null;
  observacoes: string | null;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
};

type DiscountRow = {
  id: string;
  quantidade_minima: number;
  quantidade_maxima: number | null;
  desconto_percentual: number;
  ativo: boolean;
};

const emptyPrice: Omit<PriceRow, "id" | "created_at" | "updated_at"> = {
  servico: "Higienização",
  tipo_equipamento: "Split Hi-Wall",
  btu: 12000,
  marca: "",
  valor_padrao: 200,
  valor_minimo: 180,
  valor_contrato: 190,
  observacoes: "",
  ativo: true,
};

const emptyDiscount: Omit<DiscountRow, "id"> = {
  quantidade_minima: 1,
  quantidade_maxima: 1,
  desconto_percentual: 0,
  ativo: true,
};

const services = [
  "Higienização",
  "Manutenção Preventiva",
  "Instalação",
  "Desinstalação",
  "Avaliação / Diagnóstico",
  "Limpeza de Condensadora",
  "Correção Simples",
  "Metro Adicional de Tubulação",
  "Canaleta",
  "Dreno",
];

const equipmentTypes = [
  "Split Hi-Wall",
  "Split Inverter",
  "Piso Teto",
  "Cassete",
  "Janela",
  "Todos",
];

const btuOptions = [
  7000,
  9000,
  12000,
  18000,
  24000,
  30000,
  36000,
  48000,
  60000,
];

function formatMoney(value: number | null | undefined) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatBtu(value: number | null) {
  if (!value) return "—";

  return Number(value).toLocaleString("pt-BR") + " BTU";
}

export default function TabelaPrecosPage() {
  const supabase = createClient();

  const [prices, setPrices] = useState<PriceRow[]>([]);
  const [discounts, setDiscounts] = useState<DiscountRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState("Todos");
  const [typeFilter, setTypeFilter] = useState("Todos");

  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);

  const [editingPrice, setEditingPrice] = useState<PriceRow | null>(null);
  const [editingDiscount, setEditingDiscount] =
    useState<DiscountRow | null>(null);

  const [priceForm, setPriceForm] = useState({
    ...emptyPrice,
  });

  const [discountForm, setDiscountForm] = useState({
    ...emptyDiscount,
  });

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function loadData() {
    setLoading(true);
    setErrorMessage("");

    const [pricesResult, discountsResult] = await Promise.all([
      supabase
        .from("tabela_precos")
        .select("*")
        .order("servico", { ascending: true })
        .order("btu", { ascending: true }),

      supabase
        .from("tabela_descontos_quantidade")
        .select("*")
        .order("quantidade_minima", { ascending: true }),
    ]);

    if (pricesResult.error) {
      setErrorMessage(
        "Erro ao carregar tabela de preços: " + pricesResult.error.message
      );
    } else {
      setPrices(pricesResult.data || []);
    }

    if (discountsResult.error) {
      setErrorMessage(
        "Erro ao carregar descontos: " +
          discountsResult.error.message
      );
    } else {
      setDiscounts(discountsResult.data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function showMessage(text: string) {
    setMessage(text);

    setTimeout(() => {
      setMessage("");
    }, 3000);
  }

  function openNewPrice() {
    setEditingPrice(null);
    setPriceForm({
      ...emptyPrice,
    });
    setShowPriceModal(true);
  }

  function openEditPrice(price: PriceRow) {
    setEditingPrice(price);

    setPriceForm({
      servico: price.servico,
      tipo_equipamento: price.tipo_equipamento,
      btu: price.btu,
      marca: price.marca || "",
      valor_padrao: price.valor_padrao,
      valor_minimo: price.valor_minimo,
      valor_contrato: price.valor_contrato,
      observacoes: price.observacoes || "",
      ativo: price.ativo,
    });

    setShowPriceModal(true);
  }

  function closePriceModal() {
    if (saving) return;

    setShowPriceModal(false);
    setEditingPrice(null);
  }

  async function savePrice() {
    setSaving(true);
    setErrorMessage("");

    const payload = {
      servico: priceForm.servico,
      tipo_equipamento: priceForm.tipo_equipamento,
      btu:
        priceForm.btu === null || priceForm.btu === undefined
          ? null
          : Number(priceForm.btu),
      marca: priceForm.marca?.trim() || null,
      valor_padrao: Number(priceForm.valor_padrao || 0),
      valor_minimo:
        priceForm.valor_minimo === null ||
        priceForm.valor_minimo === undefined
          ? null
          : Number(priceForm.valor_minimo),
      valor_contrato:
        priceForm.valor_contrato === null ||
        priceForm.valor_contrato === undefined
          ? null
          : Number(priceForm.valor_contrato),
      observacoes: priceForm.observacoes?.trim() || null,
      ativo: priceForm.ativo,
    };

    let result;

    if (editingPrice) {
      result = await supabase
        .from("tabela_precos")
        .update(payload)
        .eq("id", editingPrice.id);
    } else {
      result = await supabase
        .from("tabela_precos")
        .insert(payload);
    }

    if (result.error) {
      setErrorMessage(
        "Erro ao salvar preço: " + result.error.message
      );
      setSaving(false);
      return;
    }

    setSaving(false);
    setShowPriceModal(false);
    setEditingPrice(null);

    showMessage(
      editingPrice
        ? "Preço atualizado com sucesso!"
        : "Preço cadastrado com sucesso!"
    );

    await loadData();
  }

  async function deletePrice(price: PriceRow) {
    const confirmed = window.confirm(
      `Deseja realmente excluir o preço de "${price.servico}" ${formatBtu(
        price.btu
      )}?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("tabela_precos")
      .delete()
      .eq("id", price.id);

    if (error) {
      setErrorMessage(
        "Erro ao excluir preço: " + error.message
      );
      return;
    }

    showMessage("Preço excluído com sucesso.");
    await loadData();
  }

  async function togglePrice(price: PriceRow) {
    const { error } = await supabase
      .from("tabela_precos")
      .update({
        ativo: !price.ativo,
      })
      .eq("id", price.id);

    if (error) {
      setErrorMessage(
        "Erro ao alterar status: " + error.message
      );
      return;
    }

    showMessage(
      price.ativo
        ? "Preço desativado."
        : "Preço ativado."
    );

    await loadData();
  }

  function openNewDiscount() {
    setEditingDiscount(null);
    setDiscountForm({
      ...emptyDiscount,
    });
    setShowDiscountModal(true);
  }

  function openEditDiscount(discount: DiscountRow) {
    setEditingDiscount(discount);

    setDiscountForm({
      quantidade_minima: discount.quantidade_minima,
      quantidade_maxima: discount.quantidade_maxima,
      desconto_percentual: discount.desconto_percentual,
      ativo: discount.ativo,
    });

    setShowDiscountModal(true);
  }

  function closeDiscountModal() {
    if (saving) return;

    setShowDiscountModal(false);
    setEditingDiscount(null);
  }

  async function saveDiscount() {
    setSaving(true);
    setErrorMessage("");

    const min = Number(discountForm.quantidade_minima || 1);

    const max =
      discountForm.quantidade_maxima === null ||
      discountForm.quantidade_maxima === undefined ||
      String(discountForm.quantidade_maxima) === ""
        ? null
        : Number(discountForm.quantidade_maxima);

    const payload = {
      quantidade_minima: min,
      quantidade_maxima: max,
      desconto_percentual: Number(
        discountForm.desconto_percentual || 0
      ),
      ativo: discountForm.ativo,
    };

    let result;

    if (editingDiscount) {
      result = await supabase
        .from("tabela_descontos_quantidade")
        .update(payload)
        .eq("id", editingDiscount.id);
    } else {
      result = await supabase
        .from("tabela_descontos_quantidade")
        .insert(payload);
    }

    if (result.error) {
      setErrorMessage(
        "Erro ao salvar desconto: " + result.error.message
      );
      setSaving(false);
      return;
    }

    setSaving(false);
    setShowDiscountModal(false);
    setEditingDiscount(null);

    showMessage(
      editingDiscount
        ? "Desconto atualizado com sucesso!"
        : "Desconto cadastrado com sucesso!"
    );

    await loadData();
  }

  async function deleteDiscount(discount: DiscountRow) {
    const confirmed = window.confirm(
      "Deseja realmente excluir esta faixa de desconto?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("tabela_descontos_quantidade")
      .delete()
      .eq("id", discount.id);

    if (error) {
      setErrorMessage(
        "Erro ao excluir desconto: " + error.message
      );
      return;
    }

    showMessage("Faixa de desconto excluída.");
    await loadData();
  }

  const filteredPrices = useMemo(() => {
    const term = search.trim().toLowerCase();

    return prices.filter((price) => {
      const matchesSearch =
        !term ||
        price.servico.toLowerCase().includes(term) ||
        price.tipo_equipamento.toLowerCase().includes(term) ||
        (price.marca || "").toLowerCase().includes(term) ||
        String(price.btu || "").includes(term);

      const matchesService =
        serviceFilter === "Todos" ||
        price.servico === serviceFilter;

      const matchesType =
        typeFilter === "Todos" ||
        price.tipo_equipamento === typeFilter;

      return (
        matchesSearch &&
        matchesService &&
        matchesType
      );
    });
  }, [prices, search, serviceFilter, typeFilter]);

  const activePrices = prices.filter((p) => p.ativo).length;

  const averagePrice = prices.length
    ? prices.reduce(
        (sum, item) => sum + Number(item.valor_padrao || 0),
        0
      ) / prices.length
    : 0;

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* CABEÇALHO */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Tabela de Preços
            </h1>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Gerencie os preços dos serviços da Nando&apos;s Ar-Condicionado.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={loadData}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RefreshCw size={17} />
              Atualizar
            </button>

            <button
              onClick={openNewPrice}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              <Plus size={18} />
              Novo preço
            </button>
          </div>
        </div>

        {/* MENSAGENS */}
        {message && (
          <div className="mb-5 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300">
            <CheckCircle size={18} />
            {message}
          </div>
        )}

        {errorMessage && (
          <div className="mb-5 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            <span>{errorMessage}</span>

            <button
              onClick={() => setErrorMessage("")}
              className="rounded p-1 hover:bg-red-100 dark:hover:bg-red-900"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* RESUMO */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-3 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                <DollarSign size={21} />
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Preços cadastrados
                </p>

                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {prices.length}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-3 text-green-600 dark:bg-green-950/50 dark:text-green-400">
                <CheckCircle size={21} />
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Preços ativos
                </p>

                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {activePrices}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-100 p-3 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
                <DollarSign size={21} />
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Média dos preços
                </p>

                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {formatMoney(averagePrice)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* FILTROS */}
        <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">

            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar serviço, BTU ou marca..."
                className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-blue-950"
              />
            </div>

            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value="Todos">Todos os serviços</option>

              {services.map((service) => (
                <option key={service} value={service}>
                  {service}
                </option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value="Todos">Todos os tipos</option>

              {equipmentTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

          </div>
        </div>

        {/* TABELA DE PREÇOS */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">
                Preços dos serviços
              </h2>

              <p className="text-xs text-slate-500">
                {filteredPrices.length} registro(s) encontrado(s)
              </p>
            </div>

            <button
              onClick={openNewPrice}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Plus size={17} />
              Adicionar
            </button>
          </div>

          {loading ? (
            <div className="flex min-h-[250px] items-center justify-center">
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <RefreshCw
                  size={20}
                  className="animate-spin"
                />
                Carregando tabela...
              </div>
            </div>
          ) : filteredPrices.length === 0 ? (
            <div className="flex min-h-[250px] flex-col items-center justify-center px-6 text-center">
              <DollarSign
                size={42}
                className="mb-3 text-slate-300"
              />

              <h3 className="font-semibold text-slate-700 dark:text-slate-200">
                Nenhum preço encontrado
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Tente alterar os filtros ou cadastre um novo preço.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-sm">
                <thead className="bg-slate-50 dark:bg-slate-950">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                      Serviço
                    </th>

                    <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                      Tipo
                    </th>

                    <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                      BTU
                    </th>

                    <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                      Marca
                    </th>

                    <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">
                      Preço padrão
                    </th>

                    <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">
                      Mínimo
                    </th>

                    <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">
                      Contrato
                    </th>

                    <th className="px-4 py-3 text-center font-semibold text-slate-600 dark:text-slate-300">
                      Status
                    </th>

                    <th className="px-4 py-3 text-center font-semibold text-slate-600 dark:text-slate-300">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredPrices.map((price) => (
                    <tr
                      key={price.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-950"
                    >
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                        {price.servico}
                      </td>

                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {price.tipo_equipamento}
                      </td>

                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {formatBtu(price.btu)}
                      </td>

                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {price.marca || "Todas"}
                      </td>

                      <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                        {formatMoney(price.valor_padrao)}
                      </td>

                      <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                        {price.valor_minimo !== null
                          ? formatMoney(price.valor_minimo)
                          : "—"}
                      </td>

                      <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400">
                        {price.valor_contrato !== null
                          ? formatMoney(price.valor_contrato)
                          : "—"}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => togglePrice(price)}
                          title={
                            price.ativo
                              ? "Desativar"
                              : "Ativar"
                          }
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            price.ativo
                              ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300"
                              : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          <Power size={13} />

                          {price.ativo
                            ? "Ativo"
                            : "Inativo"}
                        </button>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => openEditPrice(price)}
                            title="Editar"
                            className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950"
                          >
                            <Pencil size={17} />
                          </button>

                          <button
                            onClick={() => deletePrice(price)}
                            title="Excluir"
                            className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* DESCONTOS */}
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-orange-100 p-2.5 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400">
                <Percent size={20} />
              </div>

              <div>
                <h2 className="font-semibold text-slate-900 dark:text-white">
                  Descontos por quantidade
                </h2>

                <p className="text-xs text-slate-500">
                  O desconto será aplicado sobre o subtotal dos equipamentos.
                </p>
              </div>
            </div>

            <button
              onClick={openNewDiscount}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-700"
            >
              <Plus size={17} />
              Nova faixa
            </button>
          </div>

          {discounts.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Nenhuma faixa cadastrada.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-sm">
                <thead className="bg-slate-50 dark:bg-slate-950">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                      Quantidade mínima
                    </th>

                    <th className="px-5 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                      Quantidade máxima
                    </th>

                    <th className="px-5 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                      Desconto
                    </th>

                    <th className="px-5 py-3 text-center font-semibold text-slate-600 dark:text-slate-300">
                      Status
                    </th>

                    <th className="px-5 py-3 text-center font-semibold text-slate-600 dark:text-slate-300">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {discounts.map((discount) => (
                    <tr
                      key={discount.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-950"
                    >
                      <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">
                        {discount.quantidade_minima}
                      </td>

                      <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                        {discount.quantidade_maxima === null
                          ? "30 ou mais"
                          : discount.quantidade_maxima}
                      </td>

                      <td className="px-5 py-3">
                        <span className="rounded-full bg-orange-100 px-3 py-1 font-semibold text-orange-700 dark:bg-orange-950/50 dark:text-orange-300">
                          {Number(
                            discount.desconto_percentual
                          ).toLocaleString("pt-BR")}%
                        </span>
                      </td>

                      <td className="px-5 py-3 text-center">
                        {discount.ativo ? (
                          <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700 dark:bg-green-950/50 dark:text-green-300">
                            Ativo
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            Inativo
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3">
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() =>
                              openEditDiscount(discount)
                            }
                            title="Editar"
                            className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950"
                          >
                            <Pencil size={17} />
                          </button>

                          <button
                            onClick={() =>
                              deleteDiscount(discount)
                            }
                            title="Excluir"
                            className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ===================================================== */}
      {/* MODAL - PREÇO */}
      {/* ===================================================== */}

      {showPriceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-900">

            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editingPrice
                    ? "Editar preço"
                    : "Novo preço"}
                </h2>

                <p className="text-xs text-slate-500">
                  Cadastre o valor que será usado pelo ClimaPro.
                </p>
              </div>

              <button
                onClick={closePriceModal}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Serviço
                </label>

                <select
                  value={priceForm.servico}
                  onChange={(e) =>
                    setPriceForm({
                      ...priceForm,
                      servico: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  {services.map((service) => (
                    <option
                      key={service}
                      value={service}
                    >
                      {service}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Tipo de equipamento
                </label>

                <select
                  value={priceForm.tipo_equipamento}
                  onChange={(e) =>
                    setPriceForm({
                      ...priceForm,
                      tipo_equipamento: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  {equipmentTypes.map((type) => (
                    <option
                      key={type}
                      value={type}
                    >
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  BTU
                </label>

                <select
                  value={
                    priceForm.btu === null
                      ? ""
                      : String(priceForm.btu)
                  }
                  onChange={(e) =>
                    setPriceForm({
                      ...priceForm,
                      btu:
                        e.target.value === ""
                          ? null
                          : Number(e.target.value),
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option value="">
                    Não se aplica
                  </option>

                  {btuOptions.map((btu) => (
                    <option
                      key={btu}
                      value={btu}
                    >
                      {btu.toLocaleString("pt-BR")} BTU
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Marca
                </label>

                <input
                  value={priceForm.marca || ""}
                  onChange={(e) =>
                    setPriceForm({
                      ...priceForm,
                      marca: e.target.value,
                    })
                  }
                  placeholder="Deixe vazio para todas"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Preço padrão
                </label>

                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={priceForm.valor_padrao}
                  onChange={(e) =>
                    setPriceForm({
                      ...priceForm,
                      valor_padrao:
                        Number(e.target.value) || 0,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Preço mínimo
                </label>

                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={
                    priceForm.valor_minimo ?? ""
                  }
                  onChange={(e) =>
                    setPriceForm({
                      ...priceForm,
                      valor_minimo:
                        e.target.value === ""
                          ? null
                          : Number(e.target.value),
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />

                <p className="mt-1 text-xs text-slate-500">
                  Serve como referência para não vender abaixo do limite.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Preço contrato / volume
                </label>

                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={
                    priceForm.valor_contrato ?? ""
                  }
                  onChange={(e) =>
                    setPriceForm({
                      ...priceForm,
                      valor_contrato:
                        e.target.value === ""
                          ? null
                          : Number(e.target.value),
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />

                <p className="mt-1 text-xs text-slate-500">
                  Valor especial para contratos ou serviços em volume.
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Observações
                </label>

                <textarea
                  value={priceForm.observacoes || ""}
                  onChange={(e) =>
                    setPriceForm({
                      ...priceForm,
                      observacoes: e.target.value,
                    })
                  }
                  rows={3}
                  placeholder="Ex.: materiais à parte, condições especiais..."
                  className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                  <input
                    type="checkbox"
                    checked={priceForm.ativo}
                    onChange={(e) =>
                      setPriceForm({
                        ...priceForm,
                        ativo: e.target.checked,
                      })
                    }
                    className="h-4 w-4"
                  />

                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-white">
                      Preço ativo
                    </p>

                    <p className="text-xs text-slate-500">
                      Preços inativos não deverão ser usados futuramente nos cálculos.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
              <button
                onClick={closePriceModal}
                disabled={saving}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>

              <button
                onClick={savePrice}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                <Save size={17} />

                {saving
                  ? "Salvando..."
                  : "Salvar preço"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================== */}
      {/* MODAL - DESCONTO */}
      {/* ===================================================== */}

      {showDiscountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-slate-900">

            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editingDiscount
                    ? "Editar desconto"
                    : "Nova faixa de desconto"}
                </h2>

                <p className="text-xs text-slate-500">
                  Configure o desconto aplicado conforme a quantidade.
                </p>
              </div>

              <button
                onClick={closeDiscountModal}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Mínimo
                </label>

                <input
                  type="number"
                  min="1"
                  value={
                    discountForm.quantidade_minima
                  }
                  onChange={(e) =>
                    setDiscountForm({
                      ...discountForm,
                      quantidade_minima:
                        Number(e.target.value) || 1,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Máximo
                </label>

                <input
                  type="number"
                  min="1"
                  value={
                    discountForm.quantidade_maxima ?? ""
                  }
                  onChange={(e) =>
                    setDiscountForm({
                      ...discountForm,
                      quantidade_maxima:
                        e.target.value === ""
                          ? null
                          : Number(e.target.value),
                    })
                  }
                  placeholder="Sem limite"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Desconto %
                </label>

                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={
                    discountForm.desconto_percentual
                  }
                  onChange={(e) =>
                    setDiscountForm({
                      ...discountForm,
                      desconto_percentual:
                        Number(e.target.value) || 0,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                  <input
                    type="checkbox"
                    checked={discountForm.ativo}
                    onChange={(e) =>
                      setDiscountForm({
                        ...discountForm,
                        ativo: e.target.checked,
                      })
                    }
                    className="h-4 w-4"
                  />

                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-white">
                      Faixa ativa
                    </p>

                    <p className="text-xs text-slate-500">
                      Somente faixas ativas serão consideradas nos cálculos.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
              <button
                onClick={closeDiscountModal}
                disabled={saving}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>

              <button
                onClick={saveDiscount}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
              >
                <Save size={17} />

                {saving
                  ? "Salvando..."
                  : "Salvar desconto"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
