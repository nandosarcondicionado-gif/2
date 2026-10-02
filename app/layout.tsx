"use client";

import type { Metadata } from "next";
import "./globals.css";
import { useState, useMemo, useEffect } from "react";
import { Wrench, Search, HelpCircle, X, DollarSign, FileText, UserPlus, CheckCircle2 } from "lucide-react";

// Base de Dados Expandida: Inclui Equipamentos Modernos (Inverter/Split) e Modelos Convencionais/Antigos
const baseErrosGlobal = [
  // --- SAMSUNG (Modernos e Antigos) ---
  { marca: "Samsung", codigo: "E121 / E122", problema: "Erro no sensor de temperatura ambiente ou da bobina interna", solucao: "Verificar conector solto ou substituir o sensor NTC da evaporadora." },
  { marca: "Samsung", codigo: "E416 / C416", problema: "Compressor superaquecido (Temperatura de descarga alta)", solucao: "Falta de gás refrigerante, condensadora muito suja ou compressor forçado." },
  { marca: "Samsung", codigo: "E458", problema: "Erro no motor do ventilador externo (DC Fan)", solucao: "Verificar se o ventilador está travado, cabo mal conectado ou placa externa com defeito." },
  { marca: "Samsung", codigo: "E554 / C554", problema: "Erro de vazamento de gás refrigerante", solucao: "Realizar teste de pressão com nitrogênio, corrigir vazamento e refazer carga de gás." },
  { marca: "Samsung", codigo: "C101 / E101", problema: "Erro de comunicação entre unidades (Interna e Externa)", solucao: "Checar se o cabo de comunicação/sinal está rompido, oxidado ou mal conectado." },
  { marca: "Samsung (Antigo)", codigo: "Luzes Timer/Operation Piscando", problema: "Falha geral de sistema ou sensor aberto em modelos antigos Max / Borborema", solucao: "Testar sensores de temperatura e placa de controle principal." },

  // --- LG (Modernos e Convencionais) ---
  { marca: "LG", codigo: "CH21", problema: "Sobrecorrente no módulo IPM / Compressor", solucao: "Oscilação de tensão elétrica, compressor travado ou defeito na placa inverter." },
  { marca: "LG", codigo: "CH22", problema: "Corrente alta na unidade condensadora", solucao: "Falta de gás, condensadora excessivamente suja ou ventilação externa bloqueada." },
  { marca: "LG", codigo: "CH23", problema: "Baixa tensão no barramento DC da placa", solucao: "Verificar rede elétrica do cliente, disjuntor inadequado ou placa de potência." },
  { marca: "LG", codigo: "CH26", problema: "Compressor DC travado mecanicamente", solucao: "Desligar sistema, testar enrolamentos. Se travado, substituir compressor." },
  { marca: "LG", codigo: "CH05", problema: "Falha de comunicação entre evaporadora e condensadora", solucao: "Verificar fiação de sinal interligação entre as unidades." },
  { marca: "LG (Convencional Antigo)", codigo: "CH01 / CH02", problema: "Erro no sensor de temperatura do ar interno ou da serpentina", solucao: "Substituir sensor NTC na placa dos modelos convencionais antigos." },

  // --- GREE ---
  { marca: "Gree", codigo: "E1", problema: "Proteção por alta pressão de refrigerante", solucao: "Excesso de gás, condensadora bloqueada ou temperatura externa excessiva." },
  { marca: "Gree", codigo: "E2", problema: "Proteção anti-congelamento da evaporadora", solucao: "Filtros de ar muito sujos, fluxo de ar bloqueado ou baixa carga de gás." },
  { marca: "Gree", codigo: "E3", problema: "Proteção por baixa pressão de refrigerante", solucao: "Falta de gás por vazamento ou restrição na tubulação." },
  { marca: "Gree", codigo: "H5", problema: "Proteção do Módulo IPM", solucao: "Superaquecimento do módulo, falta de pasta térmica ou picos de energia." },

  // --- MIDEA / SPRINGER (Linha Antiga Convencional e Inverter) ---
  { marca: "Midea / Springer", codigo: "E1", problema: "Falha de comunicação entre placas / Erro de EEPROM", solucao: "Reiniciar disjuntor por 5 min. Testar cabo de sinal ou trocar placa." },
  { marca: "Midea / Springer", codigo: "E6", problema: "Erro de comunicação interna/externa ou inversão de cabos", solucao: "Verificar se a fiação de interligação está correta e firme nos Bornes." },
  { marca: "Springer (Janela Antigo)", codigo: "Luz de Operation Piscando", problema: "Termostato mecânico com defeito ou protetor térmico do compressor aberto", solucao: "Aguardar resfriamento do compressor ou substituir termostato/capacitor." },

  // --- DAIKIN ---
  { marca: "Daikin", codigo: "U0", problema: "Falta de fluido refrigerante (Baixa carga de gás)", solucao: "Pesquisar vazamento com nitrogênio, sanar e aplicar carga completa por peso." },
  { marca: "Daikin", codigo: "E3", problema: "Atuação do pressostato de alta", solucao: "Limpar condensadora, checar ventilador externo e verificar excesso de gás." },

  // --- FUJITSU ---
  { marca: "Fujitsu", codigo: "Luzes Piscando (Operation + Timer)", problema: "Erro de comunicação ou falha no ventilador interno", solucao: "Verificar código piscando no manual específico do modelo." },

  // --- ELECTROLUX (Novos e Antigos) ---
  { marca: "Electrolux", codigo: "E1 / E3", problema: "Falha nos sensores de temperatura da evaporadora", solucao: "Testar resistência dos sensores NTC e substituir se necessário." },
  { marca: "Electrolux", codigo: "E4", problema: "Atuação do sistema anti-congelamento", solucao: "Limpeza de filtros e verificação de ventilação interna." },

  // --- CONSUL E BRASTEMP (Modelos Antigos e Atuais) ---
  { marca: "Consul / Brastemp", codigo: "Erro de LEDs / Bips", problema: "Sensor de temperatura solto, em curto ou placa travada", solucao: "Desligar da tomada por 10 minutos. Se persistir, medir o sensor NTC." },

  // --- CARRIER / MAXIFLO / KLIMASA (Convencionais Antigos) ---
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
  
  const [perfilUsuario, setPerfilUsuario] = useState<"admin" | "tecnico">("admin");

  useEffect(() => {
    const perfilSalvo = localStorage.getItem("nandos_user_perfil") as "admin" | "tecnico";
    if (perfilSalvo) {
      setPerfilUsuario(perfilSalvo);
    }
  }, []);

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

  return (
    <html lang="pt-BR">
      <body className="bg-slate-950 text-slate-100 min-h-screen relative antialiased">
        {children}

        {/* BOTÃO FLUTUANTE GLOBAL INTELIGENTE */}
        <button
          onClick={() => setChatOpen(true)}
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-full px-5 py-3.5 font-bold text-white shadow-2xl transition-all hover:scale-105 border-2 ${
            perfilUsuario === "admin"
              ? "bg-gradient-to-r from-blue-600 to-cyan-600 border-cyan-300 hover:from-blue-500 hover:to-cyan-500"
              : "bg-cyan-600 border-cyan-300 hover:bg-cyan-500"
          }`}
          title={perfilUsuario === "admin" ? "Super Chat Administrativo" : "Ajuda Técnica (Erros)"}
        >
          <Wrench size={20} className="animate-bounce" />
          <span>{perfilUsuario === "admin" ? "Nando's Super Chat (Admin)" : "Ajuda Técnica de Erros"}</span>
        </button>

        {/* MODAL DO SUPER CHAT */}
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
                        {perfilUsuario === "admin" ? "Nando's Assistente Administrativo & Técnico" : "Nando's Suporte Técnico"}
                      </h3>
                      <span className="rounded-full bg-blue-900/60 border border-blue-700 px-2 py-0.5 text-[10px] uppercase font-bold text-blue-300">
                        {perfilUsuario}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {perfilUsuario === "admin" ? "Gerencie erros, atalhos e financeiro em um só lugar" : "Consulta rápida de códigos de erro (Modernos e Antigos)"}
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

              {/* Abas de Navegação (Disponíveis apenas para o Admin) */}
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
                    <UserPlus size={15} /> Ações Rápidas (Cadastros)
                  </button>
                  <button
                    onClick={() => setAbaAtiva("financeiro")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                      abaAtiva === "financeiro" ? "bg-emerald-600 text-white shadow" : "bg-slate-900 text-slate-400 hover:text-white"
                    }`}
                  >
                    <DollarSign size={15} /> Resumo Financeiro
                  </button>
                </div>
              )}

              {/* Conteúdo da Aba: Consulta de Erros */}
              {abaAtiva === "erros" && (
                <>
                  <div className="p-4 bg-slate-950 border-b border-slate-800">
                    <div className="relative">
                      <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-400" />
                      <input
                        type="text"
                        value={termoBuscaErro}
                        onChange={(e) => setTermoBuscaErro(e.target.value)}
                        placeholder="Busque por código (E416, CH21), marca ou máquina antiga..."
                        className="w-full rounded-xl bg-slate-900 border border-cyan-900/60 py-3 pl-10 pr-4 text-white outline-none focus:border-cyan-500 text-sm placeholder-slate-500"
                        autoFocus
                      />
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

              {/* Conteúdo da Aba: Ações Rápidas (Admin) */}
              {abaAtiva === "acoes" && perfilUsuario === "admin" && (
                <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-950/60 text-sm">
                  <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
                    <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                      <UserPlus size={16} className="text-blue-400" /> Gerar Acesso para Ajudante / Técnico
                    </h4>
                    <p className="text-xs text-slate-400 mb-3">Crie um login rápido para sua equipe atuar em campo restrito:</p>
                    <div className="space-y-2">
                      <input type="text" placeholder="Nome do Ajudante (ex: Letícia)" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-xs outline-none" />
                      <input type="text" placeholder="Senha de Acesso" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-xs outline-none" />
                      <button onClick={() => alert("Credencial gerada com sucesso! A ajudante já pode acessar o sistema com restrições.")} className="w-full bg-blue-600 hover:bg-blue-500 py-2.5 rounded-lg font-bold text-white text-xs shadow">
                        Salvar e Gerar Credencial
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
                    <h4 className="font-bold text-white mb-1 flex items-center gap-2">
                      <FileText size={16} className="text-purple-400" /> Atalho de Orçamento Rápido
                    </h4>
                    <p className="text-xs text-slate-400 mb-2">Precisa iniciar um atendimento urgente? Vá direto para a tela de contratos/orçamentos.</p>
                    <a href="/contratos" className="inline-block bg-purple-600 hover:bg-purple-500 py-2 px-4 rounded-lg font-bold text-white text-xs">
                      Ir para Gestão de Contratos e Carnês
                    </a>
                  </div>
                </div>
              )}

              {/* Conteúdo da Aba: Resumo Financeiro (Admin) */}
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
                Nando's Ar Condicionado — Sistema de Gestão Inteligente
              </div>
            </div>
          </div>
        )}
      </body>
    </html>
  );
}
