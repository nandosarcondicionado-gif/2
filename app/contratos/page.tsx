"use client";

import { useEffect, useMemo, useState, useRef } from "react";
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
  PenTool,
  Settings,
  Check,
  Wrench,
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
  status?: string | null;
  telefone?: string | null;
};

type Equipment = {
  id: string;
  cliente_id: string | null;
  ambiente: string | null;
  marca: string | null;
  modelo: string | null;
  btu: string | number | null;
  tipo: string | null;
  numero_serie: string | null;
  status?: string | null;
};

type ManualEquipment = {
  id: string;
  ambiente: string;
  marca: string;
  modelo: string;
  btu: string;
  tipo: string;
  numero_serie: string;
};

type ContractEquipmentLink = {
  id?: string;
  contrato_id?: string;
  equipamento_id?: string | null;
  ambiente: string | null;
  marca: string | null;
  modelo: string | null;
  btu: string | null;
  tipo: string | null;
  numero_serie: string | null;
  manual: boolean;
};

type Contract = {
  id: string;
  numero: string;
  cliente_id: string | null;
  cliente_nome: string;
  cidade: string;
  plano: Plan;
  quantidade_equipamentos: number;
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
    beneficios:
      "Manutenções preventivas programadas e isenção de taxa de visita técnica corretiva.",
    exclusoes:
      "Peças de reposição e recargas de gás corretivas cobradas à parte.",
    clausulasCompletas: `CLÁUSULA PRIMEIRA - DO OBJETO: O presente contrato tem por objeto a prestação de serviços de manutenção preventiva em sistemas de ar condicionado instalados no endereço do CONTRATANTE.

CLÁUSULA SEGUNDA - DOS SERVIÇOS INCLUSOS: O plano Residencial contempla limpezas periódicas programadas dos filtros, verificação de pressões do fluido refrigerante, testes elétricos básicos e isenção de taxa de visita técnica em horários comerciais para chamados corretivos.

CLÁUSULA TERCEIRA - DAS EXCLUSÕES: Estão expressamente excluídos deste contrato o fornecimento de peças de reposição, componentes elétricos/mecânicos e recargas de gás provenientes de vazamentos decorrentes de desgaste ou uso, que serão orçados e cobrados separadamente mediante prévia aprovação.

CLÁUSULA QUARTA - DO VALOR E VENCIMENTO: O CONTRATANTE pagará à CONTRATADA o valor mensal ajustado, até o vencimento estipulado, sob pena de suspensão dos benefícios e incidência de multas legais por atraso.`,
  },

  Comercial: {
    basePrice: 299,
    description: "Para lojas, escritórios e pequenos comércios.",
    beneficios:
      "Limpezas preventivas frequentes, atendimento prioritário e isenção de taxa de visita.",
    exclusoes:
      "Peças de reposição e cargas de gás corretivas cobradas separadamente.",
    clausulasCompletas: `CLÁUSULA PRIMEIRA - DO OBJETO: Prestação de serviços especializados de manutenção preventiva e corretiva programada para ambientes comerciais.

CLÁUSULA SEGUNDA - DOS SERVIÇOS INCLUSOS: Limpeza detalhada de serpentinas e carenagens, verificação de drenos, checagem de componentes eletro-eletrônicos, prioridade de atendimento e isenção de taxas de deslocamento técnico.

CLÁUSULA TERCEIRA - DAS EXCLUSÕES: Não cobrem este pacote materiais de desgaste físico, substituição de compressores, placas eletrônicas e recargas completas de gás por vazamento.

CLÁUSULA QUARTA - DO VALOR E VENCIMENTO: O pagamento mensal assegura a vigência dos serviços e visitas programadas em conformidade com as normas técnicas.`,
  },

  Empresarial: {
    basePrice: 599,
    description:
      "Plano para empresas, com controle individual dos equipamentos, manutenção preventiva programada e acompanhamento técnico.",
    beneficios:
      "Cadastro individual dos aparelhos, histórico de manutenção, manutenção preventiva programada, higienização preventiva, inspeção elétrica e operacional, verificação de filtros, serpentinas, turbinas e drenos, relatórios de visitas, acompanhamento das próximas manutenções, prioridade para chamados corretivos, controle de materiais e documentação técnica/PMOC quando aplicável.",
    exclusoes:
      "Peças de reposição, compressores, placas, motores, componentes elétricos ou mecânicos, tubulações, isolamentos extensivos, recargas de fluido refrigerante decorrentes de vazamentos e demais reparos extraordinários são cobrados separadamente mediante orçamento e aprovação.",
    clausulasCompletas: `CLÁUSULA PRIMEIRA - DO OBJETO: O presente contrato tem por objeto a prestação contínua de serviços técnicos de manutenção preventiva e suporte em sistemas de climatização pertencentes ao CONTRATANTE, abrangendo os equipamentos relacionados neste contrato.

CLÁUSULA SEGUNDA - DOS EQUIPAMENTOS: Os equipamentos abrangidos pelo contrato serão identificados individualmente por ambiente, marca, modelo, capacidade, tipo e, quando disponível, número de série. Equipamentos adicionados posteriormente poderão ser incluídos mediante atualização do contrato.

CLÁUSULA TERCEIRA - DOS SERVIÇOS INCLUSOS: O Plano Empresarial contempla manutenção preventiva programada, higienização preventiva conforme cronograma técnico, inspeção de filtros, serpentinas, turbinas, drenos, componentes elétricos e funcionamento geral dos equipamentos, registro do serviço executado e acompanhamento do histórico individual de manutenção.

CLÁUSULA QUARTA - DO ACOMPANHAMENTO: A CONTRATADA manterá registro das manutenções realizadas e das condições encontradas em cada equipamento, podendo indicar a necessidade de reparos, substituição de peças ou outras intervenções técnicas.

CLÁUSULA QUINTA - DO ATENDIMENTO CORRETIVO: O CONTRATANTE terá prioridade no atendimento de chamados corretivos, observada a disponibilidade técnica da CONTRATADA. A prioridade não significa disponibilidade imediata ou atendimento 24 horas, salvo se houver contratação específica para esse fim.

CLÁUSULA SEXTA - DOS MATERIAIS E PEÇAS: Peças, componentes, compressores, placas eletrônicas, motores, tubulações, isolamentos, fluido refrigerante, recargas decorrentes de vazamentos e demais materiais necessários para reparos extraordinários não estão incluídos na mensalidade e serão previamente orçados.

CLÁUSULA SÉTIMA - DO PMOC E DOCUMENTAÇÃO: Quando aplicável e quando contratado, a CONTRATADA poderá fornecer documentação técnica, relatórios e suporte relacionado ao PMOC e às rotinas de manutenção dos equipamentos.

CLÁUSULA OITAVA - DO VALOR: O valor mensal será calculado de acordo com a quantidade de equipamentos abrangidos pelo contrato e conforme a tabela comercial vigente da CONTRATADA. Equipamentos adicionais poderão alterar o valor da mensalidade.

CLÁUSULA NONA - DO REAJUSTE: A mensalidade poderá ser reajustada anualmente, ou quando houver alteração significativa na quantidade de equipamentos abrangidos pelo contrato, mediante comunicação ao CONTRATANTE.

CLÁUSULA DÉCIMA - DO VENCIMENTO: O CONTRATANTE pagará a mensalidade na data estabelecida no contrato. O atraso poderá resultar na suspensão dos benefícios de atendimento prioritário e das visitas preventivas enquanto houver pendência financeira.

CLÁUSULA DÉCIMA PRIMEIRA - DAS CONDIÇÕES: Os serviços serão executados conforme cronograma técnico definido entre as partes, levando em consideração a quantidade, utilização, condições e criticidade dos equipamentos.

CLÁUSULA DÉCIMA SEGUNDA - DA VIGÊNCIA: O contrato terá início na data indicada e permanecerá vigente enquanto estiver com status Ativo, observadas as condições de renovação e encerramento acordadas entre as partes.`,
  },
};

const statusOptions: ContractStatus[] = [
  "Ativo",
  "Pendente",
  "Vencido",
  "Cancelado",
];

const emptyManualEquipment: ManualEquipment = {
  id: "",
  ambiente: "",
  marca: "",
  modelo: "",
  btu: "",
  tipo: "Split",
  numero_serie: "",
};

const emptyForm = {
  cliente_id: "",
  cidade: "Araraquara",
  plano: "Residencial" as Plan,
  quantidade_equipamentos: 0 as number | "",
  valor_mensal: 0,
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

  const [selectedForCarne, setSelectedForCarne] =
    useState<Contract | null>(null);

  const [carneParcelas, setCarneParcelas] = useState(12);

  const [configAssinaturaOpen, setConfigAssinaturaOpen] = useState(false);
  const [assinaturaSalva, setAssinaturaSalva] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedContract, setSelectedContract] =
    useState<Contract | null>(null);

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // EQUIPAMENTOS
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [equipmentLoading, setEquipmentLoading] = useState(false);
  const [equipmentSearch, setEquipmentSearch] = useState("");
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<string[]>(
    []
  );
  const [manualEquipments, setManualEquipments] = useState<
    ManualEquipment[]
  >([]);
  const [manualEquipmentForm, setManualEquipmentForm] =
    useState<ManualEquipment>(emptyManualEquipment);
  const [manualEquipmentOpen, setManualEquipmentOpen] = useState(false);

  async function loadData() {
    setLoading(true);

    const [contractsResult, clientsResult] = await Promise.all([
      supabase
        .from("contratos")
        .select("*")
        .order("created_at", { ascending: false }),

      supabase
        .from("clientes")
        .select(
          "id, nome, cidade, endereco, documento, status, telefone"
        )
        .order("nome"),
    ]);

    if (!contractsResult.error) {
      setContracts((contractsResult.data || []) as Contract[]);
    }

    if (!clientsResult.error) {
      setClients((clientsResult.data || []) as Client[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();

    const assinaturaArmazenada = localStorage.getItem(
      "nandos_assinatura_admin"
    );

    if (assinaturaArmazenada) {
      setAssinaturaSalva(assinaturaArmazenada);
    }
  }, []);

  function getDiscountByQuantity(qtd: number) {
    if (qtd >= 30) return 0.30;
    if (qtd >= 20) return 0.25;
    if (qtd >= 10) return 0.22;
    if (qtd >= 4) return 0.18;
    if (qtd >= 2) return 0.10;
    return 0;
  }

  function calculateMonthlyValue(plan: Plan, qtd: number) {
    if (qtd <= 0) return 0;

    const base = plansConfig[plan].basePrice;
    const discount = getDiscountByQuantity(qtd);

    return Math.round(qtd * base * (1 - discount) * 100) / 100;
  }

  function getDiscountLabel(qtd: number) {
    const discount = getDiscountByQuantity(qtd);
    return `${Math.round(discount * 100)}%`;
  }

  // Atualiza quantidade e valor sempre que os aparelhos mudarem.
  useEffect(() => {
    const qtd =
      selectedEquipmentIds.length + manualEquipments.length;

    const valor = calculateMonthlyValue(form.plano, qtd);

    setForm((previous) => {
      const newObservacoes =
        previous.observacoes ||
        plansConfig[form.plano].clausulasCompletas;

      if (
        previous.quantidade_equipamentos === qtd &&
        previous.valor_mensal === valor &&
        previous.observacoes === newObservacoes
      ) {
        return previous;
      }

      return {
        ...previous,
        quantidade_equipamentos: qtd,
        valor_mensal: valor,
        observacoes: newObservacoes,
      };
    });
  }, [
    selectedEquipmentIds.length,
    manualEquipments.length,
    form.plano,
  ]);

  async function loadClientEquipments(
    clientId: string,
    contractId?: string | null
  ) {
    setEquipmentList([]);
    setSelectedEquipmentIds([]);
    setManualEquipments([]);
    setEquipmentSearch("");

    if (!clientId) return;

    setEquipmentLoading(true);

    try {
      const [equipmentResult, linksResult] = await Promise.all([
        supabase
          .from("equipamentos")
          .select(
            "id, cliente_id, ambiente, marca, modelo, btu, tipo, numero_serie, status"
          )
          .eq("cliente_id", clientId)
          .order("ambiente", { ascending: true }),

        contractId
          ? supabase
              .from("contrato_equipamentos")
              .select(
                "id, contrato_id, equipamento_id, ambiente, marca, modelo, btu, tipo, numero_serie, manual"
              )
              .eq("contrato_id", contractId)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (equipmentResult.error) {
        throw equipmentResult.error;
      }

      setEquipmentList((equipmentResult.data || []) as Equipment[]);

      const links = (linksResult.data || []) as ContractEquipmentLink[];

      if (links.length > 0) {
        const ids = links
          .filter((item) => !item.manual && item.equipamento_id)
          .map((item) => String(item.equipamento_id));

        const manuals = links
          .filter((item) => item.manual)
          .map((item, index) => ({
            id: `manual-${item.id || index}`,
            ambiente: item.ambiente || "",
            marca: item.marca || "",
            modelo: item.modelo || "",
            btu: item.btu || "",
            tipo: item.tipo || "Split",
            numero_serie: item.numero_serie || "",
          }));

        setSelectedEquipmentIds(ids);
        setManualEquipments(manuals);
      }
    } catch (error: any) {
      alert(`Erro ao carregar os aparelhos: ${error.message}`);
    } finally {
      setEquipmentLoading(false);
    }
  }

  function openNew() {
    setEditingId(null);

    setEquipmentList([]);
    setSelectedEquipmentIds([]);
    setManualEquipments([]);
    setEquipmentSearch("");
    setManualEquipmentForm(emptyManualEquipment);
    setManualEquipmentOpen(false);

    const config = plansConfig["Residencial"];

    setForm({
      ...emptyForm,
      quantidade_equipamentos: 0,
      valor_mensal: 0,
      observacoes: config.clausulasCompletas,
    });

    setModalOpen(true);
  }

  async function openEdit(contract: Contract) {
    setEditingId(contract.id);

    setEquipmentList([]);
    setSelectedEquipmentIds([]);
    setManualEquipments([]);
    setEquipmentSearch("");
    setManualEquipmentForm(emptyManualEquipment);
    setManualEquipmentOpen(false);

    setForm({
      cliente_id: contract.cliente_id || "",
      cidade: contract.cidade || "Araraquara",
      plano: contract.plano,
      quantidade_equipamentos: contract.quantidade_equipamentos || 0,
      valor_mensal: contract.valor_mensal || 0,
      data_inicio: contract.data_inicio || "",
      proxima_visita: contract.proxima_visita || "",
      status: contract.status,
      observacoes:
        contract.observacoes ||
        plansConfig[contract.plano].clausulasCompletas,
    });

    setModalOpen(true);

    if (contract.cliente_id) {
      await loadClientEquipments(contract.cliente_id, contract.id);
    }
  }

  function openDetails(contract: Contract) {
    setSelectedContract(contract);
    setDetailsOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    setEditingId(null);

    setEquipmentList([]);
    setSelectedEquipmentIds([]);
    setManualEquipments([]);
    setEquipmentSearch("");
    setManualEquipmentOpen(false);
    setManualEquipmentForm(emptyManualEquipment);

    setForm({
      ...emptyForm,
      quantidade_equipamentos: 0,
      valor_mensal: 0,
    });
  }

  async function handleClientChange(clientId: string) {
    const client = clients.find((item) => item.id === clientId);

    setForm((previous) => ({
      ...previous,
      cliente_id: clientId,
      cidade: client?.cidade || "Araraquara",
    }));

    setSelectedEquipmentIds([]);
    setManualEquipments([]);
    setEquipmentList([]);
    setEquipmentSearch("");

    if (clientId) {
      await loadClientEquipments(clientId);
    }
  }

  function handlePlanChange(plan: Plan) {
    const config = plansConfig[plan];

    const qtd =
      selectedEquipmentIds.length + manualEquipments.length;

    setForm((previous) => ({
      ...previous,
      plano: plan,
      quantidade_equipamentos: qtd,
      valor_mensal: calculateMonthlyValue(plan, qtd),
      observacoes: config.clausulasCompletas,
    }));
  }

  function toggleEquipment(id: string) {
    setSelectedEquipmentIds((previous) => {
      if (previous.includes(id)) {
        return previous.filter((item) => item !== id);
      }

      return [...previous, id];
    });
  }

  function selectAllFilteredEquipments() {
    const ids = filteredEquipments.map((equipment) => equipment.id);

    setSelectedEquipmentIds((previous) => {
      const combined = new Set([...previous, ...ids]);
      return Array.from(combined);
    });
  }

  function removeAllFilteredEquipments() {
    const ids = new Set(filteredEquipments.map((equipment) => equipment.id));

    setSelectedEquipmentIds((previous) =>
      previous.filter((id) => !ids.has(id))
    );
  }

  function addManualEquipment() {
    const marca = manualEquipmentForm.marca.trim();
    const modelo = manualEquipmentForm.modelo.trim();
    const ambiente = manualEquipmentForm.ambiente.trim();

    if (!marca && !modelo && !ambiente) {
      alert("Informe pelo menos o ambiente, a marca ou o modelo do aparelho.");
      return;
    }

    const novo: ManualEquipment = {
      ...manualEquipmentForm,
      id: `manual-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,
      ambiente,
      marca,
      modelo,
      btu: manualEquipmentForm.btu.trim(),
      tipo: manualEquipmentForm.tipo.trim() || "Split",
      numero_serie: manualEquipmentForm.numero_serie.trim(),
    };

    setManualEquipments((previous) => [...previous, novo]);

    setManualEquipmentForm(emptyManualEquipment);
    setManualEquipmentOpen(false);
  }

  function removeManualEquipment(id: string) {
    setManualEquipments((previous) =>
      previous.filter((item) => item.id !== id)
    );
  }

  async function generateNumber() {
    const { data } = await supabase
      .from("contratos")
      .select("numero")
      .order("created_at", { ascending: false })
      .limit(1);

    if (!data || data.length === 0) return "CTR-0001";

    const lastNumber = String(data[0].numero || "CTR-0000");
    const match = lastNumber.match(/(\d+)$/);

    if (!match) return "CTR-0001";

    return `CTR-${String(Number(match[1]) + 1).padStart(4, "0")}`;
  }

  async function saveContract(event: React.FormEvent) {
    event.preventDefault();

    if (!form.cliente_id) {
      alert("Selecione um cliente.");
      return;
    }

    const totalEquipamentos =
      selectedEquipmentIds.length + manualEquipments.length;

    if (totalEquipamentos <= 0) {
      alert(
        "Selecione pelo menos um aparelho cadastrado ou adicione um aparelho manualmente."
      );
      return;
    }

    const client = clients.find(
      (item) => item.id === form.cliente_id
    );

    if (!client) return;

    setSaving(true);

    try {
      const valorCalculado = calculateMonthlyValue(
        form.plano,
        totalEquipamentos
      );

      const baseData = {
        cliente_id: client.id,
        cliente_nome: client.nome,
        cidade: form.cidade || client.cidade || "Araraquara",
        plano: form.plano,
        quantidade_equipamentos: totalEquipamentos,
        valor_mensal: valorCalculado,
        data_inicio: form.data_inicio,
        proxima_visita: form.proxima_visita || null,
        status: form.status,
        observacoes:
          form.observacoes.trim() ||
          plansConfig[form.plano].clausulasCompletas,
      };

      let contratoId = editingId;

      if (editingId) {
        const { error } = await supabase
          .from("contratos")
          .update(baseData)
          .eq("id", editingId);

        if (error) throw error;
      } else {
        const numero = await generateNumber();

        const { data, error } = await supabase
          .from("contratos")
          .insert({
            numero,
            ...baseData,
          })
          .select("id")
          .single();

        if (error) throw error;

        contratoId = data?.id || null;
      }

      if (!contratoId) {
        throw new Error(
          "Não foi possível identificar o contrato salvo."
        );
      }

      // Remove os vínculos anteriores para reconstruir a lista atual.
      const { error: deleteLinksError } = await supabase
        .from("contrato_equipamentos")
        .delete()
        .eq("contrato_id", contratoId);

      if (deleteLinksError) {
        throw deleteLinksError;
      }

      const linksToInsert: any[] = [];

      // Aparelhos cadastrados
      selectedEquipmentIds.forEach((equipmentId) => {
        const equipment = equipmentList.find(
          (item) => item.id === equipmentId
        );

        if (!equipment) return;

        linksToInsert.push({
          contrato_id: contratoId,
          equipamento_id: equipment.id,
          ambiente: equipment.ambiente || null,
          marca: equipment.marca || null,
          modelo: equipment.modelo || null,
          btu:
            equipment.btu !== null &&
            equipment.btu !== undefined
              ? String(equipment.btu)
              : null,
          tipo: equipment.tipo || null,
          numero_serie: equipment.numero_serie || null,
          manual: false,
        });
      });

      // Aparelhos adicionados manualmente
      manualEquipments.forEach((equipment) => {
        linksToInsert.push({
          contrato_id: contratoId,
          equipamento_id: null,
          ambiente: equipment.ambiente || null,
          marca: equipment.marca || null,
          modelo: equipment.modelo || null,
          btu: equipment.btu || null,
          tipo: equipment.tipo || null,
          numero_serie: equipment.numero_serie || null,
          manual: true,
        });
      });

      if (linksToInsert.length > 0) {
        const { error: insertLinksError } = await supabase
          .from("contrato_equipamentos")
          .insert(linksToInsert);

        if (insertLinksError) {
          throw insertLinksError;
        }
      }

      alert(
        editingId
          ? "Contrato atualizado com sucesso."
          : "Contrato criado com sucesso."
      );

      closeModal();
      await loadData();
    } catch (error: any) {
      alert(`Erro ao salvar contrato: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function deleteContract(id: string) {
    if (
      !window.confirm(
        "Tem certeza que deseja excluir este contrato?"
      )
    ) {
      return;
    }

    const { error } = await supabase
      .from("contratos")
      .delete()
      .eq("id", id);

    if (error) {
      alert(`Erro ao excluir: ${error.message}`);
      return;
    }

    setContracts((prev) =>
      prev.filter((contract) => contract.id !== id)
    );

    if (selectedContract?.id === id) {
      setSelectedContract(null);
      setDetailsOpen(false);
    }

    alert("Contrato excluído.");
  }

  function limparCanvasAssinatura() {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function iniciarDesenho(
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>
  ) {
    setIsDrawing(true);

    const canvas = canvasRef.current;

    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();

    const x =
      "touches" in e
        ? e.touches[0].clientX - rect.left
        : e.clientX - rect.left;

    const y =
      "touches" in e
        ? e.touches[0].clientY - rect.top
        : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function desenhar(
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>
  ) {
    if (!isDrawing) return;

    const canvas = canvasRef.current;

    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();

    const x =
      "touches" in e
        ? e.touches[0].clientX - rect.left
        : e.clientX - rect.left;

    const y =
      "touches" in e
        ? e.touches[0].clientY - rect.top
        : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.stroke();
  }

  function pararDesenho() {
    setIsDrawing(false);
  }

  function salvarAssinaturaAdmin() {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const dataUrl = canvas.toDataURL("image/png");

    localStorage.setItem(
      "nandos_assinatura_admin",
      dataUrl
    );

    setAssinaturaSalva(dataUrl);
    setConfigAssinaturaOpen(false);

    alert("Assinatura do administrador salva com sucesso!");
  }

  function removerAssinaturaAdmin() {
    if (
      !window.confirm(
        "Deseja remover a assinatura salva?"
      )
    ) {
      return;
    }

    localStorage.removeItem("nandos_assinatura_admin");
    setAssinaturaSalva(null);

    alert("Assinatura removida.");
  }

  async function getContractEquipmentLinks(contractId: string) {
    const { data, error } = await supabase
      .from("contrato_equipamentos")
      .select(
        "id, contrato_id, equipamento_id, ambiente, marca, modelo, btu, tipo, numero_serie, manual"
      )
      .eq("contrato_id", contractId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      return [] as ContractEquipmentLink[];
    }

    return (data || []) as ContractEquipmentLink[];
  }

  function escapeHtml(value: string) {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function imprimirContratoComAssinaturaSalva(
    contract: Contract
  ) {
    const clientData = clients.find(
      (c) => c.id === contract.cliente_id
    );

    const links = await getContractEquipmentLinks(contract.id);

    const win = window.open("", "_blank");

    if (!win) {
      alert(
        "Permita pop-ups no navegador para gerar a impressão do contrato."
      );
      return;
    }

    const dataAtual = new Date().toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const assinaturaHtml = assinaturaSalva
      ? `<img src="${assinaturaSalva}" alt="Assinatura Salva" style="max-height: 55px; display: block; margin: 0 auto;" />`
      : `<div style="height: 35px;"></div><p style="font-size: 9px; color: #64748b;">(Cadastre sua assinatura no painel)</p>`;

    let equipamentosHtml = "";

    if (links.length > 0) {
      equipamentosHtml = links
        .map(
          (item, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${escapeHtml(item.ambiente || "-")}</td>
              <td>${escapeHtml(item.marca || "-")}</td>
              <td>${escapeHtml(item.modelo || "-")}</td>
              <td>${escapeHtml(item.btu || "-")}</td>
              <td>${escapeHtml(item.tipo || "-")}</td>
              <td>${escapeHtml(item.numero_serie || "-")}</td>
            </tr>
          `
        )
        .join("");
    } else {
      equipamentosHtml = `
        <tr>
          <td colspan="7" style="text-align:center;">
            Relação de equipamentos não cadastrada neste contrato.
          </td>
        </tr>
      `;
    }

    const desconto = getDiscountByQuantity(
      contract.quantidade_equipamentos
    );

    const valorBase =
      plansConfig[contract.plano].basePrice *
      contract.quantidade_equipamentos;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Contrato - ${escapeHtml(
          contract.numero
        )} - Nando's Ar Condicionado</title>

        <style>
          body {
            font-family: Arial, sans-serif;
            color: #111;
            line-height: 1.5;
            margin: 0;
            padding: 30px;
            font-size: 12px;
            position: relative;
          }

          .marca-dagua-contrato {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-20deg);
            font-size: 45px;
            font-weight: bold;
            color: rgba(30, 58, 138, 0.10);
            text-align: center;
            width: 100%;
            pointer-events: none;
            z-index: -1;
            line-height: 1.3;
          }

          .topo-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid #1e3a8a;
            padding-bottom: 12px;
            margin-bottom: 20px;
          }

          .logo-area {
            font-size: 20px;
            font-weight: bold;
            color: #1e3a8a;
          }

          .logo-sub {
            font-size: 10px;
            color: #0284c7;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
          }

          .parceiros-topo {
            font-size: 11px;
            font-weight: bold;
            color: #334155;
            text-align: right;
          }

          .parceiros-topo span {
            color: #dc2626;
            font-weight: 900;
          }

          .titulo-doc {
            text-align: center;
            font-size: 15px;
            font-weight: bold;
            color: #1e3a8a;
            margin: 15px 0 20px 0;
            background: #f1f5f9;
            padding: 8px;
            border-radius: 4px;
          }

          .section-title {
            font-weight: bold;
            background: #1e3a8a;
            color: #fff;
            padding: 6px 10px;
            margin-top: 15px;
            margin-bottom: 10px;
            font-size: 12px;
            border-radius: 3px;
          }

          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-bottom: 15px;
          }

          .field {
            margin-bottom: 5px;
            font-size: 12px;
          }

          .field span {
            font-weight: bold;
            color: #1e3a8a;
          }

          .valor-destaque {
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            border-radius: 6px;
            padding: 10px;
            margin: 10px 0;
          }

          .equipamentos {
            width: 100%;
            border-collapse: collapse;
            font-size: 9px;
            margin-top: 8px;
          }

          .equipamentos th {
            background: #1e3a8a;
            color: white;
            padding: 6px;
            text-align: left;
          }

          .equipamentos td {
            border: 1px solid #cbd5e1;
            padding: 5px;
          }

          .equipamentos tr:nth-child(even) {
            background: #f8fafc;
          }

          .clausulas {
            white-space: pre-wrap;
            text-align: justify;
            background: #fafafa;
            padding: 15px;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            margin-top: 10px;
            line-height: 1.6;
            font-size: 11px;
          }

          .data-local {
            margin-top: 30px;
            text-align: right;
            font-size: 12px;
            font-weight: bold;
            color: #334155;
          }

          .signatures {
            display: flex;
            justify-content: space-between;
            margin-top: 50px;
            text-align: center;
            page-break-inside: avoid;
          }

          .sig-box {
            width: 42%;
            border-top: 2px solid #1e3a8a;
            padding-top: 8px;
          }

          .sig-box p {
            margin: 2px 0;
            font-size: 11px;
          }

          .rodape-contrato {
            margin-top: 40px;
            background: #1e3a8a;
            color: #fff;
            padding: 8px;
            text-align: center;
            font-size: 10px;
            border-radius: 4px;
            font-weight: bold;
          }

          @media print {
            button {
              display: none;
            }

            body {
              padding: 10px;
            }

            .equipamentos {
              page-break-inside: auto;
            }

            .equipamentos tr {
              page-break-inside: avoid;
            }
          }
        </style>
      </head>

      <body>
        <div class="marca-dagua-contrato">
          Nando's Ar Condicionado<br>
          qualidade e confiança em todos os detalhes
        </div>

        <div class="topo-header">
          <div>
            <div class="logo-area">
              ❄️ Nando's Ar Condicionado
            </div>

            <div class="logo-sub">
              qualidade e confiança em todos os detalhes
            </div>
          </div>

          <div class="parceiros-topo">
            <span>FUJITSU</span>
            &nbsp;|&nbsp;
            <span>SAMSUNG</span>
            <br>
            <small>
              Instalação • Manutenção • Higienização • Araraquara e região
            </small>
          </div>
        </div>

        <div class="titulo-doc">
          CONTRATO DE PRESTAÇÃO DE SERVIÇOS TÉCNICOS -
          ${escapeHtml(contract.numero)}
        </div>

        <div class="section-title">
          1. IDENTIFICAÇÃO DAS PARTES
        </div>

        <div class="grid">
          <div class="field">
            <span>CONTRATADA:</span>
            Nando's Ar Condicionado
          </div>

          <div class="field">
            <span>CONTRATANTE:</span>
            ${escapeHtml(contract.cliente_nome)}
          </div>

          <div class="field">
            <span>CPF / CNPJ:</span>
            ${escapeHtml(clientData?.documento || "Não informado")}
          </div>

          <div class="field">
            <span>Telefone / Contato:</span>
            ${escapeHtml(clientData?.telefone || "Não informado")}
          </div>

          <div class="field" style="grid-column: span 2;">
            <span>Endereço:</span>
            ${escapeHtml(
              clientData?.endereco ||
                contract.cidade ||
                "Não informado"
            )}
          </div>
        </div>

        <div class="section-title">
          2. PLANO E VALORES
        </div>

        <div class="grid">
          <div class="field">
            <span>Plano:</span>
            ${escapeHtml(contract.plano)}
          </div>

          <div class="field">
            <span>Quantidade:</span>
            ${contract.quantidade_equipamentos} aparelho(s)
          </div>

          <div class="field">
            <span>Valor base:</span>
            ${formatCurrency(valorBase)}
          </div>

          <div class="field">
            <span>Desconto aplicado:</span>
            ${Math.round(desconto * 100)}%
          </div>

          <div class="field">
            <span>Valor mensal:</span>
            ${formatCurrency(Number(contract.valor_mensal))}
          </div>

          <div class="field">
            <span>Data de início:</span>
            ${formatDate(contract.data_inicio)}
          </div>
        </div>

        <div class="valor-destaque">
          <strong>Mensalidade do contrato:</strong>
          ${formatCurrency(Number(contract.valor_mensal))}
          &nbsp; —
          ${contract.quantidade_equipamentos} aparelho(s)
        </div>

        <div class="section-title">
          3. EQUIPAMENTOS ABRANGIDOS PELO CONTRATO
        </div>

        <table class="equipamentos">
          <thead>
            <tr>
              <th>#</th>
              <th>Ambiente</th>
              <th>Marca</th>
              <th>Modelo</th>
              <th>BTU</th>
              <th>Tipo</th>
              <th>Nº Série</th>
            </tr>
          </thead>

          <tbody>
            ${equipamentosHtml}
          </tbody>
        </table>

        <div class="section-title">
          4. TERMOS E CLÁUSULAS CONTRATUAIS
        </div>

        <div class="clausulas">
${escapeHtml(
  contract.observacoes ||
    plansConfig[contract.plano].clausulasCompletas
)}
        </div>

        <div class="data-local">
          ${escapeHtml(contract.cidade || "Araraquara")},
          ${dataAtual}.
        </div>

        <div class="signatures">
          <div class="sig-box">
            ${assinaturaHtml}

            <p>
              <strong>NANDO'S AR CONDICIONADO</strong>
            </p>

            <p>
              Representante Legal / Contratada
            </p>
          </div>

          <div class="sig-box">
            <div style="height: 35px;"></div>

            <p>
              <strong>${escapeHtml(contract.cliente_nome)}</strong>
            </p>

            <p>
              CPF/CNPJ:
              ${escapeHtml(
                clientData?.documento ||
                  "____________________"
              )}
            </p>

            <p>
              Contratante
            </p>
          </div>
        </div>

        <div class="rodape-contrato">
          WhatsApp: (14) 99712-1234
          &nbsp;|&nbsp;
          Instagram: @nando.climatizacao
          &nbsp;|&nbsp;
          E-mail: nandosarcondicionado@gmail.com
          — Capricho, garantia e preço justo!
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <button
            onclick="window.print()"
            style="
              background: #1e3a8a;
              color: #fff;
              border: none;
              padding: 12px 25px;
              font-weight: bold;
              border-radius: 5px;
              cursor: pointer;
              font-size: 13px;
            "
          >
            Imprimir / Salvar Contrato PDF
          </button>
        </div>
      </body>
      </html>
    `;

    win.document.write(htmlContent);
    win.document.close();
  }

  function abrirGeradorCarne(contract: Contract) {
    setSelectedForCarne(contract);
    setCarneParcelas(12);
    setCarneModalOpen(true);
  }

  function calcularCRC16(payload: string): string {
    let crc = 0xffff;

    for (let c = 0; c < payload.length; c++) {
      crc ^= payload.charCodeAt(c) << 8;

      for (let i = 0; i < 8; i++) {
        crc =
          crc & 0x8000
            ? (crc << 1) ^ 0x1021
            : crc << 1;
      }
    }

    return (crc & 0xffff)
      .toString(16)
      .toUpperCase()
      .padStart(4, "0");
  }

  function gerarPayloadPix(valor: number): string {
    const chave = "+5514991689815";
    const nome = "Anderson F J Gomes";
    const cidade = "Brotas";
    const valorStr = valor.toFixed(2);

    const tlv = (id: string, val: string) =>
      id + String(val.length).padStart(2, "0") + val;

    const gui =
      tlv("00", "br.gov.bcb.pix") +
      tlv("01", chave);

    let payload = "";

    payload += tlv("00", "01");
    payload += tlv("26", gui);
    payload += tlv("52", "0000");
    payload += tlv("53", "986");
    payload += tlv("54", valorStr);
    payload += tlv("58", "BR");
    payload += tlv("59", nome);
    payload += tlv("60", cidade);
    payload += tlv("62", tlv("05", "***"));
    payload += "6304";

    return payload + calcularCRC16(payload);
  }

  function imprimirCarne() {
    if (!selectedForCarne) return;

    const win = window.open("", "_blank");

    if (!win) {
      alert("Permita pop-ups para gerar o carnê.");
      return;
    }

    const valorParcela = Number(
      selectedForCarne.valor_mensal
    );

    const dataBase = new Date(
      `${selectedForCarne.data_inicio}T00:00:00`
    );

    let parcelasHtml = "";

    for (let i = 1; i <= carneParcelas; i++) {
      const vencimento = new Date(dataBase);

      vencimento.setMonth(
        vencimento.getMonth() + (i - 1)
      );

      const pixPayload = gerarPayloadPix(valorParcela);

      const qrCodeUrl =
        `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
          pixPayload
        )}`;

      parcelasHtml += `
        <div class="bloco-carne">

          <div class="marca-dagua-carne">
            Nando's Ar Condicionado<br>
            qualidade e confiança em todos os detalhes
          </div>

          <div class="canhoto">
            <div class="canhoto-topo-logo">
              ❄️ Nando's Ar
            </div>

            <div class="canhoto-sub">
              COMPROVANTE DO CLIENTE
            </div>

            <div class="canhoto-info">
              <strong>Contrato:</strong>
              ${selectedForCarne.numero}
            </div>

            <div class="canhoto-info">
              <strong>Parcela:</strong>
              ${i}/${carneParcelas}
            </div>

            <div class="canhoto-info">
              <strong>Vencimento:</strong>
              ${vencimento.toLocaleDateString("pt-BR")}
            </div>

            <div
              class="canhoto-info"
              style="
                font-size: 11px;
                font-weight: bold;
                color: #1e3a8a;
              "
            >
              <strong>Valor:</strong>
              ${formatCurrency(valorParcela)}
            </div>

            <div style="font-size: 9px; margin-top: 4px;">
              [ &nbsp; ] Pago
              &nbsp;&nbsp;&nbsp;
              [ &nbsp; ] Não pago
              <br>
              Forma:
              [ ] Dinheiro
              [ ] Cartão
              [ ] Pix
            </div>

            <div class="canhoto-assinatura">
              Assinatura / Data<br>
              _______________________
            </div>
          </div>

          <div class="ficha">

            <div class="ficha-topo">

              <div>
                <div class="ficha-empresa">
                  ❄️ Nando's Ar Condicionado
                </div>

                <div class="ficha-empresa-sub">
                  qualidade e confiança em todos os detalhes
                </div>
              </div>

              <div class="ficha-parceiros">
                <span>FUJITSU</span>
                |
                <span>SAMSUNG</span>
                <br>
                <small>Araraquara e região</small>
              </div>

            </div>

            <div class="titulo-carne-barra">
              CARNÊ DE PAGAMENTO
            </div>

            <div class="ficha-campos-sup">

              <div>
                <strong>Cliente:</strong>
                ${selectedForCarne.cliente_nome}
              </div>

              <div
                style="
                  display: flex;
                  justify-content: space-between;
                  margin-top: 2px;
                "
              >
                <span>
                  <strong>Plano:</strong>
                  ${selectedForCarne.plano}
                  (${selectedForCarne.quantidade_equipamentos} maq.)
                </span>

                <span>
                  <strong>Nº do Carnê:</strong>
                  ${selectedForCarne.numero}
                </span>
              </div>

            </div>

            <div class="ficha-corpo-baixo">

              <div class="ficha-detalhes-parcela">

                <div
                  style="
                    font-size: 13px;
                    font-weight: bold;
                    color: #1e3a8a;
                    background: #e0f2fe;
                    padding: 4px 8px;
                    border-radius: 4px;
                    display: inline-block;
                  "
                >
                  Parcela ${i}/${carneParcelas}
                  —
                  Vencimento:
                  ${vencimento.toLocaleDateString("pt-BR")}
                </div>

                <div
                  style="
                    font-size: 14px;
                    font-weight: bold;
                    color: #0f172a;
                    margin-top: 4px;
                  "
                >
                  Valor:
                  ${formatCurrency(valorParcela)}
                </div>

                <div class="pix-instrucao">
                  📲
                  <strong>Pix Direto (Itaú):</strong>
                  Escaneie o QR Code ao lado.
                  Chave Celular:
                  (14) 99168-9815.
                </div>

              </div>

              <div class="ficha-qrcode">
                <img
                  src="${qrCodeUrl}"
                  alt="QR Code Pix"
                  width="95"
                  height="95"
                />

                <span class="pix-label">
                  Pix (Itaú)
                </span>
              </div>

            </div>

            <div class="ficha-rodape">
              <span>
                Mantenha seu pagamento em dia!
              </span>

              <span
                style="
                  font-style: italic;
                  color: #1e3a8a;
                  font-weight: bold;
                "
              >
                Capricho, garantia e preço justo!
              </span>
            </div>

          </div>
        </div>
      `;
    }

    const htmlCarne = `
      <!DOCTYPE html>

      <html lang="pt-BR">

      <head>

        <meta charset="UTF-8">

        <title>
          Carnê de Pagamento -
          ${selectedForCarne.numero}
        </title>

        <style>

          body {
            font-family: Arial, sans-serif;
            color: #111;
            margin: 0;
            padding: 10px;
            font-size: 10px;
            background: #fff;
          }

          .print-btn {
            text-align: center;
            margin-bottom: 15px;
          }

          .bloco-carne {
            position: relative;
            display: flex;
            border: 2px solid #1e3a8a;
            border-radius: 6px;
            margin-bottom: 10px;
            background: #ffffff;
            overflow: hidden;
            page-break-inside: avoid;
            height: 165px;
          }

          .marca-dagua-carne {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-15deg);
            font-size: 22px;
            font-weight: bold;
            color: rgba(30, 58, 138, 0.10);
            white-space: nowrap;
            pointer-events: none;
            z-index: 1;
            text-align: center;
          }

          .canhoto {
            width: 27%;
            border-right: 2px dashed #64748b;
            padding: 6px 8px;
            background: #f8fafc;
            position: relative;
            z-index: 2;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }

          .canhoto-topo-logo {
            font-size: 11px;
            font-weight: bold;
            color: #1e3a8a;
          }

          .canhoto-sub {
            font-size: 9px;
            font-weight: bold;
            color: #0284c7;
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 2px;
            margin-bottom: 3px;
          }

          .canhoto-info {
            font-size: 9px;
            margin-bottom: 2px;
          }

          .canhoto-assinatura {
            border-top: 1px dotted #94a3b8;
            padding-top: 2px;
            font-size: 8px;
            text-align: center;
            color: #334155;
          }

          .ficha {
            width: 73%;
            padding: 6px 10px;
            position: relative;
            z-index: 2;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }

          .ficha-topo {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 3px;
          }

          .ficha-empresa {
            font-size: 12px;
            font-weight: bold;
            color: #1e3a8a;
          }

          .ficha-empresa-sub {
            font-size: 8px;
            color: #0284c7;
            font-weight: bold;
            text-transform: uppercase;
          }

          .ficha-parceiros {
            font-size: 9px;
            font-weight: bold;
            text-align: right;
            color: #334155;
          }

          .ficha-parceiros span {
            color: #dc2626;
            font-weight: 900;
          }

          .titulo-carne-barra {
            background: #1e3a8a;
            color: #fff;
            text-align: center;
            font-size: 10px;
            font-weight: bold;
            padding: 2px;
            margin: 4px 0;
            border-radius: 2px;
          }

          .ficha-campos-sup {
            font-size: 10px;
            background: #f8fafc;
            padding: 3px 6px;
            border: 1px solid #e2e8f0;
            border-radius: 3px;
          }

          .ficha-corpo-baixo {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 3px;
          }

          .ficha-detalhes-parcela {
            flex: 1;
            padding-right: 8px;
          }

          .pix-instrucao {
            font-size: 8.5px;
            color: #475569;
            margin-top: 3px;
          }

          .ficha-qrcode {
            display: flex;
            flex-direction: column;
            align-items: center;
            background: #fff;
            padding: 3px;
            border: 1px solid #cbd5e1;
            border-radius: 4px;
          }

          .pix-label {
            font-size: 8px;
            font-weight: bold;
            color: #1e3a8a;
            margin-top: 1px;
          }

          .ficha-rodape {
            display: flex;
            justify-content: space-between;
            font-size: 8px;
            border-top: 1px solid #e2e8f0;
            padding-top: 3px;
            color: #475569;
          }

          @media print {
            .print-btn {
              display: none;
            }

            body {
              padding: 0;
            }
          }

        </style>

      </head>

      <body>

        <div class="print-btn">
          <button
            onclick="window.print()"
            style="
              background: #1e3a8a;
              color: #fff;
              border: none;
              padding: 10px 20px;
              font-weight: bold;
              border-radius: 5px;
              cursor: pointer;
            "
          >
            Imprimir Carnê
          </button>
        </div>

        <div>
          ${parcelasHtml}
        </div>

      </body>

      </html>
    `;

    win.document.write(htmlCarne);
    win.document.close();

    setCarneModalOpen(false);
  }

  const filteredEquipments = useMemo(() => {
    const term = equipmentSearch
      .trim()
      .toLowerCase();

    if (!term) return equipmentList;

    return equipmentList.filter((equipment) => {
      const text = [
        equipment.ambiente,
        equipment.marca,
        equipment.modelo,
        equipment.btu,
        equipment.tipo,
        equipment.numero_serie,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(term);
    });
  }, [equipmentList, equipmentSearch]);

  const filteredContracts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return contracts.filter((contract) => {
      const matchesSearch =
        !term ||
        contract.numero.toLowerCase().includes(term) ||
        contract.cliente_nome.toLowerCase().includes(term) ||
        contract.cidade.toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "Todos" ||
        contract.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [contracts, search, statusFilter]);

  const totalContracts = contracts.length;

  const activeContracts = contracts.filter(
    (item) => item.status === "Ativo"
  ).length;

  const pendingContracts = contracts.filter(
    (item) => item.status === "Pendente"
  ).length;

  const monthlyTotal = contracts
    .filter((item) => item.status === "Ativo")
    .reduce(
      (total, item) =>
        total + Number(item.valor_mensal || 0),
      0
    );

  const totalSelectedEquipments =
    selectedEquipmentIds.length +
    manualEquipments.length;

  const currentDiscount =
    getDiscountByQuantity(totalSelectedEquipments);

  const currentBaseValue =
    totalSelectedEquipments *
    plansConfig[form.plano].basePrice;

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  }

  function formatDate(value: string | null) {
    if (!value) return "-";

    const date = new Date(`${value}T00:00:00`);

    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleDateString("pt-BR");
  }

  function statusClass(status: ContractStatus) {
    if (status === "Ativo")
      return "bg-green-950 text-green-400 border border-green-800";

    if (status === "Pendente")
      return "bg-yellow-950 text-yellow-400 border border-yellow-800";

    if (status === "Vencido")
      return "bg-red-950 text-red-400 border border-red-800";

    return "bg-slate-800 text-slate-300 border border-slate-700";
  }

  function statusIcon(status: ContractStatus) {
    if (status === "Ativo")
      return <CheckCircle size={15} />;

    if (status === "Pendente")
      return <Clock size={15} />;

    if (status === "Vencido")
      return <AlertCircle size={15} />;

    return <Ban size={15} />;
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 md:p-6 text-slate-100">
      <div className="mx-auto max-w-7xl">

        {/* CABEÇALHO */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div>
            <h1 className="text-2xl font-bold text-white">
              Contratos
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Gerencie contratos, aparelhos, manutenção preventiva,
              assinatura e carnês.
            </p>
          </div>

          <div className="flex items-center gap-3">

            <button
              onClick={() =>
                setConfigAssinaturaOpen(true)
              }
              className="flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-3 font-semibold text-white hover:bg-amber-500 transition-colors shadow-sm text-sm"
            >
              <Settings size={18} />
              Configurar Assinatura Admin
            </button>

            <button
              onClick={openNew}
              className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-500 transition-colors shadow-sm text-sm"
            >
              <Plus size={19} />
              Novo contrato
            </button>

          </div>
        </div>

        {/* MÉTRICAS */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 shadow-sm">
            <p className="text-sm text-slate-400">
              Total de contratos
            </p>

            <p className="mt-1 text-2xl font-bold text-white">
              {totalContracts}
            </p>
          </div>

          <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 shadow-sm">
            <p className="text-sm text-slate-400">
              Contratos ativos
            </p>

            <p className="mt-1 text-2xl font-bold text-green-400">
              {activeContracts}
            </p>
          </div>

          <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 shadow-sm">
            <p className="text-sm text-slate-400">
              Pendentes
            </p>

            <p className="mt-1 text-2xl font-bold text-yellow-400">
              {pendingContracts}
            </p>
          </div>

          <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 shadow-sm">
            <p className="text-sm text-slate-400">
              Receita mensal
            </p>

            <p className="mt-1 text-2xl font-bold text-blue-400">
              {formatCurrency(monthlyTotal)}
            </p>
          </div>

        </div>

        {/* BUSCA */}
        <div className="mb-5 rounded-xl bg-slate-900 border border-slate-800 p-4 shadow-sm">

          <div className="flex flex-col gap-3 md:flex-row">

            <div className="relative flex-1">

              <Search
                size={19}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Buscar contrato, cliente ou cidade..."
                className="w-full rounded-lg bg-slate-950 border border-slate-700 py-3 pl-10 pr-4 text-slate-100 outline-none focus:border-blue-500 placeholder-slate-500 text-sm"
              />

            </div>

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value)
              }
              className="rounded-lg bg-slate-950 border border-slate-700 px-4 py-3 text-slate-100 outline-none focus:border-blue-500 text-sm"
            >
              <option
                value="Todos"
                className="bg-slate-900"
              >
                Todos os status
              </option>

              {statusOptions.map((status) => (
                <option
                  key={status}
                  value={status}
                  className="bg-slate-900"
                >
                  {status}
                </option>
              ))}
            </select>

          </div>
        </div>

        {/* TABELA */}
        <div className="overflow-hidden rounded-xl bg-slate-900 border border-slate-800 shadow-sm">

          {loading ? (
            <div className="p-10 text-center text-slate-400">
              Carregando contratos...
            </div>
          ) : filteredContracts.length === 0 ? (
            <div className="p-10 text-center">

              <FileText
                size={45}
                className="mx-auto mb-3 text-slate-600"
              />

              <p className="font-semibold text-slate-300">
                Nenhum contrato encontrado
              </p>

            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full min-w-[950px]">

                <thead className="border-b border-slate-800 bg-slate-950/50">

                  <tr>

                    <th className="px-4 py-4 text-left text-sm font-semibold text-slate-300">
                      Contrato
                    </th>

                    <th className="px-4 py-4 text-left text-sm font-semibold text-slate-300">
                      Cliente
                    </th>

                    <th className="px-4 py-4 text-left text-sm font-semibold text-slate-300">
                      Plano
                    </th>

                    <th className="px-4 py-4 text-left text-sm font-semibold text-slate-300">
                      Aparelhos
                    </th>

                    <th className="px-4 py-4 text-left text-sm font-semibold text-slate-300">
                      Valor Mensal
                    </th>

                    <th className="px-4 py-4 text-left text-sm font-semibold text-slate-300">
                      Status
                    </th>

                    <th className="px-4 py-4 text-right text-sm font-semibold text-slate-300">
                      Ações
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-slate-800">

                  {filteredContracts.map((contract) => (

                    <tr
                      key={contract.id}
                      className="hover:bg-slate-800/40 transition-colors"
                    >

                      <td className="px-4 py-4">

                        <div className="font-semibold text-white">
                          {contract.numero}
                        </div>

                        <div className="text-xs text-slate-400">
                          Início:
                          {" "}
                          {formatDate(
                            contract.data_inicio
                          )}
                        </div>

                      </td>

                      <td className="px-4 py-4">

                        <div className="font-medium text-slate-100">
                          {contract.cliente_nome}
                        </div>

                        <div className="text-sm text-slate-400">
                          {contract.cidade}
                        </div>

                      </td>

                      <td className="px-4 py-4">

                        <span className="rounded-full bg-blue-950 border border-blue-900 px-3 py-1 text-xs font-semibold text-blue-400">
                          {contract.plano}
                        </span>

                      </td>

                      <td className="px-4 py-4 text-slate-300">

                        <div className="font-semibold">
                          {contract.quantidade_equipamentos}
                        </div>

                        <div className="text-xs text-slate-500">
                          aparelho(s)
                        </div>

                      </td>

                      <td className="px-4 py-4 font-semibold text-white">
                        {formatCurrency(
                          Number(contract.valor_mensal || 0)
                        )}
                      </td>

                      <td className="px-4 py-4">

                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                            contract.status
                          )}`}
                        >
                          {statusIcon(contract.status)}
                          {contract.status}
                        </span>

                      </td>

                      <td className="px-4 py-4">

                        <div className="flex justify-end gap-2">

                          <button
                            onClick={() =>
                              imprimirContratoComAssinaturaSalva(
                                contract
                              )
                            }
                            title="Imprimir Contrato"
                            className="rounded-lg border border-purple-900 bg-purple-950/30 p-2 text-purple-400 hover:bg-purple-900/50 transition-colors"
                          >
                            <Printer size={17} />
                          </button>

                          <button
                            onClick={() =>
                              abrirGeradorCarne(contract)
                            }
                            title="Gerar Carnê Pix"
                            className="rounded-lg border border-emerald-900 bg-emerald-950/30 p-2 text-emerald-400 hover:bg-emerald-900/50 transition-colors"
                          >
                            <FileCode size={17} />
                          </button>

                          <button
                            onClick={() =>
                              openDetails(contract)
                            }
                            title="Visualizar"
                            className="rounded-lg border border-slate-700 bg-slate-800/50 p-2 text-slate-300 hover:bg-slate-700 transition-colors"
                          >
                            <Eye size={17} />
                          </button>

                          <button
                            onClick={() =>
                              openEdit(contract)
                            }
                            title="Editar"
                            className="rounded-lg border border-blue-900 bg-blue-950/30 p-2 text-blue-400 hover:bg-blue-900/50 transition-colors"
                          >
                            <Edit size={17} />
                          </button>

                          <button
                            onClick={() =>
                              deleteContract(contract.id)
                            }
                            title="Excluir"
                            className="rounded-lg border border-red-900 bg-red-950/30 p-2 text-red-400 hover:bg-red-900/50 transition-colors"
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

      {/* ASSINATURA */}
      {configAssinaturaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">

          <div className="w-full max-w-lg rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-6 text-slate-100">

            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">

              <div>

                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <PenTool
                    size={20}
                    className="text-amber-400"
                  />

                  Assinatura Eletrônica do Administrador
                </h3>

                <p className="text-xs text-slate-400">
                  Desenhe sua assinatura abaixo.
                  Ela ficará salva para os contratos.
                </p>

              </div>

              <button
                onClick={() =>
                  setConfigAssinaturaOpen(false)
                }
                className="text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>

            </div>

            {assinaturaSalva && (
              <div className="mb-4 rounded-lg bg-slate-950 p-3 border border-slate-800 text-center">

                <p className="text-xs text-slate-400 mb-1 font-semibold">
                  Assinatura Atual:
                </p>

                <img
                  src={assinaturaSalva}
                  alt="Assinatura Salva"
                  className="mx-auto max-h-16 bg-white p-1 rounded"
                />

                <button
                  onClick={removerAssinaturaAdmin}
                  className="mt-2 text-xs text-red-400 hover:underline font-semibold"
                >
                  Excluir / Trocar Assinatura
                </button>

              </div>
            )}

            <div className="mb-4 flex flex-col items-center">

              <label className="text-xs font-semibold text-slate-300 mb-1 self-start">
                Desenhe a nova assinatura:
              </label>

              <div className="border-2 border-dashed border-slate-700 rounded-lg bg-white overflow-hidden w-full touch-none">

                <canvas
                  ref={canvasRef}
                  width={450}
                  height={160}
                  onMouseDown={iniciarDesenho}
                  onMouseMove={desenhar}
                  onMouseUp={pararDesenho}
                  onMouseLeave={pararDesenho}
                  onTouchStart={iniciarDesenho}
                  onTouchMove={desenhar}
                  onTouchEnd={pararDesenho}
                  className="w-full cursor-crosshair bg-white"
                />

              </div>

              <div className="w-full flex justify-between mt-1">

                <button
                  type="button"
                  onClick={limparCanvasAssinatura}
                  className="text-xs text-amber-400 hover:underline font-semibold"
                >
                  Limpar Rascunho
                </button>

                <span className="text-xs text-slate-500">
                  Nando's Ar Condicionado
                </span>

              </div>

            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">

              <button
                onClick={() =>
                  setConfigAssinaturaOpen(false)
                }
                className="rounded-lg border border-slate-700 px-4 py-2 font-semibold text-slate-300 hover:bg-slate-800 text-sm"
              >
                Cancelar
              </button>

              <button
                onClick={salvarAssinaturaAdmin}
                className="rounded-lg bg-amber-600 px-5 py-2 font-semibold text-white hover:bg-amber-500 text-sm shadow-sm"
              >
                Salvar Assinatura
              </button>

            </div>

          </div>

        </div>
      )}

      {/* MODAL CONTRATO */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 md:p-4">

          <div className="max-h-[96vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-slate-900 border border-slate-800 shadow-2xl text-slate-100">

            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-800 bg-slate-900 p-5">

              <div>

                <h2 className="text-xl font-bold text-white">
                  {editingId
                    ? "Editar contrato"
                    : "Novo contrato"}
                </h2>

                <p className="text-sm text-slate-400">
                  Selecione os aparelhos que farão parte do contrato.
                </p>

              </div>

              <button
                onClick={closeModal}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800"
              >
                <X size={21} />
              </button>

            </div>

            <form
              onSubmit={saveContract}
              className="space-y-5 p-5"
            >

              {/* CLIENTE */}
              <div>

                <label className="mb-1 block text-sm font-semibold text-slate-300">
                  Cliente / Empresa
                </label>

                <select
                  required
                  value={form.cliente_id}
                  onChange={(e) =>
                    handleClientChange(e.target.value)
                  }
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-3 text-slate-100 outline-none focus:border-blue-500 text-sm"
                >

                  <option
                    value=""
                    className="bg-slate-900"
                  >
                    Selecione um cliente
                  </option>

                  {clients.map((client) => (
                    <option
                      key={client.id}
                      value={client.id}
                      className="bg-slate-900"
                    >
                      {client.nome}
                      {client.cidade
                        ? ` (${client.cidade})`
                        : ""}
                    </option>
                  ))}

                </select>

              </div>

              {/* CIDADE E PLANO */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                <div>

                  <label className="mb-1 block text-sm font-semibold text-slate-300">
                    Cidade
                  </label>

                  <input
                    value={form.cidade}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        cidade: e.target.value,
                      })
                    }
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-3 text-slate-100 outline-none text-sm"
                  />

                </div>

                <div>

                  <label className="mb-1 block text-sm font-semibold text-slate-300">
                    Plano
                  </label>

                  <select
                    value={form.plano}
                    onChange={(e) =>
                      handlePlanChange(
                        e.target.value as Plan
                      )
                    }
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-3 text-slate-100 outline-none text-sm"
                  >

                    <option
                      value="Residencial"
                      className="bg-slate-900"
                    >
                      Residencial — R$149/aparelho
                    </option>

                    <option
                      value="Comercial"
                      className="bg-slate-900"
                    >
                      Comercial — R$299/aparelho
                    </option>

                    <option
                      value="Empresarial"
                      className="bg-slate-900"
                    >
                      Empresarial — R$599/aparelho
                    </option>

                  </select>

                </div>

              </div>

              {/* DESCRIÇÃO DO PLANO */}
              <div className="rounded-xl border border-blue-900/60 bg-blue-950/20 p-4">

                <div className="flex items-start gap-3">

                  <div className="rounded-lg bg-blue-900/50 p-2">
                    <Wrench
                      size={20}
                      className="text-blue-400"
                    />
                  </div>

                  <div className="flex-1">

                    <p className="font-bold text-blue-300">
                      Plano {form.plano}
                    </p>

                    <p className="mt-1 text-sm text-slate-300">
                      {plansConfig[form.plano].description}
                    </p>

                    <p className="mt-2 text-xs text-green-400">
                      <strong>Inclui:</strong>{" "}
                      {plansConfig[form.plano].beneficios}
                    </p>

                    <p className="mt-2 text-xs text-amber-400">
                      <strong>Não inclui:</strong>{" "}
                      {plansConfig[form.plano].exclusoes}
                    </p>

                  </div>

                </div>

              </div>

              {/* APARELHOS */}
              <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">

                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

                  <div>

                    <h3 className="font-bold text-white flex items-center gap-2">
                      <Wrench
                        size={18}
                        className="text-blue-400"
                      />

                      Aparelhos do contrato
                    </h3>

                    <p className="text-xs text-slate-400 mt-1">
                      Selecione os equipamentos cadastrados nesta empresa.
                    </p>

                  </div>

                  <div className="rounded-full bg-blue-600/20 border border-blue-700 px-4 py-2">

                    <span className="text-sm font-bold text-blue-300">
                      {totalSelectedEquipments}
                    </span>

                    <span className="text-xs text-blue-400 ml-1">
                      aparelho(s) selecionado(s)
                    </span>

                  </div>

                </div>

                {!form.cliente_id ? (
                  <div className="rounded-lg border border-dashed border-slate-700 p-6 text-center">

                    <Wrench
                      size={30}
                      className="mx-auto mb-2 text-slate-600"
                    />

                    <p className="text-sm text-slate-400">
                      Primeiro selecione a empresa para carregar os aparelhos cadastrados.
                    </p>

                  </div>
                ) : equipmentLoading ? (
                  <div className="rounded-lg border border-slate-700 p-6 text-center text-slate-400">
                    Carregando aparelhos da empresa...
                  </div>
                ) : (
                  <>

                    <div className="mb-3 flex flex-col gap-2 md:flex-row">

                      <div className="relative flex-1">

                        <Search
                          size={17}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                        />

                        <input
                          value={equipmentSearch}
                          onChange={(e) =>
                            setEquipmentSearch(
                              e.target.value
                            )
                          }
                          placeholder="Buscar marca, modelo, ambiente, BTU ou número de série..."
                          className="w-full rounded-lg bg-slate-900 border border-slate-700 py-2.5 pl-9 pr-3 text-sm text-white outline-none focus:border-blue-500"
                        />

                      </div>

                      <button
                        type="button"
                        onClick={selectAllFilteredEquipments}
                        disabled={
                          filteredEquipments.length === 0
                        }
                        className="rounded-lg border border-green-800 bg-green-950/40 px-3 py-2 text-xs font-semibold text-green-400 disabled:opacity-40"
                      >
                        Selecionar encontrados
                      </button>

                      <button
                        type="button"
                        onClick={removeAllFilteredEquipments}
                        disabled={
                          filteredEquipments.length === 0
                        }
                        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-400 disabled:opacity-40"
                      >
                        Limpar encontrados
                      </button>

                    </div>

                    {equipmentList.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-amber-800 bg-amber-950/20 p-5 text-center">

                        <p className="font-semibold text-amber-400">
                          Nenhum aparelho cadastrado para esta empresa.
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          Você pode adicionar os aparelhos manualmente abaixo.
                        </p>

                      </div>
                    ) : (
                      <div className="max-h-[360px] overflow-y-auto rounded-lg border border-slate-800">

                        {filteredEquipments.map(
                          (equipment) => {
                            const checked =
                              selectedEquipmentIds.includes(
                                equipment.id
                              );

                            return (
                              <label
                                key={equipment.id}
                                className={`flex cursor-pointer items-center gap-3 border-b border-slate-800 p-3 transition-colors ${
                                  checked
                                    ? "bg-blue-950/30"
                                    : "hover:bg-slate-900"
                                }`}
                              >

                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() =>
                                    toggleEquipment(
                                      equipment.id
                                    )
                                  }
                                  className="h-5 w-5 accent-blue-600"
                                />

                                <div className="min-w-0 flex-1">

                                  <div className="flex flex-wrap items-center gap-2">

                                    <span className="font-semibold text-white">
                                      {equipment.marca ||
                                        "Marca não informada"}
                                    </span>

                                    {equipment.modelo && (
                                      <span className="text-slate-300">
                                        {equipment.modelo}
                                      </span>
                                    )}

                                    {equipment.btu && (
                                      <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-blue-300">
                                        {equipment.btu} BTU
                                      </span>
                                    )}

                                  </div>

                                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">

                                    <span>
                                      Ambiente:{" "}
                                      {equipment.ambiente ||
                                        "Não informado"}
                                    </span>

                                    <span>
                                      Tipo:{" "}
                                      {equipment.tipo ||
                                        "Não informado"}
                                    </span>

                                    {equipment.numero_serie && (
                                      <span>
                                        Nº série:{" "}
                                        {equipment.numero_serie}
                                      </span>
                                    )}

                                  </div>

                                </div>

                                {checked && (
                                  <div className="rounded-full bg-blue-600 p-1">
                                    <Check
                                      size={15}
                                      className="text-white"
                                    />
                                  </div>
                                )}

                              </label>
                            );
                          }
                        )}

                        {filteredEquipments.length === 0 && (
                          <div className="p-6 text-center text-sm text-slate-500">
                            Nenhum aparelho corresponde à pesquisa.
                          </div>
                        )}

                      </div>
                    )}

                    {/* MANUAIS */}
                    {manualEquipments.length > 0 && (
                      <div className="mt-3 space-y-2">

                        <p className="text-xs font-bold uppercase tracking-wide text-amber-400">
                          Aparelhos adicionados manualmente
                        </p>

                        {manualEquipments.map(
                          (equipment) => (
                            <div
                              key={equipment.id}
                              className="flex items-center gap-3 rounded-lg border border-amber-900/60 bg-amber-950/20 p-3"
                            >

                              <div className="flex-1">

                                <div className="font-semibold text-white">
                                  {equipment.marca ||
                                    "Marca não informada"}{" "}
                                  {equipment.modelo}
                                </div>

                                <div className="text-xs text-slate-400">
                                  {equipment.ambiente ||
                                    "Ambiente não informado"}
                                  {" • "}
                                  {equipment.btu
                                    ? `${equipment.btu} BTU`
                                    : "BTU não informado"}
                                  {" • "}
                                  {equipment.tipo}
                                </div>

                                {equipment.numero_serie && (
                                  <div className="text-xs text-slate-500">
                                    Nº série:{" "}
                                    {equipment.numero_serie}
                                  </div>
                                )}

                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  removeManualEquipment(
                                    equipment.id
                                  )
                                }
                                className="rounded-lg p-2 text-red-400 hover:bg-red-950"
                                title="Remover aparelho"
                              >
                                <Trash2 size={17} />
                              </button>

                            </div>
                          )
                        )}

                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        setManualEquipmentOpen(
                          !manualEquipmentOpen
                        )
                      }
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-amber-700 bg-amber-950/20 px-4 py-3 text-sm font-semibold text-amber-400 hover:bg-amber-950/40"
                    >
                      <Plus size={17} />
                      Adicionar aparelho manualmente
                    </button>

                    {manualEquipmentOpen && (
                      <div className="mt-3 rounded-xl border border-amber-800/70 bg-amber-950/20 p-4">

                        <div className="mb-3 flex items-center justify-between">

                          <div>
                            <h4 className="font-bold text-amber-300">
                              Novo aparelho manual
                            </h4>

                            <p className="text-xs text-slate-400">
                              Use quando o aparelho ainda não estiver cadastrado na empresa.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              setManualEquipmentOpen(false)
                            }
                            className="text-slate-400 hover:text-white"
                          >
                            <X size={18} />
                          </button>

                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">

                          <input
                            value={
                              manualEquipmentForm.ambiente
                            }
                            onChange={(e) =>
                              setManualEquipmentForm({
                                ...manualEquipmentForm,
                                ambiente:
                                  e.target.value,
                              })
                            }
                            placeholder="Ambiente"
                            className="rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"
                          />

                          <input
                            value={
                              manualEquipmentForm.marca
                            }
                            onChange={(e) =>
                              setManualEquipmentForm({
                                ...manualEquipmentForm,
                                marca: e.target.value,
                              })
                            }
                            placeholder="Marca"
                            className="rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"
                          />

                          <input
                            value={
                              manualEquipmentForm.modelo
                            }
                            onChange={(e) =>
                              setManualEquipmentForm({
                                ...manualEquipmentForm,
                                modelo: e.target.value,
                              })
                            }
                            placeholder="Modelo"
                            className="rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"
                          />

                          <input
                            value={
                              manualEquipmentForm.btu
                            }
                            onChange={(e) =>
                              setManualEquipmentForm({
                                ...manualEquipmentForm,
                                btu: e.target.value,
                              })
                            }
                            placeholder="BTU"
                            className="rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"
                          />

                          <input
                            value={
                              manualEquipmentForm.tipo
                            }
                            onChange={(e) =>
                              setManualEquipmentForm({
                                ...manualEquipmentForm,
                                tipo: e.target.value,
                              })
                            }
                            placeholder="Tipo — Split, Piso Teto etc."
                            className="rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"
                          />

                          <input
                            value={
                              manualEquipmentForm.numero_serie
                            }
                            onChange={(e) =>
                              setManualEquipmentForm({
                                ...manualEquipmentForm,
                                numero_serie:
                                  e.target.value,
                              })
                            }
                            placeholder="Número de série"
                            className="rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"
                          />

                        </div>

                        <div className="mt-3 flex justify-end">

                          <button
                            type="button"
                            onClick={addManualEquipment}
                            className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-500"
                          >
                            <Plus size={16} />
                            Adicionar ao contrato
                          </button>

                        </div>

                      </div>
                    )}

                  </>
                )}

              </div>

              {/* RESUMO DO VALOR */}
              <div className="rounded-xl border border-green-800/60 bg-green-950/20 p-5">

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Aparelhos
                    </p>

                    <p className="mt-1 text-2xl font-bold text-white">
                      {totalSelectedEquipments}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Desconto
                    </p>

                    <p className="mt-1 text-2xl font-bold text-green-400">
                      {getDiscountLabel(
                        totalSelectedEquipments
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Mensalidade
                    </p>

                    <p className="mt-1 text-2xl font-bold text-blue-400">
                      {formatCurrency(
                        calculateMonthlyValue(
                          form.plano,
                          totalSelectedEquipments
                        )
                      )}
                    </p>
                  </div>

                </div>

                {totalSelectedEquipments > 0 && (
                  <div className="mt-4 border-t border-green-900/50 pt-4 text-sm">

                    <div className="flex justify-between gap-4 text-slate-400">

                      <span>
                        Valor sem desconto:
                      </span>

                      <strong className="text-slate-200">
                        {formatCurrency(
                          currentBaseValue
                        )}
                      </strong>

                    </div>

                    <div className="mt-1 flex justify-between gap-4 text-slate-400">

                      <span>
                        Desconto aplicado:
                      </span>

                      <strong className="text-green-400">
                        {Math.round(
                          currentDiscount * 100
                        )}
                        %
                      </strong>

                    </div>

                    <div className="mt-2 flex justify-between gap-4 border-t border-green-900/40 pt-2">

                      <span className="font-bold text-white">
                        Total mensal:
                      </span>

                      <strong className="text-xl text-blue-400">
                        {formatCurrency(
                          calculateMonthlyValue(
                            form.plano,
                            totalSelectedEquipments
                          )
                        )}
                      </strong>

                    </div>

                  </div>
                )}

              </div>

              {/* DATAS */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                <div>

                  <label className="mb-1 block text-sm font-semibold text-slate-300">
                    Data de Início
                  </label>

                  <input
                    type="date"
                    required
                    value={form.data_inicio}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        data_inicio:
                          e.target.value,
                      })
                    }
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-3 text-slate-100 outline-none text-sm"
                  />

                </div>

                <div>

                  <label className="mb-1 block text-sm font-semibold text-slate-300">
                    Próxima Visita
                  </label>

                  <input
                    type="date"
                    value={form.proxima_visita}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        proxima_visita:
                          e.target.value,
                      })
                    }
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-3 text-slate-100 outline-none text-sm"
                  />

                </div>

              </div>

              {/* STATUS */}
              <div>

                <label className="mb-1 block text-sm font-semibold text-slate-300">
                  Status
                </label>

                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      status:
                        e.target.value as ContractStatus,
                    })
                  }
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-3 text-slate-100 outline-none text-sm"
                >

                  {statusOptions.map((status) => (
                    <option
                      key={status}
                      value={status}
                      className="bg-slate-900"
                    >
                      {status}
                    </option>
                  ))}

                </select>

              </div>

              {/* CLAUSULAS */}
              <div>

                <label className="mb-1 block text-sm font-semibold text-slate-300">
                  Cláusulas e Condições
                </label>

                <textarea
                  rows={9}
                  value={form.observacoes}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      observacoes:
                        e.target.value,
                    })
                  }
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 p-3 text-slate-200 outline-none text-xs font-mono"
                />

              </div>

              {/* BOTÕES */}
              <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-800 bg-slate-900 pt-4">

                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-slate-700 px-5 py-2.5 text-slate-300 text-sm"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={
                    saving ||
                    totalSelectedEquipments <= 0
                  }
                  className="rounded-lg bg-blue-600 px-5 py-2.5 text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {saving
                    ? "Salvando..."
                    : editingId
                    ? "Atualizar contrato"
                    : "Salvar contrato"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {/* MODAL CARNÊ */}
      {carneModalOpen && selectedForCarne && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">

          <div className="w-full max-w-md rounded-xl bg-slate-900 border border-slate-800 p-6 text-slate-100 shadow-2xl">

            <h3 className="text-lg font-bold text-white mb-2">
              Gerar Carnê Pix
            </h3>

            <p className="text-sm text-slate-300 mb-4">
              Contrato:
              {" "}
              <strong>
                {selectedForCarne.numero}
              </strong>
            </p>

            <div className="mb-4 rounded-lg bg-slate-950 border border-slate-800 p-3">

              <p className="text-xs text-slate-500">
                Cliente
              </p>

              <p className="font-semibold">
                {selectedForCarne.cliente_nome}
              </p>

              <div className="mt-2 flex justify-between text-sm">

                <span>
                  {selectedForCarne.plano}
                </span>

                <strong className="text-blue-400">
                  {selectedForCarne.quantidade_equipamentos} aparelhos
                </strong>

              </div>

              <div className="mt-2 border-t border-slate-800 pt-2">

                <span className="text-xs text-slate-500">
                  Mensalidade
                </span>

                <p className="text-xl font-bold text-green-400">
                  {formatCurrency(
                    Number(
                      selectedForCarne.valor_mensal
                    )
                  )}
                </p>

              </div>

            </div>

            <div className="mb-4">

              <label className="block text-sm font-semibold text-slate-300 mb-1">
                Parcelas
              </label>

              <select
                value={carneParcelas}
                onChange={(e) =>
                  setCarneParcelas(
                    Number(e.target.value)
                  )
                }
                className="w-full rounded-lg bg-slate-950 border border-slate-700 p-3 text-slate-100 outline-none text-sm"
              >

                <option
                  value={3}
                  className="bg-slate-900"
                >
                  3 Meses
                </option>

                <option
                  value={6}
                  className="bg-slate-900"
                >
                  6 Meses
                </option>

                <option
                  value={12}
                  className="bg-slate-900"
                >
                  12 Meses
                </option>

              </select>

            </div>

            <div className="flex justify-end gap-3">

              <button
                onClick={() =>
                  setCarneModalOpen(false)
                }
                className="border border-slate-700 px-4 py-2 rounded-lg text-sm"
              >
                Cancelar
              </button>

              <button
                onClick={imprimirCarne}
                className="bg-emerald-600 px-4 py-2 rounded-lg text-sm font-semibold"
              >
                Imprimir Carnê
              </button>

            </div>

          </div>

        </div>
      )}

      {/* DETALHES */}
      {detailsOpen && selectedContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">

          <div className="max-w-xl w-full rounded-xl bg-slate-900 border border-slate-800 p-6 text-slate-100 shadow-2xl">

            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">

              <div>

                <h2 className="text-lg font-bold text-white">
                  {selectedContract.numero}
                </h2>

                <p className="text-xs text-slate-500">
                  Detalhes do contrato
                </p>

              </div>

              <button
                onClick={() =>
                  setDetailsOpen(false)
                }
              >
                <X size={20} />
              </button>

            </div>

            <div className="space-y-3 mb-6 text-sm">

              <p>
                <strong>Cliente:</strong>{" "}
                {selectedContract.cliente_nome}
              </p>

              <p>
                <strong>Plano:</strong>{" "}
                {selectedContract.plano}
              </p>

              <p>
                <strong>Aparelhos:</strong>{" "}
                {selectedContract.quantidade_equipamentos}
              </p>

              <p>
                <strong>Valor mensal:</strong>{" "}
                {formatCurrency(
                  Number(
                    selectedContract.valor_mensal
                  )
                )}
              </p>

              <p>
                <strong>Início:</strong>{" "}
                {formatDate(
                  selectedContract.data_inicio
                )}
              </p>

              <p>
                <strong>Status:</strong>{" "}
                {selectedContract.status}
              </p>

            </div>

            <div className="flex gap-2">

              <button
                onClick={() => {
                  setDetailsOpen(false);
                  imprimirContratoComAssinaturaSalva(
                    selectedContract
                  );
                }}
                className="flex-1 bg-purple-600 hover:bg-purple-500 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
              >
                <Printer size={16} />
                Imprimir Contrato
              </button>

              <button
                onClick={() =>
                  setDetailsOpen(false)
                }
                className="border border-slate-700 px-4 py-2 rounded-lg text-sm"
              >
                Fechar
              </button>

            </div>

          </div>

        </div>
      )}

    </main>
  );
}
