"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarDays,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Movimento = {
  tipo: string;
  valor: number;
  data_movimento: string;
};

type ContaPagar = {
  valor: number;
  status: string;
  vencimento: string | null;
};

type ContaReceber = {
  valor: number;
  status: string;
  vencimento: string | null;
};

function moeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function primeiroDiaMes() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

export default function RelatoriosFinanceirosPage() {
  const supabase = createClient();

  const [inicio, setInicio] = useState(primeiroDiaMes());
  const [fim, setFim] = useState(hoje());

  const [movimentos, setMovimentos] = useState<Movimento[]>([]);
  const [contasPagar, setContasPagar] = useState<ContaPagar[]>([]);
  const [contasReceber, setContasReceber] = useState<ContaReceber[]>([]);

  const [loading, setLoading] = useState(true);

  async function carregar() {
    setLoading(true);

    const [
      movimentosResult,
      pagarResult,
      receberResult,
    ] = await Promise.all([
      supabase
        .from("caixa_movimentacoes")
        .select("tipo,valor,data_movimento")
        .gte("data_movimento", inicio)
        .lte("data_movimento", fim),

      supabase
        .from("contas_pagar")
        .select("valor,status,vencimento")
        .gte("vencimento", inicio)
        .lte("vencimento", fim),

      supabase
        .from("contas_receber")
        .select("valor,status,vencimento")
        .gte("vencimento", inicio)
        .lte("vencimento", fim),
    ]);

    if (!movimentosResult.error) {
      setMovimentos(
        (movimentosResult.data || []) as Movimento[]
      );
    }

    if (!pagarResult.error) {
      setContasPagar(
        (pagarResult.data || []) as ContaPagar[]
      );
    }

    if (!receberResult.error) {
      setContasReceber(
        (receberResult.data || []) as ContaReceber[]
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    carregar();
  }, [inicio, fim]);

  const entradas = useMemo(
    () =>
      movimentos
        .filter((m) => m.tipo === "Entrada")
        .reduce((s, m) => s + Number(m.valor || 0), 0),
    [movimentos]
  );

  const despesas = useMemo(
    () =>
      movimentos
        .filter((m) => m.tipo === "Despesa")
        .reduce((s, m) => s + Number(m.valor || 0), 0),
    [movimentos]
  );

  const sangrias = useMemo(
    () =>
      movimentos
        .filter((m) => m.tipo === "Sangria")
        .reduce((s, m) => s + Number(m.valor || 0), 0),
    [movimentos]
  );

  const funcionarios = useMemo(
    () =>
      movimentos
        .filter(
          (m) => m.tipo === "Pagamento funcionário"
        )
        .reduce((s, m) => s + Number(m.valor || 0), 0),
    [movimentos]
  );

  const proLabore = useMemo(
    () =>
      movimentos
        .filter((m) => m.tipo === "Pró-labore")
        .reduce((s, m) => s + Number(m.valor || 0), 0),
    [movimentos]
  );

  const saidas =
    despesas +
    sangrias +
    funcionarios +
    proLabore;

  const resultado = entradas - saidas;

  const pagarPendente = contasPagar
    .filter((c) => c.status === "Pendente")
    .reduce((s, c) => s + Number(c.valor || 0), 0);

  const receberPendente = contasReceber
    .filter((c) => c.status === "Pendente")
    .reduce((s, c) => s + Number(c.valor || 0), 0);

  const pago = contasPagar
    .filter((c) => c.status === "Pago")
    .reduce((s, c) => s + Number(c.valor || 0), 0);

  const recebido = contasReceber
    .filter((c) => c.status === "Recebido")
    .reduce((s, c) => s + Number(c.valor || 0), 0);

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Relatórios financeiros
            </h1>

            <p className="text-sm text-slate-500">
              Visão geral da movimentação financeira da empresa.
            </p>
          </div>

          <button
            onClick={carregar}
            className="flex items-center justify-center gap-2 rounded-xl border bg-white px-4 py-3 font-semibold"
          >
            <RefreshCw size={18} />
            Atualizar
          </button>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 font-semibold">
            <CalendarDays size={19} />
            Período
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-slate-500">
                Início
              </label>

              <input
                type="date"
                value={inicio}
                onChange={(e) => setInicio(e.target.value)}
                className="w-full rounded-xl border p-3"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-500">
                Fim
              </label>

              <input
                type="date"
                value={fim}
                onChange={(e) => setFim(e.target.value)}
                className="w-full rounded-xl border p-3"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-10 text-center">
            Carregando relatório...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

              <div className="rounded-2xl bg-emerald-50 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-emerald-700">
                    Entradas
                  </span>
                  <ArrowUpCircle
                    size={22}
                    className="text-emerald-600"
                  />
                </div>

                <p className="mt-3 text-2xl font-bold text-emerald-700">
                  {moeda(entradas)}
                </p>
              </div>

              <div className="rounded-2xl bg-red-50 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-red-700">
                    Saídas
                  </span>
                  <ArrowDownCircle
                    size={22}
                    className="text-red-600"
                  />
                </div>

                <p className="mt-3 text-2xl font-bold text-red-700">
                  {moeda(saidas)}
                </p>
              </div>

              <div className="rounded-2xl bg-blue-50 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-700">
                    Resultado
                  </span>
                  <Wallet
                    size={22}
                    className="text-blue-600"
                  />
                </div>

                <p
                  className={`mt-3 text-2xl font-bold ${
                    resultado >= 0
                      ? "text-blue-700"
                      : "text-red-700"
                  }`}
                >
                  {moeda(resultado)}
                </p>
              </div>

              <div className="rounded-2xl bg-purple-50 p-5">
                <span className="text-sm text-purple-700">
                  Funcionários
                </span>

                <p className="mt-3 text-2xl font-bold text-purple-700">
                  {moeda(funcionarios)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">
                  Despesas
                </p>

                <p className="mt-2 text-xl font-bold text-red-600">
                  {moeda(despesas)}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">
                  Sangrias
                </p>

                <p className="mt-2 text-xl font-bold text-orange-600">
                  {moeda(sangrias)}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">
                  Pró-labore
                </p>

                <p className="mt-2 text-xl font-bold text-purple-600">
                  {moeda(proLabore)}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">
                  Total movimentações
                </p>

                <p className="mt-2 text-xl font-bold">
                  {movimentos.length}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="font-bold text-slate-900">
                  Contas a pagar
                </h2>

                <div className="mt-5 space-y-4">
                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      Pendentes
                    </span>
                    <strong className="text-orange-600">
                      {moeda(pagarPendente)}
                    </strong>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      Pagas
                    </span>
                    <strong className="text-emerald-600">
                      {moeda(pago)}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="font-bold text-slate-900">
                  Contas a receber
                </h2>

                <div className="mt-5 space-y-4">
                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      Pendentes
                    </span>
                    <strong className="text-orange-600">
                      {moeda(receberPendente)}
                    </strong>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      Recebidas
                    </span>
                    <strong className="text-emerald-600">
                      {moeda(recebido)}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold">
                Resumo do período
              </h2>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[650px]">
                  <tbody>
                    <tr className="border-b">
                      <td className="py-3">
                        Entradas
                      </td>
                      <td className="py-3 text-right font-bold text-emerald-600">
                        {moeda(entradas)}
                      </td>
                    </tr>

                    <tr className="border-b">
                      <td className="py-3">
                        Despesas
                      </td>
                      <td className="py-3 text-right font-bold text-red-600">
                        {moeda(despesas)}
                      </td>
                    </tr>

                    <tr className="border-b">
                      <td className="py-3">
                        Sangrias
                      </td>
                      <td className="py-3 text-right font-bold text-orange-600">
                        {moeda(sangrias)}
                      </td>
                    </tr>

                    <tr className="border-b">
                      <td className="py-3">
                        Pagamentos de funcionários
                      </td>
                      <td className="py-3 text-right font-bold text-blue-600">
                        {moeda(funcionarios)}
                      </td>
                    </tr>

                    <tr className="border-b">
                      <td className="py-3">
                        Pró-labore
                      </td>
                      <td className="py-3 text-right font-bold text-purple-600">
                        {moeda(proLabore)}
                      </td>
                    </tr>

                    <tr>
                      <td className="py-4 font-bold">
                        Resultado líquido
                      </td>
                      <td
                        className={`py-4 text-right text-xl font-bold ${
                          resultado >= 0
                            ? "text-emerald-600"
                            : "text-red-600"
                        }`}
                      >
                        {moeda(resultado)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
