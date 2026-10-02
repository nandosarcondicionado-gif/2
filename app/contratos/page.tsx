"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  FileText,
  Edit,
  Trash2,
  X,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  Ban,
  Printer,
  FileCode,
} from "lucide-react";
import { createClient } from "../../lib/supabase/client";

type Plan = "Residencial" | "Comercial" | "Empresarial";
type ContractStatus = "Ativo" | "Pendente" | "Vencido" | "Cancelado";

type Client = {
  id: string;
  nome: string;
  cidade: string | null;
  endereco?: string | null;
  documento?: string | null;
  ativo?: boolean;
};

type Contract = {
  id: string;
  numero: string;
  cliente_id: string | null;
  cliente_nome: string;
  cidade: string;
  plano: Plan;
  equipamentos: number;
  valor_mensal: number;
  data_inicio: string;
  proxima_visita: string | null;
  status: ContractStatus;
  observacoes: string | null;
  created_at?: string;
  updated_at?: string;
};

type PlanConfig = {
  basePrice: number;
  description: string;
  beneficios: string;
  exclusoes: string;
  clausulasCompletas: string;
};

const plansConfig: Record<Plan, PlanConfig> = {
  Residencial: {
    basePrice: 149,
    description: "Ideal para residências e pequenos ambientes.",
    beneficios: "Manutenções preventivas programadas e isenção de taxa de visita técnica corretiva.",
    exclusoes: "Peças de reposição e recargas de gás corretivas cobradas à parte.",
    clausulasCompletas: `CLÁUSULA PRIMEIRA - DO OBJETO: O presente contrato tem por objeto a prestação de serviços de manutenção preventiva em sistemas de ar condicionado instalados no endereço do CONTRATANTE.\n\nCLÁUSULA SEGUNDA - DOS SERVIÇOS INCLUSOS: O plano Residencial contempla limpezas periódicas programadas dos filtros, verificação de pressões do fluido refrigerante, testes elétricos básicos e isenção de taxa de visita técnica em horários comerciais para chamados corretivos.\n\nCLÁUSULA TERCEIRA - DAS EXCLUSÕES: Estão expressamente excluídos deste contrato o fornecimento de peças de reposição, componentes elétricos/mecânicos e recargas de gás provenientes de vazamentos decorrentes de desgaste ou uso, que serão orçados e cobrados separadamente mediante prévia aprovação.\n\nCLÁUSULA QUARTA - DO VALOR E VENCIMENTO: O CONTRATANTE pagará à CONTRATADA o valor mensal ajustado, até o vencimento estipulado, sob pena de suspensão dos benefícios e incidência de multas legais por atraso.`
  },
  Comercial: {
    basePrice: 299,
    description: "Para lojas, escritórios e pequenos comércios.",
    beneficios: "Limpezas preventivas frequentes, atendimento prioritário e isenção de taxa de visita.",
    exclusoes: "Peças de reposição e cargas de gás corretivas cobradas separadamente.",
    clausulasCompletas: `CLÁUSULA PRIMEIRA - DO OBJETO: Prestação de serviços especializados de manutenção preventiva e corretiva programada para ambientes comerciais.\n\nCLÁUSULA SEGUNDA - DOS SERVIÇOS INCLUSOS: Limpeza detalhada de serpentinas e carenagens, verificação de drenos, checagem de componentes eletro-eletrônicos, prioridade de atendimento e isenção de taxas de deslocamento técnico.\n\nCLÁUSULA TERCEIRA - DAS EXCLUSÕES: Não cobrem este pacote materiais de desgaste físico, substituição de compressores, placas eletrônicas e recargas completas de gás por vazamento.\n\nCLÁUSULA QUARTA - DO VALOR E VENCIMENTO: O pagamento mensal assegura a vigência dos serviços e visitas programadas em conformidade com as normas técnicas.`
  },
  Empresarial: {
    basePrice: 599,
    description: "Para empresas e instalações com vários equipamentos.",
    beneficios: "Manutenção preventiva regular, emissão de laudo técnico/PMOC e atendimento emergencial.",
    exclusoes: "Componentes, peças de reposição e recargas pesadas de gás refrigerante.",
    clausulasCompletas: `CLÁUSULA PRIMEIRA - DO OBJETO: Prestação contínua de serviços de conservação preventiva e suporte técnico em climatização para o setor empresarial, com emissão de documentação de conformidade (PMOC quando aplicável).\n\nCLÁUSULA SEGUNDA - DOS SERVIÇOS INCLUSOS: Visitas técnicas periódicas programadas, testes de isolamento, limpeza profunda de sistemas, atendimento emergencial prioritário e suporte operacional contínuo.\n\nCLÁUSULA TERCEIRA - DAS EXCLUSÕES: Custos com peças de reposição de grande porte, isolamentos térmicos extensivos e recargas pesadas de fluido refrigerante ficam a cargo do CONTRATANTE.\n\nCLÁUSULA QUARTA - DO VALOR E VENCIMENTO: Mensalidade fixa devida todo dia escolhido, reajustada anualmente pelo índice oficial aplicável.`
  },
};

const statusOptions: ContractStatus[] = [
  "Ativo",
  "Pendente",
  "Vencido",
  "Cancelado",
];

const emptyForm = {
  cliente_id: "",
  cidade: "",
  plano: "Residencial" as Plan,
  equipamentos: 1,
  valor_mensal: 149,
  data_inicio: new Date().toISOString().slice(0, 10),
  proxima_visita: "",
  status: "Ativo" as ContractStatus,
  observacoes: "",
};

export default function ContratosPage() {
  const supabase = createClient();

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");

  const [modalOpen, setModalOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [carneModalOpen, setCarneModalOpen] = useState(false);
  const [selectedForCarne, setSelectedForCarne] = useState<Contract | null>(null);
  const [carneParcelas, setCarneParcelas] = useState(12);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedContract, setSelectedContract] =
    useState<Contract | null>(null);

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    setLoading(true);

    const [contractsResult, clientsResult] = await Promise.all([
      supabase
        .from("contratos")
        .select("*")
        .order("created_at", { ascending: false }),

      supabase
        .from("clientes")
        .select("id,nome,cidade,endereco,documento,ativo")
        .eq("ativo", true)
        .order("nome"),
    ]);

    if (contractsResult.error) {
      console.error("Erro ao carregar contratos:", contractsResult.error);
    } else {
      setContracts((contractsResult.data || []) as Contract[]);
    }

    if (clientsResult.error) {
      console.error("Erro ao carregar clientes:", clientsResult.error);
    } else {
      setClients((clientsResult.data || []) as Client[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  // Cálculo progressivo automático por quantidade de aparelhos
  useEffect(() => {
    const config = plansConfig[form.plano];
    const base = config.basePrice;
    let calculado = base;
    const qtd = Number(form.equipamentos) || 1;

    if (qtd === 1) {
      calculado = base;
    } else if (qtd === 2 || qtd === 3) {
      calculado = qtd * (base * 0.90);
    } else if (qtd >= 4) {
      calculado = qtd * (base * 0.82);
    }

    setForm((previous) => ({
      ...previous,
      valor_mensal: Math.round(calculado),
      observacoes: previous.observacoes || config.clausulasCompletas
    }));
  }, [form.plano, form.equipamentos]);

  function openNew() {
    setEditingId(null);
    const config = plansConfig["Residencial"];
    setForm({
      ...emptyForm,
      observacoes: config.clausulasCompletas
    });
    setModalOpen(true);
  }

  function openEdit(contract: Contract) {
    setEditingId(contract.id);

    setForm({
      cliente_id: contract.cliente_id || "",
      cidade: contract.cidade || "",
      plano: contract.plano,
      equipamentos: contract.equipamentos || 1,
      valor_mensal: contract.valor_mensal || 0,
      data_inicio: contract.data_inicio || "",
      proxima_visita: contract.proxima_visita || "",
      status: contract.status,
      observacoes: contract.observacoes || "",
    });

    setModalOpen(true);
  }

  function openDetails(contract: Contract) {
    setSelectedContract(contract);
    setDetailsOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function handleClientChange(clientId: string) {
    const client = clients.find((item) => item.id === clientId);

    setForm((previous) => ({
      ...previous,
      cliente_id: clientId,
      cidade: client?.cidade || "",
    }));
  }

  function handlePlanChange(plan: Plan) {
    const config = plansConfig[plan];
    setForm((previous) => ({
      ...previous,
      plano: plan,
      observacoes: config.clausulasCompletas
    }));
  }

  async function generateNumber() {
    const { data, error } = await supabase
      .from("contratos")
      .select("numero")
      .order("created_at", { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return "CTR-0001";
    }

    const lastNumber = String(data[0].numero || "CTR-0000");
    const match = lastNumber.match(/(\d+)$/);

    if (!match) {
      return "CTR-0001";
    }

    const next = Number(match[1]) + 1;
    return `CTR-${String(next).padStart(4, "0")}`;
  }

  async function saveContract(event: React.FormEvent) {
    event.preventDefault();

    if (!form.cliente_id) {
      alert("Selecione um cliente.");
      return;
    }

    const client = clients.find((item) => item.id === form.cliente_id);
    if (!client) {
      alert("Cliente não encontrado.");
      return;
    }

    setSaving(true);

    try {
      const baseData = {
        cliente_id: client.id,
        cliente_nome: client.nome,
        cidade: form.cidade || client.cidade || "",
        plano: form.plano,
        equipamentos: Number(form.equipamentos) || 1,
        valor_mensal: Number(form.valor_mensal) || 0,
        data_inicio: form.data_inicio,
        proxima_visita: form.proxima_visita || null,
        status: form.status,
        observacoes: form.observacoes.trim() || null,
      };

      if (editingId) {
        const { error } = await supabase
          .from("contratos")
          .update(baseData)
          .eq("id", editingId);

        if (error) throw error;
        alert("Contrato atualizado com sucesso.");
      } else {
        const numero = await generateNumber();
        const { error } = await supabase
          .from("contratos")
          .insert({ numero, ...baseData });

        if (error) throw error;
        alert("Contrato criado com sucesso.");
      }

      closeModal();
      await loadData();
    } catch (error: any) {
      console.error(error);
      alert(`Erro ao salvar contrato: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function deleteContract(id: string) {
    if (!window.confirm("Tem certeza que deseja excluir este contrato?")) return;

    const { error } = await supabase.from("contratos").delete().eq("id", id);
    if (error) {
      alert(`Erro ao excluir: ${error.message}`);
      return;
    }

    setContracts((prev) => prev.filter((c) => c.id !== id));
    if (selectedContract?.id === id) {
      setSelectedContract(null);
      setDetailsOpen(false);
    }
    alert("Contrato excluído.");
  }

  async function changeStatus(contract: Contract, status: ContractStatus) {
    const { error } = await supabase
      .from("contratos")
      .update({ status })
      .eq("id", contract.id);

    if (error) {
      alert(`Erro ao alterar status: ${error.message}`);
      return;
    }

    setContracts((prev) =>
      prev.map((item) => (item.id === contract.id ? { ...item, status } : item))
    );

    if (selectedContract?.id === contract.id) {
      setSelectedContract({ ...selectedContract, status });
    }
  }

  // Função para Imprimir / Gerar PDF do Contrato Formatado
  function imprimirContrato(contract: Contract) {
    const clientData = clients.find((c) => c.id === contract.cliente_id);
    const win = window.open("", "_blank");
    if (!win) {
      alert("Permita pop-ups no navegador para gerar a impressão do contrato.");
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Contrato de Prestação de Serviços - ${contract.numero}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111; line-height: 1.5; margin: 0; padding: 20px; font-size: 13px; }
          .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 15px; margin-bottom: 20px; }
          .header h1 { color: #2563eb; margin: 0 0 5px 0; font-size: 20px; }
          .header p { margin: 0; color: #555; font-size: 12px; }
          .section-title { font-weight: bold; background: #f3f4f6; padding: 6px 10px; margin-top: 15px; margin-bottom: 10px; border-left: 4px solid #2563eb; font-size: 13px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px; }
          .field { margin-bottom: 6px; }
          .field span { font-weight: bold; }
          .clausulas { white-space: pre-wrap; text-align: justify; background: #fafafa; padding: 15px; border: 1px solid #e5e7eb; border-radius: 6px; margin-top: 10px; line-height: 1.6; }
          .signatures { display: flex; justify-content: space-between; margin-top: 60px; text-align: center; }
          .sig-box { width: 40%; border-top: 1px solid #000; padding-top: 5px; }
          @media print {
            button { display: none; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>CONTRATO DE PRESTAÇÃO DE SERVIÇOS TÉCNICOS</h1>
          <p>Plano de Manutenção Preventiva em Sistemas de Climatização | ${contract.numero}</p>
        </div>

        <div class="section-title">1. IDENTIFICAÇÃO DAS PARTES</div>
        <div class="grid">
          <div class="field"><span>CONTRATADA:</span> Prestador de Serviços de Climatização</div>
          <div class="field"><span>CONTRATANTE:</span> ${contract.cliente_nome}</div>
          <div class="field"><span>CPF / CNPJ:</span> ${clientData?.documento || "Não informado"}</div>
          <div class="field"><span>Endereço:</span> ${clientData?.endereco || "Não informado"} - ${contract.cidade}</div>
        </div>

        <div class="section-title">2. ESPECIFICAÇÕES DO PLANO E VALORES</div>
        <div class="grid">
          <div class="field"><span>Plano Contratado:</span> ${contract.plano}</div>
          <div class="field"><span>Qtd. Equipamentos:</span> ${contract.equipamentos} unidade(s)</div>
          <div class="field"><span>Valor Mensal:</span> ${formatCurrency(Number(contract.valor_mensal))}</div>
          <div class="field"><span>Data de Início:</span> ${formatDate(contract.data_inicio)}</div>
        </div>

        <div class="section-title">3. TERMOS E CLÁUSULAS CONTRATUAIS</div>
        <div class="clausulas">${contract.observacoes || "Nenhuma cláusula adicional informada."}</div>

        <div class="signatures">
          <div class="sig-box">
            <p>CONTRATADA</p>
          </div>
          <div class="sig-box">
            <p>${contract.cliente_nome}</p>
          </div>
        </div>

        <div style="text-align: center; margin-top: 40px;">
          <button onclick="window.print()" style="background: #2563eb; color: #fff; border: none; padding: 10px 20px; font-weight: bold; border-radius: 5px; cursor: pointer;">Imprimir / Salvar PDF</button>
        </div>
      </body>
      </html>
    `;

    win.document.write(htmlContent);
    win.document.close();
  }

  // Função para Gerar Carnê de Pagamento
  function abrirGeradorCarne(contract: Contract) {
    setSelectedForCarne(contract);
    setCarneParcelas(12);
    setCarneModalOpen(true);
  }

  function imprimirCarne() {
    if (!selectedForCarne) return;
    const win = window.open("", "_blank");
    if (!win) {
      alert("Permita pop-ups para gerar o carnê.");
      return;
    }

    const valorParcela = Number(selectedForCarne.valor_mensal);
    const dataBase = new Date(`${selectedForCarne.data_inicio}T00:00:00`);

    let parcelasHtml = "";
    for (let i = 1; i <= carneParcelas; i++) {
      let vencimento = new Date(dataBase);
      vencimento.setMonth(vencimento.getMonth() + (i - 1));

      parcelasHtml += `
        <div class="parcela">
          <div class="cabecalho-parcela">
            <span>CARNÊ DE PAGAMENTO - ${selectedForCarne.numero}</span>
            <span>Parcela ${i}/${carneParcelas}</span>
          </div>
          <div class="corpo-parcela">
            <div><strong>Cliente:</strong> ${selectedForCarne.cliente_nome}</div>
            <div><strong>Vencimento:</strong> ${vencimento.toLocaleDateString("pt-BR")}</div>
            <div><strong>Valor:</strong> ${formatCurrency(valorParcela)}</div>
          </div>
          <div class="rodape-parcela">Autenticação Bancária / Recibo do Pagador</div>
        </div>
      `;
    }

    const htmlCarne = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Carnê de Pagamento - ${selectedForCarne.numero}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111; margin: 0; padding: 20px; font-size: 12px; }
          .grid-carne { display: grid; grid-template-columns: 1fr; gap: 15px; max-width: 600px; margin: 0 auto; }
          .parcela { border: 2px dashed #374151; border-radius: 8px; padding: 10px 15px; background: #fff; page-break-inside: avoid; }
          .cabecalho-parcela { display: flex; justify-content: space-between; font-weight: bold; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; margin-bottom: 8px; color: #1e3a8a; }
          .corpo-parcela { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 8px; }
          .rodape-parcela { font-size: 10px; color: #6b7280; text-align: right; border-top: 1px dotted #e5e7eb; padding-top: 3px; }
          .print-btn { text-align: center; margin-bottom: 20px; }
          @media print {
            .print-btn { display: none; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="print-btn">
          <button onclick="window.print()" style="background: #1e3a8a; color: #fff; border: none; padding: 10px 20px; font-weight: bold; border-radius: 5px; cursor: pointer;">Imprimir Carnê Completo</button>
        </div>
        <div class="grid-carne">
          ${parcelasHtml}
        </div>
      </body>
      </html>
    `;

    win.document.write(htmlCarne);
    win.document.close();
    setCarneModalOpen(false);
  }

  const filteredContracts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return contracts.filter((contract) => {
      const matchesSearch =
        !term ||
        contract.numero.toLowerCase().includes(term) ||
        contract.cliente_nome.toLowerCase().includes(term) ||
        contract.cidade.toLowerCase().includes(term) ||
        contract.plano.toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "Todos" || contract.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [contracts, search, statusFilter]);

  const totalContracts = contracts.length;
  const activeContracts = contracts.filter((i) => i.status === "Ativo").length;
  const pendingContracts = contracts.filter((i) => i.status === "Pendente").length;
  const monthlyTotal = contracts
    .filter((i) => i.status === "Ativo")
    .reduce((tot, i) => tot + Number(i.valor_mensal || 0), 0);

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  }

  function formatDate(value: string | null) {
    if (!value) return "-";
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("pt-BR");
  }

  function statusClass(status: ContractStatus) {
    if (status === "Ativo") return "bg-green-100 text-green-700";
    if (status === "Pendente") return "bg-yellow-100 text-yellow-700";
    if (status === "Vencido") return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-700";
  }

  function statusIcon(status: ContractStatus) {
    if (status === "Ativo") return <CheckCircle size={15} />;
    if (status === "Pendente") return <Clock size={15} />;
    if (status === "Vencido") return <AlertCircle size={15} />;
    return <Ban size={15} />;
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contratos</h1>
            <p className="mt-1 text-sm text-gray-500">
              Gerencie contratos, imprima documentos com cláusulas e gere carnês de pagamento.
            </p>
          </div>

          <button
            onClick={openNew}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"
          >
            <Plus size={19} />
            Novo contrato
          </button>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total de contratos</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{totalContracts}</p>
              </div>
              <div className="rounded-lg bg-blue-100 p-3 text-blue-600">
                <FileText size={22} />
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Contratos ativos</p>
                <p className="mt-1 text-2xl font-bold text-green-600">{activeContracts}</p>
              </div>
              <div className="rounded-lg bg-green-100 p-3 text-green-600">
                <CheckCircle size={22} />
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pendentes</p>
                <p className="mt-1 text-2xl font-bold text-yellow-600">{pendingContracts}</p>
              </div>
              <div className="rounded-lg bg-yellow-100 p-3 text-yellow-600">
                <Clock size={22} />
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Receita mensal</p>
                <p className="mt-1 text-2xl font-bold text-blue-600">{formatCurrency(monthlyTotal)}</p>
              </div>
              <div className="rounded-lg bg-blue-100 p-3 text-blue-600">
                <FileText size={22} />
              </div>
            </div>
          </div>
        </div>

        <div className="mb-5 rounded-xl bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search size={19} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar contrato, cliente ou cidade..."
                className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 outline-none focus:border-blue-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
            >
              <option value="Todos">Todos os status</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          {loading ? (
            <div className="p-10 text-center text-gray-500">Carregando contratos...</div>
          ) : filteredContracts.length === 0 ? (
            <div className="p-10 text-center">
              <FileText size={45} className="mx-auto mb-3 text-gray-300" />
              <p className="font-semibold text-gray-700">Nenhum contrato encontrado</p>
              <p className="mt-1 text-sm text-gray-500">Crie o primeiro contrato para começar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px]">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-gray-600">Contrato</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-gray-600">Cliente</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-gray-600">Plano</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-gray-600">Qtd. Aparelhos</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-gray-600">Valor Mensal</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-gray-600">Status</th>
                    <th className="px-4 py-4 text-right text-sm font-semibold text-gray-600">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredContracts.map((contract) => (
                    <tr key={contract.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="font-semibold text-gray-900">{contract.numero}</div>
                        <div className="text-xs text-gray-500">Início: {formatDate(contract.data_inicio)}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-gray-900">{contract.cliente_nome}</div>
                        <div className="text-sm text-gray-500">{contract.cidade}</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                          {contract.plano}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-gray-700">{contract.equipamentos}</td>
                      <td className="px-4 py-4 font-semibold text-gray-900">
                        {formatCurrency(Number(contract.valor_mensal || 0))}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${statusClass(contract.status)}`}>
                          {statusIcon(contract.status)}
                          {contract.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => imprimirContrato(contract)}
                            title="Imprimir Contrato PDF"
                            className="rounded-lg border border-purple-200 p-2 text-purple-600 hover:bg-purple-50"
                          >
                            <Printer size={17} />
                          </button>
                          <button
                            onClick={() => abrirGeradorCarne(contract)}
                            title="Gerar Carnê"
                            className="rounded-lg border border-emerald-200 p-2 text-emerald-600 hover:bg-emerald-50"
                          >
                            <FileCode size={17} />
                          </button>
                          <button
                            onClick={() => openDetails(contract)}
                            title="Visualizar"
                            className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-100"
                          >
                            <Eye size={17} />
                          </button>
                          <button
                            onClick={() => openEdit(contract)}
                            title="Editar"
                            className="rounded-lg border border-blue-200 p-2 text-blue-600 hover:bg-blue-50"
                          >
                            <Edit size={17} />
                          </button>
                          <button
                            onClick={() => deleteContract(contract.id)}
                            title="Excluir"
                            className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE NOVO/EDITAR CONTRATO */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editingId ? "Editar contrato" : "Novo contrato"}
                </h2>
                <p className="text-sm text-gray-500">As cláusulas e regras de proteção já vêm pré-preenchidas.</p>
              </div>
              <button onClick={closeModal} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
                <X size={21} />
              </button>
            </div>

            <form onSubmit={saveContract} className="space-y-5 p-5">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Cliente</label>
                <select
                  required
                  value={form.cliente_id}
                  onChange={(e) => handleClientChange(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-blue-500"
                >
                  <option value="">Selecione um cliente</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>{client.nome}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">Cidade</label>
                  <input
                    value={form.cidade}
                    onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">Plano</label>
                  <select
                    value={form.plano}
                    onChange={(e) => handlePlanChange(e.target.value as Plan)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-blue-500"
                  >
                    <option value="Residencial">Residencial (R$ 149 base)</option>
                    <option value="Comercial">Comercial (R$ 299 base)</option>
                    <option value="Empresarial">Empresarial (R$ 599 base)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">Qtd. de Equipamentos</label>
                  <input
                    type="number"
                    min="1"
                    value={form.equipamentos}
                    onChange={(e) => setForm({ ...form, equipamentos: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">Valor Mensal (Editável)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.valor_mensal}
                    onChange={(e) => setForm({ ...form, valor_mensal: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-blue-500 font-bold text-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">Data de Início</label>
                  <input
                    type="date"
                    required
                    value={form.data_inicio}
                    onChange={(e) => setForm({ ...form, data_inicio: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">Próxima Visita</label>
                  <input
                    type="date"
                    value={form.proxima_visita}
                    onChange={(e) => setForm({ ...form, proxima_visita: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as ContractStatus })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-blue-500"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Cláusulas e Condições do Contrato</label>
                <textarea
                  rows={6}
                  value={form.observacoes}
                  onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-500 text-xs font-mono"
                />
              </div>

              <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-gray-300 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Criar contrato"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE GERAR CARNÊ */}
      {carneModalOpen && selectedForCarne && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl p-6">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="text-lg font-bold text-gray-900">Gerar Carnê de Parcelas</h3>
              <button onClick={() => setCarneModalOpen(false)}><X size={20} /></button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Contrato: <strong>{selectedForCarne.numero}</strong> ({selectedForCarne.cliente_nome})
            </p>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Quantidade de Parcelas</label>
              <select
                value={carneParcelas}
                onChange={(e) => setCarneParcelas(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 p-3 outline-none"
              >
                <option value={3}>3 Meses (Trimestral)</option>
                <option value={6}>6 Meses (Semestral)</option>
                <option value={12}>12 Meses (Anual)</option>
              </select>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setCarneModalOpen(false)}
                className="rounded-lg border px-4 py-2 font-semibold text-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={imprimirCarne}
                className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700"
              >
                Imprimir Carnê
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE DETALHES */}
      {detailsOpen && selectedContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedContract.numero}</h2>
                <p className="text-sm text-gray-500">Detalhes do contrato</p>
              </div>
              <button onClick={() => setDetailsOpen(false)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
                <X size={21} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">Cliente</p>
                <p className="font-semibold text-gray-900">{selectedContract.cliente_nome}</p>
                <p className="text-sm text-gray-500">{selectedContract.cidade}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500">Plano</p>
                  <p className="font-semibold">{selectedContract.plano}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500">Equipamentos</p>
                  <p className="font-semibold">{selectedContract.equipamentos}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500">Valor mensal</p>
                  <p className="font-semibold text-blue-600">{formatCurrency(Number(selectedContract.valor_mensal || 0))}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500">Status</p>
                  <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${statusClass(selectedContract.status)}`}>
                    {statusIcon(selectedContract.status)}
                    {selectedContract.status}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => imprimirContrato(selectedContract)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 font-semibold text-white hover:bg-purple-700"
                >
                  <Printer size={17} />
                  Imprimir Contrato PDF
                </button>
                <button
                  onClick={() => abrirGeradorCarne(selectedContract)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700"
                >
                  <FileCode size={17} />
                  Gerar Carnê
                </button>
              </div>

              <div className="flex justify-end gap-3 border-t pt-4">
                <button
                  onClick={() => {
                    setDetailsOpen(false);
                    openEdit(selectedContract);
                  }}
                  className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
                >
                  Editar
                </button>
                <button
                  onClick={() => setDetailsOpen(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
