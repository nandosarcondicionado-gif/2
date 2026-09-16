"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  Calculator,
  CheckCircle2,
  Edit,
  Plus,
  Search,
  Trash2,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Funcionario = {
  id: string;
  nome: string;
  cargo?: string;
  salario?: number;
  forma_pagamento?: string;
  chave_pix?: string;
};

type Movimento = {
  id: string;
  tipo: string;
  descricao: string;
  valor: number;
  data_movimento: string;
  forma_pagamento: string;
  categoria: string;
  funcionario_id: string | null;
  funcionario_nome: string;
  motivo: string;
  observacoes: string;
  criado_por: string;
  referencia: string;
  salario_base: number;
  adicionais: number;
  descontos: number;
  adiantamento: number;
  created_at: string;
};

const TIPOS = [
  "Entrada",
  "Despesa",
  "Sangria",
  "Pagamento funcionário",
  "Pró-labore",
];

function dinheiro(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function numero(valor: string) {
  const n = Number(valor.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

export default function CaixaPage() {
  const supabase = createClient();

  const [movimentos, setMovimentos] = useState<Movimento[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [busca, setBusca] = useState("");
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Movimento | null>(null);

  const [tipo, setTipo] = useState("Entrada");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [dataMovimento, setDataMovimento] = useState(hoje());
  const [formaPagamento, setFormaPagamento] = useState("");
  const [categoria, setCategoria] = useState("");
  const [funcionarioId, setFuncionarioId] = useState("");
  const [motivo, setMotivo] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const [referencia, setReferencia] = useState("");
  const [salarioBase, setSalarioBase] = useState("");
  const [adicionais, setAdicionais] = useState("");
  const [descontos, setDescontos] = useState("");
  const [adiantamento, setAdiantamento] = useState("");

  async function carregar() {
    setLoading(true);

    const [movResult, funcResult] = await Promise.all([
      supabase
        .from("caixa_movimentacoes")
        .select("*")
        .order("data_movimento", { ascending: false })
        .order("created_at", { ascending: false }),

      supabase
        .from("funcionarios")
        .select("*")
        .eq("status", "Ativo")
        .order("nome"),
    ]);

    if (!movResult.error) {
      setMovimentos((movResult.data || []) as Movimento[]);
    }

    if (!funcResult.error) {
      setFuncionarios((funcResult.data || []) as Funcionario[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  function limparFormulario() {
    setTipo("Entrada");
    setDescricao("");
    setValor("");
    setDataMovimento(hoje());
    setFormaPagamento("");
    setCategoria("");
    setFuncionarioId("");
    setMotivo("");
    setObservacoes("");
    setReferencia("");
    setSalarioBase("");
    setAdicionais("");
    setDescontos("");
    setAdiantamento("");
    setEditando(null);
  }

  function abrirNovo(tipoInicial = "Entrada") {
    limparFormulario();
    setTipo(tipoInicial);

    if (tipoInicial === "Pagamento funcionário") {
      setReferencia(new Date().toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      }));
    }

    setModal(true);
  }

  function abrirEditar(item: Movimento) {
    setEditando(item);

    setTipo(item.tipo);
    setDescricao(item.descricao || "");
    setValor(String(item.valor ?? ""));
    setDataMovimento(item.data_movimento || hoje());
    setFormaPagamento(item.forma_pagamento || "");
    setCategoria(item.categoria || "");
    setFuncionarioId(item.funcionario_id || "");
    setMotivo(item.motivo || "");
    setObservacoes(item.observacoes || "");

    setReferencia(item.referencia || "");
    setSalarioBase(String(item.salario_base ?? ""));
    setAdicionais(String(item.adicionais ?? ""));
    setDescontos(String(item.descontos ?? ""));
    setAdiantamento(String(item.adiantamento ?? ""));

    setModal(true);
  }

  const funcionarioSelecionado = useMemo(
    () => funcionarios.find((f) => f.id === funcionarioId),
    [funcionarios, funcionarioId]
  );

  const valorCalculadoFuncionario =
    numero(salarioBase) +
    numero(adicionais) -
    numero(descontos) -
    numero(adiantamento);

  useEffect(() => {
    if (
      tipo === "Pagamento funcionário" &&
      funcionarioSelecionado &&
      !editando
    ) {
      setSalarioBase(String(funcionarioSelecionado.salario || 0));

      if (!formaPagamento && funcionarioSelecionado.forma_pagamento) {
        setFormaPagamento(funcionarioSelecionado.forma_pagamento);
      }
    }
  }, [funcionarioSelecionado, tipo, editando]);

  useEffect(() => {
    if (tipo === "Pagamento funcionário" && !editando) {
      setValor(String(valorCalculadoFuncionario || ""));
    }
  }, [
    salarioBase,
    adicionais,
    descontos,
    adiantamento,
    tipo,
    editando,
  ]);

  async function salvar() {
    if (salvando) return;

    const valorNumerico =
      tipo === "Pagamento funcionário"
        ? valorCalculadoFuncionario
        : numero(valor);

    if (valorNumerico <= 0) {
      alert("Informe um valor maior que zero.");
      return;
    }

    if (tipo === "Pagamento funcionário" && !funcionarioId) {
      alert("Selecione o funcionário.");
      return;
    }

    setSalvando(true);

    const funcionarioNome = funcionarioSelecionado?.nome || "";

    const dados = {
      tipo,
      descricao:
        descricao ||
        (tipo === "Pagamento funcionário"
          ? `Pagamento de funcionário - ${funcionarioNome}`
          : tipo),
      valor: valorNumerico,
      data_movimento: dataMovimento,
      forma_pagamento: formaPagamento,
      categoria,
      funcionario_id: funcionarioId || null,
      funcionario_nome: funcionarioNome,
      motivo,
      observacoes,

      referencia,
      salario_base:
        tipo === "Pagamento funcionário" ? numero(salarioBase) : 0,
      adicionais:
        tipo === "Pagamento funcionário" ? numero(adicionais) : 0,
      descontos:
        tipo === "Pagamento funcionário" ? numero(descontos) : 0,
      adiantamento:
        tipo === "Pagamento funcionário" ? numero(adiantamento) : 0,
    };

    try {
      /*
       * EDIÇÃO
       */
      if (editando) {
        const { error } = await supabase
          .from("caixa_movimentacoes")
          .update(dados)
          .eq("id", editando.id);

        if (error) throw error;

        /*
         * Se era pagamento de funcionário, sincroniza o histórico.
         */
        if (
          editando.tipo === "Pagamento funcionário" &&
          editando.funcionario_id
        ) {
          const { data: pagamentoExistente } = await supabase
            .from("pagamentos_funcionarios")
            .select("id")
            .eq("funcionario_id", editando.funcionario_id)
            .eq("valor_pago", editando.valor)
            .eq("data_pagamento", editando.data_movimento)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (pagamentoExistente) {
            await supabase
              .from("pagamentos_funcionarios")
              .update({
                funcionario_id: funcionarioId,
                funcionario_nome: funcionarioNome,
                referencia,
                salario_base: numero(salarioBase),
                adicionais: numero(adicionais),
                descontos: numero(descontos),
                adiantamento: numero(adiantamento),
                valor_pago: valorNumerico,
                data_pagamento: dataMovimento,
                forma_pagamento: formaPagamento,
                status: "Pago",
                observacoes,
              })
              .eq("id", pagamentoExistente.id);
          }
        }

        /*
         * Se transformou outro movimento em pagamento,
         * cria o histórico.
         */
        if (
          editando.tipo !== "Pagamento funcionário" &&
          tipo === "Pagamento funcionário"
        ) {
          await supabase.from("pagamentos_funcionarios").insert({
            funcionario_id: funcionarioId,
            funcionario_nome: funcionarioNome,
            referencia,
            salario_base: numero(salarioBase),
            adicionais: numero(adicionais),
            descontos: numero(descontos),
            adiantamento: numero(adiantamento),
            valor_pago: valorNumerico,
            data_pagamento: dataMovimento,
            forma_pagamento: formaPagamento,
            status: "Pago",
            observacoes,
          });
        }
      } else {
        /*
         * NOVO MOVIMENTO
         */
        const { error } = await supabase
          .from("caixa_movimentacoes")
          .insert(dados);

        if (error) throw error;

        /*
         * Pagamento de funcionário também entra
         * automaticamente no histórico da folha.
         */
        if (tipo === "Pagamento funcionário") {
          const { error: pagamentoError } = await supabase
            .from("pagamentos_funcionarios")
            .insert({
              funcionario_id: funcionarioId,
              funcionario_nome: funcionarioNome,
              referencia,
              salario_base: numero(salarioBase),
              adicionais: numero(adicionais),
              descontos: numero(descontos),
              adiantamento: numero(adiantamento),
              valor_pago: valorNumerico,
              data_pagamento: dataMovimento,
              forma_pagamento: formaPagamento,
              status: "Pago",
              observacoes,
            });

          if (pagamentoError) {
            console.error(
              "Erro ao registrar histórico do funcionário:",
              pagamentoError
            );

            alert(
              "O pagamento foi lançado no Caixa, mas houve um problema ao salvar o histórico do funcionário."
            );
          }
        }
      }

      setModal(false);
      limparFormulario();
      await carregar();

      alert("Movimentação salva com sucesso!");
    } catch (error: any) {
      console.error(error);
      alert(
        error?.message ||
          "Não foi possível salvar a movimentação."
      );
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(item: Movimento) {
    const confirmar = confirm(
      `Deseja realmente excluir esta movimentação?\n\n${item.descricao}\n${dinheiro(
        item.valor
      )}`
    );

    if (!confirmar) return;

    try {
      /*
       * Se for pagamento de funcionário,
       * tenta localizar o histórico correspondente
       * antes de excluir o lançamento do Caixa.
       */
      if (
        item.tipo === "Pagamento funcionário" &&
        item.funcionario_id
      ) {
        const { data: pagamentoExistente } = await supabase
          .from("pagamentos_funcionarios")
          .select("id")
          .eq("funcionario_id", item.funcionario_id)
          .eq("valor_pago", item.valor)
          .eq("data_pagamento", item.data_movimento)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (pagamentoExistente) {
          await supabase
            .from("pagamentos_funcionarios")
            .delete()
            .eq("id", pagamentoExistente.id);
        }
      }

      const { error } = await supabase
        .from("caixa_movimentacoes")
        .delete()
        .eq("id", item.id);

      if (error) throw error;

      await carregar();

      alert("Movimentação excluída com sucesso!");
    } catch (error: any) {
      console.error(error);
      alert(
        error?.message ||
          "Não foi possível excluir a movimentação."
      );
    }
  }

  const filtrados = movimentos.filter((item) => {
    const texto = [
      item.tipo,
      item.descricao,
      item.funcionario_nome,
      item.categoria,
      item.motivo,
      item.referencia,
      item.observacoes,
    ]
      .join(" ")
      .toLowerCase();

    return texto.includes(busca.toLowerCase());
  });

  const entradas = movimentos
    .filter((m) => m.tipo === "Entrada")
    .reduce((s, m) => s + Number(m.valor || 0), 0);

  const despesas = movimentos
    .filter((m) => m.tipo === "Despesa")
    .reduce((s, m) => s + Number(m.valor || 0), 0);

  const sangrias = movimentos
    .filter((m) => m.tipo === "Sangria")
    .reduce((s, m) => s + Number(m.valor || 0), 0);

  const pagamentosFuncionarios = movimentos
    .filter((m) => m.tipo === "Pagamento funcionário")
    .reduce((s, m) => s + Number(m.valor || 0), 0);

  const proLabore = movimentos
    .filter((m) => m.tipo === "Pró-labore")
    .reduce((s, m) => s + Number(m.valor || 0), 0);

  const saidas =
    despesas +
    sangrias +
    pagamentosFuncionarios +
    proLabore;

  const saldo = entradas - saidas;

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* CABEÇALHO */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Caixa
            </h1>

            <p className="text-sm text-slate-500">
              Controle financeiro, sangrias, funcionários e pró-labore.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => abrirNovo("Sangria")}
              className="flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white"
            >
              <ArrowDownCircle size={18} />
              Nova sangria
            </button>

            <button
              onClick={() => abrirNovo("Pagamento funcionário")}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white"
            >
              <UserRound size={18} />
              Pagar funcionário
            </button>

            <button
              onClick={() => abrirNovo("Pró-labore")}
              className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white"
            >
              <Wallet size={18} />
              Pró-labore
            </button>

            <button
              onClick={() => abrirNovo("Entrada")}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white"
            >
              <Plus size={18} />
              Nova movimentação
            </button>
          </div>
        </div>

        {/* RESUMO */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">
                Saldo atual
              </span>
              <Wallet className="text-blue-600" size={22} />
            </div>

            <p className="mt-3 text-2xl font-bold text-slate-900">
              {dinheiro(saldo)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">
                Entradas
              </span>
              <ArrowUpCircle className="text-emerald-600" size={22} />
            </div>

            <p className="mt-3 text-xl font-bold text-emerald-600">
              {dinheiro(entradas)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">
                Despesas
              </span>
              <ArrowDownCircle className="text-red-600" size={22} />
            </div>

            <p className="mt-3 text-xl font-bold text-red-600">
              {dinheiro(despesas)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">
                Funcionários
              </span>
              <UserRound className="text-blue-600" size={22} />
            </div>

            <p className="mt-3 text-xl font-bold text-blue-600">
              {dinheiro(pagamentosFuncionarios)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">
                Pró-labore
              </span>
              <Banknote className="text-purple-600" size={22} />
            </div>

            <p className="mt-3 text-xl font-bold text-purple-600">
              {dinheiro(proLabore)}
            </p>
          </div>
        </div>

        {/* SEGUNDO RESUMO */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
            <p className="text-sm font-medium text-orange-700">
              Total de sangrias
            </p>
            <p className="mt-1 text-xl font-bold text-orange-800">
              {dinheiro(sangrias)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-medium text-slate-500">
              Total de saídas
            </p>
            <p className="mt-1 text-xl font-bold text-red-600">
              {dinheiro(saidas)}
            </p>
          </div>
        </div>

        {/* PESQUISA */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="relative">
            <Search
              size={19}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Pesquisar movimentações..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* LISTAGEM */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <h2 className="font-bold text-slate-900">
              Movimentações do caixa
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500">
              Carregando...
            </div>
          ) : filtrados.length === 0 ? (
            <div className="p-10 text-center">
              <Calculator
                size={40}
                className="mx-auto text-slate-300"
              />

              <p className="mt-3 font-medium text-slate-600">
                Nenhuma movimentação encontrada.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      Data
                    </th>
                    <th className="px-4 py-3 text-left">
                      Tipo
                    </th>
                    <th className="px-4 py-3 text-left">
                      Descrição
                    </th>
                    <th className="px-4 py-3 text-left">
                      Funcionário
                    </th>
                    <th className="px-4 py-3 text-left">
                      Forma
                    </th>
                    <th className="px-4 py-3 text-right">
                      Valor
                    </th>
                    <th className="px-4 py-3 text-right">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filtrados.map((item) => {
                    const entrada = item.tipo === "Entrada";

                    return (
                      <tr
                        key={item.id}
                        className="border-t border-slate-100"
                      >
                        <td className="px-4 py-4 whitespace-nowrap">
                          {item.data_movimento
                            ? new Date(
                                `${item.data_movimento}T12:00:00`
                              ).toLocaleDateString("pt-BR")
                            : "-"}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              item.tipo === "Entrada"
                                ? "bg-emerald-100 text-emerald-700"
                                : item.tipo === "Sangria"
                                ? "bg-orange-100 text-orange-700"
                                : item.tipo === "Pagamento funcionário"
                                ? "bg-blue-100 text-blue-700"
                                : item.tipo === "Pró-labore"
                                ? "bg-purple-100 text-purple-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {item.tipo}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <div className="font-medium text-slate-800">
                            {item.descricao || "-"}
                          </div>

                          {item.referencia && (
                            <div className="text-xs text-slate-400">
                              {item.referencia}
                            </div>
                          )}

                          {item.motivo && (
                            <div className="text-xs text-slate-400">
                              Motivo: {item.motivo}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          {item.funcionario_nome || "-"}
                        </td>

                        <td className="px-4 py-4">
                          {item.forma_pagamento || "-"}
                        </td>

                        <td
                          className={`px-4 py-4 text-right font-bold ${
                            entrada
                              ? "text-emerald-600"
                              : "text-red-600"
                          }`}
                        >
                          {entrada ? "+" : "-"}
                          {dinheiro(Number(item.valor || 0))}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => abrirEditar(item)}
                              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                              title="Editar"
                            >
                              <Edit size={17} />
                            </button>

                            <button
                              onClick={() => excluir(item)}
                              className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                              title="Excluir"
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">

            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editando
                    ? "Editar movimentação"
                    : "Nova movimentação"}
                </h2>

                <p className="text-sm text-slate-500">
                  Registre a movimentação financeira.
                </p>
              </div>

              <button
                onClick={() => {
                  setModal(false);
                  limparFormulario();
                }}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={22} />
              </button>
            </div>

            <div className="space-y-5 p-5">

              {/* TIPO */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Tipo
                </label>

                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                >
                  {TIPOS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* PAGAMENTO FUNCIONÁRIO */}
              {tipo === "Pagamento funcionário" && (
                <div className="space-y-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">

                  <div className="flex items-center gap-2 font-bold text-blue-800">
                    <UserRound size={19} />
                    Dados do pagamento
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Funcionário *
                    </label>

                    <select
                      value={funcionarioId}
                      onChange={(e) =>
                        setFuncionarioId(e.target.value)
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500"
                    >
                      <option value="">
                        Selecione o funcionário
                      </option>

                      {funcionarios.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.nome}
                          {f.cargo ? ` — ${f.cargo}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Referência
                    </label>

                    <input
                      value={referencia}
                      onChange={(e) =>
                        setReferencia(e.target.value)
                      }
                      placeholder="Ex.: Setembro/2026"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Salário-base
                      </label>

                      <input
                        type="number"
                        step="0.01"
                        value={salarioBase}
                        onChange={(e) =>
                          setSalarioBase(e.target.value)
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Adicionais
                      </label>

                      <input
                        type="number"
                        step="0.01"
                        value={adicionais}
                        onChange={(e) =>
                          setAdicionais(e.target.value)
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Descontos
                      </label>

                      <input
                        type="number"
                        step="0.01"
                        value={descontos}
                        onChange={(e) =>
                          setDescontos(e.target.value)
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Adiantamento
                      </label>

                      <input
                        type="number"
                        step="0.01"
                        value={adiantamento}
                        onChange={(e) =>
                          setAdiantamento(e.target.value)
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3"
                      />
                    </div>

                  </div>

                  <div className="rounded-xl bg-white p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-600">
                        Valor líquido a pagar
                      </span>

                      <span className="text-2xl font-bold text-blue-700">
                        {dinheiro(valorCalculadoFuncionario)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* DESCRIÇÃO */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Descrição
                </label>

                <input
                  value={descricao}
                  onChange={(e) =>
                    setDescricao(e.target.value)
                  }
                  placeholder="Descrição da movimentação"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              {/* VALOR */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Valor *
                </label>

                <input
                  type="number"
                  step="0.01"
                  value={valor}
                  onChange={(e) =>
                    setValor(e.target.value)
                  }
                  disabled={tipo === "Pagamento funcionário"}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-lg font-bold outline-none focus:border-blue-500 disabled:bg-slate-100"
                />

                {tipo === "Pagamento funcionário" && (
                  <p className="mt-1 text-xs text-slate-500">
                    Calculado automaticamente pelo salário,
                    adicionais, descontos e adiantamento.
                  </p>
                )}
              </div>

              {/* DATA + FORMA */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Data
                  </label>

                  <input
                    type="date"
                    value={dataMovimento}
                    onChange={(e) =>
                      setDataMovimento(e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Forma de pagamento
                  </label>

                  <select
                    value={formaPagamento}
                    onChange={(e) =>
                      setFormaPagamento(e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3"
                  >
                    <option value="">
                      Selecione
                    </option>
                    <option value="Pix">Pix</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Transferência">
                      Transferência
                    </option>
                    <option value="Débito">
                      Cartão de débito
                    </option>
                    <option value="Crédito">
                      Cartão de crédito
                    </option>
                    <option value="Boleto">
                      Boleto
                    </option>
                    <option value="Outro">
                      Outro
                    </option>
                  </select>
                </div>

              </div>

              {/* CATEGORIA */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Categoria
                </label>

                <input
                  value={categoria}
                  onChange={(e) =>
                    setCategoria(e.target.value)
                  }
                  placeholder="Ex.: Material, combustível, aluguel..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3"
                />
              </div>

              {/* MOTIVO */}
              {(tipo === "Sangria" ||
                tipo === "Pró-labore") && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Motivo
                  </label>

                  <input
                    value={motivo}
                    onChange={(e) =>
                      setMotivo(e.target.value)
                    }
                    placeholder={
                      tipo === "Sangria"
                        ? "Ex.: Retirada para pagamento de fornecedor"
                        : "Ex.: Pró-labore do mês"
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3"
                  />
                </div>
              )}

              {/* OBSERVAÇÕES */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Observações
                </label>

                <textarea
                  value={observacoes}
                  onChange={(e) =>
                    setObservacoes(e.target.value)
                  }
                  rows={3}
                  placeholder="Informações adicionais..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3"
                />
              </div>

              {/* BOTÕES */}
              <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">

                <button
                  onClick={() => {
                    setModal(false);
                    limparFormulario();
                  }}
                  className="rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-700"
                >
                  Cancelar
                </button>

                <button
                  onClick={salvar}
                  disabled={salvando}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
                >
                  <CheckCircle2 size={18} />

                  {salvando
                    ? "Salvando..."
                    : editando
                    ? "Salvar alterações"
                    : "Salvar movimentação"}
                </button>

              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
