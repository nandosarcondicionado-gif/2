"use client";

import {
FileText,
Plus,
Search,
User,
X,
Pencil,
Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../lib/supabase/client";

type Plan = "Residencial" | "Comercial" | "Empresarial";

type ContractStatus =
| "Ativo"
| "Pendente"
| "Vencido"
| "Cancelado";

type Client = {
id: string;
nome: string;
cidade: string;
ativo?: boolean;
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
};

const plans: Record<
Plan,
{
price: number;
color: string;
description: string;
}

«= {
Residencial: {
price: 149,
color: "bg-blue-500/10 text-blue-400",
description: "Para casas e apartamentos",
},
Comercial: {
price: 299,
color: "bg-purple-500/10 text-purple-400",
description: "Para lojas e pequenos comércios",
},
Empresarial: {
price: 599,
color: "bg-cyan-500/10 text-cyan-400",
description: "Para empresas e instalações maiores",
},
};»

const emptyForm = {
clienteId: "",
cidade: "",
plano: "Residencial" as Plan,
equipamentos: "1",
valorMensal: "149",
dataInicio: new Date().toISOString().slice(0, 10),
proximaVisita: "",
status: "Ativo" as ContractStatus,
};

function formatDate(value: string | null) {
if (!value) return "-";

const parts = value.split("-");

if (parts.length !== 3) return value;

return "${parts[2]}/${parts[1]}/${parts[0]}";
}

function formatMoney(value: number) {
return value.toLocaleString("pt-BR", {
style: "currency",
currency: "BRL",
});
}

export default function ContratosPage() {
const supabase = createClient();

const [contracts, setContracts] = useState<Contract[]>([]);
const [clients, setClients] = useState<Client[]>([]);

const [search, setSearch] = useState("");
const [statusFilter, setStatusFilter] =
useState<"Todos" | ContractStatus>("Todos");

const [showForm, setShowForm] = useState(false);
const [editingId, setEditingId] = useState<string | null>(null);

const [selectedContract, setSelectedContract] =
useState<Contract | null>(null);

const [form, setForm] = useState(emptyForm);

const [loading, setLoading] = useState(true);
const [saving, setSaving] = useState(false);

useEffect(() => {
loadData();
}, []);

async function loadData() {
setLoading(true);

const [contractsResult, clientsResult] = await Promise.all([
  supabase
    .from("contratos")
    .select("*")
    .order("created_at", { ascending: false }),

  supabase
    .from("clientes")
    .select("id,nome,cidade,ativo")
    .eq("ativo", true)
    .order("nome"),
]);

if (contractsResult.error) {
  console.error(contractsResult.error);
  alert("Não foi possível carregar os contratos.");
} else {
  setContracts(
    (contractsResult.data || []) as Contract[]
  );
}

if (clientsResult.error) {
  console.error(clientsResult.error);
  alert("Não foi possível carregar os clientes.");
} else {
  setClients((clientsResult.data || []) as Client[]);
}

setLoading(false);

}

const filteredContracts = useMemo(() => {
const term = search.toLowerCase().trim();

return contracts.filter((contract) => {
  const matchesSearch =
    !term ||
    contract.numero.toLowerCase().includes(term) ||
    contract.cliente_nome.toLowerCase().includes(term) ||
    contract.cidade.toLowerCase().includes(term) ||
    contract.plano.toLowerCase().includes(term);

  const matchesStatus =
    statusFilter === "Todos" ||
    contract.status === statusFilter;

  return matchesSearch && matchesStatus;
});

}, [contracts, search, statusFilter]);

const activeContracts = contracts.filter(
(item) => item.status === "Ativo"
).length;

const monthlyTotal = contracts
.filter((item) => item.status === "Ativo")
.reduce(
(total, item) => total + Number(item.valor_mensal || 0),
0
);

function openNewForm() {
setEditingId(null);
setForm(emptyForm);
setShowForm(true);
}

function openEditForm(contract: Contract) {
setEditingId(contract.id);

setForm({
  clienteId: contract.cliente_id || "",
  cidade: contract.cidade || "",
  plano: contract.plano,
  equipamentos: String(
    contract.quantidade_equipamentos || 1
  ),
  valorMensal: String(contract.valor_mensal || 0),
  dataInicio:
    contract.data_inicio ||
    new Date().toISOString().slice(0, 10),
  proximaVisita: contract.proxima_visita || "",
  status: contract.status,
});

setSelectedContract(null);
setShowForm(true);

}

function selectClient(clientId: string) {
const client = clients.find(
(item) => item.id === clientId
);

setForm((current) => ({
  ...current,
  clienteId,
  cidade: client?.cidade || "",
}));

}

function selectPlan(plan: Plan) {
setForm((current) => ({
...current,
plano: plan,
valorMensal: String(plans[plan].price),
}));
}

async function saveContract() {
if (!form.clienteId) {
alert("Selecione um cliente.");
return;
}

if (!form.cidade.trim()) {
  alert("Informe a cidade.");
  return;
}

if (!form.dataInicio) {
  alert("Informe a data de início.");
  return;
}

const client = clients.find(
  (item) => item.id === form.clienteId
);

if (!client) {
  alert("Cliente não encontrado.");
  return;
}

const equipmentCount = Number(form.equipamentos);
const monthlyValue = Number(
  form.valorMensal.replace(",", ".")
);

if (!equipmentCount || equipmentCount < 1) {
  alert("Informe a quantidade de equipamentos.");
  return;
}

if (Number.isNaN(monthlyValue) || monthlyValue < 0) {
  alert("Informe um valor mensal válido.");
  return;
}

setSaving(true);

try {
  if (editingId) {
    const updateResult = await supabase
      .from("contratos")
      .update({
        cliente_id: client.id,
        cliente_nome: client.nome,
        cidade: form.cidade.trim(),
        plano: form.plano,
        quantidade_equipamentos: equipmentCount,
        valor_mensal: monthlyValue,
        data_inicio: form.dataInicio,
        proxima_visita:
          form.proximaVisita || null,
        status: form.status,
      })
      .eq("id", editingId)
      .select()
      .single();

    if (updateResult.error) {
      console.error(updateResult.error);
      alert("Não foi possível atualizar o contrato.");
      return;
    }

    setContracts((current) =>
      current.map((item) =>
        item.id === editingId
          ? (updateResult.data as Contract)
          : item
      )
    );

    alert("Contrato atualizado com sucesso.");
  } else {
    const nextNumber =
      contracts.reduce((highest, contract) => {
        const number = Number(
          contract.numero.replace("CTR-", "")
        );

        return Number.isNaN(number)
          ? highest
          : Math.max(highest, number);
      }, 0) + 1;

    const numero = `CTR-${String(nextNumber).padStart(
      4,
      "0"
    )}`;

    const insertResult = await supabase
      .from("contratos")
      .insert({
        numero,
        cliente_id: client.id,
        cliente_nome: client.nome,
        cidade: form.cidade.trim(),
        plano: form.plano,
        quantidade_equipamentos: equipmentCount,
        valor_mensal: monthlyValue,
        data_inicio: form.dataInicio,
        proxima_visita:
          form.proximaVisita || null,
        status: form.status,
      })
      .select()
      .single();

    if (insertResult.error) {
      console.error(insertResult.error);
      alert("Não foi possível salvar o contrato.");
      return;
    }

    setContracts((current) => [
      insertResult.data as Contract,
      ...current,
    ]);

    alert("Contrato criado com sucesso.");
  }

  setShowForm(false);
  setEditingId(null);
  setForm(emptyForm);
} finally {
  setSaving(false);
}

}

async function changeStatus(
contract: Contract,
status: ContractStatus
) {
const result = await supabase
.from("contratos")
.update({ status })
.eq("id", contract.id)
.select()
.single();

if (result.error) {
  console.error(result.error);
  alert("Não foi possível alterar o status.");
  return;
}

const updatedContract = result.data as Contract;

setContracts((current) =>
  current.map((item) =>
    item.id === contract.id ? updatedContract : item
  )
);

setSelectedContract(updatedContract);

}

async function deleteContract(id: string) {
if (!confirm("Deseja realmente excluir este contrato?")) {
return;
}

const result = await supabase
  .from("contratos")
  .delete()
  .eq("id", id);

if (result.error) {
  console.error(result.error);
  alert("Não foi possível excluir o contrato.");
  return;
}

setContracts((current) =>
  current.filter((item) => item.id !== id)
);

setSelectedContract(null);

alert("Contrato excluído.");

}

return (
<main className="min-h-screen bg-slate-950 p-4 text-white sm:p-6 lg:p-8">
<div className="mx-auto max-w-7xl">

    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-cyan-500/10 p-3">
          <FileText className="h-7 w-7 text-cyan-400" />
        </div>

        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">
            Contratos
          </h1>

          <p className="text-sm text-slate-400">
            Gerencie contratos e planos de manutenção
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={openNewForm}
        className="flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400"
      >
        <Plus className="h-5 w-5" />
        Novo contrato
      </button>
    </header>

    <div className="mb-6 grid gap-4 md:grid-cols-3">

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <p className="text-sm text-slate-400">
          Contratos ativos
        </p>

        <p className="mt-2 text-3xl font-bold text-emerald-400">
          {activeContracts}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <p className="text-sm text-slate-400">
          Receita mensal
        </p>

        <p className="mt-2 text-3xl font-bold">
          {formatMoney(monthlyTotal)}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <p className="text-sm text-slate-400">
          Total de contratos
        </p>

        <p className="mt-2 text-3xl font-bold text-cyan-400">
          {contracts.length}
        </p>
      </div>

    </div>

    <div className="mb-5 rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <div className="grid gap-3 lg:grid-cols-[1fr_220px]">

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Buscar contrato, cliente ou cidade..."
            className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-4 outline-none focus:border-cyan-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(
              e.target.value as
                | "Todos"
                | ContractStatus
            )
          }
          className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
        >
          <option value="Todos">
            Todos os status
          </option>
          <option value="Ativo">Ativo</option>
          <option value="Pendente">Pendente</option>
          <option value="Vencido">Vencido</option>
          <option value="Cancelado">Cancelado</option>
        </select>

      </div>
    </div>

    {loading ? (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center text-slate-400">
        Carregando contratos...
      </div>
    ) : filteredContracts.length === 0 ? (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center">
        <FileText className="mx-auto mb-4 h-10 w-10 text-slate-600" />

        <h2 className="font-semibold">
          Nenhum contrato encontrado
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Crie seu primeiro contrato usando o botão acima.
        </p>
      </div>
    ) : (
      <div className="grid gap-4">

        {filteredContracts.map((contract) => (
          <div
            key={contract.id}
            className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

              <div className="flex gap-4">

                <div className="hidden rounded-2xl bg-cyan-500/10 p-3 sm:block">
                  <FileText className="h-7 w-7 text-cyan-400" />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold">
                      {contract.numero}
                    </h2>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        contract.status === "Ativo"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : contract.status === "Cancelado"
                          ? "bg-red-500/10 text-red-400"
                          : contract.status === "Vencido"
                          ? "bg-orange-500/10 text-orange-400"
                          : "bg-yellow-500/10 text-yellow-400"
                      }`}
                    >
                      {contract.status}
                    </span>
                  </div>

                  <p className="mt-2 flex items-center gap-2 font-semibold">
                    <User className="h-4 w-4 text-cyan-400" />
                    {contract.cliente_nome}
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    {contract.cidade} • {contract.plano} •{" "}
                    {contract.quantidade_equipamentos} equipamento(s)
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    Início: {formatDate(contract.data_inicio)}
                    {" • "}
                    Próxima visita:{" "}
                    {formatDate(contract.proxima_visita)}
                  </p>
                </div>

              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">

                <div className="text-left sm:text-right">
                  <p className="text-sm text-slate-400">
                    Valor mensal
                  </p>

                  <p className="text-xl font-bold text-emerald-400">
                    {formatMoney(Number(contract.valor_mensal))}
                  </p>
                </div>

                <div className="flex gap-2">

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedContract(contract)
                    }
                    className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold transition hover:border-cyan-500"
                  >
                    Detalhes
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      openEditForm(contract)
                    }
                    className="rounded-xl border border-slate-700 p-2 transition hover:border-cyan-500"
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>

                </div>

              </div>

            </div>
          </div>
        ))}

      </div>
    )}

    {showForm && (
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4">
        <div className="my-8 w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900">

          <div className="flex items-center justify-between border-b border-slate-800 p-5">
            <div>
              <h2 className="text-xl font-bold">
                {editingId ? "Editar contrato" : "Novo contrato"}
              </h2>

              <p className="text-sm text-slate-400">
                Preencha os dados do contrato
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-xl p-2 hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4 p-5">

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Cliente
              </label>

              <select
                value={form.clienteId}
                onChange={(e) =>
                  selectClient(e.target.value)
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
              >
                <option value="">
                  Selecione um cliente
                </option>

                {clients.map((client) => (
                  <option
                    key={client.id}
                    value={client.id}
                  >
                    {client.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
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
                  placeholder="Cidade"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Equipamentos
                </label>

                <input
                  type="number"
                  min="1"
                  value={form.equipamentos}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      equipamentos: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                />
              </div>

            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Plano
              </label>

              <div className="grid gap-3 sm:grid-cols-3">

                {(Object.keys(plans) as Plan[]).map((plan) => (
                  <button
                    key={plan}
                    type="button"
                    onClick={() => selectPlan(plan)}
                    className={`rounded-xl border p-4 text-left transition ${
                      form.plano === plan
                        ? "border-cyan-500 bg-cyan-500/10"
                        : "border-slate-700 bg-slate-950 hover:border-slate-500"
                    }`}
                  >
                    <p className="font-bold">
                      {plan}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {plans[plan].description}
                    </p>

                    <p className="mt-2 font-semibold text-cyan-400">
                      {formatMoney(plans[plan].price)}/mês
                    </p>
                  </button>
                ))}

              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Valor mensal
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.valorMensal}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      valorMensal: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
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
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Pendente">Pendente</option>
                  <option value="Vencido">Vencido</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>

            </div>

            <div className="grid gap-4 sm:grid-cols-2">

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Data de início
                </label>

                <input
                  type="date"
                  value={form.dataInicio}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      dataInicio: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Próxima visita
                </label>

                <input
                  type="date"
                  value={form.proximaVisita}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      proximaVisita: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
                />
              </div>

            </div>

            <div className="flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-end">

              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-slate-700 px-5 py-3 font-semibold hover:bg-slate-800"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={saveContract}
                className="rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Salvando..."
                  : editingId
                  ? "Salvar alterações"
                  : "Criar contrato"}
              </button>

            </div>

          </div>
        </div>
      </div>
    )}

    {selectedContract && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
        <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900">

          <div className="flex items-center justify-between border-b border-slate-800 p-5">
            <div>
              <p className="text-sm text-slate-400">
                Contrato
              </p>

              <h2 className="text-xl font-bold">
                {selectedContract.numero}
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setSelectedContract(null)}
              className="rounded-xl p-2 hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4 p-5">

            <div className="rounded-xl bg-slate-950 p-4">
              <p className="text-sm text-slate-400">
                Cliente
              </p>

              <p className="mt-1 font-semibold">
                {selectedContract.cliente_nome}
              </p>

              <p className="text-sm text-slate-500">
                {selectedContract.cidade}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">

              <div className="rounded-xl bg-slate-950 p-4">
                <p className="text-xs text-slate-500">
                  Plano
                </p>

                <p className="mt-1 font-semibold">
                  {selectedContract.plano}
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 p-4">
                <p className="text-xs text-slate-500">
                  Equipamentos
                </p>

                <p className="mt-1 font-semibold">
                  {selectedContract.quantidade_equipamentos}
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 p-4">
                <p className="text-xs text-slate-500">
                  Mensalidade
                </p>

                <p className="mt-1 font-semibold text-emerald-400">
                  {formatMoney(
                    Number(selectedContract.valor_mensal)
                  )}
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 p-4">
                <p className="text-xs text-slate-500">
                  Próxima visita
                </p>

                <p className="mt-1 font-semibold">
                  {formatDate(
                    selectedContract.proxima_visita
                  )}
                </p>
              </div>

            </div>

            <div>
              <p className="mb-2 text-sm font-semibold">
                Alterar status
              </p>

              <div className="grid grid-cols-2 gap-2">

                {(
                  [
                    "Ativo",
                    "Pendente",
                    "Vencido",
                    "Cancelado",
                  ] as ContractStatus[]
                ).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() =>
                      changeStatus(
                        selectedContract,
                        status
                      )
                    }
                    className={`rounded-xl border px-3 py-2 text-sm ${
                      selectedContract.status === status
                        ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                        : "border-slate-700 hover:border-slate-500"
                    }`}
                  >
                    {status}
                  </button>
                ))}

              </div>
            </div>

            <div className="flex gap-2">

              <button
                type="button"
                onClick={() =>
                  openEditForm(selectedContract)
                }
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-3 font-semibold hover:border-cyan-500"
              >
                <Pencil className="h-4 w-4" />
                Editar
              </button>

              <button
                type="button"
                onClick={() =>
                  deleteContract(selectedContract.id)
                }
                className="flex items-center justify-center gap-2 rounded-xl border border-red-500/30 px-4 py-3 font-semibold text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4" />
                Excluir
              </button>

            </div>

          </div>
        </div>
      </div>
    )}

  </div>
</main>

);
}
