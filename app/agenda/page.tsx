"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Plus,
  User,
  Wrench,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type AppointmentStatus =
  | "Agendado"
  | "Confirmado"
  | "Em atendimento"
  | "Concluído"
  | "Cancelado";

type Appointment = {
  id: string;
  cliente_id: string | null;
  cliente_nome: string;
  cidade: string;
  servico: string;
  tecnico: string;
  data: string;
  horario: string;
  status: AppointmentStatus;
};

type Client = {
  id: string;
  nome: string;
  cidade: string | null;
};

const statusStyles: Record<AppointmentStatus, string> = {
  Agendado: "bg-blue-50 text-blue-700",
  Confirmado: "bg-emerald-50 text-emerald-700",
  "Em atendimento": "bg-amber-50 text-amber-700",
  Concluído: "bg-slate-100 text-slate-600",
  Cancelado: "bg-red-50 text-red-700",
};

function getToday() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(
    "pt-BR",
    {
      weekday: "long",
      day: "2-digit",
      month: "long",
    }
  );
}

export default function AgendaPage() {
  const supabase = createClient();

  const today = getToday();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  const [selectedDate, setSelectedDate] = useState(today);

  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [clientId, setClientId] = useState("");
  const [clientName, setClientName] = useState("");
  const [city, setCity] = useState("");
  const [service, setService] = useState("");
  const [technician, setTechnician] = useState("");
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("08:00");

  const selectedAppointments = useMemo(
    () =>
      appointments
        .filter(
          (appointment) =>
            appointment.data === selectedDate
        )
        .sort((a, b) =>
          a.horario.localeCompare(b.horario)
        ),
    [appointments, selectedDate]
  );

  const visibleDates = useMemo(() => {
    const base = new Date(`${selectedDate}T12:00:00`);

    return Array.from({ length: 7 }, (_, index) => {
      const dateItem = new Date(base);

      dateItem.setDate(
        base.getDate() - 3 + index
      );

      return dateItem.toISOString().split("T")[0];
    });
  }, [selectedDate]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const [agendaResult, clientsResult] =
      await Promise.all([
        supabase
          .from("agenda")
          .select("*")
          .order("data", { ascending: true })
          .order("horario", { ascending: true }),

        supabase
          .from("clientes")
          .select("id, nome, cidade")
          .eq("status", "Ativo")
          .order("nome", { ascending: true }),
      ]);

    if (agendaResult.error) {
      console.error(
        "Erro ao carregar agenda:",
        agendaResult.error
      );
    } else {
      setAppointments(
        (agendaResult.data || []) as Appointment[]
      );
    }

    if (clientsResult.error) {
      console.error(
        "Erro ao carregar clientes:",
        clientsResult.error
      );
    } else {
      setClients(
        (clientsResult.data || []) as Client[]
      );
    }

    setLoading(false);
  }

  function moveDay(days: number) {
    const dateItem = new Date(
      `${selectedDate}T12:00:00`
    );

    dateItem.setDate(
      dateItem.getDate() + days
    );

    setSelectedDate(
      dateItem.toISOString().split("T")[0]
    );
  }

  function handleClientChange(id: string) {
    setClientId(id);

    const selectedClient = clients.find(
      (client) => client.id === id
    );

    if (selectedClient) {
      setClientName(selectedClient.nome);
      setCity(selectedClient.cidade || "");
    } else {
      setClientName("");
      setCity("");
    }
  }

  async function addAppointment(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !clientId ||
      !service.trim() ||
      !technician.trim() ||
      !date ||
      !time
    ) {
      alert(
        "Preencha todos os campos obrigatórios."
      );
      return;
    }

    const selectedClient = clients.find(
      (client) => client.id === clientId
    );

    if (!selectedClient) {
      alert("Selecione um cliente.");
      return;
    }

    setSaving(true);

    const insertResult = await supabase
      .from("agenda")
      .insert({
        cliente_id: selectedClient.id,
        cliente_nome: selectedClient.nome,
        cidade:
          city ||
          selectedClient.cidade ||
          "",
        servico: service.trim(),
        tecnico: technician.trim(),
        data,
        horario: time,
        status: "Agendado",
      })
      .select()
      .single();

    const insertedAppointment =
      insertResult.data;

    const insertError =
      insertResult.error;

    if (insertError) {
      console.error(insertError);

      alert(
        "Não foi possível salvar o atendimento."
      );

      setSaving(false);
      return;
    }

    if (!insertedAppointment) {
      alert(
        "O atendimento foi enviado, mas não retornou os dados."
      );

      setSaving(false);
      return;
    }

    setAppointments((current) => [
      ...current,
      insertedAppointment as Appointment,
    ]);

    setSelectedDate(date);

    setClientId("");
    setClientName("");
    setCity("");
    setService("");
    setTechnician("");
    setDate(today);
    setTime("08:00");

    setShowForm(false);
    setSaving(false);
  }

  async function changeStatus(
    id: string,
    status: AppointmentStatus
  ) {
    const { error } = await supabase
      .from("agenda")
      .update({ status })
      .eq("id", id);

    if (error) {
      console.error(error);

      alert(
        "Não foi possível atualizar o status."
      );

      return;
    }

    setAppointments((current) =>
      current.map((appointment) =>
        appointment.id === id
          ? {
              ...appointment,
              status,
            }
          : appointment
      )
    );
  }

  async function deleteAppointment(
    id: string
  ) {
    const confirmed = window.confirm(
      "Deseja realmente excluir este atendimento?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("agenda")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(error);

      alert(
        "Não foi possível excluir o atendimento."
      );

      return;
    }

    setAppointments((current) =>
      current.filter(
        (appointment) =>
          appointment.id !== id
      )
    );
  }

  function openNewAppointment() {
    setClientId("");
    setClientName("");
    setCity("");
    setService("");
    setTechnician("");
    setDate(selectedDate);
    setTime("08:00");
    setShowForm(true);
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-cyan-500 p-3 text-white">
              <CalendarDays size={22} />
            </div>

            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Agenda
              </h1>

              <p className="text-sm text-slate-500">
                Organize os atendimentos da equipe
              </p>
            </div>
          </div>

          <button
            onClick={openNewAppointment}
            className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-cyan-600"
          >
            <Plus size={18} />

            <span className="hidden sm:inline">
              Novo atendimento
            </span>

            <span className="sm:hidden">
              Novo
            </span>
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-cyan-600">
                Agenda de atendimentos
              </p>

              <h2 className="mt-1 text-xl font-bold capitalize text-slate-900">
                {formatDate(selectedDate)}
              </h2>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => moveDay(-1)}
                className="rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50"
              >
                <ChevronLeft size={19} />
              </button>

              <button
                onClick={() => moveDay(1)}
                className="rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50"
              >
                <ChevronRight size={19} />
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-7 gap-2 overflow-x-auto">
            {visibleDates.map((dateItem) => {
              const dateObject = new Date(
                `${dateItem}T12:00:00`
              );

              const weekday =
                dateObject.toLocaleDateString(
                  "pt-BR",
                  {
                    weekday: "short",
                  }
                );

              const day =
                dateObject.getDate();

              const count =
                appointments.filter(
                  (appointment) =>
                    appointment.data ===
                    dateItem
                ).length;

              const selected =
                dateItem === selectedDate;

              return (
                <button
                  key={dateItem}
                  onClick={() =>
                    setSelectedDate(dateItem)
                  }
                  className={`min-w-[58px] rounded-xl p-3 text-center transition ${
                    selected
                      ? "bg-cyan-500 text-white shadow-md"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <p className="text-[11px] capitalize">
                    {weekday.replace(".", "")}
                  </p>

                  <p className="mt-1 text-lg font-bold">
                    {day}
                  </p>

                  <p
                    className={`mt-1 text-[10px] ${
                      selected
                        ? "text-cyan-100"
                        : "text-slate-400"
                    }`}
                  >
                    {count} atendimento
                    {count !== 1
                      ? "s"
                      : ""}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">
                    Atendimentos do dia
                  </h3>

                  <p className="mt-1 text-xs text-slate-400">
                    {
                      selectedAppointments.length
                    }{" "}
                    atendimento
                    {selectedAppointments.length !==
                    1
                      ? "s"
                      : ""}{" "}
                    agendado
                    {selectedAppointments.length !==
                    1
                      ? "s"
                      : ""}
                  </p>
                </div>

                <CalendarDays
                  size={20}
                  className="text-cyan-500"
                />
              </div>
            </div>

            {loading ? (
              <div className="p-10 text-center text-sm text-slate-400">
                Carregando agenda...
              </div>
            ) : selectedAppointments.length ===
              0 ? (
              <div className="p-10 text-center">
                <CalendarDays
                  size={36}
                  className="mx-auto text-slate-300"
                />

                <p className="mt-3 font-medium text-slate-700">
                  Agenda livre
                </p>

                <p className="mt-1 text-sm text-slate-400">
                  Não existem atendimentos
                  para este dia.
                </p>

                <button
                  onClick={
                    openNewAppointment
                  }
                  className="mt-5 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Agendar atendimento
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {selectedAppointments.map(
                  (appointment) => (
                    <div
                      key={appointment.id}
                      className="p-5"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex gap-4">
                          <div className="flex h-12 w-20 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
                            <div className="text-center">
                              <Clock
                                size={16}
                                className="mx-auto"
                              />

                              <span className="mt-1 block text-sm font-bold">
                                {appointment.horario.slice(
                                  0,
                                  5
                                )}
                              </span>
                            </div>
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-bold text-slate-900">
                                {
                                  appointment.cliente_nome
                                }
                              </h4>

                              <span
                                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                  statusStyles[
                                    appointment
                                      .status
                                  ]
                                }`}
                              >
                                {
                                  appointment.status
                                }
                              </span>
                            </div>

                            <div className="mt-2 space-y-1.5 text-sm text-slate-500">
                              <div className="flex items-center gap-2">
                                <Wrench
                                  size={15}
                                />
                                {
                                  appointment.servico
                                }
                              </div>

                              <div className="flex items-center gap-2">
                                <MapPin
                                  size={15}
                                />
                                {
                                  appointment.cidade
                                }
                              </div>

                              <div className="flex items-center gap-2">
                                <User
                                  size={15}
                                />
                                {
                                  appointment.tecnico
                                }
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 sm:justify-end">
                          {appointment.status ===
                            "Agendado" && (
                            <button
                              onClick={() =>
                                changeStatus(
                                  appointment.id,
                                  "Confirmado"
                                )
                              }
                              className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-white"
                            >
                              Confirmar
                            </button>
                          )}

                          {appointment.status ===
                            "Confirmado" && (
                            <button
                              onClick={() =>
                                changeStatus(
                                  appointment.id,
                                  "Em atendimento"
                                )
                              }
                              className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-semibold text-white"
                            >
                              Iniciar
                            </button>
                          )}

                          {appointment.status ===
                            "Em atendimento" && (
                            <button
                              onClick={() =>
                                changeStatus(
                                  appointment.id,
                                  "Concluído"
                                )
                              }
                              className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-white"
                            >
                              Concluir
                            </button>
                          )}

                          {appointment.status !==
                            "Concluído" &&
                            appointment.status !==
                              "Cancelado" && (
                              <button
                                onClick={() =>
                                  changeStatus(
                                    appointment.id,
                                    "Cancelado"
                                  )
                                }
                                className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600"
                              >
                                Cancelar
                              </button>
                            )}

                          <button
                            onClick={() =>
                              deleteAppointment(
                                appointment.id
                              )
                            }
                            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500"
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-bold text-slate-900">
              Resumo da agenda
            </h3>

            <div className="mt-5 space-y-3">
              <div className="rounded-xl bg-blue-50 p-4">
                <p className="text-xs text-blue-600">
                  Agendados
                </p>

                <p className="mt-1 text-2xl font-bold text-blue-700">
                  {
                    appointments.filter(
                      (item) =>
                        item.status ===
                        "Agendado"
                    ).length
                  }
                </p>
              </div>

              <div className="rounded-xl bg-emerald-50 p-4">
                <p className="text-xs text-emerald-600">
                  Confirmados
                </p>

                <p className="mt-1 text-2xl font-bold text-emerald-700">
                  {
                    appointments.filter(
                      (item) =>
                        item.status ===
                        "Confirmado"
                    ).length
                  }
                </p>
              </div>

              <div className="rounded-xl bg-amber-50 p-4">
                <p className="text-xs text-amber-600">
                  Em atendimento
                </p>

                <p className="mt-1 text-2xl font-bold text-amber-700">
                  {
                    appointments.filter(
                      (item) =>
                        item.status ===
                        "Em atendimento"
                    ).length
                  }
                </p>
              </div>

              <div className="rounded-xl bg-slate-100 p-4">
                <p className="text-xs text-slate-500">
                  Concluídos
                </p>

                <p className="mt-1 text-2xl font-bold text-slate-700">
                  {
                    appointments.filter(
                      (item) =>
                        item.status ===
                        "Concluído"
                    ).length
                  }
                </p>
              </div>
            </div>
          </aside>
        </section>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4">
          <div className="max-h-[95vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-2xl">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Novo atendimento
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Agende um atendimento para sua equipe.
                </p>
              </div>

              <button
                onClick={() =>
                  setShowForm(false)
                }
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={addAppointment}
              className="space-y-4"
            >
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Cliente
                </label>

                <select
                  value={clientId}
                  onChange={(event) =>
                    handleClientChange(
                      event.target.value
                    )
                  }
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                >
                  <option value="">
                    Selecione um cliente
                  </option>

                  {clients.map((client) => (
                    <option
                      key={client.id}
                      value={client.id}
                    >
                      {client.nome}
                    </option>
                  ))}
                </select>

                {clients.length === 0 && (
                  <p className="mt-2 text-xs text-amber-600">
                    Nenhum cliente ativo
                    encontrado.
                  </p>
                )}
              </div>

              {clientName && (
                <div className="rounded-xl bg-slate-50 p-3 text-sm">
                  <p className="text-xs text-slate-400">
                    Cliente selecionado
                  </p>

                  <p className="font-semibold text-slate-700">
                    {clientName}
                  </p>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Cidade
                </label>

                <input
                  value={city}
                  onChange={(event) =>
                    setCity(
                      event.target.value
                    )
                  }
                  placeholder="Cidade do atendimento"
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Serviço
                </label>

                <input
                  value={service}
                  onChange={(event) =>
                    setService(
                      event.target.value
                    )
                  }
                  placeholder="Ex.: Manutenção preventiva"
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Técnico
                </label>

                <input
                  value={technician}
                  onChange={(event) =>
                    setTechnician(
                      event.target.value
                    )
                  }
                  placeholder="Nome do técnico"
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Data
                  </label>

                  <input
                    type="date"
                    value={date}
                    onChange={(event) =>
                      setDate(
                        event.target.value
                      )
                    }
                    required
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Horário
                  </label>

                  <input
                    type="time"
                    value={time}
                    onChange={(event) =>
                      setTime(
                        event.target.value
                      )
                    }
                    required
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() =>
                    setShowForm(false)
                  }
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Salvando..."
                    : "Agendar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
