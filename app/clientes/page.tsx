"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Edit3,
  MapPin,
  Phone,
  Plus,
  Search,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type ClientType = "Residencial" | "Comercial" | "Empresarial";
type ClientStatus = "Ativo" | "Inativo";

type Client = {
  id: string;
  name: string;
  type: ClientType;
  document: string;
  phone: string;
  whatsapp: string;
  email: string;
  city: string;
  neighborhood: string;
  address: string;
  number: string;
  complement: string;
  zipCode: string;
  status: ClientStatus;
  notes: string;
  createdAt: string;
};

type ClientForm = {
  name: string;
  type: ClientType;
  document: string;
  phone: string;
  whatsapp: string;
  email: string;
  city: string;
  neighborhood: string;
  address: string;
  number: string;
  complement: string;
  zipCode: string;
  notes: string;
};

const emptyForm: ClientForm = {
  name: "",
  type: "Residencial",
  document: "",
  phone: "",
  whatsapp: "",
  email: "",
  city: "",
  neighborhood: "",
  address: "",
  number: "",
  complement: "",
  zipCode: "",
  notes: "",
};

const supabase = createClient();

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] =
    useState<"Todos" | ClientType>("Todos");
  const [statusFilter, setStatusFilter] =
    useState<"Todos" | ClientStatus>("Todos");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] =
    useState<Client | null>(null);

  const [form, setForm] = useState<ClientForm>(emptyForm);

  async function loadClients() {
    setLoading(true);

    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      alert("Erro ao carregar clientes.");
      setLoading(false);
      return;
    }

    const result: Client[] = (data || []).map((item) => ({
      id: item.id,
      name: item.nome,
      type: item.tipo,
      document: item.documento || "",
      phone: item.telefone || "",
      whatsapp: item.whatsapp || "",
      email: item.email || "",
      city: item.cidade || "",
      neighborhood: item.bairro || "",
      address: item.endereco || "",
      number: item.numero || "",
      complement: item.complemento || "",
      zipCode: item.cep || "",
      status: item.status,
      notes: item.observacoes || "",
      createdAt: item.created_at,
    }));

    setClients(result);
    setLoading(false);
  }

  useEffect(() => {
    loadClients();
  }, []);

  const filteredClients = useMemo(() => {
    const term = search.toLowerCase().trim();

    return clients.filter((client) => {
      const searchMatch =
        !term ||
        client.name.toLowerCase().includes(term) ||
        client.document.toLowerCase().includes(term) ||
        client.phone.toLowerCase().includes(term) ||
        client.whatsapp.toLowerCase().includes(term) ||
        client.email.toLowerCase().includes(term) ||
        client.city.toLowerCase().includes(term);

      const typeMatch =
        typeFilter === "Todos" ||
        client.type === typeFilter;

      const statusMatch =
        statusFilter === "Todos" ||
        client.status === statusFilter;

      return searchMatch && typeMatch && statusMatch;
    });
  }, [clients, search, typeFilter, statusFilter]);

  const activeClients = clients.filter(
    (item) => item.status === "Ativo"
  ).length;

  const residentialClients = clients.filter(
    (item) => item.type === "Residencial"
  ).length;

  const commercialClients = clients.filter(
    (item) => item.type === "Comercial"
  ).length;

  const businessClients = clients.filter(
    (item) => item.type === "Empresarial"
  ).length;

  function updateForm(
    field: keyof ClientForm,
    value: string
  ) {
    setForm((old) => ({
      ...old,
      [field]: value,
    }));
  }

  function newClient() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function editClient(client: Client) {
    setEditingId(client.id);

    setForm({
      name: client.name,
      type: client.type,
      document: client.document,
      phone: client.phone,
      whatsapp: client.whatsapp,
      email: client.email,
      city: client.city,
      neighborhood: client.neighborhood,
      address: client.address,
      number: client.number,
      complement: client.complement,
      zipCode: client.zipCode,
      notes: client.notes,
    });

    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function saveClient() {
    if (!form.name.trim()) {
      alert("Informe o nome do cliente.");
      return;
    }

    if (!form.phone.trim()) {
      alert("Informe o telefone.");
      return;
    }

    if (!form.city.trim()) {
      alert("Informe a cidade.");
      return;
    }

    setSaving(true);

    const payload = {
      nome: form.name.trim(),
      tipo: form.type,
      documento: form.document.trim() || null,
      telefone: form.phone.trim(),
      whatsapp: form.whatsapp.trim() || null,
      email: form.email.trim() || null,
      cidade: form.city.trim(),
      bairro: form.neighborhood.trim() || null,
      endereco: form.address.trim() || null,
      numero: form.number.trim() || null,
      complemento: form.complement.trim() || null,
      cep: form.zipCode.trim() || null,
      observacoes: form.notes.trim() || null,
    };

    if (editingId) {
      const { error } = await supabase
        .from("clientes")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        console.error(error);
        alert("Erro ao atualizar cliente.");
        setSaving(false);
        return;
      }

      alert("Cliente atualizado com sucesso.");
    } else {
      const { error } = await supabase
        .from("clientes")
        .insert({
          ...payload,
          status: "Ativo",
        });

      if (error) {
        console.error(error);
        alert("Erro ao cadastrar cliente.");
        setSaving(false);
        return;
      }

      alert("Cliente cadastrado com sucesso.");
    }

    setSaving(false);
    closeForm();
    await loadClients();
  }

  async function toggleStatus(client: Client) {
    const newStatus =
      client.status === "Ativo"
        ? "Inativo"
        : "Ativo";

    const { error } = await supabase
      .from("clientes")
      .update({
        status: newStatus,
      })
      .eq("id", client.id);

    if (error) {
      console.error(error);
      alert("Erro ao alterar status.");
      return;
    }

    await loadClients();

    if (selectedClient?.id === client.id) {
      setSelectedClient({
        ...client,
        status: newStatus,
      });
    }
  }

  async function deleteClient(client: Client) {
    const confirmed = window.confirm(
      `Deseja realmente excluir "${client.name}"?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("clientes")
      .delete()
      .eq("id", client.id);

    if (error) {
      console.error(error);
      alert(
        "Não foi possível excluir o cliente."
      );
      return;
    }

    setSelectedClient(null);
    await loadClients();
    alert("Cliente excluído com sucesso.");
  }

  function openWhatsApp(client: Client) {
    const number = client.whatsapp
      .replace(/\D/g, "");

    if (!number) {
      alert(
        "Este cliente não possui WhatsApp cadastrado."
      );
      return;
    }

    window.open(
      `https://wa.me/55${number}`,
      "_blank"
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              Clientes
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Gerencie seus clientes e seus dados.
            </p>
          </div>

          <button
            onClick={newClient}
            className="flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-400"
          >
            <Plus className="h-5 w-5" />
            Novo cliente
          </button>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Total de clientes
            </p>
            <p className="mt-2 text-3xl font-bold">
              {clients.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Clientes ativos
            </p>
            <p className="mt-2 text-3xl font-bold text-emerald-400">
              {activeClients}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Residenciais
            </p>
            <p className="mt-2 text-3xl font-bold">
              {residentialClients}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Comerciais / Empresariais
            </p>
            <p className="mt-2 text-3xl font-bold">
              {commercialClients + businessClients}
            </p>
          </div>

        </div>

        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_200px_200px]">

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Pesquisar cliente..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-4 outline-none focus:border-cyan-500"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(
                  e.target.value as
                    | "Todos"
                    | ClientType
                )
              }
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
            >
              <option value="Todos">
                Todos os tipos
              </option>
              <option value="Residencial">
                Residencial
              </option>
              <option value="Comercial">
                Comercial
              </option>
              <option value="Empresarial">
                Empresarial
              </option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value as
                    | "Todos"
                    | ClientStatus
                )
              }
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
            >
              <option value="Todos">
                Todos os status
              </option>
              <option value="Ativo">
                Ativos
              </option>
              <option value="Inativo">
                Inativos
              </option>
            </select>

          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center text-slate-400">
            Carregando clientes...
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-12 text-center">
            <Users className="mx-auto h-12 w-12 text-slate-700" />

            <h2 className="mt-4 text-lg font-semibold">
              Nenhum cliente encontrado
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Cadastre seu primeiro cliente.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">

            <div className="border-b border-slate-800 px-5 py-4">
              <h2 className="font-semibold">
                Lista de clientes
              </h2>

              <p className="text-xs text-slate-500">
                {filteredClients.length} cliente(s)
              </p>
            </div>

            <div className="divide-y divide-slate-800">

              {filteredClients.map((client) => (
                <div
                  key={client.id}
                  className="p-4 hover:bg-slate-800/40"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                    <div className="flex items-start gap-4">

                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
                        {client.type ===
                        "Residencial" ? (
                          <User className="h-6 w-6" />
                        ) : (
                          <Building2 className="h-6 w-6" />
                        )}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">

                          <h3 className="font-semibold">
                            {client.name}
                          </h3>

                          <span
                            className={`rounded-full px-2 py-1 text-xs ${
                              client.status ===
                              "Ativo"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-red-500/10 text-red-400"
                            }`}
                          >
                            {client.status}
                          </span>

                          <span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-300">
                            {client.type}
                          </span>

                        </div>

                        <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-400">

                          <span className="flex items-center gap-1">
                            <Phone className="h-4 w-4" />
                            {client.phone}
                          </span>

                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {client.city}
                          </span>

                        </div>
                      </div>

                    </div>

                    <div className="flex flex-wrap gap-2">

                      <button
                        onClick={() =>
                          setSelectedClient(client)
                        }
                        className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
                      >
                        Ver detalhes
                      </button>

                      <button
                        onClick={() =>
                          openWhatsApp(client)
                        }
                        className="rounded-lg border border-emerald-500/30 px-3 py-2 text-sm text-emerald-400 hover:bg-emerald-500/10"
                      >
                        WhatsApp
                      </button>

                      <button
                        onClick={() =>
                          editClient(client)
                        }
                        className="flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
                      >
                        <Edit3 className="h-4 w-4" />
                        Editar
                      </button>

                      <button
                        onClick={() =>
                          deleteClient(client)
                        }
                        className="rounded-lg border border-red-500/20 p-2 text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>

                    </div>
                  </div>
                </div>
              ))}

            </div>
          </div>
        )}

      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">

          <div className="max-h-[95vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900">

            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-900 p-5">

              <div>
                <h2 className="text-xl font-bold">
                  {editingId
                    ? "Editar cliente"
                    : "Novo cliente"}
                </h2>

                <p className="text-sm text-slate-500">
                  Preencha os dados do cliente.
                </p>
              </div>

              <button
                onClick={closeForm}
                className="rounded-lg p-2 hover:bg-slate-800"
              >
                <X />
              </button>

            </div>

            <div className="space-y-6 p-5">

              <section>
                <h3 className="mb-3 font-semibold text-cyan-400">
                  Dados principais
                </h3>

                <div className="grid gap-3 md:grid-cols-2">

                  <input
                    value={form.name}
                    onChange={(e) =>
                      updateForm(
                        "name",
                        e.target.value
                      )
                    }
                    placeholder="Nome / Razão social *"
                    className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                  />

                  <select
                    value={form.type}
                    onChange={(e) =>
                      updateForm(
                        "type",
                        e.target.value
                      )
                    }
                    className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                  >
                    <option value="Residencial">
                      Residencial
                    </option>
                    <option value="Comercial">
                      Comercial
                    </option>
                    <option value="Empresarial">
                      Empresarial
                    </option>
                  </select>

                  <input
                    value={form.document}
                    onChange={(e) =>
                      updateForm(
                        "document",
                        e.target.value
                      )
                    }
                    placeholder="CPF / CNPJ"
                    className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                  />

                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      updateForm(
                        "email",
                        e.target.value
                      )
                    }
                    placeholder="E-mail"
                    className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                  />

                </div>
              </section>

              <section>
                <h3 className="mb-3 font-semibold text-cyan-400">
                  Contatos
                </h3>

                <div className="grid gap-3 md:grid-cols-2">

                  <input
                    value={form.phone}
                    onChange={(e) =>
                      updateForm(
                        "phone",
                        e.target.value
                      )
                    }
                    placeholder="Telefone *"
                    className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                  />

                  <input
                    value={form.whatsapp}
                    onChange={(e) =>
                      updateForm(
                        "whatsapp",
                        e.target.value
                      )
                    }
                    placeholder="WhatsApp"
                    className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                  />

                </div>
              </section>

              <section>
                <h3 className="mb-3 font-semibold text-cyan-400">
                  Endereço
                </h3>

                <div className="grid gap-3 md:grid-cols-3">

                  <input
                    value={form.zipCode}
                    onChange={(e) =>
                      updateForm(
                        "zipCode",
                        e.target.value
                      )
                    }
                    placeholder="CEP"
                    className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                  />

                  <input
                    value={form.city}
                    onChange={(e) =>
                      updateForm(
                        "city",
                        e.target.value
                      )
                    }
                    placeholder="Cidade *"
                    className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                  />

                  <input
                    value={form.neighborhood}
                    onChange={(e) =>
                      updateForm(
                        "neighborhood",
                        e.target.value
                      )
                    }
                    placeholder="Bairro"
                    className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                  />

                  <input
                    value={form.address}
                    onChange={(e) =>
                      updateForm(
                        "address",
                        e.target.value
                      )
                    }
                    placeholder="Rua / Avenida"
                    className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500 md:col-span-2"
                  />

                  <input
                    value={form.number}
                    onChange={(e) =>
                      updateForm(
                        "number",
                        e.target.value
                      )
                    }
                    placeholder="Número"
                    className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                  />

                  <input
                    value={form.complement}
                    onChange={(e) =>
                      updateForm(
                        "complement",
                        e.target.value
                      )
                    }
                    placeholder="Complemento"
                    className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500 md:col-span-3"
                  />

                </div>
              </section>

              <section>
                <h3 className="mb-3 font-semibold text-cyan-400">
                  Observações
                </h3>

                <textarea
                  value={form.notes}
                  onChange={(e) =>
                    updateForm(
                      "notes",
                      e.target.value
                    )
                  }
                  placeholder="Observações..."
                  rows={4}
                  className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                />

              </section>

            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-800 p-5 sm:flex-row sm:justify-end">

              <button
                onClick={closeForm}
                disabled={saving}
                className="rounded-xl border border-slate-700 px-5 py-3 hover:bg-slate-800"
              >
                Cancelar
              </button>

              <button
                onClick={saveClient}
                disabled={saving}
                className="rounded-xl bg-cyan-500 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
              >
                {saving
                  ? "Salvando..."
                  : editingId
                  ? "Salvar alterações"
                  : "Cadastrar cliente"}
              </button>

            </div>

          </div>
        </div>
      )}

      {selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">

          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900">

            <div className="flex items-center justify-between border-b border-slate-800 p-5">

              <div>
                <h2 className="text-xl font-bold">
                  {selectedClient.name}
                </h2>

                <p className="text-sm text-slate-500">
                  {selectedClient.type}
                </p>
              </div>

              <button
                onClick={() =>
                  setSelectedClient(null)
                }
                className="rounded-lg p-2 hover:bg-slate-800"
              >
                <X />
              </button>

            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-2">

              <div className="rounded-xl bg-slate-950 p-4">
                <p className="text-xs text-slate-500">
                  Status
                </p>
                <p className="mt-1 font-semibold">
                  {selectedClient.status}
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 p-4">
                <p className="text-xs text-slate-500">
                  CPF / CNPJ
                </p>
                <p className="mt-1 font-semibold">
                  {selectedClient.document ||
                    "Não informado"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 p-4">
                <p className="text-xs text-slate-500">
                  Telefone
                </p>
                <p className="mt-1 font-semibold">
                  {selectedClient.phone}
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 p-4">
                <p className="text-xs text-slate-500">
                  WhatsApp
                </p>
                <p className="mt-1 font-semibold">
                  {selectedClient.whatsapp ||
                    "Não informado"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 p-4 sm:col-span-2">
                <p className="text-xs text-slate-500">
                  E-mail
                </p>
                <p className="mt-1 break-all font-semibold">
                  {selectedClient.email ||
                    "Não informado"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 p-4 sm:col-span-2">
                <div className="mb-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-cyan-400" />
                  <p className="font-semibold">
                    Endereço
                  </p>
                </div>

                <p className="text-sm text-slate-300">
                  {selectedClient.address ||
                    "Não informado"}
                  {selectedClient.number
                    ? `, ${selectedClient.number}`
                    : ""}
                </p>

                <p className="mt-1 text-sm text-slate-400">
                  {selectedClient.neighborhood
                    ? `${selectedClient.neighborhood} - `
                    : ""}
                  {selectedClient.city}
                  {selectedClient.zipCode
                    ? ` - CEP ${selectedClient.zipCode}`
                    : ""}
                </p>
              </div>

              {selectedClient.notes && (
                <div className="rounded-xl bg-slate-950 p-4 sm:col-span-2">
                  <p className="text-xs text-slate-500">
                    Observações
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    {selectedClient.notes}
                  </p>
                </div>
              )}

            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-800 p-5">

              <button
                onClick={() =>
                  toggleStatus(selectedClient)
                }
                className="rounded-xl border border-slate-700 px-4 py-2 hover:bg-slate-800"
              >
                {selectedClient.status === "Ativo"
                  ? "Desativar"
                  : "Ativar"}
              </button>

              <button
                onClick={() => {
                  editClient(selectedClient);
                  setSelectedClient(null);
                }}
                className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 hover:bg-slate-800"
              >
                <Edit3 className="h-4 w-4" />
                Editar
              </button>

              <button
                onClick={() =>
                  deleteClient(selectedClient)
                }
                className="rounded-xl border border-red-500/20 px-4 py-2 text-red-400 hover:bg-red-500/10"
              >
                Excluir
              </button>

              <button
                onClick={() =>
                  setSelectedClient(null)
                }
                className="rounded-xl bg-cyan-500 px-5 py-2 font-semibold text-slate-950 hover:bg-cyan-400"
              >
                Fechar
              </button>

            </div>

          </div>
        </div>
      )}

    </main>
  );
}
