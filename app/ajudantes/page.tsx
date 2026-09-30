"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  RefreshCw,
  UserRound,
  Plus,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type Ajudante = {
  id: string;
  nome: string;
  funcao?: string;
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
  const [ajudantes, setAjudantes] = useState<Ajudante[]>([]);
  const [agenda, setAgenda] = useState<Agenda[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para o formulário de cadastro de novo ajudante
  const [novoNome, setNovoNome] = useState("");
  const [novaFuncao, setNovaFuncao] = useState("");
  const [salvandoAjudante, setSalvandoAjudante] = useState(false);

  async function carregar() {
    setLoading(true);
    try {
      // Carrega os ajudantes direto do Supabase
      const { data: ajudantesData, error: errAjudantes } = await supabase
        .from("ajudantes")
        .select("id, nome, funcao")
        .order("nome", { ascending: true });

      if (errAjudantes) throw errAjudantes;

      // Mantém a compatibilidade com a sua API de agenda existente
      const response = await fetch("/api/agenda/ajudantes", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Acesso negado à agenda.");
      } else {
        setAgenda(data.agenda || []);
      }

      setAjudantes(ajudantesData || []);
    } catch (error) {
      console.error(error);
      alert("Não foi possível carregar os dados.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  // Função para cadastrar um novo ajudante direto pela tela
  async function cadastrarAjudante(e: React.FormEvent) {
    e.preventDefault();
    if (!novoNome.trim()) {
      alert("Digite o nome do ajudante.");
      return;
    }

    setSalvandoAjudante(true);
    try {
      const { error } = await supabase.from("ajudantes").insert({
        nome: novoNome.trim(),
        funcao: novaFuncao.trim() || "Ajudante",
      });

      if (error) throw error;

      setNovoNome("");
      setNovaFuncao("");
      alert("Ajudante cadastrado com sucesso!");
      carregar(); // Recarrega a lista
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Erro ao cadastrar ajudante.");
    } finally {
      setSalvandoAjudante(false);
    }
  }

  // Função para excluir um ajudante caso precise
  async function excluirAjudante(id: string, nome: string) {
    if (!confirm(`Deseja realmente excluir o(a) ajudante ${nome}?`)) return;

    try {
      const { error } = await supabase.from("ajudantes").delete().eq("id", id);
      if (error) throw error;
      setAjudantes((lista) => lista.filter((a) => a.id !== id));
    } catch (error: any) {
      alert(error?.message || "Erro ao excluir ajudante.");
    }
  }

  async function salvarAtribuicao(agendaId: string, ajudanteId: string) {
    try {
      const response = await fetch("/api/agenda/ajudantes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agenda_id: agendaId,
          ajudante_id: ajudanteId || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Não foi possível salvar.");
        return;
      }

      setAgenda((lista) =>
        lista.map((item) =>
          item.id === agendaId
            ? {
                ...item,
                ajudante_id: data.agenda?.ajudante_id || null,
              }
            : item
        )
      );
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar a atribuição.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white sm:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white"
          >
            <ArrowLeft size={18} />
            Voltar
          </a>

          <button
            onClick={carregar}
            className="rounded-xl border border-slate-700 p-3 hover:bg-slate-900"
            title="Atualizar dados"
          >
            <RefreshCw size={18} />
          </button>
        </div>

        <div>
          <h1 className="text-2xl font-bold">Gerenciar Ajudantes e Atribuições</h1>
          <p className="text-slate-400 text-sm">
            Cadastre novos ajudantes e defina qual deles acompanhará cada atendimento.
          </p>
        </div>

        {/* FORMULÁRIO DE CADASTRO DE AJUDANTE */}
        <form
          onSubmit={cadastrarAjudante}
          className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4"
        >
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Plus size={20} className="text-cyan-400" /> Cadastrar Novo Ajudante
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Nome do Ajudante</label>
              <input
                type="text"
                placeholder="Ex: Letícia, Paulo..."
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Função / Tipo</label>
              <input
                type="text"
                placeholder="Ex: Ajudante de Técnico, Limpeza..."
                value={novaFuncao}
                onChange={(e) => setNovaFuncao(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={salvandoAjudante}
              className="rounded-xl bg-cyan-500 px-5 py-2.5 font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
            >
              {salvandoAjudante ? "Salvando..." : "Salvar Ajudante"}
            </button>
          </div>
        </form>

        {/* LISTA DE AJUDANTES JÁ CADASTRADOS (Para gerenciar) */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="font-semibold text-sm text-slate-400 mb-3">Ajudantes Cadastrados no Sistema</h2>
          <div className="flex flex-wrap gap-2">
            {ajudantes.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              >
                <span><strong>{a.nome}</strong> {a.funcao ? `(${a.funcao})` : ""}</span>
                <button
                  type="button"
                  onClick={() => excluirAjudante(a.id, a.nome)}
                  className="text-red-400 hover:text-red-300 ml-1"
                  title="Excluir ajudante"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {ajudantes.length === 0 && (
              <p className="text-xs text-slate-500">Nenhum ajudante cadastrado ainda.</p>
            )}
          </div>
        </div>

        {/* LISTA DA AGENDA PARA ATRIBUIÇÃO */}
        <div>
          <h2 className="text-lg font-bold mb-3">Atribuir Ajudante aos Atendimentos</h2>
          {loading ? (
            <p className="text-slate-400">Carregando...</p>
          ) : (
            <div className="space-y-3">
              {agenda.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-4"
                >
                  <div className="grid gap-4 md:grid-cols-[1fr_280px] items-center">
                    <div>
                      <p className="font-semibold">
                        {item.data?.split("-").reverse().join("/")}{" "}
                        {item.horario?.slice(0, 5)} — {item.cliente_nome}
                      </p>
                      <p className="mt-1 text-sm text-slate-300">
                        {item.servico}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        {item.cidade} · Técnico: {item.tecnico || "Não informado"}
                      </p>
                    </div>

                    <label className="flex items-center gap-2">
                      <UserRound size={17} className="text-slate-400 shrink-0" />
                      <select
                        value={item.ajudante_id || ""}
                        onChange={(e) =>
                          salvarAtribuicao(item.id, e.target.value)
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white"
                      >
                        <option value="">Sem ajudante</option>
                        {ajudantes.map((ajudante) => (
                          <option key={ajudante.id} value={ajudante.id}>
                            {ajudante.nome} {ajudante.funcao ? `(${ajudante.funcao})` : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              ))}

              {agenda.length === 0 && (
                <p className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-slate-400">
                  Nenhum atendimento encontrado na agenda.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
