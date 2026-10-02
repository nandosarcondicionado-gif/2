"use client";

import { Edit, Plus, Trash2, X, ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type Role = "ADMIN" | "TECNICO" | "AJUDANTE" | "GERENTE" | "FINANCEIRO";

type Employee = {
  id: string;
  nome: string;
  email: string;
  cargo: Role;
  telefone?: string;
};

type FormData = {
  nome: string;
  email: string;
  cargo: Role;
  telefone: string;
  senha: string;
};

const emptyForm: FormData = {
  nome: "",
  email: "",
  cargo: "TECNICO",
  telefone: "",
  senha: "",
};

export default function FuncionariosPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);

  async function loadEmployees() {
    setLoading(true);
    const { data, error } = await supabase
      .from("funcionarios")
      .select("*")
      .order("nome", { ascending: true });

    if (error) {
      console.error("Erro ao carregar funcionários:", error);
    } else {
      setEmployees((data ?? []) as Employee[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadEmployees();
  }, []);

  function openNew() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(emp: Employee) {
    setEditingId(emp.id);
    setForm({
      nome: emp.nome || "",
      email: emp.email || "",
      cargo: emp.cargo || "TECNICO",
      telefone: emp.telefone || "",
      senha: "",
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function saveEmployee() {
    if (!form.nome.trim() || !form.email.trim()) {
      alert("Preencha o nome e o e-mail.");
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        nome: form.nome,
        email: form.email,
        cargo: form.cargo,
        telefone: form.telefone || null,
      };

      if (editingId) {
        const { error } = await supabase
          .from("funcionarios")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
        alert("Funcionário atualizado com sucesso!");
      } else {
        const { error } = await supabase.from("funcionarios").insert([payload]);
        if (error) throw error;
        alert("Funcionário cadastrado com sucesso!");
      }

      closeForm();
      await loadEmployees();
    } catch (error: any) {
      alert(error?.message || "Erro ao salvar funcionário.");
    }
    setSaving(false);
  }

  async function deleteEmployee(id: string, nome: string) {
    if (!window.confirm(`Deseja realmente excluir ${nome}?`)) return;

    try {
      const { error } = await supabase.from("funcionarios").delete().eq("id", id);
      if (error) throw error;
      alert("Funcionário excluído com sucesso.");
      await loadEmployees();
    } catch (error: any) {
      alert(error?.message || "Erro ao excluir.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        
        {/* CABEÇALHO COM BOTÃO VOLTAR E NOVO */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Gestão de Funcionários e Acessos</h1>
              <p className="text-xs text-slate-400 mt-0.5">Cadastre e defina a função de cada membro da equipe.</p>
            </div>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors shadow-lg"
          >
            <Plus className="h-4 w-4" /> Novo Funcionário
          </button>
        </div>

        {/* LISTA DE EQUIPE */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 font-semibold text-slate-300 text-sm">
            Equipe Cadastrada
          </div>
          
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Carregando equipe...</div>
          ) : employees.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">Nenhum funcionário cadastrado.</div>
          ) : (
            <div className="divide-y divide-slate-800">
              {employees.map((emp) => (
                <div key={emp.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-850 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{emp.nome}</span>
                      <span className="rounded-md bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-400 uppercase tracking-wider">
                        {emp.cargo}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{emp.email || "Sem e-mail cadastrado"}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEdit(emp)}
                      className="border border-slate-700 bg-slate-800 p-2 rounded-xl text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                      title="Editar Funcionário"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteEmployee(emp.id, emp.nome)}
                      className="border border-red-500/20 bg-red-500/10 p-2 rounded-xl text-red-400 hover:bg-red-500/20 transition-colors"
                      title="Excluir Funcionário"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE CADASTRO / EDIÇÃO */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 text-white">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold">{editingId ? "Editar Funcionário" : "Novo Funcionário"}</h2>
              <button onClick={closeForm} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Nome Completo</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm((o) => ({ ...o, nome: e.target.value }))}
                  placeholder="Ex: Carlos Silva"
                  className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white text-sm focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">E-mail</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((o) => ({ ...o, email: e.target.value }))}
                  placeholder="email@exemplo.com"
                  className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white text-sm focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Cargo / Função</label>
                <select
                  value={form.cargo}
                  onChange={(e) => setForm((o) => ({ ...o, cargo: e.target.value as Role }))}
                  className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white text-sm font-semibold focus:border-blue-500 outline-none"
                >
                  <option value="TECNICO">Técnico</option>
                  <option value="AJUDANTE">Ajudante</option>
                  <option value="GERENTE">Gerente</option>
                  <option value="FINANCEIRO">Financeiro</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={form.telefone}
                  onChange={(e) => setForm((o) => ({ ...o, telefone: e.target.value }))}
                  placeholder="(00) 00000-0000"
                  className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white text-sm focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={closeForm}
                className="border border-slate-700 px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={saveEmployee}
                disabled={saving}
                className="bg-blue-600 text-white font-bold px-5 py-2 rounded-xl text-sm hover:bg-blue-500 transition-colors shadow-lg"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
