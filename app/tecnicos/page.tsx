"use client";

import { useEffect, useState } from "react";
import {
  UserPlus,
  Pencil,
  Trash2,
  RefreshCw,
  Search,
  ArrowLeft,
  User,
} from "lucide-react";
import { createClient } from "../../lib/supabase/client";
import { useRouter } from "next/navigation";

type Tecnico = {
  id: string;
  nome: string;
};

export default function TecnicosPage() {
  const supabase = createClient();
  const router = useRouter();

  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [nome, setNome] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  useEffect(() => {
    carregarTecnicos();
  }, []);

  async function carregarTecnicos() {
    setCarregando(true);
    setErro("");

    const { data, error } = await supabase
      .from("tecnicos")
      .select("id, nome")
      .order("nome", { ascending: true });

    if (error) {
      console.error("Erro ao carregar técnicos:", error);

      setErro(
        "Não foi possível carregar os técnicos. Verifique se a tabela 'tecnicos' existe no Supabase."
      );

      setTecnicos([]);
      setCarregando(false);
      return;
    }

    setTecnicos(
      (data ?? []).map((item: any) => ({
        id: String(item.id),
        nome: String(item.nome ?? ""),
      }))
    );

    setCarregando(false);
  }

  function limparFormulario() {
    setNome("");
    setEditandoId(null);
    setErro("");
  }

  async function salvarTecnico() {
    setErro("");
    setSucesso("");

    const nomeLimpo = nome.trim();

    if (!nomeLimpo) {
      setErro("Digite o nome do técnico.");
      return;
    }

    setSalvando(true);

    if (editandoId) {
      const { error } = await supabase
        .from("tecnicos")
        .update({
          nome: nomeLimpo,
        })
        .eq("id", editandoId);

      if (error) {
        console.error("Erro ao atualizar técnico:", error);

        setErro(
          `Não foi possível atualizar o técnico: ${error.message}`
        );

        setSalvando(false);
        return;
      }

      setSucesso("Técnico atualizado com sucesso.");
    } else {
      const { error } = await supabase
        .from("tecnicos")
        .insert({
          nome: nomeLimpo,
        });

      if (error) {
        console.error("Erro ao cadastrar técnico:", error);

        setErro(
          `Não foi possível cadastrar o técnico: ${error.message}`
        );

        setSalvando(false);
        return;
      }

      setSucesso("Técnico cadastrado com sucesso.");
    }

    limparFormulario();
    await carregarTecnicos();

    setSalvando(false);

    setTimeout(() => {
      setSucesso("");
    }, 3000);
  }

  function editarTecnico(tecnico: Tecnico) {
    setEditandoId(tecnico.id);
    setNome(tecnico.nome);
    setErro("");
    setSucesso("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function excluirTecnico(tecnico: Tecnico) {
    const confirmar = window.confirm(
      `Deseja realmente excluir o técnico "${tecnico.nome}"?`
    );

    if (!confirmar) {
      return;
    }

    setErro("");
    setSucesso("");

    const { error } = await supabase
      .from("tecnicos")
      .delete()
      .eq("id", tecnico.id);

    if (error) {
      console.error("Erro ao excluir técnico:", error);

      setErro(
        `Não foi possível excluir o técnico: ${error.message}`
      );

      return;
    }

    if (editandoId === tecnico.id) {
      limparFormulario();
    }

    setSucesso("Técnico excluído com sucesso.");

    await carregarTecnicos();

    setTimeout(() => {
      setSucesso("");
    }, 3000);
  }

  const tecnicosFiltrados = tecnicos.filter((tecnico) =>
    tecnico.nome
      .toLowerCase()
      .includes(busca.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-white sm:p-6">
      <div className="mx-auto max-w-5xl space-y-6">

        {/* CABEÇALHO */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <p className="text-sm text-slate-400">
              ClimaPro
            </p>

            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
              Técnicos
            </h1>

            <p className="mt-1 text-slate-400">
              Cadastre e gerencie os técnicos utilizados nas ordens de serviço.
            </p>
          </div>

          <button
            onClick={() => router.back()}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium text-slate-200 hover:bg-slate-800"
          >
            <ArrowLeft size={18} />
            Voltar
          </button>

        </div>

        {/* MENSAGENS */}

        {erro && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {erro}
          </div>
        )}

        {sucesso && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {sucesso}
          </div>
        )}

        {/* FORMULÁRIO */}

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

          <div className="mb-5 flex items-center gap-3">

            <div className="rounded-xl bg-blue-500/10 p-3 text-blue-400">
              {editandoId ? (
                <Pencil size={22} />
              ) : (
                <UserPlus size={22} />
              )}
            </div>

            <div>
              <h2 className="text-lg font-semibold">
                {editandoId
                  ? "Editar técnico"
                  : "Cadastrar técnico"}
              </h2>

              <p className="text-sm text-slate-400">
                {editandoId
                  ? "Altere o nome do técnico cadastrado."
                  : "Cadastre um técnico para utilizá-lo nas ordens de serviço."}
              </p>
            </div>

          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Nome do técnico
              </label>

              <input
                type="text"
                value={nome}
                onChange={(event) =>
                  setNome(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    salvarTecnico();
                  }
                }}
                placeholder="Digite o nome do técnico"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500"
              />
            </div>

            <div className="flex items-end gap-2">

              <button
                onClick={salvarTecnico}
                disabled={salvando}
                className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {salvando ? (
                  <>
                    <RefreshCw
                      size={17}
                      className="animate-spin"
                    />
                    Salvando...
                  </>
                ) : editandoId ? (
                  <>
                    <Pencil size={17} />
                    Salvar alteração
                  </>
                ) : (
                  <>
                    <UserPlus size={17} />
                    Cadastrar
                  </>
                )}
              </button>

              {editandoId && (
                <button
                  onClick={limparFormulario}
                  disabled={salvando}
                  className="min-h-[48px] rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800"
                >
                  Cancelar
                </button>
              )}

            </div>

          </div>

        </div>

        {/* LISTA */}

        <div className="rounded-2xl border border-slate-800 bg-slate-900">

          <div className="flex flex-col gap-4 border-b border-slate-800 p-5 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <h2 className="text-lg font-semibold">
                Técnicos cadastrados
              </h2>

              <p className="text-sm text-slate-400">
                {tecnicos.length}{" "}
                {tecnicos.length === 1
                  ? "técnico cadastrado"
                  : "técnicos cadastrados"}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">

              <div className="relative">

                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />

                <input
                  type="text"
                  value={busca}
                  onChange={(event) =>
                    setBusca(event.target.value)
                  }
                  placeholder="Buscar técnico..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500 sm:w-56"
                />

              </div>

              <button
                onClick={carregarTecnicos}
                disabled={carregando}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-60"
              >
                <RefreshCw
                  size={17}
                  className={
                    carregando
                      ? "animate-spin"
                      : ""
                  }
                />
                Atualizar
              </button>

            </div>

          </div>

          {carregando ? (

            <div className="p-10 text-center">

              <RefreshCw
                size={28}
                className="mx-auto mb-3 animate-spin text-slate-500"
              />

              <p className="text-sm text-slate-400">
                Carregando técnicos...
              </p>

            </div>

          ) : tecnicosFiltrados.length === 0 ? (

            <div className="p-10 text-center">

              <User
                size={40}
                className="mx-auto mb-3 text-slate-600"
              />

              <p className="font-medium text-slate-300">
                {busca
                  ? "Nenhum técnico encontrado"
                  : "Nenhum técnico cadastrado"}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {busca
                  ? "Tente pesquisar por outro nome."
                  : "Cadastre o primeiro técnico acima."}
              </p>

            </div>

          ) : (

            <div className="divide-y divide-slate-800">

              {tecnicosFiltrados.map((tecnico) => (

                <div
                  key={tecnico.id}
                  className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                >

                  <div className="flex min-w-0 items-center gap-4">

                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-400">
                      <User size={20} />
                    </div>

                    <div className="min-w-0">

                      <p className="truncate font-semibold text-white">
                        {tecnico.nome}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Técnico cadastrado no ClimaPro
                      </p>

                    </div>

                  </div>

                  <div className="flex gap-2">

                    <button
                      onClick={() =>
                        editarTecnico(tecnico)
                      }
                      className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800"
                    >
                      <Pencil size={16} />
                      Editar
                    </button>

                    <button
                      onClick={() =>
                        excluirTecnico(tecnico)
                      }
                      className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-300 hover:bg-red-500/20"
                    >
                      <Trash2 size={16} />
                      Excluir
                    </button>

                  </div>

                </div>

              ))}

            </div>

          )}

        </div>

      </div>
    </div>
  );
}
