"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

// Inicialização do Supabase (utiliza as variáveis de ambiente do seu projeto Next.js)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function NovaOrdemServicoPage() {
  const [clienteNome, setClienteNome] = useState("");
  const [descricaoItem, setDescricaoItem] = useState("");
  const [valorBalcao, setValorBalcao] = useState("");
  const [valorTecnico, setValorTecnico] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState("");

  // Cálculo automático do lucro em tempo real
  const balcaoNum = parseFloat(valorBalcao) || 0;
  const tecnicoNum = parseFloat(valorTecnico) || 0;
  const lucroCalculado = balcaoNum - tecnicoNum;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMensagem("");

    try {
      // 1. Insere a Ordem de Serviço principal
      const { data: osData, error: osError } = await supabase
        .from("ordens_servico")
        .insert([{ cliente_nome: clienteNome, status: "pendente" }])
        .select()
        .single();

      if (osError) throw osError;

      // 2. Insere o item associado com os valores de Balcão, Técnico e Lucro calculado
      const { error: itemError } = await supabase
        .from("ordem_servico_itens")
        .insert([
          {
            ordem_servico_id: osData.id,
            descricao: descricaoItem,
            valor_balcao: balcaoNum,
            valor_tecnico: tecnicoNum,
            lucro: lucroCalculado,
          },
        ]);

      if (itemError) throw itemError;

      setMensagem("Ordem de Serviço criada com sucesso!");
      setClienteNome("");
      setDescricaoItem("");
      setValorBalcao("");
      setValorTecnico("");
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      setMensagem("Erro ao criar a Ordem de Serviço. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-white rounded-lg shadow-md mt-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Nova Ordem de Serviço</h2>

      {mensagem && (
        <div className="mb-4 p-3 rounded bg-gray-100 text-sm font-medium text-center text-gray-700">
          {mensagem}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nome do Cliente */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Nome do Cliente</label>
          <input
            type="text"
            required
            value={clienteNome}
            onChange={(e) => setClienteNome(e.target.value)}
            placeholder="Ex: João da Silva"
            className="w-full mt-1 p-2 border rounded-md"
          />
        </div>

        {/* Descrição do Material / Serviço */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Descrição do Serviço / Material</label>
          <input
            type="text"
            required
            value={descricaoItem}
            onChange={(e) => setDescricaoItem(e.target.value)}
            placeholder="Ex: Instalação de Ar Condicionado 12000 BTUs"
            className="w-full mt-1 p-2 border rounded-md"
          />
        </div>

        {/* Valor Balcão (Cliente) */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Valor Balcão (Preço para o Cliente)</label>
          <input
            type="number"
            step="0.01"
            required
            value={valorBalcao}
            onChange={(e) => setValorBalcao(e.target.value)}
            placeholder="0.00"
            className="w-full mt-1 p-2 border rounded-md"
          />
        </div>

        {/* Valor Técnico (Custo) */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Valor Técnico (O seu Custo / Material)</label>
          <input
            type="number"
            step="0.01"
            required
            value={valorTecnico}
            onChange={(e) => setValorTecnico(e.target.value)}
            placeholder="0.00"
            className="w-full mt-1 p-2 border rounded-md"
          />
        </div>

        {/* Caixa de Visualização do Lucro */}
        <div className="p-3 bg-blue-50 rounded-md border border-blue-100 flex justify-between items-center">
          <span className="text-sm text-blue-800 font-semibold">Lucro Estimado:</span>
          <span className="text-lg font-bold text-blue-900">
            R$ {lucroCalculado.toFixed(2)}
          </span>
        </div>

        {/* Botão de Envio */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white p-2 rounded-md font-semibold hover:bg-blue-700 transition"
        >
          {loading ? "A guardar..." : "Salvar Ordem de Serviço"}
        </button>
      </form>
    </div>
  );
}
