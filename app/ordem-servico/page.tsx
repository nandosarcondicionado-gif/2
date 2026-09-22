const commonData = {
  cliente_id: form.clientId,
  cliente_nome: form.client,
  cidade: form.city,

  equipamento:
    form.equipment ||
    "Não informado",

  equipamento_id:
    form.equipmentId || null,

  equipamento_marca:
    form.equipmentBrand || null,

  equipamento_modelo:
    form.equipmentModel || null,

  tipo_servico:
    form.serviceType,

  descricao:
    form.description || null,

  data: form.date,

  tecnico:
    form.technician || null,

  tecnico_id:
    form.technicianId || null,

  valor_servicos:
    finalServiceValue,

  valor_materiais:
    materialsValue,

  materiais_descricao:
    form.materialsDescription ||
    null,

  valor: finalTotal,

  status: form.status,

  observacoes:
    form.notes || null,

  plano_mensal_id:
    monthlyPlanData.plano_mensal_id,

  plano_mensal_coberto:
    monthlyPlanData.plano_mensal_coberto,

  plano_mensal_status:
    monthlyPlanData.plano_mensal_status,

  plano_mensal_aviso:
    monthlyPlanData.plano_mensal_aviso,

  plano_mensal_servico_incluso:
    monthlyPlanData.plano_mensal_servico_incluso,
};
