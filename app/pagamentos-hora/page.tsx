"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  DollarSign,
  RefreshCw,
} from "lucide-react";

type Funcionario = {
  id: string;
  nome: string;
  status: string;
  perfil: string | null;
  funcao: string | null;
};

type Config = {
  funcionario_id: string;
  valor_hora: number;
  arredondamento_minutos: number;
};

type Hora = {
  id: string;
  funcionario_id: string;
  agenda_id: string | null;
  inicio: string;
  fim: string | null;
  minutos: number | null;
  valor_total: number | null;
  status: string;
};

type Recibo = {
  id: string;
  funcionario_id: string;
  periodo_inicio: string;
  periodo_fim: string;
  horas: number;
  valor_hora: number;
  valor_total: number;
  forma_pagamento: string;
  status: string;
  assinatura_nome: string | null;
};

function dinheiro(valor: number) {
  return Number(valor || 0).toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  );
}

function ehAjudante(
  funcionario: Funcionario
) {
  const perfil = String(
    funcionario.perfil || ""
  )
    .trim()
    .toLowerCase();

  const funcao = String(
    funcionario.funcao || ""
  )
    .trim()
    .toLowerCase();

  return (
    perfil === "ajudante" ||
    funcao === "ajudante"
  );
}

export default function PagamentosHoraPage() {
  const [funcionarios, setFuncionarios] =
    useState<Funcionario[]>([]);

  const [configs, setConfigs] =
    useState<Config[]>([]);

  const [horas, setHoras] =
    useState<Hora[]>([]);

  const [recibos, setRecibos] =
    useState<Recibo[]>([]);

  const [funcionarioId, setFuncionarioId] =
    useState("");

  const [valor, setValor] =
    useState("10");

  const [inicio, setInicio] =
    useState(
      new Date()
        .toISOString()
        .slice(0, 10)
    );

  const [fim, setFim] =
    useState(
      new Date()
        .toISOString()
        .slice(0, 10)
    );

  const [forma, setForma] =
    useState("Pix");

  const [loading, setLoading] =
    useState(true);

  async function carregar() {
    setLoading(true);

    try {
      const response = await fetch(
        "/api/funcionarios/pagamentos-hora",
        {
          cache: "no-store",
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        alert(
          data.error ||
            "Acesso negado."
        );
        return;
      }

      const lista =
        data.funcionarios || [];

      setFuncionarios(lista);
      setConfigs(
        data.configs || []
      );
      setHoras(data.horas || []);
      setRecibos(
        data.recibos || []
      );

      if (
        !funcionarioId &&
        lista.length > 0
      ) {
        const primeiro =
          lista.find(
            (item: Funcionario) =>
              ehAjudante(item)
          );

        if (primeiro) {
          setFuncionarioId(
            primeiro.id
          );

          const config =
            (
              data.configs || []
            ).find(
              (item: Config) =>
                item.funcionario_id ===
                primeiro.id
            );

          setValor(
            String(
              config?.valor_hora ??
                10
            )
          );
        }
      }
    } catch (error) {
      console.error(error);

      alert(
        "Não foi possível carregar o controle de horas."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function mudarFuncionario(
    id: string
  ) {
    setFuncionarioId(id);

    const config =
      configs.find(
        (item) =>
          item.funcionario_id === id
      );

    setValor(
      String(
        config?.valor_hora ?? 10
      )
    );
  }

  async function salvarValor() {
    if (!funcionarioId) {
      alert(
        "Selecione um ajudante."
      );
      return;
    }

    const valorNumerico =
      Number(
        valor.replace(",", ".")
      );

    const response = await fetch(
      "/api/funcionarios/pagamentos-hora",
      {
        method: "PUT",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          funcionario_id:
            funcionarioId,
          valor_hora:
            valorNumerico,
          arredondamento_minutos: 60,
        }),
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      alert(
        data.error ||
          "Erro ao salvar."
      );
      return;
    }

    alert(
      "Valor por hora salvo."
    );

    await carregar();
  }

  async function pagar() {
    if (!funcionarioId) {
      alert(
        "Selecione um ajudante."
      );
      return;
    }

    if (inicio > fim) {
      alert(
        "A data inicial não pode ser maior que a final."
      );
      return;
    }

    const response = await fetch(
      "/api/funcionarios/pagamentos-hora",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          funcionario_id:
            funcionarioId,
          periodo_inicio: inicio,
          periodo_fim: fim,
          forma_pagamento: forma,
        }),
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      alert(
        data.error ||
          "Erro ao gerar recibo."
      );
      return;
    }

    alert(
      `Recibo criado no valor de ${dinheiro(
        Number(
          data.recibo?.valor_total ||
            0
        )
      )}. O ajudante poderá assiná-lo pelo próprio login.`
    );

    await carregar();
  }

  function nome(id: string) {
    return (
      funcionarios.find(
        (item) => item.id === id
      )?.nome || id
    );
  }

  const ajudantes =
    funcionarios.filter(ehAjudante);

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white sm:p-6">
      <div className="mx-auto max-w-6xl">

        <a
          href="/funcionarios"
          className="mb-5 inline-flex items-center gap-2 text-slate-400"
        >
          <ArrowLeft size={18} />
          Funcionários
        </a>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Pagamento por hora
            </h1>

            <p className="text-slate-400">
              Configure o valor, confira as horas
              e gere recibos.
            </p>
          </div>

          <button
            onClick={carregar}
            className="rounded-xl border border-slate-700 p-3"
          >
            <RefreshCw size={18} />
          </button>
        </div>

        {loading ? (
          <p className="mt-8 text-slate-400">
            Carregando...
          </p>
        ) : (
          <>
            <section className="mt-6 grid gap-4 md:grid-cols-3">

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <label className="text-sm text-slate-400">
                  Ajudante
                </label>

                <select
                  value={funcionarioId}
                  onChange={(e) =>
                    mudarFuncionario(
                      e.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3"
                >
                  <option value="">
                    Selecione
                  </option>

                  {ajudantes.map(
                    (funcionario) => (
                      <option
                        key={
                          funcionario.id
                        }
                        value={
                          funcionario.id
                        }
                      >
                        {funcionario.nome}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <label className="text-sm text-slate-400">
                  Valor por hora
                </label>

                <input
                  value={valor}
                  onChange={(e) =>
                    setValor(
                      e.target.value
                    )
                  }
                  inputMode="decimal"
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3"
                />

                <button
                  onClick={salvarValor}
                  className="mt-2 w-full rounded-xl bg-blue-600 px-3 py-3 font-semibold"
                >
                  Salvar valor
                </button>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

                <div className="flex items-center gap-2 text-slate-400">
                  <DollarSign size={18} />
                  Como pagar
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">

                  <input
                    type="date"
                    value={inicio}
                    onChange={(e) =>
                      setInicio(
                        e.target.value
                      )
                    }
                    className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-3"
                  />

                  <input
                    type="date"
                    value={fim}
                    onChange={(e) =>
                      setFim(
                        e.target.value
                      )
                    }
                    className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-3"
                  />

                </div>

                <select
                  value={forma}
                  onChange={(e) =>
                    setForma(
                      e.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3"
                >
                  <option>Pix</option>
                  <option>Dinheiro</option>
                  <option>
                    Transferência
                  </option>
                </select>

                <button
                  onClick={pagar}
                  className="mt-2 w-full rounded-xl bg-emerald-600 px-3 py-3 font-semibold"
                >
                  Gerar recibo e marcar
                  horas como pagas
                </button>

              </div>
            </section>

            <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">

              <h2 className="font-bold">
                Horas
              </h2>

              <div className="mt-3 overflow-x-auto">

                <table className="w-full text-sm">

                  <thead>
                    <tr className="border-b border-slate-800 text-left text-slate-400">
                      <th className="p-3">
                        Ajudante
                      </th>
                      <th className="p-3">
                        Início
                      </th>
                      <th className="p-3">
                        Tempo
                      </th>
                      <th className="p-3">
                        Valor
                      </th>
                      <th className="p-3">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {horas.map(
                      (hora) => (
                        <tr
                          key={hora.id}
                          className="border-b border-slate-800"
                        >
                          <td className="p-3">
                            {nome(
                              hora.funcionario_id
                            )}
                          </td>

                          <td className="p-3">
                            {new Date(
                              hora.inicio
                            ).toLocaleString(
                              "pt-BR"
                            )}
                          </td>

                          <td className="p-3">
                            {hora.minutos !=
                            null
                              ? `${Math.floor(
                                  hora.minutos /
                                    60
                                )}h ${String(
                                  hora.minutos %
                                    60
                                ).padStart(
                                  2,
                                  "0"
                                )}min`
                              : "—"}
                          </td>

                          <td className="p-3">
                            {hora.valor_total !=
                            null
                              ? dinheiro(
                                  hora.valor_total
                                )
                              : "—"}
                          </td>

                          <td className="p-3">
                            {hora.status}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>

                </table>

              </div>
            </section>

            <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">

              <h2 className="font-bold">
                Recibos
              </h2>

              <div className="mt-3 space-y-2">

                {recibos.map(
                  (recibo) => (
                    <div
                      key={recibo.id}
                      className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950 p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <strong>
                          {nome(
                            recibo.funcionario_id
                          )}
                        </strong>

                        <p className="text-sm text-slate-400">
                          {recibo.periodo_inicio
                            .split("-")
                            .reverse()
                            .join("/")}{" "}
                          a{" "}
                          {recibo.periodo_fim
                            .split("-")
                            .reverse()
                            .join("/")}{" "}
                          ·{" "}
                          {Number(
                            recibo.horas
                          ).toFixed(2)}
                          h ·{" "}
                          {dinheiro(
                            recibo.valor_total
                          )}
                        </p>
                      </div>

                      <span className="text-sm text-slate-300">
                        {recibo.status}

                        {recibo.assinatura_nome
                          ? ` · ${recibo.assinatura_nome}`
                          : ""}
                      </span>
                    </div>
                  )
                )}

              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
