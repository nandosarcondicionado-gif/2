"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  Calendar,
  CheckCircle2,
  Edit3,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Trash2,
  User,
  UserCheck,
  UserX,
  Wallet,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type Funcionario = {
  id: string;
  nome: string;
  cpf: string;
  rg: string;
  telefone: string;
  whatsapp: string;
  email: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  cep: string;
  cargo: string;
  tipo_vinculo: string;
  data_nascimento: string | null;
  data_admissao: string | null;
  salario: number;
  forma_pagamento: string;
  chave_pix: string;
  status: "Ativo" | "Inativo";
  observacoes: string;
  created_at: string;
  updated_at: string;
};

type FuncionarioForm = {
  nome: string;
  cpf: string;
  rg: string;
  telefone: string;
  whatsapp: string;
  email: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  cep: string;
  cargo: string;
  tipo_vinculo: string;
  data_nascimento: string;
  data_admissao: string;
  salario: string;
  forma_pagamento: string;
  chave_pix: string;
  status: "Ativo" | "Inativo";
  observacoes: string;
};

const emptyForm: FuncionarioForm = {
  nome: "",
  cpf: "",
  rg: "",
  telefone: "",
  whatsapp: "",
  email: "",
  endereco: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  cep: "",
  cargo: "",
  tipo_vinculo: "Funcionário",
  data_nascimento: "",
  data_admissao: "",
  salario: "",
  forma_pagamento: "PIX",
  chave_pix: "",
  status: "Ativo",
  observacoes: "",
};

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
}

function dateBR(value: string | null) {
  if (!value) return "—";

  const parts = value.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  return value;
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function normalizeFuncionario(row: any): Funcionario {
  return {
    id: row.id,
    nome: row.nome ?? "",
    cpf: row.cpf ?? "",
    rg: row.rg ?? "",
    telefone: row.telefone ?? "",
    whatsapp: row.whatsapp ?? "",
    email: row.email ?? "",
    endereco: row.endereco ?? "",
    numero: row.numero ?? "",
    complemento: row.complemento ?? "",
    bairro: row.bairro ?? "",
    cidade: row.cidade ?? "",
    cep: row.cep ?? "",
    cargo: row.cargo ?? "",
    tipo_vinculo: row.tipo_vinculo ?? "Funcionário",
    data_nascimento: row.data_nascimento ?? null,
    data_admissao: row.data_admissao ?? null,
    salario: Number(row.salario ?? 0),
    forma_pagamento: row.forma_pagamento ?? "",
    chave_pix: row.chave_pix ?? "",
    status: row.status === "Inativo" ? "Inativo" : "Ativo",
    observacoes: row.observacoes ?? "",
    created_at: row.created_at ?? "",
    updated_at: row.updated_at ?? "",
  };
}

export default function FuncionariosPage() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "Todos" | "Ativo" | "Inativo"
  >("Todos");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedFuncionario, setSelectedFuncionario] =
    useState<Funcionario | null>(null);

  const [form, setForm] = useState<FuncionarioForm>(emptyForm);

  async function loadFuncionarios() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("funcionarios")
        .select("*")
        .order("nome", { ascending: true });

      if (error) {
        console.error("Erro ao carregar funcionários:", error);
        alert(`Não foi possível carregar os funcionários.\n\n${error.message}`);
        return;
      }

      setFuncionarios((data ?? []).map(normalizeFuncionario));
    } catch (error: any) {
      console.error("Erro inesperado ao carregar funcionários:", error);
      alert(
        `Erro inesperado ao carregar funcionários.\n\n${
          error?.message ?? "Erro desconhecido."
        }`
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFuncionarios();
  }, []);

  const filteredFuncionarios = useMemo(() => {
    const term = search.toLowerCase().trim();

    return funcionarios.filter((funcionario) => {
      const matchesSearch =
        !term ||
        funcionario.nome.toLowerCase().includes(term) ||
        funcionario.cpf.toLowerCase().includes(term) ||
        funcionario.telefone.toLowerCase().includes(term) ||
        funcionario.whatsapp.toLowerCase().includes(term) ||
        funcionario.email.toLowerCase().includes(term) ||
        funcionario.cargo.toLowerCase().includes(term) ||
        funcionario.cidade.toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "Todos" ||
        funcionario.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [funcionarios, search, statusFilter]);

  const ativos = funcionarios.filter(
    (funcionario) => funcionario.status === "Ativo"
  ).length;

  const inativos = funcionarios.filter(
    (funcionario) => funcionario.status === "Inativo"
  ).length;

  const folhaAtiva = funcionarios
    .filter((funcionario) => funcionario.status === "Ativo")
    .reduce((total, funcionario) => total + Number(funcionario.salario || 0), 0);

  function updateField<K extends keyof FuncionarioForm>(
    field: K,
    value: FuncionarioForm[K]
  ) {
    setForm((old) => ({
      ...old,
      [field]: value,
    }));
  }

  function openNew() {
    setEditingId(null);
    setSelectedFuncionario(null);
    setForm({ ...emptyForm });
    setShowForm(true);
  }

  function openEdit(funcionario: Funcionario) {
    setEditingId(funcionario.id);
    setSelectedFuncionario(null);

    setForm({
      nome: funcionario.nome,
      cpf: funcionario.cpf,
      rg: funcionario.rg,
      telefone: funcionario.telefone,
      whatsapp: funcionario.whatsapp,
      email: funcionario.email,
      endereco: funcionario.endereco,
      numero: funcionario.numero,
      complemento: funcionario.complemento,
      bairro: funcionario.bairro,
      cidade: funcionario.cidade,
      cep: funcionario.cep,
      cargo: funcionario.cargo,
      tipo_vinculo: funcionario.tipo_vinculo,
      data_nascimento: funcionario.data_nascimento ?? "",
      data_admissao: funcionario.data_admissao ?? "",
      salario:
        funcionario.salario > 0
          ? String(funcionario.salario)
          : "",
      forma_pagamento: funcionario.forma_pagamento || "PIX",
      chave_pix: funcionario.chave_pix,
      status: funcionario.status,
      observacoes: funcionario.observacoes,
    });

    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingId(null);
    setForm({ ...emptyForm });
  }

  async function saveFuncionario() {
    const nome = form.nome.trim();

    if (!nome) {
      alert("Digite o nome do funcionário.");
      return;
    }

    if (!form.cargo.trim()) {
      alert("Digite o cargo do funcionário.");
      return;
    }

    let salario = 0;

    if (form.salario.trim()) {
      const normalized = form.salario
        .replace(/\s/g, "")
        .replace(/\./g, "")
        .replace(",", ".");

      salario = Number(normalized);

      if (Number.isNaN(salario) || salario < 0) {
        alert("Digite um salário válido.");
        return;
      }
    }

    const funcionarioData = {
      nome,
      cpf: form.cpf.trim(),
      rg: form.rg.trim(),
      telefone: form.telefone.trim(),
      whatsapp: form.whatsapp.trim(),
      email: form.email.trim(),
      endereco: form.endereco.trim(),
      numero: form.numero.trim(),
      complemento: form.complemento.trim(),
      bairro: form.bairro.trim(),
      cidade: form.cidade.trim(),
      cep: form.cep.trim(),
      cargo: form.cargo.trim(),
      tipo_vinculo: form.tipo_vinculo.trim() || "Funcionário",
      data_nascimento: form.data_nascimento || null,
      data_admissao: form.data_admissao || null,
      salario,
      forma_pagamento: form.forma_pagamento.trim(),
      chave_pix: form.chave_pix.trim(),
      status: form.status,
      observacoes: form.observacoes.trim(),
      updated_at: new Date().toISOString(),
    };

    try {
      setSaving(true);

      if (editingId) {
        const { data, error } = await supabase
          .from("funcionarios")
          .update(funcionarioData)
          .eq("id", editingId)
          .select("*")
          .single();

        if (error) {
          console.error("Erro ao atualizar funcionário:", error);
          alert(
            `Não foi possível atualizar o funcionário.\n\n${error.message}`
          );
          return;
        }

        const updated = normalizeFuncionario(data);

        setFuncionarios((old) =>
          old.map((item) =>
            item.id === editingId ? updated : item
          )
        );

        setSelectedFuncionario(null);
        closeForm();

        alert("Funcionário atualizado com sucesso.");
        return;
      }

      const { data, error } = await supabase
        .from("funcionarios")
        .insert({
          ...funcionarioData,
          created_at: new Date().toISOString(),
        })
        .select("*")
        .single();

      if (error) {
        console.error("Erro ao cadastrar funcionário:", error);

        alert(
          `Não foi possível cadastrar o funcionário.\n\n${error.message}`
        );

        return;
      }

      if (!data) {
        alert(
          "O funcionário foi enviado, mas o Supabase não retornou o cadastro. Atualize a página para verificar."
        );

        await loadFuncionarios();
        closeForm();
        return;
      }

      const novoFuncionario = normalizeFuncionario(data);

      setFuncionarios((old) => [
        novoFuncionario,
        ...old,
      ]);

      closeForm();

      alert("Funcionário cadastrado com sucesso.");
    } catch (error: any) {
      console.error("Erro inesperado ao salvar funcionário:", error);

      alert(
        `Erro inesperado ao salvar funcionário.\n\n${
          error?.message ?? "Erro desconhecido."
        }`
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteFuncionario(funcionario: Funcionario) {
    const confirmar = window.confirm(
      `Excluir o funcionário "${funcionario.nome}"?\n\nEssa ação também poderá excluir registros de pagamentos vinculados a ele.`
    );

    if (!confirmar) return;

    try {
      const { error } = await supabase
        .from("funcionarios")
        .delete()
        .eq("id", funcionario.id);

      if (error) {
        console.error("Erro ao excluir funcionário:", error);

        alert(
          `Não foi possível excluir o funcionário.\n\n${error.message}`
        );

        return;
      }

      setFuncionarios((old) =>
        old.filter((item) => item.id !== funcionario.id)
      );

      if (selectedFuncionario?.id === funcionario.id) {
        setSelectedFuncionario(null);
      }

      alert("Funcionário excluído com sucesso.");
    } catch (error: any) {
      console.error("Erro inesperado ao excluir funcionário:", error);

      alert(
        `Erro inesperado ao excluir funcionário.\n\n${
          error?.message ?? "Erro desconhecido."
        }`
      );
    }
  }

  async function toggleStatus(funcionario: Funcionario) {
    const novoStatus =
      funcionario.status === "Ativo" ? "Inativo" : "Ativo";

    try {
      const { data, error } = await supabase
        .from("funcionarios")
        .update({
          status: novoStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", funcionario.id)
        .select("*")
        .single();

      if (error) {
        console.error("Erro ao alterar status:", error);

        alert(
          `Não foi possível alterar o status.\n\n${error.message}`
        );

        return;
      }

      const updated = normalizeFuncionario(data);

      setFuncionarios((old) =>
        old.map((item) =>
          item.id === funcionario.id ? updated : item
        )
      );

      if (selectedFuncionario?.id === funcionario.id) {
        setSelectedFuncionario(updated);
      }
    } catch (error: any) {
      console.error("Erro inesperado ao alterar status:", error);

      alert(
        `Erro inesperado ao alterar status.\n\n${
          error?.message ?? "Erro desconhecido."
        }`
      );
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        {/* CABEÇALHO */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-cyan-500/10 p-3 text-cyan-400">
                <BriefcaseBusiness className="h-7 w-7" />
              </div>

              <div>
                <h1 className="text-2xl font-bold sm:text-3xl">
                  Funcionários
                </h1>

                <p className="text-sm text-slate-400">
                  Cadastro e controle dos funcionários da empresa
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={openNew}
            className="flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            <Plus className="h-5 w-5" />
            Novo funcionário
          </button>
        </div>

        {/* RESUMO */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">
                Funcionários ativos
              </span>

              <UserCheck className="h-5 w-5 text-emerald-400" />
            </div>

            <p className="mt-3 text-3xl font-bold">
              {ativos}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">
                Funcionários inativos
              </span>

              <UserX className="h-5 w-5 text-red-400" />
            </div>

            <p className="mt-3 text-3xl font-bold">
              {inativos}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">
                Salários ativos
              </span>

              <Wallet className="h-5 w-5 text-cyan-400" />
            </div>

            <p className="mt-3 text-2xl font-bold">
              {money(folhaAtiva)}
            </p>
          </div>
        </div>

        {/* FILTROS */}
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, CPF, telefone, cargo..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-4 outline-none transition focus:border-cyan-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value as "Todos" | "Ativo" | "Inativo"
              )
            }
            className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
          >
            <option value="Todos">Todos os status</option>
            <option value="Ativo">Ativos</option>
            <option value="Inativo">Inativos</option>
          </select>
        </div>

        {/* LISTA */}
        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">
                  Lista de funcionários
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {filteredFuncionarios.length} funcionário(s)
                  encontrado(s)
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-slate-400">
              Carregando funcionários...
            </div>
          ) : filteredFuncionarios.length === 0 ? (
            <div className="p-10 text-center">
              <User className="mx-auto h-10 w-10 text-slate-600" />

              <p className="mt-3 font-medium">
                Nenhum funcionário encontrado
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Cadastre o primeiro funcionário para começar.
              </p>

              <button
                onClick={openNew}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-slate-950"
              >
                <Plus className="h-5 w-5" />
                Cadastrar funcionário
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {filteredFuncionarios.map((funcionario) => (
                <div
                  key={funcionario.id}
                  className="p-5 transition hover:bg-slate-800/40"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedFuncionario(funcionario)
                      }
                      className="min-w-0 text-left"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-400">
                          <User className="h-6 w-6" />
                        </div>

                        <div className="min-w-0">
                          <h3 className="truncate font-semibold">
                            {funcionario.nome}
                          </h3>

                          <p className="mt-1 text-sm text-slate-400">
                            {funcionario.cargo || "Cargo não informado"}
                          </p>

                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                            {funcionario.telefone && (
                              <span className="inline-flex items-center gap-1">
                                <Phone className="h-3.5 w-3.5" />
                                {funcionario.telefone}
                              </span>
                            )}

                            {funcionario.email && (
                              <span className="inline-flex items-center gap-1">
                                <Mail className="h-3.5 w-3.5" />
                                {funcionario.email}
                              </span>
                            )}

                            {funcionario.cidade && (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                {funcionario.cidade}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="sm:text-right">
                        <p className="font-semibold text-cyan-400">
                          {money(funcionario.salario)}
                        </p>

                        <p className="text-xs text-slate-500">
                          {funcionario.tipo_vinculo}
                        </p>
                      </div>

                      <span
                        className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${
                          funcionario.status === "Ativo"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {funcionario.status}
                      </span>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            openEdit(funcionario)
                          }
                          title="Editar"
                          className="rounded-lg border border-slate-700 p-2 text-slate-300 transition hover:bg-slate-800 hover:text-white"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            toggleStatus(funcionario)
                          }
                          title={
                            funcionario.status === "Ativo"
                              ? "Inativar"
                              : "Ativar"
                          }
                          className="rounded-lg border border-slate-700 p-2 text-slate-300 transition hover:bg-slate-800 hover:text-white"
                        >
                          {funcionario.status === "Ativo" ? (
                            <UserX className="h-4 w-4" />
                          ) : (
                            <UserCheck className="h-4 w-4" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            deleteFuncionario(funcionario)
                          }
                          title="Excluir"
                          className="rounded-lg border border-red-900/50 p-2 text-red-400 transition hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* MODAL CADASTRO / EDIÇÃO */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-5">
          <div className="max-h-[95vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-900 p-5">
              <div>
                <h2 className="text-xl font-bold">
                  {editingId
                    ? "Editar funcionário"
                    : "Novo funcionário"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Preencha os dados do funcionário
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-7 p-5">
              {/* DADOS PESSOAIS */}
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <User className="h-5 w-5 text-cyan-400" />
                  <h3 className="font-semibold text-cyan-400">
                    Dados pessoais
                  </h3>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <label className="lg:col-span-2">
                    <span className="mb-1 block text-sm text-slate-400">
                      Nome completo *
                    </span>

                    <input
                      value={form.nome}
                      onChange={(e) =>
                        updateField("nome", e.target.value)
                      }
                      placeholder="Nome completo"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                    />
                  </label>

                  <label>
                    <span className="mb-1 block text-sm text-slate-400">
                      CPF
                    </span>

                    <input
                      value={form.cpf}
                      onChange={(e) =>
                        updateField("cpf", e.target.value)
                      }
                      inputMode="numeric"
                      placeholder="CPF"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                    />
                  </label>

                  <label>
                    <span className="mb-1 block text-sm text-slate-400">
                      RG
                    </span>

                    <input
                      value={form.rg}
                      onChange={(e) =>
                        updateField("rg", e.target.value)
                      }
                      placeholder="RG"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                    />
                  </label>

                  <label>
                    <span className="mb-1 block text-sm text-slate-400">
                      Data de nascimento
                    </span>

                    <input
                      type="date"
                      value={form.data_nascimento}
                      onChange={(e) =>
                        updateField(
                          "data_nascimento",
                          e.target.value
                        )
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
                    />
                  </label>
                </div>
              </section>

              {/* CONTATO */}
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <Phone className="h-5 w-5 text-cyan-400" />
                  <h3 className="font-semibold text-cyan-400">
                    Contato
                  </h3>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <label>
                    <span className="mb-1 block text-sm text-slate-400">
                      Telefone
                    </span>

                    <input
                      value={form.telefone}
                      onChange={(e) =>
                        updateField(
                          "telefone",
                          e.target.value
                        )
                      }
                      inputMode="tel"
                      placeholder="Telefone"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                    />
                  </label>

                  <label>
                    <span className="mb-1 block text-sm text-slate-400">
                      WhatsApp
                    </span>

                    <input
                      value={form.whatsapp}
                      onChange={(e) =>
                        updateField(
                          "whatsapp",
                          e.target.value
                        )
                      }
                      inputMode="tel"
                      placeholder="WhatsApp"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                    />
                  </label>

                  <label className="sm:col-span-2">
                    <span className="mb-1 block text-sm text-slate-400">
                      E-mail
                    </span>

                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        updateField("email", e.target.value)
                      }
                      placeholder="email@exemplo.com"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                    />
                  </label>
                </div>
              </section>

              {/* ENDEREÇO */}
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-cyan-400" />
                  <h3 className="font-semibold text-cyan-400">
                    Endereço
                  </h3>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="lg:col-span-2">
                    <span className="mb-1 block text-sm text-slate-400">
                      Endereço
                    </span>

                    <input
                      value={form.endereco}
                      onChange={(e) =>
                        updateField(
                          "endereco",
                          e.target.value
                        )
                      }
                      placeholder="Rua / Avenida"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                    />
                  </label>

                  <label>
                    <span className="mb-1 block text-sm text-slate-400">
                      Número
                    </span>

                    <input
                      value={form.numero}
                      onChange={(e) =>
                        updateField("numero", e.target.value)
                      }
                      placeholder="Número"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                    />
                  </label>

                  <label>
                    <span className="mb-1 block text-sm text-slate-400">
                      CEP
                    </span>

                    <input
                      value={form.cep}
                      onChange={(e) =>
                        updateField("cep", e.target.value)
                      }
                      inputMode="numeric"
                      placeholder="CEP"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                    />
                  </label>

                  <label>
                    <span className="mb-1 block text-sm text-slate-400">
                      Bairro
                    </span>

                    <input
                      value={form.bairro}
                      onChange={(e) =>
                        updateField("bairro", e.target.value)
                      }
                      placeholder="Bairro"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                    />
                  </label>

                  <label>
                    <span className="mb-1 block text-sm text-slate-400">
                      Cidade
                    </span>

                    <input
                      value={form.cidade}
                      onChange={(e) =>
                        updateField("cidade", e.target.value)
                      }
                      placeholder="Cidade"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                    />
                  </label>

                  <label className="lg:col-span-2">
                    <span className="mb-1 block text-sm text-slate-400">
                      Complemento
                    </span>

                    <input
                      value={form.complemento}
                      onChange={(e) =>
                        updateField(
                          "complemento",
                          e.target.value
                        )
                      }
                      placeholder="Apartamento, bloco, referência..."
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                    />
                  </label>
                </div>
              </section>

              {/* PROFISSIONAL */}
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <BriefcaseBusiness className="h-5 w-5 text-cyan-400" />
                  <h3 className="font-semibold text-cyan-400">
                    Dados profissionais
                  </h3>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="lg:col-span-2">
                    <span className="mb-1 block text-sm text-slate-400">
                      Cargo *
                    </span>

                    <input
                      value={form.cargo}
                      onChange={(e) =>
                        updateField("cargo", e.target.value)
                      }
                      placeholder="Ex.: Técnico de Ar-Condicionado"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                    />
                  </label>

                  <label>
                    <span className="mb-1 block text-sm text-slate-400">
                      Tipo de vínculo
                    </span>

                    <select
                      value={form.tipo_vinculo}
                      onChange={(e) =>
                        updateField(
                          "tipo_vinculo",
                          e.target.value
                        )
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
                    >
                      <option>Funcionário</option>
                      <option>CLT</option>
                      <option>Autônomo</option>
                      <option>Prestador</option>
                      <option>Temporário</option>
                      <option>Freelancer</option>
                      <option>Outro</option>
                    </select>
                  </label>

                  <label>
                    <span className="mb-1 block text-sm text-slate-400">
                      Data de admissão
                    </span>

                    <input
                      type="date"
                      value={form.data_admissao}
                      onChange={(e) =>
                        updateField(
                          "data_admissao",
                          e.target.value
                        )
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
                    />
                  </label>
                </div>
              </section>

              {/* PAGAMENTO */}
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-cyan-400" />
                  <h3 className="font-semibold text-cyan-400">
                    Pagamento
                  </h3>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <label>
                    <span className="mb-1 block text-sm text-slate-400">
                      Salário
                    </span>

                    <input
                      value={form.salario}
                      onChange={(e) =>
                        updateField(
                          "salario",
                          e.target.value
                        )
                      }
                      inputMode="decimal"
                      placeholder="Ex.: 2800,00"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                    />
                  </label>

                  <label>
                    <span className="mb-1 block text-sm text-slate-400">
                      Forma de pagamento
                    </span>

                    <select
                      value={form.forma_pagamento}
                      onChange={(e) =>
                        updateField(
                          "forma_pagamento",
                          e.target.value
                        )
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
                    >
                      <option>PIX</option>
                      <option>Transferência</option>
                      <option>Dinheiro</option>
                      <option>Cheque</option>
                      <option>Outro</option>
                    </select>
                  </label>

                  <label className="sm:col-span-2">
                    <span className="mb-1 block text-sm text-slate-400">
                      Chave PIX
                    </span>

                    <input
                      value={form.chave_pix}
                      onChange={(e) =>
                        updateField(
                          "chave_pix",
                          e.target.value
                        )
                      }
                      placeholder="CPF, telefone, e-mail ou chave aleatória"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                    />
                  </label>
                </div>
              </section>

              {/* STATUS */}
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-cyan-400" />
                  <h3 className="font-semibold text-cyan-400">
                    Status
                  </h3>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label>
                    <span className="mb-1 block text-sm text-slate-400">
                      Situação
                    </span>

                    <select
                      value={form.status}
                      onChange={(e) =>
                        updateField(
                          "status",
                          e.target.value as
                            | "Ativo"
                            | "Inativo"
                        )
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
                    >
                      <option value="Ativo">Ativo</option>
                      <option value="Inativo">Inativo</option>
                    </select>
                  </label>

                  <label>
                    <span className="mb-1 block text-sm text-slate-400">
                      Observações
                    </span>

                    <textarea
                      value={form.observacoes}
                      onChange={(e) =>
                        updateField(
                          "observacoes",
                          e.target.value
                        )
                      }
                      rows={3}
                      placeholder="Observações..."
                      className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                    />
                  </label>
                </div>
              </section>
            </div>

            <div className="sticky bottom-0 flex flex-col-reverse gap-3 border-t border-slate-800 bg-slate-900 p-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="rounded-xl border border-slate-700 px-5 py-3 font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={saveFuncionario}
                disabled={saving}
                className="flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    {editingId
                      ? "Salvar alterações"
                      : "Cadastrar funcionário"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALHES */}
      {selectedFuncionario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 p-5">
              <div>
                <h2 className="text-xl font-bold">
                  {selectedFuncionario.nome}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {selectedFuncionario.cargo ||
                    "Cargo não informado"}
                </p>
              </div>

              <button
                onClick={() =>
                  setSelectedFuncionario(null)
                }
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-950 p-4">
                <p className="text-xs text-slate-500">CPF</p>
                <p className="mt-1 font-medium">
                  {selectedFuncionario.cpf || "Não informado"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 p-4">
                <p className="text-xs text-slate-500">RG</p>
                <p className="mt-1 font-medium">
                  {selectedFuncionario.rg || "Não informado"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 p-4">
                <p className="text-xs text-slate-500">Telefone</p>
                <p className="mt-1 font-medium">
                  {selectedFuncionario.telefone || "Não informado"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 p-4">
                <p className="text-xs text-slate-500">WhatsApp</p>
                <p className="mt-1 font-medium">
                  {selectedFuncionario.whatsapp || "Não informado"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 p-4">
                <p className="text-xs text-slate-500">E-mail</p>
                <p className="mt-1 break-all font-medium">
                  {selectedFuncionario.email || "Não informado"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 p-4">
                <p className="text-xs text-slate-500">Status</p>
                <p
                  className={`mt-1 font-semibold ${
                    selectedFuncionario.status === "Ativo"
                      ? "text-emerald-400"
                      : "text-red-400"
                  }`}
                >
                  {selectedFuncionario.status}
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 p-4">
                <p className="text-xs text-slate-500">Salário</p>
                <p className="mt-1 font-semibold text-cyan-400">
                  {money(selectedFuncionario.salario)}
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 p-4">
                <p className="text-xs text-slate-500">
                  Forma de pagamento
                </p>
                <p className="mt-1 font-medium">
                  {selectedFuncionario.forma_pagamento ||
                    "Não informado"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 p-4">
                <p className="text-xs text-slate-500">
                  Data de nascimento
                </p>
                <p className="mt-1 font-medium">
                  {dateBR(
                    selectedFuncionario.data_nascimento
                  )}
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 p-4">
                <p className="text-xs text-slate-500">
                  Data de admissão
                </p>
                <p className="mt-1 font-medium">
                  {dateBR(selectedFuncionario.data_admissao)}
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 p-4 sm:col-span-2">
                <p className="text-xs text-slate-500">
                  Endereço
                </p>
                <p className="mt-1 font-medium">
                  {[
                    selectedFuncionario.endereco,
                    selectedFuncionario.numero,
                    selectedFuncionario.complemento,
                    selectedFuncionario.bairro,
                    selectedFuncionario.cidade,
                    selectedFuncionario.cep,
                  ]
                    .filter(Boolean)
                    .join(", ") || "Não informado"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 p-4 sm:col-span-2">
                <p className="text-xs text-slate-500">
                  Chave PIX
                </p>
                <p className="mt-1 break-all font-medium">
                  {selectedFuncionario.chave_pix ||
                    "Não informado"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 p-4 sm:col-span-2">
                <p className="text-xs text-slate-500">
                  Observações
                </p>
                <p className="mt-1 whitespace-pre-wrap font-medium">
                  {selectedFuncionario.observacoes ||
                    "Nenhuma observação."}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-800 p-5 sm:flex-row sm:justify-end">
              <button
                onClick={() =>
                  toggleStatus(selectedFuncionario)
                }
                className="rounded-xl border border-slate-700 px-5 py-3 font-medium hover:bg-slate-800"
              >
                {selectedFuncionario.status === "Ativo"
                  ? "Inativar funcionário"
                  : "Ativar funcionário"}
              </button>

              <button
                onClick={() =>
                  openEdit(selectedFuncionario)
                }
                className="flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-400"
              >
                <Edit3 className="h-5 w-5" />
                Editar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
