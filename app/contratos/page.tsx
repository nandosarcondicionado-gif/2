'use client';

import React, { useState } from 'react';

interface Contrato {
  id: string;
  cliente: string;
  cpfCnpj: string;
  endereco: string;
  telefone: string;
  quantidadeAparelhos: number | '';
  valorTotalCalculado: number;
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
  const [dataInicio, setDataInicio] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const [contratoSelecionado, setContratoSelecionado] = useState<Contrato | null>(null);
  const [modalCarneAberto, setModalCarneAberto] = useState(false);
  const [quantidadeParcelas, setQuantidadeParcelas] = useState<number>(12);

  // Lógica de cálculo progressivo para os aparelhos
  // Exemplo estruturado: 1 aparelho = R$ 150, a partir do 2º ou 3º há diferenciação ou adicional.
  // Vamos ajustar conforme a regra planejada: 
  // 1 aparelho: 150 | 2 aparelhos: 250 | 3 aparelhos: 350 (ou ajuste proporcional por bloco/adicional)
  const calcularValorTotal = (qtd: number | '') => {
    if (qtd === '' || qtd <= 0) return 0;
    
    // Regra planejada: 1º aparelho R$ 150, e os aparelhos adicionais com valor diferenciado (ex: R$ 100 cada adicional)
    const valorBasePrimeiro = 150;
    const valorAdicionalDemais = 100;

    if (qtd === 1) {
      return valorBasePrimeiro;
    } else {
      return valorBasePrimeiro + (qtd - 1) * valorAdicionalDemais;
    }
  };

  const qtdNum = typeof quantidadeAparelhos === 'number' ? quantidadeAparelhos : 0;
  const valorTotal = calcularValorTotal(quantidadeAparelhos);

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
      valorTotalCalculado: valorTotal,
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
    setDataInicio('');
    setObservacoes('');
  };

  const excluirContrato = (id: string) => {
    setContratos(contratos.filter((c) => c.id !== id));
  };

  // Função para imprimir o Contrato em PDF
  const imprimirContrato = (c: Contrato) => {
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
          <p>O presente contrato tem por objeto a prestação de serviços técnicos especializados e manutenção em <strong>${c.quantidadeAparelhos} aparelho(s)</strong>, conforme especificado e acordado entre as partes.</p>

          <h2>Cláusula Segunda - Dos Valores e Forma de Pagamento</h2>
          <p>Pelos serviços ora contratados, o(a) CONTRATANTE pagará à CONTRATADA o valor total acordado de <strong>R$ ${Number(c.valorTotalCalculado).toFixed(2)}</strong>.</p>
          <p>Data de início da vigência: ${c.dataInicio ? c.dataInicio.split('-').reverse().join('/') : 'Data atual'}.</p>
          <p><strong>Observações:</strong> ${c.observacoes || 'Nenhuma observação registrada.'}</p>

          <h2>Cláusula Terceira - Das Condições Gerais</h2>
          <p>Este instrumento rege-se pelas normas civis vigentes. O descumprimento de qualquer cláusula poderá acarretar a rescisão contratual imediata.</p>

          <br><br>
          <p>Local e Data: _________________________, ____/____/________</p>

          <div class="assinaturas">
            <div class="assinatura-box">Assinatura do(a) Contratante</div>
            <div class="assinatura-box">Assinatura da Contratada</div>
          </div>

          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    janela.document.close();
  };

  const abrirCarne = (c: Contrato) => {
    setContratoSelecionado(c);
    setModalCarneAberto(true);
  };

  const imprimirCarneParcelas = () => {
    if (!contratoSelecionado) return;
    const total = Number(contratoSelecionado.valorTotalCalculado);
    const valorParcela = total / quantidadeParcelas;
    const dataBase = contratoSelecionado.dataInicio ? new Date(contratoSelecionado.dataInicio + 'T00:00:00') : new Date();

    let carnêHtml = `
      <html>
        <head>
          <title>Carnê de Pagamento - ${contratoSelecionado.cliente}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #111; }
            .parcela-card { border: 2px dashed #3b82f6; padding: 15px; margin-bottom: 20px; border-radius: 8px; page-break-inside: avoid; background: #fff; }
            .header { display: flex; justify-content: space-between; border-bottom: 1px solid #ddd; padding-bottom: 8px; margin-bottom: 10px; font-weight: bold; }
            .grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 10px; font-size: 13px; }
            .valor { font-size: 16px; color: #1d4ed8; font-weight: bold; }
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
    <div className="p-6 max-w-7xl mx-auto space-y-8 bg-slate-950 min-h-screen text-slate-100">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Gestão de Contratos e Carnês</h1>
        <p className="text-sm text-slate-400">Cadastre clientes, emita contratos formais em PDF e gere carnês de pagamento parcelados.</p>
      </div>

      {/* Formulário de Cadastro */}
      <form onSubmit={handleSubmit} className="bg-slate-900 p-6 rounded-xl shadow-lg border border-slate-800 space-y-4">
        <h2 className="text-lg font-semibold text-white">Novo Contrato</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Nome do Cliente *</label>
            <input
              type="text"
              required
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              placeholder="Ex: João da Silva"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none placeholder-slate-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">CPF / CNPJ</label>
            <input
              type="text"
              value={cpfCnpj}
              onChange={(e) => setCpfCnpj(e.target.value)}
              placeholder="000.000.000-00"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none placeholder-slate-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Telefone</label>
            <input
              type="text"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(00) 00000-0000"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none placeholder-slate-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-300 mb-1">Endereço Completo</label>
            <input
              type="text"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              placeholder="Rua Exemplo, 123 - Bairro"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none placeholder-slate-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Qtd. Aparelhos (Progressivo)</label>
            <input
              type="number"
              min="1"
              value={quantidadeAparelhos}
              onChange={(e) => setQuantidadeAparelhos(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Data de Início</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Observações</label>
            <input
              type="text"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Detalhes adicionais do serviço..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none placeholder-slate-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <div className="text-sm font-semibold text-slate-300">
            Valor Total Calculado (Escalonado): <span className="text-blue-400 text-base font-bold">R$ {valorTotal.toFixed(2)}</span>
          </div>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-lg text-sm transition-colors shadow-sm"
          >
            Cadastrar Contrato
          </button>
        </div>
      </form>

      {/* Lista de Contratos */}
      <div className="bg-slate-900 rounded-xl shadow-lg border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h3 className="font-semibold text-white">Contratos Registrados</h3>
        </div>
        {contratos.length === 0 ? (
          <p className="p-6 text-sm text-slate-400 text-center">Nenhum contrato cadastrado ainda.</p>
        ) : (
          <div className="divide-y divide-slate-800">
            {contratos.map((c) => (
              <div key={c.id} className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-800/50 transition-colors">
                <div className="space-y-1">
                  <h4 className="font-semibold text-white">{c.cliente}</h4>
                  <p className="text-xs text-slate-400">
                    CPF/CNPJ: {c.cpfCnpj || 'Não informado'} | Tel: {c.telefone || 'Não informado'}
                  </p>
                  <p className="text-xs font-medium text-slate-300">
                    Aparelhos: {c.quantidadeAparelhos}x | Total Calculado: <span className="text-blue-400">R$ {Number(c.valorTotalCalculado).toFixed(2)}</span>
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
                    className="text-red-400 hover:text-red-300 text-xs font-medium px-2 py-2"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal para Escolher Parcelas do Carnê */}
      {modalCarneAberto && contratoSelecionado && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4 shadow-xl text-slate-100">
            <h3 className="text-lg font-bold text-white">Gerar Carnê de Parcelas</h3>
            <p className="text-sm text-slate-300">
              Cliente: <span className="font-semibold text-white">{contratoSelecionado.cliente}</span>
            </p>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Selecione a quantidade de parcelas:</label>
              <select
                value={quantidadeParcelas}
                onChange={(e) => setQuantidadeParcelas(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
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
                className="px-4 py-2 border border-slate-700 rounded-lg text-sm text-slate-300 hover:bg-slate-800"
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
