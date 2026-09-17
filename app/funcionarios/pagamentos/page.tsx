"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Edit,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Pagamento = {
  id: string;
  funcionario_id: string;
  funcionario_nome: string;
  referencia: string;
  salario_base: number;
  adicionais: number;
  descontos: number;
  adiantamento: number;
  valor_pago: number;
  data_pagamento: string | null;
  forma_pagamento: string;
  status: string;
  observacoes: string;
};

type Funcionario = {
  id: string;
  nome: string;
  salario: number;
};

function moeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

export default function PagamentosFuncionariosPage() {
  const supabase = createClient();

  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);

  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Pagamento | null>(null);

  const [funcionarioId, setFuncionarioId] = useState("");
  const [referencia, setReferencia] = useState("");
  const [salarioBase, setSalarioBase] = useState("");
  const [adicionais, setAdicionais] = useState("");
  const [descontos, setDescontos] = useState("");
  const [adiantamento, setAdiantamento] = useState("");
  const [valorPago, setValorPago] = useState("");
  const [dataPagamento, setDataPagamento] = useState(hoje());
  const [formaPagamento, setFormaPagamento] = useState("");
  const [status, setStatus] = useState("Pago");
  const [observacoes, setObservacoes] = useState("");

  async function carregar() {
    setLoading(true);

    const [pagamentosResult, funcionariosResult] =
      await Promise.all([
        supabase
          .from("pagamentos_funcionarios")
          .select("*")
          .order("data_pagamento", { ascending: false })
          .order("created_at", { ascending: false }),

        supabase
          .from("funcionarios")
          .select("id,nome,salario")
          .order("nome"),
      ]);

    if (!pagamentosResult.error) {
      setPagamentos(
        (pagamentosResult.data || []) as Pagamento[]
      );
    }

    if (!funcionariosResult.error) {
      setFuncionarios(
        (funcionariosResult.data || []) as Funcionario[]
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  function limpar() {
    setFuncionarioId("");
    setReferencia("");
    setSalarioBase("");
    setAdicionais("");
    setDescontos("");
    setAdiantamento("");
    setValorPago("");
    setDataPagamento(hoje());
    setFormaPagamento("");
    setStatus("Pago");
    setObservacoes("");
    setEditando(null);
  }

  function abrirNovo() {
    limpar();
    setModal(true);
  }

  function abrirEditar(p: Pagamento) {
    setEditando(p);

    setFuncionarioId(p.funcionario_id || "");
    setReferencia(p.referencia || "");
    setSalarioBase(String(p.salario_base || ""));
    setAdicionais(String(p.adicionais || ""));
    setDescontos(String(p.descontos || ""));
    setAdiantamento(String(p.adiantamento || ""));
    setValorPago(String(p.valor_pago || ""));
    setDataPagamento(
      p.data_pagamento || hoje()
    );
    setFormaPagamento(p.forma_pagamento || "");
    setStatus(p.status || "Pago");
    setObservacoes(p.observacoes || "");

    setModal(true);
  }

  function selecionarFuncionario(id: string) {
    const funcionario = funcionarios.find(
      (f) => f.id === id
    );

    setFuncionarioId(id);

    if (funcionario) {
      setSalarioBase(String(funcionario.salario || 0));
    }
  }

  const calculado =
    Number(salarioBase || 0) +
    Number(adicionais || 0) -
    Number(descontos || 0) -
    Number(adiantamento || 0);

  useEffect(() => {
    if (!editando && funcionarioId) {
      setValorPago(String(Math.max(0, calculado)));
    }
  }, [
    salarioBase,
    adicionais,
    descontos,
    adiantamento,
    funcionarioId,
    editando,
  ]);

  async function salvar() {
    if (!funcionarioId) {
      alert("Selecione o funcionário.");
      return;
    }

    const funcionario = funcionarios.find(
      (f) => f.id === funcionarioId
    );

    const valor = Number(valorPago || 0);

    if (valor <= 0) {
      alert("Informe um valor válido.");
      return;
    }

    const dados = {
      funcionario_id: funcionarioId,
      funcionario_nome: funcionario?.nome || "",
      referencia,
      salario_base: Number(salarioBase || 0),
      adicionais: Number(adicionais || 0),
      descontos: Number(descontos || 0),
      adiantamento: Number(adiantamento || 0),
      valor_pago: valor,
      data_pagamento: dataPagamento || null,
      forma_pagamento: formaPagamento,
      status,
      observacoes,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editando) {
        const { error } = await supabase
          .from("pagamentos_funcionarios")
          .update(dados)
          .eq("id", editando.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("pagamentos_funcionarios")
          .insert(dados);

        if (error) throw error;
      }

      setModal(false);
      limpar();
      await carregar();

      alert("Pagamento salvo com sucesso!");
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Erro ao salvar pagamento.");
    }
  }

  async function excluir(p: Pagamento) {
    if (
      !confirm(
        `Excluir o pagamento de ${p.funcionario_nome}?`
      )
    ) {
      return;
    }

    const { error } = await supabase
      .from("pagamentos_funcionarios")
      .delete()
      .eq("id", p.id);

    if (error) {
      alert(error.message);
      return;
    }

    await carregar();
  }

  const filtrados = useMemo(() => {
    const texto = busca.toLowerCase();

    return pagamentos.filter((p) =>
      [
        p.funcionario_nome,
        p.referencia,
        p.status,
        p.forma_pagamento,
      ]
        .join(" ")
        .toLowerCase()
        .includes(texto)
    );
  }, [pagamentos, busca]);

  const totalPago = pagamentos
    .filter((p) => p.status === "Pago")
    .reduce(
      (s, p) => s + Number(p.valor_pago || 0),
      0
    );

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Pagamentos de funcionários
            </h1>
            <p className="text-sm text-slate-500">
              Histórico completo dos pagamentos realizados.
            </p>
          </div>

          <button
            onClick={abrirNovo}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white"
          >
            <Plus size={18} />
            Novo pagamento
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Pagamentos registrados
            </p>
            <p className="mt-2 text-2xl font-bold">
              {pagamentos.length}
            </p>
          </div>

          <div className="rounded-2xl bg-blue-50 p-5">
            <p className="text-sm text-blue-700">
              Total pago
            </p>
            <p className="mt-2 text-2xl font-bold text-blue-700">
              {moeda(totalPago)}
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Pesquisar funcionário ou referência..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          {loading ? (
            <div className="p-8 text-center">
              Carregando...
            </div>
          ) : filtrados.length === 0 ? (
            <div className="p-10 text-center text-slate-500">
              Nenhum pagamento encontrado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      Funcionário
                    </th>
                    <th className="px-4 py-3 text-left">
                      Referência
                    </th>
                    <th className="px-4 py-3 text-left">
                      Data
                    </th>
                    <th className="px-4 py-3 text-right">
                      Base
                    </th>
                    <th className="px-4 py-3 text-right">
                      Adicionais
                    </th>
                    <th className="px-4 py-3 text-right">
                      Descontos
                    </th>
                    <th className="px-4 py-3 text-right">
                      Pago
                    </th>
                    <th className="px-4 py-3 text-right">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filtrados.map((p) => (
                    <tr
                      key={p.id}
                      className="border-t border-slate-100"
                    >
                      <td className="px-4 py-4 font-medium">
                        {p.funcionario_nome}
                      </td>

                      <td className="px-4 py-4">
                        {p.referencia || "-"}
                      </td>

                      <td className="px-4 py-4">
                        {p.data_pagamento
                          ? new Date(
                              `${p.data_pagamento}T12:00:00`
                            ).toLocaleDateString("pt-BR")
                          : "-"}
                      </td>

                      <td className="px-4 py-4 text-right">
                        {moeda(
                          Number(p.salario_base || 0)
                        )}
                      </td>

                      <td className="px-4 py-4 text-right text-emerald-600">
                        {moeda(
                          Number(p.adicionais || 0)
                        )}
                      </td>

                      <td className="px-4 py-4 text-right text-red-600">
                        {moeda(
                          Number(p.descontos || 0)
                        )}
                      </td>

                      <td className="px-4 py-4 text-right font-bold text-blue-700">
                        {moeda(
                          Number(p.valor_pago || 0)
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => abrirEditar(p)}
                            className="rounded-lg border p-2"
                          >
                            <Edit size={17} />
                          </button>

                          <button
                            onClick={() => excluir(p)}
                            className="rounded-lg border border-red-200 p-2 text-red-600"
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

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white">

            <div className="flex items-center justify-between border-b p-5">
              <h2 className="text-xl font-bold">
                {editando
                  ? "Editar pagamento"
                  : "Novo pagamento"}
              </h2>

              <button
                onClick={() => {
                  setModal(false);
                  limpar();
                }}
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 p-5">

              <select
                value={funcionarioId}
                onChange={(e) =>
                  selecionarFuncionario(e.target.value)
                }
                className="w-full rounded-xl border p-3"
              >
                <option value="">
                  Selecione o funcionário
                </option>

                {funcionarios.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                  </option>
                ))}
              </select>

              <input
                placeholder="Referência — Ex.: Setembro/2026"
                value={referencia}
                onChange={(e) =>
                  setReferencia(e.target.value)
                }
                className="w-full rounded-xl border p-3"
              />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <input
                  type="number"
                  step="0.01"
                  placeholder="Salário-base"
                  value={salarioBase}
                  onChange={(e) =>
                    setSalarioBase(e.target.value)
                  }
                  className="w-full rounded-xl border p-3"
                />

                <input
                  type="number"
                  step="0.01"
                  placeholder="Adicionais"
                  value={adicionais}
                  onChange={(e) =>
                    setAdicionais(e.target.value)
                  }
                  className="w-full rounded-xl border p-3"
                />

                <input
                  type="number"
                  step="0.01"
                  placeholder="Descontos"
                  value={descontos}
                  onChange={(e) =>
                    setDescontos(e.target.value)
                  }
                  className="w-full rounded-xl border p-3"
                />

                <input
                  type="number"
                  step="0.01"
                  placeholder="Adiantamento"
                  value={adiantamento}
                  onChange={(e) =>
                    setAdiantamento(e.target.value)
                  }
                  className="w-full rounded-xl border p-3"
                />
              </div>

              <div className="rounded-xl bg-blue-50 p-4">
                <p className="text-sm text-blue-700">
                  Valor calculado
                </p>

                <p className="text-2xl font-bold text-blue-800">
                  {moeda(Math.max(0, calculado))}
                </p>
              </div>

              <input
                type="number"
                step="0.01"
                placeholder="Valor pago"
                value={valorPago}
                onChange={(e) =>
                  setValorPago(e.target.value)
                }
                className="w-full rounded-xl border p-3 font-bold"
              />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <input
                  type="date"
                  value={dataPagamento}
                  onChange={(e) =>
                    setDataPagamento(e.target.value)
                  }
                  className="w-full rounded-xl border p-3"
                />

                <select
                  value={formaPagamento}
                  onChange={(e) =>
                    setFormaPagamento(e.target.value)
                  }
                  className="w-full rounded-xl border p-3"
                >
                  <option value="">Forma de pagamento</option>
                  <option value="Pix">Pix</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Transferência">
                    Transferência
                  </option>
                  <option value="Cartão">Cartão</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value)
                }
                className="w-full rounded-xl border p-3"
              >
                <option value="Pago">Pago</option>
                <option value="Pendente">Pendente</option>
                <option value="Cancelado">Cancelado</option>
              </select>

              <textarea
                rows={3}
                placeholder="Observações"
                value={observacoes}
                onChange={(e) =>
                  setObservacoes(e.target.value)
                }
                className="w-full rounded-xl border p-3"
              />

              <div className="flex justify-end gap-3 border-t pt-4">
                <button
                  onClick={() => {
                    setModal(false);
                    limpar();
                  }}
                  className="rounded-xl border px-5 py-3 font-semibold"
                >
                  Cancelar
                </button>

                <button
                  onClick={salvar}
                  className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white"
                >
                  Salvar pagamento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
