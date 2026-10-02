"use client";

import type { Metadata } from "next";
import "./globals.css";
import { useState, useMemo } from "react";
import { Wrench, Search, HelpCircle, X } from "lucide-react";

// Base de Dados Completa com Códigos de Erro de Praticamente Todas as Marcas
const baseErrosGlobal = [
  // SAMSUNG
  { marca: "Samsung", codigo: "E121 / E122", problema: "Erro no sensor de temperatura ambiente ou da bobina interna", solucao: "Verificar conector solto ou substituir o sensor NTC da evaporadora." },
  { marca: "Samsung", codigo: "E416 / C416", problema: "Compressor superaquecido (Temperatura de descarga alta)", solucao: "Falta de gás refrigerante, condensadora muito suja ou compressor forçado." },
  { marca: "Samsung", codigo: "E458", problema: "Erro no motor do ventilador externo (DC Fan)", solucao: "Verificar se o ventilador está travado, cabo mal conectado ou placa externa com defeito." },
  { marca: "Samsung", codigo: "E554 / C554", problema: "Erro de vazamento de gás refrigerante", solucao: "Realizar teste de pressão com nitrogênio, corrigir vazamento e refazer carga de gás." },
  { marca: "Samsung", codigo: "C101 / E101", problema: "Erro de comunicação entre unidades (Interna e Externa)", solucao: "Checar se o cabo de comunicação/sinal está rompido, oxidado ou mal conectado." },
  { marca: "Samsung", codigo: "E202", problema: "Falha de comunicação entre unidade interna e controle/painel", solucao: "Verificar alimentação elétrica e cabos do display." },

  // LG
  { marca: "LG", codigo: "CH21", problema: "Sobrecorrente no módulo IPM / Compressor", solucao: "Oscilação de tensão elétrica, compressor travado ou defeito na placa inverter." },
  { marca: "LG", codigo: "CH22", problema: "Corrente alta na unidade condensadora", solucao: "Falta de gás, condensadora excessivamente suja ou ventilação externa bloqueada." },
  { marca: "LG", codigo: "CH23", problema: "Baixa tensão no barramento DC da placa", solucao: "Verificar rede elétrica do cliente, disjuntor inadequado ou placa de potência." },
  { marca: "LG", codigo: "CH26", problema: "Compressor DC travado mecanicamente", solucao: "Desligar sistema, testar enrolamentos. Se travado, substituir compressor." },
  { marca: "LG", codigo: "CH05", problema: "Falha de comunicação entre evaporadora e condensadora", solucao: "Verificar fiação de sinal interligação entre as unidades." },
  { marca: "LG", codigo: "CH32", problema: "Temperatura de descarga do compressor muito alta", solucao: "Verificar nível de fluido refrigerante (subresfriamento/superaquecimento)." },

  // GREE
  { marca: "Gree", codigo: "E1", problema: "Proteção por alta pressão de refrigerante", solucao: "Excesso de gás, condensadora bloqueada ou temperatura externa excessiva." },
  { marca: "Gree", codigo: "E2", problema: "Proteção anti-congelamento da evaporadora", solucao: "Filtros de ar muito sujos, fluxo de ar bloqueado ou baixa carga de gás." },
  { marca: "Gree", codigo: "E3", problema: "Proteção por baixa pressão de refrigerante", solucao: "Falta de gás por vazamento ou restrição na tubulação." },
  { marca: "Gree", codigo: "E4", problema: "Alta temperatura de descarga do compressor", solucao: "Falta de fluido refrigerante ou obstrução severa no ciclo." },
  { marca: "Gree", codigo: "H5", problema: "Proteção do Módulo IPM", solucao: "Superaquecimento do módulo, falta de pasta térmica ou picos de energia." },
  { marca: "Gree", codigo: "F1 / F2", problema: "Erro nos sensores de temperatura (Ambiente ou Serpentina)", solucao: "Substituir sensor NTC danificado ou descalibrado." },

  // MIDEA / SPRINGER / CARRIER
  { marca: "Midea / Springer", codigo: "E1", problema: "Falha de comunicação entre placas / Erro de EEPROM", solucao: "Reiniciar disjuntor por 5 min. Testar cabo de sinal ou trocar placa." },
  { marca: "Midea / Springer", codigo: "E6", problema: "Erro de comunicação interna/externa ou inversão de cabos", solucao: "Verificar se a fiação de interligação está correta e firme nos Bornes." },
  { marca: "Midea / Springer", codigo: "E8", problema: "Proteção de temperatura / Filtro sujo ou bloqueio de fluxo", solucao: "Fazer limpeza completa dos filtros e serpentina interna." },
  { marca: "Midea / Springer", codigo: "F1 / F2", problema: "Sensor de temperatura ambiente ou de tubo aberto/curto", solucao: "Trocar o sensor correspondente na evaporadora." },
  { marca: "Midea / Springer", codigo: "P4", problema: "Proteção de inversor / Temperatura do inversor alta", solucao: "Verificar ventilação do dissipador da placa condensadora." },

  // DAIKIN
  { marca: "Daikin", codigo: "U0", problema: "Falta de fluido refrigerante (Baixa carga de gás)", solucao: "Pesquisar vazamento com nitrogênio, sanar e aplicar carga completa por peso." },
  { marca: "Daikin", codigo: "E3", problema: "Atuação do pressostato de alta", solucao: "Limpar condensadora, checar ventilador externo e verificar excesso de gás." },
  { marca: "Daikin", codigo: "E4", problema: "Atuação do pressostato de baixa", solucao: "Verificar vazamento de gás ou obstrução no circuito frigorígeno." },
  { marca: "Daikin", codigo: "A5", problema: "Proteção de controle de alta pressão / trocador de calor entupido", solucao: "Limpeza de serpentinas e verificação de fluxo de ar." },
  { marca: "Daikin", codigo: "C4", problema: "Erro no sensor de temperatura do trocador de calor", solucao: "Verificar conexões ou substituir sensor NTC." },

  // FUJITSU
  { marca: "Fujitsu", codigo: "Luzes Piscando (Operation + Timer)", problema: "Erro de comunicação ou falha no ventilador interno", solucao: "Verificar código piscando no manual específico do modelo ou checar conexão do motor ventilador." },
  { marca: "Fujitsu", codigo: "Erro 3 LED's piscando", problema: "Anormalidade no sensor de temperatura", solucao: "Verificar sensores NTC da unidade evaporadora." },

  // ELECTROLUX
  { marca: "Electrolux", codigo: "E1 / E3", problema: "Falha nos sensores de temperatura da evaporadora", solucao: "Testar resistência dos sensores NTC e substituir se necessário." },
  { marca: "Electrolux", codigo: "E4", problema: "Atuação do sistema anti-congelamento", solucao: "Limpeza de filtros e verificação de ventilação interna." },
  { marca: "Electrolux", codigo: "EC", problema: "Vazamento de gás detectado pelo sistema inteligente", solucao: "Buscar vazamento nas conexões da tubulação." },

  // CONSUL / BRASTEMP
  { marca: "Consul / Brastemp", codigo: "Erro no Display / Luzes", problema: "Sensor de temperatura desconectado ou em curto", solucao: "Conectar ou substituir o sensor de temperatura." },

  // PANASONIC
  { marca: "Panasonic", codigo: "H11", problema: "Erro de comunicação entre unidade interna e externa", solucao: "Verificar cabos de interligação e integridade das placas." },
  { marca: "Panasonic", codigo: "H23", problema: "Anormalidade no sensor de temperatura do compressor", solucao: "Verificar cabo ou trocar sensor do compressor." },
  { marca: "Panasonic", codigo: "F99", problema: "Proteção de pico de corrente DC no inversor", solucao: "Verificar rede elétrica, oscilação de tensão e placa inversora." },

  // TCL / PHILCO
  { marca: "TCL / Philco", codigo: "E2", problema: "Erro de cruzamento por zero / Sincronismo de rede", solucao: "Verificar estabilidade da rede elétrica e placa principal." },
  { marca: "TCL / Philco", codigo: "E4", problema: "Proteção contra alta temperatura na descarga", solucao: "Falta de gás ou condensadora sem ventilação adequada." }
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [chatErrosOpen, setChatErrosOpen] = useState(false);
  const [termoBuscaErro, setTermoBuscaErro] = useState("");

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

        {/* BOTÃO FLUTUANTE GLOBAL NO SISTEMA INTEIRO */}
        <button
          onClick={() => setChatErrosOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-full bg-cyan-600 px-5 py-3.5 font-bold text-white shadow-2xl hover:bg-cyan-500 transition-all hover:scale-105 border-2 border-cyan-300"
          title="Abrir Chat de Erros e Ajuda Técnica"
        >
          <Wrench size={20} className="animate-bounce" />
          <span>Chat de Erros (Ajuda Técnica)</span>
        </button>

        {/* MODAL GLOBAL DO CHAT DE ERROS */}
        {chatErrosOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-cyan-500/40 shadow-2xl flex flex-col max-h-[90vh] text-slate-100 overflow-hidden">
              
              {/* Header do Chat */}
              <div className="bg-gradient-to-r from-cyan-950 to-slate-900 p-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-cyan-600/30 p-2.5 text-cyan-400 border border-cyan-500/30">
                    <Wrench size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Nando's Assistente Técnico Global</h3>
                    <p className="text-xs text-cyan-300">Pesquise marcas, códigos numéricos ou luzes piscando</p>
                  </div>
                </div>
                <button
                  onClick={() => setChatErrosOpen(false)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Caixa de Pesquisa */}
              <div className="p-4 bg-slate-950 border-b border-slate-800">
                <div className="relative">
                  <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-400" />
                  <input
                    type="text"
                    value={termoBuscaErro}
                    onChange={(e) => setTermoBuscaErro(e.target.value)}
                    placeholder="Ex: Samsung E416, LG CH21, Daikin U0, Inversor, Sensor..."
                    className="w-full rounded-xl bg-slate-900 border border-cyan-900/60 py-3 pl-10 pr-4 text-white outline-none focus:border-cyan-500 text-sm placeholder-slate-500 shadow-inner"
                    autoFocus
                  />
                </div>
              </div>

              {/* Lista de Erros Encontrados */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/60">
                {errosFiltrados.length === 0 ? (
                  <div className="text-center py-10 text-slate-500">
                    <HelpCircle size={40} className="mx-auto mb-2 opacity-40 text-cyan-400" />
                    <p className="text-sm">Nenhum código encontrado para "{termoBuscaErro}".</p>
                    <p className="text-xs text-slate-600 mt-1">Tente pesquisar apenas pelo código (ex: E1, CH23, U0) ou marca.</p>
                  </div>
                ) : (
                  errosFiltrados.map((item, index) => (
                    <div
                      key={index}
                      className="rounded-xl bg-slate-900 border border-slate-800 p-4 shadow-sm hover:border-cyan-500/50 transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="rounded-full bg-cyan-950 border border-cyan-800 px-3 py-0.5 text-xs font-bold text-cyan-300">
                          {item.marca}
                        </span>
                        <span className="rounded-md bg-slate-950 border border-slate-700 px-2.5 py-1 text-xs font-mono font-bold text-amber-400">
                          {item.codigo}
                        </span>
                      </div>
                      <div className="mb-2">
                        <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Defeito Identificado:</p>
                        <p className="text-sm font-semibold text-white">{item.problema}</p>
                      </div>
                      <div className="rounded-lg bg-cyan-950/30 border border-cyan-900/30 p-2.5 mt-2">
                        <p className="text-xs text-cyan-400 uppercase font-bold tracking-wider">🔧 O que fazer (Solução Técnica):</p>
                        <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">{item.solucao}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="p-3 bg-slate-900 border-t border-slate-800 text-center text-xs text-slate-400">
                Disponível em todas as telas do sistema para suporte imediato em campo.
              </div>
            </div>
          </div>
        )}
      </body>
    </html>
  );
}
