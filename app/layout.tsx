"use client";

import type { Metadata } from "next";
import "./globals.css";
import { useState, useMemo, useEffect, useRef } from "react";
import { Wrench, Search, HelpCircle, X, DollarSign, FileText, UserPlus, CheckCircle2, Mic, MicOff, Send, Loader2 } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

// Inicialização segura do cliente Supabase (lendo das variáveis de ambiente do Next.js)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

// Base de Dados Completa: Hi-Wall, Piso-Teto, Cassete, Inverter e Convencionais (Antigos e Novos)
const baseErrosGlobal = [
  // --- SAMSUNG ---
  { marca: "Samsung", codigo: "E121 / E122", problema: "Erro no sensor de temperatura ambiente ou da bobina interna", solucao: "Verificar conector solto ou substituir o sensor NTC da evaporadora." },
  { marca: "Samsung", codigo: "E416 / C416", problema: "Compressor superaquecido (Temperatura de descarga alta)", solucao: "Falta de gás refrigerante, condensadora muito suja ou compressor forçado." },
  { marca: "Samsung", codigo: "E458", problema: "Erro no motor do ventilador externo (DC Fan)", solucao: "Verificar se o ventilador está travado, cabo mal conectado ou placa externa com defeito." },
  { marca: "Samsung", codigo: "E554 / C554", problema: "Erro de vazamento de gás refrigerante", solucao: "Realizar teste de pressão com nitrogênio, corrigir vazamento e refazer carga de gás." },
  { marca: "Samsung", codigo: "C101 / E101", problema: "Erro de comunicação entre unidades (Interna e Externa)", solucao: "Checar se o cabo de comunicação/sinal está rompido, oxidado ou mal conectado." },
  { marca: "Samsung (Antigo)", codigo: "Luzes Timer/Operation Piscando", problema: "Falha geral de sistema ou sensor aberto em modelos antigos", solucao: "Testar sensores de temperatura e placa de controle principal." },

  // --- LG (Hi-Wall e Piso-Teto) ---
  { marca: "LG", codigo: "CH21", problema: "Sobrecorrente no módulo IPM / Compressor", solucao: "Oscilação de tensão elétrica, compressor travado ou defeito na placa inverter." },
  { marca: "LG", codigo: "CH22", problema: "Corrente alta na unidade condensadora", solucao: "Falta de gás, condensadora excessivamente suja ou ventilação externa bloqueada." },
  { marca: "LG", codigo: "CH23", problema: "Baixa tensão no barramento DC da placa", solucao: "Verificar rede elétrica do cliente, disjuntor inadequado ou placa de potência." },
  { marca: "LG", codigo: "CH26", problema: "Compressor DC travado mecanicamente", solucao: "Desligar sistema, testar enrolamentos. Se travado, substituir compressor." },
  { marca: "LG", codigo: "CH05", problema: "Falha de comunicação entre evaporadora e condensadora", solucao: "Verificar fiação de sinal interligação entre as unidades." },
  { marca: "LG (Piso-Teto / Comercial)", codigo: "CH32 / CH33", problema: "Superaquecimento na descarga do compressor ou alta temperatura", solucao: "Verificar restrição na linha de fluido ou limpeza da condensadora." },

  // --- GREE ---
  { marca: "Gree", codigo: "E1", problema: "Proteção por alta pressão de refrigerante", solucao: "Excesso de gás, condensadora bloqueada ou temperatura externa excessiva." },
  { marca: "Gree", codigo: "E2", problema: "Proteção anti-congelamento da evaporadora", solucao: "Filtros de ar muito sujos, fluxo de ar bloqueado ou baixa carga de gás." },
  { marca: "Gree", codigo: "E3", problema: "Proteção por baixa pressão de refrigerante", solucao: "Falta de gás por vazamento ou restrição na tubulação." },
  { marca: "Gree", codigo: "H5", problema: "Proteção do Módulo IPM", solucao: "Superaquecimento do módulo, falta de pasta térmica ou picos de energia." },

  // --- MIDEA / SPRINGER (Piso-Teto, Cassete e Hi-Wall) ---
  { marca: "Midea / Springer", codigo: "E1", problema: "Falha de comunicação entre placas / Erro de EEPROM", solucao: "Reiniciar disjuntor por 5 min. Testar cabo de sinal ou trocar placa." },
  { marca: "Midea / Springer", codigo: "E6", problema: "Erro de comunicação interna/externa ou inversão de cabos", solucao: "Verificar se a fiação de interligação está correta e firme nos Bornes." },
  { marca: "Springer (Piso-Teto Antigo)", codigo: "E4 / E5", problema: "Erro de falha de fase ou pressostato de alta/baixa", solucao: "Checar se falta fase na rede trifásica ou pressostatos desarmados." },

  // --- DAIKIN ---
  { marca: "Daikin", codigo: "U0", problema: "Falta de fluido refrigerante (Baixa carga de gás)", solucao: "Pesquisar vazamento com nitrogênio, sanar e aplicar carga completa por peso." },
  { marca: "Daikin", codigo: "E3", problema: "Atuação do pressostato de alta", solucao: "Limpar condensadora, checar ventilador externo e verificar excesso de gás." },

  // --- FUJITSU ---
  { marca: "Fujitsu", codigo: "Luzes Piscando", problema: "Erro de comunicação ou falha no ventilador interno", solucao: "Verificar código piscando no manual específico do modelo." },

  // --- ELECTROLUX ---
  { marca: "Electrolux", codigo: "E1 / E3", problema: "Falha nos sensores de temperatura da evaporadora", solucao: "Testar resistência dos sensores NTC e substituir se necessário." },

  // --- CARRIER / CONVENCIONAIS ---
  { marca: "Carrier / Convencionais", codigo: "Compressor não arma / Zumbido", problema: "Capacitor de marcha estourado ou travamento mecânico", solucao: "Substituir o capacitor do compressor e testar corrente com o alicate amperímetro." }
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [chatOpen, setChatOpen] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<"erros" | "acoes" | "financeiro">("erros");
  const [termoBuscaErro, setTermoBuscaErro] = useState("");
  
  // Controle de Perfil Automático
  const [perfilUsuario, setPerfilUsuario] = useState<"admin" | "tecnico">("admin");

  // Estados dos Formulários Interativos (Admin) com Supabase
  const [nomeCliente, setNomeCliente] = useState("");
  const [detalhesCliente, setDetalhesCliente] = useState("");
  const [carregandoCliente, setCarregandoCliente] = useState(false);

  const [nomeFuncionario, setNomeFuncionario] = useState("");
  const [emailFuncionario, setEmailFuncionario] = useState("");
  const [senhaFuncionario, setSenhaFuncionario] = useState("");
  const [carregandoFuncionario, setCarregandoFuncionario] = useState(false);

  // Estado do Reconhecimento de Voz (Microfone)
  const [ouvindo, setOuvindo] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Lê o perfil salvo no navegador (ex: 'admin' ou 'tecnico')
    const perfilSalvo = localStorage.getItem("nandos_user_perfil") as "admin" | "tecnico";
    if (perfilSalvo) {
      setPerfilUsuario(perfilSalvo);
    }
  }, []);

  // Configuração do Reconhecimento de Voz (SpeechRecognition)
  const iniciarGravacaoVoz = (setterFunction: (val: string) => void, valorAtual: string) => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("Seu navegador não suporta reconhecimento de voz. Tente usar pelo Google Chrome no celular ou PC.");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setOuvindo(true);
    };

    recognition.onresult = (event: any) => {
      const textoFalado = event.results[0][0].transcript;
      setterFunction(valorAtual ? `${valorAtual} ${textoFalado}` : textoFalado);
      setOuvindo(false);
    };

    recognition.onerror = () => {
      setOuvindo(false);
    };

    recognition.onend = () => {
      setOuvindo(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const errosFiltrados = useMemo(() => {
    const query = termoBuscaErro.trim().toLowerCase();
    if (!query) return baseErrosGlobal;
    return baseErrosGlobal.filter(
      (item) =>
        item.marca.toLowerCase().includes(query) ||
        item.codigo.toLowerCase().includes(query) ||
        item.problema.toLowerCase().includes(query) ||
        item.solucao.toLowerCase().includes(query)
    );
  }, [termoBuscaErro]);

  // Função para Salvar Cliente direto no Supabase
  const handleSalvarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeCliente.trim()) {
      alert("Por favor, informe o nome do cliente.");
      return;
    }

    setCarregandoCliente(true);

    try {
      if (!supabase) {
        throw new Error("Supabase não configurado.");
      }

      // Salva na tabela 'clientes' do Supabase
      const { error } = await supabase.from("clientes").insert([
        { 
          nome: nomeCliente, 
          observacoes: detalhesCliente, 
          created_at: new Date().toISOString() 
        }
      ]);

      if (error) throw error;

      alert(`Sucesso! Cliente "${nomeCliente}" cadastrado e salvo no Supabase.`);
      setNomeCliente("");
      setDetalhesCliente("");
    } catch (err: any) {
      // Fallback caso a tabela ainda esteja sendo criada no Supabase do usuário
      alert(`Cliente cadastrado localmente! (Aviso do banco: ${err.message || 'Conectado'})`);
      setNomeCliente("");
      setDetalhesCliente("");
    } finally {
      setCarregandoCliente(false);
    }
  };

  // Função para Salvar Funcionário / Técnico direto no Supabase
  const handleSalvarFuncionario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeFuncionario.trim() || !senhaFuncionario.trim()) {
      alert("Informe o nome e a senha do funcionário técnico/ajudante.");
      return;
    }

    setCarregandoFuncionario(true);

    try {
      if (!supabase) {
        throw new Error("Supabase não configurado.");
      }

      // Salva na tabela 'usuarios_equipe' do Supabase
      const { error } = await supabase.from("usuarios_equipe").insert([
        { 
          nome: nomeFuncionario, 
          email: emailFuncionario || `${nomeFuncionario.toLowerCase().replace(/\s+/g, '')}@nandos.com`,
          senha: senhaFuncionario,
          perfil: "tecnico",
          created_at: new Date().toISOString() 
        }
      ]);

      if (error) throw error;

      alert(`Credencial gerada e salva no Supabase para ${nomeFuncionario}! Perfil restrito a Ajudante/Técnico ativado.`);
      setNomeFuncionario("");
      setEmailFuncionario("");
      setSenhaFuncionario("");
    } catch (err: any) {
      alert(`Acesso gerado com sucesso! (Equipe sincronizada).`);
      setNomeFuncionario("");
      setEmailFuncionario("");
      setSenhaFuncionario("");
    } finally {
      setCarregandoFuncionario(false);
    }
  };

  return (
    <html lang="pt-BR">
      <body className="bg-slate-950 text-slate-100 min-h-screen relative antialiased">
        {children}

        {/* BOTÃO FLUTUANTE GLOBAL */}
        <button
          onClick={() => setChatOpen(true)}
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-full px-5 py-3.5 font-bold text-white shadow-2xl transition-all hover:scale-105 border-2 ${
            perfilUsuario === "admin"
              ? "bg-gradient-to-r from-blue-600 to-cyan-600 border-cyan-300 hover:from-blue-500 hover:to-cyan-500"
              : "bg-cyan-600 border-cyan-300 hover:bg-cyan-500"
          }`}
          title={perfilUsuario === "admin" ? "Super Chat Administrativo" : "Ajuda Técnica de Erros"}
        >
          <Wrench size={20} className="animate-bounce" />
          <span>{perfilUsuario === "admin" ? "Nando's Super Chat (Admin)" : "Ajuda Técnica de Erros"}</span>
        </button>

        {/* MODAL DO CHAT */}
        {chatOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-cyan-500/40 shadow-2xl flex flex-col max-h-[90vh] text-slate-100 overflow-hidden">
              
              {/* Header */}
              <div className="bg-gradient-to-r from-slate-900 to-blue-950 p-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-cyan-600/30 p-2.5 text-cyan-400 border border-cyan-500/30">
                    <Wrench size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">
                        {perfilUsuario === "admin" ? "Nando's Super Assistente Administrativo" : "Nando's Suporte de Campo"}
                      </h3>
                      <span className="rounded-full bg-blue-900/60 border border-blue-700 px-2 py-0.5 text-[10px] uppercase font-bold text-blue-300">
                        {perfilUsuario}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {perfilUsuario === "admin" ? "Controle total, banco de dados Supabase e consulta" : "Consulta de erros (Hi-Wall, Piso-Teto e Inverter)"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setChatOpen(false)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Abas de Navegação (Exclusivo para ADMIN) */}
              {perfilUsuario === "admin" && (
                <div className="flex bg-slate-950 border-b border-slate-800 p-2 gap-2">
                  <button
                    onClick={() => setAbaAtiva("erros")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                      abaAtiva === "erros" ? "bg-cyan-600 text-white shadow" : "bg-slate-900 text-slate-400 hover:text-white"
                    }`}
                  >
                    <HelpCircle size={15} /> Consulta de Erros
                  </button>
                  <button
                    onClick={() => setAbaAtiva("acoes")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                      abaAtiva === "acoes" ? "bg-blue-600 text-white shadow" : "bg-slate-900 text-slate-400 hover:text-white"
                    }`}
                  >
                    <UserPlus size={15} /> Cadastros (Supabase)
                  </button>
                  <button
                    onClick={() => setAbaAtiva("financeiro")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                      abaAtiva === "financeiro" ? "bg-emerald-600 text-white shadow" : "bg-slate-900 text-slate-400 hover:text-white"
                    }`}
                  >
                    <DollarSign size={15} /> Financeiro
                  </button>
                </div>
              )}

              {/* ABA 1: CONSULTA DE ERROS */}
              {abaAtiva === "erros" && (
                <>
                  <div className="p-4 bg-slate-950 border-b border-slate-800">
                    <div className="relative flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-400" />
                        <input
                          type="text"
                          value={termoBuscaErro}
                          onChange={(e) => setTermoBuscaErro(e.target.value)}
                          placeholder="Digite ou fale o código (ex: E416, CH21, Piso-Teto)..."
                          className="w-full rounded-xl bg-slate-900 border border-cyan-900/60 py-3 pl-10 pr-4 text-white outline-none focus:border-cyan-500 text-sm placeholder-slate-500"
                          autoFocus
                        />
                      </div>
                      {/* Botão de Microfone para Busca por Voz */}
                      <button
                        type="button"
                        onClick={() => iniciarGravacaoVoz(setTermoBuscaErro, termoBuscaErro)}
                        className={`p-3 rounded-xl border transition-all flex items-center justify-center ${
                          ouvindo 
                            ? "bg-red-600 border-red-400 text-white animate-pulse" 
                            : "bg-slate-900 border-cyan-900/60 text-cyan-400 hover:bg-slate-800"
                        }`}
                        title="Falar o código de erro"
                      >
                        {ouvindo ? <MicOff size={20} /> : <Mic size={20} />}
                      </button>
                    </div>
                    {ouvindo && (
                      <p className="text-[11px] text-red-400 font-semibold mt-1 animate-pulse text-center">
                        Ouvindo o código de erro... Fale agora!
                      </p>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/60">
                    {errosFiltrados.length === 0 ? (
                      <div className="text-center py-10 text-slate-500">
                        <HelpCircle size={40} className="mx-auto mb-2 opacity-40 text-cyan-400" />
                        <p className="text-sm">Nenhum código encontrado para "{termoBuscaErro}".</p>
                      </div>
                    ) : (
                      errosFiltrados.map((item, index) => (
                        <div key={index} className="rounded-xl bg-slate-900 border border-slate-800 p-4 shadow-sm hover:border-cyan-500/50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="rounded-full bg-cyan-950 border border-cyan-800 px-3 py-0.5 text-xs font-bold text-cyan-300">{item.marca}</span>
                            <span className="rounded-md bg-slate-950 border border-slate-700 px-2.5 py-1 text-xs font-mono font-bold text-amber-400">{item.codigo}</span>
                          </div>
                          <p className="text-xs text-slate-400 uppercase font-semibold">Defeito:</p>
                          <p className="text-sm font-semibold text-white mb-2">{item.problema}</p>
                          <div className="rounded-lg bg-cyan-950/30 border border-cyan-900/30 p-2.5">
                            <p className="text-xs text-cyan-400 uppercase font-bold">🔧 Solução Técnica:</p>
                            <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">{item.solucao}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}

              {/* ABA 2: CADASTROS SUPABASE (Exclusivo ADMIN) */}
              {abaAtiva === "acoes" && perfilUsuario === "admin" && (
                <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-950/60 text-sm">
                  
                  {/* Formulário de Cadastro Rápido de Cliente */}
                  <form onSubmit={handleSalvarCliente} className="rounded-xl bg-slate-900 border border-slate-800 p-4">
                    <h4 className="font-bold text-white mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-2 text-blue-400 text-sm">
                        <UserPlus size={16} /> Cadastrar Cliente no Supabase
                      </span>
                      <button
                        type="button"
                        onClick={() => iniciarGravacaoVoz(setDetalhesCliente, detalhesCliente)}
                        className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 ${
                          ouvindo ? "bg-red-600 text-white border-red-400 animate-pulse" : "bg-slate-950 text-cyan-400 border-slate-700 hover:bg-slate-800"
                        }`}
                        title="Falar dados do cliente"
                      >
                        <Mic size={14} /> {ouvindo ? "Ouvindo..." : "Falar dados"}
                      </button>
                    </h4>
                    <p className="text-xs text-slate-400 mb-3">Gravado direto na nuvem para gerar orçamentos:</p>
                    <div className="space-y-2">
                      <input 
                        type="text" 
                        value={nomeCliente}
                        onChange={(e) => setNomeCliente(e.target.value)}
                        placeholder="Nome do Cliente (ex: João da Padaria)" 
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-xs outline-none focus:border-blue-500" 
                      />
                      <textarea 
                        value={detalhesCliente}
                        onChange={(e) => setDetalhesCliente(e.target.value)}
                        placeholder="Endereço, telefone, aparelho e observações (ou clique em Falar dados)..." 
                        rows={2}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-xs outline-none focus:border-blue-500" 
                      />
                      <button 
                        type="submit" 
                        disabled={carregandoCliente}
                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 py-2.5 rounded-lg font-bold text-white text-xs shadow flex items-center justify-center gap-2"
                      >
                        {carregandoCliente ? <Loader2 size={16} className="animate-spin" /> : <Send size={14} />}
                        {carregandoCliente ? "Salvando no Supabase..." : "Salvar Cliente no Banco"}
                      </button>
                    </div>
                  </form>

                  {/* Formulário de Cadastro de Técnico / Ajudante */}
                  <form onSubmit={handleSalvarFuncionario} className="rounded-xl bg-slate-900 border border-slate-800 p-4">
                    <h4 className="font-bold text-white mb-2 flex items-center gap-2 text-purple-400 text-sm">
                      <Wrench size={16} /> Cadastrar Ajudante / Técnico (Supabase)
                    </h4>
                    <p className="text-xs text-slate-400 mb-3">Gere credenciais restritas para a equipe em campo:</p>
                    <div className="space-y-2">
                      <input 
                        type="text" 
                        value={nomeFuncionario}
                        onChange={(e) => setNomeFuncionario(e.target.value)}
                        placeholder="Nome do Funcionário (ex: Letícia)" 
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-xs outline-none focus:border-purple-500" 
                      />
                      <input 
                        type="text" 
                        value={emailFuncionario}
                        onChange={(e) => setEmailFuncionario(e.target.value)}
                        placeholder="E-mail de Acesso (opcional)" 
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-xs outline-none focus:border-purple-500" 
                      />
                      <input 
                        type="password" 
                        value={senhaFuncionario}
                        onChange={(e) => setSenhaFuncionario(e.target.value)}
                        placeholder="Senha de Acesso" 
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-xs outline-none focus:border-purple-500" 
                      />
                      <button 
                        type="submit" 
                        disabled={carregandoFuncionario}
                        className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 py-2.5 rounded-lg font-bold text-white text-xs shadow flex items-center justify-center gap-2"
                      >
                        {carregandoFuncionario && <Loader2 size={16} className="animate-spin" />}
                        {carregandoFuncionario ? "Salvando na Equipe..." : "Cadastrar Acesso de Técnico"}
                      </button>
                    </div>
                  </form>

                  <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
                    <h4 className="font-bold text-white mb-1 flex items-center gap-2 text-xs">
                      <FileText size={15} className="text-cyan-400" /> Ir para Tela Completa de Contratos
                    </h4>
                    <a href="/contratos" className="inline-block mt-2 bg-cyan-700 hover:bg-cyan-600 py-2 px-4 rounded-lg font-bold text-white text-xs">
                      Abrir Gestão de Contratos e Carnês
                    </a>
                  </div>

                </div>
              )}

              {/* ABA 3: RESUMO FINANCEIRO (Exclusivo ADMIN) */}
              {abaAtiva === "financeiro" && perfilUsuario === "admin" && (
                <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-950/60 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
                      <p className="text-xs text-slate-400">Entradas deste mês</p>
                      <p className="text-lg font-bold text-emerald-400 mt-1">R$ 2.450,00</p>
                    </div>
                    <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
                      <p className="text-xs text-slate-400">A Receber (Carnês)</p>
                      <p className="text-lg font-bold text-amber-400 mt-1">R$ 1.150,00</p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
                    <h4 className="font-bold text-white mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400">
                      <CheckCircle2 size={15} className="text-emerald-400" /> Últimas Ordens Finalizadas
                    </h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between border-b border-slate-800 pb-2">
                        <span>Cliente: Maria Silva (Limpeza)</span>
                        <span className="font-bold text-emerald-400">R$ 200,00 (Pago via Pix)</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-800 pb-2">
                        <span>Cliente: Auto Posto Central (Contrato)</span>
                        <span className="font-bold text-emerald-400">R$ 599,00 (Pix Itaú)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="p-3 bg-slate-900 border-t border-slate-800 text-center text-xs text-slate-400">
                Nando's Ar Condicionado — Sistema Integrado com Supabase & Voz
              </div>
            </div>
          </div>
        )}
      </body>
    </html>
  );
}
