"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  Plus,
  Search,
  Pencil,
  Trash2,
  CheckCircle2,
} from "lucide-react";

type Conta = {
  id: string;
  tipo: "Receber" | "Pagar";
  descricao: string;
  pessoa: string;
  documento: string;
  valor: number;
  vencimento: string | null;
  data_pagamento: string | null;
  forma_pagamento: string;
  categoria: string;
  status: "Pendente" | "Pago" | "Cancelado";
  observacoes: string;
};

const vazio = {
  tipo: "Receber" as "Receber" | "Pagar",
  descricao: "",
  pessoa: "",
  documento: "",
  valor: "",
  vencimento: new Date().toISOString().slice(0, 10),
  data_pagamento: "",
  forma_pagamento: "Pix",
  categoria: "",
  status: "Pendente" as "Pendente" | "Pago" | "Cancelado",
  observacoes: "",
};

function moeda(v: number) {
  return Number(v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function ContasPage() {
  const supabase = createClient();

  const [contas, setContas] = useState<Conta[]>([]);
  const [busca, setBusca] = useState("");
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState(vazio);

  async function carregar() {
    const { data, error } = await supabase
      .from("contas_financeiras")
      .select("*")
      .order("vencimento", { ascending: true });

    if (error) {
      alert(error.message);
      return;
    }

    setContas((data || []) as Conta[]);
  }

  useEffect(() => {
    carregar();
  }, []);

  function novo(tipo: "Receber" | "Pagar") {
    setEditando(null);
    setForm({
      ...vazio,
      tipo,
    });
    setModal(true);
  }

  function editar(c: Conta) {
    setEditando(c.id);

    setForm({
      tipo: c.tipo,
      descricao: c.descricao || "",
      pessoa: c.pessoa || "",
      documento: c.documento || "",
      valor: String(c.valor || ""),
      vencimento: c.vencimento || "",
      data_pagamento: c.data_pagamento || "",
      forma_pagamento: c.forma_pagamento || "Pix",
      categoria: c.categoria || "",
      status: c.status,
      observacoes: c.observacoes || "",
    });

    setModal(true);
  }

  async function salvar() {
    const valor = Number(form.valor.replace(",", "."));

    if (!form.descricao.trim()) {
      alert("Informe a descrição.");
      return;
    }

    if (!valor || valor <= 0) {
      alert("Informe o valor.");
      return;
    }

    setSalvando(true);

    const payload = {
      ...form,
      valor,
      data_pagamento:
        form.status === "Pago"
          ? form.data_pagamento ||
            new Date().toISOString().slice(0, 10)
          : null,
    };

    let error;

    if (editando) {
      ({ error } = await supabase
        .from("contas_financeiras")
        .update(payload)
        .eq("id", editando));
    } else {
      ({ error } = await supabase
        .from("contas_financeiras")
        .insert(payload));
    }

    setSalvando(false);

    if (error) {
      alert(error.message);
      return;
    }

    setModal(false);
    await carregar();
  }

  async function marcarPago(c: Conta) {
    const { error } = await supabase
      .from("contas_financeiras")
      .update({
        status: "Pago",
        data_pagamento: new Date().toISOString().slice(0, 10),
      })
      .eq("id", c.id);

    if (error) {
      alert(error.message);
      return;
    }

    await carregar();
  }

  async function excluir(id: string) {
    if (!confirm("Excluir esta conta?")) return;

    const { error } = await supabase
      .from("contas_financeiras")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await carregar();
  }

  const filtradas = useMemo(() => {
    const q = busca.toLowerCase();

    return contas.filter((c) =>
      [
        c.tipo,
        c.descricao,
        c.pessoa,
        c.documento,
        c.categoria,
        c.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [contas, busca]);

  const receber = contas
    .filter((c) => c.tipo === "Receber" && c.status !== "Cancelado")
    .reduce((s, c) => s + Number(c.valor), 0);

  const pagar = contas
    .filter((c) => c.tipo === "Pagar" && c.status !== "Cancelado")
    .reduce((s, c) => s + Number(c.valor), 0);

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">

        <div className="flex flex-wrap justify-between gap-4 mb-6">
          <div className="flex gap-3 items-center">
            <Link
              href="/financeiro"
              className="p-2 rounded-xl bg-slate-800"
            >
              <ArrowLeft size={20} />
            </Link>

            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                Contas
              </h1>
              <p className="text-slate-400">
                Contas a pagar e contas a receber
              </p>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => novo("Receber")}
              className="px-4 py-2 rounded-xl bg-emerald-600 font-semibold"
            >
              + A receber
            </button>

            <button
              onClick={() => novo("Pagar")}
              className="px-4 py-2 rounded-xl bg-red-600 font-semibold"
            >
              + A pagar
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <p className="text-slate-400">Total a receber</p>
            <strong className="text-2xl text-emerald-400">
              {moeda(receber)}
            </strong>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <p className="text-slate-400">Total a pagar</p>
            <strong className="text-2xl text-red-400">
              {moeda(pagar)}
            </strong>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6 flex gap-3">
          <Search />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Pesquisar..."
            className="bg-transparent outline-none w-full"
          />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-800">
                <tr>
                  <th className="p-4 text-left">Tipo</th>
                  <th className="p-4 text-left">Descrição</th>
                  <th className="p-4 text-left">Pessoa</th>
                  <th className="p-4 text-left">Vencimento</th>
                  <th className="p-4 text-left">Status</th>
                  <th className="p-4 text-right">Valor</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>

              <tbody>
                {filtradas.map((c) => (
                  <tr
                    key={c.id}
                    className="border-t border-slate-800"
                  >
                    <td className="p-4">{c.tipo}</td>
                    <td className="p-4">{c.descricao}</td>
                    <td className="p-4">{c.pessoa || "-"}</td>
                    <td className="p-4">
                      {c.vencimento
                        ? new Date(
                            c.vencimento + "T12:00:00"
                          ).toLocaleDateString("pt-BR")
                        : "-"}
                    </td>
                    <td className="p-4">{c.status}</td>
                    <td className="p-4 text-right font-bold">
                      {moeda(c.valor)}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        {c.status === "Pendente" && (
                          <button
                            onClick={() => marcarPago(c)}
                            className="p-2 rounded-lg bg-emerald-900/40"
                          >
                            <CheckCircle2 size={17} />
                          </button>
                        )}

                        <button
                          onClick={() => editar(c)}
                          className="p-2 rounded-lg bg-slate-800"
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          onClick={() => excluir(c.id)}
                          className="p-2 rounded-lg bg-red-900/40"
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
        </div>

        {modal && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 w-full max-w-2xl max-h-[90vh] overflow-y-auto">

              <h2 className="text-xl font-bold mb-5">
                {editando ? "Editar conta" : "Nova conta"}
              </h2>

              <div className="grid md:grid-cols-2 gap-4">

                <label>
                  Tipo
                  <select
                    value={form.tipo}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        tipo: e.target.value as any,
                      })
                    }
                    className="mt-1 w-full bg-slate-800 rounded-xl p-3"
                  >
                    <option>Receber</option>
                    <option>Pagar</option>
                  </select>
                </label>

                <label>
                  Status
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        status: e.target.value as any,
                      })
                    }
                    className="mt-1 w-full bg-slate-800 rounded-xl p-3"
                  >
                    <option>Pendente</option>
                    <option>Pago</option>
                    <option>Cancelado</option>
                  </select>
                </label>

                <label className="md:col-span-2">
                  Descrição
                  <input
                    value={form.descricao}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        descricao: e.target.value,
                      })
                    }
                    className="mt-1 w-full bg-slate-800 rounded-xl p-3"
                  />
                </label>

                <label>
                  Cliente / fornecedor
                  <input
                    value={form.pessoa}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        pessoa: e.target.value,
                      })
                    }
                    className="mt-1 w-full bg-slate-800 rounded-xl p-3"
                  />
                </label>

                <label>
                  Documento
                  <input
                    value={form.documento}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        documento: e.target.value,
                      })
                    }
                    className="mt-1 w-full bg-slate-800 rounded-xl p-3"
                  />
                </label>

                <label>
                  Valor
                  <input
                    type="number"
                    step="0.01"
                    value={form.valor}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        valor: e.target.value,
                      })
                    }
                    className="mt-1 w-full bg-slate-800 rounded-xl p-3"
                  />
                </label>

                <label>
                  Vencimento
                  <input
                    type="date"
                    value={form.vencimento}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        vencimento: e.target.value,
                      })
                    }
                    className="mt-1 w-full bg-slate-800 rounded-xl p-3"
                  />
                </label>

                <label>
                  Forma de pagamento
                  <select
                    value={form.forma_pagamento}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        forma_pagamento: e.target.value,
                      })
                    }
                    className="mt-1 w-full bg-slate-800 rounded-xl p-3"
                  >
                    <option>Pix</option>
                    <option>Dinheiro</option>
                    <option>Cartão</option>
                    <option>Transferência</option>
                    <option>Boleto</option>
                    <option>Outro</option>
                  </select>
                </label>

                <label>
                  Categoria
                  <input
                    value={form.categoria}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        categoria: e.target.value,
                      })
                    }
                    className="mt-1 w-full bg-slate-800 rounded-xl p-3"
                  />
                </label>

                <label className="md:col-span-2">
                  Observações
                  <textarea
                    value={form.observacoes}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        observacoes: e.target.value,
                      })
                    }
                    rows={3}
                    className="mt-1 w-full bg-slate-800 rounded-xl p-3"
                  />
                </label>

              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setModal(false)}
                  className="px-5 py-3 rounded-xl bg-slate-800"
                >
                  Cancelar
                </button>

                <button
                  onClick={salvar}
                  disabled={salvando}
                  className="px-5 py-3 rounded-xl bg-emerald-600 font-semibold"
                >
                  {salvando ? "Salvando..." : "Salvar"}
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </main>
  );
}
