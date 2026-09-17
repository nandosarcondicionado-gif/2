"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Edit,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Conta = {
  id: string;
  cliente_id: string | null;
  cliente_nome: string;
  descricao: string;
  referencia: string;
  valor: number;
  vencimento: string | null;
  data_recebimento: string | null;
  forma_pagamento: string;
  status: "Pendente" | "Recebido" | "Cancelado";
  observacoes: string;
};

type Cliente = {
  id: string;
  nome: string;
};

const vazio = {
  cliente_id: "",
  cliente_nome: "",
  descricao: "",
  referencia: "",
  valor: "",
  vencimento: "",
  data_recebimento: "",
  forma_pagamento: "",
  status: "Pendente",
  observacoes: "",
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

export default function ContasReceberPage() {
  const supabase = createClient();

  const [contas, setContas] = useState<Conta[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  const [busca, setBusca] = useState("");
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Conta | null>(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [form, setForm] = useState(vazio);

  async function carregar() {
    setLoading(true);

    const [receber, clientesResult] = await Promise.all([
      supabase
        .from("contas_receber")
        .select("*")
        .order("vencimento", { ascending: true }),

      supabase
        .from("clientes")
        .select("id,nome")
        .order("nome"),
    ]);

    if (!receber.error) {
      setContas((receber.data || []) as Conta[]);
    }

    if (!clientesResult.error) {
      setClientes((clientesResult.data || []) as Cliente[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  function abrirNovo() {
    setEditando(null);

    setForm({
      ...vazio,
      vencimento: hoje(),
    });

    setModal(true);
  }

  function abrirEditar(conta: Conta) {
    setEditando(conta);

    setForm({
      cliente_id: conta.cliente_id || "",
      cliente_nome: conta.cliente_nome || "",
      descricao: conta.descricao || "",
      referencia: conta.referencia || "",
      valor: String(conta.valor || ""),
      vencimento: conta.vencimento || "",
      data_recebimento: conta.data_recebimento || "",
      forma_pagamento: conta.forma_pagamento || "",
      status: conta.status,
      observacoes: conta.observacoes || "",
    });

    setModal(true);
  }

  function selecionarCliente(id: string) {
    const cliente = clientes.find((c) => c.id === id);

    setForm({
      ...form,
      cliente_id: id,
      cliente_nome: cliente?.nome || "",
    });
  }

  async function salvar() {
    if (!form.cliente_nome.trim()) {
      alert("Selecione o cliente.");
      return;
    }

    if (!form.descricao.trim()) {
      alert("Informe a descrição.");
      return;
    }

    const valor = Number(form.valor.replace(",", "."));

    if (!valor || valor <= 0) {
      alert("Informe um valor válido.");
      return;
    }

    setSalvando(true);

    const dados = {
      cliente_id: form.cliente_id || null,
      cliente_nome: form.cliente_nome,
      descricao: form.descricao,
      referencia: form.referencia,
      valor,
      vencimento: form.vencimento || null,
      data_recebimento:
        form.status === "Recebido"
          ? form.data_recebimento || hoje()
          : null,
      forma_pagamento: form.forma_pagamento,
      status: form.status,
      observacoes: form.observacoes,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editando) {
        const { error } = await supabase
          .from("contas_receber")
          .update(dados)
          .eq("id", editando.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("contas_receber")
          .insert(dados);

        if (error) throw error;
      }

      setModal(false);
      setEditando(null);
      setForm(vazio);

      await carregar();

      alert("Conta a receber salva com sucesso!");
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function marcarRecebido(conta: Conta) {
    const { error } = await supabase
      .from("contas_receber")
      .update({
        status: "Recebido",
        data_recebimento: hoje(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", conta.id);

    if (error) {
      alert(error.message);
      return;
    }

    await carregar();
  }

  async function excluir(conta: Conta) {
    if (
      !confirm(
        `Excluir "${conta.descricao}" de ${moeda(
          Number(conta.valor)
        )}?`
      )
    ) {
      return;
    }

    const { error } = await supabase
      .from("contas_receber")
      .delete()
      .eq("id", conta.id);

    if (error) {
      alert(error.message);
      return;
    }

    await carregar();
  }

  const filtradas = useMemo(() => {
    const texto = busca.toLowerCase();

    return contas.filter((conta) =>
      [
        conta.cliente_nome,
        conta.descricao,
        conta.referencia,
        conta.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(texto)
    );
  }, [contas, busca]);

  const pendente = contas
    .filter((c) => c.status === "Pendente")
    .reduce((s, c) => s + Number(c.valor || 0), 0);

  const recebido = contas
    .filter((c) => c.status === "Recebido")
    .reduce((s, c) => s + Number(c.valor || 0), 0);

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Contas a receber
            </h1>
            <p className="text-sm text-slate-500">
              Controle valores que seus clientes precisam pagar.
            </p>
          </div>

          <button
            onClick={abrirNovo}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white"
          >
            <Plus size={18} />
            Nova conta
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Total lançado
            </p>
            <p className="mt-2 text-2xl font-bold">
              {moeda(
                contas.reduce(
                  (s, c) => s + Number(c.valor || 0),
                  0
                )
              )}
            </p>
          </div>

          <div className="rounded-2xl bg-orange-50 p-5">
            <p className="text-sm text-orange-700">
              Pendente
            </p>
            <p className="mt-2 text-2xl font-bold text-orange-700">
              {moeda(pendente)}
            </p>
          </div>

          <div className="rounded-2xl bg-emerald-50 p-5">
            <p className="text-sm text-emerald-700">
              Recebido
            </p>
            <p className="mt-2 text-2xl font-bold text-emerald-700">
              {moeda(recebido)}
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Pesquisar cliente, descrição ou referência..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 outline-none"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-slate-500">
              Carregando...
            </div>
          ) : filtradas.length === 0 ? (
            <div className="p-10 text-center text-slate-500">
              Nenhuma conta cadastrada.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      Cliente
                    </th>
                    <th className="px-4 py-3 text-left">
                      Descrição
                    </th>
                    <th className="px-4 py-3 text-left">
                      Vencimento
                    </th>
                    <th className="px-4 py-3 text-left">
                      Status
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
                  {filtradas.map((conta) => (
                    <tr
                      key={conta.id}
                      className="border-t border-slate-100"
                    >
                      <td className="px-4 py-4 font-medium">
                        {conta.cliente_nome}
                      </td>

                      <td className="px-4 py-4">
                        <div>{conta.descricao}</div>
                        {conta.referencia && (
                          <div className="text-xs text-slate-400">
                            {conta.referencia}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        {conta.vencimento
                          ? new Date(
                              `${conta.vencimento}T12:00:00`
                            ).toLocaleDateString("pt-BR")
                          : "-"}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            conta.status === "Recebido"
                              ? "bg-emerald-100 text-emerald-700"
                              : conta.status === "Cancelado"
                              ? "bg-slate-100 text-slate-600"
                              : "bg-orange-100 text-orange-700"
                          }`}
                        >
                          {conta.status}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-right font-bold">
                        {moeda(Number(conta.valor || 0))}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          {conta.status === "Pendente" && (
                            <button
                              onClick={() =>
                                marcarRecebido(conta)
                              }
                              className="rounded-lg border border-emerald-200 p-2 text-emerald-600"
                            >
                              <CheckCircle2 size={17} />
                            </button>
                          )}

                          <button
                            onClick={() => abrirEditar(conta)}
                            className="rounded-lg border border-slate-200 p-2 text-slate-600"
                          >
                            <Edit size={17} />
                          </button>

                          <button
                            onClick={() => excluir(conta)}
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
                  ? "Editar conta"
                  : "Nova conta a receber"}
              </h2>

              <button
                onClick={() => setModal(false)}
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 p-5">

              <select
                value={form.cliente_id}
                onChange={(e) =>
                  selecionarCliente(e.target.value)
                }
                className="w-full rounded-xl border p-3"
              >
                <option value="">
                  Selecione o cliente
                </option>

                {clientes.map((cliente) => (
                  <option
                    key={cliente.id}
                    value={cliente.id}
                  >
                    {cliente.nome}
                  </option>
                ))}
              </select>

              <input
                placeholder="Descrição *"
                value={form.descricao}
                onChange={(e) =>
                  setForm({
                    ...form,
                    descricao: e.target.value,
                  })
                }
                className="w-full rounded-xl border p-3"
              />

              <input
                placeholder="Referência"
                value={form.referencia}
                onChange={(e) =>
                  setForm({
                    ...form,
                    referencia: e.target.value,
                  })
                }
                className="w-full rounded-xl border p-3"
              />

              <input
                type="number"
                step="0.01"
                placeholder="Valor"
                value={form.valor}
                onChange={(e) =>
                  setForm({
                    ...form,
                    valor: e.target.value,
                  })
                }
                className="w-full rounded-xl border p-3"
              />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Vencimento
                  </label>

                  <input
                    type="date"
                    value={form.vencimento}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        vencimento: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border p-3"
                  />
                </div>

                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      status: e.target.value as any,
                    })
                  }
                  className="w-full rounded-xl border p-3"
                >
                  <option value="Pendente">Pendente</option>
                  <option value="Recebido">Recebido</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>

              {form.status === "Recebido" && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <input
                    type="date"
                    value={form.data_recebimento}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        data_recebimento: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border p-3"
                  />

                  <select
                    value={form.forma_pagamento}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        forma_pagamento: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border p-3"
                  >
                    <option value="">
                      Forma de recebimento
                    </option>
                    <option value="Pix">Pix</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Transferência">
                      Transferência
                    </option>
                    <option value="Cartão">Cartão</option>
                    <option value="Boleto">Boleto</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
              )}

              <textarea
                rows={3}
                placeholder="Observações"
                value={form.observacoes}
                onChange={(e) =>
                  setForm({
                    ...form,
                    observacoes: e.target.value,
                  })
                }
                className="w-full rounded-xl border p-3"
              />

              <div className="flex justify-end gap-3 border-t pt-4">
                <button
                  onClick={() => setModal(false)}
                  className="rounded-xl border px-5 py-3 font-semibold"
                >
                  Cancelar
                </button>

                <button
                  onClick={salvar}
                  disabled={salvando}
                  className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
                >
                  {salvando ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
