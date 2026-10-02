'use client';

import React, { useState } from 'react';

interface Contrato {
  id: string;
  cliente: string;
  cpfCnpj: string;
  endereco: string;
  telefone: string;
  quantidadeAparelhos: number | '';
  valorUnitario: number;
  dataInicio: string;
  observacoes: string;
}

export default function ContratosPage() {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [cliente, setCliente] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [endereco, setEndereco] = useState('');
  const [telefone, setTelefone] = useState('');
  const [quantidadeAparelhos, setQuantidadeAparelhos] = useState<number | ''>(1);
  const [valorUnitario, setValorUnitario] = useState<number | ''>(150);
  const [dataInicio, setDataInicio] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const [contratoSelecionado, setContratoSelecionado] = useState<Contrato | null>(null);
  const [modalCarneAberto, setModalCarneAberto] = useState(false);
  const [quantidadeParcelas, setQuantidadeParcelas] = useState<number>(12);

  // Cálculo automático do valor total
  const qtdNum = typeof quantidadeAparelhos === 'number' ? quantidadeAparelhos : 0;
  const valUnitNum = typeof valorUnitario === 'number' ? valorUnitario : 0;
  const valorTotal = qtdNum * valUnitNum;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliente) return;

    const novoContrato: Contrato = {
      id: Date.now().toString(),
      cliente,
      cpfCnpj,
      endereco,
      telefone,
      quantidadeAparelhos: qtdNum === 0 ? 1 : qtdNum,
      valorUnitario: valUnitNum,
      dataInicio: dataInicio || new Date().toISOString().split('T')[0],
      observacoes,
    };

    setContratos([novoContrato, ...contratos]);
    // Limpar campos
    setCliente('');
    setCpfCnpj('');
    setEndereco('');
    setTelefone('');
    setQuantidadeAparelhos(1);
    setValorUnitario(150);
    setDataInicio('');
    setObservacoes('');
  };

  const excluirContrato = (id: string) => {
    setContratos(contratos.filter((c) => c.id !== id));
  };

  // Função para imprimir o Contrato em PDF
  const imprimirContrato = (c: Contrato) => {
    const total = Number(c.quantidadeAparelhos) * Number(c.valorUnitario);
    const janela = window.open('', '_blank');
    if (!janela) return;

    janela.document.write(`
      <html>
        <head>
          <title>Contrato de Prestação de Serviços - ${c.cliente}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; color: #333; }
            h1 { text-align: center; font-size: 18px; text-transform: uppercase; margin-bottom: 30px; }
            h2 { font-size: 14px; margin-top: 20px; text-transform: uppercase; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
            p { text-align: justify; margin-bottom: 15px; }
            .assinaturas { margin-top: 60px; display: flex; justify-content: space-between; }
            .assinatura-box { width: 45%; text-align: center; border-top: 1px solid #000; padding-top: 5px; }
          </style>
        </head>
        <body>
          <h1>Contrato de Prestação de Serviços e Manutenção</h1>
          <p><strong>CONTRATANTE:</strong> ${c.cliente}, inscrito(a) no CPF/CNPJ sob o nº ${c.cpfCnpj || '___________________'}, residente e domiciliado(a) em ${c.endereco || '___________________'}, tel: ${c.telefone || '___________'}.</p>
          <p><strong>CONTRATADA:</strong> Empresa Prestadora de Serviços Técnicos.</p>

          <h2>Cláusula Primeira - Do Objeto</h2>
          <p>O presente contrato tem por objeto a prestação de serviços técnicos especializados e manutenção preventiva/correctiva em <strong>${c.quantidadeAparelhos} aparelho(s)</strong>, conforme especificado e acordado entre as partes.</p>

          <h2>Cláusula Segunda - Dos Valores e Forma de Pagamento</h2>
          <p>Pelos serviços ora contratados, o(a) CONTRATANTE pagará à CONTRATADA o valor unitário de R$ ${Number(c.valorUnitario).toFixed(2)}, totalizando uma importância mensal de <strong>R$ ${total.toFixed(2)}</strong>.</p>
          <p>Data de início da vigência: ${c.dataInicio ? c.dataInicio.split('-').reverse().join('/') : 'Data atual'}.</p>
          <p><strong>Observações:</strong> ${c.observacoes || 'Nenhuma observação registrada.'}</p>

          <h2>Cláusula Terceira - Das Condições Gerais</h2>
          <p>Este instrumento rege-se pelas normas civis vigentes. O descumprimento de qualquer cláusula poderá acarretar a rescisão contratual imediata e incidência de multas previstas na legislação.</p>

          <br><br>
          <p>Local e Data: _________________________, ____/____/________</p>

          <div class="assinaturas">
            <div class="assinatura-box">Assinatura do(a) Contratante</div>
            <div class="assinatura-box">Assinatura da Contratada</div>
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    janela.document.close();
  };

  // Função para abrir o modal de carnê
  const abrirCarne = (c: Contrato) => {
    setContratoSelecionado(c);
    setModalCarneAberto(true);
  };

  // Função para imprimir o Carnê de Parcelas
  const imprimirCarneParcelas = () => {
    if (!contratoSelecionado) return;
    const total = Number(contratoSelecionado.quantidadeAparelhos) * Number(contratoSelecionado.valorUnitario);
    const valorParcela = total / quantidadeParcelas;
    const dataBase = contratoSelecionado.dataInicio ? new Date(contratoSelecionado.dataInicio + 'T00:00:00') : new Date();

    let carnêHtml = `
      <html>
        <head>
          <title>Carnê de Pagamento - ${contratoSelecionado.cliente}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #111; }
            .parcela-card { border: 2px dashed #4f46e5; padding: 15px; margin-bottom: 20px; border-radius: 8px; page-break-inside: avoid; background: #fff; }
            .header { display: flex; justify-content: space-between; border-bottom: 1px solid #ddd; padding-bottom: 8px; margin-bottom: 10px; font-weight: bold; }
            .grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 10px; font-size: 13px; }
            .valor { font-size: 16px; color: #4f46e5; font-weight: bold; }
          </style>
        </head>
        <body>
          <h2 style="text-align: center; margin-bottom: 20px;">Carnê de Pagamento - ${contratoSelecionado.cliente}</h2>
    `;

    for (let i = 1; i <= quantidadeParcelas; i++) {
      let vencimento = new Date(dataBase);
      vencimento.setMonth(vencimento.getMonth() + (i - 1));
      const dataFormatada = vencimento.toLocaleDateString('pt-BR');

      carnêHtml += `
        <div class="parcela-card">
          <div class="header">
            <span>CARNÊ DE PAGAMENTO - PARCELA ${i}/${quantidadeParcelas}</span>
            <span>Vencimento: ${dataFormatada}</span>
          </div>
          <div class="grid">
            <div>
              <p><strong>Cliente:</strong> ${contratoSelecionado.cliente}</p>
              <p><strong>Ref. Contrato:</strong> Aparelhos: ${contratoSelecionado.quantidadeAparelhos}</p>
            </div>
            <div>
              <p><strong>Nº Parcela:</strong> ${i} de ${quantidadeParcelas}</p>
            </div>
            <div>
              <p>Valor da Parcela:</p>
              <p class="valor">R$ ${valorParcela.toFixed(2)}</p>
            </div>
          </div>
        </div>
      `;
    }

    carnêHtml += `
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `;

    const janela = window.open('', '_blank');
    if (janela) {
      janela.document.write(carnêHtml);
      janela.document.close();
    }
    setModalCarneAberto(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Gestão de Contratos e Carnês</h1>
        <p className="text-sm text-gray-500">Cadastre clientes, emita contratos formais em PDF e gere carnês de pagamento parcelados.</p>
      </div>

      {/* Formulário de Cadastro */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Novo Contrato</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nome do Cliente *</label>
            <input
              type="text"
              required
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              placeholder="Ex: João da Silva"
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">CPF / CNPJ</label>
            <input
              type="text"
              value={cpfCnpj}
              onChange={(e) => setCpfCnpj(e.target.value)}
              placeholder="000.000.000-00"
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Telefone</label>
            <input
              type="text"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(00) 00000-0000"
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Endereço Completo</label>
            <input
              type="text"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              placeholder="Rua Exemplo, 123 - Bairro"
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Qtd. Aparelhos</label>
            <input
              type="number"
              min="1"
              value={quantidadeAparelhos}
              onChange={(e) => setQuantidadeAparelhos(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Valor Unitário (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={valorUnitario}
              onChange={(e) => setValorUnitario(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Data de Início</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Observações</label>
            <input
              type="text"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Detalhes adicionais do serviço..."
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="text-sm font-semibold text-gray-700">
            Valor Total Calculado: <span className="text-indigo-600 text-base">R$ {valorTotal.toFixed(2)}</span>
          </div>
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-2.5 rounded-lg text-sm transition-colors shadow-sm"
          >
            Cadastrar Contrato
          </button>
        </div>
      </form>

      {/* Lista de Contratos */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Contratos Registrados</h3>
        </div>
        {contratos.length === 0 ? (
          <p className="p-6 text-sm text-gray-500 text-center">Nenhum contrato cadastrado ainda.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {contratos.map((c) => {
              const total = Number(c.quantidadeAparelhos) * Number(c.valorUnitario);
              return (
                <div key={c.id} className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                  <div className="space-y-1">
                    <h4 className="font-semibold text-gray-900">{c.cliente}</h4>
                    <p className="text-xs text-gray-500">
                      CPF/CNPJ: {c.cpfCnpj || 'Não informado'} | Tel: {c.telefone || 'Não informado'}
                    </p>
                    <p className="text-xs font-medium text-gray-700">
                      Aparelhos: {c.quantidadeAparelhos}x | Total: <span className="text-indigo-600">R$ {total.toFixed(2)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => imprimirContrato(c)}
                      className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      📄 Imprimir Contrato PDF
                    </button>
                    <button
                      onClick={() => abrirCarne(c)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      📑 Gerar Carnê
                    </button>
                    <button
                      onClick={() => excluirContrato(c.id)}
                      className="text-red-500 hover:text-red-700 text-xs font-medium px-2 py-2"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal para Escolher Parcelas do Carnê */}
      {modalCarneAberto && contratoSelecionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900">Gerar Carnê de Parcelas</h3>
            <p className="text-sm text-gray-600">
              Cliente: <span className="font-semibold">{contratoSelecionado.cliente}</span>
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Selecione a quantidade de parcelas:</label>
              <select
                value={quantidadeParcelas}
                onChange={(e) => setQuantidadeParcelas(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value={3}>3 Meses (Trimestral)</option>
                <option value={6}>6 Meses (Semestral)</option>
                <option value={12}>12 Meses (Anual)</option>
                <option value={18}>18 Meses</option>
                <option value={24}>24 Meses</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalCarneAberto(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={imprimirCarneParcelas}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium"
              >
                Imprimir Carnê
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
