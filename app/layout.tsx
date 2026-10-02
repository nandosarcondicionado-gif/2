"use client";

import type { Metadata } from "next";
import "./globals.css";
import { useState, useMemo, useEffect } from "react";
import { Wrench, Search, HelpCircle, X, DollarSign, UserPlus, Mic, MicOff, Volume2, LogOut } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

// Inicialização do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

// Base de Dados Completa de Erros
const baseErrosGlobal = [
  { marca: "samsung", marcaExibicao: "Samsung", codigo: "e121", codigoExibicao: "E121 / E122", problema: "Erro no sensor de temperatura ambiente ou da bobina interna", solucao: "Verificar conector solto ou substituir o sensor NTC da evaporadora." },
  { marca: "samsung", marcaExibicao: "Samsung", codigo: "e416", codigoExibicao: "E416 / C416", problema: "Compressor superaquecido (Temperatura de descarga alta)", solucao: "Falta de gás refrigerante, condensadora muito suja ou compressor forçado." },
  { marca: "samsung", marcaExibicao: "Samsung", codigo: "e458", codigoExibicao: "E458", problema: "Erro no motor do ventilador externo (DC Fan)", solucao: "Verificar se o ventilador está travado, cabo mal conectado ou placa externa com defeito." },
  { marca: "samsung", marcaExibicao: "Samsung", codigo: "e554", codigoExibicao: "E554 / C554", problema: "Erro de vazamento de gás refrigerante", solucao: "Realizar teste de pressão com nitrogênio, corrigir vazamento e refazer carga de gás." },
  { marca: "samsung", marcaExibicao: "Samsung", codigo: "c101", codigoExibicao: "C101 / E101", problema: "Erro de comunicação entre unidades (Interna e Externa)", solucao: "Checar se o cabo de comunicação/sinal está rompido, oxidado ou mal conectado." },
  { marca: "lg", marcaExibicao: "LG", codigo: "ch21", codigoExibicao: "CH21", problema: "Sobrecorrente no módulo IPM / Compressor", solucao: "Oscilação de tensão elétrica, compressor travado ou defeito na placa inverter." },
  { marca: "lg", marcaExibicao: "LG", codigo: "ch22", codigoExibicao: "CH22", problema: "Corrente alta na unidade condensadora", solucao: "Falta de gás, condensadora excessivamente suja ou ventilação externa bloqueada." },
  { marca: "lg", marcaExibicao: "LG", codigo: "ch23", codigoExibicao: "CH23", problema: "Baixa tensão no barramento DC da placa", solucao: "Verificar rede elétrica do cliente, disjuntor inadequado ou placa de potência." },
  { marca: "lg", marcaExibicao: "LG", codigo: "ch26", codigoExibicao: "CH26", problema: "Compressor DC travado mecanicamente", solucao: "Desligar sistema, testar enrolamentos. Se travado, substituir compressor." },
  { marca: "lg", marcaExibicao: "LG", codigo: "ch05", codigoExibicao: "CH05", problema: "Falha de comunicação entre evaporadora e condensadora", solucao: "Verificar fiação de sinal interligação entre as unidades." },
  { marca: "lg", marcaExibicao: "LG", codigo: "ch32", codigoExibicao: "CH32 / CH33", problema: "Superaquecimento na descarga do compressor (Piso-Teto/Comercial)", solucao: "Verificar restrição na linha de fluido ou limpeza da condensadora." },
  { marca: "gree", marcaExibicao: "Gree", codigo: "e1", codigoExibicao: "E1", problema: "Proteção por alta pressão de refrigerante", solucao: "Excesso de gás, condensadora bloqueada ou temperatura externa excessiva." },
  { marca: "gree", marcaExibicao: "Gree", codigo: "e2", codigoExibicao: "E2", problema: "Proteção anti-congelamento da evaporadora", solucao: "Filtros de ar muito sujos, fluxo de ar bloqueado ou baixa carga de gás." },
  { marca: "gree", marcaExibicao: "Gree", codigo: "e3", codigoExibicao: "E3", problema: "Proteção por baixa pressão de refrigerante", solucao: "Falta de gás por vazamento ou restrição na tubulação." },
  { marca: "gree", marcaExibicao: "Gree", codigo: "h5", codigoExibicao: "H5", problema: "Proteção do Módulo IPM", solucao: "Superaquecimento do módulo, falta de pasta térmica ou picos de energia." },
  { marca: "midea", marcaExibicao: "Midea / Springer", codigo: "e1", codigoExibicao: "E1", problema: "Falha de comunicação entre placas / Erro de EEPROM", solucao: "Reiniciar disjuntor por 5 min. Testar cabo de sinal ou trocar placa." },
  { marca: "midea", marcaExibicao: "Midea / Springer", codigo: "e6", codigoExibicao: "E6", problema: "Erro de comunicação interna/externa ou inversão de cabos", solucao: "Verificar se a fiação de interligação está correta e firme nos Bornes." },
  { marca: "daikin", marcaExibicao: "Daikin", codigo: "u0", codigoExibicao: "U0", problema: "Falta de fluido refrigerante (Baixa carga de gás)", solucao: "Pesquisar vazamento com nitrogênio, sanar e aplicar carga completa por peso." },
  { marca: "daikin", marcaExibicao: "Daikin", codigo: "e3", codigoExibicao: "E3", problema: "Atuação do pressostato de alta", solucao: "Limpar condensadora, checar ventilador externo e verificar excesso de gás." },
  { marca: "electrolux", marcaExibicao: "Electrolux", codigo: "e1", codigoExibicao: "E1 / E3", problema: "Falha nos sensores de temperatura da evaporadora", solucao: "Testar resistência dos sensores NTC e substituir se necessário." }
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [chatOpen, setChatOpen] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<"erros" | "acoes" | "financeiro">("erros");
  const [termoBuscaErro, setTermoBuscaErro] = useState("");
  
  // Validação síncrona imediata no carregamento do estado para evitar atrasos visuais
  const [ehAdmin, setEhAdmin] = useState(() => {
    if (typeof window !== "undefined") {
      const rotaAtual = window.location.pathname;
      if (rotaAtual.includes("login") || rotaAtual.includes("auth")) {
        return false;
      }
      return localStorage.getItem("nandos_user_perfil") === "admin";
    }
    return false;
  });

  const [nomeCliente, setNomeCliente] = useState("");
  const [detalhesCliente, setDetalhesCliente] = useState("");
  const [carregandoCliente, setCarregandoCliente] = useState(false);
  const [ouvindo, setOuvindo] = useState(false);

  // Validação contínua do perfil administrativo
  useEffect(() => {
    const verificarAcessoAdmin = () => {
      const rotaAtual = window.location.pathname;
      
      // Se estiver na tela de login, esconde o painel administrativo
      if (rotaAtual.includes("login") || rotaAtual.includes("auth")) {
        setEhAdmin(false);
        return;
      }

      // Verifica se o perfil salvo no navegador é estritamente admin
      const perfilSalvo = localStorage.getItem("nandos_user_perfil");
      setEhAdmin(perfilSalvo === "admin");
    };

    verificarAcessoAdmin();
    window.addEventListener("focus", verificarAcessoAdmin);
    return () => window.removeEventListener("focus", verificarAcessoAdmin);
  }, []);

  // FUNÇÃO DE LOGOUT / LIMPEZA COMPLETA DO SISTEMA
  const realizarLogoutCompleto = () => {
    // Apaga absolutamente tudo da memória do navegador para garantir segurança total
    localStorage.clear();
    sessionStorage.clear();
    setEhAdmin(false);
    setChatOpen(false);
    
    // Redireciona para a página de login
    window.location.href = "/login";
  };

  const falarTexto = (texto: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(texto);
      utterance.lang = "pt-BR";
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    }
  };

  const iniciarBuscaPorVoz = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("Seu navegador não suporta reconhecimento de voz.");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setOuvindo(true);
      setChatOpen(true);
    };

    recognition.onresult = (event: any) => {
      const textoFalado = event.results[0][0].transcript.toLowerCase().trim();
      setTermoBuscaErro(textoFalado);
      setOuvindo(false);

      const queryLimpa = textoFalado.replace(/[\s-_]/g, "");
      const encontrado = baseErrosGlobal.find((item) => {
        return queryLimpa.includes(item.codigo) || queryLimpa.includes(item.marca) || item.codigo.includes(queryLimpa);
      });

      if (encontrado) {
        falarTexto(`Encontrado! ${encontrado.marcaExibicao}, erro ${encontrado.codigoExibicao}. Solução: ${encontrado.solucao}`);
      }
    };

    recognition.onerror = () => setOuvindo(false);
    recognition.onend = () => setOuvindo(false);

    recognition.start();
  };

  const errosFiltrados = useMemo(() => {
    const query = termoBuscaErro.trim().toLowerCase();
    if (!query) return baseErrosGlobal;

    const queryLimpa = query.replace(/[\s-_]/g, "");

    return baseErrosGlobal.filter((item) => {
      const textoCompleto = `${item.marca} ${item.codigo} ${item.problema.toLowerCase()} ${item.solucao.toLowerCase()}`;
      const codigoLimpo = item.codigo.replace(/[\s-_]/g, "");

      return (
        textoCompleto.includes(query) ||
        codigoLimpo.includes(queryLimpa) ||
        queryLimpa.includes(codigoLimpo)
      );
    });
  }, [termoBuscaErro]);

  const handleSalvarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ehAdmin) return alert("Acesso negado.");
    if (!nomeCliente.trim()) return alert("Informe o nome do cliente.");
    
    setCarregandoCliente(true);
    try {
      if (supabase) {
        await supabase.from("clientes").insert([{ nome: nomeCliente, observacoes: detalhesCliente, created_at: new Date().toISOString() }]);
      }
      alert("Cliente salvo com sucesso!");
      setNomeCliente("");
      setDetalhesCliente("");
    } catch (err) {
      alert("Erro ao salvar cliente.");
    } finally {
      setCarregandoCliente(false);
    }
  };

  return (
    <html lang="pt-BR">
      <body className="bg-slate-950 text-slate-100 min-h-screen relative antialiased">
        {children}

        {/* 🔒 ESSES BOTÕES FLUTUANTES APARECEM APENAS PARA O ADMINISTRADOR */}
        {ehAdmin && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
            <button
              onClick={iniciarBuscaPorVoz}
              className={`flex items-center gap-2 rounded-full px-5 py-3.5 font-bold text-white shadow-2xl transition-all border-2 ${
                ouvindo ? "bg-red-600 border-red-300 animate-pulse" : "bg-gradient-to-r from-emerald-600 to-cyan-600 border-cyan-300 hover:scale-105"
              }`}
              title="Toque e fale o código do erro"
            >
              {ouvindo ? <MicOff size={22} className="animate-bounce" /> : <Mic size={20} />}
              <span className="text-xs">{ouvindo ? "Ouvindo..." : "Falar Erro"}</span>
            </button>

            <button
              onClick={() => setChatOpen(true)}
              className="flex items-center gap-2 rounded-full px-5 py-3.5 font-bold text-white shadow-2xl transition-all hover:scale-105 border-2 bg-gradient-to-r from-blue-600 to-cyan-600 border-cyan-300"
            >
              <Wrench size={20} />
              <span>Nando's Super Chat (Admin)</span>
            </button>
          </div>
        )}

        {/* 🔒 MODAL DO SUPER CHAT (EXCLUSIVO DO ADMINISTRADOR) */}
        {chatOpen && ehAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-cyan-500/40 shadow-2xl flex flex-col max-h-[90vh] text-slate-100 overflow-hidden">
              
              <div className="bg-gradient-to-r from-slate-900 to-blue-950 p-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-cyan-600/30 p-2.5 text-cyan-400 border border-cyan-500/30">
                    <Wrench size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Nando's Super Assistente Administrativo</h3>
                    <p className="text-xs text-slate-400">Controle total, banco de dados Supabase e consulta</p>
                  </div>
                </div>
                
                {/* Botões do Topo: Sair Completo e Fechar Modal */}
                <div className="flex items-center gap-2">
                  <button 
                    onClick={realizarLogoutCompleto} 
                    className="flex items-center gap-1.5 bg-red-900/70 hover:bg-red-800 text-red-100 border border-red-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow"
                    title="Encerra a sessão e apaga dados do aparelho"
                  >
                    <LogOut size={14} /> Sair / Desconectar
                  </button>
                  <button onClick={() => setChatOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white">
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* ABAS DO ADMINISTRADOR */}
              <div className="flex bg-slate-950 border-b border-slate-800 p-2 gap-2">
                <button onClick={() => setAbaAtiva("erros")} className={`flex-1 py-2 rounded-lg text-xs font-semibold ${abaAtiva === "erros" ? "bg-cyan-600 text-white" : "bg-slate-900 text-slate-400"}`}>
                  <HelpCircle size={15} className="inline mr-1" /> Consulta de Erros
                </button>
                <button onClick={() => setAbaAtiva("acoes")} className={`flex-1 py-2 rounded-lg text-xs font-semibold ${abaAtiva === "acoes" ? "bg-blue-600 text-white" : "bg-slate-900 text-slate-400"}`}>
                  <UserPlus size={15} className="inline mr-1" /> Cadastros (Supabase)
                </button>
                <button onClick={() => setAbaAtiva("financeiro")} className={`flex-1 py-2 rounded-lg text-xs font-semibold ${abaAtiva === "financeiro" ? "bg-emerald-600 text-white" : "bg-slate-900 text-slate-400"}`}>
                  <DollarSign size={15} className="inline mr-1" /> Financeiro
                </button>
              </div>

              {/* ABA DE ERROS */}
              {abaAtiva === "erros" && (
                <>
                  <div className="p-4 bg-slate-950 border-b border-slate-800">
                    <div className="relative flex items-center gap-2">
                      <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-400" />
                      <input
                        type="text"
                        value={termoBuscaErro}
                        onChange={(e) => setTermoBuscaErro(e.target.value)}
                        placeholder="Digite ou clique em Falar Erro..."
                        className="w-full rounded-xl bg-slate-900 border border-cyan-900/60 py-3 pl-10 pr-4 text-white outline-none text-sm"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={iniciarBuscaPorVoz}
                        className="p-3 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-white flex items-center gap-1"
                        title="Falar"
                      >
                        <Mic size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/60">
                    {errosFiltrados.length === 0 ? (
                      <div className="text-center py-10 text-slate-500">
                        <HelpCircle size={40} className="mx-auto mb-2 opacity-40 text-cyan-400" />
                        <p className="text-sm">Nenhum código encontrado para "{termoBuscaErro}".</p>
                      </div>
                    ) : (
                      errosFiltrados.map((item, index) => (
                        <div key={index} className="rounded-xl bg-slate-900 border border-slate-800 p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="rounded-full bg-cyan-950 border border-cyan-800 px-3 py-0.5 text-xs font-bold text-cyan-300">{item.marcaExibicao}</span>
                            <span className="rounded-md bg-slate-950 border border-slate-700 px-2.5 py-1 text-xs font-mono font-bold text-amber-400">{item.codigoExibicao}</span>
                          </div>
                          <p className="text-sm font-semibold text-white mb-2">{item.problema}</p>
                          <div className="rounded-lg bg-cyan-950/30 border border-cyan-900/30 p-2.5 flex items-center justify-between">
                            <div>
                              <p className="text-xs text-cyan-400 uppercase font-bold">🔧 Solução:</p>
                              <p className="text-xs text-slate-200 mt-0.5">{item.solucao}</p>
                            </div>
                            <button onClick={() => falarTexto(item.solucao)} className="p-2 bg-cyan-600/30 rounded-lg text-cyan-300 hover:bg-cyan-600/50" title="Ouvir solução">
                              <Volume2 size={18} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}

              {/* ABA DE CADASTROS */}
              {abaAtiva === "acoes" && (
                <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-950/60 text-sm">
                  <form onSubmit={handleSalvarCliente} className="rounded-xl bg-slate-900 border border-slate-800 p-4 space-y-2">
                    <h4 className="font-bold text-blue-400 text-sm">Cadastrar Cliente (Supabase)</h4>
                    <input type="text" value={nomeCliente} onChange={(e) => setNomeCliente(e.target.value)} placeholder="Nome do Cliente" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-xs" />
                    <textarea value={detalhesCliente} onChange={(e) => setDetalhesCliente(e.target.value)} placeholder="Endereço / Aparelho" rows={2} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-xs" />
                    <button type="submit" disabled={carregandoCliente} className="w-full bg-blue-600 py-2.5 rounded-lg font-bold text-white text-xs">Salvar Cliente</button>
                  </form>
                </div>
              )}

              {/* ABA FINANCEIRO */}
              {abaAtiva === "financeiro" && (
                <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-950/60 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
                      <p className="text-xs text-slate-400">Entradas deste mês</p>
                      <p className="text-lg font-bold text-emerald-400 mt-1">R$ 2.450,00</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-3 bg-slate-900 border-t border-slate-800 text-center text-xs text-slate-400 flex items-center justify-between px-4">
                <span>Nando's Ar Condicionado — Painel Exclusivo do Administrador</span>
                <button onClick={realizarLogoutCompleto} className="text-red-400 hover:underline text-xs font-semibold flex items-center gap-1">
                  <LogOut size={12} /> Desconectar Sessão
                </button>
              </div>
            </div>
          </div>
        )}
      </body>
    </html>
  );
}
