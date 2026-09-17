-- CLIMAPRO - AJUSTES FINAIS DE COMPATIBILIDADE
-- Este script é aditivo e não remove tabelas nem dados.

ALTER TABLE public.funcionarios
ADD COLUMN IF NOT EXISTS funcao text DEFAULT 'funcionario';

-- Só preenche função quando estiver vazia.
-- Valores já existentes em funcao são preservados.
UPDATE public.funcionarios
SET funcao = CASE
  WHEN LOWER(COALESCE(cargo, '')) LIKE '%admin%' THEN 'administrador'
  WHEN LOWER(COALESCE(cargo, '')) LIKE '%gerente%' THEN 'gerente'
  WHEN LOWER(COALESCE(cargo, '')) LIKE '%finance%' THEN 'financeiro'
  WHEN LOWER(COALESCE(cargo, '')) LIKE '%atend%' THEN 'atendente'
  WHEN LOWER(COALESCE(cargo, '')) LIKE '%técn%' THEN 'tecnico'
  WHEN LOWER(COALESCE(cargo, '')) LIKE '%tecn%' THEN 'tecnico'
  ELSE 'funcionario'
END
WHERE funcao IS NULL OR TRIM(funcao) = '';

-- Índices úteis para o controle financeiro já existente.
CREATE INDEX IF NOT EXISTS idx_pagamentos_funcionarios_funcionario
ON public.pagamentos_funcionarios(funcionario_id);

CREATE INDEX IF NOT EXISTS idx_pagamentos_funcionarios_data
ON public.pagamentos_funcionarios(data_pagamento);

CREATE INDEX IF NOT EXISTS idx_caixa_movimentacoes_data
ON public.caixa_movimentacoes(data_movimento);

CREATE INDEX IF NOT EXISTS idx_pro_labore_data
ON public.pro_labore(data_pagamento);

CREATE INDEX IF NOT EXISTS idx_contas_financeiras_vencimento
ON public.contas_financeiras(vencimento);

CREATE INDEX IF NOT EXISTS idx_contas_financeiras_tipo
ON public.contas_financeiras(tipo);

SELECT 'CLIMAPRO SQL FINAL OK' AS status;
