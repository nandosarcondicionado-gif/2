"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Users, UserPlus, Shield, Mail, Key, Trash2, CheckCircle2 } from "lucide-react";

export default function GerenciarFuncionariosPage() {
  const supabase = createClient();
  
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);

  // Campos do formulário de novo funcionário
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [cargo, setCargo] = useState("Ajudante"); // Ajudante, Tecnico, Gerente, Financeiro
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarFuncionarios();
  }, []);

  async function carregarFuncionarios() {
    setLoading(true);
    // Busca a lista de perfis ou usuários cadastrados
    const { data, error } = await supabase
      .from("funcionarios") // ou a tabela que você usa para guardar os dados da equipe
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar funcionários:", error.message);
    } else {
      setFuncionarios(data || []);
    }
    setLoading(false);
  }

  async function cadastrarFuncionario(e: React.FormEvent) {
    e.preventDefault();
    if (!nome || !email || !senha) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }

    setSalvando(true);

    // 1. Cria o usuário no Auth do Supabase para ele ter login e senha
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: senha,
    });

    if (authError) {
      alert("Erro ao criar acesso de login: " + authError.message);
      setSalvando(false);
      return;
    }

    const userId = authData.user?.id;

    // 2. Salva os dados do funcionário (cargo, nome, ID) na tabela de funcionários
    const { error: dbError } = await supabase
      .from("funcionarios")
      .insert([
        {
          id: userId,
          nome,
          email,
          cargo, // 'Ajudante', 'Tecnico', 'Gerente', 'Financeiro'
          status_acesso: "Ativo"
        }
      ]);

    if (dbError) {
      alert("Erro ao salvar dados do funcionário: " + dbError.message);
    } else {
      alert("Funcionário cadastrado com sucesso!");
      setNome("");
      setEmail("");
      setSenha("");
      setCargo("Ajudante");
      setModalAberto(false);
      carregarFuncionarios();
    }

    setSalvando(false);
  }

  async function excluirFuncionario(id: string) {
    if (!confirm("Tem certeza que deseja remover este funcionário?")) return;

    const { error } = await supabase
      .from("funcionarios")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Erro ao excluir: " + error.message);
    } else {
      carregarFuncionarios();
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Cabeçalho */}
        <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Users className="text-blue-500" /> Gestão de Funcionários e Acessos
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Cadastre e defina a função de cada membro da equipe (Ajudantes, Técnicos, Gerentes e Financeiro).
            </p>
          </div>
          <button
            onClick={() => setModalAberto(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition"
          >
            <UserPlus size={18} /> Novo Funcionário
          </button>
        </div>

        {/* Lista de Funcionários */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 font-semibold text-sm text-slate-300">
            Equipe Cadastrada
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500 text-sm">Carregando equipe...</div>
          ) : funcionarios.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">Nenhum funcionário cadastrado ainda. Clique em "Novo Funcionário".</div>
          ) : (
            <div className="divide-y divide-slate-800">
              {funcionarios.map((func) => (
                <div key={func.id} className="p-4 flex items-center justify-between hover:bg-slate-850 transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{func.nome}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-800 uppercase font-semibold">
                        {func.cargo}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <Mail size={12} /> {func.email}
                    </p>
                  </div>

                  <button
                    onClick={() => excluirFuncionario(func.id)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-lg transition"
                    title="Excluir funcionário"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal de Cadastro */}
        {modalAberto && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-md p-6 rounded-2xl space-y-5">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold">Cadastrar Novo Funcionário</h2>
                <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-white text-sm">✕</button>
              </div>

              <form onSubmit={cadastrarFuncionario} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Nome Completo</label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Letícia Santos"
                    className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-sm outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">E-mail (Usado para o login)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="leticia@empresa.com"
                    className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-sm outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Senha de Acesso</label>
                  <input
                    type="password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-sm outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Cargo / Função no Sistema</label>
                  <select
                    value={cargo}
                    onChange={(e) => setCargo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-sm outline-none focus:border-blue-500"
                  >
                    <option value="Ajudante">Ajudante</option>
                    <option value="Tecnico">Técnico</option>
                    <option value="Gerente">Gerente</option>
                    <option value="Financeiro">Financeiro</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalAberto(false)}
                    className="w-1/2 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 rounded-xl transition text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={salvando}
                    className="w-1/2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition text-sm"
                  >
                    {salvando ? "Salvando..." : "Salvar e Criar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
