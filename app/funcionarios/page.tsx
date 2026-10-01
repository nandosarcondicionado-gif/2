"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { LogIn, LogOut, MapPin, CheckCircle, PenTool, RotateCcw } from "lucide-react";

export default function PortalFuncionarioPage() {
  const supabase = createClient();
  
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<any>(null);
  
  const [servico, setServico] = useState<any>(null);
  const [assinaturaSucesso, setAssinaturaSucesso] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !senha) {
      alert("Preencha o e-mail e a senha.");
      return;
    }

    setLoading(true);
    // CORRIGIDO AQUI: 'password' em vez de 'senha' para respeitar a tipagem do Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) {
      alert(`Erro ao entrar: ${error.message}`);
      setLoading(false);
      return;
    }

    setSession(data.session);
    await buscarServicoPendente(data.session.user.id);
    setLoading(false);
  }

  async function buscarServicoPendente(userId: string) {
    const { data, error } = await supabase
      .from("ordens_servico")
      .select("*")
      .or(`tecnico_id.eq.${userId},ajudante_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (data) {
      setServico(data);
    } else {
      setServico({
        id: "exemplo-123",
        tipo_servico: "Ordem de Serviço Geral",
        cidade: "Endereço cadastrado",
        valor_ajudante: 150.00,
        valor_tecnico: 250.00,
      });
    }
  }

  function startDrawing(e: any) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function draw(e: any) {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function stopDrawing() {
    setIsDrawing(false);
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  async function salvarAssinatura() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const assinaturaBase64 = canvas.toDataURL("image/png");

    const { error } = await supabase
      .from("ordens_servico")
      .update({ 
        assinatura_ajudante: assinaturaBase64,
        status: "Assinado" 
      })
      .eq("id", servico.id);

    if (error) {
      alert("Erro ao salvar assinatura: " + error.message);
      return;
    }

    setAssinaturaSucesso(true);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setSession(null);
    setServico(null);
    setAssinaturaSucesso(false);
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-white">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Portal do Funcionário</h1>
            <p className="text-xs text-slate-400">Entre com o e-mail e senha cadastrados pelo administrador.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@empresa.com"
                className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-sm text-white outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Senha</label>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-sm text-white outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
            >
              <LogIn size={18} />
              {loading ? "Entrando..." : "Acessar Portal"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white flex flex-col items-center">
      <div className="w-full max-w-md space-y-6 py-4">
        
        <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div>
            <p className="text-xs text-slate-400">Funcionário Logado</p>
            <p className="font-bold text-sm">{session.user.email}</p>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 border border-slate-700 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Sair"
          >
            <LogOut size={18} />
          </button>
        </div>

        {assinaturaSucesso ? (
          <div className="bg-emerald-950/40 border border-emerald-800 p-6 rounded-2xl text-center space-y-3">
            <CheckCircle className="mx-auto text-emerald-400 h-12 w-12" />
            <h2 className="text-lg font-bold text-emerald-200">Recibo Assinado com Sucesso!</h2>
            <p className="text-xs text-emerald-400">Sua assinatura foi salva diretamente na Ordem de Serviço.</p>
          </div>
        ) : (
          <div className="space-y-4">
            
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-blue-400">Comprovação de Recebimento</h2>
              
              <div className="space-y-2 text-sm">
                <p className="font-semibold text-base">{servico?.tipo_servico || "Serviço Realizado"}</p>
                <div className="flex items-start gap-2 text-slate-300">
                  <MapPin size={16} className="text-slate-400 mt-0.5 shrink-0" />
                  <span>{servico?.cidade ? `Cidade: ${servico.cidade}` : "Endereço registrado"}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
                <span className="text-xs text-slate-400">Valor a Receber:</span>
                <span className="font-bold text-emerald-400 text-lg">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(servico?.valor_ajudante || servico?.valor_tecnico || 150)}
                </span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold flex items-center gap-2">
                  <PenTool size={16} className="text-blue-400" /> Assine com o dedo abaixo
                </span>
                <button 
                  onClick={clearCanvas}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 border border-slate-800 px-2 py-1 rounded-lg"
                >
                  <RotateCcw size={12} /> Limpar
                </button>
              </div>

              <div className="bg-white rounded-xl overflow-hidden border border-slate-700 touch-none">
                <canvas
                  ref={canvasRef}
                  width={350}
                  height={180}
                  className="w-full cursor-crosshair bg-white"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>

              <button
                onClick={salvarAssinatura}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition shadow-lg"
              >
                Confirmar e Assinar Recibo
              </button>
            </div>

          </div>
        )}

      </div>
    </main>
  );
}
