"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  RefreshCw,
  UserRound,
} from "lucide-react";

type Ajudante = {
  id: string;
  nome: string;
};

type Agenda = {
  id: string;
  cliente_nome: string;
  cidade: string;
  servico: string;
  tecnico: string;
  data: string;
  horario: string;
  status: string;
  ajudante_id: string | null;
};

export default function AtribuirAjudantesPage() {
  const [ajudantes, setAjudantes] =
    useState<Ajudante[]>([]);

  const [agenda, setAgenda] =
    useState<Agenda[]>([]);

  const [loading, setLoading] =
    useState(true);

  async function carregar() {
    setLoading(true);

    try {
      const response = await fetch(
        "/api/agenda/ajudantes",
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.error ||
            "Acesso negado."
        );
        return;
      }

      setAjudantes(
        data.ajudantes || []
      );

      setAgenda(data.agenda || []);
    } catch (error) {
      console.error(error);

      alert(
        "Não foi possível carregar os dados."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function salvar(
    agendaId: string,
    ajudanteId: string
  ) {
    try {
      const response = await fetch(
        "/api/agenda/ajudantes",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            agenda_id: agendaId,
            ajudante_id:
              ajudanteId || null,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        alert(
          data.error ||
            "Não foi possível salvar."
        );
        return;
      }

      setAgenda((lista) =>
        lista.map((item) =>
          item.id === agendaId
            ? {
                ...item,
                ajudante_id:
                  data.agenda
                    ?.ajudante_id ||
                  null,
              }
            : item
        )
      );
    } catch (error) {
      console.error(error);

      alert(
        "Erro ao salvar a atribuição."
      );
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white sm:p-6">
      <div className="mx-auto max-w-6xl">
        <a
          href="/"
          className="mb-5 inline-flex items-center gap-2 text-slate-400"
        >
          <ArrowLeft size={18} />
          Voltar
        </a>

        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">
              Atribuir ajudantes
            </h1>

            <p className="text-slate-400">
              Defina qual ajudante acompanhará
              cada atendimento.
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
          <div className="mt-6 space-y-3">
            {agenda.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-4"
              >
                <div className="grid gap-4 md:grid-cols-[1fr_260px]">
                  <div>
                    <p className="font-semibold">
                      {item.data
                        ?.split("-")
                        .reverse()
                        .join("/")}{" "}
                      {item.horario?.slice(
                        0,
                        5
                      )}{" "}
                      — {item.cliente_nome}
                    </p>

                    <p className="mt-1 text-sm text-slate-300">
                      {item.servico}
                    </p>

                    <p className="mt-1 text-sm text-slate-400">
                      {item.cidade} · Técnico:{" "}
                      {item.tecnico ||
                        "Não informado"}
                    </p>
                  </div>

                  <label className="flex items-center gap-2">
                    <UserRound
                      size={17}
                      className="text-slate-400"
                    />

                    <select
                      value={
                        item.ajudante_id ||
                        ""
                      }
                      onChange={(e) =>
                        salvar(
                          item.id,
                          e.target.value
                        )
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3"
                    >
                      <option value="">
                        Sem ajudante
                      </option>

                      {ajudantes.map(
                        (ajudante) => (
                          <option
                            key={
                              ajudante.id
                            }
                            value={
                              ajudante.id
                            }
                          >
                            {ajudante.nome}
                          </option>
                        )
                      )}
                    </select>
                  </label>
                </div>
              </div>
            ))}

            {agenda.length === 0 && (
              <p className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-slate-400">
                Nenhum atendimento encontrado.
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
