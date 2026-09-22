"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  CheckCircle2,
  LogOut,
  PlayCircle,
  ReceiptText,
  RefreshCw,
  StopCircle,
  UserRound,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Servico = {
  id: string;
  cliente_nome: string;
  cidade: string;
  servico: string;
  tecnico: string;
  data: string;
  horario: string;
  status: string;
};

type Hora = {
  id: string;
  agenda_id: string | null;
  inicio: string;
  fim: string | null;
  minutos: number | null;
  valor_hora: number;
  valor_total: number | null;
  status: string;
};

type Recibo = {
  id: string;
  periodo_inicio: string;
  periodo_fim: string;
  horas: number;
  valor_hora: number;
  valor_total: number;
  forma_pagamento: string;
  data_pagamento: string | null;
  status: string;
  assinatura_data: string | null;
  assinatura_nome: string | null;
};

function dinheiro(
  valor: number
) {
  return Number(
    valor || 0
  ).toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  );
}

function dataBR(
  valor: string
) {
  if (!valor) {
    return "-";
  }

  const [
    ano,
    mes,
    dia,
  ] =
    valor
      .slice(0, 10)
      .split("-");

  return `${dia}/${mes}/${ano}`;
}

function duracao(
  minutos: number
) {
  const horas =
    Math.floor(
      minutos / 60
    );

  const minutosRestantes =
    minutos % 60;

  return `${horas}h ${String(
    minutosRestantes
  ).padStart(
    2,
    "0"
  )}min`;
}

export default function AjudantePage() {
  const router =
    useRouter();

  const supabase =
    createClient();

  const canvasRef =
    useRef<HTMLCanvasElement>(
      null
    );

  const drawing =
    useRef(false);

  const [
    nome,
    setNome,
  ] =
    useState(
      "Ajudante"
    );

  const [
    servicos,
    setServicos,
  ] =
    useState<Servico[]>(
      []
    );

  const [
    horas,
    setHoras,
  ] =
    useState<Hora[]>(
      []
    );

  const [
    recibos,
    setRecibos,
  ] =
    useState<Recibo[]>(
      []
    );

  const [
    valorHora,
    setValorHora,
  ] =
    useState(0);

  const [
    carregando,
    setCarregando,
  ] =
    useState(true);

  const [
    erro,
    setErro,
  ] =
    useState("");

  const [
    assinando,
    setAssinando,
  ] =
    useState<
      string | null
    >(null);

  async function carregar() {
    setCarregando(true);
    setErro("");

    const [
      servicosResponse,
      horasResponse,
      recibosResponse,
    ] =
      await Promise.all([
        fetch(
          "/api/colaborador/servicos",
          {
            cache:
              "no-store",
          }
        ),

        fetch(
          "/api/colaborador/horas",
          {
            cache:
              "no-store",
          }
        ),

        fetch(
          "/api/colaborador/recibos",
          {
            cache:
              "no-store",
          }
        ),
      ]);

    if (
      servicosResponse.status ===
        401 ||
      servicosResponse.status ===
        403
    ) {
      router.replace(
        "/login"
      );

      return;
    }

    const servicosData =
      await servicosResponse.json();

    const horasData =
      await horasResponse.json();

    const recibosData =
      await recibosResponse.json();

    if (
      !servicosResponse.ok
    ) {
      setErro(
        servicosData.error ||
          "Não foi possível carregar os serviços."
      );
    } else {
      setNome(
        servicosData
          .funcionario
          ?.nome ||
          "Ajudante"
      );

      setServicos(
        servicosData.servicos ||
          []
      );
    }

    if (
      horasResponse.ok
    ) {
      setHoras(
        horasData.horas ||
          []
      );

      setValorHora(
        Number(
          horasData.config
            ?.valor_hora ||
            0
        )
      );
    }

    if (
      recibosResponse.ok
    ) {
      setRecibos(
        recibosData.recibos ||
          []
      );
    }

    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  const jornadaAberta =
    horas.find(
      (hora) =>
        hora.status ===
        "Aberta"
    );

  const recibosPendentes =
    recibos.filter(
      (recibo) =>
        recibo.status ===
        "Pendente de assinatura"
    );

  const totalFechado =
    horas
      .filter(
        (hora) =>
          hora.status ===
          "Fechada"
      )
      .reduce(
        (
          total,
          hora
        ) =>
          total +
          Number(
            hora.valor_total ||
              0
          ),
        0
      );

  const hoje =
    new Date()
      .toISOString()
      .slice(0, 10);

  const servicosHoje =
    useMemo(
      () =>
        servicos.filter(
          (servico) =>
            servico.data ===
            hoje
        ),
      [
        servicos,
        hoje,
      ]
    );

  async function iniciarHoras(
    agendaId?: string
  ) {
    const response =
      await fetch(
        "/api/colaborador/horas",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            agenda_id:
              agendaId ||
              null,
          }),
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      alert(
        data.error ||
          "Não foi possível iniciar."
      );

      return;
    }

    await carregar();
  }

  async function finalizarHoras() {
    if (
      !jornadaAberta
    ) {
      return;
    }

    const response =
      await fetch(
        "/api/colaborador/horas",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            id:
              jornadaAberta.id,
          }),
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      alert(
        data.error ||
          "Não foi possível finalizar."
      );

      return;
    }

    await carregar();
  }

  function iniciarAssinatura(
    id: string
  ) {
    setAssinando(id);

    requestAnimationFrame(
      () => {
        limparAssinatura();
      }
    );
  }

  function ponto(
    event: React.PointerEvent<HTMLCanvasElement>
  ) {
    const canvas =
      canvasRef.current;

    if (!canvas) {
      return null;
    }

    const rect =
      canvas.getBoundingClientRect();

    return {
      x:
        event.clientX -
        rect.left,

      y:
        event.clientY -
        rect.top,
    };
  }

  function iniciarDesenho(
    event: React.PointerEvent<HTMLCanvasElement>
  ) {
    const pontoAtual =
      ponto(event);

    if (!pontoAtual) {
      return;
    }

    drawing.current =
      true;

    const context =
      canvasRef.current?.getContext(
        "2d"
      );

    if (!context) {
      return;
    }

    context.beginPath();

    context.moveTo(
      pontoAtual.x,
      pontoAtual.y
    );
  }

  function desenhar(
    event: React.PointerEvent<HTMLCanvasElement>
  ) {
    if (
      !drawing.current
    ) {
      return;
    }

    const pontoAtual =
      ponto(event);

    if (!pontoAtual) {
      return;
    }

    const context =
      canvasRef.current?.getContext(
        "2d"
      );

    if (!context) {
      return;
    }

    context.lineWidth = 2;
    context.lineCap =
      "round";
    context.strokeStyle =
      "#111827";

    context.lineTo(
      pontoAtual.x,
      pontoAtual.y
    );

    context.stroke();
  }

  function terminarDesenho() {
    drawing.current =
      false;
  }

  function limparAssinatura() {
    const canvas =
      canvasRef.current;

    if (!canvas) {
      return;
    }

    const context =
      canvas.getContext(
        "2d"
      );

    if (!context) {
      return;
    }

    context.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );
  }

  async function confirmarAssinatura() {
    if (
      !assinando ||
      !canvasRef.current
    ) {
      return;
    }

    const imagem =
      canvasRef.current.toDataURL(
        "image/png"
      );

    if (
      imagem.length <
      5000
    ) {
      alert(
        "Faça sua assinatura no quadro."
      );

      return;
    }

    const response =
      await fetch(
        "/api/colaborador/recibos",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            id: assinando,

            assinatura_imagem:
              imagem,

            assinatura_nome:
              nome,
          }),
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      alert(
        data.error ||
          "Não foi possível assinar."
      );

      return;
    }

    setAssinando(null);

    await carregar();
  }

  async function sair() {
    await supabase.auth.signOut();

    router.replace(
      "/login"
    );
  }

  if (carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <RefreshCw className="animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white sm:p-6">
      <div className="mx-auto max-w-6xl space-y-6">

        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <p className="text-sm text-slate-400">
              Área do ajudante
            </p>

            <h1 className="text-2xl font-bold">
              Olá, {nome} 👋
            </h1>

            <p className="text-slate-400">
              Aqui aparecem somente os serviços atribuídos a você.
            </p>
          </div>

          <button
            onClick={sair}
            className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-3"
          >
            <LogOut size={18} />
            Sair
          </button>

        </header>

        {erro && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
            {erro}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs text-slate-400">
              Serviços hoje
            </p>

            <p className="text-2xl font-bold">
              {servicosHoje.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs text-slate-400">
              Valor/hora
            </p>

            <p className="text-2xl font-bold">
              {dinheiro(
                valorHora
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs text-slate-400">
              Horas fechadas
            </p>

            <p className="text-2xl font-bold">
              {
                horas.filter(
                  (hora) =>
                    hora.status ===
                    "Fechada"
                ).length
              }
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs text-slate-400">
              Recibos pendentes
            </p>

            <p className="text-2xl font-bold">
              {
                recibosPendentes.length
              }
            </p>
          </div>

        </div>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">
              Meus serviços
            </h2>

            <button
              onClick={carregar}
              className="rounded-lg border border-slate-700 p-2"
            >
              <RefreshCw size={17} />
            </button>
          </div>

          <div className="mt-4 space-y-3">

            {servicos.length ===
            0 ? (
              <p className="text-slate-400">
                Nenhum serviço atribuído.
              </p>
            ) : (
              servicos.map(
                (servico) => (
                  <div
                    key={
                      servico.id
                    }
                    className="rounded-xl border border-slate-800 bg-slate-950 p-4"
                  >

                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                      <div className="space-y-2">

                        <div className="flex flex-wrap gap-2">

                          <span className="font-semibold">
                            {servico.horario?.slice(
                              0,
                              5
                            )}{" "}
                            —{" "}
                            {
                              servico.cliente_nome
                            }
                          </span>

                          <span className="rounded-full bg-slate-800 px-2 py-1 text-xs">
                            {
                              servico.status
                            }
                          </span>

                        </div>

                        <p className="text-sm text-slate-300">
                          {
                            servico.servico
                          }
                        </p>

                        <div className="flex flex-wrap gap-4 text-sm text-slate-400">

                          <span>
                            {
                              dataBR(
                                servico.data
                              )
                            }
                          </span>

                          <span>
                            {
                              servico.cidade
                            }
                          </span>

                          <span className="flex items-center gap-1">
                            <UserRound
                              size={14}
                            />

                            Técnico:{" "}
                            {
                              servico.tecnico ||
                                "Não informado"
                            }
                          </span>

                        </div>

                      </div>

                      {!jornadaAberta &&
                        servico.status !==
                          "Cancelado" &&
                        servico.status !==
                          "Concluído" && (
                          <button
                            onClick={() =>
                              iniciarHoras(
                                servico.id
                              )
                            }
                            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold"
                          >
                            <PlayCircle
                              size={18}
                            />

                            Iniciar horas
                          </button>
                        )}

                    </div>

                  </div>
                )
              )
            )}

          </div>

        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <h2 className="text-lg font-bold">
                Controle de horas
              </h2>

              <p className="text-sm text-slate-400">
                Seu valor é definido pelo administrador.
              </p>
            </div>

            {jornadaAberta ? (
              <button
                onClick={
                  finalizarHoras
                }
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-semibold"
              >
                <StopCircle
                  size={18}
                />

                Finalizar jornada
              </button>
            ) : (
              <span className="text-sm text-slate-400">
                Nenhuma jornada aberta
              </span>
            )}

          </div>

          <div className="mt-4 overflow-x-auto">

            <table className="w-full text-sm">

              <thead>
                <tr className="border-b border-slate-800 text-left text-slate-400">
                  <th className="p-3">
                    Início
                  </th>

                  <th className="p-3">
                    Fim
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
                      key={
                        hora.id
                      }
                      className="border-b border-slate-800"
                    >

                      <td className="p-3">
                        {new Date(
                          hora.inicio
                        ).toLocaleString(
                          "pt-BR"
                        )}
                      </td>

                      <td className="p-3">
                        {hora.fim
                          ? new Date(
                              hora.fim
                            ).toLocaleString(
                              "pt-BR"
                            )
                          : "Em andamento"}
                      </td>

                      <td className="p-3">
                        {hora.minutos !=
                        null
                          ? duracao(
                              hora.minutos
                            )
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

          <p className="mt-4 text-sm text-slate-400">
            Horas fechadas aguardando pagamento:{" "}
            <strong className="text-white">
              {dinheiro(
                totalFechado
              )}
            </strong>
          </p>

        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

          <h2 className="flex items-center gap-2 text-lg font-bold">
            <ReceiptText
              size={20}
            />

            Meus recibos
          </h2>

          <div className="mt-4 space-y-3">

            {recibos.length ===
            0 ? (
              <p className="text-slate-400">
                Nenhum recibo registrado.
              </p>
            ) : (
              recibos.map(
                (recibo) => (
                  <div
                    key={
                      recibo.id
                    }
                    className="rounded-xl border border-slate-800 bg-slate-950 p-4"
                  >

                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

                      <div>
                        <p className="font-semibold">
                          {
                            dataBR(
                              recibo.periodo_inicio
                            )
                          }{" "}
                          a{" "}
                          {
                            dataBR(
                              recibo.periodo_fim
                            )
                          }
                        </p>

                        <p className="text-sm text-slate-400">
                          {Number(
                            recibo.horas
                          ).toFixed(
                            2
                          )}{" "}
                          h ×{" "}
                          {dinheiro(
                            recibo.valor_hora
                          )}{" "}
                          ={" "}
                          <strong className="text-white">
                            {dinheiro(
                              recibo.valor_total
                            )}
                          </strong>
                        </p>

                        <p className="text-xs text-slate-500">
                          {
                            recibo.forma_pagamento
                          }{" "}
                          ·{" "}
                          {
                            recibo.status
                          }
                        </p>
                      </div>

                      {recibo.status ===
                      "Pendente de assinatura" ? (
                        <button
                          onClick={() =>
                            iniciarAssinatura(
                              recibo.id
                            )
                          }
                          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold"
                        >
                          <CheckCircle2
                            size={18}
                          />

                          Assinar recibo
                        </button>
                      ) : (
                        <span className="text-sm text-emerald-400">
                          Assinado por{" "}
                          {
                            recibo.assinatura_nome ||
                              nome
                          }
                        </span>
                      )}

                    </div>

                  </div>
                )
              )
            )}

          </div>

        </section>

        {assinando && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">

            <div className="w-full max-w-xl rounded-2xl bg-white p-5 text-slate-900">

              <h2 className="text-xl font-bold">
                Assinatura do recibo
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Assine com o dedo no quadro abaixo.
              </p>

              <canvas
                ref={
                  canvasRef
                }
                width={900}
                height={320}
                className="mt-4 h-48 w-full touch-none rounded-xl border border-slate-300 bg-white"
                onPointerDown={
                  iniciarDesenho
                }
                onPointerMove={
                  desenhar
                }
                onPointerUp={
                  terminarDesenho
                }
                onPointerLeave={
                  terminarDesenho
                }
              />

              <div className="mt-4 flex flex-wrap justify-end gap-2">

                <button
                  onClick={
                    limparAssinatura
                  }
                  className="rounded-xl border px-4 py-3"
                >
                  Limpar
                </button>

                <button
                  onClick={() =>
                    setAssinando(
                      null
                    )
                  }
                  className="rounded-xl border px-4 py-3"
                >
                  Cancelar
                </button>

                <button
                  onClick={
                    confirmarAssinatura
                  }
                  className="rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white"
                >
                  Confirmar assinatura
                </button>

              </div>

            </div>

          </div>
        )}

      </div>
    </main>
  );
}
